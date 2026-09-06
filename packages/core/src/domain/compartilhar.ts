/**
 * Compartilhar a montagem das aulas entre aparelhos, sem servidor.
 *
 * O PROBLEMA. O app e um PWA estatico: o estado vive no `localStorage`, que e por
 * aparelho. Se o professor monta a grade no celular dele, o aluno nao ve. Nao
 * existe lugar comum onde os dois se encontrem.
 *
 * A SOLUCAO, e o que ela NAO e. O arranjo inteiro cabe num texto curto: para
 * cada aula, a sequencia de indices dos itens nela. Isso NAO e sincronizacao
 * continua — e enviar e importar, por gesto explicito das duas partes. Ninguem
 * ve a mudanca do outro em tempo real, e ninguem precisa.
 *
 * A ORDEM DENTRO DA AULA E PRESERVADA. A primeira versao guardava so em QUAL
 * aula cada tecnica estava, o que era mais curto e perdia a sequencia — e a
 * sequencia carrega intencao do professor (aquecer com a raspada, depois a
 * passagem). Preservar custa uns 60 caracteres num link e evita uma perda
 * silenciosa.
 *
 * O codigo viaja no FRAGMENTO da URL (depois do `#`), que por definicao nao e
 * enviado ao servidor em requisicao nenhuma. Nada do preparo do aluno sai do
 * aparelho por causa deste recurso.
 *
 * DOIS RISCOS TRATADOS AQUI, e os dois produziriam um arranjo errado que PARECE
 * certo:
 *
 * 1. TRUNCAMENTO. O payload tem tamanho variavel, entao um codigo cortado ao ser
 *    copiado ou quebrado pelo app de mensagem decodificaria menos itens sem
 *    nenhum sinal de erro — "8 tecnicas distribuidas" em vez de 56. O cabecalho
 *    carrega quantas deveriam chegar, e a decodificacao recusa quando nao casa.
 *    A versao com payload de tamanho fixo pegava isso de graca; esta nao pega, e
 *    por isso a verificacao e explicita.
 *
 * 2. CURRICULO DIFERENTE — o codigo envelhecer. A posicao no texto e o
 * INDICE do item na ordem do curriculo — economico, mas fragil: se o curriculo
 * mudar de tamanho ou de ordem, um codigo antigo decodificaria um arranjo
 * TROCADO, em silencio, e ninguem notaria. Dai a assinatura: o codigo carrega a
 * quantidade de itens e um resumo dos ids, e a decodificacao RECUSA quando nao
 * casa, em vez de adivinhar.
 *
 * Modulo puro: sem React, sem I/O.
 */

import type { TechniqueItem } from './types'

/** Versao do formato. Sobe quando a codificacao mudar de forma incompativel. */
const VERSAO = '1'

/** Separador entre as aulas no payload. */
const SEPARADOR = '.'

/** Indice do item em dois digitos base 36: cobre ate 1295 itens. */
function paraIndice(n: number): string {
  return n.toString(36).padStart(2, '0')
}

/**
 * Resumo curto e deterministico de uma lista de ids (FNV-1a em base 36).
 *
 * Nao e criptografia: serve para detectar que o curriculo mudou, nao para
 * impedir ninguem de forjar nada. O que esta em jogo e um arranjo de aulas de
 * jiu-jitsu, e o custo de um falso negativo e o app pedir para montar de novo.
 */
export function assinatura(ids: readonly string[]): string {
  let h = 0x811c9dc5
  for (const id of ids) {
    for (let i = 0; i < id.length; i++) {
      h ^= id.charCodeAt(i)
      // Multiplicacao FNV com >>> 0 para manter 32 bits sem sinal.
      h = (h * 0x01000193) >>> 0
    }
  }
  return h.toString(36)
}

export interface MontagemCodificada {
  codigo: string
  /** Quantos itens foram atribuidos a alguma aula. */
  atribuidos: number
}

/**
 * Codifica o arranjo.
 *
 * `itensAtivos` DEVE vir na mesma ordem na origem e no destino — e a ordem do
 * seed, que e um arquivo versionado igual nos dois aparelhos quando os dois
 * rodam a mesma versao do app. A assinatura e o que detecta quando nao rodam.
 */
export function codificarMontagem(
  itensAtivos: readonly TechniqueItem[],
  atribuicao: ReadonlyMap<number, readonly string[]>,
  totalDeAulas = 10,
): MontagemCodificada {
  const indiceDe = new Map(itensAtivos.map((i, n) => [i.id, n]))

  let atribuidos = 0
  const porAula: string[] = []
  for (let aula = 1; aula <= totalDeAulas; aula++) {
    // A ordem da lista e a ordem em que o professor pos os itens na aula, e e
    // ela que atravessa o link.
    const ids = atribuicao.get(aula) ?? []
    let trecho = ''
    for (const id of ids) {
      const indice = indiceDe.get(id)
      // Item que nao esta mais no curriculo simplesmente nao viaja.
      if (indice === undefined) continue
      trecho += paraIndice(indice)
      atribuidos += 1
    }
    porAula.push(trecho)
  }

  const ids = itensAtivos.map((i) => i.id)
  // `x` separa o total de itens do curriculo da contagem de atribuidos: o
  // segundo e o que detecta truncamento.
  const cabecalho = `${VERSAO}${itensAtivos.length.toString(36)}x${atribuidos.toString(36)}`
  return {
    codigo: `${cabecalho}-${assinatura(ids)}-${porAula.join(SEPARADOR)}`,
    atribuidos,
  }
}

export type ResultadoDaDecodificacao =
  | { ok: true; atribuicao: Map<number, string[]>; atribuidos: number }
  | { ok: false; motivo: MotivoDaRecusa }

export type MotivoDaRecusa =
  | 'formato'
  | 'truncado'
  | 'versao'
  | 'quantidade-diferente'
  | 'curriculo-diferente'
  | 'destino-invalido'

export const EXPLICACAO_DA_RECUSA: Record<MotivoDaRecusa, string> = {
  formato: 'O código não tem o formato esperado.',
  truncado:
    'O código chegou incompleto — provavelmente foi cortado ao ser copiado ou pelo aplicativo de mensagem. Peça o link novamente.',
  versao: 'O código foi gerado por uma versão diferente do app.',
  'quantidade-diferente':
    'O código foi gerado com outra quantidade de técnicas. Os dois aparelhos precisam estar na mesma versão do app.',
  'curriculo-diferente':
    'O currículo mudou desde que este código foi gerado. Importar embaralharia as técnicas, então o app recusou.',
  'destino-invalido': 'O código aponta para uma aula que não existe.',
}

/**
 * Decodifica, RECUSANDO em vez de adivinhar.
 *
 * Cada recusa aqui e um arranjo trocado que nao chegou ao aluno. A tentacao e
 * aceitar "quase certo" e seguir; o resultado seria uma grade de aulas errada
 * que parece certa, descoberta no tatame.
 */
export function decodificarMontagem(
  codigo: string,
  itensAtivos: readonly TechniqueItem[],
  totalDeAulas = 10,
): ResultadoDaDecodificacao {
  const limpo = codigo.trim()
  const partes = limpo.split('-')
  if (partes.length !== 3) return { ok: false, motivo: 'formato' }

  const [cabecalho, assinaturaRecebida, payload] = partes
  if (!cabecalho.startsWith(VERSAO)) return { ok: false, motivo: 'versao' }

  const [qtdTexto, atribuidosTexto] = cabecalho.slice(VERSAO.length).split('x')
  if (atribuidosTexto === undefined) return { ok: false, motivo: 'formato' }
  const quantidade = parseInt(qtdTexto, 36)
  const atribuidosEsperados = parseInt(atribuidosTexto, 36)
  if (!Number.isFinite(quantidade) || !Number.isFinite(atribuidosEsperados)) {
    return { ok: false, motivo: 'formato' }
  }
  if (quantidade !== itensAtivos.length) return { ok: false, motivo: 'quantidade-diferente' }
  if (assinaturaRecebida !== assinatura(itensAtivos.map((i) => i.id))) {
    return { ok: false, motivo: 'curriculo-diferente' }
  }

  const trechos = payload.split(SEPARADOR)
  if (trechos.length > totalDeAulas) return { ok: false, motivo: 'destino-invalido' }

  const atribuicao = new Map<number, string[]>()
  const jaVisto = new Set<number>()
  let atribuidos = 0

  for (let t = 0; t < trechos.length; t++) {
    const trecho = trechos[t]
    if (trecho.length % 2 !== 0) return { ok: false, motivo: 'formato' }

    const ids: string[] = []
    for (let i = 0; i < trecho.length; i += 2) {
      const indice = parseInt(trecho.slice(i, i + 2), 36)
      if (!Number.isFinite(indice) || indice < 0 || indice >= itensAtivos.length) {
        return { ok: false, motivo: 'formato' }
      }
      // Mesmo item em duas aulas seria a invariante quebrada chegando de fora.
      if (jaVisto.has(indice)) return { ok: false, motivo: 'formato' }
      jaVisto.add(indice)
      ids.push(itensAtivos[indice].id)
      atribuidos += 1
    }
    if (ids.length > 0) atribuicao.set(t + 1, ids)
  }

  // Truncamento: chegaram menos itens do que o codigo diz que traria.
  if (atribuidos !== atribuidosEsperados) return { ok: false, motivo: 'truncado' }

  return { ok: true, atribuicao, atribuidos }
}

/** Link completo para mandar no WhatsApp. */
export function linkDaMontagem(base: string, codigo: string): string {
  const semHash = base.split('#')[0]
  return `${semHash}#m=${codigo}`
}

/** Le o codigo de um hash de URL, ou `null` se nao houver. */
export function codigoDoHash(hash: string): string | null {
  const m = /(?:^#|&)m=([^&]+)/.exec(hash)
  return m ? decodeURIComponent(m[1]) : null
}

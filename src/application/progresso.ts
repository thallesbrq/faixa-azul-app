/**
 * Progresso — RF-05.
 *
 * O spec e explicito: "o progresso nao deve ser calculado apenas pela
 * quantidade de cartoes respondidos. O peso maior deve ser dado ao dominio
 * demonstrado e a recencia da recuperacao."
 *
 * Por isso o dominio vem da ESCADA de acertos consecutivos (que ja embute
 * dificuldade) e nao da contagem de respostas, e decai quando a ultima
 * recuperacao ficou velha em relacao ao intervalo agendado.
 *
 * DOIS EIXOS INDEPENDENTES, e isso e a parte que importa:
 * - `dominio`: o quanto o ALUNO recupera de memoria
 * - `validado`: se o PROFESSOR confirmou que a tecnica esta certa
 *
 * Recuperar com seguranca uma tecnica que o professor nunca viu nao e estar
 * pronto — pode ser decorar a versao errada. O spec 16 exige que tecnica nao
 * validada nunca apareca como "dominada oficialmente", e e por isso que estas
 * duas coisas nunca colapsam num numero so.
 *
 * Modulo puro: sem React, sem I/O, `agora` injetado.
 */

import type { Card, ReviewState, TechniqueItem } from '../domain/types'

export type NivelDominio = 'nao_iniciado' | 'visto' | 'aprendendo' | 'dominado'

/** Acertos consecutivos a partir dos quais consideramos dominio. */
export const ACERTOS_PARA_DOMINIO = 3

/**
 * Quantas vezes o intervalo agendado pode ser excedido antes de a recuperacao
 * ser considerada velha. 2x significa: se o cartao devia voltar em 3 dias e ja
 * passaram mais de 6, o dominio recua um nivel.
 */
export const FATOR_DECAIMENTO = 2

const DIA_MS = 86_400_000

/** Nivel de dominio de um unico cartao, considerando recencia. */
export function dominioDoCartao(estado: ReviewState | undefined, agora: Date): NivelDominio {
  if (!estado || estado.repeticoes === 0) return 'nao_iniciado'

  let nivel: NivelDominio =
    estado.acertosConsecutivos >= ACERTOS_PARA_DOMINIO
      ? 'dominado'
      : estado.acertosConsecutivos > 0
        ? 'aprendendo'
        : 'visto'

  // Decaimento por recencia: recuperar hoje nao e o mesmo que ter recuperado
  // uma vez, ha muito tempo.
  if (estado.ultimaRevisaoAt && estado.ultimoIntervaloDias > 0) {
    const diasDesde = (agora.getTime() - new Date(estado.ultimaRevisaoAt).getTime()) / DIA_MS
    if (diasDesde > estado.ultimoIntervaloDias * FATOR_DECAIMENTO) {
      if (nivel === 'dominado') nivel = 'aprendendo'
      else if (nivel === 'aprendendo') nivel = 'visto'
    }
  }

  return nivel
}

const PESO: Record<NivelDominio, number> = {
  nao_iniciado: 0,
  visto: 0.34,
  aprendendo: 0.67,
  dominado: 1,
}

export interface ProgressoDeItem {
  item: TechniqueItem
  /**
   * ETIQUETA estrita: o pior nivel entre os cartoes do item. Dominar a sequencia
   * mas nao conseguir explicar nao e dominar a tecnica.
   */
  dominio: NivelDominio
  /**
   * PONTUACAO continua (0 a 1): media dos cartoes do item.
   *
   * Existe separada da etiqueta por um motivo pratico descoberto testando com
   * dados reais: com a etiqueta estrita, responder 10 cartoes espalhados por
   * varias posicoes mostrava 0% de progresso, porque nenhum item tinha os tres
   * cartoes respondidos. A tela ficava correta e inutil ao mesmo tempo.
   *
   * Assim o avanco parcial aparece, mas nada e chamado de "dominado" antes da
   * hora — as duas coisas que o aluno precisa saber, sem uma esconder a outra.
   */
  pontuacao: number
  validado: boolean
  totalCartoes: number
}

export function progressoPorItem(
  itens: TechniqueItem[],
  cartoes: Card[],
  revisoes: ReviewState[],
  agora: Date,
): ProgressoDeItem[] {
  const estadoPorCartao = new Map(revisoes.map((r) => [r.cardId, r]))
  const cartoesPorItem = new Map<string, Card[]>()
  for (const c of cartoes) {
    if (!c.itemId) continue
    const lista = cartoesPorItem.get(c.itemId)
    if (lista) lista.push(c)
    else cartoesPorItem.set(c.itemId, [c])
  }

  const ordem: NivelDominio[] = ['nao_iniciado', 'visto', 'aprendendo', 'dominado']

  return itens
    .filter((i) => i.ativo)
    .map((item) => {
      const doItem = cartoesPorItem.get(item.id) ?? []

      // Etiqueta: o pior cartao define o item.
      let pior: NivelDominio = doItem.length === 0 ? 'nao_iniciado' : 'dominado'
      // Pontuacao: media dos cartoes, para o avanco parcial aparecer.
      let soma = 0
      for (const c of doItem) {
        const nivel = dominioDoCartao(estadoPorCartao.get(c.id), agora)
        if (ordem.indexOf(nivel) < ordem.indexOf(pior)) pior = nivel
        soma += PESO[nivel]
      }

      return {
        item,
        dominio: pior,
        pontuacao: doItem.length === 0 ? 0 : soma / doItem.length,
        validado: item.validationStatus === 'validado_pelo_professor',
        totalCartoes: doItem.length,
      }
    })
}

export interface ProgressoDeGrupo {
  chave: string
  rotulo: string
  total: number
  porNivel: Record<NivelDominio, number>
  /** 0 a 1, ponderado por nivel de dominio — nao por cartoes respondidos. */
  pontuacao: number
  /** Quantos itens do grupo o professor confirmou. */
  validados: number
}

function agrupar(
  progresso: ProgressoDeItem[],
  chaveDe: (p: ProgressoDeItem) => string,
  rotuloDe: (p: ProgressoDeItem) => string,
): ProgressoDeGrupo[] {
  const grupos = new Map<string, ProgressoDeItem[]>()
  for (const p of progresso) {
    const k = chaveDe(p)
    const lista = grupos.get(k)
    if (lista) lista.push(p)
    else grupos.set(k, [p])
  }

  return [...grupos.entries()].map(([chave, itens]) => {
    const porNivel: Record<NivelDominio, number> = {
      nao_iniciado: 0,
      visto: 0,
      aprendendo: 0,
      dominado: 0,
    }
    let soma = 0
    for (const p of itens) {
      porNivel[p.dominio] += 1
      // Soma a pontuacao continua, nao o peso da etiqueta: senao um item com
      // 2 de 3 cartoes dominados contaria como zero.
      soma += p.pontuacao
    }
    return {
      chave,
      rotulo: rotuloDe(itens[0]),
      total: itens.length,
      porNivel,
      pontuacao: itens.length === 0 ? 0 : soma / itens.length,
      validados: itens.filter((p) => p.validado).length,
    }
  })
}

export function progressoPorModulo(progresso: ProgressoDeItem[], nomeDoModulo: (id: string) => string) {
  return agrupar(
    progresso,
    (p) => p.item.moduloId,
    (p) => nomeDoModulo(p.item.moduloId),
  )
}

export function progressoPorPosicao(progresso: ProgressoDeItem[]) {
  return agrupar(
    progresso,
    (p) => p.item.posicao,
    (p) => p.item.posicao,
  )
}

export function progressoPorCategoria(progresso: ProgressoDeItem[]) {
  return agrupar(
    progresso,
    (p) => p.item.categoria,
    (p) => p.item.categoria,
  )
}

/**
 * Prontidao geral. Combina o dominio (o que o aluno recupera) com a validacao
 * (o que o professor confirmou) SEM misturar os dois num numero unico — o
 * segundo campo existe justamente para nao deixar o primeiro parecer suficiente.
 */
export function prontidao(progresso: ProgressoDeItem[]): {
  dominio: number
  validado: number
  /** Itens que o aluno domina mas o professor ainda nao viu. */
  dominadoSemValidacao: number
} {
  if (progresso.length === 0) return { dominio: 0, validado: 0, dominadoSemValidacao: 0 }

  const soma = progresso.reduce((s, p) => s + p.pontuacao, 0)
  return {
    dominio: soma / progresso.length,
    validado: progresso.filter((p) => p.validado).length / progresso.length,
    dominadoSemValidacao: progresso.filter((p) => p.dominio === 'dominado' && !p.validado).length,
  }
}

/** Grupos mais fracos primeiro — alimenta "onde focar". */
export function gruposMaisFracos(grupos: ProgressoDeGrupo[], quantos = 3): ProgressoDeGrupo[] {
  return [...grupos].sort((a, b) => a.pontuacao - b.pontuacao).slice(0, quantos)
}

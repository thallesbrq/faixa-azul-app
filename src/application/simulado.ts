/**
 * Simulado — RF-04.
 *
 * Diferente da fila do dia em tres coisas: ignora vencimento (sorteia de todo o
 * escopo), tem tamanho fixo, e termina com um relatorio por categoria.
 *
 * As respostas do simulado sao registradas como revisoes normais, nao num
 * historico separado. E uma decisao deliberada: uma tentativa de recuperacao e
 * uma tentativa de recuperacao, e falhar no simulado e exatamente o sinal de que
 * aquele cartao precisa voltar antes. Separar os dois historicos faria o
 * scheduler ignorar o diagnostico mais valioso que o aluno produz.
 *
 * Modulo puro: sem React, sem I/O, e o sorteio recebe a fonte de aleatoriedade
 * por parametro para que os testes sejam deterministicos.
 */

import type { Card, ReviewEvent, TechniqueItem } from '../domain/types'

export type ModoSimulado = 'tecnico' | 'teorico' | 'misto'

export interface ConfigSimulado {
  modo: ModoSimulado
  quantidade: number
  /** Vazio = todos os modulos ativos. */
  moduloIds?: string[]
}

const TIPOS_TEORICOS = new Set<Card['type']>(['teoria', 'requisito'])

/**
 * Embaralhamento Fisher-Yates. `aleatorio` e injetado (por padrao Math.random)
 * para permitir teste deterministico.
 */
export function embaralhar<T>(itens: T[], aleatorio: () => number = Math.random): T[] {
  const copia = [...itens]
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1))
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}

/** Cartoes elegiveis para o escopo escolhido. */
export function escopoDoSimulado(
  cartoes: Card[],
  itens: TechniqueItem[],
  config: ConfigSimulado,
): Card[] {
  const ativos = new Set(itens.filter((i) => i.ativo).map((i) => i.id))
  const moduloPorItem = new Map(itens.map((i) => [i.id, i.moduloId]))
  const filtroModulo = config.moduloIds?.length ? new Set(config.moduloIds) : undefined

  return cartoes.filter((c) => {
    if (!c.ativo) return false

    const teorico = TIPOS_TEORICOS.has(c.type)
    if (config.modo === 'teorico' && !teorico) return false
    if (config.modo === 'tecnico' && teorico) return false

    // Cartoes sem item (teoria) nao pertencem a modulo: entram sempre que o modo
    // os permite, mesmo com filtro de modulo — senao o modo teorico ficaria vazio.
    if (!c.itemId) return true

    if (!ativos.has(c.itemId)) return false
    if (filtroModulo && !filtroModulo.has(moduloPorItem.get(c.itemId) ?? '')) return false
    return true
  })
}

export function montarSimulado(entrada: {
  cartoes: Card[]
  itens: TechniqueItem[]
  config: ConfigSimulado
  aleatorio?: () => number
}): Card[] {
  const { cartoes, itens, config, aleatorio } = entrada
  const escopo = escopoDoSimulado(cartoes, itens, config)
  return embaralhar(escopo, aleatorio).slice(0, config.quantidade)
}

// ---------------------------------------------------------------------------
// Relatorio
// ---------------------------------------------------------------------------

export interface LinhaDoRelatorio {
  rotulo: string
  acertos: number
  total: number
}

export interface RelatorioSimulado {
  total: number
  acertos: number
  /** 0 a 1. */
  taxa: number
  usouDica: number
  porCategoria: LinhaDoRelatorio[]
  porTipoDeCartao: LinhaDoRelatorio[]
  /** Cartoes errados, para virar a proxima sessao de estudo. */
  falhas: Card[]
}

const ACERTOU = new Set(['good', 'easy'])

function tabela(
  respostas: { cartao: Card; evento: ReviewEvent }[],
  chaveDe: (r: { cartao: Card; evento: ReviewEvent }) => string,
): LinhaDoRelatorio[] {
  const grupos = new Map<string, { acertos: number; total: number }>()
  for (const r of respostas) {
    const k = chaveDe(r)
    const g = grupos.get(k) ?? { acertos: 0, total: 0 }
    g.total += 1
    if (ACERTOU.has(r.evento.rating)) g.acertos += 1
    grupos.set(k, g)
  }
  return [...grupos.entries()]
    .map(([rotulo, g]) => ({ rotulo, ...g }))
    .sort((a, b) => a.acertos / a.total - b.acertos / b.total)
}

const ROTULO_TIPO: Record<Card['type'], string> = {
  explicacao: 'Explicação',
  sequencia: 'Sequência',
  classificacao: 'Classificação',
  requisito: 'Requisito',
  teoria: 'Teoria',
}

export function relatorioDoSimulado(entrada: {
  respostas: { cartao: Card; evento: ReviewEvent }[]
  itens: TechniqueItem[]
}): RelatorioSimulado {
  const { respostas, itens } = entrada
  const posicaoPorItem = new Map(itens.map((i) => [i.id, i.posicao]))

  const acertos = respostas.filter((r) => ACERTOU.has(r.evento.rating)).length

  return {
    total: respostas.length,
    acertos,
    taxa: respostas.length === 0 ? 0 : acertos / respostas.length,
    usouDica: respostas.filter((r) => r.evento.usouDica).length,
    // Ordenado do pior para o melhor: o relatorio serve para achar a lacuna,
    // nao para exibir o que ja esta bom.
    porCategoria: tabela(respostas, (r) =>
      r.cartao.itemId ? (posicaoPorItem.get(r.cartao.itemId) ?? 'Sem posição') : 'Teoria e requisitos',
    ),
    porTipoDeCartao: tabela(respostas, (r) => ROTULO_TIPO[r.cartao.type]),
    falhas: respostas.filter((r) => !ACERTOU.has(r.evento.rating)).map((r) => r.cartao),
  }
}

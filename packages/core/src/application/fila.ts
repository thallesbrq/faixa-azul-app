/**
 * Fila diaria de revisao.
 *
 * Junta tres coisas que competem pelo mesmo tempo do aluno:
 * - cartoes vencidos (prioridade maxima: ja passou da hora)
 * - cartoes novos, em ritmo controlado (215 de uma vez seria sobrecarga)
 * - variedade de posicoes (ADR-005: intercalar aproxima do exame, onde a
 *   pergunta muda de guarda sem avisar)
 *
 * Modulo puro: sem React, sem I/O, `agora` injetado.
 */

import { estaVencido, ordenarFila } from '../domain/scheduler'
import type { Card, ReviewState, TechniqueItem } from '../domain/types'
import type { Config } from '../persistence/repositorio'

export interface FilaDoDia {
  cartoes: Card[]
  /** Quantos estavam vencidos hoje, independente do limite. */
  vencidosTotal: number
  /** Quantos entraram como novos nesta sessao. */
  novos: number
  /** Vencidos que ficaram de fora por causa do limite diario. */
  vencidosAdiados: number
}

/**
 * Distribui os cartoes em rodadas por chave (round-robin), evitando sequencias
 * longas da mesma guarda. Preserva a ordem relativa dentro de cada chave, para
 * que a prioridade calculada antes nao seja perdida.
 */
export function intercalarPor<T>(itens: T[], chaveDe: (item: T) => string): T[] {
  const grupos = new Map<string, T[]>()
  for (const item of itens) {
    const k = chaveDe(item)
    const g = grupos.get(k)
    if (g) g.push(item)
    else grupos.set(k, [item])
  }

  const filas = [...grupos.values()]
  const saida: T[] = []
  let restam = itens.length

  while (restam > 0) {
    for (const fila of filas) {
      const proximo = fila.shift()
      if (proximo !== undefined) {
        saida.push(proximo)
        restam -= 1
      }
    }
  }

  return saida
}

/**
 * Monta a fila do dia.
 *
 * Vencidos vem antes de novos: nao faz sentido aprender tecnica nova enquanto o
 * que ja foi estudado esta escapando da memoria. Novos entram apenas no espaco
 * que sobra do limite diario, e no maximo `novosPorDia`.
 */
export function montarFilaDoDia(entrada: {
  cartoes: Card[]
  itens: TechniqueItem[]
  revisoes: ReviewState[]
  agora: Date
  config: Config
}): FilaDoDia {
  const { cartoes, itens, revisoes, agora, config } = entrada

  const ativos = cartoes.filter((c) => c.ativo)
  const estadoPorCartao = new Map(revisoes.map((r) => [r.cardId, r]))
  const posicaoPorItem = new Map(itens.map((i) => [i.id, i.posicao]))

  const vencidos: { cartao: Card; estado: ReviewState }[] = []
  const novos: Card[] = []

  for (const cartao of ativos) {
    const estado = estadoPorCartao.get(cartao.id)
    if (!estado) novos.push(cartao)
    else if (estaVencido(estado, agora)) vencidos.push({ cartao, estado })
  }

  // Prioridade dos vencidos (spec 10): mais atrasado, mais falhas, menos praticado.
  const ordenados = ordenarFila(
    vencidos.map((v) => v.estado),
    agora,
  )
  const cartaoPorId = new Map(vencidos.map((v) => [v.estado.cardId, v.cartao]))
  const vencidosOrdenados = ordenados
    .map((e) => cartaoPorId.get(e.cardId))
    .filter((c): c is Card => c !== undefined)

  const vencidosNaSessao = vencidosOrdenados.slice(0, config.limiteDiario)
  const espacoRestante = Math.max(0, config.limiteDiario - vencidosNaSessao.length)
  const novosNaSessao = novos.slice(0, Math.min(config.novosPorDia, espacoRestante))

  /**
   * Chave de intercalacao: a posicao da tecnica. Cartoes de teoria e de
   * requisito nao pertencem a uma posicao — recebem chave propria, o que os
   * espalha pela sessao em vez de amontoa-los no fim.
   */
  const chaveDe = (c: Card) =>
    c.itemId ? (posicaoPorItem.get(c.itemId) ?? 'sem-posicao') : `geral-${c.type}`

  return {
    // Intercalados separadamente: os vencidos mantem a frente da fila, e os
    // novos entram depois — mas cada bloco ja chega variado por posicao.
    cartoes: [...intercalarPor(vencidosNaSessao, chaveDe), ...intercalarPor(novosNaSessao, chaveDe)],
    vencidosTotal: vencidosOrdenados.length,
    novos: novosNaSessao.length,
    vencidosAdiados: Math.max(0, vencidosOrdenados.length - vencidosNaSessao.length),
  }
}

/** Modulo com pior desempenho — alimenta o "modulo de maior risco" da tela Hoje. */
export function moduloDeMaiorRisco(
  cartoes: Card[],
  itens: TechniqueItem[],
  revisoes: ReviewState[],
): { moduloId: string; lapses: number } | undefined {
  const moduloPorItem = new Map(itens.map((i) => [i.id, i.moduloId]))
  const cartaoParaModulo = new Map(
    cartoes.filter((c) => c.itemId).map((c) => [c.id, moduloPorItem.get(c.itemId!)]),
  )

  const porModulo = new Map<string, number>()
  for (const r of revisoes) {
    const mod = cartaoParaModulo.get(r.cardId)
    if (!mod || r.lapses === 0) continue
    porModulo.set(mod, (porModulo.get(mod) ?? 0) + r.lapses)
  }

  let pior: { moduloId: string; lapses: number } | undefined
  for (const [moduloId, lapses] of porModulo) {
    if (!pior || lapses > pior.lapses) pior = { moduloId, lapses }
  }
  return pior
}

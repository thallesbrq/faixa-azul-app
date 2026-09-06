/**
 * Scheduler deterministico (spec 10, Fase 1) + limite por horizonte de prova.
 *
 * ADR-004 (revisado): FSRS ficou FORA do escopo. Com ~9 semanas de preparacao,
 * intervalos adaptativos longos nao tem onde rodar; um scheduler explicavel e
 * testavel entrega o mesmo resultado pratico e permite mensagens honestas
 * ("voce errou este cartao duas vezes").
 *
 * ADR-011 (novo): o intervalo e limitado pelo horizonte da prova. Sem isso um
 * cartao que caisse em 30 dias faltando 20 para a prova so voltaria DEPOIS do
 * exame — o aluno nunca mais o revisaria. Nos ultimos dias entra o modo taper.
 *
 * Regra arquitetural: modulo puro, sem React, sem I/O, sem Date.now() implicito
 * (o "agora" e sempre injetado) — assim os testes sao deterministicos.
 */

import type { Rating, ReviewState, Side } from './types'

/** "again" reapresenta o cartao na mesma sessao. */
export const AGAIN_MINUTOS = 10

/** Escada de intervalos para `good`, indexada por acertos consecutivos previos. */
export const ESCADA_GOOD = [3, 7, 14, 30] as const

/** `easy` sobe um degrau em relacao a `good`. */
export const ESCADA_EASY = [7, 14, 30, 30] as const

/** Janela final em que tudo precisa ser revisto pelo menos uma vez (taper). */
export const DIAS_TAPER = 10

/** Teto de intervalo dentro da janela de taper. */
export const CAP_TAPER_DIAS = 2

const MINUTO_MS = 60_000
const DIA_MS = 86_400_000

export function estadoInicial(cardId: string, side: Side, agora: Date): ReviewState {
  return {
    cardId,
    side,
    dueAt: agora.toISOString(),
    ultimoIntervaloDias: 0,
    acertosConsecutivos: 0,
    lapses: 0,
    repeticoes: 0,
  }
}

/**
 * Teto de intervalo imposto pela data da prova.
 *
 * - passou/e hoje: 1 dia (segue circulando, nao congela)
 * - dentro do taper: CAP_TAPER_DIAS
 * - caso geral: metade do que resta, para caber pelo menos uma revisao a mais
 */
export function capPorHorizonte(diasAteProva: number): number {
  if (diasAteProva <= 0) return 1
  // O taper tambem respeita os dias que realmente restam: faltando 1 dia, o cap
  // precisa ser 1, senao o cartao venceria depois da prova (bug pego pelo teste
  // de propriedade "nenhum intervalo ultrapassa o horizonte").
  if (diasAteProva <= DIAS_TAPER) return Math.min(CAP_TAPER_DIAS, diasAteProva)
  return Math.max(1, Math.floor(diasAteProva / 2))
}

function degrau(escada: readonly number[], acertosConsecutivos: number): number {
  const i = Math.min(Math.max(acertosConsecutivos, 0), escada.length - 1)
  return escada[i]
}

/**
 * Proximo intervalo em dias. `0` significa "reapresentar em AGAIN_MINUTOS".
 * O uso de dica reduz o intervalo pela metade (spec 10: "erro ou uso de dica
 * reduz o intervalo") — nunca abaixo de 1 dia, para nao virar um loop.
 */
export function proximoIntervaloDias(
  estado: ReviewState,
  rating: Rating,
  usouDica: boolean,
  diasAteProva: number,
): number {
  if (rating === 'again') return 0

  let dias: number
  if (rating === 'hard') {
    dias = 1
  } else if (rating === 'good') {
    dias = degrau(ESCADA_GOOD, estado.acertosConsecutivos)
  } else {
    dias = degrau(ESCADA_EASY, estado.acertosConsecutivos)
  }

  if (usouDica) dias = Math.max(1, Math.floor(dias / 2))

  return Math.min(dias, capPorHorizonte(diasAteProva))
}

export function calcularDueAt(agora: Date, intervaloDias: number): string {
  const ms = intervaloDias === 0 ? AGAIN_MINUTOS * MINUTO_MS : intervaloDias * DIA_MS
  return new Date(agora.getTime() + ms).toISOString()
}

/**
 * Aplica uma revisao e devolve o NOVO estado (funcao pura — o evento original
 * permanece intacto no historico append-only, ADR-010).
 */
export function aplicarRevisao(
  estado: ReviewState,
  entrada: { rating: Rating; usouDica: boolean; agora: Date; diasAteProva: number },
): ReviewState {
  const { rating, usouDica, agora, diasAteProva } = entrada
  const intervaloDias = proximoIntervaloDias(estado, rating, usouDica, diasAteProva)

  const acertou = rating === 'good' || rating === 'easy'
  // Dica conta como acerto assistido: mantem a escada, mas nao a faz avancar.
  const acertosConsecutivos = !acertou ? 0 : usouDica ? estado.acertosConsecutivos : estado.acertosConsecutivos + 1

  return {
    ...estado,
    dueAt: calcularDueAt(agora, intervaloDias),
    ultimoIntervaloDias: intervaloDias,
    acertosConsecutivos,
    lapses: rating === 'again' ? estado.lapses + 1 : estado.lapses,
    repeticoes: estado.repeticoes + 1,
    ultimaRevisaoAt: agora.toISOString(),
  }
}

export function estaVencido(estado: ReviewState, agora: Date): boolean {
  return new Date(estado.dueAt).getTime() <= agora.getTime()
}

export function diasAteProva(agora: Date, dataAlvoISO: string): number {
  const ms = new Date(dataAlvoISO).getTime() - agora.getTime()
  return Math.ceil(ms / DIA_MS)
}

/**
 * Ordena a fila do dia (spec 10 "Regras de prioridade"). A formula nao e
 * exposta ao usuario; a UI mostra apenas explicacoes simples.
 *
 * Prioriza, em ordem: mais vencido, mais falhas, menos praticado.
 */
export function ordenarFila(estados: ReviewState[], agora: Date): ReviewState[] {
  const t = agora.getTime()
  return [...estados].sort((a, b) => {
    const atrasoA = t - new Date(a.dueAt).getTime()
    const atrasoB = t - new Date(b.dueAt).getTime()
    // Vencidos primeiro, do mais atrasado para o menos.
    if (atrasoA >= 0 !== (atrasoB >= 0)) return atrasoA >= 0 ? -1 : 1
    if (b.lapses !== a.lapses) return b.lapses - a.lapses
    if (a.repeticoes !== b.repeticoes) return a.repeticoes - b.repeticoes
    return atrasoB - atrasoA
  })
}

/**
 * Caso de uso: registrar uma revisao.
 *
 * ADR-010: o evento e append-only. `revisoes` guarda o estado atual derivado, e
 * `eventos` guarda o que realmente aconteceu — se o estado derivado se
 * corromper, ele pode ser reconstruido dos eventos.
 *
 * Funcao pura: recebe o estado, devolve um novo. Sem I/O, sem Date.now(), sem
 * geracao implicita de id — tudo injetado, para que os testes sejam
 * deterministicos.
 */

import { aplicarRevisao, estadoInicial as estadoInicialDeRevisao } from '../domain/scheduler'
import type { Rating, ReviewEvent, ReviewState, Side } from '../domain/types'
import type { EstadoPersistido } from '../persistence/repositorio'

export interface EntradaRevisao {
  cardId: string
  side?: Side
  rating: Rating
  usouDica: boolean
  tempoRespostaMs?: number
  nota?: string
  agora: Date
  diasAteProva: number
  /** Injetado para manter a funcao deterministica nos testes. */
  gerarId: () => string
}

export function registrarRevisao(estado: EstadoPersistido, entrada: EntradaRevisao): EstadoPersistido {
  const { cardId, rating, usouDica, tempoRespostaMs, nota, agora, diasAteProva, gerarId } = entrada
  const side: Side = entrada.side ?? 'unico'

  const evento: ReviewEvent = {
    id: gerarId(),
    cardId,
    side,
    rating,
    usouDica,
    tempoRespostaMs,
    createdAt: agora.toISOString(),
    nota,
  }

  const anterior =
    estado.revisoes.find((r) => r.cardId === cardId && r.side === side) ??
    estadoInicialDeRevisao(cardId, side, agora)

  const atualizado = aplicarRevisao(anterior, { rating, usouDica, agora, diasAteProva })

  const existe = estado.revisoes.some((r) => r.cardId === cardId && r.side === side)
  const revisoes: ReviewState[] = existe
    ? estado.revisoes.map((r) => (r.cardId === cardId && r.side === side ? atualizado : r))
    : [...estado.revisoes, atualizado]

  return { ...estado, revisoes, eventos: [...estado.eventos, evento] }
}

/**
 * Reconstroi os estados de revisao a partir do historico de eventos.
 *
 * Serve para recuperacao: se `revisoes` for perdido ou ficar inconsistente, os
 * eventos bastam. Tambem e a prova de que o historico e a fonte da verdade e o
 * estado e derivado, nao o contrario.
 */
export function reconstruirRevisoes(
  eventos: ReviewEvent[],
  diasAteProvaEm: (momento: Date) => number,
): ReviewState[] {
  const porChave = new Map<string, ReviewState>()

  const ordenados = [...eventos].sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  for (const ev of ordenados) {
    const chave = `${ev.cardId}::${ev.side}`
    const momento = new Date(ev.createdAt)
    const anterior = porChave.get(chave) ?? estadoInicialDeRevisao(ev.cardId, ev.side, momento)

    porChave.set(
      chave,
      aplicarRevisao(anterior, {
        rating: ev.rating,
        usouDica: ev.usouDica,
        agora: momento,
        diasAteProva: diasAteProvaEm(momento),
      }),
    )
  }

  return [...porChave.values()]
}

/** Resumo do dia para a tela Hoje. */
export function revisadosHoje(eventos: ReviewEvent[], agora: Date): number {
  const inicioDoDia = new Date(agora)
  inicioDoDia.setHours(0, 0, 0, 0)
  const limite = inicioDoDia.toISOString()
  return eventos.filter((e) => e.createdAt >= limite).length
}

/** Taxa de recuperacao sem dica (metrica de aprendizagem do spec 17). */
export function taxaDeAcertoSemDica(eventos: ReviewEvent[]): number | undefined {
  const semDica = eventos.filter((e) => !e.usouDica)
  if (semDica.length === 0) return undefined
  const acertos = semDica.filter((e) => e.rating === 'good' || e.rating === 'easy').length
  return acertos / semDica.length
}

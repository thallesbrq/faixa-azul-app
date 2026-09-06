import { describe, expect, it } from 'vitest'
import { reconstruirRevisoes, registrarRevisao, revisadosHoje, taxaDeAcertoSemDica } from './revisar'
import { estadoInicial } from '../persistence/repositorio'
import type { EstadoPersistido } from '../persistence/repositorio'
import type { ReviewEvent } from '../domain/types'

const AGORA = new Date('2026-08-22T12:00:00.000Z')
const HORIZONTE = 63

function base(): EstadoPersistido {
  return estadoInicial(AGORA)
}

let contador = 0
const gerarId = () => `ev-${++contador}`

function revisar(estado: EstadoPersistido, over: Partial<Parameters<typeof registrarRevisao>[1]> = {}) {
  return registrarRevisao(estado, {
    cardId: 'c1',
    rating: 'good',
    usouDica: false,
    agora: AGORA,
    diasAteProva: HORIZONTE,
    gerarId,
    ...over,
  })
}

describe('registrarRevisao', () => {
  it('cria o estado de revisao na primeira tentativa', () => {
    const depois = revisar(base())
    expect(depois.revisoes).toHaveLength(1)
    expect(depois.revisoes[0].cardId).toBe('c1')
    expect(depois.revisoes[0].repeticoes).toBe(1)
  })

  it('acrescenta um evento por tentativa (append-only, ADR-010)', () => {
    const um = revisar(base())
    const dois = revisar(um, { rating: 'again' })
    expect(dois.eventos).toHaveLength(2)
    // O primeiro evento continua intacto, com o rating original.
    expect(dois.eventos[0].rating).toBe('good')
    expect(dois.eventos[1].rating).toBe('again')
  })

  it('atualiza o estado existente em vez de duplicar', () => {
    const dois = revisar(revisar(base()))
    expect(dois.revisoes).toHaveLength(1)
    expect(dois.revisoes[0].repeticoes).toBe(2)
  })

  it('e pura: nao muta o estado recebido', () => {
    const antes = base()
    revisar(antes)
    expect(antes.eventos).toHaveLength(0)
    expect(antes.revisoes).toHaveLength(0)
  })

  it('registra o uso de dica no evento', () => {
    const depois = revisar(base(), { usouDica: true })
    expect(depois.eventos[0].usouDica).toBe(true)
  })

  it('guarda lados como estados independentes', () => {
    const direito = revisar(base(), { side: 'direito' })
    const ambos = revisar(direito, { side: 'esquerdo' })
    expect(ambos.revisoes).toHaveLength(2)
    expect(ambos.revisoes.map((r) => r.side).sort()).toEqual(['direito', 'esquerdo'])
  })

  it('nao mistura o progresso de cartoes diferentes', () => {
    const dois = revisar(revisar(base(), { cardId: 'a' }), { cardId: 'b' })
    expect(dois.revisoes.map((r) => r.cardId).sort()).toEqual(['a', 'b'])
  })
})

describe('reconstruirRevisoes — eventos sao a fonte da verdade', () => {
  it('reconstroi o mesmo estado que o registro incremental produziu', () => {
    // Se esta propriedade quebrar, o historico deixou de ser confiavel para
    // recuperacao — que e a razao de ele ser append-only.
    let estado = base()
    estado = revisar(estado, { rating: 'good', agora: new Date('2026-08-22T12:00:00.000Z') })
    estado = revisar(estado, { rating: 'again', agora: new Date('2026-08-23T12:00:00.000Z') })
    estado = revisar(estado, { rating: 'good', agora: new Date('2026-08-24T12:00:00.000Z') })
    estado = revisar(estado, { rating: 'easy', agora: new Date('2026-08-27T12:00:00.000Z') })

    const reconstruido = reconstruirRevisoes(estado.eventos, () => HORIZONTE)

    expect(reconstruido).toHaveLength(estado.revisoes.length)
    expect(reconstruido[0].repeticoes).toBe(estado.revisoes[0].repeticoes)
    expect(reconstruido[0].lapses).toBe(estado.revisoes[0].lapses)
    expect(reconstruido[0].acertosConsecutivos).toBe(estado.revisoes[0].acertosConsecutivos)
    expect(reconstruido[0].dueAt).toBe(estado.revisoes[0].dueAt)
  })

  it('reconstroi na ordem cronologica mesmo se os eventos vierem fora de ordem', () => {
    const eventos: ReviewEvent[] = [
      { id: 'e2', cardId: 'c1', side: 'unico', rating: 'again', usouDica: false, createdAt: '2026-08-23T12:00:00.000Z' },
      { id: 'e1', cardId: 'c1', side: 'unico', rating: 'good', usouDica: false, createdAt: '2026-08-22T12:00:00.000Z' },
    ]
    const [estado] = reconstruirRevisoes(eventos, () => HORIZONTE)
    // O ultimo evento cronologico e o 'again': zera a escada e conta 1 lapse.
    expect(estado.acertosConsecutivos).toBe(0)
    expect(estado.lapses).toBe(1)
    expect(estado.repeticoes).toBe(2)
  })

  it('devolve lista vazia sem eventos', () => {
    expect(reconstruirRevisoes([], () => HORIZONTE)).toEqual([])
  })
})

describe('revisadosHoje', () => {
  it('conta apenas eventos do dia corrente', () => {
    const eventos: ReviewEvent[] = [
      { id: 'a', cardId: 'c1', side: 'unico', rating: 'good', usouDica: false, createdAt: '2026-08-22T09:00:00.000Z' },
      { id: 'b', cardId: 'c2', side: 'unico', rating: 'good', usouDica: false, createdAt: '2026-08-21T09:00:00.000Z' },
    ]
    expect(revisadosHoje(eventos, new Date('2026-08-22T20:00:00.000Z'))).toBe(1)
  })
})

describe('taxaDeAcertoSemDica', () => {
  it('ignora tentativas que usaram dica', () => {
    const eventos: ReviewEvent[] = [
      { id: 'a', cardId: 'c1', side: 'unico', rating: 'good', usouDica: false, createdAt: '2026-08-22T09:00:00.000Z' },
      { id: 'b', cardId: 'c2', side: 'unico', rating: 'again', usouDica: false, createdAt: '2026-08-22T09:10:00.000Z' },
      { id: 'c', cardId: 'c3', side: 'unico', rating: 'easy', usouDica: true, createdAt: '2026-08-22T09:20:00.000Z' },
    ]
    expect(taxaDeAcertoSemDica(eventos)).toBe(0.5)
  })

  it('devolve undefined quando todas usaram dica', () => {
    const eventos: ReviewEvent[] = [
      { id: 'a', cardId: 'c1', side: 'unico', rating: 'good', usouDica: true, createdAt: '2026-08-22T09:00:00.000Z' },
    ]
    expect(taxaDeAcertoSemDica(eventos)).toBeUndefined()
  })
})

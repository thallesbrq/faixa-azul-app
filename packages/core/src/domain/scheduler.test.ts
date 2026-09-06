import { describe, expect, it } from 'vitest'
import {
  AGAIN_MINUTOS,
  CAP_TAPER_DIAS,
  aplicarRevisao,
  capPorHorizonte,
  diasAteProva,
  estadoInicial,
  estaVencido,
  ordenarFila,
  proximoIntervaloDias,
} from './scheduler'
import type { Rating, ReviewState } from './types'

const AGORA = new Date('2026-08-22T12:00:00.000Z')
const HORIZONTE_LONGO = 63 // 9 semanas: cap = 31, nao interfere na escada

function estado(over: Partial<ReviewState> = {}): ReviewState {
  return { ...estadoInicial('c1', 'unico', AGORA), ...over }
}

function revisar(st: ReviewState, rating: Rating, usouDica = false, dias = HORIZONTE_LONGO) {
  return aplicarRevisao(st, { rating, usouDica, agora: AGORA, diasAteProva: dias })
}

function intervaloEmDias(deISO: string, ateISO: string) {
  return (new Date(ateISO).getTime() - new Date(deISO).getTime()) / 86_400_000
}

describe('proximoIntervaloDias', () => {
  it('again reapresenta na mesma sessao (intervalo 0)', () => {
    expect(proximoIntervaloDias(estado(), 'again', false, HORIZONTE_LONGO)).toBe(0)
  })

  it('hard volta em 1 dia', () => {
    expect(proximoIntervaloDias(estado(), 'hard', false, HORIZONTE_LONGO)).toBe(1)
  })

  it('good sobe a escada 3 -> 7 -> 14 -> 30 conforme acertos consecutivos', () => {
    const escada = [0, 1, 2, 3].map((n) =>
      proximoIntervaloDias(estado({ acertosConsecutivos: n }), 'good', false, HORIZONTE_LONGO),
    )
    expect(escada).toEqual([3, 7, 14, 30])
  })

  it('easy comeca um degrau acima de good', () => {
    expect(proximoIntervaloDias(estado(), 'easy', false, HORIZONTE_LONGO)).toBe(7)
    expect(proximoIntervaloDias(estado({ acertosConsecutivos: 1 }), 'easy', false, HORIZONTE_LONGO)).toBe(14)
  })

  it('uso de dica reduz o intervalo pela metade, sem descer de 1 dia', () => {
    expect(proximoIntervaloDias(estado(), 'good', true, HORIZONTE_LONGO)).toBe(1) // 3 -> 1
    expect(proximoIntervaloDias(estado({ acertosConsecutivos: 1 }), 'good', true, HORIZONTE_LONGO)).toBe(3) // 7 -> 3
    expect(proximoIntervaloDias(estado(), 'hard', true, HORIZONTE_LONGO)).toBe(1) // nunca 0
  })
})

describe('capPorHorizonte (ADR-011)', () => {
  it('faltando 40 dias, limita a metade (20)', () => {
    expect(capPorHorizonte(40)).toBe(20)
  })

  it('dentro da janela de taper, limita a CAP_TAPER_DIAS', () => {
    expect(capPorHorizonte(10)).toBe(CAP_TAPER_DIAS)
    expect(capPorHorizonte(3)).toBe(CAP_TAPER_DIAS)
  })

  it('prova hoje ou passada, mantem circulando em 1 dia', () => {
    expect(capPorHorizonte(0)).toBe(1)
    expect(capPorHorizonte(-5)).toBe(1)
  })

  it('impede que easy jogue o cartao para depois da prova', () => {
    // Sem cap, 4 acertos + easy dariam 30 dias — o cartao voltaria depois do exame.
    const st = estado({ acertosConsecutivos: 3 })
    expect(proximoIntervaloDias(st, 'easy', false, 20)).toBe(10)
  })
})

describe('propriedade central do ADR-011', () => {
  it('nenhum intervalo ultrapassa o horizonte da prova, em nenhum cenario', () => {
    const ratings: Rating[] = ['again', 'hard', 'good', 'easy']
    for (let dias = 1; dias <= 70; dias++) {
      for (const rating of ratings) {
        for (let acertos = 0; acertos <= 5; acertos++) {
          for (const dica of [true, false]) {
            const intervalo = proximoIntervaloDias(estado({ acertosConsecutivos: acertos }), rating, dica, dias)
            expect(intervalo).toBeLessThanOrEqual(dias)
          }
        }
      }
    }
  })
})

describe('aplicarRevisao', () => {
  it('e uma funcao pura: nao muta o estado recebido', () => {
    const original = estado()
    const copia = { ...original }
    revisar(original, 'good')
    expect(original).toEqual(copia)
  })

  it('again incrementa lapses e zera a escada de acertos', () => {
    const st = estado({ acertosConsecutivos: 3, lapses: 1 })
    const novo = revisar(st, 'again')
    expect(novo.lapses).toBe(2)
    expect(novo.acertosConsecutivos).toBe(0)
    expect(intervaloEmDias(AGORA.toISOString(), novo.dueAt) * 24 * 60).toBeCloseTo(AGAIN_MINUTOS)
  })

  it('good avanca a escada de acertos', () => {
    expect(revisar(estado(), 'good').acertosConsecutivos).toBe(1)
  })

  it('acerto com dica NAO avanca a escada (acerto assistido)', () => {
    const novo = revisar(estado({ acertosConsecutivos: 2 }), 'good', true)
    expect(novo.acertosConsecutivos).toBe(2)
  })

  it('conta repeticoes em toda tentativa, inclusive erro', () => {
    expect(revisar(estado(), 'again').repeticoes).toBe(1)
    expect(revisar(estado({ repeticoes: 4 }), 'good').repeticoes).toBe(5)
  })

  it('registra o momento da ultima revisao', () => {
    expect(revisar(estado(), 'good').ultimaRevisaoAt).toBe(AGORA.toISOString())
  })
})

describe('estaVencido', () => {
  it('cartao com dueAt no passado esta vencido', () => {
    expect(estaVencido(estado({ dueAt: '2026-08-21T12:00:00.000Z' }), AGORA)).toBe(true)
  })

  it('cartao com dueAt no futuro nao esta vencido', () => {
    expect(estaVencido(estado({ dueAt: '2026-08-23T12:00:00.000Z' }), AGORA)).toBe(false)
  })
})

describe('ordenarFila', () => {
  it('coloca vencidos antes de futuros', () => {
    const futuro = estado({ cardId: 'futuro', dueAt: '2026-08-30T12:00:00.000Z' })
    const vencido = estado({ cardId: 'vencido', dueAt: '2026-08-20T12:00:00.000Z' })
    expect(ordenarFila([futuro, vencido], AGORA).map((e) => e.cardId)).toEqual(['vencido', 'futuro'])
  })

  it('entre vencidos, prioriza quem falhou mais', () => {
    const a = estado({ cardId: 'poucas-falhas', dueAt: '2026-08-21T12:00:00.000Z', lapses: 0 })
    const b = estado({ cardId: 'muitas-falhas', dueAt: '2026-08-21T12:00:00.000Z', lapses: 4 })
    expect(ordenarFila([a, b], AGORA).map((e) => e.cardId)).toEqual(['muitas-falhas', 'poucas-falhas'])
  })

  it('com falhas iguais, prioriza o menos praticado', () => {
    const a = estado({ cardId: 'praticado', dueAt: '2026-08-21T12:00:00.000Z', repeticoes: 9 })
    const b = estado({ cardId: 'novo', dueAt: '2026-08-21T12:00:00.000Z', repeticoes: 1 })
    expect(ordenarFila([a, b], AGORA).map((e) => e.cardId)).toEqual(['novo', 'praticado'])
  })

  it('nao muta o array recebido', () => {
    const lista = [estado({ cardId: 'a' }), estado({ cardId: 'b', dueAt: '2026-08-01T12:00:00.000Z' })]
    const antes = lista.map((e) => e.cardId)
    ordenarFila(lista, AGORA)
    expect(lista.map((e) => e.cardId)).toEqual(antes)
  })
})

describe('diasAteProva', () => {
  it('calcula 63 dias entre 22/08 e 24/10 de 2026', () => {
    expect(diasAteProva(AGORA, '2026-10-24T12:00:00.000Z')).toBe(63)
  })

  it('devolve valor nao positivo quando a data ja passou', () => {
    expect(diasAteProva(AGORA, '2026-08-20T12:00:00.000Z')).toBeLessThanOrEqual(0)
  })
})

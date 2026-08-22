import { describe, expect, it } from 'vitest'
import { intercalarPor, moduloDeMaiorRisco, montarFilaDoDia } from './fila'
import { estadoInicial } from '../domain/scheduler'
import type { Card, ReviewState, TechniqueItem } from '../domain/types'
import type { Config } from '../persistence/repositorio'

const AGORA = new Date('2026-08-22T12:00:00.000Z')
const CONFIG: Config = { limiteDiario: 20, novosPorDia: 8 }

function item(id: string, posicao: string, moduloId = 'mod-guardas'): TechniqueItem {
  return {
    id,
    moduloId,
    posicao,
    slot: 'Raspada 1',
    categoria: 'Raspadas',
    nome: `Tecnica ${id}`,
    aliases: [],
    kind: 'raspagem',
    sideMode: 'nao_se_aplica',
    safetyLevel: 'baixo',
    validationStatus: 'sugestao_nao_validada',
    sourceReference: 'Secao 4',
    ativo: true,
  }
}

function cartao(id: string, itemId?: string): Card {
  return {
    id,
    itemId,
    type: 'explicacao',
    prompt: `Explique ${id}`,
    resposta: ['passo'],
    validationStatus: 'sugestao_nao_validada',
    ativo: true,
  }
}

/** Estado vencido (dueAt no passado). */
function vencido(cardId: string, over: Partial<ReviewState> = {}): ReviewState {
  return { ...estadoInicial(cardId, 'unico', AGORA), dueAt: '2026-08-20T12:00:00.000Z', ...over }
}

describe('intercalarPor', () => {
  it('alterna entre grupos em vez de agrupar', () => {
    const entrada = ['a1', 'a2', 'a3', 'b1', 'b2', 'c1']
    const saida = intercalarPor(entrada, (s) => s[0])
    expect(saida).toEqual(['a1', 'b1', 'c1', 'a2', 'b2', 'a3'])
  })

  it('preserva a ordem relativa dentro de cada grupo', () => {
    const saida = intercalarPor(['a1', 'a2', 'a3'], (s) => s[0])
    expect(saida).toEqual(['a1', 'a2', 'a3'])
  })

  it('nao perde nem duplica itens', () => {
    const entrada = ['a1', 'b1', 'b2', 'c1', 'c2', 'c3', 'c4']
    const saida = intercalarPor(entrada, (s) => s[0])
    expect(saida).toHaveLength(entrada.length)
    expect(new Set(saida)).toEqual(new Set(entrada))
  })

  it('lida com lista vazia', () => {
    expect(intercalarPor([], (s: string) => s)).toEqual([])
  })
})

describe('montarFilaDoDia', () => {
  it('coloca vencidos antes de novos', () => {
    const cartoes = [cartao('novo', 'i1'), cartao('velho', 'i2')]
    const itens = [item('i1', 'Guarda Fechada'), item('i2', 'Guarda Aranha')]
    const fila = montarFilaDoDia({ cartoes, itens, revisoes: [vencido('velho')], agora: AGORA, config: CONFIG })
    expect(fila.cartoes.map((c) => c.id)).toEqual(['velho', 'novo'])
  })

  it('respeita o limite diario', () => {
    const cartoes = Array.from({ length: 40 }, (_, i) => cartao(`c${i}`, 'i1'))
    const revisoes = cartoes.map((c) => vencido(c.id))
    const fila = montarFilaDoDia({
      cartoes,
      itens: [item('i1', 'Guarda Fechada')],
      revisoes,
      agora: AGORA,
      config: { limiteDiario: 20, novosPorDia: 8 },
    })
    expect(fila.cartoes).toHaveLength(20)
    expect(fila.vencidosTotal).toBe(40)
    expect(fila.vencidosAdiados).toBe(20)
  })

  it('limita cartoes novos por dia', () => {
    const cartoes = Array.from({ length: 50 }, (_, i) => cartao(`n${i}`, 'i1'))
    const fila = montarFilaDoDia({
      cartoes,
      itens: [item('i1', 'Guarda Fechada')],
      revisoes: [],
      agora: AGORA,
      config: { limiteDiario: 20, novosPorDia: 8 },
    })
    expect(fila.novos).toBe(8)
    expect(fila.cartoes).toHaveLength(8)
  })

  it('nao introduz cartao novo quando os vencidos ja tomam o limite', () => {
    // Aprender tecnica nova enquanto o ja estudado escapa da memoria e o
    // oposto do que o app deve incentivar.
    const vencidos = Array.from({ length: 20 }, (_, i) => cartao(`v${i}`, 'i1'))
    const novos = Array.from({ length: 10 }, (_, i) => cartao(`n${i}`, 'i2'))
    const fila = montarFilaDoDia({
      cartoes: [...vencidos, ...novos],
      itens: [item('i1', 'Guarda Fechada'), item('i2', 'Guarda Aranha')],
      revisoes: vencidos.map((c) => vencido(c.id)),
      agora: AGORA,
      config: { limiteDiario: 20, novosPorDia: 8 },
    })
    expect(fila.novos).toBe(0)
    expect(fila.cartoes).toHaveLength(20)
  })

  it('nao inclui cartao cujo vencimento e no futuro', () => {
    const futuro: ReviewState = { ...estadoInicial('c1', 'unico', AGORA), dueAt: '2026-09-30T12:00:00.000Z' }
    const fila = montarFilaDoDia({
      cartoes: [cartao('c1', 'i1')],
      itens: [item('i1', 'Guarda Fechada')],
      revisoes: [futuro],
      agora: AGORA,
      config: CONFIG,
    })
    expect(fila.cartoes).toEqual([])
    expect(fila.vencidosTotal).toBe(0)
  })

  it('ignora cartao inativo', () => {
    const inativo = { ...cartao('c1', 'i1'), ativo: false }
    const fila = montarFilaDoDia({
      cartoes: [inativo],
      itens: [item('i1', 'Guarda Fechada')],
      revisoes: [],
      agora: AGORA,
      config: CONFIG,
    })
    expect(fila.cartoes).toEqual([])
  })

  it('intercala posicoes: nao entrega uma guarda inteira em sequencia (ADR-005)', () => {
    const gf = ['gf1', 'gf2', 'gf3'].map((id) => cartao(id, 'i-gf'))
    const ar = ['ar1', 'ar2', 'ar3'].map((id) => cartao(id, 'i-ar'))
    const itens = [item('i-gf', 'Guarda Fechada'), item('i-ar', 'Guarda Aranha')]
    const fila = montarFilaDoDia({
      cartoes: [...gf, ...ar],
      itens,
      revisoes: [...gf, ...ar].map((c) => vencido(c.id)),
      agora: AGORA,
      config: CONFIG,
    })

    const posicoes = fila.cartoes.map((c) => (c.itemId === 'i-gf' ? 'GF' : 'AR'))
    // Com 3 de cada, uma fila agrupada daria GF,GF,GF,AR,AR,AR.
    const maiorSequenciaIgual = posicoes.reduce(
      (acc, p, i) => (i > 0 && p === posicoes[i - 1] ? { atual: acc.atual + 1, max: Math.max(acc.max, acc.atual + 1) } : { atual: 1, max: Math.max(acc.max, 1) }),
      { atual: 0, max: 0 },
    ).max
    expect(maiorSequenciaIgual).toBeLessThan(3)
  })

  it('espalha teoria e requisito em vez de amontoa-los no fim', () => {
    const teoria = Array.from({ length: 3 }, (_, i) => ({ ...cartao(`t${i}`), type: 'teoria' as const }))
    const tecnica = Array.from({ length: 3 }, (_, i) => cartao(`x${i}`, 'i1'))
    const fila = montarFilaDoDia({
      cartoes: [...tecnica, ...teoria],
      itens: [item('i1', 'Guarda Fechada')],
      revisoes: [...tecnica, ...teoria].map((c) => vencido(c.id)),
      agora: AGORA,
      config: CONFIG,
    })
    const tipos = fila.cartoes.map((c) => c.type)
    // Se teoria fosse amontoada, os 3 ultimos seriam todos 'teoria'.
    expect(tipos.slice(-3).every((t) => t === 'teoria')).toBe(false)
  })
})

describe('moduloDeMaiorRisco', () => {
  it('aponta o modulo com mais falhas acumuladas', () => {
    const cartoes = [cartao('c1', 'i1'), cartao('c2', 'i2')]
    const itens = [item('i1', 'Guarda Fechada', 'mod-guardas'), item('i2', 'Baiana', 'mod-quedas')]
    const revisoes = [vencido('c1', { lapses: 1 }), vencido('c2', { lapses: 5 })]
    expect(moduloDeMaiorRisco(cartoes, itens, revisoes)).toEqual({ moduloId: 'mod-quedas', lapses: 5 })
  })

  it('devolve undefined quando ninguem falhou ainda', () => {
    const cartoes = [cartao('c1', 'i1')]
    const itens = [item('i1', 'Guarda Fechada')]
    expect(moduloDeMaiorRisco(cartoes, itens, [vencido('c1')])).toBeUndefined()
  })
})

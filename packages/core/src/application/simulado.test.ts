import { describe, expect, it } from 'vitest'
import { embaralhar, escopoDoSimulado, montarSimulado, relatorioDoSimulado } from './simulado'
import type { Card, ReviewEvent, TechniqueItem } from '../domain/types'

function item(over: Partial<TechniqueItem> = {}): TechniqueItem {
  return {
    id: 'i1',
    moduloId: 'mod-guardas',
    posicao: 'Guarda Fechada',
    slot: 'Raspada 1',
    categoria: 'Raspadas',
    nome: 'Tesoura',
    aliases: [],
    kind: 'raspagem',
    sideMode: 'nao_se_aplica',
    safetyLevel: 'baixo',
    validationStatus: 'sugestao_nao_validada',
    sourceReference: 'Seção 4',
    ativo: true,
    ...over,
  }
}

function cartao(id: string, over: Partial<Card> = {}): Card {
  return {
    id,
    itemId: 'i1',
    type: 'explicacao',
    prompt: 'p',
    resposta: ['r'],
    validationStatus: 'sugestao_nao_validada',
    ativo: true,
    ...over,
  }
}

function evento(rating: ReviewEvent['rating'], usouDica = false): ReviewEvent {
  return { id: 'e', cardId: 'c', side: 'unico', rating, usouDica, createdAt: '2026-09-01T12:00:00.000Z' }
}

/** Gerador previsivel para deixar o embaralhamento deterministico nos testes. */
function aleatorioFixo(valores: number[]) {
  let i = 0
  return () => valores[i++ % valores.length]
}

describe('embaralhar', () => {
  it('nao perde nem duplica elementos', () => {
    const entrada = [1, 2, 3, 4, 5]
    const saida = embaralhar(entrada, aleatorioFixo([0.1, 0.9, 0.4, 0.7]))
    expect(saida).toHaveLength(5)
    expect(new Set(saida)).toEqual(new Set(entrada))
  })

  it('nao muta o array recebido', () => {
    const entrada = [1, 2, 3]
    embaralhar(entrada, aleatorioFixo([0.5]))
    expect(entrada).toEqual([1, 2, 3])
  })

  it('com a mesma fonte de aleatoriedade, produz a mesma ordem', () => {
    const a = embaralhar([1, 2, 3, 4], aleatorioFixo([0.2, 0.8, 0.5]))
    const b = embaralhar([1, 2, 3, 4], aleatorioFixo([0.2, 0.8, 0.5]))
    expect(a).toEqual(b)
  })
})

describe('escopoDoSimulado', () => {
  const cartoes = [
    cartao('tec1'),
    cartao('tec2', { type: 'sequencia' }),
    cartao('teo1', { itemId: undefined, type: 'teoria' }),
    cartao('req1', { itemId: undefined, type: 'requisito' }),
  ]
  const itens = [item()]

  it('modo tecnico exclui teoria e requisito', () => {
    const escopo = escopoDoSimulado(cartoes, itens, { modo: 'tecnico', quantidade: 10 })
    expect(escopo.map((c) => c.id).sort()).toEqual(['tec1', 'tec2'])
  })

  it('modo teorico deixa somente teoria e requisito', () => {
    const escopo = escopoDoSimulado(cartoes, itens, { modo: 'teorico', quantidade: 10 })
    expect(escopo.map((c) => c.id).sort()).toEqual(['req1', 'teo1'])
  })

  it('modo misto pega tudo', () => {
    const escopo = escopoDoSimulado(cartoes, itens, { modo: 'misto', quantidade: 10 })
    expect(escopo).toHaveLength(4)
  })

  it('exclui cartao de item inativo', () => {
    const escopo = escopoDoSimulado(cartoes, [item({ ativo: false })], { modo: 'tecnico', quantidade: 10 })
    expect(escopo).toEqual([])
  })

  it('exclui cartao inativo', () => {
    const escopo = escopoDoSimulado([cartao('x', { ativo: false })], itens, { modo: 'tecnico', quantidade: 10 })
    expect(escopo).toEqual([])
  })

  it('filtra por modulo quando pedido', () => {
    const itensDoisModulos = [item({ id: 'i1' }), item({ id: 'i2', moduloId: 'mod-saidas' })]
    const cs = [cartao('a', { itemId: 'i1' }), cartao('b', { itemId: 'i2' })]
    const escopo = escopoDoSimulado(cs, itensDoisModulos, {
      modo: 'tecnico',
      quantidade: 10,
      moduloIds: ['mod-saidas'],
    })
    expect(escopo.map((c) => c.id)).toEqual(['b'])
  })

  it('teoria sobrevive ao filtro de modulo — senao o modo teorico ficaria vazio', () => {
    const escopo = escopoDoSimulado(cartoes, itens, {
      modo: 'teorico',
      quantidade: 10,
      moduloIds: ['mod-saidas'],
    })
    expect(escopo.map((c) => c.id).sort()).toEqual(['req1', 'teo1'])
  })
})

describe('montarSimulado', () => {
  it('respeita a quantidade pedida', () => {
    const cartoes = Array.from({ length: 30 }, (_, i) => cartao(`c${i}`))
    const s = montarSimulado({
      cartoes,
      itens: [item()],
      config: { modo: 'tecnico', quantidade: 10 },
      aleatorio: aleatorioFixo([0.3, 0.7, 0.5, 0.1]),
    })
    expect(s).toHaveLength(10)
  })

  it('devolve menos que o pedido quando o escopo e pequeno', () => {
    const s = montarSimulado({
      cartoes: [cartao('c1')],
      itens: [item()],
      config: { modo: 'tecnico', quantidade: 20 },
      aleatorio: aleatorioFixo([0.5]),
    })
    expect(s).toHaveLength(1)
  })

  it('nao repete cartao dentro do simulado', () => {
    const cartoes = Array.from({ length: 12 }, (_, i) => cartao(`c${i}`))
    const s = montarSimulado({
      cartoes,
      itens: [item()],
      config: { modo: 'tecnico', quantidade: 12 },
      aleatorio: aleatorioFixo([0.2, 0.9, 0.4, 0.6, 0.1]),
    })
    expect(new Set(s.map((c) => c.id)).size).toBe(12)
  })
})

describe('relatorioDoSimulado', () => {
  const itens = [item({ id: 'i1', posicao: 'Guarda Fechada' }), item({ id: 'i2', posicao: 'Guarda Aranha' })]

  it('conta acertos como good e easy', () => {
    const r = relatorioDoSimulado({
      respostas: [
        { cartao: cartao('a'), evento: evento('good') },
        { cartao: cartao('b'), evento: evento('easy') },
        { cartao: cartao('c'), evento: evento('hard') },
        { cartao: cartao('d'), evento: evento('again') },
      ],
      itens,
    })
    expect(r.acertos).toBe(2)
    expect(r.total).toBe(4)
    expect(r.taxa).toBe(0.5)
  })

  it('lista as falhas para virar a proxima sessao', () => {
    const r = relatorioDoSimulado({
      respostas: [
        { cartao: cartao('ok'), evento: evento('good') },
        { cartao: cartao('errou'), evento: evento('again') },
      ],
      itens,
    })
    expect(r.falhas.map((c) => c.id)).toEqual(['errou'])
  })

  it('ordena categorias do pior para o melhor — o relatorio serve para achar lacuna', () => {
    const r = relatorioDoSimulado({
      respostas: [
        { cartao: cartao('a', { itemId: 'i1' }), evento: evento('good') },
        { cartao: cartao('b', { itemId: 'i1' }), evento: evento('good') },
        { cartao: cartao('c', { itemId: 'i2' }), evento: evento('again') },
        { cartao: cartao('d', { itemId: 'i2' }), evento: evento('again') },
      ],
      itens,
    })
    expect(r.porCategoria[0].rotulo).toBe('Guarda Aranha')
    expect(r.porCategoria[0].acertos).toBe(0)
  })

  it('agrupa teoria e requisito numa categoria propria', () => {
    const r = relatorioDoSimulado({
      respostas: [{ cartao: cartao('t', { itemId: undefined, type: 'teoria' }), evento: evento('good') }],
      itens,
    })
    expect(r.porCategoria[0].rotulo).toBe('Teoria e requisitos')
  })

  it('conta quantas respostas usaram dica', () => {
    const r = relatorioDoSimulado({
      respostas: [
        { cartao: cartao('a'), evento: evento('good', true) },
        { cartao: cartao('b'), evento: evento('good') },
      ],
      itens,
    })
    expect(r.usouDica).toBe(1)
  })

  it('simulado vazio nao quebra nem divide por zero', () => {
    const r = relatorioDoSimulado({ respostas: [], itens })
    expect(r).toMatchObject({ total: 0, acertos: 0, taxa: 0 })
    expect(r.falhas).toEqual([])
  })
})

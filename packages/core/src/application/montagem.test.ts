import { describe, expect, it } from 'vitest'
import {
  atribuicaoDoPlano,
  atribuir,
  atribuirVarios,
  aulaDoItem,
  espacamentoPorGuarda,
  montarEstado,
  tamanhosSugeridos,
} from './montagem'
import type { Atribuicao } from './montagem'
import { ITENS } from '../seed'
import type { TechniqueItem } from '../domain/types'

const ATIVOS = ITENS.filter((i) => i.ativo)

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

describe('atribuir', () => {
  it('poe o item na aula pedida', () => {
    const r = atribuir(new Map(), 'a', 3)
    expect(r.get(3)).toEqual(['a'])
  })

  it('REMOVE de onde estava antes de por no destino', () => {
    // A invariante central. Sem a remocao, mover da aula 3 para a 7 deixaria o
    // item nas duas e a soma passaria de 56 sem ninguem notar.
    const inicial: Atribuicao = new Map([[3, ['a', 'b']]])
    const r = atribuir(inicial, 'a', 7)
    expect(r.get(3)).toEqual(['b'])
    expect(r.get(7)).toEqual(['a'])
  })

  it('devolve ao bolsao com aula null', () => {
    const r = atribuir(new Map([[3, ['a', 'b']]]), 'a', null)
    expect(r.get(3)).toEqual(['b'])
    expect([...r.values()].flat()).not.toContain('a')
  })

  it('nao muta a atribuicao recebida', () => {
    const inicial = new Map([[3, ['a']]])
    atribuir(inicial, 'a', 7)
    expect(inicial.get(3)).toEqual(['a'])
  })

  it('atribuir ao mesmo lugar nao duplica', () => {
    const r = atribuir(new Map([[3, ['a']]]), 'a', 3)
    expect(r.get(3)).toEqual(['a'])
  })

  it('preserva a ordem em que os itens foram postos', () => {
    let a: Atribuicao = new Map()
    for (const id of ['x', 'y', 'z']) a = atribuir(a, id, 1)
    expect(a.get(1)).toEqual(['x', 'y', 'z'])
  })
})

describe('atribuirVarios', () => {
  it('move um grupo inteiro de uma vez', () => {
    const r = atribuirVarios(new Map([[1, ['a']]]), ['b', 'c'], 2)
    expect(r.get(2)).toEqual(['b', 'c'])
    expect(r.get(1)).toEqual(['a'])
  })

  it('mantem a invariante ao mover itens que estavam espalhados', () => {
    const inicial: Atribuicao = new Map([
      [1, ['a']],
      [2, ['b']],
    ])
    const r = atribuirVarios(inicial, ['a', 'b'], 3)
    expect(r.get(1)).toEqual([])
    expect(r.get(2)).toEqual([])
    expect(r.get(3)).toEqual(['a', 'b'])
  })
})

describe('aulaDoItem', () => {
  it('acha a aula do item, ou null se estiver no bolsao', () => {
    const a: Atribuicao = new Map([[4, ['x']]])
    expect(aulaDoItem(a, 'x')).toBe(4)
    expect(aulaDoItem(a, 'y')).toBeNull()
  })
})

describe('tamanhosSugeridos', () => {
  it('56 em 10 aulas sugere seis de 6 e quatro de 5', () => {
    const t = tamanhosSugeridos(56, 10)
    expect(t.filter((n) => n === 6)).toHaveLength(6)
    expect(t.filter((n) => n === 5)).toHaveLength(4)
    expect(t.reduce((a, b) => a + b, 0)).toBe(56)
  })

  it('divisao exata da todos iguais', () => {
    expect(tamanhosSugeridos(50, 10)).toEqual([5, 5, 5, 5, 5, 5, 5, 5, 5, 5])
  })

  it('casos degenerados nao quebram', () => {
    expect(tamanhosSugeridos(0, 10)).toEqual(Array(10).fill(0))
    expect(tamanhosSugeridos(10, 0)).toEqual([])
  })
})

describe('montarEstado', () => {
  it('comeca com tudo no bolsao e nenhuma aula preenchida', () => {
    const e = montarEstado({ itens: ATIVOS, atribuicao: new Map() })
    expect(e.total).toBe(56)
    expect(e.naoAtribuidos).toBe(56)
    expect(e.atribuidos).toBe(0)
    expect(e.aulas).toHaveLength(10)
    expect(e.aulas.every((a) => a.itens.length === 0)).toBe(true)
    expect(e.completo).toBe(false)
  })

  it('o bolsao vem agrupado pelas guardas do curriculo, na ordem do exame', () => {
    const e = montarEstado({ itens: ATIVOS, atribuicao: new Map() })
    expect(e.bolsao.map((g) => g.guarda)).toEqual([
      'fechada',
      'meia',
      'gancho',
      'aranha',
      'dela-riva',
      'laco',
      'aberta',
      'complexo',
      'saidas',
    ])
    expect(e.bolsao.reduce((n, g) => n + g.itens.length, 0)).toBe(56)
  })

  it('bolsao + aulas somam sempre o total — nao ha item perdido nem duplicado', () => {
    let a: Atribuicao = new Map()
    // Distribui 20 itens em aulas variadas.
    ATIVOS.slice(0, 20).forEach((it, i) => {
      a = atribuir(a, it.id, (i % 10) + 1)
    })
    const e = montarEstado({ itens: ATIVOS, atribuicao: a })
    expect(e.atribuidos).toBe(20)
    expect(e.naoAtribuidos).toBe(36)
    expect(e.atribuidos + e.naoAtribuidos).toBe(e.total)
  })

  it('o bolsao encolhe conforme itens sao atribuidos', () => {
    const a = atribuir(new Map(), ATIVOS[0].id, 1)
    const e = montarEstado({ itens: ATIVOS, atribuicao: a })
    expect(e.bolsao.reduce((n, g) => n + g.itens.length, 0)).toBe(55)
    expect(e.aulas[0].itens.map((i) => i.id)).toEqual([ATIVOS[0].id])
  })

  it('grupo do bolsao desaparece quando a guarda inteira foi atribuida', () => {
    const daLaco = ATIVOS.filter((i) => i.posicao.startsWith('Guarda Laço'))
    expect(daLaco.length).toBeGreaterThan(0)
    const a = atribuirVarios(
      new Map(),
      daLaco.map((i) => i.id),
      1,
    )
    const e = montarEstado({ itens: ATIVOS, atribuicao: a })
    expect(e.bolsao.map((g) => g.guarda)).not.toContain('laco')
  })

  it('acusa faltas enquanto sobrar item no bolsao', () => {
    const e = montarEstado({ itens: ATIVOS, atribuicao: atribuir(new Map(), ATIVOS[0].id, 1) })
    const falta = e.problemas.find((p) => p.tipo === 'faltam')
    expect(falta).toEqual({ tipo: 'faltam', quantos: 55 })
  })

  it('acusa aula vazia', () => {
    const a = atribuirVarios(
      new Map(),
      ATIVOS.map((i) => i.id),
      1,
    )
    const e = montarEstado({ itens: ATIVOS, atribuicao: a })
    const vazia = e.problemas.find((p) => p.tipo === 'aula-vazia')
    expect(vazia).toEqual({ tipo: 'aula-vazia', aulas: [2, 3, 4, 5, 6, 7, 8, 9, 10] })
    expect(e.completo).toBe(false)
  })

  it('completo somente quando os 56 estao distribuidos e nenhuma aula esta vazia', () => {
    // Objetivo declarado pelo aluno: encaixar os 56 nas 10 aulas.
    let a: Atribuicao = new Map()
    ATIVOS.forEach((it, i) => {
      a = atribuir(a, it.id, (i % 10) + 1)
    })
    const e = montarEstado({ itens: ATIVOS, atribuicao: a })
    expect(e.naoAtribuidos).toBe(0)
    expect(e.problemas).toEqual([])
    expect(e.completo).toBe(true)
  })

  it('detecta duplicado vindo de dado corrompido, sem confiar nele', () => {
    // `atribuir` nunca produz isto, mas o estado vem do armazenamento e pode
    // ter sido importado de um backup de outra versao.
    const id = ATIVOS[0].id
    const e = montarEstado({
      itens: ATIVOS,
      atribuicao: new Map([
        [1, [id]],
        [2, [id]],
      ]),
    })
    expect(e.problemas).toContainEqual({ tipo: 'duplicado', itemId: id, aulas: [1, 2] })
    // E mesmo assim nao mostra o item duas vezes na mesma aula.
    expect(e.aulas[0].itens).toHaveLength(1)
  })

  it('ignora id de item que nao existe mais, e avisa', () => {
    const e = montarEstado({ itens: ATIVOS, atribuicao: new Map([[1, ['fantasma']]]) })
    expect(e.problemas).toContainEqual({ tipo: 'item-inexistente', itemId: 'fantasma' })
    expect(e.aulas[0].itens).toEqual([])
    expect(e.naoAtribuidos).toBe(56)
  })

  it('nao conta item inativo', () => {
    const e = montarEstado({ itens: [item({ id: 'x', ativo: false })], atribuicao: new Map() })
    expect(e.total).toBe(0)
  })
})

describe('espacamentoPorGuarda', () => {
  it('marca como concentrada a guarda que cai numa aula so', () => {
    // O que a montagem manual perde em silencio: sem segunda passagem, o aluno
    // treina a guarda em setembro e nao volta a ela.
    const aulas = [
      { numero: 1, itens: [item({ id: 'a' }), item({ id: 'b' })] },
      { numero: 2, itens: [] },
    ]
    const [fechada] = espacamentoPorGuarda(aulas)
    expect(fechada.guarda).toBe('fechada')
    expect(fechada.aulas).toEqual([1])
    expect(fechada.concentrada).toBe(true)
    expect(fechada.menorIntervalo).toBeNull()
  })

  it('mede o menor intervalo entre aparicoes', () => {
    const aulas = [
      { numero: 1, itens: [item({ id: 'a' })] },
      { numero: 2, itens: [] },
      { numero: 6, itens: [item({ id: 'b' })] },
      { numero: 7, itens: [item({ id: 'c' })] },
    ]
    const [fechada] = espacamentoPorGuarda(aulas)
    expect(fechada.aulas).toEqual([1, 6, 7])
    // Intervalos 5 e 1: o menor manda, porque e o elo fraco do espacamento.
    expect(fechada.menorIntervalo).toBe(1)
    expect(fechada.concentrada).toBe(false)
  })

  it('mais de um item na mesma aula nao conta como duas aparicoes', () => {
    const aulas = [{ numero: 1, itens: [item({ id: 'a' }), item({ id: 'b' }), item({ id: 'c' })] }]
    expect(espacamentoPorGuarda(aulas)[0].aulas).toEqual([1])
  })

  it('devolve as guardas na ordem do curriculo', () => {
    const aulas = [
      { numero: 1, itens: [item({ id: 'a', posicao: 'Saída da Montada', moduloId: 'mod-saidas' })] },
      { numero: 2, itens: [item({ id: 'b', posicao: 'Guarda Fechada' })] },
    ]
    expect(espacamentoPorGuarda(aulas).map((e) => e.guarda)).toEqual(['fechada', 'saidas'])
  })

  it('aulas vazias devolvem lista vazia', () => {
    expect(espacamentoPorGuarda([{ numero: 1, itens: [] }])).toEqual([])
  })
})

describe('atribuicaoDoPlano', () => {
  it('converte o plano gerado em atribuicao inicial', () => {
    const a = atribuicaoDoPlano([
      { numero: 1, itens: [item({ id: 'a' }), item({ id: 'b' })] },
      { numero: 2, itens: [item({ id: 'c' })] },
    ])
    expect(a.get(1)).toEqual(['a', 'b'])
    expect(a.get(2)).toEqual(['c'])
  })
})

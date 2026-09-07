import { describe, expect, it } from 'vitest'
import { aulasFaltando, montarAtestado } from './atestado'
import type { RegistroDeCompetencia } from '../domain/competencia'
import type { Curriculo } from '../domain/curriculo'
import type { Modulo, TechniqueItem } from '../domain/types'
import { ITENS_1GRAU, MODULOS_1GRAU } from '../seed/primeiro-grau'

const AGORA = '2026-09-07T12:00:00.000Z'

function item(id: string, moduloId: string, over: Partial<TechniqueItem> = {}): TechniqueItem {
  return {
    id,
    moduloId,
    posicao: 'P',
    slot: 'S',
    categoria: 'C',
    nome: id,
    aliases: [],
    kind: 'raspagem',
    sideMode: 'nao_se_aplica',
    safetyLevel: 'baixo',
    validationStatus: 'aguardando_validacao',
    sourceReference: 'x',
    ativo: true,
    ...over,
  }
}

function curriculo(itens: TechniqueItem[]): Curriculo {
  return { itens, conteudos: [], requisitos: [], cartoesTeoria: [] }
}

const MODULOS: Modulo[] = [
  { id: 'm2', nome: 'Segundo', ordem: 2 },
  { id: 'm1', nome: 'Primeiro', ordem: 1 },
]

function reg(itemId: string, competente: boolean, quando = AGORA): RegistroDeCompetencia {
  return {
    id: `${itemId}-${quando}`,
    itemId,
    competente,
    texto: 'ok',
    origem: 'aula_regular',
    professorUid: 'prof',
    registradaEm: quando,
  }
}

describe('montarAtestado', () => {
  it('a ordem das secoes vem dos MODULOS, e nao da ordem dos itens', () => {
    // A folha e um documento da academia: a sequencia dos titulos e parte do
    // formato que o professor mandou.
    const a = montarAtestado({
      curriculo: curriculo([item('b', 'm2'), item('a', 'm1')]),
      modulos: MODULOS,
      registros: [],
      meta: '1grau',
      aulasCumpridas: null,
    })
    expect(a.grupos.map((g) => g.nome)).toEqual(['Primeiro', 'Segundo'])
  })

  it('modulo sem item ativo NAO vira secao vazia', () => {
    const a = montarAtestado({
      curriculo: curriculo([item('a', 'm1')]),
      modulos: MODULOS,
      registros: [],
      meta: '1grau',
      aulasCumpridas: null,
    })
    expect(a.grupos.map((g) => g.moduloId)).toEqual(['m1'])
  })

  it('conta atestados por grupo e no total', () => {
    const a = montarAtestado({
      curriculo: curriculo([item('a', 'm1'), item('b', 'm1'), item('c', 'm2')]),
      modulos: MODULOS,
      registros: [reg('a', true), reg('c', true)],
      meta: '1grau',
      aulasCumpridas: null,
    })
    expect(a.atestados).toBe(2)
    expect(a.total).toBe(3)
    expect(a.progresso).toBeCloseTo(2 / 3)
    expect(a.grupos.find((g) => g.moduloId === 'm1')?.atestados).toBe(1)
  })

  it('RETIRADO nao conta, mesmo tendo sido atestado antes', () => {
    const a = montarAtestado({
      curriculo: curriculo([item('a', 'm1')]),
      modulos: MODULOS,
      registros: [reg('a', true, '2026-09-01T00:00:00Z'), reg('a', false, '2026-09-05T00:00:00Z')],
      meta: '1grau',
      aulasCumpridas: null,
    })
    expect(a.atestados).toBe(0)
    // Mas o historico aparece: duas coisas aconteceram.
    expect(a.grupos[0].linhas[0].vezes).toBe(2)
    expect(a.grupos[0].linhas[0].ultimo?.competente).toBe(false)
  })

  it('completo so quando TODOS estao atestados', () => {
    const c = curriculo([item('a', 'm1'), item('b', 'm1')])
    const parcial = montarAtestado({
      curriculo: c, modulos: MODULOS, registros: [reg('a', true)],
      meta: '1grau', aulasCumpridas: null,
    })
    const cheio = montarAtestado({
      curriculo: c, modulos: MODULOS, registros: [reg('a', true), reg('b', true)],
      meta: '1grau', aulasCumpridas: null,
    })
    expect(parcial.competenciasCompletas).toBe(false)
    expect(cheio.competenciasCompletas).toBe(true)
  })

  it('curriculo VAZIO nao esta completo, e nao devolve NaN', () => {
    // Sem esta guarda, "apto" sairia verdadeiro por nao haver exigencia — e o
    // progresso seria NaN, que a tela mostraria como "NaN%".
    const a = montarAtestado({
      curriculo: curriculo([]), modulos: MODULOS, registros: [],
      meta: '1grau', aulasCumpridas: null,
    })
    expect(a.competenciasCompletas).toBe(false)
    expect(a.progresso).toBe(0)
    expect(Number.isNaN(a.progresso)).toBe(false)
  })

  it('ignora item inativo', () => {
    const a = montarAtestado({
      curriculo: curriculo([item('a', 'm1'), item('b', 'm1', { ativo: false })]),
      modulos: MODULOS, registros: [], meta: '1grau', aulasCumpridas: null,
    })
    expect(a.total).toBe(1)
  })

  it('`faltando` sai na ordem da folha', () => {
    const a = montarAtestado({
      curriculo: curriculo([item('b', 'm2'), item('a', 'm1')]),
      modulos: MODULOS, registros: [], meta: '1grau', aulasCumpridas: null,
    })
    expect(a.faltando.map((i) => i.id)).toEqual(['a', 'b'])
  })

  it('as aulas sao requisito SEPARADO, e `null` nao e zero', () => {
    // `null` significa "o app nao conta isso ainda, confira voce". Tratar como
    // zero faria a folha dizer que faltam 35 aulas a quem talvez tenha 40.
    const a = montarAtestado({
      curriculo: curriculo([item('a', 'm1')]),
      modulos: MODULOS, registros: [reg('a', true)],
      meta: '1grau', aulasCumpridas: null,
    })
    expect(a.competenciasCompletas).toBe(true)
    expect(a.aulas).toEqual({ exigidas: 35, cumpridas: null })
  })

  it('a meta traz quantas aulas exige', () => {
    const semExigencia = montarAtestado({
      curriculo: curriculo([item('a', 'm1')]),
      modulos: MODULOS, registros: [], meta: 'azul', aulasCumpridas: 12,
    })
    expect(semExigencia.aulas).toEqual({ exigidas: null, cumpridas: 12 })
  })
})

describe('aulasFaltando', () => {
  it('`null` SOBREVIVE ao calculo', () => {
    // `35 - null` daria 35 em JavaScript, e a folha diria que faltam 35 aulas a
    // quem o sistema simplesmente nao contou.
    expect(aulasFaltando({ exigidas: 35, cumpridas: null })).toBeNull()
    expect(aulasFaltando({ exigidas: null, cumpridas: 10 })).toBeNull()
  })

  it('subtrai quando sabe os dois', () => {
    expect(aulasFaltando({ exigidas: 35, cumpridas: 12 })).toBe(23)
  })

  it('nao devolve negativo', () => {
    // Quem fez 40 de 35 nao "deve" -5 aulas.
    expect(aulasFaltando({ exigidas: 35, cumpridas: 40 })).toBe(0)
  })
})

describe('com o curriculo REAL do 1o grau', () => {
  it('sao as seis secoes do professor, na ordem dele', () => {
    const a = montarAtestado({
      curriculo: { itens: ITENS_1GRAU, conteudos: [], requisitos: [], cartoesTeoria: [] },
      modulos: MODULOS_1GRAU,
      registros: [],
      meta: '1grau',
      aulasCumpridas: null,
    })
    expect(a.grupos.map((g) => g.nome)).toEqual([
      'Quedas',
      'Guarda fechada',
      'Educativos',
      'Posição individual',
      'Finalizações',
      'Saídas',
    ])
    expect(a.total).toBe(29)
    expect(a.grupos.map((g) => g.total)).toEqual([3, 6, 4, 4, 10, 2])
  })

  it('atestar tudo fecha as competencias, e as aulas seguem separadas', () => {
    const a = montarAtestado({
      curriculo: { itens: ITENS_1GRAU, conteudos: [], requisitos: [], cartoesTeoria: [] },
      modulos: MODULOS_1GRAU,
      registros: ITENS_1GRAU.map((i) => reg(i.id, true)),
      meta: '1grau',
      aulasCumpridas: null,
    })
    expect(a.atestados).toBe(29)
    expect(a.competenciasCompletas).toBe(true)
    expect(a.progresso).toBe(1)
    // E o professor ainda tem de conferir as 35 aulas de cabeca.
    expect(aulasFaltando(a.aulas)).toBeNull()
  })
})

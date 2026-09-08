import { describe, expect, it } from 'vitest'
import {
  aulaDeCadaItem,
  montarAcompanhamento,
  paresPendentes,
} from './acompanhamento'
import { ITENS_1GRAU, MODULOS_1GRAU } from '../seed/primeiro-grau'
import type { RegistroDeCompetencia } from '../domain/competencia'

const HOJE = new Date(2026, 8, 22, 12) // 22/09/2026, terca

const ALUNOS = [
  { uid: 'floki', nome: 'Floki' },
  { uid: 'willian', nome: 'Willian' },
  { uid: 'henrique', nome: 'Henrique' },
]

/** Um registro de competencia com o minimo. */
const reg = (
  itemId: string,
  competente: boolean,
  registradaEm = '2026-09-20T10:00:00.000Z',
): RegistroDeCompetencia => ({
  id: `r-${itemId}-${registradaEm}`,
  itemId,
  competente,
  texto: 'Aula 5 · RGI · 22/09/2026',
  origem: 'aula_regular',
  professorUid: 'prof',
  registradaEm,
})

const ukemi = ITENS_1GRAU.find((i) => i.nome === 'Ukemi')!
const doubleLeg = ITENS_1GRAU.find((i) => i.nome === 'Double leg')!

/** Aulas 1 e 2 no passado, aula 20 sem data. */
const AULAS = [
  { numero: 1, itemIds: [ukemi.id], slot: '2026-09-08T0800' },
  { numero: 5, itemIds: [doubleLeg.id], slot: '2026-09-22T0800' },
  { numero: 20, itemIds: [ITENS_1GRAU[6].id], slot: '' },
]

const base = {
  turma: 'RGI',
  alunos: ALUNOS,
  itens: ITENS_1GRAU,
  modulos: MODULOS_1GRAU,
  aulas: AULAS,
  hoje: HOJE,
}

describe('aulaDeCadaItem', () => {
  it('A PRIMEIRA APARICAO GANHA — repeticao e o metodo aqui', () => {
    /**
     * Um item aparece na aula 4 e volta na aula 14 (metodo do circulo). O que
     * decide "foi ensinado" e a PRIMEIRA vez: na segunda o aluno esta revendo, e
     * esperar a revisao atrasaria a fila do professor em dez aulas.
     */
    const m = aulaDeCadaItem([
      { numero: 14, itemIds: ['a'] },
      { numero: 4, itemIds: ['a'] },
    ])
    expect(m.get('a')).toBe(4)
  })

  it('item fora do programa nao tem aula', () => {
    expect(aulaDeCadaItem([{ numero: 1, itemIds: ['a'] }]).has('b')).toBe(false)
  })
})

describe('os tres estados de "esta aprendendo"', () => {
  const a = montarAcompanhamento({ ...base, registrosPorAluno: new Map() })
  const celulaDe = (itemId: string, uid: string) =>
    a.grupos
      .flatMap((g) => g.itens)
      .find((i) => i.item.id === itemId)!
      .celulas.find((c) => c.alunoUid === uid)!

  it('aula JA DADA e sem atestacao = PENDENTE (a fila do professor)', () => {
    // A aula 1 foi em 08/09 e hoje e 22/09.
    expect(celulaDe(ukemi.id, 'willian').estado).toBe('pendente')
  })

  it('aula de HOJE ja conta como dada — o professor atesta depois da aula', () => {
    // A aula 5 e hoje (22/09). Esperar amanha faria ele nao poder marcar o que
    // acabou de ver.
    expect(celulaDe(doubleLeg.id, 'willian').estado).toBe('pendente')
  })

  it('item programado SEM DATA nao e pendente', () => {
    /**
     * Sem esta condicao a fila nasceria com 29 linhas que o professor nao pode
     * resolver — ele nao pode atestar o que nao foi dado, e a tela viraria uma
     * lista de tarefas impossiveis no primeiro dia.
     */
    const semData = ITENS_1GRAU[6]
    expect(celulaDe(semData.id, 'willian').estado).toBe('nao-ensinado')
  })

  it('item FORA do programa tambem nao e pendente', () => {
    const fora = ITENS_1GRAU.find(
      (i) => ![ukemi.id, doubleLeg.id, ITENS_1GRAU[6].id].includes(i.id),
    )!
    expect(celulaDe(fora.id, 'willian').estado).toBe('nao-ensinado')
  })

  it('atestado vira ATESTADO', () => {
    const comAtestado = montarAcompanhamento({
      ...base,
      registrosPorAluno: new Map([['floki', [reg(ukemi.id, true)]]]),
    })
    const c = comAtestado.grupos
      .flatMap((g) => g.itens)
      .find((i) => i.item.id === ukemi.id)!
      .celulas.find((x) => x.alunoUid === 'floki')!
    expect(c.estado).toBe('atestado')
  })

  it('RETIRADO nao volta a parecer esquecimento', () => {
    /**
     * O professor atestou e depois retirou (registro novo com `competente:
     * false`). Se isso virasse `pendente`, ele marcaria de novo sem lembrar por
     * que tirou — e o log append-only ficaria com o vai-e-vem sem ninguem
     * entender.
     */
    const comRetirada = montarAcompanhamento({
      ...base,
      registrosPorAluno: new Map([
        ['floki', [reg(ukemi.id, true, '2026-09-10T10:00:00.000Z'), reg(ukemi.id, false, '2026-09-15T10:00:00.000Z')]],
      ]),
    })
    const c = comRetirada.grupos
      .flatMap((g) => g.itens)
      .find((i) => i.item.id === ukemi.id)!
      .celulas.find((x) => x.alunoUid === 'floki')!
    expect(c.estado).toBe('retirado')
    expect(c.estado).not.toBe('pendente')
  })
})

describe('a matriz', () => {
  const a = montarAcompanhamento({ ...base, registrosPorAluno: new Map() })

  it('cobre os 29 itens do 1o grau', () => {
    expect(a.totalDeItens).toBe(29)
    expect(a.grupos.flatMap((g) => g.itens)).toHaveLength(29)
  })

  it('uma celula por aluno em cada item', () => {
    for (const i of a.grupos.flatMap((g) => g.itens)) {
      expect(i.celulas).toHaveLength(3)
    }
  })

  it('OS GRUPOS SEGUEM A ORDEM DO PROFESSOR, e nao a do seed', () => {
    /**
     * A lista dele e Quedas, Guarda fechada, Educativos, Posicao individual,
     * Finalizacoes, Saidas. Ordenar pela ordem em que os itens aparecem no array
     * faria a tela seguir como o seed foi escrito, e ele procuraria
     * "Finalizacoes" onde ela nao esta.
     */
    expect(a.grupos.map((g) => g.modulo.id)).toEqual([
      'g1-quedas',
      'g1-guarda-fechada',
      'g1-educativos',
      'g1-dominio',
      'g1-finalizacoes',
      'g1-saidas',
    ])
  })

  it('modulo sem item nao vira grupo vazio', () => {
    const so = montarAcompanhamento({
      ...base,
      itens: ITENS_1GRAU.filter((i) => i.moduloId === 'g1-quedas'),
      registrosPorAluno: new Map(),
    })
    expect(so.grupos.map((g) => g.modulo.id)).toEqual(['g1-quedas'])
  })

  it('conta os ENSINADOS: so os itens de aula com data no passado', () => {
    // Ukemi (aula 1, 08/09) e Double leg (aula 5, hoje). O terceiro nao tem data.
    expect(a.ensinados).toBe(2)
  })

  it('a fila da turma e ensinados x alunos', () => {
    // 2 itens ensinados x 3 alunos, nenhum atestado.
    expect(a.pendentes).toBe(6)
  })

  it('cada aluno leva o proprio placar', () => {
    const comUm = montarAcompanhamento({
      ...base,
      registrosPorAluno: new Map([['floki', [reg(ukemi.id, true)]]]),
    })
    const floki = comUm.alunos.find((x) => x.uid === 'floki')!
    const willian = comUm.alunos.find((x) => x.uid === 'willian')!
    expect(floki.atestados).toBe(1)
    expect(floki.pendentes).toBe(1)
    expect(willian.atestados).toBe(0)
    expect(willian.pendentes).toBe(2)
  })

  it('o item diz em que aula foi dado e quando — o eixo "conforme as aulas progridem"', () => {
    const i = a.grupos.flatMap((g) => g.itens).find((x) => x.item.id === ukemi.id)!
    expect(i.aula).toBe(1)
    expect(i.data).toBe('2026-09-08')
    expect(i.ensinado).toBe(true)
  })

  it('turma sem aluno nao estoura', () => {
    const vazia = montarAcompanhamento({ ...base, alunos: [], registrosPorAluno: new Map() })
    expect(vazia.pendentes).toBe(0)
    expect(vazia.grupos.flatMap((g) => g.itens)).toHaveLength(29)
  })
})

describe('atestar a area inteira', () => {
  const a = montarAcompanhamento({
    ...base,
    registrosPorAluno: new Map([
      ['floki', [reg(ukemi.id, true)]],
      ['henrique', [reg(ukemi.id, false, '2026-09-15T10:00:00.000Z')]],
    ]),
  })
  const todos = a.grupos.flatMap((g) => g.itens)

  it('SO OS PENDENTES entram — atestado e retirado ficam fora', () => {
    /**
     * A diferenca entre util e destrutivo.
     *
     * Incluir `atestado` gravaria registro repetido num log append-only —
     * poluicao permanente. Incluir `retirado` DESFARIA uma decisao do professor
     * sem ele pedir, e ele nao veria: a celula so voltaria a verde.
     */
    const pares = paresPendentes(todos)
    const doUkemi = pares.filter((p) => p.itemId === ukemi.id)
    expect(doUkemi.map((p) => p.alunoUid)).toEqual(['willian'])
  })

  it('NAO inclui o que nao foi ensinado', () => {
    // Atestar o que nao foi dado e o unico jeito de o gate ficar sem significado.
    const pares = paresPendentes(todos)
    const semData = ITENS_1GRAU[6].id
    expect(pares.some((p) => p.itemId === semData)).toBe(false)
  })

  it('filtra por aluno quando pedido', () => {
    const doWillian = paresPendentes(todos, 'willian')
    expect(doWillian.every((p) => p.alunoUid === 'willian')).toBe(true)
    expect(doWillian).toHaveLength(2)
  })

  it('um GRUPO inteiro devolve so os pendentes dele', () => {
    const quedas = a.grupos.find((g) => g.modulo.id === 'g1-quedas')!
    const pares = paresPendentes(quedas.itens)
    // Double leg e de quedas e foi dado hoje: 3 alunos pendentes. Single leg e
    // Osoto gari nao tem data.
    expect(pares).toHaveLength(3)
    expect(new Set(pares.map((p) => p.itemId))).toEqual(new Set([doubleLeg.id]))
  })

  it('grupo sem pendencia devolve lista vazia, e o botao pode desabilitar', () => {
    const educativos = a.grupos.find((g) => g.modulo.id === 'g1-educativos')!
    // Ukemi e o unico ensinado ali; floki atestado, henrique retirado, willian pendente.
    expect(paresPendentes(educativos.itens, 'floki')).toEqual([])
    expect(paresPendentes(educativos.itens, 'henrique')).toEqual([])
  })

  it('o contador do grupo casa com o que o botao faria', () => {
    // Sem isto o botao diria "atestar 3" e gravaria 5 — ou o contrario.
    for (const g of a.grupos) {
      expect(paresPendentes(g.itens)).toHaveLength(g.pendentes)
    }
  })
})

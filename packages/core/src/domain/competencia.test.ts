import { describe, expect, it } from 'vitest'
import {
  competenciaAtual,
  criarCompetencia,
  historicoDoItem,
  itensCompetentes,
} from './competencia'
import type { RegistroDeCompetencia } from './competencia'

const AGORA = new Date('2026-09-07T12:00:00.000Z')

function reg(over: Partial<RegistroDeCompetencia> = {}): RegistroDeCompetencia {
  return {
    id: 'r1',
    itemId: 'i1',
    competente: true,
    texto: 'fez limpo dos dois lados',
    origem: 'aula_regular',
    professorUid: 'prof',
    registradaEm: AGORA.toISOString(),
    ...over,
  }
}

describe('criarCompetencia', () => {
  it('registra com data e autor', () => {
    const r = criarCompetencia({
      id: 'x',
      itemId: 'i1',
      competente: true,
      texto: 'ok',
      origem: 'aula_regular',
      professorUid: 'prof-joao',
      agora: AGORA,
    })
    expect(r.registradaEm).toBe(AGORA.toISOString())
    expect(r.professorUid).toBe('prof-joao')
  })

  it('EXIGE o texto do professor', () => {
    // Mesma regra de `criarValidacao`: atestacao sem justificativa nao e
    // rastreavel. Numa graduacao isso pesa mais — "atestei" sem dizer o que viu
    // nao ajuda ninguem seis meses depois.
    expect(() =>
      criarCompetencia({
        id: 'x', itemId: 'i1', competente: true, texto: '   ',
        origem: 'aula_regular', professorUid: 'p', agora: AGORA,
      }),
    ).toThrow(/texto/)
  })

  it('EXIGE o autor', () => {
    expect(() =>
      criarCompetencia({
        id: 'x', itemId: 'i1', competente: true, texto: 'ok',
        origem: 'aula_regular', professorUid: '', agora: AGORA,
      }),
    ).toThrow(/autor/)
  })

  it('retirar tambem exige texto', () => {
    // Retirar um atestado e mais grave que dar: precisa dizer por que.
    expect(() =>
      criarCompetencia({
        id: 'x', itemId: 'i1', competente: false, texto: '',
        origem: 'aula_regular', professorUid: 'p', agora: AGORA,
      }),
    ).toThrow(/texto/)
  })
})

describe('competenciaAtual', () => {
  it('a atestacao MAIS RECENTE vence, e nao a ultima da lista', () => {
    // Os registros vem de uma consulta ao Firestore, que nao promete ordem.
    // Confiar na ordem de chegada faria o estado depender de como o banco
    // devolveu a pagina.
    const registros = [
      reg({ id: 'novo', competente: false, registradaEm: '2026-09-07T00:00:00Z' }),
      reg({ id: 'velho', competente: true, registradaEm: '2026-09-01T00:00:00Z' }),
    ]
    expect(competenciaAtual(registros).get('i1')?.id).toBe('novo')
  })

  it('RETIRAR e uma linha nova, e nao a remocao da anterior', () => {
    // O professor pode ter atestado numa aula e mudado de opiniao na seguinte —
    // as duas coisas aconteceram, e o historico guarda as duas.
    const registros = [
      reg({ id: 'a', competente: true, registradaEm: '2026-09-01T00:00:00Z' }),
      reg({ id: 'b', competente: false, registradaEm: '2026-09-05T00:00:00Z' }),
    ]
    expect(itensCompetentes(registros).has('i1')).toBe(false)
    expect(historicoDoItem('i1', registros)).toHaveLength(2)
  })

  it('reatestar depois de retirar volta a contar', () => {
    const registros = [
      reg({ id: 'a', competente: true, registradaEm: '2026-09-01T00:00:00Z' }),
      reg({ id: 'b', competente: false, registradaEm: '2026-09-05T00:00:00Z' }),
      reg({ id: 'c', competente: true, registradaEm: '2026-09-06T00:00:00Z' }),
    ]
    expect(itensCompetentes(registros).has('i1')).toBe(true)
    expect(historicoDoItem('i1', registros).map((r) => r.id)).toEqual(['a', 'b', 'c'])
  })

  it('data invalida perde para data valida', () => {
    // Um relogio que devolve lixo nao pode vencer um valido — mesma regra de
    // `maisRecente` em procedencia.
    const registros = [
      reg({ id: 'lixo', competente: false, registradaEm: 'nao-e-data' }),
      reg({ id: 'boa', competente: true, registradaEm: '2026-09-01T00:00:00Z' }),
    ]
    expect(competenciaAtual(registros).get('i1')?.id).toBe('boa')
  })

  it('separa itens diferentes', () => {
    const registros = [
      reg({ id: 'a', itemId: 'i1', competente: true }),
      reg({ id: 'b', itemId: 'i2', competente: false }),
    ]
    const ids = itensCompetentes(registros)
    expect([...ids]).toEqual(['i1'])
  })

  it('lista vazia nao explode', () => {
    expect(competenciaAtual([]).size).toBe(0)
    expect(itensCompetentes([]).size).toBe(0)
    expect(historicoDoItem('i1', [])).toEqual([])
  })
})

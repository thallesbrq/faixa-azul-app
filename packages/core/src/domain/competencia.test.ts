import { describe, expect, it } from 'vitest'
import {
  competenciaAtual,
  criarCompetencia,
  historicoDoItem,
  itensCompetentes,
  procedenciaDaAtestacao,
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

  it('EXIGE procedencia — e o que ela guarda mudou de sentido', () => {
    /**
     * A GUARDA CONTINUA, O SIGNIFICADO MUDOU, E O DADO REAL DECIDIU.
     *
     * Este teste dizia "exige o texto do professor", com o argumento de que
     * atestacao sem justificativa nao e rastreavel. Das seis primeiras
     * atestacoes feitas em producao, CINCO tinham o texto `"ok"` — o campo
     * obrigatorio nao produziu justificativa, produziu atrito.
     *
     * O campo passou a guardar PROCEDENCIA gerada pelo app
     * (`procedenciaDaAtestacao`), que responde onde e quando o professor viu. A
     * guarda fica porque registro sem nenhum texto num log append-only e uma
     * linha que ninguem le seis meses depois.
     */
    expect(() =>
      criarCompetencia({
        id: 'x', itemId: 'i1', competente: true, texto: '   ',
        origem: 'aula_regular', professorUid: 'p', agora: AGORA,
      }),
    ).toThrow(/procedencia/)
  })

  it('EXIGE o autor', () => {
    expect(() =>
      criarCompetencia({
        id: 'x', itemId: 'i1', competente: true, texto: 'ok',
        origem: 'aula_regular', professorUid: '', agora: AGORA,
      }),
    ).toThrow(/autor/)
  })

  it('retirar tambem exige procedencia', () => {
    // Retirar um atestado e mais grave que dar. Aqui o professor NORMALMENTE vai
    // escrever — a tela oferece o campo — mas a guarda nao depende de ele
    // escrever: ela impede a linha anonima.
    expect(() =>
      criarCompetencia({
        id: 'x', itemId: 'i1', competente: false, texto: '',
        origem: 'aula_regular', professorUid: 'p', agora: AGORA,
      }),
    ).toThrow(/procedencia/)
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

// ---------------------------------------------------------------------------
// A procedencia que substitui a digitacao
// ---------------------------------------------------------------------------

describe('procedenciaDaAtestacao', () => {
  it('diz a aula, a turma e a data da AULA', () => {
    // "Aula 5 · RGI · 22/09/2026" responde onde e quando o professor viu — a
    // pergunta que a justificativa livre deveria responder e nao respondia.
    expect(
      procedenciaDaAtestacao({ turma: 'RGI', aula: 5, data: '2026-09-22', agora: AGORA }),
    ).toBe('Aula 5 · RGI · 22/09/2026')
  })

  it('a data vem da AULA e nao de hoje', () => {
    /**
     * O professor pode arrumar hoje um registro de uma aula da semana passada.
     * Gravar a data de hoje registraria quando ele ARRUMOU, e nao quando viu — e
     * seis meses depois isso e a diferenca entre um log que se le e um que
     * confunde.
     */
    const t = procedenciaDaAtestacao({
      turma: 'RGI', aula: 3, data: '2026-09-15', agora: new Date(2026, 9, 30, 12),
    })
    expect(t).toContain('15/09/2026')
    expect(t).not.toContain('30/10')
  })

  it('SEM AULA nao inventa uma — diz so a data de hoje', () => {
    // Atestar fora de aula e caso real: revendo a turma, ou num exame.
    const t = procedenciaDaAtestacao({ turma: 'RGI', aula: null, data: null, agora: AGORA })
    expect(t).not.toMatch(/Aula/)
    expect(t).toContain('RGI')
  })

  it('NAO monta a data por `Date` — o caminho que traz fuso de volta', () => {
    /**
     * A data chega como texto `YYYY-MM-DD` e sai como `DD/MM/YYYY` por corte de
     * string. Passar por `new Date('2026-09-22')` a interpretaria como UTC e, em
     * UTC-3, ela viraria 21/09 — o mesmo defeito que `application/agenda` existe
     * para evitar, reintroduzido pela porta do texto.
     */
    expect(
      procedenciaDaAtestacao({ turma: 'RGI', aula: 1, data: '2026-01-01', agora: AGORA }),
    ).toContain('01/01/2026')
  })

  it('turma vazia nao deixa separador solto', () => {
    expect(
      procedenciaDaAtestacao({ turma: '', aula: 2, data: '2026-09-10', agora: AGORA }),
    ).toBe('Aula 2 · 10/09/2026')
  })
})

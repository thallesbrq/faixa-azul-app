import { describe, expect, it } from 'vitest'
import {
  contar,
  escolherPorDono,
  houveMudanca,
  mesclarCampos,
  relatorioVazio,
  unirLogs,
  unirPorChave,
} from './merge'
import { descreverMarca, maisRecente, marcaDeMigracao, marcar } from './procedencia'
import type { Marca, Origem } from './procedencia'

const T = (iso: string) => new Date(iso)

function reg(por: Origem, iso: string, versao = 1, extra: Record<string, unknown> = {}) {
  return { marca: { alteradoEm: iso, alteradoPor: por, versao }, ...extra }
}

// ---------------------------------------------------------------------------
// procedencia
// ---------------------------------------------------------------------------

describe('marcar', () => {
  it('incrementa a versao a partir da marca anterior', () => {
    const a = marcar('aluno', T('2026-09-01T10:00:00Z'))
    expect(a.versao).toBe(1)
    expect(marcar('aluno', T('2026-09-01T11:00:00Z'), a).versao).toBe(2)
  })

  it('marca de migracao nasce com versao 0 e perde para qualquer alteracao nova', () => {
    // Dado antigo nao tem data confiavel; presumir que e recente seria inventar.
    const antiga = marcaDeMigracao('aluno', '2026-09-01T10:00:00Z')
    const nova = { alteradoEm: '2026-09-01T10:00:00Z', alteradoPor: 'aluno' as const, versao: 1 }
    expect(antiga.versao).toBe(0)
    expect(maisRecente(antiga, nova)).toBe(nova)
  })
})

describe('maisRecente', () => {
  it('a data mais nova vence', () => {
    const a: Marca = { alteradoEm: '2026-09-01T10:00:00Z', alteradoPor: 'aluno', versao: 1 }
    const b: Marca = { alteradoEm: '2026-09-01T12:00:00Z', alteradoPor: 'professor', versao: 1 }
    expect(maisRecente(a, b)).toBe(b)
    expect(maisRecente(b, a)).toBe(b)
  })

  it('data igual desempata pela versao — o caso do mesmo aparelho no mesmo minuto', () => {
    const a: Marca = { alteradoEm: '2026-09-01T10:00:00Z', alteradoPor: 'aluno', versao: 1 }
    const b: Marca = { alteradoEm: '2026-09-01T10:00:00Z', alteradoPor: 'aluno', versao: 5 }
    expect(maisRecente(a, b)).toBe(b)
  })

  it('data invalida PERDE para data valida — relogio que devolve lixo nao vence', () => {
    const lixo: Marca = { alteradoEm: 'nao-e-data', alteradoPor: 'aluno', versao: 99 }
    const boa: Marca = { alteradoEm: '2026-09-01T10:00:00Z', alteradoPor: 'professor', versao: 1 }
    expect(maisRecente(lixo, boa)).toBe(boa)
    expect(maisRecente(boa, lixo)).toBe(boa)
  })

  it('NAO depende da ordem dos argumentos — a propriedade que evita divergencia', () => {
    // Aluno e professor mesclam o mesmo par com os lados TROCADOS. Se o
    // desempate olhasse a posicao, cada aparelho escolheria um registro e os
    // dois divergiriam em silencio.
    const casos: [Marca, Marca][] = [
      [
        { alteradoEm: '2026-09-01T10:00:00Z', alteradoPor: 'aluno', versao: 1 },
        { alteradoEm: '2026-09-01T10:00:00Z', alteradoPor: 'professor', versao: 1 },
      ],
      [
        { alteradoEm: '2026-09-01T10:00:00Z', alteradoPor: 'aluno', versao: 3 },
        { alteradoEm: '2026-09-01T10:00:00Z', alteradoPor: 'professor', versao: 1 },
      ],
      [
        { alteradoEm: 'lixo', alteradoPor: 'aluno', versao: 1 },
        { alteradoEm: 'lixo', alteradoPor: 'professor', versao: 1 },
      ],
    ]
    for (const [a, b] of casos) {
      expect(maisRecente(a, b)).toEqual(maisRecente(b, a))
    }
  })

  it('duas datas invalidas nao viram empate falso — cai para versao e autor', () => {
    const a: Marca = { alteradoEm: 'x', alteradoPor: 'aluno', versao: 1 }
    const b: Marca = { alteradoEm: 'y', alteradoPor: 'aluno', versao: 7 }
    expect(maisRecente(a, b)).toBe(b)
  })
})

describe('descreverMarca', () => {
  it('diz quem e quando, em portugues', () => {
    const m: Marca = { alteradoEm: '2026-09-02T12:14:00Z', alteradoPor: 'professor', versao: 1 }
    const texto = descreverMarca(m, 'UTC')
    expect(texto).toContain('pelo professor')
    expect(texto).toContain('02/09')
  })

  it('nao quebra com data invalida — a tela nunca mostra "Invalid Date"', () => {
    const m: Marca = { alteradoEm: 'xx', alteradoPor: 'aluno', versao: 1 }
    expect(descreverMarca(m)).toBe('por você')
  })
})

// ---------------------------------------------------------------------------
// uniao de logs
// ---------------------------------------------------------------------------

describe('unirLogs', () => {
  it('une sem duplicar e sem perder ninguem', () => {
    const a = [{ id: '1' }, { id: '2' }]
    const b = [{ id: '2' }, { id: '3' }]
    expect(unirLogs(a, b).map((x) => x.id)).toEqual(['1', '2', '3'])
  })

  it('NADA se perde nos dois sentidos — a propriedade que faz log nao conflitar', () => {
    const aluno = Array.from({ length: 40 }, (_, i) => ({ id: 'al-' + i }))
    const prof = Array.from({ length: 15 }, (_, i) => ({ id: 'pr-' + i }))
    expect(unirLogs(aluno, prof)).toHaveLength(55)
    expect(unirLogs(prof, aluno)).toHaveLength(55)
  })

  it('e idempotente: unir duas vezes nao muda nada', () => {
    const a = [{ id: '1' }, { id: '2' }]
    const b = [{ id: '2' }, { id: '3' }]
    const uma = unirLogs(a, b)
    expect(unirLogs(uma, b)).toEqual(uma)
    expect(unirLogs(uma, uma)).toEqual(uma)
  })

  it('preserva a ordem de chegada', () => {
    const a = [{ id: 'z' }, { id: 'a' }]
    const b = [{ id: 'm' }]
    expect(unirLogs(a, b).map((x) => x.id)).toEqual(['z', 'a', 'm'])
  })
})

// ---------------------------------------------------------------------------
// regra de dono
// ---------------------------------------------------------------------------

describe('escolherPorDono', () => {
  it('o dono vence mesmo com a data MAIS ANTIGA — o relogio nao manda aqui', () => {
    // O ponto do mecanismo: com o relogio de um aparelho torto, desempate por
    // data erraria. Onde ha dono, a hora nao e consultada.
    const doProf = reg('professor', '2026-09-01T08:00:00Z')
    const doAluno = reg('aluno', '2026-09-01T23:00:00Z')
    expect(escolherPorDono(doAluno, doProf, 'professor')).toBe(doProf)
    expect(escolherPorDono(doProf, doAluno, 'professor')).toBe(doProf)
  })

  it('quando os dois vem do dono, a data desempata', () => {
    const antigo = reg('professor', '2026-09-01T08:00:00Z')
    const novo = reg('professor', '2026-09-02T08:00:00Z')
    expect(escolherPorDono(antigo, novo, 'professor')).toBe(novo)
  })

  it('quando nenhum e do dono, a data desempata', () => {
    const antigo = reg('aluno', '2026-09-01T08:00:00Z')
    const novo = reg('aluno', '2026-09-02T08:00:00Z')
    expect(escolherPorDono(antigo, novo, 'professor')).toBe(novo)
  })

  it('e comutativo: a ordem dos argumentos nao muda o resultado', () => {
    // Sem isto, aluno e professor mesclando o mesmo par chegariam a estados
    // DIFERENTES — e cada troca seguinte espalharia a divergencia.
    const casos: [ReturnType<typeof reg>, ReturnType<typeof reg>, Origem][] = [
      [reg('aluno', '2026-09-01T08:00:00Z'), reg('professor', '2026-09-02T08:00:00Z'), 'professor'],
      [reg('professor', '2026-09-03T08:00:00Z'), reg('aluno', '2026-09-01T08:00:00Z'), 'aluno'],
      [reg('aluno', '2026-09-01T08:00:00Z'), reg('aluno', '2026-09-02T08:00:00Z'), 'professor'],
      // Empate exato de data: antes desta correcao, este caso devolvia o
      // PRIMEIRO argumento, e os dois aparelhos divergiam.
      [reg('aluno', '2026-09-01T08:00:00Z'), reg('professor', '2026-09-01T08:00:00Z'), 'aluno'],
      [reg('aluno', '2026-09-01T08:00:00Z'), reg('professor', '2026-09-01T08:00:00Z'), 'professor'],
    ]
    for (const [x, y, dono] of casos) {
      expect(escolherPorDono(x, y, dono)).toBe(escolherPorDono(y, x, dono))
    }
  })
})

describe('unirPorChave', () => {
  const chave = (t: { k: string }) => t.k

  it('acrescenta o que so existe de um lado', () => {
    const a = [{ k: 'x', ...reg('aluno', '2026-09-01T08:00:00Z') }]
    const b = [{ k: 'y', ...reg('professor', '2026-09-01T08:00:00Z') }]
    const r = unirPorChave(a, b, chave, (l) => l)
    expect(r.map((t) => t.k)).toEqual(['x', 'y'])
  })

  it('colisao vai para o resolvedor', () => {
    const a = [{ k: 'x', ...reg('aluno', '2026-09-01T08:00:00Z'), quem: 'local' }]
    const b = [{ k: 'x', ...reg('professor', '2026-09-01T09:00:00Z'), quem: 'recebido' }]
    const r = unirPorChave(a, b, chave, (l, rec) => escolherPorDono(l, rec, 'professor'))
    expect(r).toHaveLength(1)
    expect(r[0].quem).toBe('recebido')
  })

  it('a GRADE do professor sobrevive ao merge com o estudo do aluno', () => {
    // O cenario concreto que motivou tudo: professor monta 10h, aluno estuda
    // 10h05, trocam depois. Com desempate global o mais novo venceria inteiro
    // e a grade sumiria.
    const gradeDoProf = [{ k: 'aula-3', ...reg('professor', '2026-09-02T10:00:00Z'), itens: ['a', 'b'] }]
    const gradeNoAluno = [{ k: 'aula-3', ...reg('aluno', '2026-09-02T10:05:00Z'), itens: [] }]
    const r = unirPorChave(gradeNoAluno, gradeDoProf, chave, (l, rec) =>
      escolherPorDono(l, rec, 'professor'),
    )
    expect(r[0].itens).toEqual(['a', 'b'])
  })
})

// ---------------------------------------------------------------------------
// relatorio
// ---------------------------------------------------------------------------

describe('relatorio', () => {
  it('vazio nao anuncia mudanca', () => {
    expect(houveMudanca(relatorioVazio())).toBe(false)
  })

  it('conta por categoria e anuncia', () => {
    const r = relatorioVazio()
    contar(r.novos, 'eventos', 12)
    contar(r.substituidos, 'aulas')
    expect(r.novos.eventos).toBe(12)
    expect(r.substituidos.aulas).toBe(1)
    expect(houveMudanca(r)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// dono POR CAMPO — o caso que dono por registro perdia
// ---------------------------------------------------------------------------

describe('mesclarCampos', () => {
  type Aula = { numero: number; itemIds?: string[]; realizadaEm?: string; notas?: string }
  const DONOS = {
    itemIds: 'professor',
    notas: 'professor',
    realizadaEm: 'aluno',
  } as const

  const m = (por: Origem, iso: string, versao = 1): Marca => ({
    alteradoEm: iso,
    alteradoPor: por,
    versao,
  })

  it('A GRADE do professor e o "aula feita" do aluno CONVIVEM', () => {
    // O cenario que motivou dono por campo: com dono por registro, "o professor
    // vence" apagaria realizadaEm toda vez que ele mandasse a grade.
    const local: Aula = { numero: 3, itemIds: [], realizadaEm: '2026-09-02T11:00:00Z' }
    const recebido: Aula = { numero: 3, itemIds: ['a', 'b'], realizadaEm: undefined }

    const r = mesclarCampos(
      local,
      recebido,
      DONOS,
      { itemIds: m('aluno', '2026-09-01T08:00:00Z'), realizadaEm: m('aluno', '2026-09-02T11:00:00Z') },
      { itemIds: m('professor', '2026-09-02T10:00:00Z') },
    )

    expect(r.valor.itemIds).toEqual(['a', 'b'])
    expect(r.valor.realizadaEm).toBe('2026-09-02T11:00:00Z')
    expect(r.substituidos).toEqual(['itemIds'])
  })

  it('o professor NAO consegue desmarcar a aula mandando a grade', () => {
    // Mesmo com a data do professor mais nova, realizadaEm e do aluno.
    const local: Aula = { numero: 1, realizadaEm: '2026-09-01T09:00:00Z' }
    const recebido: Aula = { numero: 1, realizadaEm: undefined }
    const r = mesclarCampos(
      local,
      recebido,
      DONOS,
      { realizadaEm: m('aluno', '2026-09-01T09:00:00Z') },
      { realizadaEm: m('professor', '2026-09-05T09:00:00Z') },
    )
    expect(r.valor.realizadaEm).toBe('2026-09-01T09:00:00Z')
  })

  it('campo sem marca do lado recebido nao mexe no local', () => {
    // Dado anterior as marcas nunca sobrescreve dado novo por omissao.
    const local: Aula = { numero: 1, notas: 'minha nota' }
    const recebido: Aula = { numero: 1, notas: undefined }
    const r = mesclarCampos(local, recebido, DONOS, { notas: m('professor', '2026-09-01T09:00:00Z') }, {})
    expect(r.valor.notas).toBe('minha nota')
    expect(r.substituidos).toEqual([])
  })

  it('campo novo do lado recebido preenche o que aqui nunca existiu', () => {
    const local: Aula = { numero: 1 }
    const recebido: Aula = { numero: 1, notas: 'chegar 10 min antes' }
    const r = mesclarCampos(local, recebido, DONOS, {}, { notas: m('professor', '2026-09-01T09:00:00Z') })
    expect(r.valor.notas).toBe('chegar 10 min antes')
    expect(r.marcas.notas?.alteradoPor).toBe('professor')
  })

  it('nao depende da ordem: os dois aparelhos chegam ao mesmo resultado', () => {
    const a: Aula = { numero: 2, itemIds: ['x'], realizadaEm: '2026-09-02T11:00:00Z' }
    const b: Aula = { numero: 2, itemIds: ['y', 'z'], realizadaEm: undefined }
    const ma = { itemIds: m('aluno', '2026-09-01T08:00:00Z'), realizadaEm: m('aluno', '2026-09-02T11:00:00Z') }
    const mb = { itemIds: m('professor', '2026-09-02T10:00:00Z') }

    const daAluno = mesclarCampos(a, b, DONOS, ma, mb)
    const doProf = mesclarCampos(b, a, DONOS, mb, ma)

    expect(daAluno.valor.itemIds).toEqual(doProf.valor.itemIds)
    expect(daAluno.valor.realizadaEm).toEqual(doProf.valor.realizadaEm)
  })

  it('e idempotente: mesclar o resultado de novo nao muda nada', () => {
    const local: Aula = { numero: 1, itemIds: ['a'] }
    const recebido: Aula = { numero: 1, itemIds: ['b', 'c'] }
    const ml = { itemIds: m('aluno', '2026-09-01T08:00:00Z') }
    const mr = { itemIds: m('professor', '2026-09-02T10:00:00Z') }

    const uma = mesclarCampos(local, recebido, DONOS, ml, mr)
    const duas = mesclarCampos(uma.valor, recebido, DONOS, uma.marcas, mr)
    expect(duas.valor).toEqual(uma.valor)
    expect(duas.substituidos).toEqual([])
  })
})

import { describe, expect, it } from 'vitest'
import { depositoEmMemoria } from './deposito'
import {
  ACADEMIA_PADRAO,
  CHAVE,
  VERSAO_ATUAL,
  carregar,
  estadoInicial,
  migrar,
  exportarJSON,
  importarJSON,
  salvar,
} from './repositorio'

const AGORA = new Date('2026-08-22T12:00:00.000Z')

describe('carregar', () => {
  it('devolve estado inicial quando nao ha nada gravado', () => {
    const estado = carregar(depositoEmMemoria(), AGORA)
    expect(estado.versao).toBe(VERSAO_ATUAL)
    expect(estado.eventos).toEqual([])
    expect(estado.planoExame.provisoria).toBe(true)
  })

  it('a meta do exame nasce marcada como provisoria', () => {
    // O professor ainda nao marcou a data. A UI precisa poder dizer isso.
    expect(carregar(depositoEmMemoria(), AGORA).planoExame.provisoria).toBe(true)
  })

  it('recupera o que foi salvo', () => {
    const deposito = depositoEmMemoria()
    const estado = estadoInicial(AGORA)
    estado.eventos.push({
      id: 'e1',
      cardId: 'c1',
      side: 'unico',
      rating: 'good',
      usouDica: false,
      createdAt: AGORA.toISOString(),
    })
    salvar(deposito, estado)

    expect(carregar(deposito, AGORA).eventos).toHaveLength(1)
  })

  it('completa campos ausentes de um estado antigo sem descartar o resto', () => {
    // Um estado gravado por uma versao anterior pode nao ter todos os campos.
    const deposito = depositoEmMemoria({
      [CHAVE]: JSON.stringify({ versao: 1, eventos: [{ id: 'e1' }] }),
    })
    const estado = carregar(deposito, AGORA)
    expect(estado.eventos).toHaveLength(1)
    expect(estado.config.limiteDiario).toBeGreaterThan(0)
    expect(estado.revisoes).toEqual([])
  })

  it('nao perde o dado bruto quando o JSON esta corrompido', () => {
    // Perder o progresso silenciosamente e pior que comecar limpo avisando.
    const deposito = depositoEmMemoria({ [CHAVE]: '{isso nao e json' })
    const estado = carregar(deposito, AGORA)

    expect(estado.eventos).toEqual([])
    expect(deposito.ler(`${CHAVE}__corrompido_${AGORA.getTime()}`)).toBe('{isso nao e json')
  })
})

describe('exportar e importar (RF-10)', () => {
  it('faz a volta completa preservando o historico', () => {
    const estado = estadoInicial(AGORA)
    estado.eventos.push({
      id: 'e1',
      cardId: 'c1',
      side: 'unico',
      rating: 'again',
      usouDica: true,
      createdAt: AGORA.toISOString(),
    })

    const importado = importarJSON(exportarJSON(estado), AGORA)
    expect(importado.eventos).toEqual(estado.eventos)
  })

  it('recusa arquivo que nao e backup deste app', () => {
    expect(() => importarJSON(JSON.stringify({ qualquer: 'coisa' }), AGORA)).toThrow(/nao parece um backup/)
  })

  it('recusa JSON invalido', () => {
    expect(() => importarJSON('nao e json', AGORA)).toThrow()
  })
})

describe('deposito em memoria', () => {
  it('le, escreve e remove', () => {
    const d = depositoEmMemoria()
    expect(d.ler('x')).toBeNull()
    d.escrever('x', '1')
    expect(d.ler('x')).toBe('1')
    d.remover('x')
    expect(d.ler('x')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Migracao v1 -> v2: identidade e procedencia
// ---------------------------------------------------------------------------

describe('migracao v1 -> v2', () => {
  const ID = () => 'id-fixo'

  /** Estado v1 plausivel: com aulas montadas, uma feita, e itens anotados. */
  function v1(): Record<string, unknown> {
    return {
      versao: 1,
      planoExame: { academia: 'X', professor: 'Y', dataAlvo: '2026-10-24T12:00:00.000Z', provisoria: true, criadoEm: '2026-01-01T00:00:00.000Z' },
      config: { limiteDiario: 20, novosPorDia: 8 },
      revisoes: [],
      eventos: [{ id: 'ev-1' }],
      validacoes: [],
      aulas: [
        { numero: 1, realizadaEm: '2026-09-02T11:00:00.000Z', itemIds: ['a', 'b'] },
        { numero: 2 },
      ],
      itens: [
        { itemId: 'i1', dificuldade: 'dificil', video: 'https://x' },
        { itemId: 'i2' },
      ],
      duvidas: [],
      sessoes: [],
    }
  }

  it('cria perfil de aluno com id estavel', () => {
    const e = migrar(v1(), AGORA, ID)
    expect(e.versao).toBe(2)
    expect(e.perfil).toEqual({ id: 'id-fixo', nome: '', papel: 'aluno', academiaId: ACADEMIA_PADRAO })
  })

  it('marca SO os campos que realmente tem valor', () => {
    // Marcar campo ausente faria um `undefined` local vencer um valor que
    // chegasse depois do outro aparelho.
    const e = migrar(v1(), AGORA, ID)
    const aula1 = e.aulas.find((a) => a.numero === 1)
    const aula2 = e.aulas.find((a) => a.numero === 2)

    expect(Object.keys(aula1?.marcas ?? {}).sort()).toEqual(['itemIds', 'realizadaEm'])
    expect(aula1?.marcas?.notas).toBeUndefined()
    expect(aula2?.marcas).toEqual({})
  })

  it('a marca de migracao nasce versao 0 e atribuida ao aluno', () => {
    // Ninguem sabe quando aquele dado foi escrito: ele perde qualquer
    // desempate para uma alteracao nova, em vez de fingir ser recente.
    const e = migrar(v1(), AGORA, ID)
    const marca = e.aulas[0].marcas?.itemIds
    expect(marca?.versao).toBe(0)
    expect(marca?.alteradoPor).toBe('aluno')
  })

  it('NAO apaga nada do que existia', () => {
    const antes = v1()
    const e = migrar(antes, AGORA, ID)
    expect(e.aulas[0].itemIds).toEqual(['a', 'b'])
    expect(e.aulas[0].realizadaEm).toBe('2026-09-02T11:00:00.000Z')
    expect(e.itens[0].dificuldade).toBe('dificil')
    expect(e.eventos).toHaveLength(1)
    expect(e.planoExame.dataAlvo).toBe('2026-10-24T12:00:00.000Z')
  })

  it('e idempotente: migrar duas vezes nao remarca nem troca o id', () => {
    const uma = migrar(v1(), AGORA, ID)
    const duas = migrar(uma as unknown as Record<string, unknown>, new Date('2027-01-01T00:00:00.000Z'), () => 'outro-id')
    expect(duas.perfil.id).toBe('id-fixo')
    expect(duas.aulas[0].marcas).toEqual(uma.aulas[0].marcas)
  })

  it('aguenta estado v1 sem as colecoes', () => {
    const e = migrar({ versao: 1 }, AGORA, ID)
    expect(e.aulas).toEqual([])
    expect(e.indicacoes).toEqual([])
    expect(e.perfil.papel).toBe('aluno')
  })

  it('GUARDA uma copia do original antes de migrar', () => {
    // O app esta no ar com dado real: a migracao sobrescreve a unica copia na
    // escrita seguinte, e um defeito seria descoberto tarde e sem volta.
    const mem = new Map<string, string>()
    const deposito = {
      ler: (k: string) => mem.get(k) ?? null,
      escrever: (k: string, v: string) => void mem.set(k, v),
      remover: (k: string) => void mem.delete(k),
    }
    const original = JSON.stringify(v1())
    mem.set(CHAVE, original)

    carregar(deposito, AGORA)

    const backups = [...mem.keys()].filter((k) => k.startsWith(`${CHAVE}__backup_`))
    expect(backups).toEqual([`${CHAVE}__backup_v1`])
    expect(mem.get(backups[0])).toBe(original)
  })

  it('GRAVA o estado migrado na hora — senao a migracao reacontece a cada abertura', () => {
    // Bug pego testando no app de verdade: migrar sem gravar deixava o disco em
    // v1, entao toda abertura migrava de novo E criava mais um backup.
    const mem = new Map<string, string>()
    const deposito = {
      ler: (k: string) => mem.get(k) ?? null,
      escrever: (k: string, v: string) => void mem.set(k, v),
      remover: (k: string) => void mem.delete(k),
    }
    mem.set(CHAVE, JSON.stringify(v1()))

    carregar(deposito, AGORA)
    expect(JSON.parse(mem.get(CHAVE) as string).versao).toBe(2)
  })

  it('abrir varias vezes NAO acumula copias', () => {
    const mem = new Map<string, string>()
    const deposito = {
      ler: (k: string) => mem.get(k) ?? null,
      escrever: (k: string, v: string) => void mem.set(k, v),
      remover: (k: string) => void mem.delete(k),
    }
    mem.set(CHAVE, JSON.stringify(v1()))

    for (let i = 0; i < 5; i++) carregar(deposito, AGORA)
    expect([...mem.keys()].filter((k) => k.includes('__backup'))).toHaveLength(1)
  })

  it('nao guarda copia quando o estado ja esta na versao atual', () => {
    const mem = new Map<string, string>()
    const deposito = {
      ler: (k: string) => mem.get(k) ?? null,
      escrever: (k: string, v: string) => void mem.set(k, v),
      remover: (k: string) => void mem.delete(k),
    }
    mem.set(CHAVE, JSON.stringify(estadoInicial(AGORA, ID)))
    carregar(deposito, AGORA)
    expect([...mem.keys()].filter((k) => k.includes('__v'))).toHaveLength(0)
  })
})

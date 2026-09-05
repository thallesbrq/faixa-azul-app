import { describe, expect, it } from 'vitest'
import {
  DIAS_PARA_PARADO,
  ordenarPorAtencao,
  precisamDeAtencao,
  resumoDoAluno,
  situacaoDoAluno,
} from './torre'
import type { ResumoDoAluno } from './torre'
import { ACADEMIA_PADRAO, estadoInicial } from '../persistence/repositorio'
import type { EstadoPersistido } from '../persistence/repositorio'
import { QuotaEstourada, repositorioDeAlunos } from '../persistence/alunos'
import type { Deposito } from '../persistence/deposito'

const AGORA = new Date('2026-09-10T12:00:00.000Z')

function aluno(over: Partial<EstadoPersistido> & { id?: string; nome?: string } = {}): EstadoPersistido {
  const { id = 'a1', nome = 'Thalles', ...resto } = over
  return {
    ...estadoInicial(AGORA, () => id),
    perfil: { id, nome, papel: 'aluno', academiaId: ACADEMIA_PADRAO },
    ...resto,
  }
}

const evento = (dias: number, i = 0) =>
  ({
    id: `e-${dias}-${i}`,
    cardId: 'c1',
    side: 'unico',
    rating: 'good',
    usouDica: false,
    createdAt: new Date(AGORA.getTime() - dias * 86400000).toISOString(),
  }) as never

describe('resumoDoAluno', () => {
  const ctx = { importadoEm: AGORA.toISOString(), exportadoEm: AGORA.toISOString(), agora: AGORA }

  it('conta aulas feitas, itens na grade e revisoes', () => {
    const e = aluno({
      aulas: [
        { numero: 1, realizadaEm: 'x', itemIds: ['a', 'b'] },
        { numero: 2, itemIds: ['c'] },
      ],
      eventos: [evento(1), evento(2)],
    })
    const r = resumoDoAluno(e, ctx)
    expect(r.aulasFeitas).toBe(1)
    expect(r.totalDeAulas).toBe(2)
    expect(r.itensNaGrade).toBe(3)
    expect(r.totalDeRevisoes).toBe(2)
  })

  it('conta itens validados SEM duplicar o mesmo item validado duas vezes', () => {
    const e = aluno({
      validacoes: [
        { id: 'v1', itemId: 'i1', novoStatus: 'validado_pelo_professor' },
        { id: 'v2', itemId: 'i1', novoStatus: 'validado_pelo_professor' },
        { id: 'v3', itemId: 'i2', novoStatus: 'validado_pelo_professor' },
      ] as never,
    })
    expect(resumoDoAluno(e, ctx).itensValidados).toBe(2)
  })

  it('dias sem estudar vem do evento MAIS RECENTE, nao do ultimo da lista', () => {
    // Os eventos chegam unidos de dois aparelhos, entao a ordem do array nao e
    // cronologica. Pegar o ultimo elemento daria a resposta errada.
    const e = aluno({ eventos: [evento(1), evento(30), evento(9)] })
    expect(resumoDoAluno(e, ctx).diasSemEstudar).toBe(1)
  })

  it('nunca estudou devolve null, nao zero', () => {
    // Zero significaria "estudou hoje", que e o oposto.
    expect(resumoDoAluno(aluno(), ctx).diasSemEstudar).toBeNull()
  })

  it('nome vazio nao deixa a linha em branco na central', () => {
    expect(resumoDoAluno(aluno({ nome: '  ' }), ctx).nome).toBe('Sem nome')
  })

  it('ignora data de evento invalida em vez de quebrar', () => {
    const e = aluno({ eventos: [{ ...(evento(5) as object), createdAt: 'nao-e-data' } as never, evento(5)] })
    expect(resumoDoAluno(e, ctx).diasSemEstudar).toBe(5)
  })
})

describe('situacao e ordem', () => {
  const r = (nome: string, dias: number | null): ResumoDoAluno => ({
    id: nome,
    nome,
    exportadoEm: AGORA.toISOString(),
    importadoEm: AGORA.toISOString(),
    aulasFeitas: 0,
    totalDeAulas: 10,
    itensNaGrade: 0,
    totalDeRevisoes: 0,
    itensValidados: 0,
    duvidasAbertas: 0,
    diasSemEstudar: dias,
  })

  it('parado a partir do limite, em dia abaixo dele', () => {
    expect(situacaoDoAluno(r('a', DIAS_PARA_PARADO))).toBe('parado')
    expect(situacaoDoAluno(r('a', DIAS_PARA_PARADO - 1))).toBe('em-dia')
    expect(situacaoDoAluno(r('a', null))).toBe('nunca-estudou')
  })

  it('a ordem poe quem precisa de atencao PRIMEIRO, nao em ordem alfabetica', () => {
    // Com vinte alunos, ordem alfabetica esconde justamente quem parou — e
    // achar essa pessoa e a razao de a central existir.
    const lista = [r('Ana', 1), r('Bruno', null), r('Carlos', 20), r('Diana', 8)]
    expect(ordenarPorAtencao(lista).map((x) => x.nome)).toEqual(['Bruno', 'Carlos', 'Diana', 'Ana'])
  })

  it('empate em dias desempata por nome, para a lista ser estavel', () => {
    expect(ordenarPorAtencao([r('Zeca', 3), r('Ana', 3)]).map((x) => x.nome)).toEqual(['Ana', 'Zeca'])
  })

  it('conta quem precisa de atencao', () => {
    expect(precisamDeAtencao([r('a', 1), r('b', null), r('c', 30)])).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// armazenamento da central
// ---------------------------------------------------------------------------

function depositoDeTeste(limite = Infinity): Deposito & { mapa: Map<string, string> } {
  const mapa = new Map<string, string>()
  return {
    mapa,
    ler: (k) => mapa.get(k) ?? null,
    escrever: (k, v) => {
      const total = [...mapa.entries()].reduce((s, [ck, cv]) => s + (ck === k ? 0 : cv.length), 0)
      if (total + v.length > limite) throw new Error('QuotaExceededError')
      mapa.set(k, v)
    },
    remover: (k) => void mapa.delete(k),
  }
}

describe('repositorio de alunos', () => {
  const ctx = { importadoEm: AGORA.toISOString(), exportadoEm: AGORA.toISOString(), agora: AGORA }

  it('grava, lista e le de volta', () => {
    const repo = repositorioDeAlunos(depositoDeTeste())
    const e = aluno({ id: 'a1', nome: 'Thalles' })
    repo.gravar(e, resumoDoAluno(e, ctx))

    expect(repo.listar().map((r) => r.nome)).toEqual(['Thalles'])
    expect(repo.ler('a1')?.perfil.id).toBe('a1')
    expect(repo.ler('nao-existe')).toBeNull()
  })

  it('regravar o mesmo aluno ATUALIZA em vez de duplicar', () => {
    const repo = repositorioDeAlunos(depositoDeTeste())
    const e = aluno({ id: 'a1', nome: 'Thalles' })
    repo.gravar(e, resumoDoAluno(e, ctx))
    const e2 = { ...e, eventos: [evento(1)] }
    repo.gravar(e2, resumoDoAluno(e2, ctx))

    expect(repo.listar()).toHaveLength(1)
    expect(repo.listar()[0].totalDeRevisoes).toBe(1)
  })

  it('remover tira da lista e do armazenamento', () => {
    const repo = repositorioDeAlunos(depositoDeTeste())
    const e = aluno({ id: 'a1' })
    repo.gravar(e, resumoDoAluno(e, ctx))
    repo.remover('a1')
    expect(repo.listar()).toEqual([])
    expect(repo.ler('a1')).toBeNull()
  })

  it('QUOTA ESTOURADA falha alto — perder aluno em silencio seria o pior caso', () => {
    const repo = repositorioDeAlunos(depositoDeTeste(50))
    const e = aluno({ id: 'a1', nome: 'Thalles' })
    expect(() => repo.gravar(e, resumoDoAluno(e, ctx))).toThrow(QuotaEstourada)
    // E nao deixa uma entrada fantasma no indice.
    expect(repo.listar()).toEqual([])
  })

  it('indice corrompido nao derruba a central — ele e derivado', () => {
    const dep = depositoDeTeste()
    const repo = repositorioDeAlunos(dep)
    const e = aluno({ id: 'a1' })
    repo.gravar(e, resumoDoAluno(e, ctx))
    dep.mapa.set('faixa_azul_torre_indice', '{{{ nao e json')

    expect(repo.listar()).toEqual([])
    // O estado do aluno continua intacto na chave propria.
    expect(repo.ler('a1')?.perfil.id).toBe('a1')
  })

  it('mede o espaco e avisa quando aperta', () => {
    const repo = repositorioDeAlunos(depositoDeTeste())
    const e = aluno({ id: 'a1' })
    repo.gravar(e, resumoDoAluno(e, ctx))
    const uso = repo.espacoUsado()
    expect(uso.alunos).toBe(1)
    expect(uso.bytes).toBeGreaterThan(0)
    expect(uso.apertado).toBe(false)
  })
})

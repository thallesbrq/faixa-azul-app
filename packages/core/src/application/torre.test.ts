import { describe, expect, it } from 'vitest'
import {
  DIAS_PARA_PARADO,
  ordenarPorAtencao,
  precisamDeAtencao,
  resumoDoAluno,
  situacaoDoAluno,
} from './torre'
import type { ResumoDoAluno } from './torre'
import { TOTAL_DE_AULAS } from './montagem'
import { ACADEMIA_PADRAO, estadoInicial } from '../persistence/repositorio'
import type { EstadoPersistido } from '../persistence/repositorio'

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
    /**
     * ERA `2` — E ESTE TESTE ERA O QUE MANTINHA O DEFEITO VIVO.
     *
     * Ele afirmava que o total de aulas do pacote e o tamanho da lista de
     * ALTERACOES (duas, aqui). Como o teste passava, o numero errado parecia
     * verificado: um aluno com 3 aulas feitas e nenhuma outra alteracao aparecia
     * como "3/3", pacote concluido, em vez de 3 de 10.
     *
     * A licao e sobre o teste e nao sobre o codigo: ele descrevia o que a funcao
     * FAZIA, e nao o que ela deveria responder. Teste assim nao protege — ele
     * congela.
     */
    expect(r.totalDeAulas).toBe(TOTAL_DE_AULAS)
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
// O tamanho do pacote nao vem da lista de alteracoes (defeito de 07/09/2026)
// ---------------------------------------------------------------------------

describe('totalDeAulas', () => {
  const datas = { importadoEm: 'x', exportadoEm: 'y', agora: new Date('2026-09-07T12:00:00Z') }

  function estadoBase(aulas: { numero: number; realizadaEm?: string }[]) {
    return {
      versao: 2,
      perfil: { id: 'p', nome: 'Aluno', papel: 'aluno', academiaId: 'a' },
      planoExame: { academia: '', professor: '', dataAlvo: '', provisoria: true, criadoEm: '' },
      config: {},
      revisoes: [],
      eventos: [],
      validacoes: [],
      aulas,
      itens: [],
      duvidas: [],
      sessoes: [],
      indicacoes: [],
    } as unknown as Parameters<typeof resumoDoAluno>[0]
  }

  it('tres aulas feitas em pacote de dez NAO e "3 de 3"', () => {
    // O defeito: `estado.aulas` e lista ESPARSA de alteracoes. Contar o tamanho
    // dela fazia o aluno com 3 aulas feitas aparecer como pacote concluido.
    const r = resumoDoAluno(
      estadoBase([
        { numero: 1, realizadaEm: '2026-09-01' },
        { numero: 2, realizadaEm: '2026-09-03' },
        { numero: 3, realizadaEm: '2026-09-05' },
      ]),
      datas,
    )
    expect(r.aulasFeitas).toBe(3)
    expect(r.totalDeAulas).toBe(10)
  })

  it('quem nunca mexeu em aula nenhuma nao aparece como "0 de 0"', () => {
    const r = resumoDoAluno(estadoBase([]), datas)
    expect(r.aulasFeitas).toBe(0)
    expect(r.totalDeAulas).toBe(10)
  })

  it('aceita pacote de outro tamanho', () => {
    const r = resumoDoAluno(estadoBase([]), { ...datas, totalDeAulas: 6 })
    expect(r.totalDeAulas).toBe(6)
  })
})

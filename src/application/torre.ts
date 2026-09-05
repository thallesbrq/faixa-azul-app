/**
 * Torre: o resumo de cada aluno que a central do professor mostra.
 *
 * A CONSOLIDACAO E DERIVADA, NUNCA ARMAZENADA COMO VERDADE. O resumo sai do
 * estado do aluno toda vez que ele e gravado. Guardar contagens como fonte
 * criaria dois numeros que podem discordar — o mesmo motivo pelo qual o bolsao
 * da montagem e calculado e nao guardado.
 *
 * O QUE A LISTA PRECISA RESPONDER, e por isso cada campo existe:
 * - quem esta parado (`diasSemEstudar`)
 * - quem tem coisa esperando o professor (`aguardandoValidacao`)
 * - onde cada um esta no pacote (`aulasFeitas`)
 * - se a grade dele ja foi montada (`itensNaGrade`)
 *
 * Modulo de aplicacao: puro, sem React e sem I/O.
 */

import type { EstadoPersistido } from '../persistence/repositorio'

export interface ResumoDoAluno {
  id: string
  nome: string
  /** Quando o ALUNO exportou. E a idade real da informacao. */
  exportadoEm: string
  /** Quando o professor importou. Pode ser bem depois. */
  importadoEm: string
  aulasFeitas: number
  totalDeAulas: number
  /** Quantos itens ja estao distribuidos nas aulas. */
  itensNaGrade: number
  totalDeRevisoes: number
  itensValidados: number
  /**
   * Itens que o aluno marcou como executados mas o professor ainda nao viu.
   * E a fila de trabalho dele.
   */
  duvidasAbertas: number
  /** `null` quando o aluno nunca estudou. */
  diasSemEstudar: number | null
}

const DIA_MS = 24 * 60 * 60 * 1000

/** Data da revisao mais recente, ou null se nunca houve. */
function ultimaRevisao(estado: EstadoPersistido): number | null {
  let maior: number | null = null
  for (const e of estado.eventos) {
    const t = Date.parse(e.createdAt)
    if (!Number.isFinite(t)) continue
    if (maior === null || t > maior) maior = t
  }
  return maior
}

export function resumoDoAluno(
  estado: EstadoPersistido,
  { importadoEm, exportadoEm, agora }: { importadoEm: string; exportadoEm: string; agora: Date },
): ResumoDoAluno {
  const ultima = ultimaRevisao(estado)

  return {
    id: estado.perfil.id,
    // Nome vazio nunca vira string vazia na lista: sem isto a linha da central
    // apareceria em branco e o professor nao saberia de quem e.
    nome: estado.perfil.nome.trim() || 'Sem nome',
    exportadoEm,
    importadoEm,
    aulasFeitas: estado.aulas.filter((a) => a.realizadaEm).length,
    totalDeAulas: estado.aulas.length,
    itensNaGrade: estado.aulas.reduce((s, a) => s + (a.itemIds?.length ?? 0), 0),
    totalDeRevisoes: estado.eventos.length,
    itensValidados: new Set(
      estado.validacoes
        .filter((v) => v.status === 'validado_pelo_professor')
        .map((v) => v.itemId),
    ).size,
    duvidasAbertas: estado.duvidas.filter((d) => d.status !== 'respondida').length,
    diasSemEstudar: ultima === null ? null : Math.floor((agora.getTime() - ultima) / DIA_MS),
  }
}

/**
 * Ordem da lista: quem precisa de atencao primeiro.
 *
 * Nao e alfabetica de proposito. Com vinte alunos, ordem alfabetica esconde
 * exatamente quem parou de estudar — e achar essa pessoa e a razao de a central
 * existir. Quem nunca estudou vem antes de todos: e o caso mais urgente e o
 * unico em que o app nao tem nada a mostrar.
 */
export function ordenarPorAtencao(resumos: readonly ResumoDoAluno[]): ResumoDoAluno[] {
  return [...resumos].sort((a, b) => {
    const da = a.diasSemEstudar
    const db = b.diasSemEstudar
    if (da === null && db !== null) return -1
    if (db === null && da !== null) return 1
    if (da !== null && db !== null && da !== db) return db - da
    return a.nome.localeCompare(b.nome, 'pt-BR')
  })
}

export type Situacao = 'nunca-estudou' | 'parado' | 'em-dia'

/**
 * Quantos dias sem estudar ja contam como parado.
 *
 * Sete porque a rotina combinada e de estudo nos cinco dias uteis: uma semana
 * inteira sem nenhum evento nao e folga, e sinal. Numero provisorio ate o grupo
 * de testes mostrar o que e normal.
 */
export const DIAS_PARA_PARADO = 7

export function situacaoDoAluno(r: ResumoDoAluno): Situacao {
  if (r.diasSemEstudar === null) return 'nunca-estudou'
  return r.diasSemEstudar >= DIAS_PARA_PARADO ? 'parado' : 'em-dia'
}

/** Quantos alunos precisam de atencao — o numero do topo da central. */
export function precisamDeAtencao(resumos: readonly ResumoDoAluno[]): number {
  return resumos.filter((r) => situacaoDoAluno(r) !== 'em-dia').length
}

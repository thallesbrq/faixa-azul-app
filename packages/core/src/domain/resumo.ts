/**
 * Resumo do progresso de um aluno, como a central o mostra.
 *
 * MORA NO DOMINIO, e nao na aplicacao, por causa de quem precisa dele: o
 * repositorio de alunos (persistencia) guarda um indice desses resumos para a
 * lista da central abrir sem ler vinte estados inteiros. Enquanto o tipo vivia
 * em application/torre, a persistencia importava a aplicacao — uma camada de
 * baixo conhecendo uma de cima. Era so tipo, entao nao quebrava em runtime; era
 * inversao mesmo assim, e a extracao do core foi a hora barata de desfazer.
 *
 * Quem CALCULA o resumo continua em application/torre. Aqui esta so a forma.
 */

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

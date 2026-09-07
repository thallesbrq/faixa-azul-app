/**
 * Turmas da academia.
 *
 * O CAMPO E TEXTO LIVRE, A LISTA E CONSTANTE — e a assimetria e de proposito.
 *
 * `Turma` nao e uma uniao fechada de tipos porque o dado guardado no Firestore
 * nao pode ser validado por TypeScript: quem escreve e o cliente, e o tipo
 * desaparece na compilacao. Fechar a uniao daria falsa seguranca e faria uma
 * turma nova exigir mudanca de tipo em cascata. Entao o campo e `string`, a
 * lista abaixo e o que a interface OFERECE, e `nomeDaTurma` sabe lidar com um
 * valor que nao esta nela — o que acontece de verdade quando alguem digita
 * errado no Firestore ou quando a lista cresce e um aparelho antigo ainda nao
 * atualizou.
 *
 * TURMA VAZIA E UM ESTADO REAL, nao um erro. Todos os cadastros que existem hoje
 * nasceram antes deste campo, e "sem turma" e exatamente o que eles sao ate o
 * professor atribuir. A tela precisa dizer isso em vez de esconder a pessoa.
 */

/**
 * As turmas da Rilion Gracie Garopaba. Turma e HORARIO, e nada mais.
 *
 * `medeCurriculoDeAzul` FOI REMOVIDO DAQUI (ADR-016, decisao 3). A turma decidia
 * contra que curriculo o aluno era medido — e isso quebrava no primeiro caso
 * real: o 1o grau vem antes do azul, entao um faixa branca novo e alguem com
 * tres graus cabem na MESMA turma de iniciantes e precisam de provas
 * diferentes. Quem decide agora e a META do aluno (ver domain/metas).
 *
 * Manter a funcao seria pior que remove-la: um nome que afirma decidir algo, e
 * que nao decide mais nada, e a forma mais eficiente de alguem confiar nele.
 */
export const TURMAS = [
  { id: 'RG1A', nome: 'RG1A', descricao: 'Iniciantes' },
  { id: 'RG1B', nome: 'RG1B', descricao: 'Iniciantes' },
  { id: 'RG2', nome: 'RG2', descricao: 'Intermediário / avançado' },
] as const

export interface Turma {
  id: string
  nome: string
  descricao: string
}

/** O que um cadastro sem turma guarda. Nunca `undefined`: o campo sempre existe. */
export const SEM_TURMA = ''

/** Rotulo de quem ainda nao foi atribuido. Aparece na central, nao se esconde. */
export const ROTULO_SEM_TURMA = 'Sem turma'

export function turmaPorId(id: string): Turma | null {
  for (const t of TURMAS) if (t.id === id) return t
  return null
}

/**
 * Nome para exibir, inclusive de turma desconhecida.
 *
 * Devolve o proprio id quando nao reconhece, e nao "invalida": se o Firestore
 * tem 'RG3' e este aparelho nao conhece, o professor precisa ver 'RG3' para
 * entender o que esta olhando. Esconder atras de um erro transformaria uma
 * versao velha do app em dado perdido aparente.
 */
export function nomeDaTurma(id: string): string {
  if (id === SEM_TURMA) return ROTULO_SEM_TURMA
  return turmaPorId(id)?.nome ?? id
}

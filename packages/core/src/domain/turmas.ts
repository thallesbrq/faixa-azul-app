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
 * As turmas da Rilion Gracie Garopaba.
 *
 * RG1A e RG1B sao turmas de INICIANTES: o curriculo do exame de azul e a meta
 * delas. RG2 e intermediario/avancado, e o curriculo de azul NAO e meta dela —
 * ver ADR-015, decisao 6. Por isso `medeCurriculoDeAzul` existe: sem ele, a
 * central mostraria a turma avancada inteira em vermelho, o que estaria
 * tecnicamente correto e factualmente errado.
 */
export const TURMAS = [
  { id: 'RG1A', nome: 'RG1A', descricao: 'Iniciantes', medeCurriculoDeAzul: true },
  { id: 'RG1B', nome: 'RG1B', descricao: 'Iniciantes', medeCurriculoDeAzul: true },
  { id: 'RG2', nome: 'RG2', descricao: 'Intermediário / avançado', medeCurriculoDeAzul: false },
] as const

export interface Turma {
  id: string
  nome: string
  descricao: string
  medeCurriculoDeAzul: boolean
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

/**
 * A turma mede progresso contra o curriculo de azul?
 *
 * Turma desconhecida responde `false`, e essa e a escolha conservadora: medir
 * alguem contra um curriculo que pode nao ser o dele produz um numero errado
 * com aparencia de certo. Nao medir produz um `—`, que e visivelmente uma
 * lacuna. Ver ADR-015, decisao 6.
 */
export function medeCurriculoDeAzul(id: string): boolean {
  return turmaPorId(id)?.medeCurriculoDeAzul ?? false
}

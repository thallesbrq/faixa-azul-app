/**
 * Papel de uma pessoa na academia — e o que cada papel PODE.
 *
 * POR QUE NAO E `Origem` (ADR-017, decisao 1). `Origem` e o tipo de "quem
 * escreveu este registro", e hoje ela tem os mesmos dois valores que papel tinha
 * — `'aluno' | 'professor'`. Sao coisas diferentes que coincidiram por um tempo,
 * e a coincidencia era uma armadilha:
 *
 *   - `maisRecente()` desempata merge por `alteradoPor` em ORDEM ALFABETICA
 *   - `mesclarCampos` indexa donos de campo por `Origem` (`DONO_DA_AULA`)
 *
 * Acrescentar `'admin'` ao union teria mudado o desempate do merge — `'admin'`
 * vem antes de `'aluno'` — dentro de codigo que nao fala de papel nenhum, sem
 * nenhum teste de papel reclamar. Dois conceitos, dois tipos.
 *
 * CAMPO E TEXTO LIVRE NO FIRESTORE, LISTA E CONSTANTE AQUI — mesma assimetria de
 * `turmas` e `metas`, pelo mesmo motivo: o tipo desaparece na compilacao e quem
 * escreve e o cliente. `papelDe` normaliza o que vier.
 */

export type Papel = 'aluno' | 'professor' | 'admin'

/** Papel de quem nao tem cadastro reconhecivel. O mais restrito que existe. */
export const PAPEL_PADRAO: Papel = 'aluno'

/**
 * Normaliza o que veio do Firestore.
 *
 * DESCONHECIDO CAI EM `aluno`, e a escolha e conservadora de proposito: um
 * `papel: 'diretor'` gravado por uma versao futura do app nao deve virar poder
 * numa versao antiga que nao sabe o que ele significa.
 */
export function papelDe(valor: unknown): Papel {
  if (valor === 'professor') return 'professor'
  if (valor === 'admin') return 'admin'
  return PAPEL_PADRAO
}

export function nomeDoPapel(papel: Papel): string {
  if (papel === 'professor') return 'Professor'
  if (papel === 'admin') return 'Administrador'
  return 'Aluno'
}

// ---------------------------------------------------------------------------
// O que cada papel pode
// ---------------------------------------------------------------------------
/**
 * A LINHA DIVISORIA E "O QUE NAO SE DESFAZ" (ADR-017, decisao 1):
 *
 *   o admin administra o que se desfaz; o professor assina o que nao se desfaz.
 *
 * Tres colecoes sao append-only nas regras (`allow update, delete: if false`):
 * `validacoes`, `competencias` e `graduacoes`. As tres afirmam algo sobre o
 * TATAME — que o texto da tecnica esta certo, que esta pessoa executa, que esta
 * pessoa foi graduada. Essas exigem professor.
 *
 * O MOTIVO E CONCRETO E E SOBRE O DESENVOLVEDOR: sou faixa branca 3 graus e
 * escrevo este app. Se eu fosse `professor`, eu poderia atestar as competencias
 * do meu proprio cadastro de aluno e conceder a mim mesmo o 1o grau. O log
 * append-only do ADR-010 existe para que evidencia de graduacao nao seja
 * reescrevivel — e um desenvolvedor que assina a propria graduacao faz o log
 * virar decoracao. Admin e o papel que ve tudo e NAO PODE SE GRADUAR.
 *
 * ESTAS FUNCOES NAO SAO SEGURANCA. A fronteira e `firestore.rules`; isto e o que
 * a tela usa para nao oferecer um botao que o servidor vai recusar. As duas
 * precisam concordar, e ha teste de regra para cada uma das negacoes abaixo.
 */

/** Assinar evidencia de tatame: validacao, competencia, graduacao. */
export function podeAssinarEvidencia(papel: Papel): boolean {
  return papel === 'professor'
}

/** Ver a academia inteira: pessoas, progresso, grades, programa. */
export function podeVerAcademia(papel: Papel): boolean {
  return papel === 'professor' || papel === 'admin'
}

/** Administrar o que se desfaz: cadastro, turma, meta, grade, programa. */
export function podeAdministrar(papel: Papel): boolean {
  return papel === 'professor' || papel === 'admin'
}

/**
 * Mudar o PAPEL de alguem — inclusive o proprio.
 *
 * SO PROFESSOR, e sem isto a divisao acima e teatro: bastaria o admin se
 * promover a professor e assinar. Ver ADR-017, decisao 2.
 *
 * Consequencia aceita: se o professor sair, ninguem nomeia outro pelo app. E
 * recuperavel pelo console do Firebase, e e preferivel ao contrario.
 */
export function podeMudarPapel(papel: Papel): boolean {
  return papel === 'professor'
}

/**
 * Convidar alguem COM ESTE PAPEL.
 *
 * O admin convida aluno; professor e admin so o professor cria. E a mesma regra
 * de `podeMudarPapel` vista pela porta de entrada — sem ela, o admin se
 * convidaria de novo como professor com um segundo e-mail.
 */
export function podeConvidarComPapel(quem: Papel, alvo: Papel): boolean {
  if (alvo === 'aluno') return podeAdministrar(quem)
  return podeMudarPapel(quem)
}

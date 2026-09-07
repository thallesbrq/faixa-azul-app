/**
 * Chaves de armazenamento, como CONSTANTES e num lugar so.
 *
 * POR QUE ISTO NAO E FRESCURA. Com Firebase Hosting os dois apps ganham
 * dominios distintos (`*.web.app`), entao a colisao de `localStorage` que
 * existiria no GitHub Pages — onde todos os repositorios dividem a mesma
 * origem — deixa de acontecer. Mas a origem e uma escolha de hospedagem, e
 * hospedagem muda: se um dia os dois voltarem a dividir origem, o isolamento
 * passa a depender destes prefixos.
 *
 * Como constantes exportadas daqui, esquecer um prefixo vira erro de
 * compilacao. Como string digitada em cada arquivo, viraria bug silencioso —
 * dois apps escrevendo na mesma chave, um sobrescrevendo o outro.
 */

/** Estado local do dono do aparelho. Ja existia com este nome; nao muda. */
export const CHAVE_ESTADO = 'faixa_azul_v1'

/** Copia guardada antes de uma migracao de versao. */
export const CHAVE_BACKUP = (versaoDeOrigem: number) =>
  `${CHAVE_ESTADO}__backup_v${versaoDeOrigem}`

/** Indice de alunos na central (POC por arquivo; sai quando a nuvem entrar). */
export const CHAVE_INDICE_TORRE = 'faixa_azul_torre_indice'
export const PREFIXO_ALUNO = 'faixa_azul_aluno_'

/**
 * Onde o SDK do Firebase guarda a sessao. Precisa ser DIFERENTE entre os dois
 * apps: se dividirem a mesma chave e a mesma origem, entrar como professor num
 * deslogaria o aluno no outro — ou pior, faria um herdar a sessao do outro.
 */
export const CHAVE_SESSAO_ALUNO = 'faixa_azul_sessao_aluno'
export const CHAVE_SESSAO_CENTRAL = 'faixa_azul_sessao_central'

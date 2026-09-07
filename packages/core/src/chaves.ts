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
 * NOME do app no SDK do Firebase — e nao uma chave de armazenamento nossa.
 *
 * Correcao de uma suposicao minha: eu tinha criado `CHAVE_SESSAO_ALUNO` e
 * `CHAVE_SESSAO_CENTRAL` como se desse para escolher onde o SDK guarda a
 * sessao. Nao da. O Firebase guarda em `firebase:authUser:{apiKey}:{nomeDoApp}`,
 * e o unico pedaco que a gente controla e o NOME DO APP.
 *
 * Entao o isolamento entre as duas aplicacoes sai de graca ao inicializar com
 * nomes diferentes — e nao de uma chave que eu inventaria e que o SDK
 * ignoraria. Se os dois usassem o mesmo nome na mesma origem, entrar como
 * professor num deslogaria o aluno no outro.
 *
 * Serve tambem de prefixo para o e-mail pendente do link magico, que ESSE sim
 * e nosso (ver nuvem/autenticacao).
 */
export const APP_ALUNO = 'aluno'
export const APP_CENTRAL = 'central'

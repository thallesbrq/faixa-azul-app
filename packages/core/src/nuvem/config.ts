/**
 * Configuracao do Firebase.
 *
 * ESTES VALORES NAO SAO SEGREDO, e vale explicar porque parecem ser.
 *
 * Eles viajam DENTRO do bundle JavaScript para o navegador de qualquer pessoa
 * que abra o app — por definicao, nao por descuido. A `apiKey` do Firebase
 * IDENTIFICA o projeto; ela nao autoriza nada. Quem decide o que cada pessoa
 * alcanca sao as regras em firestore.rules, avaliadas no servidor, e e por isso
 * que elas tem 23 assercoes de teste e nao sao opcionais.
 *
 * Guardar isto em variavel de ambiente daria a sensacao de proteger algo sem
 * proteger nada: o valor apareceria no bundle de qualquer forma. Fica no codigo,
 * versionado, com este comentario — para ninguem tratar como vazamento depois.
 *
 * A CHAVE ESTA RESTRINGIDA desde 07/09/2026, e isso FOI VERIFICADO — nao e
 * intencao. O GitHub abriu um alerta de "Google API Key publicamente vazada"
 * assim que este arquivo subiu, e o alerta acertou em detectar e errou em
 * recomendar: seguir o passo "revoke this key" derrubaria o app sem fechar
 * nenhuma porta de dado.
 *
 * O risco real, medido antes: a chave respondia `HTTP 200` a uma chamada feita
 * do terminal, sem navegador. Isso nao da acesso ao dado dos alunos (as regras
 * negam), mas permitia gastar a cota de autenticacao do projeto de qualquer
 * lugar. Depois de restringir por referenciador HTTP e por API:
 *
 *   sem referenciador (curl, script, bot)  -> 403 "referer <empty> are blocked"
 *   site nao autorizado                    -> 403
 *   rg-centraldoaluno.web.app              -> 200
 *   localhost em qualquer porta            -> 200
 *
 * APIs permitidas: Firestore, Identity Toolkit, Token Service e Firebase
 * Installations. A quarta entrou por prudencia — parte do SDK a chama por
 * baixo, e restricao apertada demais falha de um jeito difícil de rastrear.
 *
 * QUANDO ACRESCENTAR UM DOMINIO NOVO (Hosting proprio, dominio da academia),
 * ele precisa entrar na lista de referenciadores DA CHAVE e nos dominios
 * autorizados DO AUTHENTICATION. Sao duas listas diferentes, e esquecer a
 * segunda faz o login falhar sem erro claro.
 */

export interface ConfigDaNuvem {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}

const PROJETO = {
  apiKey: 'AIzaSyCZDPFHPFM5WSOeND_eZEKFucG7uCrjNa0',
  authDomain: 'rg-centraldoaluno.firebaseapp.com',
  projectId: 'rg-centraldoaluno',
  storageBucket: 'rg-centraldoaluno.firebasestorage.app',
  messagingSenderId: '731867802928',
} as const

/**
 * Um `appId` por aplicacao. Os dois apontam para o MESMO projeto e o mesmo
 * banco — o appId serve para o Firebase distinguir de onde vem cada uso, nao
 * para separar dado. A separacao de dado e por regra e por papel.
 */
export const CONFIG_ALUNO: ConfigDaNuvem = {
  ...PROJETO,
  appId: '1:731867802928:web:86419f1b8c5c9d25112cf5',
}

export const CONFIG_CENTRAL: ConfigDaNuvem = {
  ...PROJETO,
  appId: '1:731867802928:web:a5740fff7242891b112cf5',
}

/** Regiao do Firestore, escolhida em 06/09/2026 e IRREVERSIVEL. */
export const REGIAO = 'southamerica-east1'

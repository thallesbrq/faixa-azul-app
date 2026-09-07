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
 * O QUE VALE FAZER, e nao e esconder: restringir a chave por referenciador HTTP
 * no Google Cloud Console (APIs e servicos -> Credenciais), aceitando so os
 * dominios do Hosting. Isso nao protege o dado — as regras fazem isso — mas
 * impede que alguem use a nossa cota de autenticacao a partir de outro site.
 * Fica pendente ate os dominios existirem.
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

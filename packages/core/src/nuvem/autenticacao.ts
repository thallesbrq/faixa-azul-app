/**
 * Login por link magico — as decisoes, separadas do SDK.
 *
 * O FLUXO TEM UMA ARMADILHA QUE ESTE MODULO EXISTE PARA RESOLVER: quando a
 * pessoa clica no link do e-mail, o navegador pode abrir em OUTRA aba, outro
 * navegador ou outro aplicativo. O Firebase exige o e-mail de volta para
 * completar o login — e nesse ponto o app nao tem como saber quem e, porque
 * quem digitou o e-mail foi a aba anterior.
 *
 * Por isso o e-mail e guardado no momento do envio e recuperado no momento da
 * conclusao. Se nao estiver la (link aberto em outro aparelho), o app PERGUNTA
 * em vez de falhar — e essa e a diferenca entre "nao funcionou" e "confirme seu
 * e-mail".
 *
 * O que mora aqui e testavel sem rede: guardar e recuperar o e-mail pendente,
 * decidir se uma URL e um link de login, e traduzir erro do Firebase em frase
 * que uma pessoa entende. O que fala com o SDK fica em ./cliente.
 */

/** Chave do e-mail pendente. Por app, para os dois nao se atrapalharem. */
export function chaveDoEmailPendente(prefixo: string): string {
  return `${prefixo}__email_pendente`
}

export interface DepositoSimples {
  ler(chave: string): string | null
  escrever(chave: string, valor: string): void
  remover(chave: string): void
}

/**
 * Guarda o e-mail entre pedir o link e voltar do e-mail.
 *
 * Normaliza para minusculas e sem espaco nas pontas: e-mail digitado no celular
 * vem com maiuscula automatica e espaco colado com frequencia, e o Firebase
 * trata `Thalles@x.com` e `thalles@x.com` como a mesma conta — mas a nossa
 * comparacao ao concluir o login seria diferente.
 */
export function guardarEmailPendente(
  deposito: DepositoSimples,
  prefixo: string,
  email: string,
): void {
  deposito.escrever(chaveDoEmailPendente(prefixo), normalizarEmail(email))
}

export function lerEmailPendente(deposito: DepositoSimples, prefixo: string): string | null {
  const v = deposito.ler(chaveDoEmailPendente(prefixo))
  return v && v.length > 0 ? v : null
}

export function limparEmailPendente(deposito: DepositoSimples, prefixo: string): void {
  deposito.remover(chaveDoEmailPendente(prefixo))
}

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Basta para pegar erro de digitacao, e nao tenta validar e-mail "de verdade".
 *
 * Validacao completa de e-mail por expressao regular e um problema conhecido
 * por nao ter solucao boa; quem valida de fato e a caixa de entrada, quando o
 * link chega ou nao chega. Aqui so barramos o obvio antes de gastar uma
 * chamada de rede e um envio.
 */
export function pareceEmail(email: string): boolean {
  const e = normalizarEmail(email)
  if (e.length < 5 || e.length > 254) return false
  const partes = e.split('@')
  if (partes.length !== 2) return false
  const [local, dominio] = partes
  if (local.length === 0 || dominio.length < 3) return false
  if (!dominio.includes('.')) return false
  if (dominio.startsWith('.') || dominio.endsWith('.')) return false
  return !/\s/.test(e)
}

// ---------------------------------------------------------------------------
// Erros
// ---------------------------------------------------------------------------

export type MotivoDaFalha =
  | 'email-invalido'
  | 'dominio-nao-autorizado'
  | 'metodo-desativado'
  | 'link-expirado'
  | 'link-invalido'
  | 'sem-rede'
  | 'muitas-tentativas'
  | 'desconhecido'

/**
 * Traduz o codigo do Firebase para algo que a pessoa entenda.
 *
 * Nao e enfeite: os codigos vem em ingles e no formato `auth/invalid-email`. Um
 * aluno vendo isso na tela nao sabe se errou o e-mail, se o app quebrou ou se a
 * internet caiu — e cada um desses pede uma acao diferente dele.
 *
 * `dominio-nao-autorizado` e `metodo-desativado` sao falhas de CONFIGURACAO, nao
 * do usuario. A mensagem diz isso, para ninguem ficar tentando de novo achando
 * que digitou errado.
 */
export function motivoDoErro(codigo: string): MotivoDaFalha {
  const c = codigo.replace(/^auth\//, '')
  if (c === 'invalid-email' || c === 'missing-email') return 'email-invalido'
  if (c === 'unauthorized-continue-uri' || c === 'unauthorized-domain') {
    return 'dominio-nao-autorizado'
  }
  if (c === 'operation-not-allowed') return 'metodo-desativado'
  if (c === 'expired-action-code') return 'link-expirado'
  if (c === 'invalid-action-code') return 'link-invalido'
  if (c === 'network-request-failed') return 'sem-rede'
  if (c === 'too-many-requests' || c === 'quota-exceeded') return 'muitas-tentativas'
  return 'desconhecido'
}

export const EXPLICACAO_DA_FALHA: Record<MotivoDaFalha, string> = {
  'email-invalido': 'Esse e-mail não parece válido. Confira e tente de novo.',
  'dominio-nao-autorizado':
    'Este endereço do app não está autorizado a enviar o link. É configuração, não é você — avise quem cuida do app.',
  'metodo-desativado':
    'O login por link está desativado no servidor. É configuração, não é você — avise quem cuida do app.',
  'link-expirado': 'Este link já expirou. Peça um novo — eles valem por pouco tempo.',
  'link-invalido':
    'Este link não é mais válido. Costuma acontecer quando ele já foi usado uma vez. Peça um novo.',
  'sem-rede': 'Sem conexão. O link precisa de internet para ser enviado.',
  'muitas-tentativas': 'Muitas tentativas em pouco tempo. Espere alguns minutos.',
  desconhecido: 'Não conseguimos enviar o link agora. Tente de novo em instantes.',
}

/**
 * O link do Firebase carrega `mode=signIn` e `oobCode` na URL.
 *
 * Checar isso ANTES de chamar o SDK evita que o app tente concluir um login em
 * toda abertura — e evita depender do `isSignInWithEmailLink` para uma decisao
 * que a tela precisa tomar antes de carregar o SDK de autenticacao.
 */
export function pareceLinkDeLogin(url: string): boolean {
  try {
    const u = new URL(url)
    const q = u.searchParams
    // O link real vem com a query no proprio endereco ou dentro de `link=`.
    if (q.get('mode') === 'signIn' && q.get('oobCode')) return true
    const interno = q.get('link')
    if (interno) return pareceLinkDeLogin(interno)
    return false
  } catch {
    return false
  }
}

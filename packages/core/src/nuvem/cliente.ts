/**
 * Cliente do Firebase — a unica parte que fala com o SDK.
 *
 * CARREGADO SOB DEMANDA, de proposito. O SDK de autenticacao e Firestore soma
 * mais de 100 KB comprimidos; embutir isso no pacote principal faria o app
 * pesar mais na PRIMEIRA abertura para todo mundo, inclusive para quem nunca
 * vai entrar em conta nenhuma. Como o app funciona sem login (ver abaixo), o
 * SDK so desce quando alguem realmente vai entrar.
 *
 * LOGIN E OPCIONAL, e essa e a decisao mais importante deste arquivo. O app
 * continua funcionando exatamente como funcionava: estado local, offline, sem
 * conta. Entrar acrescenta duas coisas — sincronizar com a central e recuperar
 * o progresso se trocar de aparelho. Exigir login na abertura quebraria o
 * primeiro uso de quem esta sem rede, e deixaria de fora o progresso local que
 * ja existe hoje neste aparelho.
 *
 * O nome do app importa: o Firebase guarda a sessao em
 * `firebase:authUser:{apiKey}:{nomeDoApp}`, entao nomes diferentes isolam as
 * sessoes do app do aluno e da central. Ver ../chaves.
 */

import type { ConfigDaNuvem } from './config'

/** O minimo que o resto do app precisa saber sobre quem entrou. */
export interface Sessao {
  uid: string
  email: string | null
}

export interface Nuvem {
  /** Manda o link de login para o e-mail. */
  enviarLink(email: string, destino: string): Promise<void>
  /** Conclui o login a partir do link aberto. */
  concluirLogin(email: string, url: string): Promise<Sessao>
  sair(): Promise<void>
  /** Chama o retorno a cada mudanca de sessao, e devolve como cancelar. */
  observarSessao(aoMudar: (s: Sessao | null) => void): () => void
  sessaoAtual(): Sessao | null
}

/**
 * Erro com o codigo do Firebase preservado.
 *
 * O codigo e o que `motivoDoErro` traduz para uma frase util. Perder o codigo
 * no caminho transformaria toda falha em "erro desconhecido", inclusive as que
 * a gente sabe explicar — como dominio fora da lista, que e erro nosso e nao do
 * aluno.
 */
export class FalhaDaNuvem extends Error {
  readonly codigo: string

  constructor(codigo: string, mensagem?: string) {
    super(mensagem ?? codigo)
    this.name = 'FalhaDaNuvem'
    this.codigo = codigo
  }
}

function codigoDe(erro: unknown): string {
  if (erro && typeof erro === 'object' && 'code' in erro) {
    const c = (erro as { code?: unknown }).code
    if (typeof c === 'string') return c
  }
  return 'desconhecido'
}

/**
 * Liga na nuvem. Importa o SDK aqui dentro para ele nao entrar no pacote
 * principal — quem chama isto ja decidiu entrar em conta.
 */
export async function conectar(config: ConfigDaNuvem, nomeDoApp: string): Promise<Nuvem> {
  const [{ initializeApp, getApp, getApps }, auth] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
  ])

  // `getApp` em vez de inicializar de novo: chamar duas vezes com o mesmo nome
  // lanca, e isto pode ser chamado outra vez depois de um recarregamento parcial
  // em desenvolvimento.
  const jaExiste = getApps().some((a) => a.name === nomeDoApp)
  const app = jaExiste ? getApp(nomeDoApp) : initializeApp(config, nomeDoApp)
  const autenticacao = auth.getAuth(app)

  const daSessao = (u: { uid: string; email: string | null } | null): Sessao | null =>
    u ? { uid: u.uid, email: u.email } : null

  return {
    async enviarLink(email, destino) {
      try {
        await auth.sendSignInLinkToEmail(autenticacao, email, {
          url: destino,
          // Obrigatorio para link de e-mail: diz ao Firebase que o link deve
          // ser tratado no proprio app, e nao numa pagina intermediaria.
          handleCodeInApp: true,
        })
      } catch (e) {
        throw new FalhaDaNuvem(codigoDe(e), (e as Error)?.message)
      }
    },

    async concluirLogin(email, url) {
      try {
        const cred = await auth.signInWithEmailLink(autenticacao, email, url)
        const s = daSessao(cred.user)
        if (!s) throw new FalhaDaNuvem('sem-usuario')
        return s
      } catch (e) {
        throw new FalhaDaNuvem(codigoDe(e), (e as Error)?.message)
      }
    },

    async sair() {
      await auth.signOut(autenticacao)
    },

    observarSessao(aoMudar) {
      return auth.onAuthStateChanged(autenticacao, (u) => aoMudar(daSessao(u)))
    },

    sessaoAtual() {
      return daSessao(autenticacao.currentUser)
    },
  }
}

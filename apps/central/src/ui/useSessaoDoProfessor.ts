/**
 * Sessao da central — quem esta olhando, e se pode olhar.
 *
 * TRES DIFERENCAS EM RELACAO AO `useSessao` DO APP DO ALUNO, e todas vem de a
 * central ser online e do professor:
 *
 * 1. O SDK e carregado NA ABERTURA, sem marca de "ja entrou". No app do aluno
 *    isso importava porque ele funciona sem conta e sem rede; aqui nao existe
 *    tela nenhuma antes do login, entao adiar o carregamento so adiaria a
 *    unica coisa que a pagina tem para fazer.
 *
 * 2. Entrar nao basta: e preciso ser PROFESSOR e estar ATIVO. Um aluno que
 *    descobrir o endereco entra — e as regras negam cada leitura que ele
 *    tentar, uma por uma. A tela precisa dizer isso de uma vez, em vez de
 *    mostrar uma central vazia que parece defeito.
 *
 * 3. Cria o cadastro do convite no primeiro acesso, igual ao app do aluno —
 *    chamando a MESMA funcao do core (`criarDoConvite`). Sem isto, um professor
 *    recem-convidado nao teria por onde entrar: ele autenticaria, nao teria
 *    cadastro, e a tela diria que ele nao pertence a academia com o convite
 *    dele parado no servidor.
 *
 * O NOME DO APP FIREBASE E `APP_ALUNO`, DE PROPOSITO. A central roda na MESMA
 * origem que o app do aluno (ADR-015, decisao 9), e a sessao mora em
 * `localStorage` na chave `firebase:authUser:{apiKey}:{nomeDoApp}`. Usar
 * `APP_CENTRAL` separaria as sessoes dentro da mesma origem — o professor
 * pediria link magico duas vezes no mesmo navegador, por escolha nossa e nao
 * por limitacao de navegador nenhuma.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { FirebaseApp } from 'firebase/app'
import { APP_ALUNO } from '@faixa-azul/core/chaves'
import { CONFIG_ALUNO } from '@faixa-azul/core/nuvem/config'
import { conectar, FalhaDaNuvem } from '@faixa-azul/core/nuvem/cliente'
import type { Nuvem, Sessao } from '@faixa-azul/core/nuvem/cliente'
import { abrirDados } from '@faixa-azul/core/nuvem/pessoas'
import type { Cadastro, Dados } from '@faixa-azul/core/nuvem/pessoas'
import { ACADEMIA_PADRAO } from '@faixa-azul/core/persistence/repositorio'
import {
  EXPLICACAO_DA_FALHA,
  guardarEmailPendente,
  lerEmailPendente,
  limparEmailPendente,
  motivoDoErro,
  normalizarEmail,
  pareceEmail,
  pareceLinkDeLogin,
} from '@faixa-azul/core/nuvem/autenticacao'

/** O deposito local, na forma minima que o core espera. */
const deposito = {
  ler: (chave: string) => {
    try {
      return localStorage.getItem(chave)
    } catch {
      return null
    }
  },
  escrever: (chave: string, valor: string) => {
    try {
      localStorage.setItem(chave, valor)
    } catch {
      // Navegador com armazenamento bloqueado: o login por link ainda funciona
      // no MESMO aparelho que pediu, porque o e-mail e digitado de novo.
    }
  },
  remover: (chave: string) => {
    try {
      localStorage.removeItem(chave)
    } catch {
      // ver acima
    }
  },
}

export type EstadoDaCentral =
  /** Ligando na nuvem e restaurando sessao, se houver. */
  | { fase: 'abrindo' }
  | { fase: 'deslogado' }
  | { fase: 'enviando' }
  | { fase: 'link-enviado'; email: string }
  | { fase: 'concluindo' }
  /** Link aberto em aparelho que nao pediu o link. Nao e erro. */
  | { fase: 'precisa-confirmar-email'; url: string }
  /**
   * Entrou, e e professor ativo. E a unica fase que abre a central.
   *
   * Carrega o `app` do Firebase junto, e nao so os `dados`: a leitura dos
   * estados (`abrirCentral`) precisa da MESMA instancia. Duas instancias com
   * nomes diferentes teriam sessoes separadas, e o Firestore nao veria quem
   * entrou pelo Auth.
   */
  | { fase: 'pronto'; sessao: Sessao; cadastro: Cadastro; dados: Dados; app: FirebaseApp }
  /**
   * Entrou, mas NAO e professor (ou esta desativado).
   *
   * Fase propria e nao erro: quem chega aqui e um aluno da academia com o
   * endereco na mao. As regras ja negam tudo que ele tentar; a tela diz o
   * motivo uma vez, com a saida visivel, em vez de deixar uma central vazia
   * parecendo defeito.
   */
  | { fase: 'sem-permissao'; sessao: Sessao; cadastro: Cadastro | null }
  | { fase: 'falhou'; mensagem: string }

export function useSessaoDoProfessor() {
  const [estado, setEstado] = useState<EstadoDaCentral>({ fase: 'abrindo' })
  const nuvem = useRef<Nuvem | null>(null)
  const dados = useRef<Dados | null>(null)
  const cancelar = useRef<(() => void) | null>(null)
  /** Numa ref porque o observador de sessao e registrado uma vez so. */
  const resolverRef = useRef<(n: Nuvem, s: Sessao) => Promise<void>>(async () => {})

  const falhar = useCallback((e: unknown) => {
    const codigo = e instanceof FalhaDaNuvem ? e.codigo : 'desconhecido'
    setEstado({ fase: 'falhou', mensagem: EXPLICACAO_DA_FALHA[motivoDoErro(codigo)] })
  }, [])

  const resolver = useCallback(async (n: Nuvem, sessao: Sessao) => {
    if (!dados.current) dados.current = await abrirDados(n.app, ACADEMIA_PADRAO)
    const d = dados.current

    let cadastro = await d.cadastroDe(sessao.uid)

    /**
     * PRIMEIRO ACESSO: o cadastro nasce do convite, AQUI TAMBEM.
     *
     * DEFEITO CORRIGIDO. A primeira versao nao criava cadastro, e eu escrevi no
     * comentario que replicar isso daria "duas implementacoes da mesma regra
     * para divergir". A justificativa era falsa: `criarDoConvite` e uma funcao
     * do core, compartilhada — chama-la aqui nao duplica regra nenhuma.
     *
     * O efeito do erro era concreto e teria aparecido na pior hora: um professor
     * recem-convidado que abrisse a Central autenticaria, nao teria cadastro, e
     * cairia em "esta conta nao tem cadastro nesta academia" — com o convite
     * dele intacto no servidor. Para entrar, ele precisaria descobrir sozinho
     * que devia primeiro abrir o APP DO ALUNO, logar la, e voltar. Ninguem
     * descobre isso, e a tela nao dava nenhuma pista.
     */
    if (!cadastro && sessao.email) {
      try {
        cadastro = await d.criarDoConvite(sessao.uid, sessao.email)
      } catch (e) {
        // Sem convite nao e erro de sistema: e alguem que entrou sem ter sido
        // convidado. Segue para `sem-permissao`, que explica isso.
        if (!(e instanceof FalhaDaNuvem && e.codigo === 'sem-convite')) throw e
      }
    }

    if (!cadastro || cadastro.papel !== 'professor' || !cadastro.ativo) {
      setEstado({ fase: 'sem-permissao', sessao, cadastro })
      return
    }
    setEstado({ fase: 'pronto', sessao, cadastro, dados: d, app: n.app })
  }, [])

  useEffect(() => {
    resolverRef.current = resolver
  }, [resolver])

  const obterNuvem = useCallback(async (): Promise<Nuvem> => {
    if (!nuvem.current) {
      nuvem.current = await conectar(CONFIG_ALUNO, APP_ALUNO)
      const n = nuvem.current
      cancelar.current = n.observarSessao((s) => {
        if (s) void resolverRef.current(n, s).catch(falhar)
        else setEstado({ fase: 'deslogado' })
      })
    }
    return nuvem.current
  }, [falhar])

  const concluirCom = useCallback(
    async (email: string, url: string) => {
      setEstado({ fase: 'concluindo' })
      try {
        const n = await obterNuvem()
        const s = await n.concluirLogin(normalizarEmail(email), url)
        limparEmailPendente(deposito, APP_ALUNO)
        await resolver(n, s)
        // O link vale uma vez: deixa-lo na barra faria um recarregamento tentar
        // de novo e falhar com "link invalido".
        window.history.replaceState({}, '', window.location.pathname)
      } catch (e) {
        falhar(e)
      }
    },
    [obterNuvem, resolver, falhar],
  )

  // Abertura: link de login primeiro; senao, restaura sessao.
  useEffect(() => {
    const url = window.location.href
    if (pareceLinkDeLogin(url)) {
      const email = lerEmailPendente(deposito, APP_ALUNO)
      if (email) void concluirCom(email, url)
      else setEstado({ fase: 'precisa-confirmar-email', url })
      return
    }
    // Sem marca de "ja entrou": aqui nao ha nada a fazer sem conta.
    void obterNuvem().catch(falhar)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => () => cancelar.current?.(), [])

  const enviarLink = useCallback(
    async (email: string) => {
      const limpo = normalizarEmail(email)
      if (!pareceEmail(limpo)) {
        setEstado({ fase: 'falhou', mensagem: EXPLICACAO_DA_FALHA['email-invalido'] })
        return
      }
      setEstado({ fase: 'enviando' })
      try {
        const n = await obterNuvem()
        await n.enviarLink(limpo, window.location.origin + window.location.pathname)
        guardarEmailPendente(deposito, APP_ALUNO, limpo)
        setEstado({ fase: 'link-enviado', email: limpo })
      } catch (e) {
        falhar(e)
      }
    },
    [obterNuvem, falhar],
  )

  const sair = useCallback(async () => {
    try {
      await nuvem.current?.sair()
      // `observarSessao` leva para 'deslogado'; nao duplicamos aqui.
    } catch (e) {
      falhar(e)
    }
  }, [falhar])

  return { estado, enviarLink, concluirCom, sair }
}

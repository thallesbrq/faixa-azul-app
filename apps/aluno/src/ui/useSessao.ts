/**
 * Sessao do aluno: entrar por link de e-mail, sair, saber quem esta logado.
 *
 * O SDK do Firebase e carregado SOB DEMANDA — na primeira vez que alguem
 * precisa de conta. Enquanto ninguem entra, o app nao baixa nada disso, e
 * continua funcionando como sempre funcionou: local, offline, sem login.
 *
 * DUAS COISAS ACONTECEM NA ABERTURA, e a ordem importa:
 *
 * 1. Se a URL for um link de login, concluir o login. Isso vem primeiro porque
 *    a pessoa acabou de clicar no e-mail e esta esperando entrar.
 * 2. Se ja houve login antes neste aparelho, restaurar a sessao — sem isso, o
 *    aluno teria que pedir link novo a cada abertura, o que anula a vantagem de
 *    ter conta.
 *
 * O passo 2 exige carregar o SDK mesmo sem ninguem clicar em nada. Para nao
 * pagar isso em quem nunca entrou, guardamos uma marca local de "este aparelho
 * ja teve login" e so carregamos o SDK quando ela existe.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
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
import type { DepositoSimples } from '@faixa-azul/core/nuvem/autenticacao'

/**
 * Marca de que este aparelho ja entrou alguma vez.
 *
 * Existe so para decidir se vale carregar o SDK na abertura. Nao e credencial e
 * nao autoriza nada — a sessao de verdade e do Firebase.
 */
const MARCA_JA_ENTROU = 'faixa_azul_ja_entrou'

export type EstadoDoLogin =
  | { fase: 'deslogado' }
  | { fase: 'enviando' }
  | { fase: 'link-enviado'; email: string }
  | { fase: 'concluindo' }
  /** Entrou E tem cadastro. E o unico estado em que da para fazer algo. */
  | { fase: 'logado'; sessao: Sessao; cadastro: Cadastro }
  /**
   * Entrou, mas nao ha convite para este e-mail.
   *
   * NAO e erro de sistema, e por isso e um estado proprio: e alguem que
   * conseguiu entrar sem ter sido convidado. A tela diz isso, em vez de mostrar
   * falha tecnica que faria a pessoa tentar de novo.
   */
  | { fase: 'sem-convite'; sessao: Sessao }
  | { fase: 'falhou'; mensagem: string }
  /**
   * Link aberto num aparelho que nao pediu o link: o e-mail nao esta guardado
   * aqui. Nao e erro — e o caso de pedir no celular e abrir no computador.
   */
  | { fase: 'precisa-confirmar-email'; url: string }

export function useSessao(deposito: DepositoSimples) {
  const [estado, setEstado] = useState<EstadoDoLogin>({ fase: 'deslogado' })
  const nuvem = useRef<Nuvem | null>(null)
  const dados = useRef<Dados | null>(null)
  const cancelarObservacao = useRef<(() => void) | null>(null)
  /**
   * `falhar` numa ref porque o observador de sessao e registrado UMA vez e
   * sobrevive a re-renderizacoes. Capturar a funcao direto congelaria a versao
   * daquele render.
   */
  const falharRef = useRef<(e: unknown) => void>(() => {})

  /**
   * Resolve o cadastro de quem entrou, criando do convite se for a primeira vez.
   *
   * ENTRAR NAO E O MESMO QUE TER CADASTRO. A sessao do Firebase diz quem a
   * pessoa e; o cadastro em `pessoas` diz se ela pertence a academia e com que
   * papel. Sem cadastro as regras negam tudo — inclusive escrever o proprio
   * estado — entao este passo nao e detalhe: e o que torna a sessao utilizavel.
   */
  const resolverCadastro = useCallback(
    async (n: Nuvem, sessao: Sessao) => {
      if (!dados.current) dados.current = await abrirDados(n.app, ACADEMIA_PADRAO)
      const d = dados.current

      const existente = await d.cadastroDe(sessao.uid)
      if (existente) {
        setEstado({ fase: 'logado', sessao, cadastro: existente })
        return
      }

      // Primeira vez: o cadastro nasce do convite.
      if (!sessao.email) {
        setEstado({ fase: 'sem-convite', sessao })
        return
      }
      try {
        const novo = await d.criarDoConvite(sessao.uid, sessao.email)
        setEstado({ fase: 'logado', sessao, cadastro: novo })
      } catch (e) {
        if (e instanceof FalhaDaNuvem && e.codigo === 'sem-convite') {
          setEstado({ fase: 'sem-convite', sessao })
          return
        }
        throw e
      }
    },
    [],
  )

  /** Carrega o SDK uma vez e reaproveita. */
  const obterNuvem = useCallback(async (): Promise<Nuvem> => {
    if (!nuvem.current) {
      nuvem.current = await conectar(CONFIG_ALUNO, APP_ALUNO)
      const n = nuvem.current
      cancelarObservacao.current = n.observarSessao((s) => {
        if (s) {
          deposito.escrever(MARCA_JA_ENTROU, '1')
          void resolverCadastro(n, s).catch(falharRef.current)
        }
      })
    }
    return nuvem.current
  }, [deposito, resolverCadastro])

  const falhar = useCallback((e: unknown) => {
    const codigo = e instanceof FalhaDaNuvem ? e.codigo : 'desconhecido'
    setEstado({ fase: 'falhou', mensagem: EXPLICACAO_DA_FALHA[motivoDoErro(codigo)] })
  }, [])

  /** Conclui o login de um link, usando o e-mail informado. */
  const concluirCom = useCallback(
    async (email: string, url: string) => {
      setEstado({ fase: 'concluindo' })
      try {
        const n = await obterNuvem()
        const s = await n.concluirLogin(normalizarEmail(email), url)
        limparEmailPendente(deposito, APP_ALUNO)
        deposito.escrever(MARCA_JA_ENTROU, '1')
        await resolverCadastro(n, s)
        // Limpa a URL: o link vale uma vez, e deixa-lo na barra de endereco faz
        // um recarregamento tentar de novo e falhar com "link invalido".
        window.history.replaceState({}, '', window.location.pathname)
      } catch (e) {
        falhar(e)
      }
    },
    [obterNuvem, deposito, falhar, resolverCadastro],
  )

  useEffect(() => {
    falharRef.current = falhar
  }, [falhar])

  // Abertura: link de login primeiro, sessao guardada depois.
  useEffect(() => {
    const url = window.location.href
    if (pareceLinkDeLogin(url)) {
      const email = lerEmailPendente(deposito, APP_ALUNO)
      if (email) void concluirCom(email, url)
      else setEstado({ fase: 'precisa-confirmar-email', url })
      return
    }
    // Sem link: so carrega o SDK se este aparelho ja entrou alguma vez.
    if (deposito.ler(MARCA_JA_ENTROU) === '1') void obterNuvem()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => () => cancelarObservacao.current?.(), [])

  const enviarLink = useCallback(
    async (email: string) => {
      const limpo = normalizarEmail(email)
      // Barra o obvio antes de gastar rede e um envio.
      if (!pareceEmail(limpo)) {
        setEstado({ fase: 'falhou', mensagem: EXPLICACAO_DA_FALHA['email-invalido'] })
        return
      }
      setEstado({ fase: 'enviando' })
      try {
        const n = await obterNuvem()
        // O destino e a propria pagina: o link traz a pessoa de volta para ca.
        await n.enviarLink(limpo, window.location.origin + window.location.pathname)
        guardarEmailPendente(deposito, APP_ALUNO, limpo)
        setEstado({ fase: 'link-enviado', email: limpo })
      } catch (e) {
        falhar(e)
      }
    },
    [obterNuvem, deposito, falhar],
  )

  const sair = useCallback(async () => {
    if (nuvem.current) await nuvem.current.sair()
    deposito.remover(MARCA_JA_ENTROU)
    limparEmailPendente(deposito, APP_ALUNO)
    setEstado({ fase: 'deslogado' })
  }, [deposito])

  const tentarDeNovo = useCallback(() => setEstado({ fase: 'deslogado' }), [])

  /** A camada de dados, para a central convidar. Só existe depois de entrar. */
  const obterDados = useCallback(async (): Promise<Dados> => {
    const n = await obterNuvem()
    if (!dados.current) dados.current = await abrirDados(n.app, ACADEMIA_PADRAO)
    return dados.current
  }, [obterNuvem])

  return { estado, enviarLink, concluirCom, sair, tentarDeNovo, obterDados }
}

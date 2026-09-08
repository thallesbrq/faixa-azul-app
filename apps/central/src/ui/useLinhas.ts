/**
 * Carrega os alunos e calcula as linhas da central.
 *
 * DUAS ETAPAS, E A PRIMEIRA JA VALE TELA: `pessoas` responde quem existe e em
 * que turma, e e uma leitura de colecao (rapida). Os `estados` sao um `getDoc`
 * por aluno, e e o que demora. Mostrar os nomes assim que chegam, com as celulas
 * carregando, e a diferenca entre "abriu" e "travou" para quem tem vinte alunos.
 *
 * RECARREGA SO QUANDO PEDIDO. Nao ha `setInterval`: o dado muda quando um ALUNO
 * sincroniza, o que acontece a cada poucos minutos no aparelho dele — e um
 * professor olhando a tabela nao precisa dela se mexendo sozinha. O botao de
 * recarregar diz quando foi a ultima leitura, que e a informacao que importa.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Convite, Dados } from '@faixa-azul/core/nuvem/pessoas'
import { abrirCentral } from '@faixa-azul/core/nuvem/central'
import { abrirCompetencias } from '@faixa-azul/core/nuvem/competencias'
import type { Competencias } from '@faixa-azul/core/nuvem/competencias'
import { itensCompetentes } from '@faixa-azul/core/domain/competencia'
import type { DadosDaCentral } from '@faixa-azul/core/nuvem/central'
import {
  linhaConvidada,
  linhasDaAcademia,
  linhaSemDados,
} from '@faixa-azul/core/application/central'
import type { Curriculo, LinhaDaCentral } from '@faixa-azul/core/application/central'
import type { EstadoPersistido } from '@faixa-azul/core/persistence/repositorio'
import type { FirebaseApp } from 'firebase/app'

export interface EstadoDasLinhas {
  fase: 'carregando-pessoas' | 'carregando-estados' | 'pronto' | 'erro'
  linhas: LinhaDaCentral[]
  /**
   * Os estados crus, guardados para a pagina de um aluno abrir sem reler.
   *
   * A central JA baixa tudo ao abrir (e a arquitetura escolhida), entao o
   * detalhe de um aluno e um `get` num mapa que ja esta na memoria — clique
   * instantaneo. Um link direto para /central/aluno/x espera a mesma leitura
   * inicial, e nao uma leitura propria: um caminho, nao dois.
   */
  estados: Map<string, EstadoPersistido>
  /** Quantos alunos nao pudemos ler. Erro, e nao ausencia de dado. */
  falhas: { uid: string; motivo: string }[]
  lidoEm: Date | null
  mensagem: string | null
  /**
   * Convites pendentes, guardados para a tela de convidar nao reler.
   *
   * A MESMA LEITURA SERVE AS DUAS COISAS: eles viram linha de aluno na tabela
   * (ADR-017, decisao 4) e lista no formulario de convite. Duas leituras
   * separadas divergiriam entre si dentro da mesma tela.
   */
  convites: Convite[]
}

export function useLinhas({
  app,
  dados,
  curriculoPorId,
}: {
  app: FirebaseApp
  dados: Dados
  /**
   * O curriculo de cada meta. FUNCAO e nao um curriculo so: alunos da mesma
   * turma podem perseguir graduacoes diferentes (ADR-016, decisao 3).
   */
  curriculoPorId: (estuda: string) => Curriculo | null
}) {
  const [estado, setEstado] = useState<EstadoDasLinhas>({
    fase: 'carregando-pessoas',
    linhas: [],
    estados: new Map(),
    falhas: [],
    lidoEm: null,
    mensagem: null,
    convites: [],
  })
  const central = useRef<DadosDaCentral | null>(null)
  const comps = useRef<Competencias | null>(null)

  const carregar = useCallback(async () => {
    setEstado((a) => ({ ...a, fase: 'carregando-pessoas', mensagem: null }))
    try {
      const [pessoas, convites] = await Promise.all([
        dados.listarPessoas(),
        /**
         * CONVITE QUE FALHA NAO DERRUBA A TABELA. Ele e informacao a mais — a
         * turma com quem ja entrou continua legivel sem ele. Se a leitura de
         * `pessoas` falhar, isso SIM e erro de tela, porque nao ha nada a
         * mostrar; e por isso que so este lado tem `catch`.
         */
        dados.listarConvites().catch(() => [] as Convite[]),
      ])
      const convitesDeAluno = convites.filter((c) => c.papel === 'aluno')
      // So aluno: o professor tem cadastro em `pessoas` e apareceria como uma
      // linha sem progresso, que nao e um aluno parado — e um professor.
      const alunos = pessoas.filter((p) => p.papel === 'aluno' && p.ativo)

      // Primeiro os nomes, com as celulas ainda vazias.
      setEstado((a) => ({
        ...a,
        fase: 'carregando-estados',
        linhas: [
          ...alunos.map((p) =>
            linhaSemDados({
              uid: p.uid,
              nome: p.nome,
              turma: p.turma,
              meta: p.meta,
              estuda: p.estuda,
              demo: p.demo,
            }),
          ),
          ...convitesDeAluno.map((c) =>
            linhaConvidada({
              email: c.email,
              nome: c.nome,
              turma: c.turma,
              meta: c.meta,
              estuda: c.estuda,
            }),
          ),
        ],
        convites,
      }))

      if (!central.current) central.current = await abrirCentral(app)
      const { porUid, falhas } = await central.current.estadosDe(alunos.map((p) => p.uid))

      /**
       * ATESTACOES SO DE QUEM E MEDIDO POR ELAS.
       *
       * Quem estuda o curriculo de azul e medido por cartao e nunca consulta
       * este mapa; ler `competencias` de vinte alunos para usar em dois seria
       * vinte consultas de colecao a mais por abertura de tela.
       *
       * A DECISAO DE QUEM PRECISA VEM DO CURRICULO, e nao de uma lista de metas
       * cravada aqui: `curriculoPorId(estuda)?.medida === 'atestado'`. Cravar
       * `estuda === '1grau'` funcionaria hoje e erraria no dia em que o 2o grau
       * chegasse — silenciosamente, com a coluna voltando a `—`.
       */
      const porAtestado = alunos.filter((p) => curriculoPorId(p.estuda)?.medida === 'atestado')
      const competentes = new Map<string, number>()
      if (porAtestado.length > 0) {
        if (!comps.current) comps.current = await abrirCompetencias(app)
        await Promise.all(
          porAtestado.map(async (p) => {
            try {
              const registros = await comps.current!.registrosDe(p.uid)
              competentes.set(p.uid, itensCompetentes(registros).size)
            } catch {
              /**
               * FALHA FICA FORA DO MAPA, e nao entra como zero.
               *
               * `linhaDoAluno` traduz "ausente do mapa" em `atestado-nao-lido` e
               * mostra `—`. Um zero aqui diria ao professor que ele nao atestou
               * nada — e ele pode ter atestado os 29.
               */
            }
          }),
        )
      }

      const agora = new Date()
      // A montagem e do core: a aba do professor no celular usa a MESMA funcao,
      // para as duas telas nao discordarem sobre a mesma academia.
      const linhas = linhasDaAcademia({
        cadastros: alunos,
        convites: convitesDeAluno,
        estados: porUid,
        competentes,
        curriculoPorId,
        agora,
      })

      setEstado({
        fase: 'pronto',
        linhas,
        estados: porUid,
        falhas,
        lidoEm: agora,
        mensagem: null,
        convites,
      })
    } catch (e) {
      setEstado((a) => ({
        ...a,
        fase: 'erro',
        mensagem: (e as Error)?.message ?? 'Não foi possível carregar os alunos.',
      }))
    }
  }, [app, dados, curriculoPorId])

  useEffect(() => {
    void carregar()
  }, [carregar])

  return { estado, recarregar: carregar }
}

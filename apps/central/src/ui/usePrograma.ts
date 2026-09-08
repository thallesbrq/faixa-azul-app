/**
 * Carrega e grava o programa de uma turma.
 *
 * GRAVA AULA POR AULA, e nao o programa inteiro: cada aula e um documento
 * (ver `nuvem/programas`), entao editar a aula 4 nao toca na aula 12. Isso e o
 * que permite dois professores montarem a mesma turma sem um apagar o outro.
 *
 * O ESTADO LOCAL ANDA NA FRENTE DA REDE. Clicar num item do bolsao atualiza a
 * tela na hora e grava em seguida; se a gravacao falhar, a mensagem aparece e o
 * botao de recarregar desfaz. A alternativa — esperar o Firestore a cada clique —
 * faria montar 25 aulas parecer travamento, e montar e uma sequencia de dezenas
 * de cliques.
 *
 * ---------------------------------------------------------------------------
 * O PLANNER E DERIVADO (`useMemo`), E NAO GUARDADO EM ESTADO. Isso conserta um
 * laco infinito que chegou a producao, e a forma da correcao importa mais que a
 * linha que a causou.
 *
 * O QUE ACONTECEU: `App.tsx` passava
 *
 *     itensConhecidos={[...CURRICULO_AZUL.itens, ...ITENS_1GRAU]}
 *
 * — um array NOVO a cada render. A cadeia era:
 *
 *     array novo  ->  `desenhar` com identidade nova
 *                 ->  `carregar` (que dependia de `desenhar`) tambem nova
 *                 ->  `useEffect([carregar])` roda de novo
 *                 ->  `setEstado` -> render -> array novo -> ...
 *
 * Efeito visivel: a tela PISCANDO e sem conteudo, relendo o Firestore a cada
 * volta. O laco nao dava erro em lugar nenhum.
 *
 * POR QUE NAO BASTA HOISTAR A CONSTANTE: isso conserta este caso e deixa a
 * armadilha armada — o proximo `useMemo` esquecido no chamador reabre o mesmo
 * laco. Derivando com `useMemo`, um array instavel apenas RECALCULA (barato,
 * puro) em vez de disparar um efeito. O efeito de carga passa a depender de
 * `[app, turma]` e mais nada, que sao as duas coisas que de fato mudam o que
 * precisa ser lido.
 *
 * A CONSTANTE FOI HOISTADA TAMBEM, no chamador — por desperdicio, nao por
 * correcao: reagrupar 81 itens em 12 blocos a cada tecla digitada no campo de
 * foco e trabalho jogado fora.
 * ---------------------------------------------------------------------------
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FirebaseApp } from 'firebase/app'
import { abrirProgramas } from '@faixa-azul/core/nuvem/programas'
import type { Programas } from '@faixa-azul/core/nuvem/programas'
import {
  aulaVazia,
  montarPlanner,
  porItemNaAula,
  porRotulo,
  sugestaoDo1Grau,
  tirarItemDaAula,
  tirarRotulo,
} from '@faixa-azul/core/application/programa'
import type { AulaDoPrograma, EstadoDoPlanner, RotuloDaAula } from '@faixa-azul/core/application/programa'
import type { TechniqueItem } from '@faixa-azul/core/domain/types'
import { contar } from './diagnostico'

export interface EstadoDoProgramaNaTela {
  fase: 'carregando' | 'pronto' | 'erro'
  planner: EstadoDoPlanner | null
  mensagem: string | null
  /** Uma gravacao em curso. A tela desabilita o que nao pode competir com ela. */
  gravando: boolean
}

export function usePrograma({
  app,
  turma,
  itensDoBolsao,
  itensConhecidos,
  itensDo1Grau,
  abrir = abrirProgramas,
}: {
  app: FirebaseApp
  turma: string
  itensDoBolsao: readonly TechniqueItem[]
  itensConhecidos: readonly TechniqueItem[]
  /** Os 29 do 1o grau, para o botao de aplicar a sugestao. */
  itensDo1Grau: readonly TechniqueItem[]
  /**
   * Como abrir a camada de nuvem. Injetavel, e nao por gosto por injecao.
   *
   * O laco infinito acima passou por 658 testes e por uma inspecao na tela
   * porque a pagina de amostra montava o COMPONENTE, chamando `montarPlanner`
   * direto — ela nunca montou ESTE HOOK. Ou seja: o caminho de verificacao
   * passava ao lado do codigo que quebrou.
   *
   * Com a fabrica injetavel, a amostra monta o hook de verdade contra uma loja
   * em memoria, e passa a exercitar o carregamento, o `useMemo`, as gravacoes e
   * o "aplicar sugestao" — o codigo que roda em producao, sem Firebase.
   */
  abrir?: (app: FirebaseApp) => Promise<Programas>
}) {
  const [aulas, setAulas] = useState<AulaDoPrograma[]>([])
  const [fase, setFase] = useState<EstadoDoProgramaNaTela['fase']>('carregando')
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [gravando, setGravando] = useState(false)
  const nuvem = useRef<Programas | null>(null)

  /**
   * ESPELHO DE `aulas` NUMA REF, e isto conserta um defeito PROVADO em producao.
   *
   * A versao anterior lia a aula atual DENTRO do updater de `setAulas` e
   * atribuia o resultado a uma variavel de fechamento:
   *
   *     let nova = null
   *     setAulas((atuais) => { ...; nova = proxima; return [...] })
   *     if (nova === null) return          // <- SEMPRE null aqui
   *     await gravarAula(turma, nova)      // <- nunca chegava
   *
   * `setAulas` nao roda o updater na hora: ele e ENFILEIRADO e executado na
   * proxima renderizacao. Entao a checagem logo abaixo lia `null`, a funcao
   * retornava, e a gravacao nunca acontecia. O item APARECIA na tela (o estado
   * local atualizava) e nao ia para o Firestore.
   *
   * COMO EU SOUBE: `programas/RGI/aulas` tinha ZERO documentos depois de ele ter
   * feito varias interacoes. Nao foi dedução — foi a colecao vazia.
   *
   * E POR QUE A MINHA VERIFICACAO NO NAVEGADOR NAO PEGOU: a loja em memoria da
   * pagina de amostra nao reclama de escrita que nao chega, e a tela mostrava o
   * item posto (estado local). Eu conferi o que aparecia, nao o que gravava.
   */
  const aulasRef = useRef<AulaDoPrograma[]>([])
  aulasRef.current = aulas

  /**
   * A FABRICA MORA NUMA REF, e o efeito de carga NAO depende dela.
   *
   * Medido, e nao suposto: com `abrir` nas dependencias do efeito, uma fabrica
   * nova a cada render produz ~85 renders por segundo — e foi assim que eu
   * confirmei que o contador de renders da pagina de amostra detecta o defeito
   * (486 -> 588 em 1,2 s).
   *
   * A identidade de "como abrir a conexao" nao pode decidir SE relemos o
   * programa. Quem decide isso e `[app, turma]`, e mais nada. Numa ref, um
   * chamador desatento nao reabre o laco.
   */
  const abrirRef = useRef(abrir)
  abrirRef.current = abrir

  /**
   * A ORIGEM DA VERDADE E `aulas`, e o planner sai dela.
   *
   * `montarPlanner` produz 81 caixas a partir de poucas aulas guardadas; guardar
   * a saida dele e reconstruir as aulas a partir dela seria derivar duas vezes,
   * na direcao errada.
   */
  const planner = useMemo(
    () => montarPlanner({ turma, aulas, itensDoBolsao, itensConhecidos }),
    [turma, aulas, itensDoBolsao, itensConhecidos],
  )

  /**
   * O EFEITO DE CARGA DEPENDE DE `[app, turma]` E MAIS NADA.
   *
   * Era `[carregar]`, e `carregar` dependia de `desenhar`, que dependia dos
   * arrays de itens — a corrente que fechou o laco. Ler o programa depende de
   * QUAL PROGRAMA, e nada mais.
   */
  useEffect(() => {
    contar('cargaPrograma')
    let cancelado = false
    setFase('carregando')
    setMensagem(null)

    void (async () => {
      try {
        if (!nuvem.current) nuvem.current = await abrirRef.current(app)
        const lidas = await nuvem.current.aulasDe(turma)
        // Trocar de turma no meio de uma leitura descartaria a resposta antiga
        // sobre a nova — a guarda evita ver o programa da RG2 na tela da RGI.
        if (cancelado) return
        aulasRef.current = lidas
        setAulas(lidas)
        setFase('pronto')
      } catch (e) {
        if (cancelado) return
        setFase('erro')
        setMensagem((e as Error)?.message ?? 'Não foi possível ler o programa desta turma.')
      }
    })()

    return () => {
      cancelado = true
    }
    // `abrir` fica FORA de proposito — ver `abrirRef` acima.
  }, [app, turma])

  const recarregar = useCallback(async () => {
    setFase('carregando')
    setMensagem(null)
    try {
      if (!nuvem.current) nuvem.current = await abrirRef.current(app)
      aulasRef.current = await nuvem.current.aulasDe(turma)
      setAulas(aulasRef.current)
      setFase('pronto')
    } catch (e) {
      setFase('erro')
      setMensagem((e as Error)?.message ?? 'Não foi possível ler o programa desta turma.')
    }
  }, [app, turma])

  /** Aplica uma mudanca numa aula: local primeiro, rede depois. */
  const mudar = useCallback(
    async (numero: number, f: (a: AulaDoPrograma) => AulaDoPrograma) => {
      // A aula sai da REF e nao do updater — ver `aulasRef` acima.
      const atual = aulasRef.current.find((a) => a.numero === numero) ?? aulaVazia(numero)
      const nova = f(atual)
      // Sem mudanca real (clique repetido no mesmo item) nao grava nada.
      if (nova === atual) return

      // A ref anda junto com o estado para dois cliques seguidos na mesma aula
      // nao partirem os dois da mesma versao — o segundo apagaria o primeiro.
      aulasRef.current = [...aulasRef.current.filter((a) => a.numero !== numero), nova]
      setAulas(aulasRef.current)

      setGravando(true)
      setMensagem(null)
      try {
        if (!nuvem.current) nuvem.current = await abrirRef.current(app)
        await nuvem.current.gravarAula(turma, nova)
      } catch (e) {
        setMensagem(
          `Não consegui gravar a aula ${numero}: ${(e as Error)?.message ?? 'erro'}. Recarregue para ver o que está salvo.`,
        )
      } finally {
        setGravando(false)
      }
    },
    [app, turma],
  )

  /**
   * Aplica a sugestao do 1o grau nas 25 primeiras aulas.
   *
   * NAO SOBRESCREVE AULA QUE JA TEM CONTEUDO. Aplicar duas vezes por engano, ou
   * aplicar depois de o professor ja ter montado a aula 4, apagaria o trabalho
   * dele — e a sugestao existe para poupar trabalho, nao para destrui-lo.
   */
  const aplicarSugestao = useCallback(async () => {
    setGravando(true)
    setMensagem(null)
    try {
      const plano = sugestaoDo1Grau(itensDo1Grau)
      const ocupadas = new Set(
        aulasRef.current
          .filter((a) => a.itemIds.length > 0 || a.rotulos.length > 0)
          .map((a) => a.numero),
      )
      const novas: AulaDoPrograma[] = []
      for (const [numero, itemIds] of plano) {
        if (ocupadas.has(numero)) continue
        novas.push({ ...aulaVazia(numero), itemIds })
      }
      if (novas.length === 0) {
        setMensagem('As aulas do 1º grau já têm conteúdo — nada foi sobrescrito.')
        return
      }

      if (!nuvem.current) nuvem.current = await abrirRef.current(app)
      // EM LOTE: sao ~25 documentos, e um laco deixaria a turma pela metade se a
      // rede caisse no meio.
      await nuvem.current.gravarVarias(turma, novas)
      aulasRef.current = [
        ...aulasRef.current.filter((a) => !novas.some((n) => n.numero === a.numero)),
        ...novas,
      ]
      setAulas(aulasRef.current)
      setMensagem(
        `Sugestão aplicada em ${novas.length} ${novas.length === 1 ? 'aula' : 'aulas'}. Mova o que quiser.`,
      )
    } catch (e) {
      setMensagem((e as Error)?.message ?? 'Não foi possível aplicar a sugestão.')
    } finally {
      setGravando(false)
    }
  }, [app, turma, itensDo1Grau])

  return {
    estado: { fase, planner: fase === 'carregando' ? null : planner, mensagem, gravando },
    recarregar,
    aplicarSugestao,
    porItem: (numero: number, itemId: string) => mudar(numero, (a) => porItemNaAula(a, itemId)),
    tirarItem: (numero: number, itemId: string) => mudar(numero, (a) => tirarItemDaAula(a, itemId)),
    acrescentarRotulo: (numero: number, r: RotuloDaAula) => mudar(numero, (a) => porRotulo(a, r)),
    removerRotulo: (numero: number, id: string) => mudar(numero, (a) => tirarRotulo(a, id)),
    /**
     * O FOCO GRAVA NO BLUR, e nao a cada tecla.
     *
     * A versao anterior chamava `mudar` no `onChange`: digitar "guarda fechada"
     * eram quinze gravacoes no Firestore, quinze escritas cobradas, e a ultima
     * podendo chegar fora de ordem e gravar "guarda fechad".
     */
    mudarFoco: (numero: number, foco: string) => mudar(numero, (a) => (a.foco === foco ? a : { ...a, foco })),
  }
}

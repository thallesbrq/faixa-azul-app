/**
 * Estado da aplicacao na UI.
 *
 * Unico ponto que conversa com o armazenamento. Os calculos vem todos das
 * camadas de dominio e aplicacao, que nao sabem que React existe.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { montarFilaDoDia, moduloDeMaiorRisco } from '../application/fila'
import { registrarRevisao, revisadosHoje, taxaDeAcertoSemDica } from '../application/revisar'
import { atribuir } from '../application/montagem'
import {
  codificarMontagem,
  codigoDoHash,
  decodificarMontagem,
} from '../domain/compartilhar'
import { criarSessao, resumoDoTreino } from '../application/treino'
import type { EntradaRevisao } from '../application/revisar'
import { gerarBaralho } from '../domain/cards'
import { diasAteProva as calcularDiasAteProva } from '../domain/scheduler'
import { aplicarValidacoes, criarValidacao } from '../domain/validacao'
import { normalizarUrlDeVideo } from '../domain/video'
import type { Dificuldade, PracticeObservation, ValidationStatus } from '../domain/types'
import { depositoEmMemoria, depositoLocalStorage } from '../persistence/deposito'
import { carregar, salvar } from '../persistence/repositorio'
import type { AlteracaoAula, AlteracaoItem, EstadoPersistido } from '../persistence/repositorio'
import { AULAS, CARTOES_TEORIA, CONTEUDOS, ITENS, MODULOS, REQUISITOS } from '../seed'

/**
 * Sem localStorage o app segue funcionando na sessao, mas o progresso nao
 * sobrevive ao fechamento — e a UI avisa, em vez de perder dados em silencio.
 */
const depositoDoNavegador = depositoLocalStorage()
const deposito = depositoDoNavegador ?? depositoEmMemoria()
export const armazenamentoPersistente = depositoDoNavegador !== null

export function useApp() {
  const [estado, setEstado] = useState<EstadoPersistido>(() => carregar(deposito, new Date()))
  const contadorId = useRef(0)

  const atualizar = useCallback((proximo: EstadoPersistido) => {
    salvar(deposito, proximo)
    setEstado(proximo)
  }, [])

  /** Itens com as correcoes do professor ja aplicadas. */
  const itens = useMemo(() => aplicarValidacoes(ITENS, estado.validacoes), [estado.validacoes])

  const baralho = useMemo(
    () =>
      gerarBaralho({
        itens,
        conteudos: CONTEUDOS,
        requisitos: REQUISITOS,
        cartoesTeoria: CARTOES_TEORIA,
      }),
    [itens],
  )

  const agora = new Date()
  const diasAteProva = calcularDiasAteProva(agora, estado.planoExame.dataAlvo)

  const fila = useMemo(
    () => montarFilaDoDia({ cartoes: baralho, itens, revisoes: estado.revisoes, agora, config: estado.config }),
    // `agora` muda a cada render; recalcular a fila por minuto e desnecessario,
    // entao dependemos so do que de fato altera o resultado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [baralho, itens, estado.revisoes, estado.config],
  )

  const registrar = useCallback(
    (entrada: Omit<EntradaRevisao, 'agora' | 'diasAteProva' | 'gerarId'>) => {
      const momento = new Date()
      const proximo = registrarRevisao(estado, {
        ...entrada,
        agora: momento,
        diasAteProva: calcularDiasAteProva(momento, estado.planoExame.dataAlvo),
        gerarId: () => `ev-${momento.getTime()}-${++contadorId.current}`,
      })
      atualizar(proximo)
    },
    [estado, atualizar],
  )

  const definirDataAlvo = useCallback(
    (dataISO: string, provisoria: boolean) => {
      atualizar({ ...estado, planoExame: { ...estado.planoExame, dataAlvo: dataISO, provisoria } })
    },
    [estado, atualizar],
  )

  /**
   * Registra o que o professor corrigiu. E o unico caminho para um item chegar a
   * `validado_pelo_professor` — e nao apaga nada: a validacao anterior fica no
   * historico (append-only).
   */
  const registrarValidacao = useCallback(
    (entrada: {
      itemId: string
      texto: string
      novoStatus: ValidationStatus
      origem: 'aula_particular' | 'aula_regular'
      aulaNumero?: number
    }) => {
      const momento = new Date()
      const validacao = criarValidacao({
        id: `val-${momento.getTime()}-${++contadorId.current}`,
        ...entrada,
        agora: momento,
      })
      atualizar({ ...estado, validacoes: [...estado.validacoes, validacao] })
    },
    [estado, atualizar],
  )

  /**
   * Marca uma aula do pacote como realizada (ou desfaz, se foi engano).
   *
   * As aulas vem do seed e as alteracoes do aluno ficam separadas em
   * `estado.aulas` — mesmo padrao das validacoes: o seed nunca e reescrito, o
   * que o aluno faz e sempre uma camada por cima.
   */
  const marcarAulaRealizada = useCallback(
    (numero: number, realizada: boolean) => {
      const outras = estado.aulas.filter((a) => a.numero !== numero)
      const anterior = estado.aulas.find((a) => a.numero === numero)
      atualizar({
        ...estado,
        aulas: [
          ...outras,
          { ...anterior, numero, realizadaEm: realizada ? new Date().toISOString() : undefined },
        ].sort((a, b) => a.numero - b.numero),
      })
    },
    [estado, atualizar],
  )

  /**
   * Registra uma sessao de treino (aula regular de seg/qua).
   *
   * Nota do professor e observacoes vao juntas porque sao a mesma sessao — mas
   * a validacao de item continua sendo caminho separado (registrarValidacao):
   * "o mestre comentou no treino" nao e "o mestre confirmou esta tecnica".
   */
  const registrarSessao = useCallback(
    (entrada: { parceiro?: string; notaDoProfessor?: string; observacoes: PracticeObservation[] }) => {
      const momento = new Date()
      const sessao = criarSessao({
        id: `ses-${momento.getTime()}-${++contadorId.current}`,
        agora: momento,
        ...entrada,
      })
      atualizar({ ...estado, sessoes: [...estado.sessoes, sessao] })
    },
    [estado, atualizar],
  )

  /**
   * Anota um item: dificuldade percebida e/ou video de referencia escolhido.
   *
   * A URL passa por `normalizarUrlDeVideo` ANTES de ser guardada, nao na hora de
   * mostrar. Validar na escrita significa que o armazenamento nunca contem um
   * link que a tela nao possa abrir com seguranca — inclusive o que vier de um
   * backup importado de outro aparelho.
   *
   * Passar `video: ''` limpa o link; `dificuldade: undefined` nao mexe nela.
   */
  const anotarItem = useCallback(
    (itemId: string, mudanca: { dificuldade?: Dificuldade; video?: string; videoTitulo?: string }) => {
      const anterior = estado.itens.find((a) => a.itemId === itemId)
      const proxima: AlteracaoItem = { ...anterior, itemId }

      if (mudanca.dificuldade !== undefined) proxima.dificuldade = mudanca.dificuldade
      if (mudanca.video !== undefined) {
        const url = normalizarUrlDeVideo(mudanca.video)
        proxima.video = url ?? undefined
        // Limpar o link limpa o titulo junto: titulo sem video e lixo orfao.
        if (!url) proxima.videoTitulo = undefined
      }
      if (mudanca.videoTitulo !== undefined) {
        proxima.videoTitulo = mudanca.videoTitulo.trim() || undefined
      }

      atualizar({
        ...estado,
        itens: [...estado.itens.filter((a) => a.itemId !== itemId), proxima],
      })
    },
    [estado, atualizar],
  )

  const anotacoes = useMemo(
    () => new Map(estado.itens.map((a) => [a.itemId, a])),
    [estado.itens],
  )

  /** So as dificuldades, no formato que o planejamento das aulas consome. */
  const dificuldades = useMemo(() => {
    const mapa = new Map<string, Dificuldade>()
    for (const a of estado.itens) if (a.dificuldade) mapa.set(a.itemId, a.dificuldade)
    return mapa
  }, [estado.itens])

  /**
   * Atribuicao manual das aulas (aula -> ids). Vem de `estado.aulas`, onde cada
   * aula guarda os seus `itemIds` quando ja foi montada.
   */
  const atribuicao = useMemo(() => {
    const m = new Map<number, string[]>()
    for (const a of estado.aulas) {
      if (a.itemIds) m.set(a.numero, a.itemIds)
    }
    return m
  }, [estado.aulas])

  /**
   * Move um item para uma aula, ou de volta ao bolsao com `null`.
   *
   * A invariante de um item em um lugar so vive em `atribuir`, no dominio da
   * aplicacao — aqui e so persistencia. Gravar as dez aulas de uma vez (e nao
   * so as duas afetadas) mantem o estado como espelho exato da atribuicao, sem
   * sobra de aula que ficou com lista velha.
   */
  const atribuirItem = useCallback(
    (itemId: string, aula: number | null) => {
      const proxima = atribuir(atribuicao, itemId, aula)
      const outras = new Map(estado.aulas.map((a) => [a.numero, a]))
      const aulas: AlteracaoAula[] = []
      for (const [numero, itemIds] of proxima) {
        aulas.push({ ...outras.get(numero), numero, itemIds })
        outras.delete(numero)
      }
      // Aulas que nunca foram tocadas seguem sem itemIds.
      for (const a of outras.values()) aulas.push(a)
      atualizar({ ...estado, aulas: aulas.sort((a, b) => a.numero - b.numero) })
    },
    [estado, atribuicao, atualizar],
  )

  /** Substitui a montagem inteira — usado por "sugerir distribuicao" e "limpar". */
  const definirAtribuicao = useCallback(
    (nova: ReadonlyMap<number, readonly string[]>) => {
      const outras = new Map(estado.aulas.map((a) => [a.numero, a]))
      const aulas: AlteracaoAula[] = []
      for (const [numero, itemIds] of nova) {
        aulas.push({ ...outras.get(numero), numero, itemIds: [...itemIds] })
        outras.delete(numero)
      }
      for (const a of outras.values()) aulas.push({ ...a, itemIds: undefined })
      atualizar({ ...estado, aulas: aulas.sort((a, b) => a.numero - b.numero) })
    },
    [estado, atualizar],
  )

  /**
   * Montagem recebida por link, se houver.
   *
   * Lida UMA VEZ, na montagem do componente, e nunca aplicada sozinha: importar
   * sobrescreve o arranjo atual, e sobrescrever trabalho de alguem sem pedir e
   * inaceitavel. A UI mostra o que vai acontecer e espera o gesto.
   */
  const lerDoHash = useCallback(() => {
    const codigo = codigoDoHash(window.location.hash)
    if (!codigo) return null
    // Devolve o resultado como ele vem: ja e uma uniao discriminada por `ok`.
    return decodificarMontagem(codigo, ITENS.filter((i) => i.ativo))
  }, [])

  const [recebida, setRecebida] = useState(lerDoHash)

  /**
   * Escuta `hashchange` alem de ler na montagem.
   *
   * Sem isto, o recurso falha justamente no caso mais comum: o app instalado
   * como PWA ja esta aberto, o professor manda o link, e abrir um link que muda
   * SO o fragmento nao recarrega a pagina — o inicializador do estado nunca roda
   * de novo e o aviso nunca aparece. Encontrado testando o fluxo de verdade, e
   * nao pelo caminho que eu tinha imaginado.
   */
  useEffect(() => {
    const aoMudar = () => setRecebida(lerDoHash())
    window.addEventListener('hashchange', aoMudar)
    return () => window.removeEventListener('hashchange', aoMudar)
  }, [lerDoHash])

  /** Limpa o fragmento sem recarregar, para o link nao reaparecer a cada volta. */
  const limparHash = useCallback(() => {
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
    setRecebida(null)
  }, [])

  const importarRecebida = useCallback(() => {
    if (recebida?.ok) definirAtribuicao(recebida.atribuicao)
    limparHash()
  }, [recebida, definirAtribuicao, limparHash])

  /** Codigo compartilhavel do arranjo atual. */
  const codigoDaMontagem = useMemo(
    () => codificarMontagem(itens.filter((i) => i.ativo), atribuicao),
    [itens, atribuicao],
  )

  /** Aulas do seed com as alteracoes do aluno aplicadas. */
  const aulas = useMemo(() => {
    const alteracoes = new Map(estado.aulas.map((a) => [a.numero, a]))
    return AULAS.map((aula) => {
      const alt = alteracoes.get(aula.numero)
      return alt ? { ...aula, realizadaEm: alt.realizadaEm, notas: alt.notas ?? aula.notas } : aula
    })
  }, [estado.aulas])

  return {
    estado,
    itens,
    conteudos: CONTEUDOS,
    modulos: MODULOS,
    aulas,
    requisitos: REQUISITOS,
    baralho,
    fila,
    diasAteProva,
    revisadosHoje: revisadosHoje(estado.eventos, agora),
    taxaSemDica: taxaDeAcertoSemDica(estado.eventos),
    risco: moduloDeMaiorRisco(baralho, itens, estado.revisoes),
    registrar,
    definirDataAlvo,
    registrarValidacao,
    marcarAulaRealizada,
    registrarSessao,
    atribuicao,
    codigoDaMontagem,
    recebida,
    importarRecebida,
    descartarRecebida: limparHash,
    atribuirItem,
    definirAtribuicao,
    anotarItem,
    anotacoes,
    dificuldades,
    resumoTreino: resumoDoTreino(itens, estado.sessoes),
  }
}

export type AppEstado = ReturnType<typeof useApp>

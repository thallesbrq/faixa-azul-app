/**
 * Aulas particulares — RF-07.
 *
 * Pacote de 10 aulas de 50 minutos com o Prof. Joao Eduardo, cobrindo as Secoes
 * 4 e 5 (56 itens ativos: 48 guardas, 8 saidas).
 *
 * DECISOES QUE MOLDARAM ESTE MODULO (tomadas pelo aluno no planejamento):
 *
 * 1. PLANO FIXO, gerado pelo app. Nao existia pauta previa, entao o app propoe
 *    a distribuicao — e proposta fixa, nao sorteio a cada aula, para poder ser
 *    mostrada ao professor de uma vez e para garantir cobertura (uma pauta
 *    dinamica pode nunca sortear um item).
 *
 * 2. CORRECAO NAO VALIDA SOZINHA. Quando o professor corrige, o aluno marca se
 *    ja executa a versao nova. Se nao, o item volta para a fila: e a diferenca
 *    entre "ouvi a correcao" e "sei fazer o que ele pediu".
 *
 * 3. REPESCAGEM ENTRA NO TOPO da proxima aula como extra, sem deslocar o plano.
 *    Cabe porque re-mostrar algo ja corrigido e barato perto de aprender do
 *    zero.
 *
 * 4. CUSTO VARIA POR ITEM, estimado pelo eixo de dominio. Um numero fixo por
 *    item seria mentira: mostrar uma raspada que o aluno ja treina e rapido, um
 *    berimbolo do zero nao.
 *
 * A consequencia da decisao 4 e o resultado mais util deste modulo, e vale dita
 * em voz alta: com dominio zero em tudo, os 56 itens pedem ~672 minutos e o
 * pacote tem 500 — nao cabe. Com dominio alto, pedem ~280 e cabe folgado. Ou
 * seja, o pacote de 10 aulas so cobre a prova SE o aluno chegar tendo estudado
 * antes. As tercas, quintas e sextas nao sao complemento das aulas: sao o que
 * torna as aulas suficientes.
 *
 * Modulo puro: sem React, sem I/O.
 */

import { dividirEmPartes, paresDoCirculo } from '../domain/circulo'
import type { AulaParticular, Dificuldade, TechniqueItem, ValidacaoDoProfessor } from '../domain/types'
import type { ProgressoDeItem } from './progresso'

/** Duracao de uma aula do pacote. */
export const MINUTOS_POR_AULA = 50

/**
 * Minutos guardados em cada aula para repescagem (decisao 3). Dois itens ja
 * corrigidos cabem aqui sem tirar nada do plano.
 */
export const MINUTOS_RESERVADOS = 8

/**
 * Custo estimado de um item, em minutos.
 *
 * Os tres numeros abaixo sao a parte do modulo que depende de conhecer o
 * professor, e nao de programacao — estao nomeados e juntos de proposito, para
 * serem ajustados depois das primeiras aulas com dados reais.
 */
export const MINUTOS_ITEM_CRU = 12
export const MINUTOS_ITEM_DOMINADO = 5
export const MINUTOS_REPESCAGEM = 3

/**
 * Fator pela dificuldade que o ALUNO marcou.
 *
 * Isto e auto-relato, nao medida — e por isso entra aqui, no planejamento, e
 * nunca no agendamento das revisoes (ver Dificuldade em domain/types.ts). A
 * vantagem pratica e de tempo: o aluno pode marcar facil/medio/dificil hoje,
 * antes de estudar qualquer coisa, e a estimativa das 10 aulas melhora na hora
 * — enquanto o dominio so existe depois de semanas de revisao.
 *
 * Sem marcacao, assume medio (fator 1), que reproduz exatamente o calculo
 * anterior a este campo existir.
 */
export const FATOR_DIFICULDADE: Record<Dificuldade, number> = {
  facil: 0.75,
  medio: 1,
  dificil: 1.35,
}

/**
 * Quanto tempo de aula um item deve consumir.
 *
 * Interpola linearmente entre cru e dominado. Nao ha ciencia na linearidade —
 * ha a recusa de usar um numero unico, que era o erro maior.
 *
 * O fator de dificuldade se aplica tambem a repescagem, sem excecao: uma
 * tecnica dificil demora mais para ser re-mostrada tambem, e uma regra sem
 * excecao e mais facil de conferir do que uma com.
 */
export function custoEmMinutos(
  dominio: number,
  repescagem = false,
  dificuldade: Dificuldade = 'medio',
): number {
  const fator = FATOR_DIFICULDADE[dificuldade]
  if (repescagem) return MINUTOS_REPESCAGEM * fator
  const d = Math.min(1, Math.max(0, dominio))
  return (MINUTOS_ITEM_CRU + (MINUTOS_ITEM_DOMINADO - MINUTOS_ITEM_CRU) * d) * fator
}

/**
 * Dificuldade marcada pelo aluno, por item. Chega de fora (das anotacoes
 * persistidas) em vez de morar no ProgressoDeItem: dificuldade nao e progresso,
 * e misturar as duas coisas obrigaria o modulo de progresso a conhecer as
 * anotacoes do aluno sem precisar delas.
 *
 * Item ausente do mapa conta como 'medio'.
 */
export type DificuldadePorItem = ReadonlyMap<string, Dificuldade>

const SEM_DIFICULDADE: DificuldadePorItem = new Map()

// ---------------------------------------------------------------------------
// Geracao do plano
// ---------------------------------------------------------------------------

export interface AulaPlanejada {
  numero: number
  itens: TechniqueItem[]
  /** Posicoes cobertas, para o titulo da aula. */
  posicoes: string[]
  minutosEstimados: number
}

export interface PlanoDeAulas {
  aulas: AulaPlanejada[]
  /**
   * Itens que nao couberam no pacote. Existir e informacao, nao falha: diz
   * quanto o aluno ainda precisa estudar sozinho para o pacote dar conta.
   */
  foraDoPlano: TechniqueItem[]
  minutosDeConteudo: number
  minutosDisponiveis: number
}

/**
 * Posicoes tratadas como avancadas: entram no fim da fila e por isso sao as
 * primeiras a cair quando o pacote nao comporta tudo (decisao do aluno).
 *
 * O Complexo Moderno reune berimbolo, 50-50, guarda X e one leg X — o conteudo
 * que custa mais minutos por item e o que menos aparece numa banca de faixa
 * azul. Deixar isso no fim e escolher deliberadamente onde o corte cai, em vez
 * de aceitar o que o algoritmo deixou por ultimo.
 *
 * Comparacao por prefixo porque o rotulo importado e longo e pode variar no
 * final ("(One Leg, 50-50, Guarda X, Berimbolo)").
 */
export const PREFIXOS_AVANCADOS = ['Complexo Moderno']

function ehAvancada(posicao: string): boolean {
  return PREFIXOS_AVANCADOS.some((p) => posicao.startsWith(p))
}

/**
 * Sequencia das guardas: circulo primeiro, avancadas depois.
 *
 * As posicoes avancadas ficam FORA do circulo de proposito. O circulo existe
 * para espacar as duas passagens de cada posicao, e isso briga com colocar algo
 * no fim da fila — uma posicao no circulo aparece cedo por construcao. Como o
 * aluno decidiu que o avancado e o primeiro a cair, ele perde o espacamento e
 * ganha a posicao final. Se o dominio subir e o conteudo couber, ele cai nas
 * ultimas aulas, que e onde conteudo avancado faz mais sentido de qualquer modo.
 */
function sequenciaDeGuardas(porPosicao: Map<string, TechniqueItem[]>): TechniqueItem[] {
  const todas = [...porPosicao.keys()]
  const avancadas = todas.filter(ehAvancada)
  const posicoes = todas.filter((p) => !ehAvancada(p))
  const metades = new Map(posicoes.map((p) => [p, dividirEmPartes(porPosicao.get(p) ?? [], 2)]))
  const usadas = new Map(posicoes.map((p) => [p, 0]))

  const sequencia: TechniqueItem[] = []
  for (const [a, b] of paresDoCirculo(posicoes.length)) {
    for (const idx of [a, b]) {
      const pos = posicoes[idx]
      const ponteiro = usadas.get(pos) ?? 0
      sequencia.push(...(metades.get(pos)?.[ponteiro] ?? []))
      usadas.set(pos, ponteiro + 1)
    }
  }

  for (const pos of avancadas) {
    sequencia.push(...(porPosicao.get(pos) ?? []))
  }

  return sequencia
}

/**
 * Gera a proposta de plano para o pacote.
 *
 * Estrutura de cada aula: uma saida primeiro, depois guardas ate o orcamento de
 * minutos acabar. A saida vem primeiro por decisao registrada no calendario v3
 * — saidas desde a aula 1, para nao ficarem isoladas no fim, que e onde elas
 * costumam ser negligenciadas.
 */
export function gerarPlano({
  progresso,
  totalAulas = 10,
  minutosPorAula = MINUTOS_POR_AULA,
  minutosReservados = MINUTOS_RESERVADOS,
  moduloDeSaidas = 'mod-saidas',
  dificuldades = SEM_DIFICULDADE,
}: {
  progresso: ProgressoDeItem[]
  totalAulas?: number
  minutosPorAula?: number
  minutosReservados?: number
  moduloDeSaidas?: string
  dificuldades?: DificuldadePorItem
}): PlanoDeAulas {
  const custoDe = new Map(
    progresso.map((p) => [p.item.id, custoEmMinutos(p.pontuacao, false, dificuldades.get(p.item.id))]),
  )

  /**
   * A aula 1 nao reserva minutos para repescagem: nao existe aula anterior,
   * logo nao existe correcao pendente. Reservar ali seria jogar tempo fora com
   * certeza, nao por precaucao.
   */
  const orcamentoDa = (n: number) => minutosPorAula - (n === 1 ? 0 : minutosReservados)

  const saidas: TechniqueItem[] = []
  const guardasPorPosicao = new Map<string, TechniqueItem[]>()
  for (const p of progresso) {
    if (p.item.moduloId === moduloDeSaidas) {
      saidas.push(p.item)
      continue
    }
    const lista = guardasPorPosicao.get(p.item.posicao)
    if (lista) lista.push(p.item)
    else guardasPorPosicao.set(p.item.posicao, [p.item])
  }

  const filaDeGuardas = sequenciaDeGuardas(guardasPorPosicao)
  const filaDeSaidas = [...saidas]

  const aulas: AulaPlanejada[] = []
  let iGuarda = 0
  let iSaida = 0

  for (let n = 1; n <= totalAulas; n++) {
    const itens: TechniqueItem[] = []
    const orcamento = orcamentoDa(n)
    let minutos = 0

    // Uma saida por aula, enquanto houver.
    if (iSaida < filaDeSaidas.length) {
      const item = filaDeSaidas[iSaida]
      const custo = custoDe.get(item.id) ?? MINUTOS_ITEM_CRU
      if (custo <= orcamento) {
        itens.push(item)
        minutos += custo
        iSaida += 1
      }
    }

    // Guardas ate o orcamento acabar.
    while (iGuarda < filaDeGuardas.length) {
      const item = filaDeGuardas[iGuarda]
      const custo = custoDe.get(item.id) ?? MINUTOS_ITEM_CRU
      if (minutos + custo > orcamento) break
      itens.push(item)
      minutos += custo
      iGuarda += 1
    }

    aulas.push({
      numero: n,
      itens,
      posicoes: [...new Set(itens.map((i) => i.posicao))],
      minutosEstimados: Math.round(minutos),
    })
  }

  const foraDoPlano = [...filaDeSaidas.slice(iSaida), ...filaDeGuardas.slice(iGuarda)]
  const minutosDeConteudo = progresso.reduce((s, p) => s + (custoDe.get(p.item.id) ?? 0), 0)

  return {
    aulas,
    foraDoPlano,
    minutosDeConteudo: Math.round(minutosDeConteudo),
    minutosDisponiveis: totalAulas * minutosPorAula,
  }
}

// ---------------------------------------------------------------------------
// Pauta de uma aula concreta
// ---------------------------------------------------------------------------

export interface LinhaDePauta {
  item: TechniqueItem
  minutos: number
  /** Item ja corrigido que voltou para ser mostrado de novo (decisao 2 e 3). */
  repescagem: boolean
  /** Numero da aula em que foi corrigido, quando for repescagem. */
  corrigidoNaAula?: number
}

/**
 * Itens que voltaram para a fila: o professor corrigiu e o aluno marcou que
 * ainda nao executa a versao nova.
 *
 * Chega pronto de quem tem acesso aos registros de validacao — este modulo nao
 * le nada, so organiza.
 */
export interface Repescagem {
  itemId: string
  corrigidoNaAula: number
}

/**
 * Deriva a fila de repescagem dos registros de validacao.
 *
 * Nao ha campo novo no schema para isso, de proposito: "o professor corrigiu e
 * eu ainda nao executo a versao nova" e exatamente o que
 * `novoStatus: 'aguardando_validacao'` vindo de uma aula ja significa. Inventar
 * um segundo lugar para guardar a mesma informacao seria criar a chance de os
 * dois discordarem.
 *
 * Vence o registro mais recente por item — o historico e append-only, entao um
 * item pode ter varias passagens, e so a ultima diz onde ele esta hoje.
 */
export function repescagensPendentes(validacoes: ValidacaoDoProfessor[]): Repescagem[] {
  const ultimaPorItem = new Map<string, ValidacaoDoProfessor>()
  for (const v of validacoes) {
    const atual = ultimaPorItem.get(v.itemId)
    if (!atual || v.registradaEm > atual.registradaEm) ultimaPorItem.set(v.itemId, v)
  }

  return [...ultimaPorItem.values()]
    .filter((v) => v.novoStatus === 'aguardando_validacao' && v.aulaNumero !== undefined)
    .map((v) => ({ itemId: v.itemId, corrigidoNaAula: v.aulaNumero as number }))
    .sort((a, b) => a.corrigidoNaAula - b.corrigidoNaAula)
}

/**
 * Pauta final da aula: repescagem no topo, depois o que o plano previu.
 *
 * O aviso de estouro existe porque a reserva de minutos e uma aposta: ela cobre
 * duas repescagens. Se acumularem cinco, a aula nao comporta, e e melhor a tela
 * dizer isso do que o aluno descobrir no tatame.
 */
export function pautaDaAula({
  aula,
  repescagens,
  progresso,
  minutosPorAula = MINUTOS_POR_AULA,
  dificuldades = SEM_DIFICULDADE,
}: {
  aula: AulaPlanejada
  repescagens: Repescagem[]
  progresso: ProgressoDeItem[]
  minutosPorAula?: number
  dificuldades?: DificuldadePorItem
}): { linhas: LinhaDePauta[]; minutos: number; estourou: boolean } {
  const porId = new Map(progresso.map((p) => [p.item.id, p]))

  const linhasDeRepescagem: LinhaDePauta[] = repescagens.flatMap((r) => {
    const p = porId.get(r.itemId)
    if (!p) return []
    return [
      {
        item: p.item,
        minutos: custoEmMinutos(p.pontuacao, true, dificuldades.get(r.itemId)),
        repescagem: true,
        corrigidoNaAula: r.corrigidoNaAula,
      },
    ]
  })

  const planejadas: LinhaDePauta[] = aula.itens.map((item) => ({
    item,
    minutos: custoEmMinutos(porId.get(item.id)?.pontuacao ?? 0, false, dificuldades.get(item.id)),
    repescagem: false,
  }))

  const linhas = [...linhasDeRepescagem, ...planejadas]
  const minutos = Math.round(linhas.reduce((s, l) => s + l.minutos, 0))

  return { linhas, minutos, estourou: minutos > minutosPorAula }
}

// ---------------------------------------------------------------------------
// Saldo do pacote
// ---------------------------------------------------------------------------

/**
 * Onde o pacote esta. Serve para a tela dizer a verdade desconfortavel quando
 * ela existe: se sobram 3 aulas e 40 itens sem validacao, nenhuma priorizacao
 * resolve — a escolha passa a ser sobre o que fica de fora.
 */
export function saldoDoPacote(
  aulas: AulaParticular[],
  progresso: ProgressoDeItem[],
  minutosPorAula = MINUTOS_POR_AULA,
  dificuldades: DificuldadePorItem = SEM_DIFICULDADE,
): {
  realizadas: number
  restantes: number
  naoValidados: number
  minutosRestantes: number
  minutosNecessarios: number
  /** Minutos que faltam para validar tudo. Zero quando o pacote da conta. */
  deficit: number
} {
  const realizadas = aulas.filter((a) => a.realizadaEm).length
  const restantes = Math.max(0, aulas.length - realizadas)
  const pendentes = progresso.filter((p) => !p.validado)
  const minutosNecessarios = Math.round(
    pendentes.reduce((s, p) => s + custoEmMinutos(p.pontuacao, false, dificuldades.get(p.item.id)), 0),
  )
  const minutosRestantes = restantes * minutosPorAula

  return {
    realizadas,
    restantes,
    naoValidados: pendentes.length,
    minutosRestantes,
    minutosNecessarios,
    deficit: Math.max(0, minutosNecessarios - minutosRestantes),
  }
}

/**
 * Aulas particulares — RF-07.
 *
 * Pacote de 10 aulas de 60 minutos com o Prof. Joao Eduardo, cobrindo as Secoes
 * 4 e 5 (56 itens ativos: 48 guardas, 8 saidas). Cinco itens por aula cobrem 50;
 * os 6 restantes vao para os auloes de revisao da turma.
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
 * pacote tem 600 — nao cabe. Basta dominio medio de 0,18 para caber, o que e
 * pouco, mas nao e zero. Ou seja, o pacote so cobre a prova SE o aluno chegar
 * tendo estudado antes. As tercas, quintas e sextas nao sao complemento das
 * aulas: sao o que torna as aulas suficientes.
 *
 * Modulo puro: sem React, sem I/O.
 */

import { dividirEmPartes, paresDoCirculo, tamanhosEquilibrados } from '../domain/circulo'
import type { AulaParticular, Dificuldade, TechniqueItem, ValidacaoDoProfessor } from '../domain/types'
import type { ProgressoDeItem } from './progresso'

/**
 * Duracao de uma aula do pacote.
 *
 * 60 minutos, negociado com o professor justamente para o pacote cobrir os 56
 * itens. Com 50 nao cabia: ver o comentario de COBERTURA TOTAL abaixo.
 */
export const MINUTOS_POR_AULA = 60

/**
 * DISTRIBUICAO POR QUANTIDADE, nao por tempo — decisao do aluno.
 *
 * O raciocinio dele: "algumas coisas serao mais rapidas que as outras, entao nao
 * se importe com o tempo e sim com a quantidade distribuida". E uma correcao
 * legitima da minha modelagem: eu estimava 12 minutos por item cru para TODO
 * item, e uma raspagem de tesoura e um berimbolo nao custam o mesmo. Um numero
 * medio aplicado item a item errava nos dois extremos.
 *
 * Consequencia: as 10 aulas cobrem os 56 itens, distribuidos o mais igualmente
 * possivel — 56/10 = 5,6, logo seis aulas de 6 e quatro de 5. Nada e cortado do
 * pacote, e os auloes deixam de receber item novo.
 *
 * As estimativas de minuto continuam existindo (`custoEmMinutos`), agora como
 * INFORMACAO e nao como limite: servem para o aluno saber que uma aula vai ser
 * apertada, nao para o app decidir o que entra nela.
 */
export const AULOES = 2

/**
 * Minutos guardados em cada aula para repescagem (decisao 3). Dois itens ja
 * corrigidos cabem aqui sem tirar nada do plano.
 *
 * Com o plano preenchido por contagem, isto nao limita mais a geracao — serve de
 * folga esperada ao avaliar se a pauta do dia estourou.
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
   * Itens que nao couberam nas aulas particulares. NAO sao itens perdidos: e a
   * entrada dos auloes de revisao (ver `auloesDoPacote`).
   */
  foraDoPlano: TechniqueItem[]
  minutosDeConteudo: number
  minutosDisponiveis: number
}

/**
 * SEM CHAMADOR HOJE, e mantida de proposito. Com a distribuicao por quantidade,
 * as 10 aulas cobrem os 56 itens e nao existe corte — entao ninguem chama isto.
 * Fica porque a politica que ela encerra e boa e a regra de distribuicao mudou
 * quatro vezes nesta fase do projeto: se o pacote voltar a nao cobrir tudo (menos
 * aulas, ou curriculo maior), este e o critério a usar. `tamanhosEquilibrados` ja
 * foi apagada por "parecer sem uso" e precisou voltar duas etapas depois.
 *
 * Escolhe o que NAO cabe nas aulas particulares, tirando PROFUNDIDADE em vez de
 * LARGURA: nenhuma posicao fica de fora inteira, e o que sai e o excedente das
 * posicoes com mais itens.
 *
 * A regra anterior mandava uma posicao inteira para o fim da fila (era o
 * Complexo Moderno), e isso misturava duas punicoes diferentes na mesma
 * decisao: perder o espacamento do circulo E ser o primeiro a cair. Quando o
 * professor confirmou que o Complexo Moderno faz parte da prova, ficou claro que
 * as duas coisas precisavam ser separadas — o aluno pediu o conteudo de volta
 * para as particulares, e o corte teve de achar outro critério.
 *
 * O critério: enquanto sobrar item, tira o ULTIMO da posicao que tem MAIS itens.
 * A Guarda Fechada tem 11 itens e a prova exige 2 raspadas dela; a 11a tecnica
 * de Guarda Fechada rende menos numa aula individual do que a unica tecnica de
 * uma posicao pequena. Empate resolve pela ordem de entrada, para o plano ser
 * estavel entre execucoes.
 */
export function escolherExcedente(
  porPosicao: Map<string, TechniqueItem[]>,
  quantos: number,
): Set<string> {
  if (quantos <= 0) return new Set()

  const restantes = new Map([...porPosicao].map(([pos, itens]) => [pos, [...itens]]))
  const ordemDeEntrada = [...porPosicao.keys()]
  const excedente = new Set<string>()

  for (let i = 0; i < quantos; i++) {
    let escolhida: string | undefined
    let maior = 0
    for (const pos of ordemDeEntrada) {
      const n = restantes.get(pos)?.length ?? 0
      if (n > maior) {
        maior = n
        escolhida = pos
      }
    }
    if (!escolhida || maior === 0) break
    const item = restantes.get(escolhida)!.pop()
    if (item) excedente.add(item.id)
  }

  return excedente
}

/**
 * Sequencia das guardas em ordem de circulo — TODAS as posicoes participam.
 *
 * Nenhuma posicao e mais excluida do circulo: o espacamento entre as duas
 * passagens de uma posicao vale igual para conteudo basico e avancado. Quem
 * decide o corte agora e `escolherExcedente`, antes de a fila ser montada.
 */
function sequenciaDeGuardas(porPosicao: Map<string, TechniqueItem[]>): TechniqueItem[] {
  const posicoes = [...porPosicao.keys()]
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

  return sequencia
}

/**
 * Gera a proposta de plano para o pacote.
 *
 * Estrutura de cada aula: uma saida primeiro, depois guardas ate fechar a cota
 * da aula. A saida vem primeiro por decisao registrada no calendario v3
 * — saidas desde a aula 1, para nao ficarem isoladas no fim, que e onde elas
 * costumam ser negligenciadas.
 *
 * Distribui TODOS os itens ativos pelas aulas, o mais igualmente possivel em
 * QUANTIDADE. O tempo nao participa da decisao: e a escolha do aluno, e a razao
 * dela e boa — o custo real varia demais entre uma raspada simples e um
 * berimbolo para um numero medio por item valer como limite.
 */
export function gerarPlano({
  progresso,
  totalAulas = 10,
  minutosPorAula = MINUTOS_POR_AULA,
  moduloDeSaidas = 'mod-saidas',
  dificuldades = SEM_DIFICULDADE,
}: {
  progresso: ProgressoDeItem[]
  totalAulas?: number
  minutosPorAula?: number
  moduloDeSaidas?: string
  dificuldades?: DificuldadePorItem
}): PlanoDeAulas {
  const custoDe = new Map(
    progresso.map((p) => [p.item.id, custoEmMinutos(p.pontuacao, false, dificuldades.get(p.item.id))]),
  )

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

  /**
   * Quantos itens cada aula recebe para TODOS serem cobertos, o mais igualmente
   * possivel. 56 em 10 nao divide exato, entao saem seis aulas de 6 e quatro
   * de 5.
   */
  const tamanhos = tamanhosEquilibrados(filaDeSaidas.length + filaDeGuardas.length, totalAulas)

  const aulas: AulaPlanejada[] = []
  let iGuarda = 0
  let iSaida = 0

  for (let n = 1; n <= totalAulas; n++) {
    const itens: TechniqueItem[] = []
    const alvo = tamanhos[n - 1] ?? 0

    // Uma saida por aula, enquanto houver. Quando as saidas acabam (sao 8 para
    // 10 aulas), a vaga vira mais uma guarda em vez de sobrar vazia.
    if (alvo > 0 && iSaida < filaDeSaidas.length) {
      itens.push(filaDeSaidas[iSaida])
      iSaida += 1
    }

    // Guardas ate fechar a cota da aula.
    while (itens.length < alvo && iGuarda < filaDeGuardas.length) {
      itens.push(filaDeGuardas[iGuarda])
      iGuarda += 1
    }

    const minutos = itens.reduce((s, i) => s + (custoDe.get(i.id) ?? MINUTOS_ITEM_CRU), 0)

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

/** Um aulao de revisao da turma. */
export interface AulaoPlanejado {
  numero: number
  /**
   * Itens que nao passaram por aula particular e precisam ser cobertos aqui.
   * Deterministico: sai da sobra do plano.
   */
  itens: TechniqueItem[]
  /**
   * Itens que passaram por aula particular mas o aluno ainda nao domina. Nao e
   * calculado com antecedencia porque depende de onde ele estiver no dia — a
   * tela resolve isso na hora.
   */
  reforco: TechniqueItem[]
}

/**
 * Distribui entre os auloes o que nao cabe nas aulas particulares.
 *
 * Reaproveita `tamanhosEquilibrados`: 6 itens em 2 auloes dao 3 e 3. Os auloes
 * mais cheios ficariam no fim pela regra padrao, mas com dois dias iguais em
 * duracao isso nao tem efeito pratico — o que importa e a divisao parelha.
 */
export function auloesDoPacote({
  foraDoPlano,
  progresso,
  quantidade = AULOES,
  dominioMinimo = 0.7,
}: {
  foraDoPlano: TechniqueItem[]
  /** Para achar o que passou pela aula mas ficou fraco. */
  progresso?: ProgressoDeItem[]
  quantidade?: number
  /** Abaixo disto o item conta como "nao peguei 100%". */
  dominioMinimo?: number
}): AulaoPlanejado[] {
  if (quantidade <= 0) return []

  const idsFora = new Set(foraDoPlano.map((i) => i.id))
  const partes = dividirEmPartes(foraDoPlano, quantidade)

  /**
   * Itens fracos que JA passaram por aula particular. Ficam separados dos de
   * cima porque a natureza e diferente: um nunca foi visto com o professor, o
   * outro foi visto e nao fixou.
   *
   * `dominio !== 'nao_iniciado'` e o que faz a distincao valer. Sem isso, com o
   * curriculo ainda intocado TODOS os 50 itens da aula particular entram como
   * reforco — verdade trivial e inutil, que enche a tela e faz o aluno parar de
   * ler a lista. Item que ninguem estudou nao "deixou de fixar".
   */
  const fracos = (progresso ?? [])
    .filter(
      (p) =>
        !idsFora.has(p.item.id) && p.dominio !== 'nao_iniciado' && p.pontuacao < dominioMinimo,
    )
    .map((p) => p.item)
  const reforcos = dividirEmPartes(fracos, quantidade)

  return Array.from({ length: quantidade }, (_, i) => ({
    numero: i + 1,
    itens: partes[i] ?? [],
    reforco: reforcos[i] ?? [],
  }))
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

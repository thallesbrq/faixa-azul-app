/**
 * Modelo de dominio — Faixa Azul.
 *
 * Regra arquitetural (spec 13): este arquivo NAO importa React nem nada de UI.
 * Baseado no spec 9, reduzido ao escopo decidido no planejamento.
 */

// ---------------------------------------------------------------------------
// Validacao — o professor e a fonte de verdade (spec 4.1, ADR-002)
// ---------------------------------------------------------------------------

/**
 * `sugestao_nao_validada` e o estado da maioria do conteudo atual: os passo a
 * passo foram redigidos como sugestao padrao de faixa azul e ainda nao passaram
 * pelo Prof. Joao Eduardo. A UI deve sempre sinalizar isso.
 */
export type ValidationStatus =
  | 'sugestao_nao_validada'
  | 'aguardando_validacao'
  | 'validado_pelo_professor'
  | 'variante_pessoal'
  | 'descartado'

/**
 * Bilateralidade fica no schema mas nasce desligada: o spec 2.2 lista o
 * critetio de lados como NAO confirmado pelo professor (ADR-006 revisado).
 */
export type SideMode = 'nao_se_aplica' | 'direito_esquerdo' | 'ambos_exigidos' | 'definido_pelo_professor'

export type Side = 'direito' | 'esquerdo' | 'unico'

/** Nivel de risco fisico — governa avisos de supervisao (spec RNF-06, ADR-008) */
export type SafetyLevel = 'baixo' | 'medio' | 'alto'

/** Classificacao tecnica usada nos selos e nos cartoes de classificacao. */
/**
 * Dificuldade percebida PELO ALUNO — julgamento subjetivo dele, nao medida.
 *
 * Existe separada do dominio de proposito, e a distincao importa: `dominio` e
 * medido pelo desempenho real nas revisoes, enquanto isto e auto-relato. Por
 * isso a dificuldade alimenta o PLANEJAMENTO (quanto tempo de aula um item vai
 * custar), e nunca o agendamento das revisoes — ali quem decide e o acerto
 * observado, nao a opiniao do aluno sobre si mesmo.
 *
 * A vantagem pratica: o aluno pode preencher isso hoje, antes de estudar, e
 * melhorar a estimativa das 10 aulas de imediato.
 */
export type Dificuldade = 'facil' | 'medio' | 'dificil'

export type TechniqueKind =
  | 'raspagem'
  | 'passagem'
  | 'finalizacao'
  | 'costas'
  | 'saida'
  | 'defesa'
  | 'movimentacao'
  | 'queda'
  | 'defesa_pessoal'

// ---------------------------------------------------------------------------
// Curriculo
// ---------------------------------------------------------------------------

export interface Modulo {
  id: string
  nome: string
  ordem: number
  /** Secao correspondente no PDF da prova, quando aplicavel. */
  secaoProva?: string
}

export interface TechniqueItem {
  id: string
  moduloId: string
  /** Posicao/familia (ex.: "Guarda Fechada"). */
  posicao: string
  /** Slot exigido pela prova (ex.: "Raspada 1"). */
  slot: string
  /** Agrupamento da prova (ex.: "Raspadas", "Passagens", "Finalizacoes"). */
  categoria: string
  /** Nome da variacao (ex.: "Raspagem de tesoura"). Pode estar vazio se nao validado. */
  nome: string
  aliases: string[]
  /**
   * Tipo da tecnica. OBRIGATORIO: todos os 81 itens importados tem, e o app
   * depende dele para o papel (atacando/passando/defendendo) e para a etiqueta
   * nos documentos. Era opcional por frouxidao do import, e o tipo mais frouxo
   * que os dados custava tratamento de `undefined` em cinco lugares onde ele
   * nunca acontece. Ha teste no seed garantindo que continue verdade.
   */
  kind: TechniqueKind
  sideMode: SideMode
  safetyLevel: SafetyLevel
  validationStatus: ValidationStatus
  /** Origem no PDF — nunca afirmar que o PDF detalha o que ele so menciona. */
  sourceReference: string
  ativo: boolean
}

export interface TechniqueContent {
  itemId: string
  /** Passo a passo. Vazio para itens de alto risco sem instrucao textual (ADR-012). */
  passos: string[]
  /** Busca curada no YouTube. */
  busca?: string
  /**
   * Campos que o app NAO preenche por conta propria: viram perguntas ao
   * professor (decisao do planejamento). Vazio => gera item na lista de duvidas.
   */
  gatilho?: string
  errosComuns: string[]
  reacoes: string[]
  notasSeguranca: string[]
  notaDoProfessor?: string
}

/** Quantidade exigida pela prova para um grupo (ex.: "2 raspadas"). */
export interface RequisitoProva {
  posicao: string
  categoria: string
  quantidade: number
  /** O numero vem do documento, nao de confirmacao do professor. */
  validationStatus: ValidationStatus
}

// ---------------------------------------------------------------------------
// Cartoes e revisao
// ---------------------------------------------------------------------------

/**
 * Somente os 5 tipos deriaveis dos dados atuais. Os tipos `erro_comum`,
 * `aplicacao` (gatilho) e `reacao` do spec 11 ficam de fora ate o professor
 * fornecer o conteudo — a lacuna virou pergunta a ele.
 */
export type CardType =
  | 'sequencia' // ordenar os passos
  | 'explicacao' // recordacao livre / oral: explique a tecnica
  | 'classificacao' // isto e raspagem, passagem ou finalizacao?
  | 'requisito' // quantas raspadas a prova exige nesta guarda?
  | 'teoria' // valores, historia, pontuacao, juramento

export interface Card {
  id: string
  /** Ausente em cartoes de teoria, que nao pertencem a uma tecnica. */
  itemId?: string
  type: CardType
  prompt: string
  /** Resposta de referencia, ja segmentada quando fizer sentido. */
  resposta: string[]
  dica?: string
  validationStatus: ValidationStatus
  ativo: boolean
}

export type Rating = 'again' | 'hard' | 'good' | 'easy'

/** Estado atual de agendamento de um cartao (derivado dos eventos). */
export interface ReviewState {
  cardId: string
  side: Side
  /** ISO 8601 em UTC (spec 13: armazenar UTC, exibir no fuso do usuario). */
  dueAt: string
  ultimoIntervaloDias: number
  acertosConsecutivos: number
  lapses: number
  repeticoes: number
  ultimaRevisaoAt?: string
}

/** Append-only (ADR-010): cada tentativa gera um evento imutavel. */
export interface ReviewEvent {
  id: string
  cardId: string
  side: Side
  rating: Rating
  usouDica: boolean
  tempoRespostaMs?: number
  createdAt: string
  nota?: string
}

// ---------------------------------------------------------------------------
// Duvidas para o professor (RF-07) — o canal das 10 aulas
// ---------------------------------------------------------------------------

export type TipoDuvida =
  | 'nomenclatura'
  | 'execucao'
  | 'quantidade'
  | 'pontuacao'
  | 'criterio_de_prova'
  | 'bilateralidade'

export interface TeacherQuestion {
  id: string
  /** Ausente para duvidas gerais (ex.: pontuacao adotada pela academia). */
  itemId?: string
  tipo: TipoDuvida
  pergunta: string
  status: 'aberta' | 'levada_a_aula' | 'respondida'
  resposta?: string
  /** Em qual das 10 aulas foi respondida. */
  respondidaNaAulaNumero?: number
  respondidaAt?: string
  /** Perguntas semeadas a partir do spec 2.2 nascem com esta marca. */
  origem: 'spec' | 'lacuna_de_conteudo' | 'aluno'
}

// ---------------------------------------------------------------------------
// 10 aulas particulares — motor de validacao (decisao do planejamento)
// ---------------------------------------------------------------------------

export interface AulaParticular {
  numero: number
  tema: string
  foco: string
  /** Itens do curriculo a cobrir nesta aula. */
  itemIds: string[]
  /** Data realizada; ausente = ainda nao aconteceu. */
  realizadaEm?: string
  notas?: string
}

/**
 * De onde veio a correcao do professor.
 *
 * As 10 aulas particulares cobrem as Secoes 4 e 5 (guardas e saidas). Os 25
 * itens de Fundamentos, Defesa Pessoal e Quedas ficam fora delas por decisao:
 * o canal deles e a aula regular de segunda e quarta. Sem esta distincao o
 * modelo nao teria como registrar a validacao desses 25 itens — em especial os
 * 11 de Defesa Pessoal, que nao tem passo a passo no app (ADR-012) e portanto
 * dependem inteiramente do professor.
 */
export type OrigemValidacao = 'aula_particular' | 'aula_regular'

/**
 * Registro append-only de uma correcao ou confirmacao do professor. E a UNICA
 * forma de um item chegar a `validado_pelo_professor`.
 */
export interface ValidacaoDoProfessor {
  id: string
  itemId: string
  /** O que o professor corrigiu ou confirmou, nas palavras dele. */
  texto: string
  novoStatus: ValidationStatus
  origem: OrigemValidacao
  /** Numero da aula (1-10) quando a origem e aula particular. */
  aulaNumero?: number
  /** Sessao de treino quando a origem e aula regular. */
  sessionId?: string
  registradaEm: string
}

// ---------------------------------------------------------------------------
// Registro de treino (RF-06)
// ---------------------------------------------------------------------------

export interface PracticeSession {
  id: string
  data: string
  parceiro?: string
  observacoes: PracticeObservation[]
  notaDoProfessor?: string
}

export interface PracticeObservation {
  itemId: string
  side: Side
  /** Resistencia combinada com o parceiro. */
  resistencia: 'sem' | 'leve' | 'media' | 'alta'
  resultado: 'nao_saiu' | 'saiu_com_ajuda' | 'saiu' | 'saiu_com_resistencia'
  repeticoes?: number
  /** Texto livre. O app nao interpreta nem diagnostica dor (RNF-05). */
  limitacao?: string
}

// ---------------------------------------------------------------------------
// Plano de exame
// ---------------------------------------------------------------------------

export interface ExamPlan {
  academia: string
  professor: string
  /**
   * Data-alvo. `provisoria: true` enquanto o professor nao marcar a prova —
   * a UI deve deixar isso explicito (decisao do planejamento).
   */
  dataAlvo: string
  provisoria: boolean
  criadoEm: string
}

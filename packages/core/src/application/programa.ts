/**
 * O PROGRAMA DA TURMA — as 80 aulas que o professor monta, mais a experimental.
 *
 * DIFERENTE DE `montagem.ts`, e a diferenca nao e de tamanho: `montagem` monta o
 * pacote de 10 AULAS PARTICULARES DE UM ALUNO, contratado; isto e o programa DA
 * TURMA, que vale para todo mundo que treina naquele horario. Um aluno pode ter
 * os dois — Floki tem — e eles nao se somam nem se substituem.
 *
 * ESTRUTURA, e cada numero tem origem:
 *
 *   aula 00        experimental. Defesa pessoal, presencial, antes do programa
 *   aulas 01-35    o 1o grau. 35 aulas e a regra de graduacao do professor
 *   aulas 36-80    2o, 3o e 4o grau. 45 aulas por grau, e o planner cobre um
 *
 * "35 + 45 = 80 no total" foi confirmado. Os 45 sao POR GRAU, entao o caminho
 * inteiro ate o 4o grau soma 170 aulas — e o planner NAO cobre isso, de
 * proposito: ele cobre o grau atual e o seguinte. Programar a aula 170 de alguem
 * que esta na aula 3 e trabalho jogado fora.
 *
 * AS PRIMEIRAS 25 VEM PRE-PREENCHIDAS, as dez ultimas do 1o grau ficam livres.
 * A sugestao existe para o professor ter de onde partir; as dez livres existem
 * porque revisao antes da graduacao e decisao dele, e um planner que preenche
 * tudo nao deixa espaco para o que ele viu na turma.
 *
 * REPETICAO E LIVRE. Um item pode aparecer em varias aulas — foi decidido
 * explicitamente, e e o oposto de `montagem.ts`, onde cada item tem um lugar so.
 * Aqui repetir e o METODO: rever a guarda fechada na aula 4 e na aula 12 fixa
 * mais do que ver tudo na aula 4 (ver `domain/circulo`).
 *
 * Modulo puro: sem React, sem I/O.
 */

import type { TechniqueItem } from '../domain/types'
import { paresDoCirculo, tamanhosEquilibrados } from '../domain/circulo'
import type { SecaoDoBolsao } from './bolsao'

/** A aula experimental. Numero 0 para nao competir com a aula 1 do programa. */
export const AULA_EXPERIMENTAL = 0

/** Aulas do 1o grau: a regra de graduacao do professor. */
export const AULAS_DO_1GRAU = 35

/** Aulas de cada grau seguinte (2o, 3o, 4o). O planner cobre UM. */
export const AULAS_DO_GRAU_SEGUINTE = 45

/** A ultima aula do planner. 35 + 45. */
export const ULTIMA_AULA = AULAS_DO_1GRAU + AULAS_DO_GRAU_SEGUINTE

/**
 * Ate onde a sugestao do 1o grau preenche.
 *
 * As dez restantes (26-35) ficam livres para revisao e para o que aparecer na
 * turma. Nao e sobra: e o espaco que o professor usa antes de graduar.
 */
export const AULAS_PRE_PREENCHIDAS = 25

/** Em que parte do programa uma aula esta. Decide o bolsao e o rotulo. */
export type BlocoDoPrograma = 'experimental' | '1grau' | 'seguintes'

export function blocoDaAula(numero: number): BlocoDoPrograma {
  if (numero === AULA_EXPERIMENTAL) return 'experimental'
  if (numero <= AULAS_DO_1GRAU) return '1grau'
  return 'seguintes'
}

export const ROTULO_DO_BLOCO: Record<BlocoDoPrograma, string> = {
  experimental: 'Aula experimental',
  '1grau': '1º grau',
  seguintes: '2º, 3º e 4º grau',
}

/**
 * Uma tecnica que o professor acrescentou A MAO, fora do bolsao.
 *
 * O "+" QUE ELE PEDIU, e o escopo dele e estreito de proposito: "somente um
 * rotulo dentro da aula, isso e para o caso o mestre queira acrescentar um item
 * pontual que por acaso nao esta no bolsao".
 *
 * O QUE ELE NAO FAZ, e cada uma dessas ausencias e uma decisao:
 * - NAO entra no bolsao (nao fica disponivel para outras aulas)
 * - NAO conta no gate do 1o grau (o gate sao os 29 itens, e so eles)
 * - NAO gera cartao (nao ha passo a passo, e inventar um seria inventar
 *   curriculo — o erro que `taxonomia.ts` registra)
 *
 * Ele e uma anotacao na aula. Se uma tecnica passar a ser recorrente, o lugar
 * dela e o seed, com o professor ditando o nome.
 */
export interface RotuloDaAula {
  id: string
  /**
   * De onde a tecnica sai: 'Guarda fechada', 'Montada', '100 kg lateral',
   * 'Norte-sul', 'Costas'. Vazio quando e avulsa (uma queda, por exemplo).
   */
  posicao: string
  /** 'passagem' | 'finalizacao' | 'saida' | 'escape' | 'queda' | 'avulsa'. */
  tipo: string
  /** O nome que o professor escreveu. */
  nome: string
}

/** As posicoes que o "+" oferece. Texto livre no dado, lista fechada na tela. */
export const POSICOES_DO_ROTULO = [
  'Guarda fechada',
  'Meia guarda',
  'Guarda aberta',
  'Montada',
  '100 kg lateral',
  'Norte-sul',
  'Costas',
] as const

/**
 * Os tipos que o "+" oferece.
 *
 * `queda` E `avulsa` ESTAO AQUI POR PEDIDO EXPLICITO — "inclua Queda nas
 * tecnicas avulsas". Elas nao saem de uma posicao: uma queda comeca de pe, e uma
 * avulsa e o que nao couber em nenhuma das outras.
 */
export const TIPOS_DO_ROTULO = [
  { id: 'passagem', nome: 'Passagem', precisaPosicao: true },
  { id: 'finalizacao', nome: 'Finalização', precisaPosicao: true },
  { id: 'saida', nome: 'Saída', precisaPosicao: true },
  { id: 'escape', nome: 'Escape', precisaPosicao: true },
  { id: 'raspagem', nome: 'Raspagem', precisaPosicao: true },
  { id: 'queda', nome: 'Queda', precisaPosicao: false },
  { id: 'avulsa', nome: 'Avulsa', precisaPosicao: false },
] as const

export function tipoPrecisaPosicao(tipo: string): boolean {
  return TIPOS_DO_ROTULO.find((t) => t.id === tipo)?.precisaPosicao ?? false
}

/** Como um rotulo aparece na aula: "Montada · Finalização · Gravata romana". */
export function descreverRotulo(r: RotuloDaAula): string {
  const nomeDoTipo = TIPOS_DO_ROTULO.find((t) => t.id === r.tipo)?.nome ?? r.tipo
  const partes = r.posicao.trim() === '' ? [nomeDoTipo] : [r.posicao, nomeDoTipo]
  return [...partes, r.nome].filter((p) => p.trim() !== '').join(' · ')
}

/** Uma aula do programa, como ela e guardada. */
export interface AulaDoPrograma {
  numero: number
  /** Ids de itens do curriculo. REPETICAO ENTRE AULAS E PERMITIDA. */
  itemIds: string[]
  /** As anotacoes pontuais do professor. */
  rotulos: RotuloDaAula[]
  /** Uma linha que o professor escreve sobre o foco da aula. */
  foco: string
  /**
   * O slot em que esta aula foi agendada: `'2026-09-08T0800'`. `''` sem data.
   *
   * MORA NA AULA E NAO NUMA COLECAO DE AGENDA, e a escolha garante de graca a
   * metade que importa da invariante: uma aula tem NO MAXIMO UMA data, porque o
   * campo e singular. O outro lado (um slot com no maximo uma aula) nao e
   * garantido pelo dado — duas abas poderiam reivindicar a mesma terca — e por
   * isso `agendaDoPrograma` desempata de forma ESTAVEL (menor numero ganha) em
   * vez de depender da ordem de leitura.
   *
   * A alternativa era `programas/{turma}/agenda/{slot}`, que garantiria o outro
   * lado pelo id do documento e deixaria ESTE em aberto. Uma colecao a mais,
   * regras a mais, e a mesma checagem no cliente — na direcao oposta.
   */
  slot: string
}

export function aulaVazia(numero: number): AulaDoPrograma {
  return { numero, itemIds: [], rotulos: [], foco: '', slot: '' }
}

/**
 * Agenda uma aula num slot, ou tira a data com `''`.
 *
 * NAO LIMPA O SLOT DE OUTRA AULA que estivesse ali. Quem chama tem a agenda
 * inteira em memoria e sabe qual aula desalojar; fazer isso aqui exigiria passar
 * todas as aulas para mudar uma, e a funcao deixaria de ser sobre uma aula.
 */
export function agendarAula(aula: AulaDoPrograma, slot: string): AulaDoPrograma {
  if (aula.slot === slot) return aula
  return { ...aula, slot }
}

/** Todos os numeros de aula do planner, do 0 ao 80. */
export function numerosDasAulas(): number[] {
  const n: number[] = []
  for (let i = AULA_EXPERIMENTAL; i <= ULTIMA_AULA; i++) n.push(i)
  return n
}

// ---------------------------------------------------------------------------
// A sugestao do 1o grau
// ---------------------------------------------------------------------------

/**
 * Distribui os 29 itens do 1o grau nas aulas 1 a 25.
 *
 * DUAS REGRAS, e a primeira e de SEGURANCA e nao de pedagogia:
 *
 * 1. EDUCATIVOS PRIMEIRO. O modulo `g1-educativos` e Ukemi, levantada tecnica,
 *    rolamentos e fuga de quadril — e `g1-quedas` e Double leg, Single leg e
 *    Osoto gari. A lista do professor traz Quedas ANTES de Educativos, e seguir
 *    a ordem dela ao pe da letra programaria `osoto gari` na aula 2 e `ukemi` na
 *    aula 20: projetar alguem no chao antes de ensina-lo a cair. Ukemi e
 *    aprender a cair, e vem antes de qualquer projecao.
 *
 * 2. DEPOIS, O METODO DO CIRCULO. Pratica intercalada com espacamento
 *    (`domain/circulo`, vindo do calendario v2): cada modulo aparece duas vezes,
 *    com as duas aparicoes o mais longe possivel uma da outra. Ver a guarda
 *    fechada inteira numa aula e nunca mais e pior do que ver metade na aula 4 e
 *    metade na aula 14 — a segunda passagem cai quando a memoria comecou a
 *    falhar, que e onde a recuperacao fixa mais.
 *
 * E SUGESTAO, E NAO PROGRAMA. O professor move tudo. O valor de vir preenchido e
 * ele partir de algo em vez de 35 caixas vazias; o valor de ser movivel e que a
 * turma real nunca segue o plano.
 */
export function sugestaoDo1Grau(itens: readonly TechniqueItem[]): Map<number, string[]> {
  const porModulo = new Map<string, TechniqueItem[]>()
  for (const i of itens) {
    const lista = porModulo.get(i.moduloId)
    if (lista) lista.push(i)
    else porModulo.set(i.moduloId, [i])
  }

  const plano = new Map<number, string[]>()
  const por = (aula: number, ids: string[]) => {
    const atual = plano.get(aula) ?? []
    plano.set(aula, [...atual, ...ids])
  }

  // --- 1. Educativos nas primeiras aulas, um por aula -----------------------
  const educativos = porModulo.get('g1-educativos') ?? []
  educativos.forEach((item, n) => por(n + 1, [item.id]))
  porModulo.delete('g1-educativos')

  /**
   * As aulas que sobram para o resto. Comeca depois dos educativos porque as
   * primeiras aulas de um faixa branca sao para aprender a cair e a levantar,
   * nao para acumular tecnica.
   */
  const primeira = educativos.length + 1
  const disponiveis: number[] = []
  for (let a = primeira; a <= AULAS_PRE_PREENCHIDAS; a++) disponiveis.push(a)

  // --- 2. Intercalar os modulos ao longo das aulas restantes ---------------
  const modulos = [...porModulo.entries()]
  if (modulos.length === 0 || disponiveis.length === 0) return plano

  /**
   * INTERCALA POR MODULO ANTES DE DISTRIBUIR, e esta e a correcao de um defeito
   * que so apareceu na tela.
   *
   * A primeira versao usava `paresDoCirculo(modulos.length)` direto: uma rodada
   * por par de modulos, uma aula por rodada. Com 5 modulos restantes isso da 5
   * rodadas — e os 25 itens cairam nas aulas 5 a 9, sete tecnicas na aula 6, e as
   * aulas 10 a 25 vazias. Ou seja: o metodo do espacamento produzindo o oposto de
   * espacamento, comprimido em cinco aulas seguidas. Nenhum teste pegou, porque
   * "o modulo aparece em mais de uma aula" continuava verdadeiro.
   *
   * O que funciona e uma passada em duas etapas:
   *
   * 1. RODIZIO ENTRE MODULOS produz uma sequencia em que itens vizinhos vem de
   *    modulos DIFERENTES — pratica intercalada. A ordem de visita dos modulos
   *    sai do circulo, para nao ser a ordem em que eles aparecem no seed.
   * 2. FATIAS EQUILIBRADAS espalham essa sequencia por TODAS as aulas
   *    disponiveis, 1 ou 2 itens por aula.
   *
   * O efeito somado: dois itens do mesmo modulo ficam a ~5 aulas de distancia, e
   * nenhuma aula recebe uma pilha. Uma aula com sete tecnicas nao e uma aula — e
   * uma lista.
   */
  const ordemDosModulos = (() => {
    // `paresDoCirculo` da a ordem de visita; interessa o primeiro de cada par,
    // que percorre todos os indices sem repetir a ordem do seed.
    const vistos = new Set<number>()
    const ordem: number[] = []
    for (const [a, b] of paresDoCirculo(modulos.length)) {
      for (const idx of [a, b]) {
        if (!vistos.has(idx)) {
          vistos.add(idx)
          ordem.push(idx)
        }
      }
    }
    // Rede de seguranca: se o circulo nao cobrir todos (n pequeno), completa.
    for (let i = 0; i < modulos.length; i++) if (!vistos.has(i)) ordem.push(i)
    return ordem
  })()

  const filas = ordemDosModulos.map((idx) => [...modulos[idx][1]])
  const sequencia: TechniqueItem[] = []
  let sobrou = true
  while (sobrou) {
    sobrou = false
    for (const fila of filas) {
      const item = fila.shift()
      if (item) {
        sequencia.push(item)
        sobrou = true
      }
    }
  }

  const fatias = tamanhosEquilibrados(sequencia.length, disponiveis.length)
  let cursor = 0
  fatias.forEach((quantos, i) => {
    if (quantos === 0) return
    const fatia = sequencia.slice(cursor, cursor + quantos)
    cursor += quantos
    por(
      disponiveis[i],
      fatia.map((item) => item.id),
    )
  })

  /**
   * REDE DE SEGURANCA: o que a distribuicao nao alcancou entra nas ultimas aulas
   * pre-preenchidas.
   *
   * Ela existe porque a distribuicao depende do numero de modulos e de aulas
   * disponiveis, e uma mudanca no seed (um modulo novo, um item a mais) pode
   * fazer sobrar item sem que nada quebre. E o gate do 1o grau sao OS 29 ITENS:
   * um item que nunca e programado e um item que o aluno nunca ve, e a graduacao
   * dele fica presa sem que a tela diga por que. Ha teste amarrando os 29.
   */
  const programados = new Set([...plano.values()].flat())
  const sobraram = itens.filter((i) => !programados.has(i.id))
  sobraram.forEach((item, n) => {
    const aula = disponiveis[disponiveis.length - 1 - (n % Math.min(3, disponiveis.length))]
    por(aula, [item.id])
  })

  return plano
}

// ---------------------------------------------------------------------------
// O estado que a tela desenha
// ---------------------------------------------------------------------------

/** Uma secao do bolsao, com o que dela ficou FORA de todas as aulas. */
export interface SecaoNoPlanner extends SecaoDoBolsao {
  fora: TechniqueItem[]
}

export interface AulaNoPlanner {
  numero: number
  bloco: BlocoDoPrograma
  itens: TechniqueItem[]
  rotulos: RotuloDaAula[]
  foco: string
  /** O slot agendado, ou `''`. */
  slot: string
  /** Ids guardados que nao existem mais no curriculo. A tela precisa avisar. */
  desconhecidos: string[]
}

export interface EstadoDoPlanner {
  turma: string
  aulas: AulaNoPlanner[]
  /**
   * O bolsao EM SECOES: os requisitos da prova primeiro, o catalogo depois.
   *
   * NAO ENCOLHE conforme os itens sao usados, e essa e a diferenca central em
   * relacao a `montagem.ts`. La o bolsao e um estoque: cada item tem um lugar so
   * e sai da lista quando e posto numa aula. Aqui repeticao e o metodo, entao o
   * bolsao e um CATALOGO — a guarda fechada continua disponivel depois de
   * programada na aula 4, porque ela vai voltar na aula 14.
   *
   * DUAS SECOES porque so o catalogo de azul nao bastava: os 29 requisitos do 1o
   * grau nao estavam no bolsao, e o professor nao conseguia programar nenhum
   * deles — ver `bolsaoEmSecoes`, que monta isto.
   */
  bolsao: SecaoNoPlanner[]
  /** Quantas aulas tem pelo menos um item ou rotulo. */
  aulasComConteudo: number
}

export function montarPlanner({
  turma,
  aulas,
  secoesDoBolsao = [],
  itensConhecidos,
}: {
  turma: string
  /** O que esta guardado. Aula ausente vira aula vazia. */
  aulas: readonly AulaDoPrograma[]
  /**
   * O que a tela OFERECE, ja em secoes — vem de `bolsaoEmSecoes`.
   *
   * OPCIONAL, e o padrao vazio serve a quem chama `montarPlanner` so para
   * resolver NOMES de item: `GradeDaTurma` e a tela `Programa` do app do aluno
   * nao desenham bolsao nenhum, e antes passavam os 81 itens de azul para serem
   * agrupados por bloco a cada render e o resultado jogado fora.
   */
  secoesDoBolsao?: readonly SecaoDoBolsao[]
  /**
   * TODOS os itens que podem ser referenciados, e nao so os do bolsao.
   *
   * Separado de `itensDoBolsao` porque as aulas do 1o grau referenciam os 29
   * itens de `ITENS_1GRAU`, que NAO estao no curriculo de azul: sao itens
   * proprios, com ids proprios (ADR-016). Com uma lista so, as 25 aulas
   * pre-preenchidas apareceriam inteiras como "item desconhecido" — o dado certo
   * exibido como erro.
   */
  itensConhecidos: readonly TechniqueItem[]
}): EstadoDoPlanner {
  const porId = new Map(itensConhecidos.map((i) => [i.id, i]))
  const guardadas = new Map(aulas.map((a) => [a.numero, a]))

  const noPlanner: AulaNoPlanner[] = numerosDasAulas().map((numero) => {
    const g = guardadas.get(numero) ?? aulaVazia(numero)
    const itens: TechniqueItem[] = []
    const desconhecidos: string[] = []
    for (const id of g.itemIds) {
      const item = porId.get(id)
      if (item) itens.push(item)
      else desconhecidos.push(id)
    }
    return {
      numero,
      bloco: blocoDaAula(numero),
      itens,
      rotulos: g.rotulos,
      foco: g.foco,
      slot: g.slot,
      desconhecidos,
    }
  })

  const usados = new Set(noPlanner.flatMap((a) => a.itens.map((i) => i.id)))

  /**
   * O QUE O PROFESSOR NAO PROGRAMOU, POR SECAO — e isto e a informacao mais util
   * da tela inteira para quem esta fechando um grau: a lista do que o aluno nunca
   * vai ter visto. Sem ela, "faltam 6 itens" e um numero sem endereco.
   *
   * POR SECAO E NAO UMA LISTA SO, e o numero antigo era sobre a coisa errada:
   * `itensForaDoPrograma` contava os 81 de azul menos os usados, e mostrava 57
   * para a RGI. Cinquenta e sete o que? A pergunta do professor e "falta algum
   * dos 29 do 1o grau?", e a resposta estava somada com o catalogo inteiro.
   */
  const bolsao: SecaoNoPlanner[] = secoesDoBolsao.map((s) => ({
    ...s,
    fora: s.grupos.flatMap((g) => g.itens).filter((i) => !usados.has(i.id)),
  }))

  return {
    turma,
    aulas: noPlanner,
    bolsao,
    aulasComConteudo: noPlanner.filter((a) => a.itens.length > 0 || a.rotulos.length > 0).length,
  }
}

// ---------------------------------------------------------------------------
// Edicoes
// ---------------------------------------------------------------------------

/**
 * Acrescenta um item a uma aula.
 *
 * NAO REMOVE DE OUTRAS AULAS, ao contrario de `montagem.atribuir` — repeticao
 * entre aulas e o metodo aqui. Mas nao duplica DENTRO da mesma aula: o mesmo
 * item duas vezes na aula 4 nao e espacamento, e um clique repetido.
 */
export function porItemNaAula(
  aula: AulaDoPrograma,
  itemId: string,
): AulaDoPrograma {
  if (aula.itemIds.includes(itemId)) return aula
  return { ...aula, itemIds: [...aula.itemIds, itemId] }
}

export function tirarItemDaAula(aula: AulaDoPrograma, itemId: string): AulaDoPrograma {
  return { ...aula, itemIds: aula.itemIds.filter((id) => id !== itemId) }
}

export function porRotulo(aula: AulaDoPrograma, rotulo: RotuloDaAula): AulaDoPrograma {
  return { ...aula, rotulos: [...aula.rotulos, rotulo] }
}

export function tirarRotulo(aula: AulaDoPrograma, id: string): AulaDoPrograma {
  return { ...aula, rotulos: aula.rotulos.filter((r) => r.id !== id) }
}

// ---------------------------------------------------------------------------
// O conteudo de uma aula, para quem NAO a montou
// ---------------------------------------------------------------------------

export interface ResumoDaAula {
  numero: number
  foco: string
  /** Nomes das tecnicas do curriculo programadas nesta aula. */
  tecnicas: string[]
  /** Os rotulos pontuais, ja descritos numa linha. */
  rotulos: string[]
  /** Ids guardados que nao existem mais — a tela avisa em vez de esconder. */
  desconhecidos: string[]
}

/**
 * O conteudo de cada aula, indexado pelo numero.
 *
 * POR QUE ISTO EXISTE, e o pedido foi literal: "e importante que o calendario da
 * turma que contem o conteudo dos treinos seja visualizado, pois a ideia e caso o
 * professor Joao nao for na aula um professor substituto pode ver".
 *
 * A Grade de Horario mostrava so `Aula 6`. Para quem MONTOU a aula, o numero
 * basta — ele lembra o que pos ali. Para um SUBSTITUTO, o numero nao diz nada: ele
 * chega na terca as 8h e precisa saber que tecnicas dar. Um numero sem conteudo e
 * a mesma informacao que uma caixa vazia.
 *
 * `nome || slot` PARA O NOME DA TECNICA: 25 dos 81 itens do curriculo de azul tem
 * `nome` vazio e so o `slot` preenchido (a posicao na prova, tipo "Raspada 1").
 * Mostrar o `nome` cru deixaria um quarto da grade com linhas em branco.
 */
export function resumoDasAulas(aulas: readonly AulaNoPlanner[]): Map<number, ResumoDaAula> {
  const porNumero = new Map<number, ResumoDaAula>()
  for (const a of aulas) {
    porNumero.set(a.numero, {
      numero: a.numero,
      foco: a.foco,
      tecnicas: a.itens.map((i) => i.nome || i.slot),
      rotulos: a.rotulos.map(descreverRotulo),
      desconhecidos: a.desconhecidos,
    })
  }
  return porNumero
}

/** A aula tem algo para um substituto ler? */
export function aulaTemConteudo(r: ResumoDaAula | undefined): boolean {
  if (!r) return false
  return r.tecnicas.length > 0 || r.rotulos.length > 0 || r.foco.trim() !== ''
}

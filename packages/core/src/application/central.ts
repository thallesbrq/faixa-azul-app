/**
 * O que a Central do Aluno mostra — calculado aqui, puro, sem rede e sem React.
 *
 * ESTE MODULO EXISTE PARA NAO HAVER DOIS CALCULOS. O app do aluno deriva
 * `itens -> baralho -> progresso` dentro do `useApp`; se a central repetisse
 * essa derivacao, os dois numeros divergiriam na primeira vez que um dos lados
 * mudasse. E divergir aqui e o pior caso possivel: o aluno ve 62% na tela dele,
 * o professor ve 58% na dele, e a conversa passa a ser sobre o app em vez de
 * sobre o jiu-jitsu (ADR-015, decisao 1).
 *
 * O CURRICULO ENTRA COMO PARAMETRO, e nao importado do seed. Dois motivos, e o
 * segundo e o que importa a longo prazo:
 * 1. mantem a camada limpa — `application` nunca importou `seed`;
 * 2. o curriculo de ROXA esta a caminho. Quando chegar, a central passa um seed
 *    diferente para as turmas avancadas, sem uma linha de reescrita aqui.
 *
 * AS COLUNAS SAO DERIVADAS DO CURRICULO ATIVO, e nao de uma constante. Hoje o
 * seed ativa Secoes 4 e 5 (56 de 81 itens), o que deixa quatro grupos com itens
 * e tres com zero. Uma coluna sempre vazia nao informa nada e ainda confunde:
 * o professor nao consegue distinguir "o aluno nao sabe" de "isso nao esta no
 * ar". Derivando, as colunas acompanham o que foi ativado — inclusive quando ele
 * ligar Quedas e Defesa Pessoal.
 */

import type { Card, RequisitoProva, TechniqueContent, TechniqueItem } from '../domain/types'
import type { GrupoTecnico } from '../domain/taxonomia'
import { grupoDoKind, ORDEM_GRUPO } from '../domain/taxonomia'
import { medeCurriculoDeAzul } from '../domain/turmas'
import { gerarBaralho } from '../domain/cards'
import { aplicarValidacoes } from '../domain/validacao'
import type { EstadoPersistido } from '../persistence/repositorio'
import {
  faixaDaPontuacao,
  gruposMaisFracos,
  progressoPorGrupoTecnico,
  progressoPorItem,
  progressoPorPosicao,
  prontidao,
} from './progresso'
import type { FaixaDeCor, ProgressoDeGrupo } from './progresso'
import { resumoDoAluno } from './torre'
import type { Situacao } from './torre'
import { situacaoDoAluno } from './torre'

/** O curriculo contra o qual um aluno e medido. Hoje o de azul; roxa vem depois. */
export interface Curriculo {
  itens: TechniqueItem[]
  conteudos: TechniqueContent[]
  requisitos: RequisitoProva[]
  cartoesTeoria: Card[]
}

/**
 * Grupos que tem pelo menos um item ATIVO — as colunas que valem hoje.
 *
 * Devolve na ordem de `ORDEM_GRUPO` e nao na ordem em que aparecem nos itens:
 * a ordem das colunas nao pode depender de como o seed foi escrito.
 */
export function gruposComItens(curriculo: Curriculo): GrupoTecnico[] {
  const presentes = new Set<GrupoTecnico>()
  for (const i of curriculo.itens) {
    if (i.ativo) presentes.add(grupoDoKind(i.kind))
  }
  return ORDEM_GRUPO.filter((g) => presentes.has(g))
}

/**
 * Por que uma celula mostra `—` em vez de um numero.
 *
 * DUAS AUSENCIAS DIFERENTES, e confundi-las e o defeito que este tipo existe
 * para impedir:
 * - `sem-dados`: a pessoa entrou mas nunca sincronizou. NAO SABEMOS.
 * - `turma-sem-curriculo`: RG2, intermediario/avancado. O curriculo de azul nao
 *   e meta dela, entao medir produziria vermelho para quem nao esta mal.
 *
 * Zero e uma terceira coisa, e essa tem numero: sincronizou e esta em zero.
 */
export type MotivoSemProgresso = 'sem-dados' | 'turma-sem-curriculo'

export interface LinhaDaCentral {
  uid: string
  nome: string
  turma: string
  /** `null` quando ha motivo para nao medir — ver `motivo`. */
  progresso: number | null
  motivo: MotivoSemProgresso | null
  /** Faixa de cor do progresso, ou `null` junto com ele. */
  faixa: FaixaDeCor | null
  /** Pontuacao por grupo tecnico. Mesma regra de `null` do progresso. */
  porGrupo: Partial<Record<GrupoTecnico, number>>
  /** Fracao do curriculo que o PROFESSOR confirmou. O eixo que so ele move. */
  validado: number | null
  /** Domina mas o professor nunca viu. A fila de trabalho dele. */
  aguardandoValidacao: number | null
  /**
   * Estes quatro valem para TODA turma, inclusive a que nao mede curriculo:
   * atividade e duvida nao dependem de qual e a prova.
   */
  diasSemEstudar: number | null
  duvidasAbertas: number
  aulasFeitas: number
  totalDeAulas: number
  /** `null` quando nunca sincronizou: nem "parado" nem "em dia" seria verdade. */
  situacao: Situacao | null
}

/**
 * A derivacao, em UM lugar.
 *
 * A MESMA ORDEM DO APP DO ALUNO: correcoes do professor primeiro
 * (`aplicarValidacoes`), baralho depois, progresso por ultimo. A linha da tabela
 * e a pagina de um aluno passam as duas por aqui — se cada uma derivasse por
 * conta propria, a tabela poderia dizer 62% e a pagina do mesmo aluno 58%, e
 * ninguem saberia qual acreditar.
 */
function derivarPorItem(estado: EstadoPersistido, curriculo: Curriculo, agora: Date) {
  const itens = aplicarValidacoes(curriculo.itens, estado.validacoes)
  const baralho = gerarBaralho({
    itens,
    conteudos: curriculo.conteudos,
    requisitos: curriculo.requisitos,
    cartoesTeoria: curriculo.cartoesTeoria,
  })
  return progressoPorItem(itens, baralho, estado.revisoes, agora)
}

/** Aluno cujo estado nunca chegou ao servidor. */
export function linhaSemDados(entrada: {
  uid: string
  nome: string
  turma: string
}): LinhaDaCentral {
  return {
    ...entrada,
    progresso: null,
    motivo: 'sem-dados',
    faixa: null,
    porGrupo: {},
    validado: null,
    aguardandoValidacao: null,
    diasSemEstudar: null,
    duvidasAbertas: 0,
    aulasFeitas: 0,
    totalDeAulas: 0,
    situacao: null,
  }
}

export function linhaDoAluno({
  uid,
  nome,
  turma,
  estado,
  curriculo,
  agora,
}: {
  uid: string
  nome: string
  turma: string
  estado: EstadoPersistido
  curriculo: Curriculo
  agora: Date
}): LinhaDaCentral {
  // O resumo ja resolve atividade, duvidas e aulas — e ja tem teste. As datas de
  // troca por arquivo nao se aplicam aqui (o dado veio da nuvem), entao valem
  // `agora`: nenhum campo desta tela as usa.
  const iso = agora.toISOString()
  const resumo = resumoDoAluno(estado, { importadoEm: iso, exportadoEm: iso, agora })

  const base = {
    uid,
    // O nome do CADASTRO manda, e nao o do perfil local. Quem renomeia a si
    // mesmo no aparelho nao renomeia a linha da central do professor.
    nome: nome.trim() === '' ? resumo.nome : nome,
    turma,
    diasSemEstudar: resumo.diasSemEstudar,
    duvidasAbertas: resumo.duvidasAbertas,
    aulasFeitas: resumo.aulasFeitas,
    totalDeAulas: resumo.totalDeAulas,
    situacao: situacaoDoAluno(resumo),
  }

  // Turma que nao mede o curriculo de azul: atividade sim, progresso nao.
  if (!medeCurriculoDeAzul(turma)) {
    return {
      ...base,
      progresso: null,
      motivo: 'turma-sem-curriculo',
      faixa: null,
      porGrupo: {},
      validado: null,
      aguardandoValidacao: null,
    }
  }

  const porItem = derivarPorItem(estado, curriculo, agora)
  const geral = prontidao(porItem)

  const porGrupo: Partial<Record<GrupoTecnico, number>> = {}
  for (const g of progressoPorGrupoTecnico(porItem)) {
    porGrupo[g.chave as GrupoTecnico] = g.pontuacao
  }

  return {
    ...base,
    progresso: geral.dominio,
    motivo: null,
    faixa: faixaDaPontuacao(geral.dominio),
    porGrupo,
    validado: geral.validado,
    aguardandoValidacao: geral.dominadoSemValidacao,
  }
}

// ---------------------------------------------------------------------------
// Detalhe de um aluno
// ---------------------------------------------------------------------------

/** Uma tecnica esperando o olho do professor. */
export interface ItemEsperando {
  itemId: string
  /** O que a prova cobra naquela vaga (ex.: "Raspada 1"). */
  slot: string
  /** O nome da variacao, quando existe. Pode estar vazio no curriculo. */
  nome: string
  posicao: string
}

export interface DetalheDoAluno {
  dominio: number
  validado: number
  /**
   * Tecnicas que o aluno recupera com seguranca e o professor nunca viu.
   *
   * NAO E UM NUMERO, E UMA LISTA, e a diferenca e o que a torna util: "7 itens
   * esperando" informa; "Raspada 1 da Guarda Aranha, Passagem 2 da Meia Guarda"
   * e a pauta da aula particular. O contador ja aparece na tabela — aqui o
   * professor precisa saber O QUE olhar.
   */
  esperando: ItemEsperando[]
  /** Por grupo tecnico: as mesmas colunas da tabela, agora com contagem. */
  porGrupo: ProgressoDeGrupo[]
  /** Por posicao do curriculo: as guardas, que na tabela nao cabiam. */
  porPosicao: ProgressoDeGrupo[]
  /** As tres posicoes mais fracas — de onde sai a proxima aula. */
  maisFracas: ProgressoDeGrupo[]
  /** Nenhuma revisao ainda: a tela precisa dizer isso em vez de mostrar zeros. */
  nadaAinda: boolean
}

export function detalheDoAluno({
  estado,
  curriculo,
  agora,
}: {
  estado: EstadoPersistido
  curriculo: Curriculo
  agora: Date
}): DetalheDoAluno {
  const porItem = derivarPorItem(estado, curriculo, agora)
  const geral = prontidao(porItem)
  const porPosicao = progressoPorPosicao(porItem)

  return {
    dominio: geral.dominio,
    validado: geral.validado,
    esperando: porItem
      .filter((p) => p.dominio === 'dominado' && !p.validado)
      .map((p) => ({
        itemId: p.item.id,
        slot: p.item.slot,
        nome: p.item.nome,
        posicao: p.item.posicao,
      })),
    porGrupo: progressoPorGrupoTecnico(porItem),
    porPosicao: [...porPosicao].sort((a, b) => b.pontuacao - a.pontuacao),
    maisFracas: gruposMaisFracos(porPosicao, 3),
    // "Nada ainda" e nenhuma pontuacao, e nao nenhum item dominado: com a
    // etiqueta estrita a tela diria "nada estudado" ao lado de barras com valor.
    nadaAinda: porItem.every((p) => p.pontuacao === 0),
  }
}

// ---------------------------------------------------------------------------
// Agregacao da turma
// ---------------------------------------------------------------------------

export interface MediaDaTurma {
  /** `null` quando nenhuma linha tem progresso medivel. */
  progresso: number | null
  faixa: FaixaDeCor | null
  /** Quantos alunos entraram na media. */
  considerados: number
  /** Quantos alunos existem na selecao. */
  total: number
  /** Por que os de fora ficaram de fora, para a tela poder dizer. */
  fora: Record<MotivoSemProgresso, number>
}

/**
 * Media dos alunos, contando so quem tem progresso medivel.
 *
 * QUEM NUNCA SINCRONIZOU FICA FORA (ADR-015, decisao 7). Conta-lo como zero
 * deixaria a media presa e, pior, INSTAVEL: no dia em que ele finalmente abrisse
 * o app com 55%, a media saltaria — e o professor atribuiria o salto ao ensino
 * dele, e nao a chegada de um dado que sempre existiu.
 *
 * MEDIA DOS ALUNOS, e nao dos itens de todos juntos. Cada aluno pesa igual: a
 * pergunta e "como vai a turma", e nao "quantas tecnicas a turma sabe somando
 * todo mundo" — nessa segunda, quem estuda mais mascara quem parou.
 *
 * `considerados` e `total` saem juntos de proposito. Uma media com denominador
 * escondido e a forma mais facil de mentir com um numero verdadeiro.
 */
export function mediaDaTurma(linhas: readonly LinhaDaCentral[]): MediaDaTurma {
  const fora: Record<MotivoSemProgresso, number> = {
    'sem-dados': 0,
    'turma-sem-curriculo': 0,
  }
  let soma = 0
  let considerados = 0

  for (const l of linhas) {
    if (l.progresso === null) {
      if (l.motivo) fora[l.motivo] += 1
      continue
    }
    soma += l.progresso
    considerados += 1
  }

  const progresso = considerados === 0 ? null : soma / considerados
  return {
    progresso,
    faixa: progresso === null ? null : faixaDaPontuacao(progresso),
    considerados,
    total: linhas.length,
    fora,
  }
}

export interface CartaoDaCentral {
  chave: string
  rotulo: string
  /** `null` quando nao ha base para calcular. A tela mostra `—`. */
  valor: number | null
  /** `fracao` desenha 0-100%; `contagem` desenha o numero cru. */
  formato: 'fracao' | 'contagem'
  faixa: FaixaDeCor | null
  /** Uma linha explicando o que o numero responde. */
  apoio: string
}

/**
 * Media de uma fracao entre as linhas que a tem.
 *
 * `null` quando nenhuma tem — que e diferente de zero, pelo mesmo motivo do
 * resto deste arquivo.
 */
function mediaDe(
  linhas: readonly LinhaDaCentral[],
  de: (l: LinhaDaCentral) => number | null | undefined,
): number | null {
  let soma = 0
  let n = 0
  for (const l of linhas) {
    const v = de(l)
    if (typeof v !== 'number') continue
    soma += v
    n += 1
  }
  return n === 0 ? null : soma / n
}

/**
 * Os seis cartoes do topo — ADR-015, decisao 8.
 *
 * TRES TECNICOS E TRES DE ACAO, e a divisao responde duas perguntas diferentes
 * na mesma varredura: "o que eu dou na proxima aula" e "quem esta me esperando".
 *
 * Os tres tecnicos sao MEDIA DA TURMA. No nivel do aluno eles diagnosticam; no
 * da turma eles sao pauta — se a RG1A esta com 30% em passagens e 70% em
 * raspagens, isso e o tema da semana, e nao um problema individual.
 *
 * Os cartoes tecnicos seguem os grupos que EXISTEM (`gruposComItens`): um cartao
 * "Quedas: —" ocuparia um sexto da area mais nobre da tela para dizer que o
 * modulo esta desativado.
 */
export function cartoesDaTurma(
  linhas: readonly LinhaDaCentral[],
  grupos: readonly GrupoTecnico[],
  rotuloDoGrupo: (g: GrupoTecnico) => string,
): CartaoDaCentral[] {
  const tecnicos = grupos.slice(0, 3).map((g): CartaoDaCentral => {
    const valor = mediaDe(linhas, (l) => l.porGrupo[g])
    return {
      chave: g,
      rotulo: rotuloDoGrupo(g),
      valor,
      formato: 'fracao',
      faixa: valor === null ? null : faixaDaPontuacao(valor),
      apoio: 'média da turma',
    }
  })

  const validado = mediaDe(linhas, (l) => l.validado)
  const aguardando = linhas.reduce((s, l) => s + (l.aguardandoValidacao ?? 0), 0)
  const parados = linhas.filter((l) => l.situacao !== null && l.situacao !== 'em-dia').length

  return [
    ...tecnicos,
    {
      chave: 'validado',
      rotulo: 'Validado por você',
      valor: validado,
      formato: 'fracao',
      faixa: validado === null ? null : faixaDaPontuacao(validado),
      apoio: 'o eixo que só você move',
    },
    {
      chave: 'aguardando',
      rotulo: 'Aguardando sua validação',
      valor: aguardando,
      formato: 'contagem',
      // Sem faixa de cor: e fila de trabalho, nao desempenho. Pintar de vermelho
      // transformaria "tem trabalho a fazer" em "esta ruim".
      faixa: null,
      apoio: 'o aluno recupera, você ainda não viu',
    },
    {
      chave: 'parados',
      rotulo: 'Parados há 7+ dias',
      valor: parados,
      formato: 'contagem',
      faixa: null,
      apoio: 'inclui quem nunca estudou',
    },
  ]
}

/**
 * Ordem das linhas: quem precisa de atencao primeiro.
 *
 * REAPROVEITA A REGRA DA TORRE em vez de ordenar por progresso. O comentario de
 * `ordenarPorAtencao` explica por que nao e alfabetica, e o mesmo argumento vale
 * aqui — com vinte alunos, ordenar por progresso esconde quem parou no meio da
 * tabela, e achar essa pessoa e a razao de a central existir.
 *
 * Quem nunca sincronizou vem PRIMEIRO: e o unico caso em que nao ha nem dado
 * para avaliar, e o mais provavel de ser um aluno que nunca conseguiu entrar.
 */
export function ordenarLinhas(linhas: readonly LinhaDaCentral[]): LinhaDaCentral[] {
  const peso = (l: LinhaDaCentral): number => {
    if (l.motivo === 'sem-dados') return 3
    if (l.situacao === 'nunca-estudou') return 2
    if (l.situacao === 'parado') return 1
    return 0
  }
  return [...linhas].sort((a, b) => {
    const pa = peso(a)
    const pb = peso(b)
    if (pa !== pb) return pb - pa
    // Dentro do mesmo peso: mais dias sem estudar primeiro.
    const da = a.diasSemEstudar ?? 0
    const db = b.diasSemEstudar ?? 0
    if (da !== db) return db - da
    return a.nome.localeCompare(b.nome, 'pt-BR')
  })
}

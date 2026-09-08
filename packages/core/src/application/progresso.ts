/**
 * Progresso — RF-05.
 *
 * O spec e explicito: "o progresso nao deve ser calculado apenas pela
 * quantidade de cartoes respondidos. O peso maior deve ser dado ao dominio
 * demonstrado e a recencia da recuperacao."
 *
 * Por isso o dominio vem da ESCADA de acertos consecutivos (que ja embute
 * dificuldade) e nao da contagem de respostas, e decai quando a ultima
 * recuperacao ficou velha em relacao ao intervalo agendado.
 *
 * DOIS EIXOS INDEPENDENTES, e isso e a parte que importa:
 * - `dominio`: o quanto o ALUNO recupera de memoria
 * - `validado`: se o PROFESSOR confirmou que a tecnica esta certa
 *
 * Recuperar com seguranca uma tecnica que o professor nunca viu nao e estar
 * pronto — pode ser decorar a versao errada. O spec 16 exige que tecnica nao
 * validada nunca apareca como "dominada oficialmente", e e por isso que estas
 * duas coisas nunca colapsam num numero so.
 *
 * Modulo puro: sem React, sem I/O, `agora` injetado.
 */

import type { Card, ReviewState, TechniqueItem } from '../domain/types'
import { grupoDoKind, ROTULO_GRUPO } from '../domain/taxonomia'

export type NivelDominio = 'nao_iniciado' | 'visto' | 'aprendendo' | 'dominado'

/** Acertos consecutivos a partir dos quais consideramos dominio. */
export const ACERTOS_PARA_DOMINIO = 3

/**
 * Quantas vezes o intervalo agendado pode ser excedido antes de a recuperacao
 * ser considerada velha. 2x significa: se o cartao devia voltar em 3 dias e ja
 * passaram mais de 6, o dominio recua um nivel.
 */
export const FATOR_DECAIMENTO = 2

const DIA_MS = 86_400_000

/** Nivel de dominio de um unico cartao, considerando recencia. */
export function dominioDoCartao(estado: ReviewState | undefined, agora: Date): NivelDominio {
  if (!estado || estado.repeticoes === 0) return 'nao_iniciado'

  let nivel: NivelDominio =
    estado.acertosConsecutivos >= ACERTOS_PARA_DOMINIO
      ? 'dominado'
      : estado.acertosConsecutivos > 0
        ? 'aprendendo'
        : 'visto'

  // Decaimento por recencia: recuperar hoje nao e o mesmo que ter recuperado
  // uma vez, ha muito tempo.
  if (estado.ultimaRevisaoAt && estado.ultimoIntervaloDias > 0) {
    const diasDesde = (agora.getTime() - new Date(estado.ultimaRevisaoAt).getTime()) / DIA_MS
    if (diasDesde > estado.ultimoIntervaloDias * FATOR_DECAIMENTO) {
      if (nivel === 'dominado') nivel = 'aprendendo'
      else if (nivel === 'aprendendo') nivel = 'visto'
    }
  }

  return nivel
}

const PESO: Record<NivelDominio, number> = {
  nao_iniciado: 0,
  visto: 0.34,
  aprendendo: 0.67,
  dominado: 1,
}

/**
 * Faixa de cor de uma pontuacao — ADR-015, decisao 4.
 *
 * OS LIMIARES SAO OS PROPRIOS PESOS, e nao numeros redondos escolhidos por
 * gosto. Como a pontuacao e a media dos pesos acima, ela tem pontos de
 * significado exatos: 0,34 e "tudo visto uma vez", 0,67 e "tudo aprendendo",
 * 1 e "tudo dominado".
 *
 * A referencia visual que originou a central cortava em 40% e 80%. Isso poria
 * a fronteira NO MEIO de um nivel: 38% ficaria vermelho embora "tudo visto" seja
 * 34%, e 79% ficaria amarelo embora ja esteja acima de "tudo aprendendo". A cor
 * na central discordaria da etiqueta que o app mostra ao mesmo aluno no mesmo
 * dia — dois vocabularios para a mesma coisa, que e o erro que `taxonomia.ts`
 * registra sobre inventar classificacao onde ja existe uma.
 *
 * DERIVADO E NAO COPIADO: se `PESO` mudar, os limiares acompanham. Ha teste
 * amarrando os dois, para a derivacao nao virar coincidencia.
 */
/**
 * O item e alcancavel por CARTAO? — o denominador de toda media de dominio.
 *
 * ESTE FILTRO NASCEU DE UM DEFEITO MEDIDO, e nao de uma preocupacao teorica. Ao
 * religar os 81 itens (ADR-017, decisao 7), os 11 de defesa pessoal voltaram ao
 * curriculo — e eles nao geram cartao nenhum:
 *
 *   - sem `passos`, o gerador nao produz `explicacao` nem `sequencia` (ADR-012)
 *   - `defesa_pessoal` nao esta em `KINDS_CLASSIFICAVEIS`, entao nem o cartao de
 *     classificacao aparece
 *   - o cartao de RECONHECIMENTO existe, mas e UM por modulo e nao tem `itemId`
 *
 * `progressoPorItem` da a um item sem cartao `pontuacao: 0`. Somados na media,
 * os 11 travavam o azul em 70/81 = 86,4% PARA SEMPRE: o aluno que dominasse tudo
 * o que o app tem para ensinar veria 86%, e a coluna "Defesa Pessoal" da central
 * mostraria 0% eterno. Zero indistinguivel de "nao mensuravel" e exatamente o
 * que o cabecalho de `application/central` alerta sobre coluna vazia.
 *
 * A saida e a mesma de `mediaDaTurma`: DECLARAR O DENOMINADOR em vez de fingir o
 * numerador. Quem nao tem cartao sai da media e e contado em `semCartoes`.
 *
 * O cartao de reconhecimento continua no baralho e continua sendo estudado — ele
 * so nao e atribuido a um item, porque cobre o modulo inteiro.
 */
export function medivelPorCartoes(p: ProgressoDeItem): boolean {
  return p.totalCartoes > 0
}

export type FaixaDeCor = 'baixa' | 'media' | 'alta'

export const LIMIAR_MEDIA = PESO.visto
export const LIMIAR_ALTA = PESO.aprendendo

export function faixaDaPontuacao(pontuacao: number): FaixaDeCor {
  if (pontuacao >= LIMIAR_ALTA) return 'alta'
  if (pontuacao >= LIMIAR_MEDIA) return 'media'
  return 'baixa'
}

export interface ProgressoDeItem {
  item: TechniqueItem
  /**
   * ETIQUETA estrita: o pior nivel entre os cartoes do item. Dominar a sequencia
   * mas nao conseguir explicar nao e dominar a tecnica.
   */
  dominio: NivelDominio
  /**
   * PONTUACAO continua (0 a 1): media dos cartoes do item.
   *
   * Existe separada da etiqueta por um motivo pratico descoberto testando com
   * dados reais: com a etiqueta estrita, responder 10 cartoes espalhados por
   * varias posicoes mostrava 0% de progresso, porque nenhum item tinha os tres
   * cartoes respondidos. A tela ficava correta e inutil ao mesmo tempo.
   *
   * Assim o avanco parcial aparece, mas nada e chamado de "dominado" antes da
   * hora — as duas coisas que o aluno precisa saber, sem uma esconder a outra.
   */
  pontuacao: number
  validado: boolean
  totalCartoes: number
}

export function progressoPorItem(
  itens: TechniqueItem[],
  cartoes: Card[],
  revisoes: ReviewState[],
  agora: Date,
): ProgressoDeItem[] {
  const estadoPorCartao = new Map(revisoes.map((r) => [r.cardId, r]))
  const cartoesPorItem = new Map<string, Card[]>()
  for (const c of cartoes) {
    if (!c.itemId) continue
    const lista = cartoesPorItem.get(c.itemId)
    if (lista) lista.push(c)
    else cartoesPorItem.set(c.itemId, [c])
  }

  const ordem: NivelDominio[] = ['nao_iniciado', 'visto', 'aprendendo', 'dominado']

  return itens
    .filter((i) => i.ativo)
    .map((item) => {
      const doItem = cartoesPorItem.get(item.id) ?? []

      // Etiqueta: o pior cartao define o item.
      let pior: NivelDominio = doItem.length === 0 ? 'nao_iniciado' : 'dominado'
      // Pontuacao: media dos cartoes, para o avanco parcial aparecer.
      let soma = 0
      for (const c of doItem) {
        const nivel = dominioDoCartao(estadoPorCartao.get(c.id), agora)
        if (ordem.indexOf(nivel) < ordem.indexOf(pior)) pior = nivel
        soma += PESO[nivel]
      }

      return {
        item,
        dominio: pior,
        pontuacao: doItem.length === 0 ? 0 : soma / doItem.length,
        validado: item.validationStatus === 'validado_pelo_professor',
        totalCartoes: doItem.length,
      }
    })
}

export interface ProgressoDeGrupo {
  chave: string
  rotulo: string
  total: number
  porNivel: Record<NivelDominio, number>
  /** 0 a 1, ponderado por nivel de dominio — nao por cartoes respondidos. */
  pontuacao: number
  /**
   * Quantos itens do grupo entraram em `pontuacao` — o denominador declarado.
   *
   * `medidos < total` quando ha item sem cartao (ver `medivelPorCartoes`), e
   * `medidos === 0` significa "grupo nao mensuravel por cartao" — a tela deve
   * mostrar `—`, e nao o zero que `pontuacao` carrega.
   */
  medidos: number
  /** Quantos itens do grupo o professor confirmou. */
  validados: number
}

function agrupar(
  progresso: ProgressoDeItem[],
  chaveDe: (p: ProgressoDeItem) => string,
  rotuloDe: (p: ProgressoDeItem) => string,
): ProgressoDeGrupo[] {
  const grupos = new Map<string, ProgressoDeItem[]>()
  for (const p of progresso) {
    const k = chaveDe(p)
    const lista = grupos.get(k)
    if (lista) lista.push(p)
    else grupos.set(k, [p])
  }

  return [...grupos.entries()].map(([chave, itens]) => {
    const porNivel: Record<NivelDominio, number> = {
      nao_iniciado: 0,
      visto: 0,
      aprendendo: 0,
      dominado: 0,
    }
    let soma = 0
    for (const p of itens) {
      porNivel[p.dominio] += 1
      if (!medivelPorCartoes(p)) continue
      // Soma a pontuacao continua, nao o peso da etiqueta: senao um item com
      // 2 de 3 cartoes dominados contaria como zero.
      soma += p.pontuacao
    }
    const medidos = itens.filter(medivelPorCartoes).length
    return {
      chave,
      rotulo: rotuloDe(itens[0]),
      total: itens.length,
      porNivel,
      // DIVIDE POR `medidos`, e nao por `total`: um grupo com 5 itens dos quais
      // 2 nao tem cartao nenhum ficaria eternamente preso em 60% com o aluno
      // dominando tudo o que ha para dominar.
      pontuacao: medidos === 0 ? 0 : soma / medidos,
      medidos,
      validados: itens.filter((p) => p.validado).length,
    }
  })
}

export function progressoPorModulo(progresso: ProgressoDeItem[], nomeDoModulo: (id: string) => string) {
  return agrupar(
    progresso,
    (p) => p.item.moduloId,
    (p) => nomeDoModulo(p.item.moduloId),
  )
}

/**
 * Progresso por grupo tecnico — as sete colunas da central (ADR-015, decisao 2).
 *
 * A chave e o `GrupoTecnico`, nao o rotulo: quem ordena as colunas e
 * `ORDEM_GRUPO`, e depender do texto para agrupar faria "Saídas e defesas"
 * virar chave, com acento, no id de um `<th>`.
 */
export function progressoPorGrupoTecnico(progresso: ProgressoDeItem[]) {
  return agrupar(
    progresso,
    (p) => grupoDoKind(p.item.kind),
    (p) => ROTULO_GRUPO[grupoDoKind(p.item.kind)],
  )
}

export function progressoPorPosicao(progresso: ProgressoDeItem[]) {
  return agrupar(
    progresso,
    (p) => p.item.posicao,
    (p) => p.item.posicao,
  )
}

export function progressoPorCategoria(progresso: ProgressoDeItem[]) {
  return agrupar(
    progresso,
    (p) => p.item.categoria,
    (p) => p.item.categoria,
  )
}

/**
 * Prontidao geral. Combina o dominio (o que o aluno recupera) com a validacao
 * (o que o professor confirmou) SEM misturar os dois num numero unico — o
 * segundo campo existe justamente para nao deixar o primeiro parecer suficiente.
 */
export function prontidao(progresso: ProgressoDeItem[]): {
  dominio: number
  validado: number
  /** Itens que o aluno domina mas o professor ainda nao viu. */
  dominadoSemValidacao: number
  /** Quantos itens entraram no `dominio` — o denominador declarado. */
  medidos: number
  /**
   * Itens do curriculo que NENHUM cartao alcanca. Hoje sao os 11 de defesa
   * pessoal. Ver `medivelPorCartoes`.
   */
  semCartoes: number
} {
  const vazio = {
    dominio: 0,
    validado: 0,
    dominadoSemValidacao: 0,
    medidos: 0,
    semCartoes: progresso.length,
  }
  if (progresso.length === 0) return { ...vazio, semCartoes: 0 }

  const medivel = progresso.filter(medivelPorCartoes)
  if (medivel.length === 0) return vazio

  const soma = medivel.reduce((s, p) => s + p.pontuacao, 0)
  return {
    dominio: soma / medivel.length,
    // VALIDACAO E SOBRE TODO O CURRICULO, e nao so sobre o que tem cartao: o
    // professor confirma o TEXTO do item, e um item sem passo a passo tambem
    // tem texto para conferir. Denominadores diferentes de proposito.
    validado: progresso.filter((p) => p.validado).length / progresso.length,
    dominadoSemValidacao: progresso.filter((p) => p.dominio === 'dominado' && !p.validado).length,
    medidos: medivel.length,
    semCartoes: progresso.length - medivel.length,
  }
}

/** Grupos mais fracos primeiro — alimenta "onde focar". */
export function gruposMaisFracos(grupos: ProgressoDeGrupo[], quantos = 3): ProgressoDeGrupo[] {
  return [...grupos].sort((a, b) => a.pontuacao - b.pontuacao).slice(0, quantos)
}

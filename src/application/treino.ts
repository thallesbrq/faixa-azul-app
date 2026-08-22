/**
 * Registro de treino — RF-06.
 *
 * As aulas de segunda e quarta na Rilion Gracie sao do mestre: o aluno nao
 * escolhe o conteudo, entao o app nao agenda nada nelas. O que ele faz e
 * REGISTRAR o que aconteceu, e isso serve a duas coisas que nenhuma outra tela
 * alcanca:
 *
 * 1. Canal de validacao em aula regular. O professor corrige guarda em aula
 *    normal, nao so na particular — e essa correcao vale igual (ver
 *    OrigemValidacao em domain/types.ts).
 *
 * 2. O TERCEIRO EIXO. `dominio` diz se o aluno lembra dos passos; `validado`
 *    diz se o professor aprovou a versao; nenhum dos dois diz se a tecnica
 *    FUNCIONA contra alguem resistindo. Um item pode estar dominado e validado
 *    e nunca ter sido tentado no rolamento — e esse e exatamente o caso que
 *    reprova numa banca.
 *
 * O modulo NAO interpreta limitacao fisica nem diagnostica dor (RNF-05): o
 * campo e texto livre que ele guarda e devolve, nada mais.
 *
 * Modulo puro: sem React, sem I/O, `agora` injetado.
 */

import type { PracticeObservation, PracticeSession, Side, TechniqueItem } from '../domain/types'

/** Ordem de exigencia dos resultados — usada para saber qual e o "melhor". */
const ORDEM_RESULTADO: PracticeObservation['resultado'][] = [
  'nao_saiu',
  'saiu_com_ajuda',
  'saiu',
  'saiu_com_resistencia',
]

const ORDEM_RESISTENCIA: PracticeObservation['resistencia'][] = ['sem', 'leve', 'media', 'alta']

export function criarSessao({
  id,
  agora,
  parceiro,
  observacoes = [],
  notaDoProfessor,
}: {
  id: string
  agora: Date
  parceiro?: string
  observacoes?: PracticeObservation[]
  notaDoProfessor?: string
}): PracticeSession {
  return {
    id,
    data: agora.toISOString(),
    parceiro: parceiro?.trim() || undefined,
    observacoes,
    notaDoProfessor: notaDoProfessor?.trim() || undefined,
  }
}

export function criarObservacao({
  itemId,
  side = 'unico',
  resistencia,
  resultado,
  repeticoes,
  limitacao,
}: {
  itemId: string
  side?: Side
  resistencia: PracticeObservation['resistencia']
  resultado: PracticeObservation['resultado']
  repeticoes?: number
  limitacao?: string
}): PracticeObservation {
  return {
    itemId,
    side,
    resistencia,
    resultado,
    repeticoes: repeticoes && repeticoes > 0 ? repeticoes : undefined,
    limitacao: limitacao?.trim() || undefined,
  }
}

// ---------------------------------------------------------------------------
// Leitura: o que o registro sabe sobre um item
// ---------------------------------------------------------------------------

export interface DesempenhoDoItem {
  itemId: string
  /** Quantas vezes o item apareceu em algum treino registrado. */
  vezes: number
  /** Melhor resultado ja alcancado. */
  melhorResultado: PracticeObservation['resultado']
  /** Maior resistencia em que o item SAIU (nao apenas em que foi tentado). */
  maiorResistenciaComSucesso: PracticeObservation['resistencia'] | null
  /**
   * Saiu contra resistencia media ou alta. E o sinal mais proximo de "isso
   * funciona", e o unico que o registro de treino pode dar.
   */
  funcionaSobPressao: boolean
  /** Ultima vez que foi treinado, ISO. */
  ultimaVez: string
  /** Limitacoes anotadas, em texto livre, sem interpretacao (RNF-05). */
  limitacoes: string[]
}

/**
 * Consolida o que os treinos registrados dizem sobre cada item.
 *
 * Usa o MELHOR resultado ja obtido, nao o mais recente: uma tecnica que saiu
 * contra resistencia alta uma vez provou que funciona, e um dia ruim depois nao
 * desfaz essa prova. E o oposto da regra do `dominio`, que decai com o tempo —
 * e a diferenca e proposital. Dominio e sobre memoria, que apaga; isto e sobre
 * capacidade demonstrada, que nao apaga do mesmo jeito.
 */
export function desempenhoPorItem(sessoes: PracticeSession[]): Map<string, DesempenhoDoItem> {
  const mapa = new Map<string, DesempenhoDoItem>()

  for (const sessao of sessoes) {
    for (const obs of sessao.observacoes) {
      const atual = mapa.get(obs.itemId)
      const saiu = obs.resultado === 'saiu' || obs.resultado === 'saiu_com_resistencia'

      if (!atual) {
        mapa.set(obs.itemId, {
          itemId: obs.itemId,
          vezes: 1,
          melhorResultado: obs.resultado,
          maiorResistenciaComSucesso: saiu ? obs.resistencia : null,
          funcionaSobPressao: saiu && (obs.resistencia === 'media' || obs.resistencia === 'alta'),
          ultimaVez: sessao.data,
          limitacoes: obs.limitacao ? [obs.limitacao] : [],
        })
        continue
      }

      atual.vezes += 1
      if (ORDEM_RESULTADO.indexOf(obs.resultado) > ORDEM_RESULTADO.indexOf(atual.melhorResultado)) {
        atual.melhorResultado = obs.resultado
      }
      if (saiu) {
        const anterior = atual.maiorResistenciaComSucesso
        if (
          anterior === null ||
          ORDEM_RESISTENCIA.indexOf(obs.resistencia) > ORDEM_RESISTENCIA.indexOf(anterior)
        ) {
          atual.maiorResistenciaComSucesso = obs.resistencia
        }
        if (obs.resistencia === 'media' || obs.resistencia === 'alta') atual.funcionaSobPressao = true
      }
      if (sessao.data > atual.ultimaVez) atual.ultimaVez = sessao.data
      if (obs.limitacao) atual.limitacoes.push(obs.limitacao)
    }
  }

  return mapa
}

/**
 * Itens do curriculo que nunca apareceram em nenhum treino registrado.
 *
 * E a saida mais util do modulo. Um item pode estar dominado e validado e ainda
 * assim estar nesta lista — e nesse caso o app esta dizendo que o aluno sabe
 * explicar e teve aprovacao, mas nunca tentou contra alguem que resistiu.
 */
export function nuncaTestados(itens: TechniqueItem[], sessoes: PracticeSession[]): TechniqueItem[] {
  const vistos = desempenhoPorItem(sessoes)
  return itens.filter((i) => i.ativo && !vistos.has(i.id))
}

/** Sessoes mais recentes primeiro. */
export function sessoesRecentes(sessoes: PracticeSession[], quantas?: number): PracticeSession[] {
  const ordenadas = [...sessoes].sort((a, b) => b.data.localeCompare(a.data))
  return quantas === undefined ? ordenadas : ordenadas.slice(0, quantas)
}

/**
 * Resumo do registro, para a tela dizer onde o aluno esta sem precisar somar
 * nada na renderizacao.
 */
export function resumoDoTreino(
  itens: TechniqueItem[],
  sessoes: PracticeSession[],
): {
  sessoes: number
  itensTreinados: number
  itensAtivos: number
  funcionamSobPressao: number
  /** Itens treinados que nunca sairam, nem sem resistencia. */
  travados: number
} {
  const desempenho = desempenhoPorItem(sessoes)
  const ativos = itens.filter((i) => i.ativo)
  const idsAtivos = new Set(ativos.map((i) => i.id))
  const dosAtivos = [...desempenho.values()].filter((d) => idsAtivos.has(d.itemId))

  return {
    sessoes: sessoes.length,
    itensTreinados: dosAtivos.length,
    itensAtivos: ativos.length,
    funcionamSobPressao: dosAtivos.filter((d) => d.funcionaSobPressao).length,
    travados: dosAtivos.filter((d) => d.melhorResultado === 'nao_saiu').length,
  }
}

/**
 * Planner semanal — visao de segunda a sexta do pacote de aulas.
 *
 * Existe porque a lista das 10 aulas esconde o calendario. Foi montando esta
 * visao que apareceu o conflito mais importante do planejamento: 10 aulas a uma
 * por semana terminam DEPOIS da data-alvo. A lista de aulas nunca mostraria
 * isso, porque lista nao tem data.
 *
 * DECISOES DO ALUNO QUE ESTRUTURAM O MODULO:
 *
 * - CINCO DIAS COM PAPEIS DIFERENTES, nao cinco dias de estudo. Segunda e
 *   quarta sao da academia: o conteudo e do mestre e o app nao agenda nada ali.
 *   Aparecem no planner porque a semana e uma coisa so, e porque e nesses dias
 *   que faz sentido oferecer o registro de treino.
 *
 * - DUAS AULAS PARTICULARES POR SEMANA, nos dias em que ele ja esta na academia.
 *   Uma por semana nao caberia antes da prova; duas fecham o pacote em 5 semanas
 *   e deixam folga para o que o professor corrigir.
 *
 * O CICLO da semana vem de uma conclusao do modulo de aulas: item que o aluno ja
 * executa custa menos da metade do tempo de aula. Entao o dia de estudo antes da
 * aula PREPARA (baratear a aula), e o dia depois CONSOLIDA (fixar a correcao que
 * acabou de receber). Sexta prepara a segunda seguinte, fechando o ciclo.
 *
 * Modulo puro: sem React, sem I/O, datas recebidas como texto ISO.
 */

import type { TechniqueItem } from '../domain/types'
import type { AulaPlanejada, PlanoDeAulas } from './aulas'

/** Papel de um dia na semana. */
export type PapelDoDia = 'aula_particular' | 'estudo_prepara' | 'estudo_consolida'

/** 1 = segunda ... 5 = sexta. */
export type DiaUtil = 1 | 2 | 3 | 4 | 5

const NOME_DO_DIA: Record<DiaUtil, string> = {
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
}

/** Dias em que ha aula na academia — e onde as particulares sao encaixadas. */
export const DIAS_DE_ACADEMIA: DiaUtil[] = [1, 3]

/** Aulas particulares por semana (decisao do aluno). */
export const AULAS_POR_SEMANA = 2

export interface DiaDoPlanner {
  /** ISO `YYYY-MM-DD`. */
  data: string
  diaSemana: DiaUtil
  nomeDoDia: string
  papel: PapelDoDia
  /** True quando o dia tambem e dia de aula regular na Rilion. */
  naAcademia: boolean
  /** Numero da aula particular do dia, ou da aula que este dia serve. */
  aulaNumero?: number
  itens: TechniqueItem[]
  /** Uma frase dizendo o que fazer. */
  foco: string
}

export interface SemanaDoPlanner {
  numero: number
  /** ISO da segunda-feira da semana. */
  inicio: string
  dias: DiaDoPlanner[]
}

export interface Planner {
  semanas: SemanaDoPlanner[]
  /** Ultima data com conteudo agendado, ISO. */
  ultimoDia: string | null
  /**
   * Dias entre o fim do pacote e a prova. Negativo significa que o pacote
   * termina DEPOIS da prova — o caso que motivou este modulo existir.
   */
  diasDeFolgaAteAProva: number | null
}

/**
 * Data de um `Date` no fuso LOCAL, como `YYYY-MM-DD`.
 *
 * Existe para nao usar `toISOString().slice(0,10)`, que devolve a data em UTC.
 * A diferenca nao e teorica neste app: o aluno treina das 19h as 21h e abre o
 * app depois: as 21h em Brasilia (UTC-3) o UTC ja virou o dia seguinte, e o
 * planner marcaria AMANHA como hoje.
 */
export function dataLocalISO(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Soma dias a uma data ISO sem passar por fuso horario. */
export function somarDias(dataISO: string, dias: number): string {
  const [a, m, d] = dataISO.split('-').map(Number)
  const base = Date.UTC(a, m - 1, d)
  return new Date(base + dias * 86_400_000).toISOString().slice(0, 10)
}

/** Segunda-feira da semana de `dataISO` — ou a proxima, se cair no fim de semana. */
export function segundaDaSemana(dataISO: string): string {
  const [a, m, d] = dataISO.split('-').map(Number)
  const dow = new Date(Date.UTC(a, m - 1, d)).getUTCDay() // 0=dom .. 6=sab
  if (dow === 0) return somarDias(dataISO, 1)
  if (dow === 6) return somarDias(dataISO, 2)
  return somarDias(dataISO, 1 - dow)
}

/**
 * Monta o planner.
 *
 * Cada semana recebe `aulasPorSemana` aulas particulares nos dias de academia, e
 * os demais dias uteis viram estudo. Um dia de estudo depois de uma aula
 * CONSOLIDA aquela aula; um dia de estudo antes da proxima PREPARA ela.
 */
export function montarPlanner({
  plano,
  primeiraSegunda,
  dataDaProva,
  aulasPorSemana = AULAS_POR_SEMANA,
  diasDeAcademia = DIAS_DE_ACADEMIA,
}: {
  plano: PlanoDeAulas
  /** Qualquer data da primeira semana; o modulo acha a segunda-feira. */
  primeiraSegunda: string
  dataDaProva?: string
  aulasPorSemana?: number
  diasDeAcademia?: DiaUtil[]
}): Planner {
  const inicio = segundaDaSemana(primeiraSegunda)
  const comItens = plano.aulas.filter((a) => a.itens.length > 0)
  if (comItens.length === 0) {
    return { semanas: [], ultimoDia: null, diasDeFolgaAteAProva: null }
  }

  const porSemana = Math.max(1, aulasPorSemana)
  const totalSemanas = Math.ceil(comItens.length / porSemana)
  /** Dias que recebem aula particular, na ordem da semana. */
  const diasComAula = [...diasDeAcademia].sort((x, y) => x - y).slice(0, porSemana)

  const semanas: SemanaDoPlanner[] = []
  let proxima = 0

  for (let w = 0; w < totalSemanas; w++) {
    const segunda = somarDias(inicio, w * 7)

    // Quais aulas caem nesta semana, e em que dia.
    const aulaNoDia = new Map<DiaUtil, AulaPlanejada>()
    for (const dia of diasComAula) {
      const aula = comItens[proxima]
      if (!aula) break
      aulaNoDia.set(dia, aula)
      proxima += 1
    }

    const dias: DiaDoPlanner[] = []
    for (const d of [1, 2, 3, 4, 5] as DiaUtil[]) {
      const data = somarDias(segunda, d - 1)
      const naAcademia = diasDeAcademia.includes(d)
      const aulaDoDia = aulaNoDia.get(d)

      if (aulaDoDia) {
        dias.push({
          data,
          diaSemana: d,
          nomeDoDia: NOME_DO_DIA[d],
          papel: 'aula_particular',
          naAcademia,
          aulaNumero: aulaDoDia.numero,
          itens: aulaDoDia.itens,
          foco: `Aula ${aulaDoDia.numero} com o mestre — mostrar e receber correção`,
        })
        continue
      }

      /**
       * Dia de estudo. Consolida SO se a aula foi ontem — nao "alguma aula ja
       * aconteceu esta semana".
       *
       * A diferenca importa e foi pega por teste: com aulas na segunda e na
       * quarta, a regra frouxa fazia a sexta consolidar a quarta, que a quinta
       * ja tinha consolidado. A sexta perdia o papel de preparar a segunda
       * seguinte, e o ciclo da semana deixava de fechar.
       */
      const aulaDeOntem = aulaNoDia.get((d - 1) as DiaUtil)

      if (aulaDeOntem) {
        dias.push({
          data,
          diaSemana: d,
          nomeDoDia: NOME_DO_DIA[d],
          papel: 'estudo_consolida',
          naAcademia,
          aulaNumero: aulaDeOntem.numero,
          itens: aulaDeOntem.itens,
          foco: `Consolidar a aula ${aulaDeOntem.numero} — repetir com a correção do mestre`,
        })
        continue
      }

      // Nao houve aula ontem: prepara a proxima que vem — desta semana, ou a
      // primeira da semana seguinte (o caso da sexta).
      const aulasDepois = [...aulaNoDia.entries()].filter(([dia]) => dia > d)
      const proximaAula = aulasDepois.length > 0 ? aulasDepois[0][1] : comItens[proxima]
      if (proximaAula) {
        dias.push({
          data,
          diaSemana: d,
          nomeDoDia: NOME_DO_DIA[d],
          papel: 'estudo_prepara',
          naAcademia,
          aulaNumero: proximaAula.numero,
          itens: proximaAula.itens,
          foco: `Preparar a aula ${proximaAula.numero} — chegar sabendo baixa o tempo dela`,
        })
        continue
      }

      // Depois da ultima aula: revisao livre, sem itens atribuidos.
      dias.push({
        data,
        diaSemana: d,
        nomeDoDia: NOME_DO_DIA[d],
        papel: 'estudo_consolida',
        naAcademia,
        itens: [],
        foco: 'Revisão livre — rode o que mais travou no pacote',
      })
    }

    semanas.push({ numero: w + 1, inicio: segunda, dias })
  }

  const ultimoDia = semanas.length > 0 ? semanas[semanas.length - 1].dias[4].data : null
  const diasDeFolgaAteAProva =
    ultimoDia && dataDaProva
      ? Math.round(
          (Date.parse(`${dataDaProva}T00:00:00Z`) - Date.parse(`${ultimoDia}T00:00:00Z`)) / 86_400_000,
        )
      : null

  return { semanas, ultimoDia, diasDeFolgaAteAProva }
}

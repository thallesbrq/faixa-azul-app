/**
 * Planner semanal — visao de segunda a sexta da rotina real.
 *
 * Existe porque a lista das 10 aulas esconde o calendario. Foi montando esta
 * visao que apareceram os dois conflitos que a lista nunca mostraria: um ritmo
 * de aulas que termina depois da prova, e um feriado nacional caindo em dia de
 * aula particular. Lista nao tem data.
 *
 * ROTINA (definida pelo aluno com o Prof. Joao Eduardo):
 *
 *   SEG  8h-9h  aula PARTICULAR  (conteudo da prova, Secoes 4 e 5)
 *   TER  8h-9h  aula REGULAR     (conteudo do mestre, o app nao agenda)
 *   QUA  8h-9h  aula PARTICULAR
 *   QUI  8h-9h  aula REGULAR
 *   SEX  --     sem aula
 *
 * O estudo proprio acontece nos CINCO dias. Isso so e viavel porque a aula e as
 * 8h da manha: antes, com aula das 19h as 21h, o dia acabava junto com ela.
 *
 * Um DIA tem portanto duas coisas independentes: a aula na academia (se houver)
 * e o estudo sozinho. O modelo separa as duas em vez de dar um papel unico ao
 * dia, porque no dia de aula particular as duas coisas acontecem.
 *
 * PAPEL DO ESTUDO em cada dia, e a razao de cada regra:
 * - dia com aula particular  -> CONSOLIDA a aula do dia (correcao ainda fresca)
 * - vespera de aula particular -> PREPARA ela (chegar sabendo baixa o tempo da
 *   aula pela metade, ver custoEmMinutos em ./aulas)
 * - dia seguinte a uma aula  -> CONSOLIDA ela de novo, agora com um dia de
 *   espacamento
 * - nenhum dos casos         -> PREPARA a proxima aula que vier
 *
 * Modulo puro: sem React, sem I/O, datas recebidas como texto ISO.
 */

import type { TechniqueItem } from '../domain/types'
import type { AulaPlanejada, PlanoDeAulas } from './aulas'

/** 1 = segunda ... 5 = sexta. */
export type DiaUtil = 1 | 2 | 3 | 4 | 5

const NOME_DO_DIA: Record<DiaUtil, string> = {
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
}

/** Dias das aulas particulares (conteudo da prova). */
export const DIAS_PARTICULAR: DiaUtil[] = [1, 3]

/** Dias das aulas regulares (conteudo do mestre). */
export const DIAS_REGULAR: DiaUtil[] = [2, 4]

export const HORARIO_AULA = '8h–9h'

/**
 * Feriados nacionais na janela do pacote.
 *
 * Existe porque um deles conflita de verdade: 07/09/2026 (Independencia) cai
 * numa segunda, que e dia de aula particular. Sem isto o planner marcaria uma
 * aula num dia de academia fechada. Nao cobre feriado municipal de Garopaba —
 * quando aparecer um, entra nesta lista.
 */
export const FERIADOS: Record<string, string> = {
  '2026-09-07': 'Independência',
  '2026-10-12': 'N. Sra. Aparecida',
  '2026-11-02': 'Finados',
  '2026-11-15': 'Proclamação da República',
  '2026-11-20': 'Consciência Negra',
  '2026-12-25': 'Natal',
}

export type TipoDeAula = 'particular' | 'regular'
export type PapelDoEstudo = 'prepara' | 'consolida' | 'livre'

export interface AulaDoDia {
  tipo: TipoDeAula
  /** Numero da aula do pacote (1-10). Ausente para aula regular. */
  numero?: number
  horario: string
}

export interface EstudoDoDia {
  papel: PapelDoEstudo
  /** Aula que este estudo serve. */
  aulaNumero?: number
  itens: TechniqueItem[]
  foco: string
}

export interface DiaDoPlanner {
  /** ISO `YYYY-MM-DD`. */
  data: string
  diaSemana: DiaUtil
  nomeDoDia: string
  /** Nome do feriado, quando houver. */
  feriado?: string
  aula?: AulaDoDia
  estudo: EstudoDoDia
}

export interface SemanaDoPlanner {
  numero: number
  /** ISO da segunda-feira da semana. */
  inicio: string
  dias: DiaDoPlanner[]
}

export interface Planner {
  semanas: SemanaDoPlanner[]
  /** Data da ultima aula particular, ISO. */
  ultimaAula: string | null
  /**
   * Dias entre a ultima aula e a prova. Negativo significa que o pacote termina
   * DEPOIS da prova — o caso que motivou este modulo existir.
   */
  diasDeFolgaAteAProva: number | null
  /** Aulas que nao couberam antes da prova. */
  aulasSemData: number
}

/**
 * Data de um `Date` no fuso LOCAL, como `YYYY-MM-DD`.
 *
 * Existe para nao usar `toISOString().slice(0,10)`, que devolve a data em UTC.
 * A diferenca nao e teorica neste app: se o aluno abrir o app a noite, em
 * Brasilia (UTC-3) o UTC ja virou o dia seguinte, e o planner marcaria AMANHA
 * como hoje.
 */
export function dataLocalISO(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Soma dias a uma data ISO sem passar por fuso horario. */
export function somarDias(dataISO: string, dias: number): string {
  const [a, m, d] = dataISO.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d) + dias * 86_400_000).toISOString().slice(0, 10)
}

/** 1 = segunda ... 7 = domingo. */
export function diaDaSemana(dataISO: string): number {
  const [a, m, d] = dataISO.split('-').map(Number)
  const dow = new Date(Date.UTC(a, m - 1, d)).getUTCDay()
  return dow === 0 ? 7 : dow
}

/** Segunda-feira da semana de `dataISO`. */
export function segundaDaSemana(dataISO: string): string {
  return somarDias(dataISO, 1 - diaDaSemana(dataISO))
}

/** Diferenca em dias entre duas datas ISO. */
function diferencaEmDias(de: string, para: string): number {
  return Math.round((Date.parse(`${para}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86_400_000)
}

/**
 * Datas das aulas particulares, a partir de `inicio`, nos dias combinados,
 * pulando feriados.
 */
export function datasDasAulas({
  inicio,
  quantidade,
  diasDeAula = DIAS_PARTICULAR,
  feriados = FERIADOS,
  limite,
}: {
  inicio: string
  quantidade: number
  diasDeAula?: DiaUtil[]
  feriados?: Record<string, string>
  /** Nao agenda depois desta data (a prova). */
  limite?: string
}): string[] {
  const datas: string[] = []
  let cursor = inicio
  // Teto de seguranca: 52 semanas cobre qualquer pacote sem risco de loop.
  const maxDias = 364

  for (let i = 0; i < maxDias && datas.length < quantidade; i++, cursor = somarDias(cursor, 1)) {
    if (limite && cursor > limite) break
    const dow = diaDaSemana(cursor)
    if (dow > 5) continue
    if (!diasDeAula.includes(dow as DiaUtil)) continue
    if (feriados[cursor]) continue
    datas.push(cursor)
  }

  return datas
}

/** Monta o planner da rotina. */
export function montarPlanner({
  plano,
  inicio,
  hoje,
  dataDaProva,
  diasParticular = DIAS_PARTICULAR,
  diasRegular = DIAS_REGULAR,
  feriados = FERIADOS,
}: {
  plano: PlanoDeAulas
  /** Primeiro dia do pacote, ISO. */
  inicio: string
  /**
   * Hoje, ISO. Quando anterior ao inicio do pacote, o planner comeca na semana
   * de hoje: os dias antes da primeira aula sao o melhor momento para prepara-la
   * (ela e a aula mais caro do pacote, com tudo cru), e some-los seria jogar
   * fora tempo de preparo que existe de verdade.
   */
  hoje?: string
  dataDaProva?: string
  diasParticular?: DiaUtil[]
  diasRegular?: DiaUtil[]
  feriados?: Record<string, string>
}): Planner {
  const comItens = plano.aulas.filter((a) => a.itens.length > 0)
  if (comItens.length === 0) {
    return { semanas: [], ultimaAula: null, diasDeFolgaAteAProva: null, aulasSemData: 0 }
  }

  const datas = datasDasAulas({
    inicio,
    quantidade: comItens.length,
    diasDeAula: diasParticular,
    feriados,
    limite: dataDaProva,
  })

  /** data -> aula do pacote. */
  const aulaNaData = new Map<string, AulaPlanejada>()
  datas.forEach((data, i) => aulaNaData.set(data, comItens[i]))

  const ultimaAula = datas.length > 0 ? datas[datas.length - 1] : null
  const comecoDaVisao = hoje && hoje < inicio ? hoje : inicio
  const primeiraSegunda = segundaDaSemana(comecoDaVisao)
  const ultimaSegunda = segundaDaSemana(ultimaAula ?? inicio)
  const totalSemanas = diferencaEmDias(primeiraSegunda, ultimaSegunda) / 7 + 1

  const semanas: SemanaDoPlanner[] = []

  for (let w = 0; w < totalSemanas; w++) {
    const segunda = somarDias(primeiraSegunda, w * 7)
    const dias: DiaDoPlanner[] = []

    for (const d of [1, 2, 3, 4, 5] as DiaUtil[]) {
      const data = somarDias(segunda, d - 1)
      const feriado = feriados[data]
      const aulaParticular = aulaNaData.get(data)
      const antesDoInicio = data < inicio

      // ---- aula na academia neste dia ----
      let aula: AulaDoDia | undefined
      if (aulaParticular) {
        aula = { tipo: 'particular', numero: aulaParticular.numero, horario: HORARIO_AULA }
      } else if (!antesDoInicio && !feriado && diasRegular.includes(d)) {
        aula = { tipo: 'regular', horario: HORARIO_AULA }
      }

      /**
       * ---- estudo proprio neste dia ----
       *
       * Os dias ANTES do inicio do pacote nao ficam vazios: eles preparam a
       * primeira aula. Foi um teste que expos isso — "toda aula e preparada
       * antes" falhava justamente na aula 1, porque ela cai no primeiro dia do
       * pacote e nada a antecedia. Como ela e a aula mais caro (tudo cru), esses
       * dias sao o preparo mais valioso que existe.
       */
      let estudo: EstudoDoDia

      if (aulaParticular) {
        estudo = {
          papel: 'consolida',
          aulaNumero: aulaParticular.numero,
          itens: aulaParticular.itens,
          foco: `Depois da aula: repetir a aula ${aulaParticular.numero} com a correção ainda fresca`,
        }
      } else {
        const amanha = aulaNaData.get(somarDias(data, 1))
        const ontem = aulaNaData.get(somarDias(data, -1))

        if (amanha) {
          estudo = {
            papel: 'prepara',
            aulaNumero: amanha.numero,
            itens: amanha.itens,
            foco: `Preparar a aula ${amanha.numero} de amanhã — chegar sabendo corta o tempo dela pela metade`,
          }
        } else if (ontem) {
          estudo = {
            papel: 'consolida',
            aulaNumero: ontem.numero,
            itens: ontem.itens,
            foco: `Consolidar a aula ${ontem.numero} — segunda passada, agora com um dia de intervalo`,
          }
        } else {
          // Proxima aula futura, se existir.
          const futura = datas.find((x) => x > data)
          const aulaFutura = futura ? aulaNaData.get(futura) : undefined
          estudo = aulaFutura
            ? {
                papel: 'prepara',
                aulaNumero: aulaFutura.numero,
                itens: aulaFutura.itens,
                foco: `Preparar a aula ${aulaFutura.numero} — a próxima do pacote`,
              }
            : { papel: 'livre', itens: [], foco: 'Revisão livre — rode o que mais travou no pacote' }
        }
      }

      dias.push({ data, diaSemana: d, nomeDoDia: NOME_DO_DIA[d], feriado, aula, estudo })
    }

    semanas.push({ numero: w + 1, inicio: segunda, dias })
  }

  return {
    semanas,
    ultimaAula,
    diasDeFolgaAteAProva: ultimaAula && dataDaProva ? diferencaEmDias(ultimaAula, dataDaProva) : null,
    aulasSemData: comItens.length - datas.length,
  }
}

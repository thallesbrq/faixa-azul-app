/**
 * A AGENDA DA TURMA — onde a aula numerada do planner ganha uma data.
 *
 * O planner tem 81 caixas numeradas (00 a 80) e nenhuma data. A Grade de Horario
 * tem datas e nenhum conteudo. Este modulo e a ponte: ele gera os SLOTS
 * concretos de uma semana a partir do horario recorrente da turma, e sabe qual
 * aula esta em cada um.
 *
 * ---------------------------------------------------------------------------
 * TUDO AQUI E HORA LOCAL, E ISSO E DECISAO E NAO DESCUIDO.
 *
 * "Terca as 8h" e uma regra que se repete no relogio de Garopaba, nao um
 * instante em UTC. O erro classico deste tipo de codigo e usar `toISOString()`
 * para extrair a data:
 *
 *     new Date(2026, 11, 31, 21, 0).toISOString()  // '2027-01-01T00:00:00Z'
 *
 * Uma aula de 31/12 as 21h viraria 01/01 — a aula muda de dia, de semana e de
 * ANO. Com a RGA as 19h e fuso de Brasilia (UTC-3), qualquer aula depois das 21h
 * cairia no dia seguinte. Por isso a data e montada com os getters LOCAIS
 * (`getFullYear`, `getMonth`, `getDate`) e nunca por serializacao UTC.
 *
 * O id do slot tambem e local e legivel: `2026-09-08T0800`. Um carimbo UTC ali
 * faria o id do documento depender do fuso de quem gravou.
 * ---------------------------------------------------------------------------
 *
 * Modulo puro: sem React, sem I/O.
 */

import type { HorarioSemanal } from '../domain/turmas'
import { horariosDaTurma } from '../domain/turmas'
import { AULA_EXPERIMENTAL, ULTIMA_AULA } from './programa'

/**
 * O MINIMO que a agenda precisa saber de uma aula: o numero e o slot.
 *
 * NAO E `AulaDoPrograma`, e a diferenca importa: `AulaNoPlanner` (o que a tela
 * desenha) e `AulaDoPrograma` (o que e guardado) tem os dois campos e mais nada
 * em comum. Exigir um dos dois obrigaria a converter um no outro na chamada — e
 * a conversao seria um `aulaVazia(...)` com campos falsos so para satisfazer o
 * tipo, que e mentira em nome de compilar.
 */
export interface AulaAgendavel {
  numero: number
  slot: string
}

const DIA_MS = 86_400_000

/** Rotulos dos dias, na ordem de `Date.getDay()`. */
export const DIAS_DA_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const

/**
 * A data como texto local `YYYY-MM-DD`.
 *
 * NAO USA `toISOString()`. Ver o cabecalho: uma aula as 21h em UTC-3 mudaria de
 * dia. Aqui o dia e o dia que o professor ve no relogio dele.
 */
export function comoDataLocal(d: Date): string {
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

/**
 * `YYYY-MM-DD` de volta para `Date` a MEIO-DIA local.
 *
 * MEIO-DIA E NAO MEIA-NOITE, e o motivo e horario de verao: numa madrugada de
 * transicao, meia-noite pode nao existir ou existir duas vezes, e o `Date` pula
 * para o dia vizinho. Meio-dia esta longe de qualquer salto de uma hora.
 */
export function daDataLocal(texto: string): Date {
  const [ano, mes, dia] = texto.split('-').map(Number)
  return new Date(ano, (mes ?? 1) - 1, dia ?? 1, 12, 0, 0, 0)
}

/**
 * O id de um slot: `2026-09-08T0800`.
 *
 * Sem `:` porque ele vai virar id de documento no Firestore, e id com pontuacao
 * exotica e a fonte de bugs que so aparecem no deploy. Sem fuso porque o slot e
 * local (ver cabecalho).
 */
export function idDoSlot(data: string, inicio: string): string {
  return `${data}T${inicio.replace(':', '')}`
}

export interface PartesDoSlot {
  data: string
  inicio: string
}

/** Desmonta o id. `null` para texto que nao e um id de slot. */
export function partesDoSlot(id: string): PartesDoSlot | null {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2})(\d{2})$/.exec(id)
  if (!m) return null
  return { data: m[1], inicio: `${m[2]}:${m[3]}` }
}

/**
 * O DOMINGO da semana que contem esta data.
 *
 * Domingo e nao segunda porque e a convencao do calendario brasileiro, e a Grade
 * vai ser lida por um professor daqui — nao por um sistema.
 */
export function domingoDaSemana(d: Date): Date {
  const base = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0)
  base.setDate(base.getDate() - base.getDay())
  return base
}

/** Os sete dias da semana que comeca neste domingo. */
export function diasDaSemana(domingo: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => new Date(domingo.getTime() + i * DIA_MS))
}

/**
 * O ultimo dia do ano desta data.
 *
 * DERIVADO E NAO CRAVADO: `'2026-12-31'` no codigo estaria errado em 1o de
 * janeiro, e o sintoma seria a paginacao travada no passado. O limite "ate o fim
 * do ano" foi escolha dele para o teste inicial — quando virar o ano, o limite
 * acompanha sem ninguem editar.
 */
export function fimDoAno(hoje: Date): Date {
  return new Date(hoje.getFullYear(), 11, 31, 12, 0, 0, 0)
}

export interface SlotDaSemana {
  id: string
  /** `YYYY-MM-DD` local. */
  data: string
  /** O `Date` ao meio-dia, para formatar sem risco de fuso. */
  quando: Date
  inicio: string
  fim: string
  diaDaSemana: number
  /** Numero da aula agendada aqui, ou `null`. */
  aula: number | null
  /** O slot ja passou? A Grade marca, e nao esconde. */
  passado: boolean
}

/**
 * Os slots concretos de uma semana, para uma turma.
 *
 * Turma sem horario devolve lista VAZIA — e a tela diz isso em vez de mostrar
 * uma semana em branco que parece defeito.
 */
export function slotsDaSemana({
  turma,
  domingo,
  agenda,
  hoje,
  horarios = horariosDaTurma(turma),
}: {
  turma: string
  domingo: Date
  /** slotId -> numero da aula. Vem de `agendaDoPrograma`. */
  agenda: ReadonlyMap<string, number>
  hoje: Date
  /** Injetavel para teste; o padrao vem do dominio. */
  horarios?: readonly HorarioSemanal[]
}): SlotDaSemana[] {
  const dias = diasDaSemana(domingo)
  const limiteDeHoje = comoDataLocal(hoje)

  const slots: SlotDaSemana[] = []
  for (const dia of dias) {
    for (const h of horarios) {
      if (dia.getDay() !== h.diaDaSemana) continue
      const data = comoDataLocal(dia)
      const id = idDoSlot(data, h.inicio)
      slots.push({
        id,
        data,
        quando: dia,
        inicio: h.inicio,
        fim: h.fim,
        diaDaSemana: h.diaDaSemana,
        aula: agenda.get(id) ?? null,
        // COMPARA TEXTO `YYYY-MM-DD`, que ordena como data. Comparar `Date`
        // exigiria decidir a hora de "hoje", e o slot da manha ficaria "passado"
        // a tarde do mesmo dia — o professor ainda quer marcar a aula que deu.
        passado: data < limiteDeHoje,
      })
    }
  }

  // Ordena por dia e depois por hora: uma turma com dois horarios no mesmo dia
  // (manha e noite) precisa aparecer na ordem do relogio.
  return slots.sort((a, b) => (a.data === b.data ? a.inicio.localeCompare(b.inicio) : a.data.localeCompare(b.data)))
}

/**
 * slotId -> numero da aula, a partir das aulas guardadas.
 *
 * DUAS AULAS NO MESMO SLOT nao deveria acontecer — a tela impede — mas o dado
 * vem do Firestore e pode ter sido editado a mao ou gravado por duas abas ao
 * mesmo tempo. Ganha a de MENOR numero, e o desempate e deliberado: ele e
 * estavel (nao depende da ordem de leitura), entao as duas abas mostram a mesma
 * coisa em vez de discordarem.
 */
export function agendaDoPrograma(aulas: readonly AulaAgendavel[]): Map<string, number> {
  const porSlot = new Map<string, number>()
  for (const a of aulas) {
    if (!a.slot) continue
    const atual = porSlot.get(a.slot)
    if (atual === undefined || a.numero < atual) porSlot.set(a.slot, a.numero)
  }
  return porSlot
}

/** O slot de cada aula. `''` (sem data) nao entra. */
export function slotPorAula(aulas: readonly AulaAgendavel[]): Map<number, string> {
  const m = new Map<number, string>()
  for (const a of aulas) if (a.slot) m.set(a.numero, a.slot)
  return m
}

/**
 * A proxima aula SEM data — o que um clique em slot vazio agenda.
 *
 * A DE MENOR NUMERO AINDA SEM DATA, e nao "a ultima agendada mais um": se o
 * professor agendar a 1, a 2 e a 5, a proxima e a 3 e nao a 6. O buraco e mais
 * provavel de ser esquecimento do que intencao, e deixar a fila pular o buraco
 * faria a aula 3 nunca acontecer sem ninguem notar.
 *
 * COMECA NA AULA 1 E NAO NA 00: a experimental e presencial, dada antes do
 * programa, e nao entra na sequencia agendada.
 *
 * `null` quando todas as 80 tem data.
 */
export function proximaAulaSemData(aulas: readonly AulaAgendavel[]): number | null {
  const comData = slotPorAula(aulas)
  for (let n = AULA_EXPERIMENTAL + 1; n <= ULTIMA_AULA; n++) {
    if (!comData.has(n)) return n
  }
  return null
}

/**
 * Quantas semanas ha entre duas datas, contando a da primeira.
 *
 * Serve para a paginacao saber onde parar. `0` quando o fim e antes do inicio —
 * e nao um numero negativo, que faria a tela oferecer paginas para tras.
 */
export function semanasEntre(inicio: Date, fim: Date): number {
  const a = domingoDaSemana(inicio).getTime()
  const b = domingoDaSemana(fim).getTime()
  if (b < a) return 0
  return Math.round((b - a) / (7 * DIA_MS)) + 1
}

/** "8 de setembro" — para o cabecalho da semana. */
export function rotuloDoDia(d: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' }).format(d)
}

/** "8 a 14 de setembro de 2026" — o titulo da semana na Grade. */
export function rotuloDaSemana(domingo: Date): string {
  const sabado = new Date(domingo.getTime() + 6 * DIA_MS)
  const mesmoMes = domingo.getMonth() === sabado.getMonth()
  const fmt = (d: Date, opcoes: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('pt-BR', opcoes).format(d)

  if (mesmoMes) {
    return `${domingo.getDate()} a ${sabado.getDate()} de ${fmt(domingo, { month: 'long', year: 'numeric' })}`
  }
  return `${fmt(domingo, { day: 'numeric', month: 'short' })} a ${fmt(sabado, { day: 'numeric', month: 'short', year: 'numeric' })}`
}

// ---------------------------------------------------------------------------
// A fila: o que vem a seguir
// ---------------------------------------------------------------------------

export interface AulaNaFila {
  numero: number
  slot: string
  /** `YYYY-MM-DD` local. */
  data: string
  /** O `Date` ao meio-dia, para formatar sem risco de fuso. */
  quando: Date
  inicio: string
  fim: string
  diaDaSemana: number
  /** E hoje? A tela destaca — e o que o substituto abre o app para ver. */
  hoje: boolean
}

/**
 * As proximas aulas agendadas, de hoje para frente.
 *
 * ESTA E A FORMA CERTA PARA CELULAR, e a grade semanal nao e. No computador o
 * professor esta MONTANDO: ele precisa ver a semana, os espacos livres e o que
 * ja esta ocupado. No celular, na porta do tatame, a pergunta e outra e e uma so:
 * "o que eu dou hoje?". Uma paginacao semana a semana obrigaria o substituto a
 * navegar ate achar hoje — e ele tem cinco minutos e uma mao livre.
 *
 * INCLUI HOJE, e nao "a partir de amanha": a comparacao e por DATA
 * (`YYYY-MM-DD`), entao a aula das 8h continua na fila as 14h do mesmo dia. Quem
 * abre o app depois da aula quer conferir o que foi dado, e nao ver a aula
 * desaparecer.
 */
export function proximasAulas({
  aulas,
  hoje,
  quantas = 8,
  horarios,
}: {
  aulas: readonly AulaAgendavel[]
  hoje: Date
  quantas?: number
  /** Os horarios da turma, para resolver o fim de cada aula. */
  horarios: readonly HorarioSemanal[]
}): AulaNaFila[] {
  const limite = comoDataLocal(hoje)

  const fila: AulaNaFila[] = []
  for (const a of aulas) {
    const p = partesDoSlot(a.slot)
    // Slot invalido (dado editado a mao, versao antiga) e ignorado em silencio
    // aqui — `montarPlanner` ja mostra a aula, e a fila nao e o lugar de acusar.
    if (!p) continue
    if (p.data < limite) continue

    const quando = daDataLocal(p.data)
    const h = horarios.find(
      (x) => x.diaDaSemana === quando.getDay() && x.inicio === p.inicio,
    )

    fila.push({
      numero: a.numero,
      slot: a.slot,
      data: p.data,
      quando,
      inicio: p.inicio,
      /**
       * O FIM VEM DO HORARIO DA TURMA, com o inicio como reserva.
       *
       * A aula guarda so o inicio (esta no id do slot). Se o horario da turma
       * mudar depois de agendada, o fim acompanha — o que e o certo: a duracao e
       * propriedade da turma, nao daquela terca.
       *
       * Sem horario correspondente, `fim` repete o inicio. A tela mostra
       * `08:00–08:00`, que e visivelmente estranho — e melhor que `08:00–` ou
       * `08:00–undefined`.
       */
      fim: h?.fim ?? p.inicio,
      diaDaSemana: quando.getDay(),
      hoje: p.data === limite,
    })
  }

  return fila
    .sort((a, b) => (a.data === b.data ? a.inicio.localeCompare(b.inicio) : a.data.localeCompare(b.data)))
    .slice(0, quantas)
}

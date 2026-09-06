import { describe, expect, it } from 'vitest'
import {
  DIAS_PARTICULAR,
  FERIADOS,
  INICIO_DO_PACOTE,
  dataLocalISO,
  datasDasAulas,
  diaDaSemana,
  montarPlanner,
  segundaDaSemana,
  somarDias,
} from './planner'
import type { AulaPlanejada, PlanoDeAulas } from './aulas'
import type { TechniqueItem } from '../domain/types'

const INICIO = '2026-09-02' // quarta-feira
const PROVA = '2026-10-24'

function item(id: string): TechniqueItem {
  return {
    id,
    moduloId: 'mod-guardas',
    posicao: 'Guarda Fechada',
    slot: id,
    categoria: 'Raspadas',
    nome: id,
    aliases: [],
    kind: 'raspagem',
    sideMode: 'nao_se_aplica',
    safetyLevel: 'baixo',
    validationStatus: 'sugestao_nao_validada',
    sourceReference: 'Seção 4',
    ativo: true,
  }
}

function plano(n: number): PlanoDeAulas {
  const aulas: AulaPlanejada[] = Array.from({ length: n }, (_, i) => ({
    numero: i + 1,
    itens: Array.from({ length: 5 }, (_, j) => item(`a${i + 1}-i${j}`)),
    posicoes: ['Guarda Fechada'],
    minutosEstimados: 60,
  }))
  return { aulas, foraDoPlano: [], minutosDeConteudo: 0, minutosDisponiveis: 0 }
}

/** Todos os dias do planner, achatados. */
function todosOsDias(p: ReturnType<typeof montarPlanner>) {
  return p.semanas.flatMap((s) => s.dias)
}

describe('somarDias / diaDaSemana / segundaDaSemana', () => {
  it('soma sem escorregar de dia por fuso', () => {
    expect(somarDias('2026-09-02', 1)).toBe('2026-09-03')
    expect(somarDias('2026-08-31', 1)).toBe('2026-09-01')
    expect(somarDias('2026-12-31', 1)).toBe('2027-01-01')
    expect(somarDias('2026-09-01', -1)).toBe('2026-08-31')
  })

  it('identifica o dia da semana com segunda = 1', () => {
    expect(diaDaSemana('2026-08-31')).toBe(1) // segunda
    expect(diaDaSemana('2026-09-02')).toBe(3) // quarta
    expect(diaDaSemana('2026-09-06')).toBe(7) // domingo
  })

  it('acha a segunda da semana de qualquer dia', () => {
    expect(segundaDaSemana('2026-09-02')).toBe('2026-08-31')
    expect(segundaDaSemana('2026-08-31')).toBe('2026-08-31')
    expect(segundaDaSemana('2026-09-06')).toBe('2026-08-31')
  })
})

describe('dataLocalISO', () => {
  it('usa a data LOCAL, nao a UTC', () => {
    // A noite em Brasilia (UTC-3) o UTC ja virou; com toISOString o planner
    // marcaria amanha como hoje.
    expect(dataLocalISO(new Date(2026, 8, 2, 22, 30))).toBe('2026-09-02')
    expect(dataLocalISO(new Date(2026, 8, 2, 0, 0))).toBe('2026-09-02')
  })

  it('preenche mes e dia com zero a esquerda', () => {
    expect(dataLocalISO(new Date(2026, 0, 5, 12, 0))).toBe('2026-01-05')
  })
})

describe('datasDasAulas', () => {
  it('agenda so em segunda e quarta, a partir do inicio', () => {
    const datas = datasDasAulas({ inicio: INICIO, quantidade: 4, feriados: {} })
    expect(datas).toEqual(['2026-09-02', '2026-09-07', '2026-09-09', '2026-09-14'])
    expect(datas.every((d) => [1, 3].includes(diaDaSemana(d)))).toBe(true)
  })

  it('PULA feriado que cai em dia de aula', () => {
    // 07/09/2026 (Independencia) e uma segunda. Sem isto o app marcaria aula
    // num dia de academia fechada.
    const datas = datasDasAulas({ inicio: INICIO, quantidade: 4 })
    expect(datas).not.toContain('2026-09-07')
    expect(datas).toEqual(['2026-09-02', '2026-09-09', '2026-09-14', '2026-09-16'])
  })

  it('nunca agenda em fim de semana', () => {
    const datas = datasDasAulas({ inicio: INICIO, quantidade: 10 })
    expect(datas.every((d) => diaDaSemana(d) <= 5)).toBe(true)
  })

  it('para no limite da prova, devolvendo menos datas', () => {
    const datas = datasDasAulas({ inicio: INICIO, quantidade: 10, limite: '2026-09-16' })
    expect(datas).toHaveLength(4)
    expect(datas.every((d) => d <= '2026-09-16')).toBe(true)
  })

  it('as 10 aulas cabem antes da prova', () => {
    const datas = datasDasAulas({ inicio: INICIO, quantidade: 10, limite: PROVA })
    expect(datas).toHaveLength(10)
    expect(datas[datas.length - 1]).toBe('2026-10-07')
  })
})

describe('montarPlanner', () => {
  const p = () => montarPlanner({ plano: plano(10), inicio: INICIO, dataDaProva: PROVA })

  it('toda semana tem os cinco dias uteis', () => {
    for (const s of p().semanas) {
      expect(s.dias.map((d) => d.diaSemana)).toEqual([1, 2, 3, 4, 5])
    }
  })

  it('as 10 aulas particulares aparecem uma vez cada, em ordem', () => {
    const numeros = todosOsDias(p())
      .filter((d) => d.aula?.tipo === 'particular')
      .map((d) => d.aula?.numero)
    expect(numeros).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('particular so em seg/qua; regular so em ter/qui', () => {
    for (const d of todosOsDias(p())) {
      if (d.aula?.tipo === 'particular') expect([1, 3]).toContain(d.diaSemana)
      if (d.aula?.tipo === 'regular') expect([2, 4]).toContain(d.diaSemana)
    }
  })

  it('sexta nunca tem aula — nem particular nem regular', () => {
    const sextas = todosOsDias(p()).filter((d) => d.diaSemana === 5)
    expect(sextas.every((d) => d.aula === undefined)).toBe(true)
  })

  it('todas as aulas sao as 8h-9h', () => {
    const comAula = todosOsDias(p()).filter((d) => d.aula)
    expect(comAula.length).toBeGreaterThan(0)
    expect(comAula.every((d) => d.aula?.horario === '8h–9h')).toBe(true)
  })

  it('nao marca aula nenhuma no feriado', () => {
    const sete = todosOsDias(p()).find((d) => d.data === '2026-09-07')
    expect(sete?.feriado).toBe('Independência')
    expect(sete?.aula).toBeUndefined()
  })

  it('dias antes do inicio nao tem aula, mas PREPARAM a primeira', () => {
    // O pacote comeca na quarta 02/09. Segunda 31/08 e terca 01/09 nao tem aula
    // nenhuma, e sao o unico preparo possivel da aula 1 — que e a mais caro do
    // pacote, com tudo cru.
    const antes = todosOsDias(p()).filter((d) => d.data < INICIO)
    expect(antes.length).toBeGreaterThan(0)
    expect(antes.every((d) => d.aula === undefined)).toBe(true)
    expect(antes.every((d) => d.estudo.papel === 'prepara')).toBe(true)
    expect(antes.every((d) => d.estudo.aulaNumero === 1)).toBe(true)
  })

  it('quando hoje e antes do inicio, a visao comeca na semana de hoje', () => {
    // Some-la jogaria fora dias de preparo que existem de verdade.
    const r = montarPlanner({
      plano: plano(10),
      inicio: INICIO,
      hoje: '2026-08-24',
      dataDaProva: PROVA,
    })
    expect(r.semanas[0].inicio).toBe('2026-08-24')
    const preparamAula1 = todosOsDias(r).filter(
      (d) => d.estudo.papel === 'prepara' && d.estudo.aulaNumero === 1,
    )
    expect(preparamAula1.length).toBeGreaterThanOrEqual(5)
  })

  it('todos os cinco dias tem estudo atribuido', () => {
    // Decisao do aluno: estudo nos 5 dias, viavel porque a aula e as 8h.
    expect(todosOsDias(p()).every((d) => d.estudo.foco.length > 0)).toBe(true)
  })

  it('no dia da aula, o estudo consolida a aula daquele dia', () => {
    const dia = todosOsDias(p()).find((d) => d.data === '2026-09-02')
    expect(dia?.aula?.numero).toBe(1)
    expect(dia?.estudo.papel).toBe('consolida')
    expect(dia?.estudo.aulaNumero).toBe(1)
  })

  it('a vespera de uma aula PREPARA ela', () => {
    // Terca 08/09 e vespera da aula de quarta 09/09.
    const terca = todosOsDias(p()).find((d) => d.data === '2026-09-08')
    expect(terca?.aula?.tipo).toBe('regular')
    expect(terca?.estudo.papel).toBe('prepara')
    expect(terca?.estudo.aulaNumero).toBe(2)
  })

  it('o dia seguinte a uma aula CONSOLIDA ela, com um dia de intervalo', () => {
    // Quinta 10/09 vem depois da aula de quarta 09/09.
    const quinta = todosOsDias(p()).find((d) => d.data === '2026-09-10')
    expect(quinta?.estudo.papel).toBe('consolida')
    expect(quinta?.estudo.aulaNumero).toBe(2)
  })

  it('sexta prepara a proxima aula, fechando o ciclo entre semanas', () => {
    const sexta = todosOsDias(p()).find((d) => d.data === '2026-09-11')
    expect(sexta?.estudo.papel).toBe('prepara')
    expect(sexta?.estudo.aulaNumero).toBe(3)
  })

  it('toda aula e preparada antes e consolidada depois', () => {
    // A propriedade que da sentido ao ciclo: nenhuma aula chega sem preparo.
    const dias = todosOsDias(p())
    const numeros = dias.filter((d) => d.aula?.tipo === 'particular').map((d) => d.aula!.numero!)

    for (const n of numeros) {
      const preparada = dias.some((d) => d.estudo.papel === 'prepara' && d.estudo.aulaNumero === n)
      const consolidada = dias.some((d) => d.estudo.papel === 'consolida' && d.estudo.aulaNumero === n)
      expect(preparada, `aula ${n} sem dia de preparacao`).toBe(true)
      expect(consolidada, `aula ${n} sem dia de consolidacao`).toBe(true)
    }
  })

  it('o estudo carrega os itens da aula que ele serve', () => {
    const dias = todosOsDias(p())
    const aula1 = dias.find((d) => d.aula?.numero === 1)!
    const preparaAula1 = dias.find((d) => d.estudo.papel === 'prepara' && d.estudo.aulaNumero === 1)
    expect(preparaAula1?.estudo.itens.map((i) => i.id)).toEqual(aula1.estudo.itens.map((i) => i.id))
  })

  it('calcula a folga entre a ultima aula e a prova', () => {
    const r = p()
    expect(r.ultimaAula).toBe('2026-10-07')
    expect(r.diasDeFolgaAteAProva).toBe(17)
    expect(r.aulasSemData).toBe(0)
  })

  it('acusa aulas SEM DATA quando nao cabem antes da prova', () => {
    // O conflito que motivou o modulo, agora detectavel: prova muito perto.
    const r = montarPlanner({ plano: plano(10), inicio: INICIO, dataDaProva: '2026-09-16' })
    expect(r.aulasSemData).toBeGreaterThan(0)
  })

  it('folga negativa nunca acontece — a aula simplesmente nao e agendada', () => {
    const r = montarPlanner({ plano: plano(10), inicio: INICIO, dataDaProva: '2026-09-16' })
    expect(r.diasDeFolgaAteAProva).toBeGreaterThanOrEqual(0)
  })

  it('depois da ultima aula o estudo vira revisao livre', () => {
    const r = montarPlanner({ plano: plano(2), inicio: INICIO, dataDaProva: PROVA })
    const dias = todosOsDias(r)
    const depoisDaUltima = dias.filter((d) => d.data > r.ultimaAula!)
    expect(depoisDaUltima.length).toBeGreaterThan(0)
    expect(depoisDaUltima.every((d) => d.estudo.papel === 'consolida' || d.estudo.papel === 'livre')).toBe(
      true,
    )
    expect(depoisDaUltima.some((d) => d.estudo.papel === 'livre')).toBe(true)
  })

  it('plano vazio devolve planner vazio, sem quebrar', () => {
    const r = montarPlanner({ plano: plano(0), inicio: INICIO })
    expect(r.semanas).toEqual([])
    expect(r.ultimaAula).toBeNull()
    expect(r.diasDeFolgaAteAProva).toBeNull()
    expect(r.aulasSemData).toBe(0)
  })

  it('a primeira semana comeca na segunda, mesmo o pacote comecando na quarta', () => {
    expect(p().semanas[0].inicio).toBe('2026-08-31')
  })
})

// ---------------------------------------------------------------------------
// Calendario CONFIRMADO do pacote — inicio 02/09/2026
// ---------------------------------------------------------------------------

describe('calendario confirmado do pacote', () => {
  const datas = datasDasAulas({ inicio: INICIO_DO_PACOTE, quantidade: 10 })

  it('a aula 1 cai no proprio dia de inicio, porque 02/09/2026 e quarta', () => {
    // Se a data confirmada caisse num dia sem aula particular, a aula 1 iria
    // para o proximo dia valido e o pacote comecaria depois do combinado — e o
    // aluno descobriria isso pelo planner, nao por aviso.
    expect(datas[0]).toBe('2026-09-02')
    expect(diaDaSemana('2026-09-02')).toBe(3)
    expect(DIAS_PARTICULAR).toContain(3)
  })

  it('pula 07/09 (Independencia), que cai em segunda de aula particular', () => {
    // O feriado que motivou a lista FERIADOS existir.
    expect(datas).not.toContain('2026-09-07')
    expect(FERIADOS['2026-09-07']).toBeDefined()
    expect(diaDaSemana('2026-09-07')).toBe(1)
    // A aula 2 vai para a quarta seguinte, nao para o feriado.
    expect(datas[1]).toBe('2026-09-09')
  })

  it('as 10 aulas cabem antes da meta provisoria da prova, com folga', () => {
    // O conflito que o planner existe para mostrar: ritmo que termina depois da
    // prova. Com o inicio confirmado, termina 17 dias antes.
    expect(datas).toHaveLength(10)
    const ultima = datas[datas.length - 1]
    expect(ultima).toBe('2026-10-07')
    expect(ultima < '2026-10-24').toBe(true)
  })

  it('todas as aulas caem em dia de aula particular e nenhuma em feriado', () => {
    for (const d of datas) {
      expect(DIAS_PARTICULAR).toContain(diaDaSemana(d))
      expect(FERIADOS[d]).toBeUndefined()
    }
  })

  it('o calendario inteiro, fixado — mudar dias ou feriados quebra aqui', () => {
    expect(datas).toEqual([
      '2026-09-02',
      '2026-09-09',
      '2026-09-14',
      '2026-09-16',
      '2026-09-21',
      '2026-09-23',
      '2026-09-28',
      '2026-09-30',
      '2026-10-05',
      '2026-10-07',
    ])
  })
})

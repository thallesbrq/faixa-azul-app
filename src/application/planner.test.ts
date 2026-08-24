import { describe, expect, it } from 'vitest'
import { dataLocalISO, montarPlanner, segundaDaSemana, somarDias } from './planner'
import type { AulaPlanejada, PlanoDeAulas } from './aulas'
import type { TechniqueItem } from '../domain/types'

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

/** Plano com `n` aulas de 5 itens cada. */
function plano(n: number): PlanoDeAulas {
  const aulas: AulaPlanejada[] = Array.from({ length: n }, (_, i) => ({
    numero: i + 1,
    itens: Array.from({ length: 5 }, (_, j) => item(`a${i + 1}-i${j}`)),
    posicoes: ['Guarda Fechada'],
    minutosEstimados: 60,
  }))
  return { aulas, foraDoPlano: [], minutosDeConteudo: 0, minutosDisponiveis: 0 }
}

describe('somarDias', () => {
  it('soma sem escorregar de dia por fuso', () => {
    expect(somarDias('2026-08-24', 1)).toBe('2026-08-25')
    expect(somarDias('2026-08-24', 7)).toBe('2026-08-31')
    expect(somarDias('2026-08-24', 0)).toBe('2026-08-24')
  })

  it('atravessa virada de mes e de ano', () => {
    expect(somarDias('2026-08-31', 1)).toBe('2026-09-01')
    expect(somarDias('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('aceita dias negativos', () => {
    expect(somarDias('2026-09-01', -1)).toBe('2026-08-31')
  })
})

describe('segundaDaSemana', () => {
  it('numa terca devolve a segunda anterior', () => {
    // 2026-08-25 e terca.
    expect(segundaDaSemana('2026-08-25')).toBe('2026-08-24')
  })

  it('numa segunda devolve ela mesma', () => {
    expect(segundaDaSemana('2026-08-24')).toBe('2026-08-24')
  })

  it('no fim de semana pula para a segunda SEGUINTE', () => {
    // Nao faz sentido comecar um planner no meio de um fim de semana ja passado.
    expect(segundaDaSemana('2026-08-22')).toBe('2026-08-24') // sabado
    expect(segundaDaSemana('2026-08-23')).toBe('2026-08-24') // domingo
  })
})

describe('montarPlanner', () => {
  it('10 aulas a 2 por semana fecham em 5 semanas', () => {
    const p = montarPlanner({ plano: plano(10), primeiraSegunda: '2026-08-24' })
    expect(p.semanas).toHaveLength(5)
  })

  it('toda semana tem os 5 dias uteis, de segunda a sexta', () => {
    const p = montarPlanner({ plano: plano(10), primeiraSegunda: '2026-08-24' })
    for (const s of p.semanas) {
      expect(s.dias.map((d) => d.diaSemana)).toEqual([1, 2, 3, 4, 5])
    }
  })

  it('as aulas particulares caem nos dias de academia', () => {
    // Segunda e quarta: ele ja esta na Rilion nesses dias.
    const p = montarPlanner({ plano: plano(10), primeiraSegunda: '2026-08-24' })
    for (const s of p.semanas) {
      const comAula = s.dias.filter((d) => d.papel === 'aula_particular')
      expect(comAula.map((d) => d.diaSemana)).toEqual([1, 3])
      expect(comAula.every((d) => d.naAcademia)).toBe(true)
    }
  })

  it('as 10 aulas aparecem uma unica vez cada, em ordem', () => {
    const p = montarPlanner({ plano: plano(10), primeiraSegunda: '2026-08-24' })
    const numeros = p.semanas
      .flatMap((s) => s.dias)
      .filter((d) => d.papel === 'aula_particular')
      .map((d) => d.aulaNumero)
    expect(numeros).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('terca consolida a aula de segunda; quinta consolida a de quarta', () => {
    const [semana] = montarPlanner({ plano: plano(10), primeiraSegunda: '2026-08-24' }).semanas
    const terca = semana.dias[1]
    const quinta = semana.dias[3]

    expect(terca.papel).toBe('estudo_consolida')
    expect(terca.aulaNumero).toBe(1)
    expect(quinta.papel).toBe('estudo_consolida')
    expect(quinta.aulaNumero).toBe(2)
  })

  it('sexta PREPARA a aula da segunda seguinte — fecha o ciclo', () => {
    // E a razao de existir do ciclo: chegar estudado baixa o custo da aula.
    const [semana] = montarPlanner({ plano: plano(10), primeiraSegunda: '2026-08-24' }).semanas
    const sexta = semana.dias[4]
    expect(sexta.papel).toBe('estudo_prepara')
    expect(sexta.aulaNumero).toBe(3)
  })

  it('o dia de estudo carrega os itens da aula que ele serve', () => {
    const [semana] = montarPlanner({ plano: plano(10), primeiraSegunda: '2026-08-24' }).semanas
    const segunda = semana.dias[0]
    const terca = semana.dias[1]
    expect(terca.itens.map((i) => i.id)).toEqual(segunda.itens.map((i) => i.id))
  })

  it('as datas avancam de sete em sete por semana', () => {
    const p = montarPlanner({ plano: plano(10), primeiraSegunda: '2026-08-24' })
    expect(p.semanas.map((s) => s.inicio)).toEqual([
      '2026-08-24',
      '2026-08-31',
      '2026-09-07',
      '2026-09-14',
      '2026-09-21',
    ])
  })

  it('calcula a folga entre o fim do pacote e a prova', () => {
    const p = montarPlanner({
      plano: plano(10),
      primeiraSegunda: '2026-08-24',
      dataDaProva: '2026-10-24',
    })
    // Ultima sexta: 2026-09-25. Sobram 29 dias.
    expect(p.ultimoDia).toBe('2026-09-25')
    expect(p.diasDeFolgaAteAProva).toBe(29)
  })

  it('acusa folga NEGATIVA quando o pacote termina depois da prova', () => {
    // E o conflito que motivou este modulo: uma aula por semana nao cabe.
    const p = montarPlanner({
      plano: plano(10),
      primeiraSegunda: '2026-08-24',
      dataDaProva: '2026-10-24',
      aulasPorSemana: 1,
    })
    expect(p.semanas).toHaveLength(10)
    expect(p.diasDeFolgaAteAProva).toBeLessThan(0)
  })

  it('uma aula por semana usa apenas o primeiro dia de academia', () => {
    const p = montarPlanner({ plano: plano(4), primeiraSegunda: '2026-08-24', aulasPorSemana: 1 })
    for (const s of p.semanas) {
      const comAula = s.dias.filter((d) => d.papel === 'aula_particular')
      expect(comAula.map((d) => d.diaSemana)).toEqual([1])
    }
  })

  it('numero impar de aulas nao deixa dia orfao na ultima semana', () => {
    // 9 aulas a 2 por semana: a semana 5 tem uma aula so, e a quarta vira estudo.
    const p = montarPlanner({ plano: plano(9), primeiraSegunda: '2026-08-24' })
    expect(p.semanas).toHaveLength(5)
    const ultima = p.semanas[4]
    expect(ultima.dias.filter((d) => d.papel === 'aula_particular')).toHaveLength(1)
    expect(ultima.dias).toHaveLength(5)
  })

  it('dias apos a ultima aula viram revisao livre, sem itens', () => {
    const p = montarPlanner({ plano: plano(9), primeiraSegunda: '2026-08-24' })
    const sexta = p.semanas[4].dias[4]
    expect(sexta.itens).toEqual([])
    expect(sexta.foco).toMatch(/Revisão livre/)
  })

  it('plano vazio devolve planner vazio, sem quebrar', () => {
    const p = montarPlanner({ plano: plano(0), primeiraSegunda: '2026-08-24' })
    expect(p.semanas).toEqual([])
    expect(p.ultimoDia).toBeNull()
    expect(p.diasDeFolgaAteAProva).toBeNull()
  })

  it('ignora aulas sem itens', () => {
    const base = plano(3)
    base.aulas[2].itens = []
    const p = montarPlanner({ plano: base, primeiraSegunda: '2026-08-24' })
    const numeros = p.semanas
      .flatMap((s) => s.dias)
      .filter((d) => d.papel === 'aula_particular')
      .map((d) => d.aulaNumero)
    expect(numeros).toEqual([1, 2])
  })

  it('aceita comecar de qualquer dia da semana', () => {
    const deQuarta = montarPlanner({ plano: plano(10), primeiraSegunda: '2026-08-26' })
    expect(deQuarta.semanas[0].inicio).toBe('2026-08-24')
  })
})

describe('dataLocalISO', () => {
  it('usa a data LOCAL, nao a UTC', () => {
    // 21h em Brasilia (UTC-3) e 00h do dia seguinte em UTC. O aluno treina das
    // 19h as 21h e abre o app depois — se usassemos toISOString, o planner
    // marcaria amanha como hoje justamente na hora de uso.
    const vinteEUma = new Date(2026, 7, 24, 21, 30) // 24/08/2026 21:30 local
    expect(dataLocalISO(vinteEUma)).toBe('2026-08-24')
  })

  it('zera a hora sem escorregar de dia', () => {
    expect(dataLocalISO(new Date(2026, 7, 24, 0, 0))).toBe('2026-08-24')
    expect(dataLocalISO(new Date(2026, 7, 24, 23, 59))).toBe('2026-08-24')
  })

  it('preenche mes e dia com zero a esquerda', () => {
    expect(dataLocalISO(new Date(2026, 0, 5, 12, 0))).toBe('2026-01-05')
  })
})

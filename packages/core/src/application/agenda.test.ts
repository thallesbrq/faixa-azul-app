import { describe, expect, it } from 'vitest'
import {
  agendaDoPrograma,
  comoDataLocal,
  daDataLocal,
  diasDaSemana,
  domingoDaSemana,
  fimDoAno,
  idDoSlot,
  partesDoSlot,
  proximaAulaSemData,
  rotuloDaSemana,
  semanasEntre,
  slotPorAula,
  slotsDaSemana,
} from './agenda'
import { aulaVazia } from './programa'
import type { AulaDoPrograma } from './programa'
import { horariosDaTurma } from '../domain/turmas'

const aula = (numero: number, slot = ''): AulaDoPrograma => ({ ...aulaVazia(numero), slot })

// ---------------------------------------------------------------------------
// Fuso — onde este tipo de codigo quebra
// ---------------------------------------------------------------------------

describe('data local', () => {
  it('NAO usa toISOString — a aula das 21h nao muda de dia', () => {
    /**
     * O DEFEITO QUE ESTE TESTE IMPEDE, e ele nao daria erro nenhum.
     *
     * `new Date(2026, 11, 31, 21, 0).toISOString()` em UTC-3 devolve
     * '2027-01-01T00:00:00Z'. Uma aula de 31/12 as 21h viraria 01/01 — outro
     * dia, outra semana e outro ANO. Com a RGA as 19h, qualquer aula depois das
     * 21h cairia no dia seguinte.
     *
     * A assercao usa a hora mais hostil que existe no fuso de Brasilia.
     */
    const noiteDeAnoNovo = new Date(2026, 11, 31, 21, 0, 0)
    expect(comoDataLocal(noiteDeAnoNovo)).toBe('2026-12-31')
    // E a prova de que o descuido teria mudado o ano:
    expect(noiteDeAnoNovo.toISOString().slice(0, 10)).not.toBe('2026-12-31')
  })

  it('a volta cai ao MEIO-DIA, longe de salto de horario de verao', () => {
    // Meia-noite pode nao existir (ou existir duas vezes) na madrugada de
    // transicao, e o `Date` pula para o dia vizinho. Meio-dia nao corre risco.
    const d = daDataLocal('2026-10-18')
    expect(d.getHours()).toBe(12)
    expect(comoDataLocal(d)).toBe('2026-10-18')
  })

  it('ida e volta e fiel para todo dia de um ano', () => {
    // Varredura em vez de tres casos: se algum dia do ano quebrar por fuso, e
    // este teste que acha, e nao o professor.
    for (let i = 0; i < 365; i++) {
      const d = new Date(2026, 0, 1 + i, 12, 0, 0)
      expect(comoDataLocal(daDataLocal(comoDataLocal(d)))).toBe(comoDataLocal(d))
    }
  })
})

describe('id do slot', () => {
  it('e local e legivel, sem dois-pontos', () => {
    // Sem `:` porque vira id de documento no Firestore, e pontuacao exotica em
    // id e fonte de bug que so aparece no deploy.
    expect(idDoSlot('2026-09-08', '08:00')).toBe('2026-09-08T0800')
    expect(idDoSlot('2026-09-08', '19:00')).toBe('2026-09-08T1900')
  })

  it('desmonta de volta', () => {
    expect(partesDoSlot('2026-09-08T1900')).toEqual({ data: '2026-09-08', inicio: '19:00' })
  })

  it('recusa o que nao e slot em vez de adivinhar', () => {
    // Um campo vazio ou lixo vindo do banco nao pode virar uma data plausivel.
    for (const lixo of ['', 'ontem', '2026-09-08', '2026-09-08T08:00', 'x'])
      expect(partesDoSlot(lixo)).toBeNull()
  })
})

describe('a semana', () => {
  it('comeca no DOMINGO — convencao do calendario brasileiro', () => {
    // 08/09/2026 e uma terca. O domingo dela e 06/09.
    expect(comoDataLocal(domingoDaSemana(new Date(2026, 8, 8, 12)))).toBe('2026-09-06')
  })

  it('domingo e o proprio domingo, e nao a semana anterior', () => {
    expect(comoDataLocal(domingoDaSemana(new Date(2026, 8, 6, 12)))).toBe('2026-09-06')
  })

  it('sao sete dias, de domingo a sabado', () => {
    const dias = diasDaSemana(domingoDaSemana(new Date(2026, 8, 8, 12)))
    expect(dias).toHaveLength(7)
    expect(dias.map((d) => d.getDay())).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(comoDataLocal(dias[6])).toBe('2026-09-12')
  })

  it('atravessa a virada do mes sem perder dia', () => {
    const dias = diasDaSemana(domingoDaSemana(new Date(2026, 8, 30, 12)))
    expect(comoDataLocal(dias[0])).toBe('2026-09-27')
    expect(comoDataLocal(dias[6])).toBe('2026-10-03')
  })

  it('rotulo muda de forma quando a semana cruza o mes', () => {
    expect(rotuloDaSemana(new Date(2026, 8, 6, 12))).toContain('setembro')
    expect(rotuloDaSemana(new Date(2026, 8, 27, 12))).toMatch(/set.*out/)
  })
})

describe('limite da paginacao', () => {
  it('o fim do ano e DERIVADO da data de hoje', () => {
    // Cravar '2026-12-31' estaria errado em 1o de janeiro, e o sintoma seria a
    // paginacao travada no passado.
    expect(comoDataLocal(fimDoAno(new Date(2026, 8, 8, 12)))).toBe('2026-12-31')
    expect(comoDataLocal(fimDoAno(new Date(2027, 2, 1, 12)))).toBe('2027-12-31')
  })

  it('conta as semanas de hoje ate o fim do ano', () => {
    // De 08/09 a 31/12/2026: o professor tem ~17 semanas de paginacao.
    const n = semanasEntre(new Date(2026, 8, 8, 12), fimDoAno(new Date(2026, 8, 8, 12)))
    expect(n).toBeGreaterThan(15)
    expect(n).toBeLessThan(20)
  })

  it('fim antes do inicio devolve 0, e nao numero negativo', () => {
    // Negativo faria a tela oferecer paginas para tras do limite.
    expect(semanasEntre(new Date(2026, 11, 1, 12), new Date(2026, 8, 1, 12))).toBe(0)
  })

  it('mesma semana conta 1', () => {
    expect(semanasEntre(new Date(2026, 8, 8, 12), new Date(2026, 8, 10, 12))).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Os slots de uma turma
// ---------------------------------------------------------------------------

describe('slotsDaSemana', () => {
  const domingo = new Date(2026, 8, 6, 12) // 06/09/2026
  const hoje = new Date(2026, 8, 8, 12) // terca

  it('a RGI tem dois slots na semana: terca e quinta, 8h', () => {
    const slots = slotsDaSemana({ turma: 'RGI', domingo, agenda: new Map(), hoje })
    expect(slots.map((s) => `${s.data} ${s.inicio}`)).toEqual([
      '2026-09-08 08:00',
      '2026-09-10 08:00',
    ])
  })

  it('a RGA tem os mesmos dias as 19h', () => {
    const slots = slotsDaSemana({ turma: 'RGA', domingo, agenda: new Map(), hoje })
    expect(slots.every((s) => s.inicio === '19:00' && s.fim === '20:00')).toBe(true)
    expect(slots).toHaveLength(2)
  })

  it('turma SEM horario devolve lista vazia, e nao uma semana em branco', () => {
    // A tela diz "esta turma nao tem horario" em vez de mostrar sete dias vazios
    // que parecem defeito.
    expect(slotsDaSemana({ turma: 'RG3', domingo, agenda: new Map(), hoje })).toEqual([])
    expect(horariosDaTurma('RG3')).toEqual([])
  })

  it('mostra qual aula esta em cada slot', () => {
    const agenda = new Map([['2026-09-10T0800', 7]])
    const slots = slotsDaSemana({ turma: 'RGI', domingo, agenda, hoje })
    expect(slots.find((s) => s.data === '2026-09-08')?.aula).toBeNull()
    expect(slots.find((s) => s.data === '2026-09-10')?.aula).toBe(7)
  })

  it('marca o que PASSOU, e o slot de hoje NAO e passado', () => {
    /**
     * Compara texto `YYYY-MM-DD`, e nao `Date`. Comparar instantes obrigaria a
     * decidir a hora de "hoje", e o slot das 8h ficaria "passado" as 14h do
     * mesmo dia — quando o professor ainda quer marcar a aula que ele deu.
     */
    const slots = slotsDaSemana({ turma: 'RGI', domingo, agenda: new Map(), hoje })
    expect(slots.find((s) => s.data === '2026-09-08')?.passado).toBe(false)
    const antes = slotsDaSemana({
      turma: 'RGI',
      domingo,
      agenda: new Map(),
      hoje: new Date(2026, 8, 11, 12),
    })
    expect(antes.every((s) => s.passado)).toBe(true)
  })

  it('ordena por dia e depois por HORA', () => {
    // Uma turma com manha e noite no mesmo dia precisa sair na ordem do relogio.
    const slots = slotsDaSemana({
      turma: 'X',
      domingo,
      agenda: new Map(),
      hoje,
      horarios: [
        { diaDaSemana: 2, inicio: '19:00', fim: '20:00' },
        { diaDaSemana: 2, inicio: '08:00', fim: '09:00' },
      ],
    })
    expect(slots.map((s) => s.inicio)).toEqual(['08:00', '19:00'])
  })
})

// ---------------------------------------------------------------------------
// A ponte aula <-> slot
// ---------------------------------------------------------------------------

describe('agendaDoPrograma', () => {
  it('mapeia slot para aula', () => {
    const m = agendaDoPrograma([aula(1, '2026-09-08T0800'), aula(2, '2026-09-10T0800'), aula(3)])
    expect(m.get('2026-09-08T0800')).toBe(1)
    expect(m.get('2026-09-10T0800')).toBe(2)
    expect(m.size).toBe(2)
  })

  it('duas aulas no mesmo slot: ganha a de MENOR numero, e o desempate e estavel', () => {
    /**
     * Nao deveria acontecer — a tela impede — mas o dado vem do Firestore e pode
     * ter sido editado a mao, ou gravado por duas abas ao mesmo tempo.
     *
     * O desempate NAO PODE depender da ordem de leitura: se dependesse, duas
     * abas mostrariam aulas diferentes no mesmo slot e nenhuma das duas estaria
     * "errada". Menor numero e arbitrario e IGUAL em todo lugar.
     */
    const ordemA = agendaDoPrograma([aula(9, '2026-09-08T0800'), aula(4, '2026-09-08T0800')])
    const ordemB = agendaDoPrograma([aula(4, '2026-09-08T0800'), aula(9, '2026-09-08T0800')])
    expect(ordemA.get('2026-09-08T0800')).toBe(4)
    expect(ordemB.get('2026-09-08T0800')).toBe(4)
  })

  it('slotPorAula e a volta', () => {
    const m = slotPorAula([aula(1, '2026-09-08T0800'), aula(2)])
    expect(m.get(1)).toBe('2026-09-08T0800')
    expect(m.has(2)).toBe(false)
  })
})

describe('proximaAulaSemData', () => {
  it('sem nada agendado, e a aula 1', () => {
    expect(proximaAulaSemData([])).toBe(1)
  })

  it('NAO e a aula 00 — a experimental nao entra na sequencia', () => {
    // Ela e presencial e dada antes do programa. Agendar a 00 poria a defesa
    // pessoal na primeira terca do calendario.
    expect(proximaAulaSemData([])).not.toBe(0)
  })

  it('PREENCHE O BURACO em vez de seguir do fim', () => {
    /**
     * Com 1, 2 e 5 agendadas, a proxima e a 3 — nao a 6.
     *
     * Buraco na sequencia e mais provavel de ser esquecimento do que intencao, e
     * pular o buraco faria a aula 3 nunca acontecer sem ninguem notar. E o gate
     * do 1o grau depende de as 35 terem sido dadas.
     */
    const aulas = [aula(1, '2026-09-08T0800'), aula(2, '2026-09-10T0800'), aula(5, '2026-09-15T0800')]
    expect(proximaAulaSemData(aulas)).toBe(3)
  })

  it('com todas as 80 agendadas devolve null', () => {
    const todas = Array.from({ length: 80 }, (_, i) => aula(i + 1, `2026-01-01T08${String(i).padStart(2, '0')}`))
    expect(proximaAulaSemData(todas)).toBeNull()
  })

  it('aula sem slot conta como sem data, mesmo estando na lista', () => {
    expect(proximaAulaSemData([aula(1), aula(2, '2026-09-10T0800')])).toBe(1)
  })
})

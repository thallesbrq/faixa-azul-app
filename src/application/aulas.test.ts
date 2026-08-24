import { describe, expect, it } from 'vitest'
import {
  MINUTOS_ITEM_CRU,
  MINUTOS_ITEM_DOMINADO,
  MINUTOS_POR_AULA,
  MINUTOS_REPESCAGEM,
  custoEmMinutos,
  gerarPlano,
  pautaDaAula,
  repescagensPendentes,
  saldoDoPacote,
} from './aulas'
import type { ProgressoDeItem } from './progresso'
import type { AulaParticular, TechniqueItem, ValidacaoDoProfessor } from '../domain/types'

function item(over: Partial<TechniqueItem> = {}): TechniqueItem {
  return {
    id: 'i1',
    moduloId: 'mod-guardas',
    posicao: 'Guarda Fechada',
    slot: 'Raspada 1',
    categoria: 'Raspadas',
    nome: 'Tesoura',
    aliases: [],
    kind: 'raspagem',
    sideMode: 'nao_se_aplica',
    safetyLevel: 'baixo',
    validationStatus: 'sugestao_nao_validada',
    sourceReference: 'Seção 4',
    ativo: true,
    ...over,
  }
}

function prog(over: Partial<ProgressoDeItem> & { item: TechniqueItem }): ProgressoDeItem {
  return {
    dominio: 'nao_iniciado',
    pontuacao: 0,
    validado: false,
    totalCartoes: 3,
    ...over,
  }
}

/** n itens de guarda numa posicao, mais m saidas. */
function curriculo(guardas: number, saidas: number, pontuacao = 0): ProgressoDeItem[] {
  const g = Array.from({ length: guardas }, (_, i) =>
    prog({ item: item({ id: `g${i}`, slot: `Guarda ${i}`, posicao: `Posicao ${i % 4}` }), pontuacao }),
  )
  const s = Array.from({ length: saidas }, (_, i) =>
    prog({
      item: item({ id: `s${i}`, slot: `Saida ${i}`, moduloId: 'mod-saidas', posicao: `Saida ${i}` }),
      pontuacao,
    }),
  )
  return [...g, ...s]
}

describe('custoEmMinutos', () => {
  it('item cru custa mais que item dominado', () => {
    expect(custoEmMinutos(0)).toBe(MINUTOS_ITEM_CRU)
    expect(custoEmMinutos(1)).toBe(MINUTOS_ITEM_DOMINADO)
    expect(custoEmMinutos(0)).toBeGreaterThan(custoEmMinutos(1))
  })

  it('e monotonico no dominio', () => {
    // Nao pode existir ponto em que estudar mais aumente o custo da aula.
    for (let d = 0; d < 1; d += 0.1) {
      expect(custoEmMinutos(d + 0.1)).toBeLessThanOrEqual(custoEmMinutos(d))
    }
  })

  it('repescagem e barata e independe do dominio', () => {
    // Base da decisao 3: repescagem cabe na reserva justamente por ser barata.
    expect(custoEmMinutos(0, true)).toBe(MINUTOS_REPESCAGEM)
    expect(custoEmMinutos(1, true)).toBe(MINUTOS_REPESCAGEM)
    expect(MINUTOS_REPESCAGEM).toBeLessThan(MINUTOS_ITEM_DOMINADO)
  })

  it('trata dominio fora da faixa sem explodir', () => {
    expect(custoEmMinutos(-5)).toBe(MINUTOS_ITEM_CRU)
    expect(custoEmMinutos(99)).toBe(MINUTOS_ITEM_DOMINADO)
  })
})

describe('gerarPlano', () => {
  it('cobre TODOS os itens — nada fica fora do pacote', () => {
    const progresso = curriculo(48, 8)
    const plano = gerarPlano({ progresso })
    const noPlano = plano.aulas.flatMap((a) => a.itens)
    expect(noPlano).toHaveLength(progresso.length)
    expect(plano.foraDoPlano).toEqual([])
  })

  it('distribui o mais igualmente possivel — diferenca maxima de 1 item', () => {
    // 56 em 10 nao divide exato (5,6), entao "igual" de verdade nao existe: o
    // mais proximo e seis aulas de 6 e quatro de 5.
    const plano = gerarPlano({ progresso: curriculo(48, 8) })
    const tamanhos = plano.aulas.map((a) => a.itens.length)
    expect(Math.max(...tamanhos) - Math.min(...tamanhos)).toBeLessThanOrEqual(1)
    expect(tamanhos.filter((n) => n === 6)).toHaveLength(6)
    expect(tamanhos.filter((n) => n === 5)).toHaveLength(4)
  })

  it('as aulas mais cheias ficam no fim, onde o item custa menos', () => {
    const tamanhos = gerarPlano({ progresso: curriculo(48, 8) }).aulas.map((a) => a.itens.length)
    expect(tamanhos[0]).toBeLessThanOrEqual(tamanhos[tamanhos.length - 1])
  })

  it('os minutos DESCREVEM a aula, nao a limitam', () => {
    // 6 itens crus pedem 72 min e a aula tem 60. O plano nao encolhe por isso —
    // cortar em silencio esconderia justamente o dado que o aluno precisa levar
    // ao professor.
    const plano = gerarPlano({ progresso: curriculo(48, 8, 0) })
    expect(plano.aulas.some((a) => a.minutosEstimados > MINUTOS_POR_AULA)).toBe(true)
  })

  it('com dominio suficiente, nenhuma aula estoura os 60 min', () => {
    // Limiar calculado: dominio medio 0,29 para a aula de 6 itens caber.
    const plano = gerarPlano({ progresso: curriculo(48, 8, 0.5) })
    for (const a of plano.aulas) {
      expect(a.minutosEstimados).toBeLessThanOrEqual(MINUTOS_POR_AULA)
    }
  })

  it('nao repete nem perde item entre plano e fora do plano', () => {
    const progresso = curriculo(48, 8)
    const plano = gerarPlano({ progresso })
    const noPlano = plano.aulas.flatMap((a) => a.itens.map((i) => i.id))
    const todos = [...noPlano, ...plano.foraDoPlano.map((i) => i.id)]

    expect(new Set(noPlano).size).toBe(noPlano.length)
    expect(new Set(todos).size).toBe(progresso.length)
  })

  it('coloca uma saida na aula 1 — saidas nao ficam para o fim', () => {
    // Decisao registrada no calendario v3: saida em toda aula desde a primeira.
    const plano = gerarPlano({ progresso: curriculo(48, 8) })
    const primeirasCinco = plano.aulas.slice(0, 5)
    for (const a of primeirasCinco) {
      expect(a.itens.some((i) => i.moduloId === 'mod-saidas')).toBe(true)
    }
  })

  it('a reserva de repescagem nao participa mais da geracao', () => {
    // Ela virou apenas a folga esperada ao julgar se a pauta do dia estourou.
    // Se ainda encolhesse a aula 1, o total coberto seria menor que o curriculo.
    const progresso = curriculo(48, 8)
    const plano = gerarPlano({ progresso })
    expect(plano.aulas.flatMap((a) => a.itens)).toHaveLength(progresso.length)
  })

  it('estudar encurta as aulas; a cobertura ja era total nos dois casos', () => {
    const cru = gerarPlano({ progresso: curriculo(48, 8, 0) })
    const estudado = gerarPlano({ progresso: curriculo(48, 8, 0.8) })

    expect(estudado.minutosDeConteudo).toBeLessThan(cru.minutosDeConteudo)
    expect(cru.foraDoPlano).toEqual([])
    expect(estudado.foraDoPlano).toEqual([])
  })

  it('com menos aulas que saidas, as saidas excedentes sobram — e aparecem', () => {
    // Consequencia da regra "uma saida por aula": com 4 aulas para 8 saidas, so
    // 4 saidas tem vez e as outras 4 nao entram. Nao e perda silenciosa — elas
    // saem em foraDoPlano, e a conta sempre fecha. Com o pacote real (10 aulas,
    // 8 saidas) isso nao acontece.
    const progresso = curriculo(48, 8)
    const plano = gerarPlano({ progresso, totalAulas: 4 })
    const cobertos = plano.aulas.flatMap((a) => a.itens).length

    expect(plano.foraDoPlano).toHaveLength(4)
    expect(plano.foraDoPlano.every((i) => i.moduloId === 'mod-saidas')).toBe(true)
    expect(cobertos + plano.foraDoPlano.length).toBe(progresso.length)
  })

  it('curriculo vazio nao quebra', () => {
    const plano = gerarPlano({ progresso: [] })
    expect(plano.aulas).toHaveLength(10)
    expect(plano.aulas.every((a) => a.itens.length === 0)).toBe(true)
    expect(plano.foraDoPlano).toEqual([])
  })
})

describe('pautaDaAula', () => {
  const progresso = [
    prog({ item: item({ id: 'a' }), pontuacao: 0.9 }),
    prog({ item: item({ id: 'b' }), pontuacao: 0 }),
    prog({ item: item({ id: 'c' }), pontuacao: 0.5 }),
  ]
  const aula = {
    numero: 3,
    itens: [item({ id: 'b' }), item({ id: 'c' })],
    posicoes: ['Guarda Fechada'],
    minutosEstimados: 20,
  }

  it('repescagem vem antes do planejado', () => {
    const { linhas } = pautaDaAula({
      aula,
      repescagens: [{ itemId: 'a', corrigidoNaAula: 2 }],
      progresso,
    })
    expect(linhas[0].item.id).toBe('a')
    expect(linhas[0].repescagem).toBe(true)
    expect(linhas[0].corrigidoNaAula).toBe(2)
    expect(linhas.slice(1).every((l) => !l.repescagem)).toBe(true)
  })

  it('duas repescagens cabem na aula — e a aposta da reserva', () => {
    const { estourou } = pautaDaAula({
      aula,
      repescagens: [
        { itemId: 'a', corrigidoNaAula: 2 },
        { itemId: 'c', corrigidoNaAula: 2 },
      ],
      progresso,
    })
    expect(estourou).toBe(false)
  })

  it('avisa quando a repescagem acumulada nao cabe', () => {
    const muitos = Array.from({ length: 12 }, (_, i) => prog({ item: item({ id: `x${i}` }) }))
    const { estourou } = pautaDaAula({
      aula: { ...aula, itens: muitos.slice(0, 3).map((p) => p.item) },
      repescagens: muitos.map((p) => ({ itemId: p.item.id, corrigidoNaAula: 2 })),
      progresso: muitos,
    })
    expect(estourou).toBe(true)
  })

  it('ignora repescagem de item que nao existe mais no curriculo', () => {
    const { linhas } = pautaDaAula({
      aula,
      repescagens: [{ itemId: 'fantasma', corrigidoNaAula: 1 }],
      progresso,
    })
    expect(linhas.every((l) => !l.repescagem)).toBe(true)
  })
})

describe('saldoDoPacote', () => {
  function aulas(realizadas: number, total = 10): AulaParticular[] {
    return Array.from({ length: total }, (_, i) => ({
      numero: i + 1,
      tema: '',
      foco: '',
      itemIds: [],
      realizadaEm: i < realizadas ? '2026-09-01T00:00:00.000Z' : undefined,
    }))
  }

  it('conta realizadas e restantes', () => {
    const s = saldoDoPacote(aulas(3), curriculo(10, 2))
    expect(s.realizadas).toBe(3)
    expect(s.restantes).toBe(7)
  })

  it('acusa deficit quando o tempo restante nao cobre o que falta validar', () => {
    // 3 aulas restantes = 150 min; 40 itens crus = 480 min.
    const s = saldoDoPacote(aulas(7), curriculo(40, 0))
    expect(s.deficit).toBeGreaterThan(0)
    expect(s.minutosNecessarios).toBeGreaterThan(s.minutosRestantes)
  })

  it('nao acusa deficit quando cabe', () => {
    const s = saldoDoPacote(aulas(0), curriculo(20, 0, 1))
    expect(s.deficit).toBe(0)
  })

  it('itens validados nao contam como pendentes', () => {
    const progresso = curriculo(10, 0).map((p, i) => ({ ...p, validado: i < 6 }))
    const s = saldoDoPacote(aulas(0), progresso)
    expect(s.naoValidados).toBe(4)
  })
})

describe('corte por nivel de avanco', () => {
  /** Curriculo com uma posicao avancada no MEIO da lista, para provar que a
   *  ordem de entrada nao e o que decide o corte. */
  function comAvancado(quantosBasicos: number): ProgressoDeItem[] {
    const basico = Array.from({ length: quantosBasicos }, (_, i) =>
      prog({ item: item({ id: `g${i}`, slot: `G${i}`, posicao: `Posicao ${i % 4}` }) }),
    )
    const avancado = Array.from({ length: 8 }, (_, i) =>
      prog({
        item: item({
          id: `cm${i}`,
          slot: `CM${i}`,
          posicao: 'Complexo Moderno (One Leg, 50-50, Guarda X, Berimbolo)',
        }),
      }),
    )
    const meio = Math.floor(quantosBasicos / 2)
    return [...basico.slice(0, meio), ...avancado, ...basico.slice(meio)]
  }

  /**
   * Nao existe mais teste de "o avancado e o primeiro a ser CORTADO": com
   * cobertura total nada e cortado, porque a distribuicao aloca todos os itens
   * por construcao. O que sobrou da decisao do aluno — e o que ainda vale
   * garantir — e que o avancado fique nas ULTIMAS aulas.
   */
  it('o avancado fica nas ultimas aulas, nunca no comeco', () => {
    const plano = gerarPlano({ progresso: comAvancado(48) })
    const primeiraComAvancado = plano.aulas.findIndex((a) =>
      a.itens.some((i) => i.posicao.startsWith('Complexo Moderno')),
    )
    const ultimaComBasico = plano.aulas.reduce(
      (max, a, i) => (a.itens.some((x) => !x.posicao.startsWith('Complexo Moderno')) ? i : max),
      -1,
    )
    expect(primeiraComAvancado).toBeGreaterThan(-1)
    // O avancado comeca depois de metade do pacote, e nunca antes do basico.
    expect(primeiraComAvancado).toBeGreaterThanOrEqual(plano.aulas.length / 2)
    expect(primeiraComAvancado).toBeGreaterThanOrEqual(ultimaComBasico - 1)
  })

  it('o avancado entra nas ULTIMAS aulas quando cabe', () => {
    const estudado = comAvancado(34).map((p) => ({ ...p, pontuacao: 1 }))
    const plano = gerarPlano({ progresso: estudado })
    expect(plano.foraDoPlano).toHaveLength(0)

    // A propriedade que importa nao e "aula numero tal" — isso muda com o
    // dominio, porque item dominado custa menos e cabem mais por aula. E que
    // TODO o basico vem antes de qualquer avancado.
    const guardas = plano.aulas
      .flatMap((a) => a.itens)
      .filter((i) => i.moduloId === 'mod-guardas')
    const primeiroAvancado = guardas.findIndex((i) => i.posicao.startsWith('Complexo Moderno'))

    expect(primeiroAvancado).toBeGreaterThan(-1)
    expect(guardas.slice(primeiroAvancado).every((i) => i.posicao.startsWith('Complexo Moderno'))).toBe(
      true,
    )
  })
})

describe('repescagensPendentes', () => {
  function v(over: Partial<ValidacaoDoProfessor>): ValidacaoDoProfessor {
    return {
      id: 'v1',
      itemId: 'i1',
      texto: 'joelho mais alto',
      novoStatus: 'aguardando_validacao',
      origem: 'aula_particular',
      aulaNumero: 2,
      registradaEm: '2026-09-01T00:00:00.000Z',
      ...over,
    }
  }

  it('item corrigido e ainda nao executado entra na fila', () => {
    const fila = repescagensPendentes([v({ itemId: 'a' })])
    expect(fila).toEqual([{ itemId: 'a', corrigidoNaAula: 2 }])
  })

  it('item ja validado NAO entra', () => {
    const fila = repescagensPendentes([v({ itemId: 'a', novoStatus: 'validado_pelo_professor' })])
    expect(fila).toEqual([])
  })

  it('vence o registro mais recente do item', () => {
    // Corrigido na aula 2, mostrado e aprovado na aula 3: sai da fila.
    const fila = repescagensPendentes([
      v({ id: 'v1', itemId: 'a', aulaNumero: 2, registradaEm: '2026-09-01T00:00:00.000Z' }),
      v({
        id: 'v2',
        itemId: 'a',
        aulaNumero: 3,
        novoStatus: 'validado_pelo_professor',
        registradaEm: '2026-09-08T00:00:00.000Z',
      }),
    ])
    expect(fila).toEqual([])
  })

  it('ignora correcao de aula regular — repescagem e do pacote', () => {
    // Sem aulaNumero nao ha aula particular onde reencaixar o item.
    const fila = repescagensPendentes([
      v({ itemId: 'a', origem: 'aula_regular', aulaNumero: undefined, sessionId: 's1' }),
    ])
    expect(fila).toEqual([])
  })

  it('ordena pela aula em que foi corrigido — o mais antigo espera menos', () => {
    const fila = repescagensPendentes([
      v({ id: 'v1', itemId: 'a', aulaNumero: 5 }),
      v({ id: 'v2', itemId: 'b', aulaNumero: 2 }),
    ])
    expect(fila.map((r) => r.itemId)).toEqual(['b', 'a'])
  })
})

describe('dificuldade marcada pelo aluno', () => {
  it('difícil custa mais minutos que médio, e fácil menos', () => {
    expect(custoEmMinutos(0, false, 'dificil')).toBeGreaterThan(custoEmMinutos(0, false, 'medio'))
    expect(custoEmMinutos(0, false, 'facil')).toBeLessThan(custoEmMinutos(0, false, 'medio'))
  })

  it('sem marcacao reproduz exatamente o calculo anterior ao campo existir', () => {
    // Garantia de compatibilidade: quem nunca marcou nada ve os mesmos numeros.
    for (const d of [0, 0.5, 1]) {
      expect(custoEmMinutos(d)).toBe(custoEmMinutos(d, false, 'medio'))
    }
    expect(custoEmMinutos(0)).toBe(MINUTOS_ITEM_CRU)
  })

  it('o fator vale para repescagem tambem — regra sem excecao', () => {
    expect(custoEmMinutos(0, true, 'dificil')).toBeGreaterThan(custoEmMinutos(0, true, 'medio'))
    expect(custoEmMinutos(0, true, 'medio')).toBe(MINUTOS_REPESCAGEM)
  })

  it('marcar tudo como dificil encarece o pacote', () => {
    // E o ponto pratico do campo: o aluno pode marcar isso HOJE, antes de
    // estudar, e o "cabe / nao cabe" das 10 aulas ja fica mais honesto.
    const progresso = curriculo(48, 8)
    const facil = new Map(progresso.map((p) => [p.item.id, 'facil' as const]))
    const dificil = new Map(progresso.map((p) => [p.item.id, 'dificil' as const]))

    const planoFacil = gerarPlano({ progresso, dificuldades: facil })
    const planoDificil = gerarPlano({ progresso, dificuldades: dificil })

    // A dificuldade encarece as aulas; ela nao mexe na cobertura, que e total.
    expect(planoDificil.minutosDeConteudo).toBeGreaterThan(planoFacil.minutosDeConteudo)
    expect(planoDificil.foraDoPlano).toEqual([])
    expect(planoFacil.foraDoPlano).toEqual([])
  })

  it('tudo dificil e cru estoura a aula, e isso fica VISIVEL', () => {
    // O estouro nao e bug: e o aviso de que itens crus e dificeis nao caberao na
    // aula, e de que essa conversa e com o professor.
    const progresso = curriculo(48, 8)
    const dificil = new Map(progresso.map((p) => [p.item.id, 'dificil' as const]))
    const plano = gerarPlano({ progresso, dificuldades: dificil })
    expect(plano.foraDoPlano).toEqual([])
    expect(plano.aulas.some((a) => a.minutosEstimados > MINUTOS_POR_AULA)).toBe(true)
  })

  it('saldo do pacote reflete a dificuldade marcada', () => {
    const progresso = curriculo(20, 0)
    const aulas: AulaParticular[] = Array.from({ length: 10 }, (_, i) => ({
      numero: i + 1,
      tema: '',
      foco: '',
      itemIds: [],
    }))
    const dificil = new Map(progresso.map((p) => [p.item.id, 'dificil' as const]))

    const semMarca = saldoDoPacote(aulas, progresso)
    const comMarca = saldoDoPacote(aulas, progresso, MINUTOS_POR_AULA, dificil)
    expect(comMarca.minutosNecessarios).toBeGreaterThan(semMarca.minutosNecessarios)
  })
})

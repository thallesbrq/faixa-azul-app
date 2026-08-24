import { describe, expect, it } from 'vitest'
import {
  ITENS_POR_AULA,
  MINUTOS_ITEM_CRU,
  MINUTOS_ITEM_DOMINADO,
  MINUTOS_POR_AULA,
  MINUTOS_REPESCAGEM,
  auloesDoPacote,
  custoEmMinutos,
  escolherExcedente,
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
  it('toda aula tem exatamente ITENS_POR_AULA itens', () => {
    const plano = gerarPlano({ progresso: curriculo(48, 8) })
    for (const a of plano.aulas) {
      expect(a.itens).toHaveLength(ITENS_POR_AULA)
    }
  })

  it('cobre 50 dos 56; a sobra vai para o aulao, nao para o lixo', () => {
    // Decisao do aluno: respeitar os 60 minutos e mandar o excedente para os
    // auloes de revisao da turma. A sobra deixou de ser buraco no preparo.
    const progresso = curriculo(48, 8)
    const plano = gerarPlano({ progresso })
    const cobertos = plano.aulas.flatMap((a) => a.itens).length

    expect(cobertos).toBe(10 * ITENS_POR_AULA)
    expect(plano.foraDoPlano).toHaveLength(progresso.length - cobertos)
    expect(cobertos + plano.foraDoPlano.length).toBe(progresso.length)
  })

  it('cinco itens crus dao exatos 60 minutos — no limite, sem folga', () => {
    // E a razao de serem cinco. Um sexto item cru levaria a 72.
    const plano = gerarPlano({ progresso: curriculo(48, 8, 0) })
    for (const a of plano.aulas) {
      expect(a.minutosEstimados).toBe(MINUTOS_POR_AULA)
    }
  })

  it('estudar sobra tempo na aula, em vez de encolher a pauta', () => {
    const cru = gerarPlano({ progresso: curriculo(48, 8, 0) })
    const estudado = gerarPlano({ progresso: curriculo(48, 8, 0.5) })

    expect(estudado.aulas[0].itens).toHaveLength(ITENS_POR_AULA)
    expect(estudado.aulas[0].minutosEstimados).toBeLessThan(cru.aulas[0].minutosEstimados)
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

  it('a reserva de repescagem nao participa da geracao — todas as aulas iguais', () => {
    const plano = gerarPlano({ progresso: curriculo(48, 8) })
    const tamanhos = new Set(plano.aulas.map((a) => a.itens.length))
    expect([...tamanhos]).toEqual([ITENS_POR_AULA])
  })

  it('a conta sempre fecha, com qualquer numero de aulas', () => {
    for (const totalAulas of [1, 4, 10, 14]) {
      const progresso = curriculo(48, 8)
      const plano = gerarPlano({ progresso, totalAulas })
      const cobertos = plano.aulas.flatMap((a) => a.itens).length
      expect(cobertos + plano.foraDoPlano.length).toBe(progresso.length)
    }
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

describe('corte por profundidade, nao por largura', () => {
  /**
   * Curriculo com posicoes de tamanhos bem diferentes, como o real: uma grande
   * (11), duas medias (8) e varias pequenas.
   */
  function desigual(): ProgressoDeItem[] {
    const tamanhos: [string, number][] = [
      ['Guarda Fechada', 11],
      ['Meia Guarda', 8],
      ['Complexo Moderno (One Leg, 50-50, Guarda X, Berimbolo)', 8],
      ['Guarda Aranha', 5],
      ['Guarda Dela Riva', 5],
      ['Guarda Gancho', 4],
      ['Guarda Aberta', 4],
      ['Guarda Laco', 3],
    ]
    const guardas = tamanhos.flatMap(([pos, n]) =>
      Array.from({ length: n }, (_, k) =>
        prog({ item: item({ id: `${pos}-${k}`, slot: `${pos} ${k}`, posicao: pos }) }),
      ),
    )
    const saidas = Array.from({ length: 8 }, (_, i) =>
      prog({
        item: item({ id: `s${i}`, slot: `Saida ${i}`, moduloId: 'mod-saidas', posicao: `Saida ${i}` }),
      }),
    )
    return [...guardas, ...saidas]
  }

  const posicoesDe = (itens: TechniqueItem[]) => new Set(itens.map((i) => i.posicao))

  it('NENHUMA posicao fica inteira de fora', () => {
    // E a propriedade central da regra: corta profundidade, preserva largura.
    // Antes, uma posicao inteira (o Complexo Moderno) saia do plano.
    const progresso = desigual()
    const plano = gerarPlano({ progresso })
    const noPlano = posicoesDe(plano.aulas.flatMap((a) => a.itens))
    const todas = posicoesDe(progresso.map((p) => p.item))

    for (const pos of todas) {
      expect(noPlano.has(pos), `posicao "${pos}" ficou inteira de fora`).toBe(true)
    }
  })

  it('o Complexo Moderno entra nas aulas particulares', () => {
    // Decisao do aluno depois de o professor confirmar que a prova cobra.
    const plano = gerarPlano({ progresso: desigual() })
    const doComplexo = plano.aulas
      .flatMap((a) => a.itens)
      .filter((i) => i.posicao.startsWith('Complexo Moderno'))
    expect(doComplexo.length).toBeGreaterThan(0)
  })

  it('o Complexo Moderno mantem o espacamento do circulo', () => {
    // A regra antiga o tirava do circulo. Agora ele e tratado como qualquer
    // outra posicao: duas passagens, afastadas.
    const plano = gerarPlano({ progresso: desigual() })
    const aulasComComplexo = plano.aulas
      .map((a, idx) => (a.itens.some((i) => i.posicao.startsWith('Complexo Moderno')) ? idx : -1))
      .filter((idx) => idx >= 0)

    expect(aulasComComplexo.length).toBeGreaterThan(1)
    const distancia = aulasComComplexo[aulasComComplexo.length - 1] - aulasComComplexo[0]
    expect(distancia).toBeGreaterThan(1)
  })

  it('o corte sai das posicoes MAIORES', () => {
    const progresso = desigual()
    const plano = gerarPlano({ progresso })
    const fora = plano.foraDoPlano.filter((i) => i.moduloId === 'mod-guardas')

    // As tres maiores sao Guarda Fechada (11), Meia Guarda (8) e Complexo (8).
    const grandes = ['Guarda Fechada', 'Meia Guarda', 'Complexo Moderno']
    expect(fora.length).toBeGreaterThan(0)
    for (const i of fora) {
      expect(grandes.some((g) => i.posicao.startsWith(g)), `cortou de "${i.posicao}"`).toBe(true)
    }
  })

  it('a posicao mais cheia cede primeiro', () => {
    const porPosicao = new Map<string, TechniqueItem[]>([
      ['grande', Array.from({ length: 5 }, (_, k) => item({ id: `g${k}`, posicao: 'grande' }))],
      ['pequena', [item({ id: 'p0', posicao: 'pequena' })]],
    ])
    const fora = escolherExcedente(porPosicao, 2)
    expect([...fora]).toEqual(['g4', 'g3'])
  })

  it('nunca corta uma posicao a ponto de zerar quando ha maior disponivel', () => {
    const porPosicao = new Map<string, TechniqueItem[]>([
      ['grande', Array.from({ length: 6 }, (_, k) => item({ id: `g${k}`, posicao: 'grande' }))],
      ['pequena', [item({ id: 'p0', posicao: 'pequena' })]],
    ])
    const fora = escolherExcedente(porPosicao, 3)
    expect(fora.has('p0')).toBe(false)
  })

  it('as saidas nunca entram no corte', () => {
    // A Secao 5 inteira tem 8 itens; tirar dela seria cortar largura.
    const plano = gerarPlano({ progresso: desigual() })
    expect(plano.foraDoPlano.every((i) => i.moduloId !== 'mod-saidas')).toBe(true)
  })

  it('e deterministico — o mesmo plano em execucoes repetidas', () => {
    const progresso = desigual()
    const a = gerarPlano({ progresso }).foraDoPlano.map((i) => i.id)
    const b = gerarPlano({ progresso }).foraDoPlano.map((i) => i.id)
    expect(a).toEqual(b)
  })

  it('pedir zero excedente nao corta nada', () => {
    const porPosicao = new Map([['x', [item({ id: 'x0' })]]])
    expect(escolherExcedente(porPosicao, 0).size).toBe(0)
    expect(escolherExcedente(porPosicao, -3).size).toBe(0)
  })

  it('pedir mais excedente do que existe nao quebra', () => {
    const porPosicao = new Map([['x', [item({ id: 'x0' })]]])
    expect(escolherExcedente(porPosicao, 99).size).toBe(1)
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

    // A dificuldade encarece as aulas; ela nao mexe em QUANTOS itens entram,
    // porque a contagem por aula e fixa.
    expect(planoDificil.minutosDeConteudo).toBeGreaterThan(planoFacil.minutosDeConteudo)
    expect(planoDificil.foraDoPlano.length).toBe(planoFacil.foraDoPlano.length)
  })

  it('tudo dificil e cru estoura a aula, e isso fica VISIVEL', () => {
    // O estouro nao e bug: e o aviso de que itens crus e dificeis nao caberao na
    // aula, e de que essa conversa e com o professor.
    const progresso = curriculo(48, 8)
    const dificil = new Map(progresso.map((p) => [p.item.id, 'dificil' as const]))
    const plano = gerarPlano({ progresso, dificuldades: dificil })
    expect(plano.aulas.every((a) => a.itens.length === ITENS_POR_AULA)).toBe(true)
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

describe('auloesDoPacote', () => {
  it('divide entre os dois auloes o que nao cabe nas particulares', () => {
    const progresso = curriculo(48, 8)
    const plano = gerarPlano({ progresso })
    const auloes = auloesDoPacote({ foraDoPlano: plano.foraDoPlano })

    expect(auloes).toHaveLength(2)
    const total = auloes.flatMap((a) => a.itens).length
    expect(total).toBe(plano.foraDoPlano.length)
    // 6 itens em 2 auloes: 3 e 3.
    expect(auloes.map((a) => a.itens.length)).toEqual([3, 3])
  })

  it('nenhum item aparece nos dois auloes', () => {
    const plano = gerarPlano({ progresso: curriculo(48, 8) })
    const auloes = auloesDoPacote({ foraDoPlano: plano.foraDoPlano })
    const ids = auloes.flatMap((a) => a.itens.map((i) => i.id))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('separa reforco de item novo — sao coisas diferentes', () => {
    // `itens` nunca foi visto com o professor; `reforco` foi visto e nao fixou.
    // Juntar os dois esconderia do aluno qual dos dois problemas ele tem.
    const progresso = curriculo(48, 8, 0.2).map((p) => ({ ...p, dominio: 'visto' as const }))
    const plano = gerarPlano({ progresso })
    const auloes = auloesDoPacote({ foraDoPlano: plano.foraDoPlano, progresso })

    const novos = auloes.flatMap((a) => a.itens.map((i) => i.id))
    const reforco = auloes.flatMap((a) => a.reforco.map((i) => i.id))
    expect(reforco.length).toBeGreaterThan(0)
    // Nenhum item esta nas duas listas.
    expect(novos.some((id) => reforco.includes(id))).toBe(false)
  })

  it('item NUNCA estudado nao entra como reforco', () => {
    // Sem isso, o curriculo intocado joga os 50 itens da particular na lista de
    // reforco: verdade trivial que enche a tela e faz o aluno parar de ler.
    const progresso = curriculo(48, 8, 0) // pontuacao 0 e dominio nao_iniciado
    const plano = gerarPlano({ progresso })
    const auloes = auloesDoPacote({ foraDoPlano: plano.foraDoPlano, progresso })
    expect(auloes.flatMap((a) => a.reforco)).toEqual([])
  })

  it('estudar e ainda estar fraco SIM entra como reforco', () => {
    const progresso = curriculo(48, 8, 0.3).map((p) => ({ ...p, dominio: 'aprendendo' as const }))
    const plano = gerarPlano({ progresso })
    const auloes = auloesDoPacote({ foraDoPlano: plano.foraDoPlano, progresso })
    expect(auloes.flatMap((a) => a.reforco).length).toBeGreaterThan(0)
  })

  it('item dominado nao vai para reforco', () => {
    const progresso = curriculo(48, 8, 1)
    const plano = gerarPlano({ progresso })
    const auloes = auloesDoPacote({ foraDoPlano: plano.foraDoPlano, progresso })
    expect(auloes.flatMap((a) => a.reforco)).toEqual([])
  })

  it('sem progresso, devolve so os itens que nao couberam', () => {
    const plano = gerarPlano({ progresso: curriculo(48, 8) })
    const auloes = auloesDoPacote({ foraDoPlano: plano.foraDoPlano })
    expect(auloes.every((a) => a.reforco.length === 0)).toBe(true)
  })

  it('sem sobra e sem fraqueza, os auloes ficam vazios mas existem', () => {
    const auloes = auloesDoPacote({ foraDoPlano: [], progresso: [] })
    expect(auloes).toHaveLength(2)
    expect(auloes.every((a) => a.itens.length === 0 && a.reforco.length === 0)).toBe(true)
  })

  it('zero auloes devolve lista vazia', () => {
    expect(auloesDoPacote({ foraDoPlano: [], quantidade: 0 })).toEqual([])
  })
})

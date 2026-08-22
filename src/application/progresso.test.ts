import { describe, expect, it } from 'vitest'
import {
  ACERTOS_PARA_DOMINIO,
  dominioDoCartao,
  gruposMaisFracos,
  progressoPorItem,
  progressoPorModulo,
  progressoPorPosicao,
  prontidao,
} from './progresso'
import { estadoInicial } from '../domain/scheduler'
import type { Card, ReviewState, TechniqueItem } from '../domain/types'

const AGORA = new Date('2026-09-01T12:00:00.000Z')

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

function cartao(id: string, itemId?: string): Card {
  return {
    id,
    itemId,
    type: 'explicacao',
    prompt: 'p',
    resposta: ['r'],
    validationStatus: 'sugestao_nao_validada',
    ativo: true,
  }
}

function estado(over: Partial<ReviewState> = {}): ReviewState {
  return { ...estadoInicial('c1', 'unico', AGORA), ...over }
}

describe('dominioDoCartao', () => {
  it('sem revisao nenhuma, nao iniciado', () => {
    expect(dominioDoCartao(undefined, AGORA)).toBe('nao_iniciado')
    expect(dominioDoCartao(estado({ repeticoes: 0 }), AGORA)).toBe('nao_iniciado')
  })

  it('respondido mas sem acerto na sequencia, apenas visto', () => {
    expect(dominioDoCartao(estado({ repeticoes: 3, acertosConsecutivos: 0 }), AGORA)).toBe('visto')
  })

  it('com 1 ou 2 acertos consecutivos, aprendendo', () => {
    expect(dominioDoCartao(estado({ repeticoes: 2, acertosConsecutivos: 1 }), AGORA)).toBe('aprendendo')
    expect(dominioDoCartao(estado({ repeticoes: 3, acertosConsecutivos: 2 }), AGORA)).toBe('aprendendo')
  })

  it(`com ${ACERTOS_PARA_DOMINIO} acertos consecutivos, dominado`, () => {
    const st = estado({ repeticoes: 4, acertosConsecutivos: ACERTOS_PARA_DOMINIO })
    expect(dominioDoCartao(st, AGORA)).toBe('dominado')
  })

  it('NAO conta quantidade de respostas como dominio', () => {
    // Spec RF-05: responder muito e errar sempre nao e progresso.
    const muitasRespostasSempreErrando = estado({ repeticoes: 40, acertosConsecutivos: 0, lapses: 40 })
    expect(dominioDoCartao(muitasRespostasSempreErrando, AGORA)).toBe('visto')
  })

  it('dominio decai quando a ultima recuperacao ficou velha', () => {
    // Dominava, mas a ultima revisao foi ha 30 dias com intervalo de 3.
    const velho = estado({
      repeticoes: 5,
      acertosConsecutivos: 4,
      ultimoIntervaloDias: 3,
      ultimaRevisaoAt: '2026-08-02T12:00:00.000Z',
    })
    expect(dominioDoCartao(velho, AGORA)).toBe('aprendendo')
  })

  it('nao decai quando a revisao esta dentro do intervalo agendado', () => {
    const recente = estado({
      repeticoes: 5,
      acertosConsecutivos: 4,
      ultimoIntervaloDias: 7,
      ultimaRevisaoAt: '2026-08-30T12:00:00.000Z',
    })
    expect(dominioDoCartao(recente, AGORA)).toBe('dominado')
  })
})

describe('progressoPorItem', () => {
  it('o pior cartao define o item — dominar 2 de 3 nao e dominar', () => {
    const cartoes = [cartao('c1', 'i1'), cartao('c2', 'i1'), cartao('c3', 'i1')]
    const revisoes = [
      estado({ cardId: 'c1', repeticoes: 5, acertosConsecutivos: 4 }),
      estado({ cardId: 'c2', repeticoes: 5, acertosConsecutivos: 4 }),
      estado({ cardId: 'c3', repeticoes: 1, acertosConsecutivos: 0 }),
    ]
    const [p] = progressoPorItem([item()], cartoes, revisoes, AGORA)
    expect(p.dominio).toBe('visto')
  })

  it('mostra avanco parcial na pontuacao mesmo sem o item estar dominado', () => {
    // Cenario que enganou o teste manual: 2 de 3 cartoes dominados dava 0% na
    // tela, porque a pontuacao vinha da etiqueta estrita em vez da media.
    const cartoes = [cartao('c1', 'i1'), cartao('c2', 'i1'), cartao('c3', 'i1')]
    const revisoes = [
      estado({ cardId: 'c1', repeticoes: 5, acertosConsecutivos: 4 }),
      estado({ cardId: 'c2', repeticoes: 5, acertosConsecutivos: 4 }),
    ]
    const [p] = progressoPorItem([item()], cartoes, revisoes, AGORA)

    // A etiqueta continua honesta: nao esta dominado.
    expect(p.dominio).toBe('nao_iniciado')
    // Mas o avanco existe e aparece.
    expect(p.pontuacao).toBeGreaterThan(0.5)
    expect(p.pontuacao).toBeLessThan(1)
  })

  it('pontuacao de grupo reflete avanco parcial dos itens', () => {
    const cartoes = [cartao('c1', 'i1'), cartao('c2', 'i1')]
    const revisoes = [estado({ cardId: 'c1', repeticoes: 5, acertosConsecutivos: 4 })]
    const grupos = progressoPorPosicao(progressoPorItem([item()], cartoes, revisoes, AGORA))
    expect(grupos[0].pontuacao).toBeGreaterThan(0)
  })

  it('item sem cartao nenhum fica nao iniciado', () => {
    const [p] = progressoPorItem([item()], [], [], AGORA)
    expect(p.dominio).toBe('nao_iniciado')
    expect(p.pontuacao).toBe(0)
    expect(p.totalCartoes).toBe(0)
  })

  it('ignora item inativo', () => {
    expect(progressoPorItem([item({ ativo: false })], [], [], AGORA)).toEqual([])
  })

  it('dominio e validacao sao independentes', () => {
    // O ponto central: recuperar bem uma tecnica que o professor nunca viu nao
    // e estar pronto — pode ser decorar a versao errada.
    const cartoes = [cartao('c1', 'i1')]
    const revisoes = [estado({ cardId: 'c1', repeticoes: 5, acertosConsecutivos: 4 })]
    const [p] = progressoPorItem([item()], cartoes, revisoes, AGORA)
    expect(p.dominio).toBe('dominado')
    expect(p.validado).toBe(false)
  })

  it('marca validado quando o professor confirmou', () => {
    const [p] = progressoPorItem([item({ validationStatus: 'validado_pelo_professor' })], [], [], AGORA)
    expect(p.validado).toBe(true)
  })
})

describe('agrupamentos', () => {
  const cartoes = [cartao('c1', 'i1'), cartao('c2', 'i2')]
  const itens = [
    item({ id: 'i1', posicao: 'Guarda Fechada' }),
    item({ id: 'i2', posicao: 'Guarda Aranha', moduloId: 'mod-guardas' }),
  ]

  it('agrupa por modulo com rotulo legivel', () => {
    const progresso = progressoPorItem(itens, cartoes, [], AGORA)
    const grupos = progressoPorModulo(progresso, () => 'Complexo de guardas')
    expect(grupos).toHaveLength(1)
    expect(grupos[0].rotulo).toBe('Complexo de guardas')
    expect(grupos[0].total).toBe(2)
  })

  it('agrupa por posicao', () => {
    const progresso = progressoPorItem(itens, cartoes, [], AGORA)
    const grupos = progressoPorPosicao(progresso)
    expect(grupos.map((g) => g.chave).sort()).toEqual(['Guarda Aranha', 'Guarda Fechada'])
  })

  it('pontuacao vai de 0 (nada iniciado) a 1 (tudo dominado)', () => {
    const semNada = progressoPorPosicao(progressoPorItem(itens, cartoes, [], AGORA))
    expect(semNada.every((g) => g.pontuacao === 0)).toBe(true)

    const revisoes = [
      estado({ cardId: 'c1', repeticoes: 5, acertosConsecutivos: 4 }),
      estado({ cardId: 'c2', repeticoes: 5, acertosConsecutivos: 4 }),
    ]
    const tudo = progressoPorPosicao(progressoPorItem(itens, cartoes, revisoes, AGORA))
    expect(tudo.every((g) => g.pontuacao === 1)).toBe(true)
  })
})

describe('prontidao', () => {
  it('separa dominio de validacao e conta o vao entre os dois', () => {
    const cartoes = [cartao('c1', 'i1'), cartao('c2', 'i2')]
    const itens = [item({ id: 'i1' }), item({ id: 'i2', validationStatus: 'validado_pelo_professor' })]
    const revisoes = [
      estado({ cardId: 'c1', repeticoes: 5, acertosConsecutivos: 4 }),
      estado({ cardId: 'c2', repeticoes: 1, acertosConsecutivos: 0 }),
    ]
    const p = prontidao(progressoPorItem(itens, cartoes, revisoes, AGORA))

    expect(p.validado).toBe(0.5)
    // i1 esta dominado mas nao validado: e exatamente o risco que o app precisa
    // deixar visivel.
    expect(p.dominadoSemValidacao).toBe(1)
  })

  it('lida com lista vazia sem dividir por zero', () => {
    expect(prontidao([])).toEqual({ dominio: 0, validado: 0, dominadoSemValidacao: 0 })
  })
})

describe('gruposMaisFracos', () => {
  it('devolve os piores primeiro', () => {
    const grupos = [
      { chave: 'bom', rotulo: 'bom', total: 1, porNivel: {} as never, pontuacao: 0.9, validados: 0 },
      { chave: 'ruim', rotulo: 'ruim', total: 1, porNivel: {} as never, pontuacao: 0.1, validados: 0 },
      { chave: 'medio', rotulo: 'medio', total: 1, porNivel: {} as never, pontuacao: 0.5, validados: 0 },
    ]
    expect(gruposMaisFracos(grupos, 2).map((g) => g.chave)).toEqual(['ruim', 'medio'])
  })
})

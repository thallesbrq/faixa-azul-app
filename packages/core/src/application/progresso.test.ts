import { describe, expect, it } from 'vitest'
import {
  ACERTOS_PARA_DOMINIO,
  dominioDoCartao,
  faixaDaPontuacao,
  gruposMaisFracos,
  LIMIAR_ALTA,
  LIMIAR_MEDIA,
  progressoPorGrupoTecnico,
  progressoPorItem,
  progressoPorModulo,
  progressoPorPosicao,
  prontidao,
} from './progresso'
import { grupoDoKind, ORDEM_GRUPO } from '../domain/taxonomia'
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
    expect(prontidao([])).toEqual({
      dominio: 0,
      validado: 0,
      dominadoSemValidacao: 0,
      medidos: 0,
      semCartoes: 0,
    })
  })
})

// ---------------------------------------------------------------------------
// Item sem cartao nao entra na media (ADR-017, decisao 7)
// ---------------------------------------------------------------------------

describe('medivelPorCartoes', () => {
  /**
   * O DEFEITO QUE ESTE BLOCO MEDE, e que eu quase deixei passar.
   *
   * Religar os 81 itens trouxe de volta 11 de defesa pessoal que NAO GERAM
   * CARTAO NENHUM (sem `passos` por decisao de seguranca do ADR-012, e fora de
   * `KINDS_CLASSIFICAVEIS`). `progressoPorItem` da a eles `pontuacao: 0`.
   *
   * Na media, isso travava o azul em 70/81 = 86,4% PARA SEMPRE: quem dominasse
   * tudo o que o app ensina veria 86%, e a diferenca entre "faltam 14%" e "esses
   * 14% nao existem no app" nao aparecia em lugar nenhum.
   *
   * Eu tinha raciocinado o contrario — que a etiqueta "pior nivel entre os
   * cartoes" fazia um item sem cartao chegar a dominado. Nao faz: `pior` comeca
   * em `nao_iniciado` quando a lista esta vazia.
   */
  const dominado = () =>
    estado({ cardId: 'c1', repeticoes: 4, acertosConsecutivos: ACERTOS_PARA_DOMINIO })

  it('dominar TODOS os itens que tem cartao da 100%, e nao 50%', () => {
    const itens = [item({ id: 'com-cartao' }), item({ id: 'sem-cartao', kind: 'defesa_pessoal' })]
    const p = progressoPorItem(itens, [cartao('c1', 'com-cartao')], [dominado()], AGORA)
    const r = prontidao(p)

    expect(r.dominio).toBe(1)
    // E o denominador sai declarado, do mesmo jeito que em `mediaDaTurma`:
    expect(r.medidos).toBe(1)
    expect(r.semCartoes).toBe(1)
  })

  it('curriculo em que NADA tem cartao devolve zero com semCartoes cheio', () => {
    // Nao e "o aluno esta em zero": e "nao ha o que medir aqui". A tela usa
    // `medidos === 0` para mostrar `—`.
    const p = progressoPorItem([item({ id: 'x', kind: 'defesa_pessoal' })], [], [], AGORA)
    const r = prontidao(p)
    expect(r.medidos).toBe(0)
    expect(r.semCartoes).toBe(1)
  })

  it('VALIDACAO continua sobre o curriculo inteiro — denominador diferente', () => {
    /**
     * De proposito: `validado` conta o que o PROFESSOR confirmou, e ele confirma
     * o TEXTO do item. Um item sem passo a passo tambem tem texto para conferir —
     * nome, aviso de supervisao, o que a prova cobre. Usar o mesmo denominador
     * dos cartoes faria "o professor validou 100%" com metade do curriculo sem
     * ninguem ter olhado.
     */
    const itens = [
      item({ id: 'a', validationStatus: 'validado_pelo_professor' }),
      item({ id: 'b', kind: 'defesa_pessoal', validationStatus: 'aguardando_validacao' }),
    ]
    const r = prontidao(progressoPorItem(itens, [cartao('c1', 'a')], [], AGORA))
    expect(r.medidos).toBe(1)
    expect(r.validado).toBe(0.5)
  })

  it('grupo sem item mensuravel devolve medidos 0, e nao pontuacao falsa', () => {
    const itens = [
      item({ id: 'a', kind: 'raspagem' }),
      item({ id: 'b', kind: 'defesa_pessoal' }),
    ]
    const grupos = progressoPorGrupoTecnico(
      progressoPorItem(itens, [cartao('c1', 'a')], [dominado()], AGORA),
    )
    const raspagens = grupos.find((g) => g.chave === 'raspagens')
    const defesa = grupos.find((g) => g.chave === 'defesa-pessoal')

    expect(raspagens?.pontuacao).toBe(1)
    expect(raspagens?.medidos).toBe(1)

    // O grupo EXISTE (o item esta no curriculo) e nao e medivel. `total` diz que
    // ha 1 item; `medidos: 0` diz que nenhum e alcancado por cartao.
    expect(defesa?.total).toBe(1)
    expect(defesa?.medidos).toBe(0)
  })
})

describe('gruposMaisFracos', () => {
  it('devolve os piores primeiro', () => {
    const grupos = [
      { chave: 'bom', rotulo: 'bom', total: 1, porNivel: {} as never, pontuacao: 0.9, medidos: 1, validados: 0 },
      { chave: 'ruim', rotulo: 'ruim', total: 1, porNivel: {} as never, pontuacao: 0.1, medidos: 1, validados: 0 },
      { chave: 'medio', rotulo: 'medio', total: 1, porNivel: {} as never, pontuacao: 0.5, medidos: 1, validados: 0 },
    ]
    expect(gruposMaisFracos(grupos, 2).map((g) => g.chave)).toEqual(['ruim', 'medio'])
  })
})

// ---------------------------------------------------------------------------
// Faixas de cor: derivadas dos pesos, nao escolhidas (ADR-015, decisao 4)
// ---------------------------------------------------------------------------

describe('faixaDaPontuacao', () => {
  it('os limiares SAO os pesos dos niveis', () => {
    // Este teste existe para a derivacao nao virar coincidencia: se alguem
    // trocar os limiares por numeros redondos, ele quebra. A cor da central tem
    // de concordar com a etiqueta que o app mostra ao mesmo aluno.
    const soVisto = progressoPorItem(
      [item({ id: 'i1' })],
      [cartao('c1', 'i1')],
      [estado({ cardId: 'c1', repeticoes: 1, acertosConsecutivos: 0 })],
      AGORA,
    )
    // "tudo visto" e exatamente o piso da faixa media.
    expect(soVisto[0].pontuacao).toBe(LIMIAR_MEDIA)
    expect(faixaDaPontuacao(soVisto[0].pontuacao)).toBe('media')
  })

  it('tudo aprendendo ja e faixa alta', () => {
    expect(faixaDaPontuacao(LIMIAR_ALTA)).toBe('alta')
  })

  it('abaixo de tudo-visto e faixa baixa', () => {
    expect(faixaDaPontuacao(0)).toBe('baixa')
    expect(faixaDaPontuacao(LIMIAR_MEDIA - 0.01)).toBe('baixa')
  })

  it('NAO usa os limiares 40/80 da referencia visual', () => {
    // 38% seria vermelho com o corte em 40, mas "tudo visto" e 34: a cor cairia
    // no meio de um nivel. 79% seria amarelo com o corte em 80, embora ja esteja
    // acima de "tudo aprendendo".
    expect(faixaDaPontuacao(0.38)).toBe('media')
    expect(faixaDaPontuacao(0.79)).toBe('alta')
  })
})

// ---------------------------------------------------------------------------
// Grupos tecnicos: as sete colunas
// ---------------------------------------------------------------------------

describe('progressoPorGrupoTecnico', () => {
  it('agrupa costas em Finalizacoes e defesa em Saidas', () => {
    // Os dois agrupamentos do ADR-015: sozinhos seriam 2 itens numa coluna.
    const itens = [
      item({ id: 'i1', kind: 'finalizacao' }),
      item({ id: 'i2', kind: 'costas' }),
      item({ id: 'i3', kind: 'saida' }),
      item({ id: 'i4', kind: 'defesa' }),
    ]
    const grupos = progressoPorGrupoTecnico(progressoPorItem(itens, [], [], AGORA))
    const porChave = new Map(grupos.map((g) => [g.chave, g]))

    expect(porChave.get('finalizacoes')?.total).toBe(2)
    expect(porChave.get('saidas-defesas')?.total).toBe(2)
  })

  it('todo kind cai num grupo que existe em ORDEM_GRUPO', () => {
    // Item na coluna errada nao produz erro nenhum — so um numero errado na
    // tela do professor. Entao a cobertura e verificada, nao presumida.
    //
    // ESTE TESTE JA AFIRMOU `toHaveLength(7)`, e quebrou quando `dominio` entrou
    // com o curriculo do 1o grau. Quebrou pelo motivo certo — o numero mudou de
    // verdade — mas o numero magico era a parte fraca: ele nao dizia QUAL era a
    // invariante. As tres assercoes abaixo dizem, e sobrevivem ao proximo tipo.
    const kinds: TechniqueItem['kind'][] = [
      'raspagem', 'passagem', 'finalizacao', 'costas', 'saida',
      'defesa', 'movimentacao', 'queda', 'defesa_pessoal', 'dominio',
    ]
    for (const kind of kinds) {
      expect(ORDEM_GRUPO).toContain(grupoDoKind(kind))
    }
    // Sem duplicata: uma coluna repetida somaria os mesmos itens duas vezes.
    expect(new Set(ORDEM_GRUPO).size).toBe(ORDEM_GRUPO.length)
    // E nenhum grupo orfao: coluna que nenhum kind alcanca nasceria sempre vazia.
    const alcancados = new Set(kinds.map(grupoDoKind))
    expect([...ORDEM_GRUPO].filter((g) => !alcancados.has(g))).toEqual([])
  })

  it('a chave e o grupo, e nao o rotulo com acento', () => {
    const grupos = progressoPorGrupoTecnico(
      progressoPorItem([item({ id: 'i1', kind: 'saida' })], [], [], AGORA),
    )
    expect(grupos[0].chave).toBe('saidas-defesas')
    expect(grupos[0].rotulo).toBe('Saídas e defesas')
  })
})

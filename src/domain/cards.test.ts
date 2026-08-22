import { describe, expect, it } from 'vitest'
import {
  MIN_PASSOS_SEQUENCIA,
  cartaoDeReconhecimento,
  cartoesDaTecnica,
  cartoesDeRequisito,
  gerarBaralho,
} from './cards'
import type { TechniqueContent, TechniqueItem } from './types'

function item(over: Partial<TechniqueItem> = {}): TechniqueItem {
  return {
    id: 'gf--raspada-1',
    moduloId: 'mod-guardas',
    posicao: 'Guarda Fechada',
    slot: 'Raspada 1',
    categoria: 'Raspadas',
    nome: 'Raspagem de tesoura',
    aliases: [],
    kind: 'raspagem',
    sideMode: 'nao_se_aplica',
    safetyLevel: 'baixo',
    validationStatus: 'sugestao_nao_validada',
    sourceReference: 'Secao 4',
    ativo: true,
    ...over,
  }
}

function conteudo(passos: string[]): TechniqueContent {
  return { itemId: 'gf--raspada-1', passos, errosComuns: [], reacoes: [], notasSeguranca: [] }
}

const QUATRO_PASSOS = ['Controle a manga.', 'Encaixe a canela.', 'Puxe para cima.', 'Feche a tesoura.']

describe('cartoesDaTecnica', () => {
  it('gera explicacao, sequencia e classificacao quando ha passos suficientes', () => {
    const tipos = cartoesDaTecnica(item(), conteudo(QUATRO_PASSOS)).map((c) => c.type)
    expect(tipos).toEqual(['explicacao', 'sequencia', 'classificacao'])
  })

  it('NAO gera cartao de execucao para item sem passo a passo (ADR-012)', () => {
    const semPassos = item({ id: 'dp--defesa-de-soco', moduloId: 'mod-defesa-pessoal', kind: 'defesa_pessoal' })
    const cartoes = cartoesDaTecnica(semPassos, conteudo([]))
    expect(cartoes.map((c) => c.type)).not.toContain('explicacao')
    expect(cartoes.map((c) => c.type)).not.toContain('sequencia')
  })

  it('nao gera sequencia com menos de MIN_PASSOS_SEQUENCIA etapas', () => {
    const poucos = QUATRO_PASSOS.slice(0, MIN_PASSOS_SEQUENCIA - 1)
    const tipos = cartoesDaTecnica(item(), conteudo(poucos)).map((c) => c.type)
    expect(tipos).toContain('explicacao')
    expect(tipos).not.toContain('sequencia')
  })

  it('nao gera classificacao quando o kind nao discrimina nada no modulo', () => {
    // Em Quedas todo item e "queda": a pergunta seria trivial.
    const queda = item({ id: 'q--baiana', moduloId: 'mod-quedas', kind: 'queda' })
    const tipos = cartoesDaTecnica(queda, conteudo(QUATRO_PASSOS)).map((c) => c.type)
    expect(tipos).not.toContain('classificacao')
  })

  it('ignora item inativo', () => {
    expect(cartoesDaTecnica(item({ ativo: false }), conteudo(QUATRO_PASSOS))).toEqual([])
  })

  it('propaga o status de validacao do item para o cartao', () => {
    const cartoes = cartoesDaTecnica(item({ validationStatus: 'validado_pelo_professor' }), conteudo(QUATRO_PASSOS))
    expect(cartoes.every((c) => c.validationStatus === 'validado_pelo_professor')).toBe(true)
  })

  it('a sequencia guarda os passos na ordem correta como resposta', () => {
    const seq = cartoesDaTecnica(item(), conteudo(QUATRO_PASSOS)).find((c) => c.type === 'sequencia')
    expect(seq?.resposta).toEqual(QUATRO_PASSOS)
  })

  it('usa o slot como rotulo quando o nome de variacao nao existe', () => {
    // Fundamentos e Quedas nao tem nome de variacao: o slot ja e o nome.
    const semNome = cartoesDaTecnica(item({ nome: '' }), conteudo(QUATRO_PASSOS))
    expect(semNome[0].prompt).toBe('Explique em voz alta: Raspada 1 (Guarda Fechada).')
  })

  it('nao repete a posicao no prompt', () => {
    const semNome = cartoesDaTecnica(
      item({ nome: '', posicao: 'Base & Movimentação', slot: 'Rolamento para frente' }),
      conteudo(QUATRO_PASSOS),
    )
    const ocorrencias = semNome[0].prompt.split('Base & Movimentação').length - 1
    expect(ocorrencias).toBe(1)
  })
})

describe('cartoesDeRequisito', () => {
  it('gera um cartao por quantidade exigida', () => {
    const cartoes = cartoesDeRequisito([
      { posicao: 'Guarda Fechada', categoria: 'Raspadas', quantidade: 2, validationStatus: 'aguardando_validacao' },
    ])
    expect(cartoes).toHaveLength(1)
    expect(cartoes[0].prompt).toBe('Quantas raspadas a prova exige em Guarda Fechada?')
    expect(cartoes[0].resposta).toEqual(['2'])
  })

  it('gera ids distintos para posicoes diferentes com a mesma categoria', () => {
    const cartoes = cartoesDeRequisito([
      { posicao: 'Saida da Montada', categoria: 'Saidas', quantidade: 2, validationStatus: 'aguardando_validacao' },
      { posicao: 'Saida dos 100 Kilos', categoria: 'Saidas', quantidade: 2, validationStatus: 'aguardando_validacao' },
    ])
    expect(new Set(cartoes.map((c) => c.id)).size).toBe(2)
  })
})

describe('cartaoDeReconhecimento', () => {
  it('lista os itens do modulo sem ensinar execucao', () => {
    const itens = [
      item({ id: 'dp--escudo', moduloId: 'mod-defesa-pessoal', slot: 'Escudo' }),
      item({ id: 'dp--jab', moduloId: 'mod-defesa-pessoal', slot: 'Jab' }),
    ]
    const cartao = cartaoDeReconhecimento('mod-defesa-pessoal', 'defesa pessoal', itens)
    expect(cartao?.prompt).toContain('Liste os 2 itens')
    expect(cartao?.resposta).toEqual(['Escudo', 'Jab'])
  })

  it('devolve undefined quando o modulo nao tem itens', () => {
    expect(cartaoDeReconhecimento('mod-inexistente', 'nada', [])).toBeUndefined()
  })
})

describe('gerarBaralho', () => {
  it('recusa ids duplicados', () => {
    const dois = [item(), item()] // mesmo id
    expect(() =>
      gerarBaralho({ itens: dois, conteudos: [conteudo(QUATRO_PASSOS)], requisitos: [], cartoesTeoria: [] }),
    ).toThrow(/duplicado/)
  })

  it('inclui os cartoes de teoria recebidos', () => {
    const baralho = gerarBaralho({
      itens: [],
      conteudos: [],
      requisitos: [],
      cartoesTeoria: [
        {
          id: 'teoria-1',
          type: 'teoria',
          prompt: 'Quais os cinco valores?',
          resposta: ['Respeito, lealdade, amizade, amor e humildade.'],
          validationStatus: 'validado_pelo_professor',
          ativo: true,
        },
      ],
    })
    expect(baralho.map((c) => c.id)).toEqual(['teoria-1'])
  })

  it('todo cartao gerado tem prompt e resposta nao vazios', () => {
    const baralho = gerarBaralho({
      itens: [item()],
      conteudos: [conteudo(QUATRO_PASSOS)],
      requisitos: [
        { posicao: 'Guarda Fechada', categoria: 'Raspadas', quantidade: 2, validationStatus: 'aguardando_validacao' },
      ],
      cartoesTeoria: [],
    })
    expect(baralho.length).toBeGreaterThan(0)
    for (const c of baralho) {
      expect(c.prompt.trim().length).toBeGreaterThan(0)
      expect(c.resposta.length).toBeGreaterThan(0)
      expect(c.resposta.every((r) => r.trim().length > 0)).toBe(true)
    }
  })
})

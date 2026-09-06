import { describe, expect, it } from 'vitest'
import {
  criarObservacao,
  criarSessao,
  desempenhoPorItem,
  nuncaTestados,
  resumoDoTreino,
  sessoesRecentes,
} from './treino'
import type { PracticeObservation, PracticeSession, TechniqueItem } from '../domain/types'

const AGORA = new Date('2026-09-07T21:00:00.000Z')

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

function obs(over: Partial<PracticeObservation> = {}): PracticeObservation {
  return criarObservacao({
    itemId: 'i1',
    resistencia: 'leve',
    resultado: 'saiu',
    ...over,
  })
}

function sessao(data: string, observacoes: PracticeObservation[]): PracticeSession {
  return { id: `s-${data}`, data, observacoes }
}

describe('criarSessao', () => {
  it('normaliza campos em branco para undefined', () => {
    // Evita gravar string vazia, que depois aparece na tela como campo mudo.
    const s = criarSessao({ id: 's1', agora: AGORA, parceiro: '   ', notaDoProfessor: '' })
    expect(s.parceiro).toBeUndefined()
    expect(s.notaDoProfessor).toBeUndefined()
    expect(s.data).toBe(AGORA.toISOString())
  })

  it('preserva parceiro e nota quando existem', () => {
    const s = criarSessao({ id: 's1', agora: AGORA, parceiro: ' Pedro ', notaDoProfessor: ' base baixa ' })
    expect(s.parceiro).toBe('Pedro')
    expect(s.notaDoProfessor).toBe('base baixa')
  })
})

describe('criarObservacao', () => {
  it('descarta repeticoes invalidas', () => {
    expect(criarObservacao({ itemId: 'i1', resistencia: 'sem', resultado: 'saiu', repeticoes: 0 }).repeticoes)
      .toBeUndefined()
    expect(criarObservacao({ itemId: 'i1', resistencia: 'sem', resultado: 'saiu', repeticoes: 8 }).repeticoes)
      .toBe(8)
  })

  it('guarda limitacao como texto livre, sem interpretar', () => {
    // RNF-05: o app nao diagnostica dor nem transforma isso em alerta clinico.
    const o = criarObservacao({
      itemId: 'i1',
      resistencia: 'media',
      resultado: 'nao_saiu',
      limitacao: 'ombro esquerdo travando',
    })
    expect(o.limitacao).toBe('ombro esquerdo travando')
  })
})

describe('desempenhoPorItem', () => {
  it('conta quantas vezes o item foi treinado', () => {
    const d = desempenhoPorItem([
      sessao('2026-09-01T00:00:00.000Z', [obs()]),
      sessao('2026-09-03T00:00:00.000Z', [obs(), obs()]),
    ])
    expect(d.get('i1')?.vezes).toBe(3)
  })

  it('guarda o MELHOR resultado, nao o mais recente', () => {
    // Saiu contra resistencia alta uma vez: isso provou que funciona, e um dia
    // ruim depois nao desfaz a prova. Oposto do dominio, que decai — e a
    // diferenca e proposital.
    const d = desempenhoPorItem([
      sessao('2026-09-01T00:00:00.000Z', [obs({ resistencia: 'alta', resultado: 'saiu_com_resistencia' })]),
      sessao('2026-09-08T00:00:00.000Z', [obs({ resistencia: 'leve', resultado: 'nao_saiu' })]),
    ])
    expect(d.get('i1')?.melhorResultado).toBe('saiu_com_resistencia')
    expect(d.get('i1')?.funcionaSobPressao).toBe(true)
  })

  it('so conta resistencia onde a tecnica realmente saiu', () => {
    // Tentar contra resistencia alta e falhar nao e prova de nada.
    const d = desempenhoPorItem([
      sessao('2026-09-01T00:00:00.000Z', [obs({ resistencia: 'alta', resultado: 'nao_saiu' })]),
      sessao('2026-09-02T00:00:00.000Z', [obs({ resistencia: 'leve', resultado: 'saiu' })]),
    ])
    expect(d.get('i1')?.maiorResistenciaComSucesso).toBe('leve')
    expect(d.get('i1')?.funcionaSobPressao).toBe(false)
  })

  it('saiu sem resistencia nenhuma NAO conta como funcionar sob pressao', () => {
    const d = desempenhoPorItem([sessao('2026-09-01T00:00:00.000Z', [obs({ resistencia: 'sem' })])])
    expect(d.get('i1')?.funcionaSobPressao).toBe(false)
  })

  it('saiu com ajuda nao conta como sucesso', () => {
    const d = desempenhoPorItem([
      sessao('2026-09-01T00:00:00.000Z', [obs({ resistencia: 'alta', resultado: 'saiu_com_ajuda' })]),
    ])
    expect(d.get('i1')?.maiorResistenciaComSucesso).toBeNull()
    expect(d.get('i1')?.funcionaSobPressao).toBe(false)
  })

  it('acumula limitacoes de varias sessoes', () => {
    const d = desempenhoPorItem([
      sessao('2026-09-01T00:00:00.000Z', [obs({ limitacao: 'ombro' })]),
      sessao('2026-09-03T00:00:00.000Z', [obs({ limitacao: 'joelho' })]),
    ])
    expect(d.get('i1')?.limitacoes).toEqual(['ombro', 'joelho'])
  })

  it('registra a ultima vez, independente da ordem das sessoes', () => {
    const d = desempenhoPorItem([
      sessao('2026-09-10T00:00:00.000Z', [obs()]),
      sessao('2026-09-02T00:00:00.000Z', [obs()]),
    ])
    expect(d.get('i1')?.ultimaVez).toBe('2026-09-10T00:00:00.000Z')
  })

  it('sem sessoes devolve mapa vazio', () => {
    expect(desempenhoPorItem([]).size).toBe(0)
  })
})

describe('nuncaTestados', () => {
  it('item dominado e validado ainda aparece se nunca foi ao rolamento', () => {
    // O ponto central do modulo: os outros dois eixos nao enxergam isso.
    const itens = [item({ id: 'i1', validationStatus: 'validado_pelo_professor' }), item({ id: 'i2' })]
    const fora = nuncaTestados(itens, [sessao('2026-09-01T00:00:00.000Z', [obs({ itemId: 'i2' })])])
    expect(fora.map((i) => i.id)).toEqual(['i1'])
  })

  it('ignora item inativo', () => {
    const itens = [item({ id: 'i1', ativo: false })]
    expect(nuncaTestados(itens, [])).toEqual([])
  })
})

describe('sessoesRecentes', () => {
  it('ordena da mais recente para a mais antiga', () => {
    const lista = [
      sessao('2026-09-01T00:00:00.000Z', []),
      sessao('2026-09-10T00:00:00.000Z', []),
      sessao('2026-09-05T00:00:00.000Z', []),
    ]
    expect(sessoesRecentes(lista).map((s) => s.data.slice(0, 10))).toEqual([
      '2026-09-10',
      '2026-09-05',
      '2026-09-01',
    ])
  })

  it('nao muta a lista recebida', () => {
    const lista = [sessao('2026-09-01T00:00:00.000Z', []), sessao('2026-09-10T00:00:00.000Z', [])]
    const antes = lista.map((s) => s.data)
    sessoesRecentes(lista)
    expect(lista.map((s) => s.data)).toEqual(antes)
  })

  it('limita a quantidade quando pedido', () => {
    const lista = Array.from({ length: 5 }, (_, i) => sessao(`2026-09-0${i + 1}T00:00:00.000Z`, []))
    expect(sessoesRecentes(lista, 2)).toHaveLength(2)
  })
})

describe('resumoDoTreino', () => {
  const itens = [item({ id: 'i1' }), item({ id: 'i2' }), item({ id: 'i3' }), item({ id: 'i4', ativo: false })]

  it('conta apenas itens ativos', () => {
    const r = resumoDoTreino(itens, [
      sessao('2026-09-01T00:00:00.000Z', [obs({ itemId: 'i1' }), obs({ itemId: 'i4' })]),
    ])
    expect(r.itensAtivos).toBe(3)
    expect(r.itensTreinados).toBe(1)
  })

  it('separa o que funciona sob pressao do que apenas saiu', () => {
    const r = resumoDoTreino(itens, [
      sessao('2026-09-01T00:00:00.000Z', [
        obs({ itemId: 'i1', resistencia: 'alta', resultado: 'saiu_com_resistencia' }),
        obs({ itemId: 'i2', resistencia: 'sem', resultado: 'saiu' }),
      ]),
    ])
    expect(r.funcionamSobPressao).toBe(1)
    expect(r.itensTreinados).toBe(2)
  })

  it('conta travados — treinados que nunca sairam', () => {
    const r = resumoDoTreino(itens, [
      sessao('2026-09-01T00:00:00.000Z', [obs({ itemId: 'i1', resultado: 'nao_saiu' })]),
      sessao('2026-09-03T00:00:00.000Z', [obs({ itemId: 'i1', resultado: 'nao_saiu' })]),
    ])
    expect(r.travados).toBe(1)
  })

  it('sem treino nenhum devolve zeros coerentes', () => {
    const r = resumoDoTreino(itens, [])
    expect(r).toEqual({
      sessoes: 0,
      itensTreinados: 0,
      itensAtivos: 3,
      funcionamSobPressao: 0,
      travados: 0,
    })
  })
})

import { describe, expect, it } from 'vitest'
import {
  agruparDuvidas,
  duvidasDaAula,
  exportarDuvidas,
  mesclarDuvidas,
  resumoDeDuvidas,
} from './duvidas'
import type { AulaParticular, TeacherQuestion, TechniqueItem } from '../domain/types'

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

function duvida(over: Partial<TeacherQuestion> = {}): TeacherQuestion {
  return {
    id: 'd1',
    itemId: 'gf--raspada-1',
    tipo: 'execucao',
    pergunta: 'Qual o gatilho?',
    status: 'aberta',
    origem: 'lacuna_de_conteudo',
    ...over,
  }
}

describe('mesclarDuvidas', () => {
  it('aplica a resposta registrada pelo aluno', () => {
    const [mesclada] = mesclarDuvidas(
      [duvida()],
      [{ id: 'd1', status: 'respondida', resposta: 'Quando ele postura de pé.', respondidaNaAulaNumero: 1 }],
    )
    expect(mesclada.status).toBe('respondida')
    expect(mesclada.resposta).toBe('Quando ele postura de pé.')
    expect(mesclada.respondidaNaAulaNumero).toBe(1)
  })

  it('preserva a pergunta original — o aluno altera o estado, nao o texto', () => {
    const [mesclada] = mesclarDuvidas([duvida()], [{ id: 'd1', status: 'levada_a_aula' }])
    expect(mesclada.pergunta).toBe('Qual o gatilho?')
  })

  it('nao mexe em duvida sem alteracao', () => {
    const seed = [duvida(), duvida({ id: 'd2' })]
    const mescladas = mesclarDuvidas(seed, [{ id: 'd1', status: 'respondida' }])
    expect(mescladas[1].status).toBe('aberta')
  })

  it('ignora alteracao de duvida que nao existe mais no seed', () => {
    // Se uma pergunta semeada for removida, a alteracao orfa nao pode quebrar.
    const mescladas = mesclarDuvidas([duvida()], [{ id: 'nao-existe', status: 'respondida' }])
    expect(mescladas).toHaveLength(1)
    expect(mescladas[0].status).toBe('aberta')
  })
})

describe('agruparDuvidas', () => {
  it('coloca as perguntas gerais primeiro', () => {
    const grupos = agruparDuvidas(
      [duvida({ id: 'd1' }), duvida({ id: 'geral', itemId: undefined, origem: 'spec' })],
      [item()],
    )
    expect(grupos[0].titulo).toBe('Perguntas gerais')
  })

  it('junta as duvidas da mesma tecnica num grupo', () => {
    const grupos = agruparDuvidas(
      [duvida({ id: 'd1', pergunta: 'gatilho?' }), duvida({ id: 'd2', pergunta: 'erro comum?' })],
      [item()],
    )
    const doItem = grupos.find((g) => g.itemId === 'gf--raspada-1')
    expect(doItem?.duvidas).toHaveLength(2)
    expect(doItem?.titulo).toBe('Raspagem de tesoura — Raspada 1')
  })

  it('usa o slot como titulo quando a tecnica nao tem nome de variacao', () => {
    const grupos = agruparDuvidas([duvida({ itemId: 'q--baiana' })], [item({ id: 'q--baiana', nome: '', slot: 'Baiana' })])
    expect(grupos[0].titulo).toBe('Baiana')
  })

  it('nao cria grupo de gerais quando nao ha perguntas gerais', () => {
    const grupos = agruparDuvidas([duvida()], [item()])
    expect(grupos.some((g) => g.titulo === 'Perguntas gerais')).toBe(false)
  })
})

describe('duvidasDaAula', () => {
  const aula: AulaParticular = {
    numero: 1,
    tema: 'Guarda Fechada',
    foco: 'Raspadas',
    itemIds: ['gf--raspada-1'],
  }

  it('inclui as gerais e as da aula, e exclui as de outras tecnicas', () => {
    const todas = [
      duvida({ id: 'da-aula' }),
      duvida({ id: 'geral', itemId: undefined }),
      duvida({ id: 'de-outra', itemId: 'q--baiana' }),
    ]
    expect(duvidasDaAula(aula, todas).map((d) => d.id).sort()).toEqual(['da-aula', 'geral'])
  })

  it('ignora duvidas ja respondidas ou levadas', () => {
    const todas = [duvida({ id: 'respondida', status: 'respondida' }), duvida({ id: 'levada', status: 'levada_a_aula' })]
    expect(duvidasDaAula(aula, todas)).toEqual([])
  })
})

describe('exportarDuvidas', () => {
  it('gera markdown com caixas para marcar durante a aula', () => {
    const texto = exportarDuvidas({
      titulo: 'Aula 1',
      duvidas: [duvida({ pergunta: 'Qual o gatilho?' })],
      itens: [item()],
    })
    expect(texto).toContain('# Aula 1')
    expect(texto).toContain('## Raspagem de tesoura — Raspada 1')
    expect(texto).toContain('- [ ] Qual o gatilho?')
  })

  it('avisa que o conteudo do app e sugestao, nao o curriculo da academia', () => {
    // O professor vai ler isso. Precisa ficar claro de onde vem o material.
    const texto = exportarDuvidas({ titulo: 'Aula 1', duvidas: [duvida()], itens: [item()] })
    expect(texto).toContain('sugestões minhas')
  })

  it('lida com lista vazia sem gerar documento confuso', () => {
    const texto = exportarDuvidas({ titulo: 'Aula 1', duvidas: [], itens: [] })
    expect(texto).toContain('Nenhuma dúvida aberta')
  })
})

describe('resumoDeDuvidas', () => {
  it('conta por estado', () => {
    const resumo = resumoDeDuvidas([
      duvida({ id: 'a' }),
      duvida({ id: 'b', status: 'levada_a_aula' }),
      duvida({ id: 'c', status: 'respondida' }),
      duvida({ id: 'd', status: 'respondida' }),
    ])
    expect(resumo).toEqual({ abertas: 1, levadas: 1, respondidas: 2 })
  })
})

/**
 * Integridade do seed real (nao de dados de teste).
 *
 * Estes testes existem para pegar dessincronizacao: se o script de import for
 * reexecutado, se um item for renomeado ou se uma aula referenciar uma tecnica
 * que nao existe mais, o teste quebra aqui em vez de virar tela em branco.
 */

import { describe, expect, it } from 'vitest'
import { gerarBaralho } from '../domain/cards'
import { duvidasParaAula } from './duvidas'
import { AULAS, CARTOES_TEORIA, CONTEUDOS, DUVIDAS, ITENS, MODULOS, REQUISITOS } from './index'

const idsDosItens = new Set(ITENS.map((i) => i.id))
const idsDosModulos = new Set(MODULOS.map((m) => m.id))
const conteudoPorItem = new Map(CONTEUDOS.map((c) => [c.itemId, c]))

describe('curriculo', () => {
  it('tem os 81 itens do documento da prova', () => {
    expect(ITENS).toHaveLength(81)
  })

  it('nao tem id duplicado', () => {
    expect(idsDosItens.size).toBe(ITENS.length)
  })

  it('todo item aponta para um modulo existente', () => {
    const orfaos = ITENS.filter((i) => !idsDosModulos.has(i.moduloId))
    expect(orfaos.map((i) => i.id)).toEqual([])
  })

  it('todo item tem exatamente um conteudo', () => {
    expect(CONTEUDOS).toHaveLength(ITENS.length)
    const semConteudo = ITENS.filter((i) => !conteudoPorItem.has(i.id))
    expect(semConteudo.map((i) => i.id)).toEqual([])
  })

  it('todo conteudo aponta para um item existente', () => {
    const orfaos = CONTEUDOS.filter((c) => !idsDosItens.has(c.itemId))
    expect(orfaos.map((c) => c.itemId)).toEqual([])
  })
})

describe('cobertura de passo a passo', () => {
  const comPassos = ITENS.filter((i) => (conteudoPorItem.get(i.id)?.passos.length ?? 0) > 0)
  const semPassos = ITENS.filter((i) => (conteudoPorItem.get(i.id)?.passos.length ?? 0) === 0)

  it('70 itens tem passo a passo (56 importados + 14 escritos a mao)', () => {
    expect(comPassos).toHaveLength(70)
  })

  it('os 11 itens sem passo a passo sao TODOS de defesa pessoal (ADR-012)', () => {
    expect(semPassos).toHaveLength(11)
    expect(new Set(semPassos.map((i) => i.moduloId))).toEqual(new Set(['mod-defesa-pessoal']))
  })

  it('nenhum item com passo a passo aparece como validado pelo professor', () => {
    // Nada foi validado ainda: o professor nao viu o conteudo. Se algum item
    // aparecer como validado sem uma correcao registrada, e bug de estado.
    const validados = comPassos.filter((i) => i.validationStatus === 'validado_pelo_professor')
    expect(validados.map((i) => i.id)).toEqual([])
  })

  it('itens sem passo a passo ficam aguardando o professor', () => {
    expect(semPassos.every((i) => i.validationStatus === 'aguardando_validacao')).toBe(true)
  })

  it('toda queda carrega nota de seguranca (RNF-06)', () => {
    const quedas = ITENS.filter((i) => i.moduloId === 'mod-quedas')
    expect(quedas).toHaveLength(5)
    for (const q of quedas) {
      expect(conteudoPorItem.get(q.id)?.notasSeguranca.length ?? 0).toBeGreaterThan(0)
      expect(q.safetyLevel).toBe('alto')
    }
  })

  it('defesa pessoal e marcada como alto risco', () => {
    const dp = ITENS.filter((i) => i.moduloId === 'mod-defesa-pessoal')
    expect(dp.every((i) => i.safetyLevel === 'alto')).toBe(true)
  })
})

describe('bilateralidade desligada (ADR-006 revisado)', () => {
  it('nenhum item nasce exigindo lados', () => {
    expect(ITENS.every((i) => i.sideMode === 'nao_se_aplica')).toBe(true)
  })
})

describe('requisitos da prova', () => {
  it('captura os 10 requisitos "exige N"', () => {
    expect(REQUISITOS).toHaveLength(10)
  })

  it('distingue Saida da Montada de Saida dos 100 Kilos', () => {
    // Ambas exigem 2. Se a chave de import colapsar as duas, uma se perde.
    const saidas = REQUISITOS.filter((r) => r.posicao.startsWith('Saída'))
    expect(saidas).toHaveLength(2)
    expect(new Set(saidas.map((r) => r.posicao)).size).toBe(2)
  })

  it('nenhum requisito aparece como confirmado pelo professor', () => {
    expect(REQUISITOS.every((r) => r.validationStatus === 'aguardando_validacao')).toBe(true)
  })
})

describe('10 aulas particulares', () => {
  it('tem 10 aulas numeradas de 1 a 10', () => {
    expect(AULAS.map((a) => a.numero)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('toda tecnica referenciada numa aula existe no curriculo', () => {
    const orfaos = AULAS.flatMap((a) => a.itemIds).filter((id) => !idsDosItens.has(id))
    expect(orfaos).toEqual([])
  })

  it('nenhuma aula nasce marcada como realizada', () => {
    expect(AULAS.every((a) => a.realizadaEm === undefined)).toBe(true)
    expect(AULAS.every((a) => a.correcoes.length === 0)).toBe(true)
  })
})

describe('duvidas para o professor', () => {
  it('inclui as 11 perguntas semeadas do spec', () => {
    const doSpec = DUVIDAS.filter((d) => d.origem === 'spec')
    expect(doSpec).toHaveLength(11)
  })

  it('gera duvida de lacuna para cada item ativo (gatilho e erro comum)', () => {
    const deLacuna = DUVIDAS.filter((d) => d.origem === 'lacuna_de_conteudo')
    // Nenhum item tem gatilho nem erro comum cadastrado ainda: 2 por item.
    expect(deLacuna).toHaveLength(ITENS.filter((i) => i.ativo).length * 2)
  })

  it('toda duvida nasce aberta e sem resposta', () => {
    expect(DUVIDAS.every((d) => d.status === 'aberta' && d.resposta === undefined)).toBe(true)
  })

  it('nao tem id duplicado', () => {
    expect(new Set(DUVIDAS.map((d) => d.id)).size).toBe(DUVIDAS.length)
  })

  it('o recorte por aula reduz a lista a algo levavel numa aula', () => {
    // A lista completa passa de 170 perguntas — inutil de levar a uma aula.
    expect(DUVIDAS.length).toBeGreaterThan(150)

    const daAula1 = duvidasParaAula(AULAS[0], DUVIDAS)
    expect(daAula1.length).toBeLessThan(30)

    // Toda pergunta do recorte e da aula ou geral, e nenhuma e de outra tecnica.
    const itensDaAula = new Set(AULAS[0].itemIds)
    expect(daAula1.every((d) => !d.itemId || itensDaAula.has(d.itemId))).toBe(true)
  })

  it('o recorte por aula ignora duvidas ja respondidas', () => {
    const respondida = { ...DUVIDAS.find((d) => d.itemId === AULAS[0].itemIds[0])!, status: 'respondida' as const }
    const comResposta = DUVIDAS.map((d) => (d.id === respondida.id ? respondida : d))
    expect(duvidasParaAula(AULAS[0], comResposta).some((d) => d.id === respondida.id)).toBe(false)
  })
})

describe('baralho gerado a partir do seed real', () => {
  const baralho = gerarBaralho({
    itens: ITENS,
    conteudos: CONTEUDOS,
    requisitos: REQUISITOS,
    cartoesTeoria: CARTOES_TEORIA,
  })

  it('gera um volume compativel com o horizonte de estudo', () => {
    // ~19 revisoes/dia por 63 dias comportam algo na casa das duas centenas.
    expect(baralho.length).toBeGreaterThan(150)
    expect(baralho.length).toBeLessThan(300)
  })

  it('nao gera cartao de execucao para nenhum item de defesa pessoal', () => {
    const idsDefesaPessoal = new Set(
      ITENS.filter((i) => i.moduloId === 'mod-defesa-pessoal').map((i) => i.id),
    )
    const proibidos = baralho.filter(
      (c) => c.itemId && idsDefesaPessoal.has(c.itemId) && (c.type === 'explicacao' || c.type === 'sequencia'),
    )
    expect(proibidos.map((c) => c.id)).toEqual([])
  })

  it('inclui o cartao de reconhecimento de defesa pessoal', () => {
    expect(baralho.some((c) => c.id === 'reconhecimento--mod-defesa-pessoal')).toBe(true)
  })

  it('cobre os 5 tipos de cartao decididos no planejamento', () => {
    expect(new Set(baralho.map((c) => c.type))).toEqual(
      new Set(['explicacao', 'sequencia', 'classificacao', 'requisito', 'teoria']),
    )
  })

  it('todo cartao de tecnica aponta para um item existente', () => {
    const orfaos = baralho.filter((c) => c.itemId && !idsDosItens.has(c.itemId))
    expect(orfaos.map((c) => c.id)).toEqual([])
  })
})

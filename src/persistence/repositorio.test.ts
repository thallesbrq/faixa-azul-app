import { describe, expect, it } from 'vitest'
import { depositoEmMemoria } from './deposito'
import {
  CHAVE,
  VERSAO_ATUAL,
  carregar,
  estadoInicial,
  exportarJSON,
  importarJSON,
  salvar,
} from './repositorio'

const AGORA = new Date('2026-08-22T12:00:00.000Z')

describe('carregar', () => {
  it('devolve estado inicial quando nao ha nada gravado', () => {
    const estado = carregar(depositoEmMemoria(), AGORA)
    expect(estado.versao).toBe(VERSAO_ATUAL)
    expect(estado.eventos).toEqual([])
    expect(estado.planoExame.provisoria).toBe(true)
  })

  it('a meta do exame nasce marcada como provisoria', () => {
    // O professor ainda nao marcou a data. A UI precisa poder dizer isso.
    expect(carregar(depositoEmMemoria(), AGORA).planoExame.provisoria).toBe(true)
  })

  it('recupera o que foi salvo', () => {
    const deposito = depositoEmMemoria()
    const estado = estadoInicial(AGORA)
    estado.eventos.push({
      id: 'e1',
      cardId: 'c1',
      side: 'unico',
      rating: 'good',
      usouDica: false,
      createdAt: AGORA.toISOString(),
    })
    salvar(deposito, estado)

    expect(carregar(deposito, AGORA).eventos).toHaveLength(1)
  })

  it('completa campos ausentes de um estado antigo sem descartar o resto', () => {
    // Um estado gravado por uma versao anterior pode nao ter todos os campos.
    const deposito = depositoEmMemoria({
      [CHAVE]: JSON.stringify({ versao: 1, eventos: [{ id: 'e1' }] }),
    })
    const estado = carregar(deposito, AGORA)
    expect(estado.eventos).toHaveLength(1)
    expect(estado.config.limiteDiario).toBeGreaterThan(0)
    expect(estado.revisoes).toEqual([])
  })

  it('nao perde o dado bruto quando o JSON esta corrompido', () => {
    // Perder o progresso silenciosamente e pior que comecar limpo avisando.
    const deposito = depositoEmMemoria({ [CHAVE]: '{isso nao e json' })
    const estado = carregar(deposito, AGORA)

    expect(estado.eventos).toEqual([])
    expect(deposito.ler(`${CHAVE}__corrompido_${AGORA.getTime()}`)).toBe('{isso nao e json')
  })
})

describe('exportar e importar (RF-10)', () => {
  it('faz a volta completa preservando o historico', () => {
    const estado = estadoInicial(AGORA)
    estado.eventos.push({
      id: 'e1',
      cardId: 'c1',
      side: 'unico',
      rating: 'again',
      usouDica: true,
      createdAt: AGORA.toISOString(),
    })

    const importado = importarJSON(exportarJSON(estado), AGORA)
    expect(importado.eventos).toEqual(estado.eventos)
  })

  it('recusa arquivo que nao e backup deste app', () => {
    expect(() => importarJSON(JSON.stringify({ qualquer: 'coisa' }), AGORA)).toThrow(/nao parece um backup/)
  })

  it('recusa JSON invalido', () => {
    expect(() => importarJSON('nao e json', AGORA)).toThrow()
  })
})

describe('deposito em memoria', () => {
  it('le, escreve e remove', () => {
    const d = depositoEmMemoria()
    expect(d.ler('x')).toBeNull()
    d.escrever('x', '1')
    expect(d.ler('x')).toBe('1')
    d.remover('x')
    expect(d.ler('x')).toBeNull()
  })
})

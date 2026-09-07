import { describe, expect, it } from 'vitest'
import { INTERVALO_MS, deveSincronizar } from './sincronizacao'
import type { Gatilho } from './sincronizacao'

const caso = (over: Partial<Parameters<typeof deveSincronizar>[0]> = {}) =>
  deveSincronizar({ gatilho: 'periodico', sujo: false, online: true, sincronizando: false, ...over })

describe('deveSincronizar', () => {
  it('SEM REDE nunca tenta — insistir gasta bateria para nada', () => {
    for (const g of ['abertura', 'periodico', 'saida', 'manual'] as Gatilho[]) {
      expect(caso({ gatilho: g, online: false, sujo: true }), g).toBe(false)
    }
  })

  it('UMA POR VEZ: nao inicia se ja houver uma em andamento', () => {
    // Duas em paralelo produziriam conflito consigo mesmas — a segunda partiria
    // de uma base que a primeira ja mudou.
    for (const g of ['abertura', 'periodico', 'saida', 'manual'] as Gatilho[]) {
      expect(caso({ gatilho: g, sincronizando: true, sujo: true }), g).toBe(false)
    }
  })

  it('ABERTURA tenta mesmo sem nada local pendente', () => {
    // Pode haver coisa nova no servidor: a grade que o professor montou.
    expect(caso({ gatilho: 'abertura', sujo: false })).toBe(true)
  })

  it('MANUAL tenta sempre — a pessoa pediu', () => {
    expect(caso({ gatilho: 'manual', sujo: false })).toBe(true)
  })

  it('PERIODICO e SAIDA so valem com algo para mandar', () => {
    expect(caso({ gatilho: 'periodico', sujo: false })).toBe(false)
    expect(caso({ gatilho: 'periodico', sujo: true })).toBe(true)
    expect(caso({ gatilho: 'saida', sujo: false })).toBe(false)
    expect(caso({ gatilho: 'saida', sujo: true })).toBe(true)
  })

  it('o intervalo nao e a cada cartao respondido', () => {
    // Uma sessao produz ~20 eventos: a cada resposta seriam 20 envios de 160 KB
    // em dados moveis, na academia.
    expect(INTERVALO_MS).toBeGreaterThanOrEqual(60_000)
  })
})

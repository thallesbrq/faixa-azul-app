import { describe, expect, it } from 'vitest'
import { dividirEmPartes, paresDoCirculo, passoDoCirculo } from './circulo'

describe('passoDoCirculo', () => {
  it('escolhe passo coprimo com n', () => {
    // Se o passo nao for coprimo, o ciclo fecha antes e grupos ficam de fora.
    for (let n = 3; n <= 30; n++) {
      const passo = passoDoCirculo(n)
      const mdc = (a: number, b: number): number => (b === 0 ? a : mdc(b, a % b))
      expect(mdc(passo, n)).toBe(1)
    }
  })

  it('reproduz os passos do calendario v2', () => {
    expect(passoDoCirculo(9)).toBe(4)
    expect(passoDoCirculo(8)).toBe(3)
  })
})

describe('paresDoCirculo', () => {
  it('cada grupo aparece exatamente duas vezes', () => {
    for (let n = 3; n <= 20; n++) {
      const pares = paresDoCirculo(n)
      const contagem = new Array<number>(n).fill(0)
      for (const [a, b] of pares) {
        contagem[a] += 1
        contagem[b] += 1
      }
      expect(contagem.every((c) => c === 2)).toBe(true)
    }
  })

  it('nunca pareia um grupo consigo mesmo', () => {
    for (let n = 3; n <= 20; n++) {
      expect(paresDoCirculo(n).every(([a, b]) => a !== b)).toBe(true)
    }
  })

  it('nunca repete o mesmo par', () => {
    for (let n = 3; n <= 20; n++) {
      const pares = paresDoCirculo(n)
      const chaves = pares.map(([a, b]) => [a, b].sort((x, y) => x - y).join('-'))
      expect(new Set(chaves).size).toBe(pares.length)
    }
  })

  it('afasta as duas aparicoes de um mesmo grupo', () => {
    // O ponto do esquema: se as duas passagens ficassem em aulas vizinhas, nao
    // haveria espacamento nenhum e a segunda seria so repeticao imediata.
    const n = 8
    const pares = paresDoCirculo(n)
    for (let g = 0; g < n; g++) {
      const rodadas = pares.flatMap((p, i) => (p.includes(g) ? [i] : []))
      expect(rodadas).toHaveLength(2)
      const distancia = Math.abs(rodadas[1] - rodadas[0])
      // Distancia circular: passar do fim para o comeco tambem conta.
      const circular = Math.min(distancia, n - distancia)
      expect(circular).toBeGreaterThanOrEqual(Math.floor(n / 2) - 1)
    }
  })

  it('lida com casos degenerados sem quebrar', () => {
    expect(paresDoCirculo(0)).toEqual([])
    expect(paresDoCirculo(1)).toEqual([[0, 0]])
    expect(paresDoCirculo(2)).toEqual([[0, 1]])
  })
})

describe('dividirEmPartes', () => {
  it('divide igual quando da', () => {
    expect(dividirEmPartes([1, 2, 3, 4], 2)).toEqual([
      [1, 2],
      [3, 4],
    ])
  })

  it('distribui o resto nos primeiros pedacos', () => {
    // 11 itens da Guarda Fechada em 2 aparicoes: 6 e 5, nao 5 e 6 nem 10 e 1.
    const onze = Array.from({ length: 11 }, (_, i) => i)
    const partes = dividirEmPartes(onze, 2)
    expect(partes.map((p) => p.length)).toEqual([6, 5])
  })

  it('nao perde nem duplica item', () => {
    const lista = Array.from({ length: 17 }, (_, i) => i)
    for (const partes of [2, 3, 5]) {
      const juntos = dividirEmPartes(lista, partes).flat()
      expect(juntos).toEqual(lista)
    }
  })

  it('aceita lista menor que o numero de partes', () => {
    // Saida do Norte-Sul tem 1 item so; a segunda aparicao fica vazia.
    expect(dividirEmPartes([1], 2)).toEqual([[1], []])
  })
})

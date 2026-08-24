import { describe, expect, it } from 'vitest'
import { dividirEmPartes, paresDoCirculo, passoDoCirculo, tamanhosEquilibrados } from './circulo'

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

describe('tamanhosEquilibrados', () => {
  it('soma sempre o total pedido', () => {
    for (const total of [0, 1, 7, 56, 100]) {
      for (const partes of [1, 3, 10, 12]) {
        const t = tamanhosEquilibrados(total, partes)
        expect(t.reduce((a, b) => a + b, 0)).toBe(total)
        expect(t).toHaveLength(partes)
      }
    }
  })

  it('a diferenca entre o maior e o menor nunca passa de 1', () => {
    // E o que "o mais igual possivel" significa na pratica.
    for (const total of [7, 56, 101]) {
      for (const partes of [3, 10, 12]) {
        const t = tamanhosEquilibrados(total, partes)
        expect(Math.max(...t) - Math.min(...t)).toBeLessThanOrEqual(1)
      }
    }
  })

  it('56 itens em 10 aulas da seis 6 e quatro 5', () => {
    const t = tamanhosEquilibrados(56, 10)
    expect(t).toEqual([5, 5, 5, 5, 6, 6, 6, 6, 6, 6])
    expect(t.filter((n) => n === 6)).toHaveLength(6)
  })

  it('as aulas mais cheias ficam no FIM', () => {
    // Deliberado: o item fica mais barato conforme o aluno estuda, entao a carga
    // maior vai para quando cada item custa menos.
    const t = tamanhosEquilibrados(56, 10)
    expect(t[0]).toBeLessThanOrEqual(t[t.length - 1])
  })

  it('restoNoFim: false inverte, para quem precisar do contrario', () => {
    expect(tamanhosEquilibrados(56, 10, false)).toEqual([6, 6, 6, 6, 6, 6, 5, 5, 5, 5])
  })

  it('divisao exata da todos iguais', () => {
    expect(tamanhosEquilibrados(50, 10)).toEqual([5, 5, 5, 5, 5, 5, 5, 5, 5, 5])
  })

  it('menos itens que grupos deixa grupos vazios, sem quebrar', () => {
    expect(tamanhosEquilibrados(3, 5)).toEqual([0, 0, 1, 1, 1])
  })

  it('casos degenerados', () => {
    expect(tamanhosEquilibrados(10, 0)).toEqual([])
    expect(tamanhosEquilibrados(0, 3)).toEqual([0, 0, 0])
  })
})

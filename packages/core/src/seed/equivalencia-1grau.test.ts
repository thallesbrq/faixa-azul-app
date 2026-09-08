import { describe, expect, it } from 'vitest'
import { EQUIVALENTES_DO_1GRAU, equivalentesDe } from './equivalencia-1grau'
import { ITENS_1GRAU } from './primeiro-grau'
import { CURRICULO_AZUL } from './curriculos'

const do1grau = new Set(ITENS_1GRAU.map((i) => i.id))
const doAzul = new Set(CURRICULO_AZUL.itens.map((i) => i.id))

describe('a tabela de equivalencia aponta para itens que EXISTEM', () => {
  /**
   * ESTE E O TESTE QUE JUSTIFICA O ARQUIVO TER TESTE.
   *
   * Um id digitado errado — `guarda-fechada--raspada1` sem o hifen, um item de
   * azul renomeado — nao da erro em lugar nenhum: o requisito simplesmente nunca
   * se satisfaz, e a matriz mostra "fora do programa" para sempre. O professor
   * leria isso como "esqueci de programar", programaria de novo, e continuaria
   * fora. Silencioso e permanente e a pior combinacao.
   */
  it('toda CHAVE e um requisito real do 1o grau', () => {
    for (const chave of Object.keys(EQUIVALENTES_DO_1GRAU)) {
      expect(do1grau.has(chave), `chave inexistente: ${chave}`).toBe(true)
    }
  })

  it('todo VALOR e um item real do curriculo de azul', () => {
    for (const [chave, ids] of Object.entries(EQUIVALENTES_DO_1GRAU)) {
      for (const id of ids) {
        expect(doAzul.has(id), `${chave} aponta para item inexistente: ${id}`).toBe(true)
      }
    }
  })

  it('nenhuma lista e VAZIA — ausente e vazio diriam a mesma coisa de formas diferentes', () => {
    for (const [chave, ids] of Object.entries(EQUIVALENTES_DO_1GRAU)) {
      expect(ids.length, `${chave} com lista vazia: remova a chave`).toBeGreaterThan(0)
    }
  })

  it('nenhum equivalente repetido dentro do mesmo requisito', () => {
    // Com a regra "todos os equivalentes", um id repetido nao muda o resultado —
    // mas conta duas vezes no parcial ("2 de 3" quando sao 2 itens distintos).
    for (const [chave, ids] of Object.entries(EQUIVALENTES_DO_1GRAU)) {
      expect(new Set(ids).size, `${chave} tem equivalente repetido`).toBe(ids.length)
    }
  })

  it('os dois universos continuam DISJUNTOS — se um dia se cruzarem, a tabela sobra', () => {
    /**
     * A tabela existe porque nenhum id e compartilhado. Se alguem fundir os
     * curriculos e este teste falhar, a leitura em `acompanhamento` passa a ter
     * dois caminhos para a mesma coisa — e o certo e apagar a tabela, nao
     * contornar.
     */
    const cruzam = [...do1grau].filter((id) => doAzul.has(id))
    expect(cruzam).toEqual([])
  })
})

describe('equivalentesDe', () => {
  it('devolve os tres ukemi — a decisao do professor foi "todos"', () => {
    expect(equivalentesDe('g1-edu--ukemi')).toEqual([
      'base-movimentacao--ukemi-frente',
      'base-movimentacao--ukemi-costas',
      'base-movimentacao--ukemi-lateral',
    ])
  })

  it('requisito sem equivalente devolve lista vazia, e nao undefined', () => {
    // `g1-dom--montada`: o azul nao enumera dominio de posicao. Um `undefined`
    // aqui obrigaria cada chamador a lembrar do `?? []`, e o que esquecer quebra.
    expect(equivalentesDe('g1-dom--montada')).toEqual([])
    expect(equivalentesDe('id-que-nao-existe')).toEqual([])
  })

  it('a rolagem de "Rolamentos (frente e costas)" sao os DOIS rolamentos', () => {
    // O caso que apareceu em producao: a aula 1 da RGI deu os dois, e a matriz
    // mostrava o requisito como "fora do programa".
    expect(equivalentesDe('g1-edu--rolamentos')).toHaveLength(2)
  })
})

describe('quanto da sobreposicao a tabela cobre', () => {
  it('cobre 16 dos 29 requisitos, e os outros 13 sao por desenho', () => {
    /**
     * NUMERO CRAVADO DE PROPOSITO, e o que ele protege e a REDUCAO. Se alguem
     * remover uma linha da tabela, a matriz volta a subnotificar em silencio; o
     * teste quebra e diz qual foi.
     *
     * Os 13 sem equivalente nao sao lacuna: o azul se organiza em torno de
     * guardas e passagens e nao enumera dominio de posicao (montada, 100 kg,
     * norte-sul, costas) nem ataque a partir delas. Eles entram no programa com o
     * proprio id `g1-*` e a matriz os le direto.
     */
    const cobertos = ITENS_1GRAU.filter((i) => equivalentesDe(i.id).length > 0)
    expect(cobertos).toHaveLength(16)
  })

  it('os quatro casos em duvida ficaram FORA — errado e invisivel, ausente e visivel', () => {
    /**
     * Documenta a decisao, para que "faltou mapear" nao se confunda com "decidi
     * nao mapear". Quando o professor confirmar, este teste muda junto.
     */
    for (const id of [
      'g1-gf--passagem-emborcando',
      'g1-gf--costas-do-pendulo',
      'g1-fin-costas--mata-leao',
      'g1-fin-costas--lapela',
    ]) {
      expect(do1grau.has(id), `${id} nao existe mais: reveja a tabela`).toBe(true)
      expect(equivalentesDe(id)).toEqual([])
    }
  })
})

import { describe, expect, it } from 'vitest'
import {
  aulasExigidas,
  METAS,
  metaPorId,
  metaSeguinte,
  metaTemCurriculo,
  nomeDaMeta,
  ROTULO_SEM_META,
  SEM_META,
} from './metas'

describe('metas', () => {
  it('a ordem e a da progressao, e nao alfabetica', () => {
    // `metaSeguinte` depende desta ordem: conceder o 1o grau avanca para o 2o.
    expect(METAS.map((m) => m.id)).toEqual(['1grau', '2grau', '3grau', '4grau', 'azul'])
  })

  it('so 1o grau e azul tem curriculo hoje', () => {
    // Nao e lacuna a corrigir: as listas do 2o, 3o e 4o nao chegaram.
    expect(metaTemCurriculo('1grau')).toBe(true)
    expect(metaTemCurriculo('azul')).toBe(true)
    expect(metaTemCurriculo('2grau')).toBe(false)
    expect(metaTemCurriculo('3grau')).toBe(false)
    expect(metaTemCurriculo('4grau')).toBe(false)
  })

  it('meta desconhecida NAO tem curriculo — escolha conservadora', () => {
    // Medir contra um curriculo que talvez nao seja o dele produz numero errado
    // com aparencia de certo; `—` e visivelmente uma lacuna.
    expect(metaTemCurriculo('roxa')).toBe(false)
    expect(metaTemCurriculo(SEM_META)).toBe(false)
  })

  it('35 aulas no 1o grau, 45 nos seguintes, e o azul nao conta aulas', () => {
    // O azul e a prova. Os 10 particulares sao pacote contratado, nao exigencia
    // de graduacao — dois numeros diferentes que por acaso falam de aulas.
    expect(aulasExigidas('1grau')).toBe(35)
    expect(aulasExigidas('2grau')).toBe(45)
    expect(aulasExigidas('3grau')).toBe(45)
    expect(aulasExigidas('4grau')).toBe(45)
    expect(aulasExigidas('azul')).toBeNull()
    expect(aulasExigidas('nao-existe')).toBeNull()
  })

  it('35 + 45 x 3 = 170 ate o 4o grau; o planner cobre 80 (1o + UM seguinte)', () => {
    // Registro da aritmetica que ele confirmou: 35 no 1o grau e 45 depois, 80 no
    // total do planner. Os 45 sao POR GRAU, entao o caminho inteiro ate o 4o
    // grau soma 170 aulas — o planner nao cobre isso, e nao deve: ele cobre o
    // grau atual e o seguinte.
    expect(aulasExigidas('1grau')! + aulasExigidas('2grau')!).toBe(80)
  })

  it('saber quantas aulas NAO e saber o curriculo — as duas ausencias convivem', () => {
    // O 2o grau tem numero de aulas conhecido (45) e lista de itens ausente.
    // Colapsar as duas faria a tela esconder o que ela sabe.
    expect(aulasExigidas('2grau')).toBe(45)
    expect(metaTemCurriculo('2grau')).toBe(false)
  })

  it('sem meta tem rotulo proprio, e nao fica em branco', () => {
    expect(nomeDaMeta(SEM_META)).toBe(ROTULO_SEM_META)
  })

  it('meta desconhecida mostra o proprio id, e nao erro', () => {
    // Firestore com `roxa` e app antigo: o professor precisa ver `roxa`.
    expect(nomeDaMeta('roxa')).toBe('roxa')
  })

  it('metaPorId devolve null para o que nao existe', () => {
    expect(metaPorId('1grau')?.nome).toBe('1º grau')
    expect(metaPorId('nada')).toBeNull()
    expect(metaPorId(SEM_META)).toBeNull()
  })

  describe('metaSeguinte', () => {
    it('avanca na progressao', () => {
      expect(metaSeguinte('1grau')).toBe('2grau')
      expect(metaSeguinte('4grau')).toBe('azul')
    })

    it('para no azul: o que vem depois e outra faixa', () => {
      expect(metaSeguinte('azul')).toBeNull()
    })

    it('meta desconhecida nao avanca para lugar nenhum', () => {
      // Sem isto, conceder grau a alguem com meta estranha o jogaria para a
      // primeira da lista — uma promocao ao contrario, em silencio.
      expect(metaSeguinte('roxa')).toBeNull()
      expect(metaSeguinte(SEM_META)).toBeNull()
    })
  })
})


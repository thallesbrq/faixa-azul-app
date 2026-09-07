import { describe, expect, it } from 'vitest'
import {
  aulasExigidas,
  medidaDoProgresso,
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

  it('35 aulas e exigencia do 1o grau; o azul nao conta aulas', () => {
    // O azul e a prova. Os 10 particulares sao pacote contratado, nao exigencia
    // de graduacao — dois numeros diferentes que por acaso falam de aulas.
    expect(aulasExigidas('1grau')).toBe(35)
    expect(aulasExigidas('azul')).toBeNull()
    expect(aulasExigidas('2grau')).toBeNull()
    expect(aulasExigidas('nao-existe')).toBeNull()
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

describe('medidaDoProgresso', () => {
  it('azul mede por CARTOES; o 1o grau por ATESTADO', () => {
    // O 1o grau nao tem passo a passo, e sem `passos` o gerador de cartoes
    // produz quase nada — 11 dos 29 itens ficariam com zero cartao. Entao a
    // medida dele e quantas competencias o professor confirmou (ADR-016, dec. 9).
    expect(medidaDoProgresso('azul')).toBe('cartoes')
    expect(medidaDoProgresso('1grau')).toBe('atestado')
  })

  it('meta desconhecida mede por atestado — escolha conservadora', () => {
    // Medir por cartoes um curriculo sem passo a passo produz zero eterno com
    // aparencia de desempenho.
    expect(medidaDoProgresso('roxa')).toBe('atestado')
    expect(medidaDoProgresso(SEM_META)).toBe('atestado')
  })
})

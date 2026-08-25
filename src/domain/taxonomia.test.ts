import { describe, expect, it } from 'vitest'
import {
  ORDEM_GUARDA,
  ROTULO_GUARDA,
  ROTULO_PAPEL,
  guardaDaPosicao,
  papelDoKind,
  subPosicao,
} from './taxonomia'
import type { Guarda } from './taxonomia'
import { ITENS } from '../seed'
import type { TechniqueKind } from './types'

const ATIVOS = ITENS.filter((i) => i.ativo)

describe('papelDoKind', () => {
  it('passagem e o unico kind em que o aluno esta em cima', () => {
    expect(papelDoKind('passagem')).toBe('passando')
  })

  it('saida e defesa sao o aluno embaixo, em desvantagem', () => {
    expect(papelDoKind('saida')).toBe('defendendo')
    expect(papelDoKind('defesa')).toBe('defendendo')
  })

  it('raspagem, finalizacao e costas sao o aluno atacando de baixo', () => {
    expect(papelDoKind('raspagem')).toBe('atacando')
    expect(papelDoKind('finalizacao')).toBe('atacando')
    // Ir as costas parte de uma guarda: o aluno esta embaixo.
    expect(papelDoKind('costas')).toBe('atacando')
  })

  it('todo kind tem papel — nenhum cai fora da classificacao', () => {
    const kinds: TechniqueKind[] = [
      'raspagem',
      'passagem',
      'finalizacao',
      'costas',
      'saida',
      'defesa',
      'movimentacao',
      'queda',
      'defesa_pessoal',
    ]
    for (const k of kinds) {
      expect(ROTULO_PAPEL[papelDoKind(k)], `kind "${k}" sem papel`).toBeTruthy()
    }
  })
})

describe('guardaDaPosicao', () => {
  it('sao exatamente as guardas do curriculo, nem uma mais nem uma menos', () => {
    // Correcao do aluno: eu havia inventado familias tecnicas (agrupando Aranha
    // com Laco, Dela Riva com Gancho). O curriculo do exame ja tem a sua
    // classificacao, e e ela que a academia fala.
    expect(ORDEM_GUARDA).toEqual([
      'fechada',
      'meia',
      'gancho',
      'aranha',
      'dela-riva',
      'laco',
      'aberta',
      'complexo',
      'saidas',
    ])
  })

  it('classifica cada posicao na sua propria guarda', () => {
    const esperado: [string, Guarda][] = [
      ['Guarda Fechada', 'fechada'],
      ['Meia Guarda (Tradicional e Escudo)', 'meia'],
      ['Guarda Gancho (Butterfly)', 'gancho'],
      ['Guarda Aranha', 'aranha'],
      ['Guarda Dela Riva', 'dela-riva'],
      ['Guarda Laço (Lasso Guard)', 'laco'],
      ['Guarda Aberta', 'aberta'],
      ['Complexo Moderno (One Leg, 50-50, Guarda X, Berimbolo)', 'complexo'],
      ['Saída da Montada', 'saidas'],
      ['Saída dos 100 Kilos', 'saidas'],
      ['Saída das Costas', 'saidas'],
      ['Saída do Norte-Sul', 'saidas'],
      ['Defesas de Finalização', 'saidas'],
    ]
    for (const [posicao, guarda] of esperado) {
      expect(guardaDaPosicao(posicao), posicao).toBe(guarda)
    }
  })

  it('Aranha e Laço NAO sao agrupadas — sao guardas distintas no curriculo', () => {
    // Era exatamente o erro da versao anterior.
    expect(guardaDaPosicao('Guarda Aranha')).not.toBe(guardaDaPosicao('Guarda Laço (Lasso Guard)'))
  })

  it('Dela Riva e Gancho NAO sao agrupadas', () => {
    expect(guardaDaPosicao('Guarda Dela Riva')).not.toBe(guardaDaPosicao('Guarda Gancho (Butterfly)'))
  })

  it('devolve null para posicao fora do curriculo, em vez de inventar', () => {
    expect(guardaDaPosicao('Guarda Que Nao Existe')).toBeNull()
  })

  it('TODA posicao ativa esta classificada', () => {
    // Rede de seguranca: um item novo no seed com posicao nova apareceria sem
    // rotulo no documento do professor, e ninguem notaria.
    const sem = ATIVOS.filter((i) => guardaDaPosicao(i.posicao) === null)
    expect(sem.map((i) => i.posicao)).toEqual([])
  })

  it('toda guarda usada tem rotulo legivel', () => {
    for (const i of ATIVOS) {
      const g = guardaDaPosicao(i.posicao)!
      expect(ROTULO_GUARDA[g], `guarda "${g}" sem rotulo`).toBeTruthy()
    }
  })

  it('as 9 guardas cobrem os 56 itens do curriculo do app', () => {
    const conta = new Map<Guarda, number>()
    for (const i of ATIVOS) {
      const g = guardaDaPosicao(i.posicao)!
      conta.set(g, (conta.get(g) ?? 0) + 1)
    }
    // Contagem conferida item a item contra o documento da banca.
    expect(conta.get('fechada')).toBe(11)
    expect(conta.get('meia')).toBe(8)
    expect(conta.get('gancho')).toBe(4)
    expect(conta.get('aranha')).toBe(5)
    expect(conta.get('dela-riva')).toBe(5)
    expect(conta.get('laco')).toBe(3)
    expect(conta.get('aberta')).toBe(4)
    // As quatro alternativas, com raspagem e passagem cada. A banca cobra 2
    // (uma das quatro); treinar as quatro e escolha de preparo.
    expect(conta.get('complexo')).toBe(8)
    // Montada 2 + Costas 1 + 100 kilos 2 + Norte-sul 1 + Armlock 1 + Triangulo 1.
    expect(conta.get('saidas')).toBe(8)
    expect([...conta.values()].reduce((a, b) => a + b, 0)).toBe(56)
  })
})

describe('subPosicao', () => {
  it('as quatro sub-posicoes do Complexo existem no seed', () => {
    // O dado ja estava no campo `categoria` desde a importacao — nao precisou
    // inventar nada, precisou olhar. Nenhuma foi apagada ao reduzir o escopo.
    const subs = new Set(
      ITENS.filter((i) => guardaDaPosicao(i.posicao) === 'complexo').map((i) => subPosicao(i)),
    )
    expect(subs).toEqual(new Set(['Guarda One Leg', 'Guarda 50-50', 'Guarda X', 'Berimbolo']))
  })

  it('cada sub-posicao do Complexo tem raspagem e passagem', () => {
    const porSub = new Map<string, Set<string>>()
    for (const i of ATIVOS.filter((x) => guardaDaPosicao(x.posicao) === 'complexo')) {
      const s = subPosicao(i)!
      if (!porSub.has(s)) porSub.set(s, new Set())
      porSub.get(s)!.add(i.kind)
    }
    expect(porSub.size).toBe(4)
    for (const [sub, kinds] of porSub) {
      expect(kinds.has('raspagem'), `${sub} sem raspagem`).toBe(true)
      expect(kinds.has('passagem'), `${sub} sem passagem`).toBe(true)
    }
  })

  it('nas saidas, a sub-posicao e a propria posicao', () => {
    expect(subPosicao({ posicao: 'Saída da Montada', categoria: 'Saídas' })).toBe('Saída da Montada')
  })

  it('guarda sem subdivisao devolve null — o rotulo dela ja diz tudo', () => {
    expect(subPosicao({ posicao: 'Guarda Fechada', categoria: 'Raspadas' })).toBeNull()
    expect(subPosicao({ posicao: 'Guarda Aranha', categoria: 'Raspadas' })).toBeNull()
  })
})

describe('guarda e papel sao dimensoes independentes', () => {
  it('TODA guarda do curriculo mistura atacar e passar', () => {
    // O motivo de as duas dimensoes existirem: o nome da guarda, sozinho, nao
    // diz de que lado da luta o aluno esta.
    const guardas: Guarda[] = ['fechada', 'meia', 'gancho', 'aranha', 'dela-riva', 'laco', 'aberta', 'complexo']
    for (const g of guardas) {
      const papeis = new Set(
        ATIVOS.filter((i) => guardaDaPosicao(i.posicao) === g).map((i) => papelDoKind(i.kind)),
      )
      expect(papeis.has('atacando'), `guarda "${g}" sem item de ataque`).toBe(true)
      expect(papeis.has('passando'), `guarda "${g}" sem item de passagem`).toBe(true)
    }
  })

  it('nas Saidas o aluno esta sempre defendendo', () => {
    const papeis = new Set(
      ATIVOS.filter((i) => guardaDaPosicao(i.posicao) === 'saidas').map((i) => papelDoKind(i.kind)),
    )
    expect([...papeis]).toEqual(['defendendo'])
  })
})

describe('categoria do seed', () => {
  it('nao ha singular e plural para a mesma categoria', () => {
    // Bug de importacao corrigido: "Passagem"/"Passagens" e
    // "Finalização"/"Finalizações" coexistiam, quebrando qualquer agrupamento.
    const cats = new Set(ITENS.map((i) => i.categoria))
    expect(cats.has('Passagem')).toBe(false)
    expect(cats.has('Finalização')).toBe(false)
    expect(cats.has('Passagens')).toBe(true)
    expect(cats.has('Finalizações')).toBe(true)
  })
})

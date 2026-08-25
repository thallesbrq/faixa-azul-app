import { describe, expect, it } from 'vitest'
import { ROTULO_FAMILIA, ROTULO_PAPEL, familiaDaPosicao, papelDoKind } from './taxonomia'
import type { Familia } from './taxonomia'
import { ITENS } from '../seed'
import type { TechniqueKind } from './types'

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

describe('familiaDaPosicao', () => {
  it('classifica as oito familias do escopo', () => {
    const esperado: [string, Familia][] = [
      ['Guarda Fechada', 'fechada'],
      ['Meia Guarda (Tradicional e Escudo)', 'meia'],
      ['Guarda Aranha', 'pegada-manga'],
      ['Guarda Laço (Lasso Guard)', 'pegada-manga'],
      ['Guarda Dela Riva', 'gancho'],
      ['Guarda Gancho (Butterfly)', 'gancho'],
      ['Guarda Aberta', 'sem-pegada'],
      ['Complexo Moderno (One Leg, 50-50, Guarda X, Berimbolo)', 'pernas'],
      ['Saída da Montada', 'dominada'],
      ['Defesas de Finalização', 'finalizacao-sofrida'],
    ]
    for (const [posicao, familia] of esperado) {
      expect(familiaDaPosicao(posicao), posicao).toBe(familia)
    }
  })

  it('Aranha e Laço sao a mesma familia — as duas pegam manga', () => {
    expect(familiaDaPosicao('Guarda Aranha')).toBe(familiaDaPosicao('Guarda Laço (Lasso Guard)'))
  })

  it('Dela Riva e Gancho sao a mesma familia — as duas usam gancho', () => {
    expect(familiaDaPosicao('Guarda Dela Riva')).toBe(familiaDaPosicao('Guarda Gancho (Butterfly)'))
  })

  it('devolve null para posicao desconhecida, em vez de inventar', () => {
    expect(familiaDaPosicao('Guarda Que Nao Existe')).toBeNull()
  })

  it('TODA posicao ativa do curriculo esta classificada', () => {
    // Rede de seguranca: um item novo no seed com posicao nova apareceria sem
    // rotulo no documento do professor, e ninguem notaria.
    const semFamilia = ITENS.filter((i) => i.ativo && familiaDaPosicao(i.posicao) === null)
    expect(semFamilia.map((i) => i.posicao)).toEqual([])
  })

  it('toda familia usada tem rotulo legivel', () => {
    for (const i of ITENS.filter((x) => x.ativo)) {
      const f = familiaDaPosicao(i.posicao)
      if (f) expect(ROTULO_FAMILIA[f], `familia "${f}" sem rotulo`).toBeTruthy()
    }
  })
})

describe('as duas dimensoes sao independentes', () => {
  it('a mesma familia contem papeis diferentes — o motivo de existirem duas', () => {
    // A Guarda Fechada tem raspagem (atacando) E passagem (passando). Se familia
    // e papel fossem redundantes, uma das duas nao precisaria existir.
    const daFechada = ITENS.filter((i) => i.ativo && familiaDaPosicao(i.posicao) === 'fechada')
    const papeis = new Set(daFechada.map((i) => papelDoKind(i.kind)))
    expect(papeis.size).toBeGreaterThan(1)
    expect(papeis.has('atacando')).toBe(true)
    expect(papeis.has('passando')).toBe(true)
  })

  it('TODA familia de guarda mistura atacar e passar', () => {
    // Foi o que motivou a taxonomia: o rotulo da posicao, sozinho, nao diz de
    // que lado da luta o aluno esta.
    const guardas: Familia[] = ['fechada', 'meia', 'pegada-manga', 'gancho', 'sem-pegada', 'pernas']
    for (const f of guardas) {
      const itens = ITENS.filter((i) => i.ativo && familiaDaPosicao(i.posicao) === f)
      const papeis = new Set(itens.map((i) => papelDoKind(i.kind)))
      expect(papeis.has('atacando'), `familia "${f}" sem item de ataque`).toBe(true)
      expect(papeis.has('passando'), `familia "${f}" sem item de passagem`).toBe(true)
    }
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

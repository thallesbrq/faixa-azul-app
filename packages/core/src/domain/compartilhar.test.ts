import { describe, expect, it } from 'vitest'
import {
  assinatura,
  codificarMontagem,
  codigoDoHash,
  decodificarMontagem,
  linkDaMontagem,
} from './compartilhar'
import { ITENS } from '../seed'
import type { TechniqueItem } from './types'

const ATIVOS = ITENS.filter((i) => i.ativo)

function item(id: string): TechniqueItem {
  return {
    id,
    moduloId: 'mod-guardas',
    posicao: 'Guarda Fechada',
    slot: id,
    categoria: 'Raspadas',
    nome: id,
    aliases: [],
    kind: 'raspagem',
    sideMode: 'nao_se_aplica',
    safetyLevel: 'baixo',
    validationStatus: 'sugestao_nao_validada',
    sourceReference: 'Seção 4',
    ativo: true,
  }
}

/** Distribui os ativos ciclicamente nas 10 aulas. */
function arranjoCompleto(): Map<number, string[]> {
  const m = new Map<number, string[]>()
  ATIVOS.forEach((it, i) => {
    const aula = (i % 10) + 1
    const lista = m.get(aula)
    if (lista) lista.push(it.id)
    else m.set(aula, [it.id])
  })
  return m
}

describe('assinatura', () => {
  it('e deterministica', () => {
    expect(assinatura(['a', 'b'])).toBe(assinatura(['a', 'b']))
  })

  it('muda quando a ORDEM muda — e o que detecta curriculo reordenado', () => {
    expect(assinatura(['a', 'b'])).not.toBe(assinatura(['b', 'a']))
  })

  it('muda quando um id muda', () => {
    expect(assinatura(['a', 'b'])).not.toBe(assinatura(['a', 'c']))
  })
})

describe('ida e volta', () => {
  it('o arranjo sobrevive a codificacao e decodificacao', () => {
    const original = arranjoCompleto()
    const { codigo, atribuidos } = codificarMontagem(ATIVOS, original)
    const r = decodificarMontagem(codigo, ATIVOS)

    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.atribuidos).toBe(atribuidos)
    expect(r.atribuidos).toBe(56)

    // Mesmos itens nas mesmas aulas.
    for (const [aula, ids] of original) {
      expect(new Set(r.atribuicao.get(aula))).toEqual(new Set(ids))
    }
  })

  it('bolsao cheio codifica e volta vazio, sem perder ninguem', () => {
    const { codigo, atribuidos } = codificarMontagem(ATIVOS, new Map())
    expect(atribuidos).toBe(0)
    const r = decodificarMontagem(codigo, ATIVOS)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.atribuicao.size).toBe(0)
  })

  it('arranjo parcial preserva exatamente quem estava atribuido', () => {
    const parcial = new Map([[3, [ATIVOS[0].id, ATIVOS[5].id]]])
    const { codigo } = codificarMontagem(ATIVOS, parcial)
    const r = decodificarMontagem(codigo, ATIVOS)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.atribuidos).toBe(2)
    expect(new Set(r.atribuicao.get(3))).toEqual(new Set([ATIVOS[0].id, ATIVOS[5].id]))
  })

  it('o codigo dos 56 itens cabe num link de mensagem', () => {
    const { codigo } = codificarMontagem(ATIVOS, arranjoCompleto())
    // 2 caracteres por item preservam a ORDEM dentro da aula; o dobro do
    // tamanho da primeira versao, e ainda curto para WhatsApp.
    expect(codigo.length).toBeLessThan(200)
  })

  it('PRESERVA a ordem dentro da aula', () => {
    // A primeira versao guardava so em qual aula o item estava, e a sequencia
    // (aquecer com a raspada, depois a passagem) se perdia no caminho.
    const ordemEscolhida = [ATIVOS[9].id, ATIVOS[2].id, ATIVOS[40].id]
    const { codigo } = codificarMontagem(ATIVOS, new Map([[4, ordemEscolhida]]))
    const r = decodificarMontagem(codigo, ATIVOS)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.atribuicao.get(4)).toEqual(ordemEscolhida)
  })
})

describe('recusa em vez de adivinhar', () => {
  it('recusa quando a QUANTIDADE de itens mudou', () => {
    // Cada recusa aqui e um arranjo trocado que nao chegou ao aluno.
    const { codigo } = codificarMontagem(ATIVOS, arranjoCompleto())
    const r = decodificarMontagem(codigo, ATIVOS.slice(0, 55))
    expect(r).toEqual({ ok: false, motivo: 'quantidade-diferente' })
  })

  it('recusa quando o curriculo foi REORDENADO, mesmo com o mesmo tamanho', () => {
    // O caso perigoso: tamanho igual, conteudo deslocado. Sem a assinatura,
    // isto decodificaria um arranjo embaralhado que PARECE valido.
    const { codigo } = codificarMontagem(ATIVOS, arranjoCompleto())
    const trocado = [ATIVOS[1], ATIVOS[0], ...ATIVOS.slice(2)]
    const r = decodificarMontagem(codigo, trocado)
    expect(r).toEqual({ ok: false, motivo: 'curriculo-diferente' })
  })

  it('recusa quando um id mudou', () => {
    const { codigo } = codificarMontagem(ATIVOS, arranjoCompleto())
    const outro = [item('id-novo'), ...ATIVOS.slice(1)]
    const r = decodificarMontagem(codigo, outro)
    expect(r).toEqual({ ok: false, motivo: 'curriculo-diferente' })
  })

  it('recusa codigo TRUNCADO, que decodificaria um arranjo incompleto valido', () => {
    // O risco especifico do payload de tamanho variavel: cortado, ele decodifica
    // menos itens sem nenhum sinal de erro. So a contagem no cabecalho pega.
    const { codigo } = codificarMontagem(ATIVOS, arranjoCompleto())
    for (const corte of [20, 40, 80, codigo.length - 4]) {
      const r = decodificarMontagem(codigo.slice(0, corte), ATIVOS)
      expect(r.ok, `corte em ${corte} deveria ser recusado`).toBe(false)
    }
    expect(decodificarMontagem(codigo.slice(0, 60), ATIVOS).ok).toBe(false)
  })

  it('recusa lixo e vazio', () => {
    expect(decodificarMontagem('lixo', ATIVOS)).toEqual({ ok: false, motivo: 'formato' })
    expect(decodificarMontagem('', ATIVOS)).toEqual({ ok: false, motivo: 'formato' })
  })

  it('recusa o mesmo item em duas aulas', () => {
    // Invariante quebrada chegando de fora: o codigo pode ter sido editado a mao
    // ou gerado por versao com bug, e nao confiamos no que veio.
    const { codigo } = codificarMontagem(ATIVOS, new Map([[1, [ATIVOS[0].id]]]))
    const [cab, ass] = codigo.split('-')
    // Indice 00 nas aulas 1 E 2, com os 10 segmentos e a contagem coerentes —
    // para o codigo passar por todas as verificacoes anteriores e chegar nesta.
    const payload = ['00', '00', '', '', '', '', '', '', '', ''].join('.')
    const forjado = `${cab.replace(/x.*/, 'x2')}-${ass}-${payload}`
    expect(decodificarMontagem(forjado, ATIVOS)).toEqual({ ok: false, motivo: 'formato' })
  })

  it('recusa payload com mais segmentos que aulas', () => {
    const { codigo } = codificarMontagem(ATIVOS, new Map([[1, [ATIVOS[0].id]]]))
    const [cab, ass, payload] = codigo.split('-')
    expect(decodificarMontagem(`${cab}-${ass}-${payload}.`, ATIVOS)).toEqual({
      ok: false,
      motivo: 'destino-invalido',
    })
  })

  it('recusa versao diferente', () => {
    const { codigo } = codificarMontagem(ATIVOS, arranjoCompleto())
    const outraVersao = `9${codigo.slice(1)}`
    expect(decodificarMontagem(outraVersao, ATIVOS)).toEqual({ ok: false, motivo: 'versao' })
  })

  it('recusa destino acima do numero de aulas', () => {
    const dez = codificarMontagem(ATIVOS, new Map([[10, [ATIVOS[0].id]]]))
    // Valido com 10 aulas...
    expect(decodificarMontagem(dez.codigo, ATIVOS, 10).ok).toBe(true)
    // ...e recusado se o pacote tivesse 5.
    expect(decodificarMontagem(dez.codigo, ATIVOS, 5)).toEqual({
      ok: false,
      motivo: 'destino-invalido',
    })
  })

  it('aceita espacos em volta — o codigo vem colado de mensagem', () => {
    const { codigo } = codificarMontagem(ATIVOS, arranjoCompleto())
    expect(decodificarMontagem(`  ${codigo}\n`, ATIVOS).ok).toBe(true)
  })
})

describe('link', () => {
  it('poe o codigo no FRAGMENTO, que nao vai ao servidor', () => {
    const link = linkDaMontagem('https://exemplo.com/app/', 'abc')
    expect(link).toBe('https://exemplo.com/app/#m=abc')
  })

  it('substitui fragmento existente em vez de acumular', () => {
    expect(linkDaMontagem('https://exemplo.com/app/#m=velho', 'novo')).toBe(
      'https://exemplo.com/app/#m=novo',
    )
  })

  it('le o codigo de volta do hash', () => {
    const { codigo } = codificarMontagem(ATIVOS, arranjoCompleto())
    const link = linkDaMontagem('https://exemplo.com/app/', codigo)
    expect(codigoDoHash(new URL(link).hash)).toBe(codigo)
  })

  it('devolve null quando nao ha codigo no hash', () => {
    expect(codigoDoHash('')).toBeNull()
    expect(codigoDoHash('#outra-coisa')).toBeNull()
  })

  it('acha o codigo mesmo com outro parametro antes', () => {
    expect(codigoDoHash('#x=1&m=abc')).toBe('abc')
  })
})

import { describe, expect, it } from 'vitest'
import { ITENS_1GRAU, MODULOS_1GRAU } from './primeiro-grau'
import { ITENS } from './index'
import { grupoDoKind, ORDEM_GRUPO } from '../domain/taxonomia'

describe('curriculo do 1o grau', () => {
  it('tem os 29 itens da lista do professor', () => {
    // 3 quedas + 6 guarda fechada + 4 educativos + 4 dominios + 10 finalizacoes
    // + 2 saidas. Se a contagem mudar, alguem mexeu na lista dele.
    expect(ITENS_1GRAU).toHaveLength(29)
  })

  it('a contagem por grupo e a que ele escreveu', () => {
    const por: Record<string, number> = {}
    for (const i of ITENS_1GRAU) por[i.moduloId] = (por[i.moduloId] ?? 0) + 1
    expect(por).toEqual({
      'g1-quedas': 3,
      'g1-guarda-fechada': 6,
      'g1-educativos': 4,
      'g1-dominio': 4,
      'g1-finalizacoes': 10,
      'g1-saidas': 2,
    })
  })

  it('nao tem id duplicado', () => {
    // A mesma tecnica de posicoes diferentes (cruzado da fechada, dos 100kg, da
    // montada) sao TRES itens — e foi por confundir isso que a primeira
    // conferencia contra o curriculo de azul saiu errada.
    expect(new Set(ITENS_1GRAU.map((i) => i.id)).size).toBe(29)
  })

  it('os ids NAO colidem com os do curriculo de azul', () => {
    // Curriculos separados (ADR-016, decisao 1): id repetido faria o progresso
    // de um contaminar o do outro.
    const azul = new Set(ITENS.map((i) => i.id))
    expect(ITENS_1GRAU.filter((i) => azul.has(i.id))).toEqual([])
  })

  it('todo moduloId existe em MODULOS_1GRAU', () => {
    const ids = new Set(MODULOS_1GRAU.map((m) => m.id))
    expect(ITENS_1GRAU.filter((i) => !ids.has(i.moduloId))).toEqual([])
  })

  it('NENHUM item nasce validado, e nenhum aponta para o PDF do exame', () => {
    // Redigir passo a passo ou reivindicar a fonte do exame seria inventar
    // conteudo sobre um documento que tem a sua propria linguagem.
    expect(ITENS_1GRAU.every((i) => i.validationStatus === 'aguardando_validacao')).toBe(true)
    expect(ITENS_1GRAU.every((i) => i.sourceReference.includes('1º grau'))).toBe(true)
    expect(ITENS_1GRAU.some((i) => /Seção|PDF|banca/i.test(i.sourceReference))).toBe(false)
  })

  it('todo item tem nome — a lista dele nomeia tudo', () => {
    // Diferente do curriculo de azul, onde 25 itens tem `nome` vazio porque o
    // PDF so menciona o slot. Aqui o professor escreveu o nome de cada um.
    expect(ITENS_1GRAU.filter((i) => i.nome.trim() === '')).toEqual([])
  })

  it('os 4 dominios de posicao usam o kind novo', () => {
    const dominios = ITENS_1GRAU.filter((i) => i.kind === 'dominio')
    expect(dominios).toHaveLength(4)
    expect(dominios.map((i) => i.nome)).toEqual([
      '100 kg lateral',
      '100 kg norte-sul',
      'Montada',
      'Domínio de costas com gancho',
    ])
  })

  it('todo kind usado cai num grupo tecnico que existe', () => {
    for (const i of ITENS_1GRAU) expect(ORDEM_GRUPO).toContain(grupoDoKind(i.kind))
  })

  it('a ambiguidade do tripe fica MARCADA no proprio item', () => {
    // Escolher entre "tripe da fechada" e "tripe de outra guarda" por conta
    // propria seria inventar curriculo. A pergunta viaja com o dado.
    const tripe = ITENS_1GRAU.find((i) => i.id === 'g1-gf--raspagem-tripe')
    expect(tripe?.sourceReference).toContain('CONFIRMAR')
  })

  it('as tres finalizacoes repetidas sao itens SEPARADOS por posicao', () => {
    const cruzados = ITENS_1GRAU.filter((i) => i.nome === 'Estrangulamento cruzado')
    expect(cruzados.map((i) => i.posicao).sort()).toEqual(['100 Kilos', 'Guarda Fechada', 'Montada'])
  })

  it('nada bilateral por padrao (ADR-006 revisado)', () => {
    expect(ITENS_1GRAU.every((i) => i.sideMode === 'nao_se_aplica')).toBe(true)
  })

  it('quedas sao o unico grupo de risco alto', () => {
    // Projecao tem risco que raspagem nao tem. Estimativa conservadora, a
    // corrigir pelo professor.
    const alto = ITENS_1GRAU.filter((i) => i.safetyLevel === 'alto')
    expect(alto.map((i) => i.moduloId)).toEqual(['g1-quedas', 'g1-quedas', 'g1-quedas'])
  })
})

/**
 * Integridade do seed real (nao de dados de teste).
 *
 * Estes testes existem para pegar dessincronizacao: se o script de import for
 * reexecutado, se um item for renomeado ou se uma aula referenciar uma tecnica
 * que nao existe mais, o teste quebra aqui em vez de virar tela em branco.
 */

import { describe, expect, it } from 'vitest'
import { gerarBaralho } from '../domain/cards'
import { AULAS, CARTOES_TEORIA, CONTEUDOS, ITENS, MODULOS, REQUISITOS } from './index'

const idsDosItens = new Set(ITENS.map((i) => i.id))
const idsDosModulos = new Set(MODULOS.map((m) => m.id))
const conteudoPorItem = new Map(CONTEUDOS.map((c) => [c.itemId, c]))

describe('curriculo', () => {
  it('tem os 81 itens do documento da prova', () => {
    expect(ITENS).toHaveLength(81)
  })

  it('nao tem id duplicado', () => {
    expect(idsDosItens.size).toBe(ITENS.length)
  })

  it('todo item aponta para um modulo existente', () => {
    const orfaos = ITENS.filter((i) => !idsDosModulos.has(i.moduloId))
    expect(orfaos.map((i) => i.id)).toEqual([])
  })

  it('todo item tem exatamente um conteudo', () => {
    expect(CONTEUDOS).toHaveLength(ITENS.length)
    const semConteudo = ITENS.filter((i) => !conteudoPorItem.has(i.id))
    expect(semConteudo.map((i) => i.id)).toEqual([])
  })

  it('todo conteudo aponta para um item existente', () => {
    const orfaos = CONTEUDOS.filter((c) => !idsDosItens.has(c.itemId))
    expect(orfaos.map((c) => c.itemId)).toEqual([])
  })
})

describe('cobertura de passo a passo', () => {
  const comPassos = ITENS.filter((i) => (conteudoPorItem.get(i.id)?.passos.length ?? 0) > 0)
  const semPassos = ITENS.filter((i) => (conteudoPorItem.get(i.id)?.passos.length ?? 0) === 0)

  it('70 itens tem passo a passo (56 importados + 14 escritos a mao)', () => {
    expect(comPassos).toHaveLength(70)
  })

  it('os 11 itens sem passo a passo sao TODOS de defesa pessoal (ADR-012)', () => {
    expect(semPassos).toHaveLength(11)
    expect(new Set(semPassos.map((i) => i.moduloId))).toEqual(new Set(['mod-defesa-pessoal']))
  })

  it('nenhum item com passo a passo aparece como validado pelo professor', () => {
    // Nada foi validado ainda: o professor nao viu o conteudo. Se algum item
    // aparecer como validado sem uma correcao registrada, e bug de estado.
    const validados = comPassos.filter((i) => i.validationStatus === 'validado_pelo_professor')
    expect(validados.map((i) => i.id)).toEqual([])
  })

  it('itens sem passo a passo ficam aguardando o professor', () => {
    expect(semPassos.every((i) => i.validationStatus === 'aguardando_validacao')).toBe(true)
  })

  it('toda queda carrega nota de seguranca (RNF-06)', () => {
    const quedas = ITENS.filter((i) => i.moduloId === 'mod-quedas')
    expect(quedas).toHaveLength(5)
    for (const q of quedas) {
      expect(conteudoPorItem.get(q.id)?.notasSeguranca.length ?? 0).toBeGreaterThan(0)
      expect(q.safetyLevel).toBe('alto')
    }
  })

  it('defesa pessoal e marcada como alto risco', () => {
    const dp = ITENS.filter((i) => i.moduloId === 'mod-defesa-pessoal')
    expect(dp.every((i) => i.safetyLevel === 'alto')).toBe(true)
  })
})

describe('foco declarado nas Secoes 4 e 5', () => {
  const ativos = ITENS.filter((i) => i.ativo)

  it('mantem os 81 itens no seed — desativar nao e apagar', () => {
    // Se um dia o foco mudar, basta trocar MODULOS_ATIVOS: o conteudo continua aqui.
    expect(ITENS).toHaveLength(81)
  })

  it('deixa ativos somente guardas e saidas', () => {
    expect(new Set(ativos.map((i) => i.moduloId))).toEqual(new Set(['mod-guardas', 'mod-saidas']))
  })

  it('sao 56 itens ativos: 48 de guardas + 8 de saidas', () => {
    // Decisao do aluno: o curriculo do app mantem os 56, e a escolha de treinar
    // uma ou as quatro alternativas do Complexo Moderno e feita na montagem das
    // aulas, com o professor. O documento da banca cobra 50 (uma raspagem e uma
    // passagem de UMA das quatro alternativas) — treinar as quatro e preparo a
    // mais, nao erro.
    expect(ativos).toHaveLength(56)
    expect(ativos.filter((i) => i.moduloId === 'mod-guardas')).toHaveLength(48)
    expect(ativos.filter((i) => i.moduloId === 'mod-saidas')).toHaveLength(8)
  })

  it('56 em 10 aulas nao divide exato — o arranjo equilibrado e 6x6 + 4x5', () => {
    // A aritmetica que a tela de montagem precisa deixar visivel.
    expect(ativos.length % 10).toBe(6)
    expect(6 * 6 + 4 * 5).toBe(ativos.length)
  })

  it('TODO item tem kind — o tipo exige, e o seed precisa sustentar', () => {
    // `kind` deixou de ser opcional no tipo porque nenhum item vive sem ele. Se
    // um import futuro trouxer item sem kind, este teste falha antes de a tela
    // mostrar etiqueta vazia.
    const semKind = ITENS.filter((i) => !i.kind)
    expect(semKind.map((i) => i.id)).toEqual([])
  })

  it('as quatro alternativas do Complexo estao ativas', () => {
    const doComplexo = ativos.filter((i) => i.posicao.startsWith('Complexo Moderno'))
    expect(new Set(doComplexo.map((i) => i.categoria))).toEqual(
      new Set(['Guarda One Leg', 'Guarda 50-50', 'Guarda X', 'Berimbolo']),
    )
    expect(doComplexo).toHaveLength(8)
  })

  it('todo item ativo tem passo a passo', () => {
    // Os 11 sem instrucao textual eram todos de defesa pessoal, agora inativa.
    const semPassos = ativos.filter((i) => (conteudoPorItem.get(i.id)?.passos.length ?? 0) === 0)
    expect(semPassos.map((i) => i.id)).toEqual([])
  })
})

describe('bilateralidade desligada (ADR-006 revisado)', () => {
  it('nenhum item nasce exigindo lados', () => {
    expect(ITENS.every((i) => i.sideMode === 'nao_se_aplica')).toBe(true)
  })
})

describe('requisitos da prova', () => {
  it('captura os 10 requisitos "exige N"', () => {
    expect(REQUISITOS).toHaveLength(10)
  })

  it('distingue Saida da Montada de Saida dos 100 Kilos', () => {
    // Ambas exigem 2. Se a chave de import colapsar as duas, uma se perde.
    const saidas = REQUISITOS.filter((r) => r.posicao.startsWith('Saída'))
    expect(saidas).toHaveLength(2)
    expect(new Set(saidas.map((r) => r.posicao)).size).toBe(2)
  })

  it('nenhum requisito aparece como confirmado pelo professor', () => {
    expect(REQUISITOS.every((r) => r.validationStatus === 'aguardando_validacao')).toBe(true)
  })
})

describe('10 aulas particulares', () => {
  it('tem 10 aulas numeradas de 1 a 10', () => {
    expect(AULAS.map((a) => a.numero)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('toda tecnica referenciada numa aula existe no curriculo', () => {
    const orfaos = AULAS.flatMap((a) => a.itemIds).filter((id) => !idsDosItens.has(id))
    expect(orfaos).toEqual([])
  })

  it('nenhuma aula nasce marcada como realizada', () => {
    expect(AULAS.every((a) => a.realizadaEm === undefined)).toBe(true)
  })

  it('as 10 aulas cobrem Secoes 4 e 5; Secoes 1-3 ficam para a aula regular', () => {
    // Decisao de planejamento: hora paga 1:1 vai para as guardas, que sao a
    // parte tecnicamente mais dificil. Fundamentos, Defesa Pessoal e Quedas
    // sao validados nas aulas de segunda e quarta (origem 'aula_regular').
    const nasAulas = new Set(AULAS.flatMap((a) => a.itemIds))
    const modulosCobertos = new Set(ITENS.filter((i) => nasAulas.has(i.id)).map((i) => i.moduloId))
    expect(modulosCobertos).toEqual(new Set(['mod-guardas', 'mod-saidas']))

    const foraDasAulas = ITENS.filter((i) => !nasAulas.has(i.id))
    expect(foraDasAulas).toHaveLength(25)
    expect(new Set(foraDasAulas.map((i) => i.moduloId))).toEqual(
      new Set(['mod-fundamentos', 'mod-defesa-pessoal', 'mod-quedas']),
    )
  })
})

describe('baralho gerado a partir do seed real', () => {
  const baralho = gerarBaralho({
    itens: ITENS,
    conteudos: CONTEUDOS,
    requisitos: REQUISITOS,
    cartoesTeoria: CARTOES_TEORIA,
  })

  it('gera um volume compativel com o horizonte de estudo', () => {
    // ~19 revisoes/dia por 63 dias comportam algo na casa das duas centenas.
    expect(baralho.length).toBeGreaterThan(150)
    expect(baralho.length).toBeLessThan(300)
  })

  it('nao gera cartao de execucao para nenhum item de defesa pessoal', () => {
    const idsDefesaPessoal = new Set(
      ITENS.filter((i) => i.moduloId === 'mod-defesa-pessoal').map((i) => i.id),
    )
    const proibidos = baralho.filter(
      (c) => c.itemId && idsDefesaPessoal.has(c.itemId) && (c.type === 'explicacao' || c.type === 'sequencia'),
    )
    expect(proibidos.map((c) => c.id)).toEqual([])
  })

  it('nao gera cartao nenhum para modulo desativado (foco nas Secoes 4 e 5)', () => {
    const inativos = new Set(ITENS.filter((i) => !i.ativo).map((i) => i.id))
    const vazados = baralho.filter((c) => c.itemId && inativos.has(c.itemId))
    expect(vazados.map((c) => c.id)).toEqual([])

    // O cartao de reconhecimento de defesa pessoal tambem desaparece: o modulo
    // esta desativado, e gerar cartao dele contradiria o foco declarado.
    expect(baralho.some((c) => c.id === 'reconhecimento--mod-defesa-pessoal')).toBe(false)
  })

  it('cobre os 5 tipos de cartao decididos no planejamento', () => {
    expect(new Set(baralho.map((c) => c.type))).toEqual(
      new Set(['explicacao', 'sequencia', 'classificacao', 'requisito', 'teoria']),
    )
  })

  it('todo cartao de tecnica aponta para um item existente', () => {
    const orfaos = baralho.filter((c) => c.itemId && !idsDosItens.has(c.itemId))
    expect(orfaos.map((c) => c.id)).toEqual([])
  })
})

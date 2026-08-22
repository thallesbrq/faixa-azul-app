import { describe, expect, it } from 'vitest'
import { aplicarValidacoes, coberturaDeValidacao, criarValidacao, historicoDoItem } from './validacao'
import type { TechniqueItem, ValidacaoDoProfessor } from './types'

const AGORA = new Date('2026-08-25T19:30:00.000Z')
const DEPOIS = new Date('2026-09-08T19:30:00.000Z')

function item(over: Partial<TechniqueItem> = {}): TechniqueItem {
  return {
    id: 'gf--raspada-1',
    moduloId: 'mod-guardas',
    posicao: 'Guarda Fechada',
    slot: 'Raspada 1',
    categoria: 'Raspadas',
    nome: 'Raspagem de tesoura',
    aliases: [],
    kind: 'raspagem',
    sideMode: 'nao_se_aplica',
    safetyLevel: 'baixo',
    validationStatus: 'sugestao_nao_validada',
    sourceReference: 'Secao 4',
    ativo: true,
    ...over,
  }
}

function validacao(over: Partial<Parameters<typeof criarValidacao>[0]> = {}) {
  return criarValidacao({
    id: 'v1',
    itemId: 'gf--raspada-1',
    texto: 'O professor confirmou: a canela entra na barriga, nao no quadril.',
    novoStatus: 'validado_pelo_professor',
    origem: 'aula_particular',
    aulaNumero: 1,
    agora: AGORA,
    ...over,
  })
}

describe('criarValidacao', () => {
  it('registra o momento em ISO/UTC', () => {
    expect(validacao().registradaEm).toBe(AGORA.toISOString())
  })

  it('recusa validacao sem o texto do professor', () => {
    expect(() => validacao({ texto: '   ' })).toThrow(/texto/)
  })

  it('recusa mover um item de volta para "sugestao nao validada"', () => {
    // Esse e o estado inicial do app, nao algo que o professor atribui.
    expect(() => validacao({ novoStatus: 'sugestao_nao_validada' })).toThrow(/status invalido/)
  })

  it('exige o numero da aula quando a origem e aula particular', () => {
    expect(() => validacao({ aulaNumero: undefined })).toThrow(/numero da aula/)
  })

  it('aceita validacao de aula regular sem numero de aula', () => {
    const v = validacao({ origem: 'aula_regular', aulaNumero: undefined, sessionId: 'sessao-3' })
    expect(v.origem).toBe('aula_regular')
    expect(v.sessionId).toBe('sessao-3')
  })

  it('aceita marcar como variante pessoal do aluno', () => {
    expect(validacao({ novoStatus: 'variante_pessoal' }).novoStatus).toBe('variante_pessoal')
  })
})

describe('aplicarValidacoes', () => {
  it('move o item para o status que o professor definiu', () => {
    const [aplicado] = aplicarValidacoes([item()], [validacao()])
    expect(aplicado.validationStatus).toBe('validado_pelo_professor')
  })

  it('nao altera item sem validacao', () => {
    const itens = [item(), item({ id: 'outro' })]
    const aplicados = aplicarValidacoes(itens, [validacao()])
    expect(aplicados[1].validationStatus).toBe('sugestao_nao_validada')
  })

  it('e pura: nao muta os itens recebidos', () => {
    const original = item()
    aplicarValidacoes([original], [validacao()])
    expect(original.validationStatus).toBe('sugestao_nao_validada')
  })

  it('a validacao mais recente vence quando o professor muda de opiniao', () => {
    const primeira = validacao({ id: 'v1', novoStatus: 'validado_pelo_professor', agora: AGORA })
    const segunda = validacao({
      id: 'v2',
      novoStatus: 'variante_pessoal',
      texto: 'Na aula 3 ele disse que essa versao e minha adaptacao, nao a da academia.',
      aulaNumero: 3,
      agora: DEPOIS,
    })
    const [aplicado] = aplicarValidacoes([item()], [primeira, segunda])
    expect(aplicado.validationStatus).toBe('variante_pessoal')
  })

  it('a ordem do array nao afeta o resultado — vale a data', () => {
    const primeira = validacao({ id: 'v1', agora: AGORA })
    const segunda = validacao({ id: 'v2', novoStatus: 'variante_pessoal', aulaNumero: 3, agora: DEPOIS })
    const a = aplicarValidacoes([item()], [primeira, segunda])[0].validationStatus
    const b = aplicarValidacoes([item()], [segunda, primeira])[0].validationStatus
    expect(a).toBe(b)
  })
})

describe('historicoDoItem', () => {
  it('devolve as notas do professor da mais recente para a mais antiga', () => {
    const v1 = validacao({ id: 'v1', agora: AGORA })
    const v2 = validacao({ id: 'v2', aulaNumero: 3, agora: DEPOIS })
    expect(historicoDoItem('gf--raspada-1', [v1, v2]).map((v) => v.id)).toEqual(['v2', 'v1'])
  })

  it('nao mistura historico de outro item', () => {
    const outro = validacao({ id: 'v9', itemId: 'quedas--baiana' })
    expect(historicoDoItem('gf--raspada-1', [outro])).toEqual([])
  })
})

describe('coberturaDeValidacao', () => {
  it('separa quantos itens vieram de cada canal', () => {
    const itens = [
      item({ id: 'gf--raspada-1' }),
      item({ id: 'dp--defesa-de-soco', moduloId: 'mod-defesa-pessoal' }),
      item({ id: 'nunca-validado' }),
    ]
    const validacoes: ValidacaoDoProfessor[] = [
      validacao({ id: 'v1', itemId: 'gf--raspada-1', origem: 'aula_particular', aulaNumero: 1 }),
      validacao({
        id: 'v2',
        itemId: 'dp--defesa-de-soco',
        origem: 'aula_regular',
        aulaNumero: undefined,
        sessionId: 's1',
      }),
    ]
    const cob = coberturaDeValidacao(itens, validacoes)
    expect(cob).toEqual({
      validados: 2,
      total: 3,
      porOrigem: { aula_particular: 1, aula_regular: 1 },
    })
  })

  it('nao conta como validado item que o professor marcou como variante pessoal', () => {
    const cob = coberturaDeValidacao([item()], [validacao({ novoStatus: 'variante_pessoal' })])
    expect(cob.validados).toBe(0)
    expect(cob.porOrigem).toEqual({})
  })

  it('o canal da aula regular alcanca defesa pessoal — que nao esta em nenhuma aula particular', () => {
    // Esta e a razao de existir a origem 'aula_regular': sem ela os 11 itens de
    // defesa pessoal nunca poderiam ser validados.
    const dp = item({ id: 'dp--enforcamento', moduloId: 'mod-defesa-pessoal' })
    const v = validacao({
      itemId: 'dp--enforcamento',
      origem: 'aula_regular',
      aulaNumero: undefined,
      sessionId: 's7',
      texto: 'Professor corrigiu a defesa de enforcamento na aula de quarta.',
    })
    expect(aplicarValidacoes([dp], [v])[0].validationStatus).toBe('validado_pelo_professor')
  })
})

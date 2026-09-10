import { describe, expect, it } from 'vitest'
import {
  cartoesDaTurma,
  detalheDoAluno,
  gruposComItens,
  linhaDoAluno,
  linhasDaAcademia,
  linhaSemDados,
  mediaDaTurma,
  ordenarLinhas,
} from './central'
import type { CadastroNaLista, Curriculo, LinhaDaCentral } from './central'
import { ROTULO_GRUPO } from '../domain/taxonomia'
import { estadoInicial } from '../persistence/repositorio'
import type { EstadoPersistido } from '../persistence/repositorio'
import type { Card, TechniqueItem } from '../domain/types'
import { gerarBaralho } from '../domain/cards'
import { estadoInicial as estadoDoCartao } from '../domain/scheduler'

const AGORA = new Date('2026-09-07T12:00:00.000Z')

let n = 0
const novoId = () => `id-${++n}`

function item(over: Partial<TechniqueItem> = {}): TechniqueItem {
  return {
    id: 'i1',
    moduloId: 'mod-guardas',
    posicao: 'Guarda Fechada',
    slot: 'Raspada 1',
    categoria: 'Raspadas',
    nome: 'Tesoura',
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

/** Curriculo minimo: um item de cada grupo que os testes precisam. */
function curriculo(itens: TechniqueItem[], medida: Curriculo['medida'] = 'cartoes'): Curriculo {
  return { itens, conteudos: [], requisitos: [], cartoesTeoria: [] as Card[], medida }
}

function estado(over: Partial<EstadoPersistido> = {}): EstadoPersistido {
  return { ...estadoInicial(AGORA, novoId), ...over }
}

// ---------------------------------------------------------------------------
// Colunas derivadas do curriculo ativo
// ---------------------------------------------------------------------------

describe('gruposComItens', () => {
  it('devolve so os grupos com item ATIVO', () => {
    // O seed real ativa Secoes 4 e 5: Quedas, Fundamentos e Defesa Pessoal ficam
    // com zero itens. Uma coluna sempre vazia nao distingue "nao sabe" de "nao
    // esta no ar".
    const c = curriculo([
      item({ id: 'a', kind: 'raspagem' }),
      item({ id: 'b', kind: 'queda', ativo: false }),
      item({ id: 'c', kind: 'saida' }),
    ])
    expect(gruposComItens(c)).toEqual(['raspagens', 'saidas-defesas'])
  })

  it('respeita ORDEM_GRUPO, e nao a ordem do seed', () => {
    // A ordem das colunas nao pode depender de como o arquivo foi escrito.
    //
    // A QUEDA PRECISA DE PASSO A PASSO PARA VIRAR COLUNA, e isso espelha o seed
    // real: `queda` nao esta em `KINDS_CLASSIFICAVEIS`, entao o unico cartao dela
    // vem do conteudo — que existe no seed (escrito a mao, ADR-012) e por isso
    // Quedas E uma coluna de verdade.
    const c: Curriculo = {
      ...curriculo([item({ id: 'a', kind: 'queda' }), item({ id: 'b', kind: 'raspagem' })]),
      conteudos: [
        { itemId: 'a', passos: ['1', '2', '3'], detalhes: [], notasSeguranca: [], fonte: 'x' },
      ] as never,
    }
    expect(gruposComItens(c)).toEqual(['raspagens', 'quedas'])
  })

  it('grupo sem NENHUM item mensuravel por cartao nao vira coluna', () => {
    /**
     * ADR-017, decisao 7. `defesa_pessoal` nao esta em `KINDS_CLASSIFICAVEIS` e
     * estes itens de teste nao tem conteudo, entao nenhum cartao carrega o
     * `itemId` deles — e a coluna mostraria 0% para sempre, indistinguivel de
     * "o aluno nao sabe".
     *
     * O item de raspagem sobra porque `raspagem` E classificavel: mesmo sem
     * passo a passo ele gera o cartao de classificacao.
     */
    const c = curriculo([
      item({ id: 'a', kind: 'defesa_pessoal' }),
      item({ id: 'b', kind: 'raspagem' }),
    ])
    expect(gruposComItens(c)).toEqual(['raspagens'])
  })

  it('curriculo sem nada ativo nao produz coluna nenhuma', () => {
    expect(gruposComItens(curriculo([item({ ativo: false })]))).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// O CURRICULO decide a medida — nao a turma (ADR-016) e nem a meta (ADR-017)
// ---------------------------------------------------------------------------

describe('o CURRICULO decide a medida', () => {
  const porCartoes = curriculo([item({ id: 'a', kind: 'raspagem' })], 'cartoes')
  const porAtestado = curriculo([item({ id: 'a', kind: 'raspagem' })], 'atestado')

  const linha = (over: {
    meta?: string
    estuda?: string
    turma?: string
    curriculo?: Curriculo | null
    /** O curriculo da PROVA. `undefined` = a meta nao tem lista (o caso comum). */
    curriculoDaProva?: Curriculo | null
  }) =>
    linhaDoAluno({
      uid: 'u1',
      nome: 'Aluno',
      turma: over.turma ?? 'RGI',
      meta: over.meta ?? 'azul',
      estuda: over.estuda ?? 'azul',
      curriculoDaProva: over.curriculoDaProva ?? null,
      estado: estado(),
      curriculo: over.curriculo === undefined ? porCartoes : over.curriculo,
      agora: AGORA,
    })

  it('DOIS ALUNOS NA MESMA TURMA, curriculos diferentes, medidas diferentes', () => {
    // A razao de o curriculo nao ser da turma (ADR-016, decisao 3): um faixa
    // branca novo e alguem com tres graus cabem na RGI. Se o curriculo fosse da
    // turma, um dos dois seria medido contra a prova errada.
    const azul = linha({ estuda: 'azul', curriculo: porCartoes })
    const grau = linha({ estuda: '1grau', curriculo: porAtestado })

    expect(azul.progresso).toBe(0)
    expect(azul.motivo).toBeNull()

    // Sem atestacao lida, o de atestado ainda nao tem numero...
    expect(grau.progresso).toBeNull()
    expect(grau.motivo).toBe('atestado-nao-lido')
    expect(grau.medidaUsada).toBe('atestado')
  })

  it('ATESTADO TEM NUMERO — e antes mostrava travessao para sempre', () => {
    /**
     * O DEFEITO QUE ISTO CONSERTA, e como ele apareceu.
     *
     * O Floki foi semeado com `estuda: 'azul'` e a Central mostrou 57%. Ao
     * trocar para `estuda: '1grau'`, os 57% viraram `—` e o dado PARECEU ter
     * sido perdido. Nao foi: o ramo de atestado devolvia `progresso: null` com
     * motivo `medido-por-atestado`, e a coluna nao mostrava nada — nem o
     * numerador, nem o denominador, nem que havia um.
     *
     * Havia dado (as atestacoes) e havia denominador (os itens do curriculo). A
     * coluna vazia nao distinguia "nao e medido aqui" de "zero de 29 atestados".
     */
    /** `quantos` itens atestados, dos quatro (a, b, c, d). `null` = nao lido. */
    const com = (quantos: number | null) =>
      linhaDoAluno({
        uid: 'u1', nome: 'Floki', turma: 'RGI', meta: '1grau', estuda: '1grau',
        estado: estado(),
        curriculo: curriculo([item({ id: 'a' }), item({ id: 'b' }), item({ id: 'c' }), item({ id: 'd' })], 'atestado'),
        curriculoDaProva: null,
        competentes: quantos === null ? null : new Set(['a', 'b', 'c', 'd'].slice(0, quantos)),
        agora: AGORA,
      })

    expect(com(1).progresso).toBe(0.25)
    expect(com(1).motivo).toBeNull()
    expect(com(1).medidaUsada).toBe('atestado')
    expect(com(4).progresso).toBe(1)

    // ZERO ATESTADAS E UM NUMERO, e nao uma ausencia: e o primeiro dia de todo
    // aluno novo, e o professor precisa ver 0% e nao um travessao.
    expect(com(0).progresso).toBe(0)
    expect(com(0).motivo).toBeNull()

    // `null` e outra coisa: NAO CONSEGUIMOS LER. Se isto virasse 0, uma falha de
    // rede pareceria professor que nao atestou nada.
    expect(com(null).progresso).toBeNull()
    expect(com(null).motivo).toBe('atestado-nao-lido')
  })

  it('a medida usada viaja na linha — 40%% de cartao nao e 40%% de atestado', () => {
    // Sem este campo a tela junta o que o aluno recupera de cabeca com o que o
    // professor confirmou no tatame, sob o mesmo cabecalho "Progresso".
    const cartoes = linha({ estuda: 'azul', curriculo: porCartoes })
    expect(cartoes.medidaUsada).toBe('cartoes')
    expect(linha({ curriculo: null }).medidaUsada).toBeNull()
  })

  it('A META NAO DECIDE MAIS A MEDIDA — e este e o meu proprio caso', () => {
    /**
     * ADR-017, decisao 6. Tenho `meta: '3grau'` e `estuda: 'azul'`: persigo o 3o
     * grau e treino o curriculo de azul inteiro.
     *
     * ENQUANTO A MEDIDA VINHA DA META, esta linha devolvia `—`: a meta `3grau`
     * media por atestado, entao 81 itens de cartao em estudo apareciam como
     * "medido por atestado" — a medida de uma prova aplicada ao conteudo de
     * outra. O defeito nao dava erro; dava um travessao no lugar de um numero.
     */
    const eu = linha({ meta: '3grau', estuda: 'azul', curriculo: porCartoes })
    expect(eu.progresso).toBe(0)
    expect(eu.motivo).toBeNull()
    expect(eu.meta).toBe('3grau')
    expect(eu.estuda).toBe('azul')
  })

  it('sem curriculo nao recebe progresso, mas recebe atividade', () => {
    const l = linha({ meta: '2grau', estuda: '2grau', turma: 'RG2', curriculo: null })
    expect(l.progresso).toBeNull()
    expect(l.motivo).toBe('sem-curriculo')
    expect(l.porGrupo).toEqual({})
    expect(l.validado).toBeNull()
    // Atividade e duvida nao dependem de qual e a prova:
    expect(l.duvidasAbertas).toBe(0)
    expect(l.situacao).toBe('nunca-estudou')
  })

  it('a meta E o curriculo viajam na linha — a tela precisa dos dois', () => {
    // Sem os dois campos, a central nao consegue escrever "3o grau · estuda o
    // curriculo de azul", que e a unica forma de a linha nao parecer erro.
    const l = linha({ meta: '3grau', estuda: 'azul' })
    expect(l.meta).toBe('3grau')
    expect(l.estuda).toBe('azul')
  })
})

// ---------------------------------------------------------------------------
// "Nao sei" e "zero" sao coisas diferentes (decisao 7)
// ---------------------------------------------------------------------------

describe('mediaDaTurma', () => {
  const comProgresso = (p: number, over: Partial<LinhaDaCentral> = {}): LinhaDaCentral => ({
    ...linhaSemDados({ uid: `u${p}`, nome: `A${p}`, turma: 'RGI', meta: 'azul', estuda: 'azul' }),
    progresso: p,
    motivo: null,
    situacao: 'em-dia',
    ...over,
  })

  it('quem nunca sincronizou fica FORA, e o denominador aparece', () => {
    // O ponto: a media nao pode pular quando o dado chega. Se o ausente contasse
    // como zero, a media seria 0,3 e saltaria para 0,6 no dia em que ele abrisse
    // o app — e o salto pareceria ensino.
    const m = mediaDaTurma([
      comProgresso(0.8),
      comProgresso(0.4),
      linhaSemDados({ uid: 'u3', nome: 'Ausente', turma: 'RGI', meta: 'azul', estuda: 'azul' }),
    ])
    expect(m.progresso).toBeCloseTo(0.6)
    expect(m.considerados).toBe(2)
    expect(m.total).toBe(3)
    expect(m.fora['sem-dados']).toBe(1)
  })

  it('zero REAL entra na media', () => {
    // Sincronizou e esta em zero: isso sabemos, e conta.
    const m = mediaDaTurma([comProgresso(0.8), comProgresso(0)])
    expect(m.progresso).toBeCloseTo(0.4)
    expect(m.considerados).toBe(2)
  })

  it('turma inteira sem curriculo devolve null, com o motivo', () => {
    const m = mediaDaTurma([
      { ...linhaSemDados({ uid: 'a', nome: 'A', turma: 'RG2', meta: '2grau', estuda: '2grau' }), motivo: 'sem-curriculo' },
      { ...linhaSemDados({ uid: 'b', nome: 'B', turma: 'RG2', meta: '2grau', estuda: '2grau' }), motivo: 'sem-curriculo' },
    ])
    expect(m.progresso).toBeNull()
    expect(m.fora['sem-curriculo']).toBe(2)
    expect(m.fora['sem-dados']).toBe(0)
  })

  it('selecao vazia nao divide por zero', () => {
    const m = mediaDaTurma([])
    expect(m.progresso).toBeNull()
    expect(m.total).toBe(0)
  })

  it('cada ALUNO pesa igual, nao cada item', () => {
    // Media dos alunos e nao do bolo de itens: senao quem estuda muito mascara
    // quem parou.
    const m = mediaDaTurma([comProgresso(1), comProgresso(0)])
    expect(m.progresso).toBe(0.5)
  })
})

// ---------------------------------------------------------------------------
// Cartoes
// ---------------------------------------------------------------------------

describe('cartoesDaTurma', () => {
  const linha = (over: Partial<LinhaDaCentral>): LinhaDaCentral => ({
    ...linhaSemDados({ uid: 'u', nome: 'A', turma: 'RGI', meta: 'azul', estuda: 'azul' }),
    ...over,
  })

  it('sao seis: tres tecnicos e tres de acao', () => {
    const cartoes = cartoesDaTurma(
      [linha({ porGrupo: { raspagens: 0.5 }, validado: 0.2, aguardandoValidacao: 3, situacao: 'em-dia' })],
      ['raspagens', 'passagens', 'finalizacoes'],
      (g) => ROTULO_GRUPO[g],
    )
    expect(cartoes).toHaveLength(6)
    expect(cartoes.map((c) => c.chave)).toEqual([
      'raspagens', 'passagens', 'finalizacoes', 'validado', 'aguardando', 'parados',
    ])
  })

  it('cartao tecnico sem base nenhuma mostra null, e nao zero', () => {
    const cartoes = cartoesDaTurma([linha({})], ['raspagens'], (g) => ROTULO_GRUPO[g])
    expect(cartoes[0].valor).toBeNull()
    expect(cartoes[0].faixa).toBeNull()
  })

  it('so cria cartao para grupo que existe', () => {
    // Um cartao "Quedas: —" gastaria um sexto da area mais nobre da tela para
    // dizer que o modulo esta desativado.
    const cartoes = cartoesDaTurma([linha({})], ['raspagens'], (g) => ROTULO_GRUPO[g])
    expect(cartoes).toHaveLength(4)
    expect(cartoes.map((c) => c.chave)).toEqual(['raspagens', 'validado', 'aguardando', 'parados'])
  })

  it('aguardando validacao SOMA, e nao faz media', () => {
    // E fila de trabalho: o professor quer saber quantos itens o esperam no
    // total, nao quantos por aluno.
    const cartoes = cartoesDaTurma(
      [linha({ aguardandoValidacao: 3 }), linha({ aguardandoValidacao: 4 })],
      [],
      (g) => ROTULO_GRUPO[g],
    )
    expect(cartoes.find((c) => c.chave === 'aguardando')?.valor).toBe(7)
  })

  it('fila de trabalho NAO ganha cor de desempenho', () => {
    // Pintar de vermelho transformaria "tem trabalho a fazer" em "esta ruim".
    const cartoes = cartoesDaTurma([linha({ aguardandoValidacao: 30 })], [], (g) => ROTULO_GRUPO[g])
    expect(cartoes.find((c) => c.chave === 'aguardando')?.faixa).toBeNull()
    expect(cartoes.find((c) => c.chave === 'parados')?.faixa).toBeNull()
  })

  it('parados conta quem parou E quem nunca estudou, e ignora quem nao sincronizou', () => {
    const cartoes = cartoesDaTurma(
      [
        linha({ situacao: 'em-dia' }),
        linha({ situacao: 'parado' }),
        linha({ situacao: 'nunca-estudou' }),
        linha({ situacao: null }),
      ],
      [],
      (g) => ROTULO_GRUPO[g],
    )
    expect(cartoes.find((c) => c.chave === 'parados')?.valor).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Ordem: quem precisa de atencao primeiro
// ---------------------------------------------------------------------------

describe('ordenarLinhas', () => {
  const l = (nome: string, over: Partial<LinhaDaCentral>): LinhaDaCentral => ({
    ...linhaSemDados({ uid: nome, nome, turma: 'RGI', meta: 'azul', estuda: 'azul' }),
    ...over,
  })

  it('quem nunca sincronizou vem primeiro', () => {
    // E o unico caso sem dado nenhum, e o mais provavel de ser alguem que nunca
    // conseguiu entrar.
    const ordem = ordenarLinhas([
      l('EmDia', { motivo: null, situacao: 'em-dia', progresso: 0.7 }),
      l('Ausente', { motivo: 'sem-dados', situacao: null }),
      l('Parado', { motivo: null, situacao: 'parado', diasSemEstudar: 9 }),
    ])
    expect(ordem.map((x) => x.nome)).toEqual(['Ausente', 'Parado', 'EmDia'])
  })

  it('nunca-estudou vem antes de parado', () => {
    const ordem = ordenarLinhas([
      l('Parado', { motivo: null, situacao: 'parado', diasSemEstudar: 30 }),
      l('Nunca', { motivo: null, situacao: 'nunca-estudou' }),
    ])
    expect(ordem.map((x) => x.nome)).toEqual(['Nunca', 'Parado'])
  })

  it('dentro do mesmo peso, mais dias sem estudar primeiro', () => {
    const ordem = ordenarLinhas([
      l('Tres', { motivo: null, situacao: 'em-dia', diasSemEstudar: 3 }),
      l('Zero', { motivo: null, situacao: 'em-dia', diasSemEstudar: 0 }),
    ])
    expect(ordem.map((x) => x.nome)).toEqual(['Tres', 'Zero'])
  })

  it('empate desempata por nome, em pt-BR', () => {
    const ordem = ordenarLinhas([
      l('Ávila', { motivo: null, situacao: 'em-dia', diasSemEstudar: 1 }),
      l('Alves', { motivo: null, situacao: 'em-dia', diasSemEstudar: 1 }),
    ])
    expect(ordem.map((x) => x.nome)).toEqual(['Alves', 'Ávila'])
  })

  it('nao muda a lista original', () => {
    const original = [l('B', { motivo: null }), l('A', { motivo: null })]
    ordenarLinhas(original)
    expect(original.map((x) => x.nome)).toEqual(['B', 'A'])
  })
})

// ---------------------------------------------------------------------------
// O numero do professor e o mesmo que o aluno ve (decisao 1)
// ---------------------------------------------------------------------------

describe('mesma derivacao do app do aluno', () => {
  it('progresso da linha e o `prontidao().dominio` do mesmo estado', () => {
    // Este teste amarra a promessa da decisao 1: se alguem mudar a derivacao
    // aqui e nao no app (ou o contrario), os numeros divergem e a conversa passa
    // a ser sobre o app em vez do jiu-jitsu.
    const itens = [item({ id: 'a', kind: 'raspagem' })]
    const c = curriculo(itens)
    const l = linhaDoAluno({
      uid: 'u', nome: 'A', turma: 'RGI', meta: 'azul', estuda: 'azul',
      estado: estado(), curriculo: c, curriculoDaProva: null, agora: AGORA,
    })
    // Sem revisao nenhuma o dominio e zero — e zero, nao null: sincronizou.
    expect(l.progresso).toBe(0)
    expect(l.motivo).toBeNull()
  })

  it('nome do cadastro manda sobre o do perfil local', () => {
    // Quem se renomeia no aparelho nao renomeia a linha da central.
    const l = linhaDoAluno({
      uid: 'u', nome: 'Floki', turma: 'RGI', meta: 'azul', estuda: 'azul',
      estado: estado({ perfil: { id: 'x', nome: 'apelido local', papel: 'aluno', academiaId: 'a' } }),
      curriculo: curriculo([item()]), curriculoDaProva: null, agora: AGORA,
    })
    expect(l.nome).toBe('Floki')
  })

  it('cadastro sem nome cai para o do perfil, e nao para vazio', () => {
    // Linha em branco na central e uma linha que o professor nao sabe ler.
    const l = linhaDoAluno({
      uid: 'u', nome: '  ', turma: 'RGI', meta: 'azul', estuda: 'azul',
      estado: estado({ perfil: { id: 'x', nome: 'Thalles', papel: 'aluno', academiaId: 'a' } }),
      curriculo: curriculo([item()]), curriculoDaProva: null, agora: AGORA,
    })
    expect(l.nome).toBe('Thalles')
  })
})

// ---------------------------------------------------------------------------
// Detalhe de um aluno: a fila de validacao e o que so o professor resolve
// ---------------------------------------------------------------------------

describe('detalheDoAluno', () => {
  it('a fila lista NOME POR NOME, e nao so conta', () => {
    // "7 esperando" informa; "Raspada 1 da Guarda Aranha" e a pauta da aula.
    const itens = [item({ id: 'i1', slot: 'Raspada 1', nome: 'Tesoura', posicao: 'Guarda Fechada' })]
    const c: Curriculo = {
      itens,
      conteudos: [{ itemId: 'i1', passos: ['a', 'b'], detalhes: [], fonte: 'x' }] as never,
      requisitos: [],
      cartoesTeoria: [],
      medida: 'cartoes',
    }
    // Descobre o id do cartao gerado e domina ele.
    const baralho = gerarBaralho({
      itens,
      conteudos: c.conteudos,
      requisitos: c.requisitos,
      cartoesTeoria: c.cartoesTeoria,
    })
    const doItem = baralho.filter((b) => b.itemId === 'i1')
    const est = {
      ...estadoInicial(AGORA, novoId),
      // ReviewState de VERDADE, montado pelo scheduler. A primeira versao deste
      // teste inventava o objeto (com um campo `facilidade` que nao existe e sem
      // `side`, `dueAt` e `lapses`) e passava: Vitest transpila sem checar tipos.
      // O teste ficou verde pelo motivo errado ate o `tsc` reclamar.
      revisoes: doItem.map((b) => ({
        ...estadoDoCartao(b.id, 'unico', AGORA),
        repeticoes: 3,
        acertosConsecutivos: 3,
        ultimoIntervaloDias: 1,
        ultimaRevisaoAt: AGORA.toISOString(),
      })),
    } satisfies EstadoPersistido

    const d = detalheDoAluno({ estado: est, curriculo: c, agora: AGORA })
    expect(d.esperando).toHaveLength(1)
    expect(d.esperando[0]).toMatchObject({
      itemId: 'i1',
      slot: 'Raspada 1',
      nome: 'Tesoura',
      posicao: 'Guarda Fechada',
    })
  })

  it('item JA validado sai da fila', () => {
    // A fila e o vao entre os dois eixos: o que ele domina e voce nao viu.
    const itens = [
      item({ id: 'i1', validationStatus: 'validado_pelo_professor' }),
    ]
    const c = curriculo(itens)
    const d = detalheDoAluno({ estado: estado(), curriculo: c, agora: AGORA })
    expect(d.esperando).toHaveLength(0)
  })

  it('sem revisao nenhuma, `nadaAinda` e verdadeiro e a fila esta vazia', () => {
    const d = detalheDoAluno({ estado: estado(), curriculo: curriculo([item()]), agora: AGORA })
    expect(d.nadaAinda).toBe(true)
    expect(d.esperando).toEqual([])
    expect(d.dominio).toBe(0)
  })

  it('devolve as posicoes ordenadas da mais forte para a mais fraca', () => {
    const c = curriculo([
      item({ id: 'a', posicao: 'Guarda Fechada' }),
      item({ id: 'b', posicao: 'Guarda Aranha' }),
    ])
    const d = detalheDoAluno({ estado: estado(), curriculo: c, agora: AGORA })
    // Empatados em zero: a ordem nao pode explodir nem perder grupo.
    expect(d.porPosicao).toHaveLength(2)
    expect(d.maisFracas.length).toBeLessThanOrEqual(3)
  })

  it('o dominio do detalhe e o MESMO da linha da tabela', () => {
    // A promessa da decisao 1, amarrada: as duas passam pela mesma derivacao.
    const c = curriculo([item({ id: 'a' }), item({ id: 'b', kind: 'passagem' })])
    const est = estado()
    // Meta `azul` de proposito: e a que mede por CARTOES, e a promessa da
    // decisao 1 e sobre esse numero. Com meta `1grau` o progresso e `null` por
    // desenho, e o teste passaria comparando dois nulos — verde sem provar nada.
    const linha = linhaDoAluno({
      uid: 'u', nome: 'A', turma: 'RGI', meta: 'azul', estuda: 'azul', estado: est, curriculo: c,
      curriculoDaProva: null, agora: AGORA,
    })
    const d = detalheDoAluno({ estado: est, curriculo: c, agora: AGORA })
    expect(d.dominio).toBe(linha.progresso)
    expect(d.validado).toBe(linha.validado)
  })
})

// ---------------------------------------------------------------------------
// linhasDaAcademia: os filtros que as duas telas compartilham
// ---------------------------------------------------------------------------

describe('linhasDaAcademia', () => {
  const c = curriculo([item({ id: 'a' })])
  const cad = (over: Partial<CadastroNaLista>): CadastroNaLista => ({
    uid: 'u',
    nome: 'A',
    papel: 'aluno',
    turma: 'RGI',
    meta: 'azul',
    estuda: 'azul',
    ativo: true,
    ...over,
  })

  it('o PROFESSOR nao vira linha', () => {
    // Ele tem cadastro em `pessoas` e apareceria como aluno sem progresso — que
    // nao e um aluno parado, e um professor.
    const linhas = linhasDaAcademia({
      cadastros: [cad({ uid: 'p', nome: 'João', papel: 'professor', turma: '', meta: '' }), cad({ uid: 'a1' })],
      estados: new Map(),
      curriculoPorId: () => c,
      agora: AGORA,
    })
    expect(linhas.map((l) => l.uid)).toEqual(['a1'])
  })

  it('aluno DESATIVADO nao vira linha', () => {
    // As regras negam a leitura do estado dele: ficaria como "nunca
    // sincronizou", o que seria mentira.
    const linhas = linhasDaAcademia({
      cadastros: [cad({ uid: 'x', ativo: false })],
      estados: new Map(),
      curriculoPorId: () => c,
      agora: AGORA,
    })
    expect(linhas).toEqual([])
  })

  it('sem estado no mapa vira linha SEM DADOS, e nao zero', () => {
    const linhas = linhasDaAcademia({
      cadastros: [cad({ uid: 'a1' })],
      estados: new Map(),
      curriculoPorId: () => c,
      agora: AGORA,
    })
    expect(linhas[0].progresso).toBeNull()
    expect(linhas[0].motivo).toBe('sem-dados')
  })

  it('com estado no mapa calcula o progresso', () => {
    const linhas = linhasDaAcademia({
      cadastros: [cad({ uid: 'a1' })],
      estados: new Map([['a1', estado()]]),
      curriculoPorId: () => c,
      agora: AGORA,
    })
    expect(linhas[0].progresso).toBe(0)
    expect(linhas[0].motivo).toBeNull()
  })

  it('preserva o nome e a turma do CADASTRO', () => {
    const linhas = linhasDaAcademia({
      cadastros: [cad({ uid: 'a1', nome: 'Kainã', turma: 'RG2', meta: '2grau' })],
      estados: new Map([['a1', estado()]]),
      curriculoPorId: () => c,
      agora: AGORA,
    })
    expect(linhas[0].nome).toBe('Kainã')
    expect(linhas[0].turma).toBe('RG2')
  })

  it('resolve OS DOIS curriculos — o que ele estuda e o da prova', () => {
    /**
     * ADR-017, decisao 6, com um acrescimo de 10/09/2026.
     *
     * A decisao 6 dizia que `curriculoPorId` recebe o que a pessoa ESTUDA: com a
     * meta, quem persegue o 3o grau e estuda azul cairia em `null` e apareceria
     * sem progresso com 81 itens em estudo. Isso continua valendo.
     *
     * O QUE MUDOU: a linha resolve TAMBEM o curriculo da PROVA, porque ele decide
     * o numero quando e medido por atestado. O caso que forcou isso: o Henrique
     * persegue o 1o grau (atestado) e estuda azul (cartao) — com uma resolucao so,
     * as competencias que o professor atestou nao chegavam a linha dele.
     *
     * Este cadastro tem `meta: '3grau'`, cuja lista nao chegou: `curriculoDaProva`
     * vem `null` e a medida cai no que ele estuda, exatamente como a decisao 6
     * pedia. Ou seja: as duas regras convivem.
     */
    const vistos: string[] = []
    const linhas = linhasDaAcademia({
      cadastros: [cad({ uid: 'a1', nome: 'Floki', meta: '3grau', estuda: 'azul' })],
      estados: new Map([['a1', estado()]]),
      curriculoPorId: (id) => {
        vistos.push(id)
        return id === 'azul' ? c : null
      },
      agora: AGORA,
    })
    expect(new Set(vistos)).toEqual(new Set(['azul', '3grau']))
    // E a medida veio do que ele ESTUDA, porque a meta nao tem lista.
    expect(linhas[0].medidaUsada).toBe('cartoes')
  })

  it('o CONVIDADO entra na lista, sem medida e com motivo proprio', () => {
    // ADR-017, decisao 4: o convite JA e o pre-cadastro — tem nome, turma e meta.
    // Ele existe na turma antes de existir a conta, e a central precisa mostrar.
    const linhas = linhasDaAcademia({
      cadastros: [],
      convites: [
        {
          email: 'willian@exemplo.test',
          nome: 'Willian',
          papel: 'aluno',
          turma: 'RGI',
          meta: '1grau',
          estuda: '1grau',
        },
      ],
      estados: new Map(),
      curriculoPorId: () => c,
      agora: AGORA,
    })
    expect(linhas).toHaveLength(1)
    expect(linhas[0].nome).toBe('Willian')
    expect(linhas[0].motivo).toBe('convidado')
    // O E-MAIL OCUPA O `uid`: e a unica chave que existe antes do primeiro
    // login, e e por ela que a tela cancela o convite.
    expect(linhas[0].uid).toBe('willian@exemplo.test')
    expect(linhas[0].progresso).toBeNull()
  })

  it('convite de PROFESSOR nao vira linha de aluno', () => {
    const linhas = linhasDaAcademia({
      cadastros: [],
      convites: [
        { email: 'p@x.test', nome: 'P', papel: 'professor', turma: '', meta: '', estuda: '' },
      ],
      estados: new Map(),
      curriculoPorId: () => c,
      agora: AGORA,
    })
    expect(linhas).toEqual([])
  })

  it('convidado conta no TOTAL e fica fora da MEDIA', () => {
    /**
     * O NUMERO QUE O PROFESSOR PRECISA LER E "quatro alunos, um estudando".
     *
     * Contar o convidado como zero prenderia a media e, pior, faria ela SALTAR
     * no dia do primeiro login — e o salto seria atribuido ao ensino, e nao a
     * chegada de um dado que sempre faltou. Deixa-lo fora da lista faria a turma
     * parecer ter um aluno.
     */
    const linhas = linhasDaAcademia({
      cadastros: [cad({ uid: 'a1', nome: 'Floki' })],
      convites: [
        { email: 'w@x.test', nome: 'Willian', papel: 'aluno', turma: 'RGI', meta: '1grau', estuda: '1grau' },
        { email: 'r@x.test', nome: 'Roberto', papel: 'aluno', turma: 'RGI', meta: '1grau', estuda: '1grau' },
        { email: 'e@x.test', nome: 'Eduardo', papel: 'aluno', turma: 'RGI', meta: '1grau', estuda: '1grau' },
      ],
      estados: new Map([['a1', estado()]]),
      curriculoPorId: () => c,
      agora: AGORA,
    })
    const m = mediaDaTurma(linhas)
    expect(m.total).toBe(4)
    expect(m.considerados).toBe(1)
    expect(m.fora.convidado).toBe(3)
  })
})

/**
 * O CASO DO HENRIQUE — 10/09/2026, relatado por ele.
 *
 * "Atualizei os dados do Henrique no atestado, pode atualizar para refletir no
 * progresso por aluno?"
 *
 * O Henrique persegue o 1o GRAU (medido por atestado) e estuda AZUL (medido por
 * cartao). Eu mesmo o pus nessa configuracao no mesmo dia — com `estuda: '1grau'`
 * o app nao tinha o que ensinar a ele. A consequencia nao prevista: a coluna
 * Progresso passou a medir dominio de cartao, e as dez competencias que o
 * professor acabara de atestar sairam do numero.
 */
describe('quem persegue uma prova de ATESTADO e estuda outro curriculo', () => {
  const osQuatro = [item({ id: 'a' }), item({ id: 'b' }), item({ id: 'c' }), item({ id: 'd' })]
  const prova = curriculo(osQuatro, 'atestado')
  const estudo = curriculo([item({ id: 'x', kind: 'raspagem' })], 'cartoes')

  const oHenrique = (competentes: ReadonlySet<string> | null) =>
    linhaDoAluno({
      uid: 'u', nome: 'Henrique', turma: 'RGI', meta: '1grau', estuda: 'azul',
      estado: estado(),
      curriculo: estudo,
      curriculoDaProva: prova,
      competentes,
      agora: AGORA,
    })

  it('O NUMERO VEM DA PROVA, e nao do que ele estuda', () => {
    const l = oHenrique(new Set(['a']))
    expect(l.progresso).toBe(0.25)
    expect(l.medidaUsada).toBe('atestado')
  })

  it('atestar mais MOVE o numero — era isso que nao acontecia', () => {
    expect(oHenrique(new Set(['a'])).progresso).toBe(0.25)
    expect(oHenrique(new Set(['a', 'b'])).progresso).toBe(0.5)
    expect(oHenrique(new Set(['a', 'b', 'c', 'd'])).progresso).toBe(1)
  })

  it('INTERSECCIONA com a lista da prova — o bug dos 176%', () => {
    /**
     * O Floki tem 51 atestacoes em producao: a folha mostra a lista de azul
     * quando a da meta nao serve, entao ele tem competencia de item que nao esta
     * nos 29. A versao anterior recebia a CONTAGEM crua (51) e o denominador da
     * prova (29): 176%, uma barra estourando a tabela.
     */
    const l = oHenrique(new Set(['a', 'b', 'fora-1', 'fora-2', 'fora-3']))
    expect(l.progresso).toBe(0.5)
  })

  it('OS DADOS DE CARTAO SOBREVIVEM — consertar uma coluna nao quebra as outras', () => {
    /**
     * O ramo antigo devolvia `porGrupo: {}` e `validado: null` porque assumia que
     * quem e medido por atestado nao tem cartao. Verdade para `estuda: '1grau'`;
     * falso para quem estuda azul perseguindo o grau.
     */
    const l = oHenrique(new Set(['a']))
    expect(l.validado).not.toBeNull()
    expect(Object.keys(l.porGrupo).length).toBeGreaterThan(0)
  })

  it('falha de leitura continua `nao-lido`, e nao zero', () => {
    // Zero diria ao professor que ele nao atestou nada; ele pode ter atestado os 29.
    const l = oHenrique(null)
    expect(l.progresso).toBeNull()
    expect(l.motivo).toBe('atestado-nao-lido')
  })

  it('a APTIDAO tambem sai da prova: os quatro atestados = apto', () => {
    expect(oHenrique(new Set(['a', 'b', 'c', 'd'])).aptidao).toBe('apto')
    expect(oHenrique(new Set(['a'])).aptidao).toBe('faltam-competencias')
  })

  it('META SEM LISTA cai no que ele estuda — a decisao 6 do ADR-017 intacta', () => {
    /**
     * O caso do dono do app: `meta: '3grau'`, cuja lista nao chegou. Sem esta
     * guarda ele ficaria sem medida nenhuma, que foi exatamente o defeito que a
     * decisao 6 consertou.
     */
    const l = linhaDoAluno({
      uid: 'u', nome: 'Thalles', turma: 'RGI', meta: '3grau', estuda: 'azul',
      estado: estado(), curriculo: estudo, curriculoDaProva: null,
      competentes: new Set(['a']), agora: AGORA,
    })
    expect(l.medidaUsada).toBe('cartoes')
  })

  it('prova medida por CARTOES nao rouba o numero de quem estuda por cartao', () => {
    // Quem persegue o azul e estuda azul: um caminho so, e ele e de cartao.
    const l = linhaDoAluno({
      uid: 'u', nome: 'A', turma: 'RGI', meta: 'azul', estuda: 'azul',
      estado: estado(), curriculo: estudo, curriculoDaProva: estudo,
      competentes: new Set(['a']), agora: AGORA,
    })
    expect(l.medidaUsada).toBe('cartoes')
  })
})

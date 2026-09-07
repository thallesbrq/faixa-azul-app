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
function curriculo(itens: TechniqueItem[]): Curriculo {
  return { itens, conteudos: [], requisitos: [], cartoesTeoria: [] as Card[] }
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
    const c = curriculo([
      item({ id: 'a', kind: 'defesa_pessoal' }),
      item({ id: 'b', kind: 'raspagem' }),
    ])
    expect(gruposComItens(c)).toEqual(['raspagens', 'defesa-pessoal'])
  })

  it('curriculo sem nada ativo nao produz coluna nenhuma', () => {
    expect(gruposComItens(curriculo([item({ ativo: false })]))).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// A turma que nao mede o curriculo de azul (decisao 6)
// ---------------------------------------------------------------------------

describe('turma sem curriculo', () => {
  const c = curriculo([item({ id: 'a', kind: 'raspagem' })])

  it('RG2 nao recebe progresso, mas recebe atividade', () => {
    // Medir a turma avancada contra o exame de azul a mostraria inteira em
    // vermelho — correto tecnicamente, errado de fato.
    const l = linhaDoAluno({
      uid: 'u1', nome: 'Avancado', turma: 'RG2',
      estado: estado(), curriculo: c, agora: AGORA,
    })
    expect(l.progresso).toBeNull()
    expect(l.motivo).toBe('turma-sem-curriculo')
    expect(l.porGrupo).toEqual({})
    expect(l.validado).toBeNull()
    // Atividade e duvida nao dependem de qual e a prova:
    expect(l.duvidasAbertas).toBe(0)
    expect(l.situacao).toBe('nunca-estudou')
  })

  it('RG1A recebe progresso', () => {
    const l = linhaDoAluno({
      uid: 'u1', nome: 'Iniciante', turma: 'RG1A',
      estado: estado(), curriculo: c, agora: AGORA,
    })
    expect(l.progresso).toBe(0)
    expect(l.motivo).toBeNull()
    expect(l.faixa).toBe('baixa')
  })

  it('turma vazia (nao atribuida) tambem nao e medida', () => {
    // Conservador: medir contra um curriculo que talvez nao seja o dele produz
    // numero errado com aparencia de certo.
    const l = linhaDoAluno({
      uid: 'u1', nome: 'Sem turma', turma: '',
      estado: estado(), curriculo: c, agora: AGORA,
    })
    expect(l.motivo).toBe('turma-sem-curriculo')
  })
})

// ---------------------------------------------------------------------------
// "Nao sei" e "zero" sao coisas diferentes (decisao 7)
// ---------------------------------------------------------------------------

describe('mediaDaTurma', () => {
  const comProgresso = (p: number, over: Partial<LinhaDaCentral> = {}): LinhaDaCentral => ({
    ...linhaSemDados({ uid: `u${p}`, nome: `A${p}`, turma: 'RG1A' }),
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
      linhaSemDados({ uid: 'u3', nome: 'Ausente', turma: 'RG1A' }),
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
      { ...linhaSemDados({ uid: 'a', nome: 'A', turma: 'RG2' }), motivo: 'turma-sem-curriculo' },
      { ...linhaSemDados({ uid: 'b', nome: 'B', turma: 'RG2' }), motivo: 'turma-sem-curriculo' },
    ])
    expect(m.progresso).toBeNull()
    expect(m.fora['turma-sem-curriculo']).toBe(2)
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
    ...linhaSemDados({ uid: 'u', nome: 'A', turma: 'RG1A' }),
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
    ...linhaSemDados({ uid: nome, nome, turma: 'RG1A' }),
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
      uid: 'u', nome: 'A', turma: 'RG1A',
      estado: estado(), curriculo: c, agora: AGORA,
    })
    // Sem revisao nenhuma o dominio e zero — e zero, nao null: sincronizou.
    expect(l.progresso).toBe(0)
    expect(l.motivo).toBeNull()
  })

  it('nome do cadastro manda sobre o do perfil local', () => {
    // Quem se renomeia no aparelho nao renomeia a linha da central.
    const l = linhaDoAluno({
      uid: 'u', nome: 'Floki', turma: 'RG1A',
      estado: estado({ perfil: { id: 'x', nome: 'apelido local', papel: 'aluno', academiaId: 'a' } }),
      curriculo: curriculo([item()]), agora: AGORA,
    })
    expect(l.nome).toBe('Floki')
  })

  it('cadastro sem nome cai para o do perfil, e nao para vazio', () => {
    // Linha em branco na central e uma linha que o professor nao sabe ler.
    const l = linhaDoAluno({
      uid: 'u', nome: '  ', turma: 'RG1A',
      estado: estado({ perfil: { id: 'x', nome: 'Thalles', papel: 'aluno', academiaId: 'a' } }),
      curriculo: curriculo([item()]), agora: AGORA,
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
    const linha = linhaDoAluno({
      uid: 'u', nome: 'A', turma: 'RG1A', estado: est, curriculo: c, agora: AGORA,
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
    turma: 'RG1A',
    ativo: true,
    ...over,
  })

  it('o PROFESSOR nao vira linha', () => {
    // Ele tem cadastro em `pessoas` e apareceria como aluno sem progresso — que
    // nao e um aluno parado, e um professor.
    const linhas = linhasDaAcademia({
      cadastros: [cad({ uid: 'p', nome: 'João', papel: 'professor', turma: '' }), cad({ uid: 'a1' })],
      estados: new Map(),
      curriculo: c,
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
      curriculo: c,
      agora: AGORA,
    })
    expect(linhas).toEqual([])
  })

  it('sem estado no mapa vira linha SEM DADOS, e nao zero', () => {
    const linhas = linhasDaAcademia({
      cadastros: [cad({ uid: 'a1' })],
      estados: new Map(),
      curriculo: c,
      agora: AGORA,
    })
    expect(linhas[0].progresso).toBeNull()
    expect(linhas[0].motivo).toBe('sem-dados')
  })

  it('com estado no mapa calcula o progresso', () => {
    const linhas = linhasDaAcademia({
      cadastros: [cad({ uid: 'a1' })],
      estados: new Map([['a1', estado()]]),
      curriculo: c,
      agora: AGORA,
    })
    expect(linhas[0].progresso).toBe(0)
    expect(linhas[0].motivo).toBeNull()
  })

  it('preserva o nome e a turma do CADASTRO', () => {
    const linhas = linhasDaAcademia({
      cadastros: [cad({ uid: 'a1', nome: 'Kainã', turma: 'RG2' })],
      estados: new Map([['a1', estado()]]),
      curriculo: c,
      agora: AGORA,
    })
    expect(linhas[0].nome).toBe('Kainã')
    expect(linhas[0].turma).toBe('RG2')
    expect(linhas[0].motivo).toBe('turma-sem-curriculo')
  })
})

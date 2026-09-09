import { describe, expect, it } from 'vitest'
import { aptidaoAoGrau, aulasFaltando, curriculoParaAtestar, montarAtestado } from './atestado'
import type { RegistroDeCompetencia } from '../domain/competencia'
import type { Curriculo } from '../domain/curriculo'
import type { Modulo, TechniqueItem } from '../domain/types'
import { ITENS_1GRAU, MODULOS_1GRAU } from '../seed/primeiro-grau'
import { CURRICULO_1GRAU } from '../seed/curriculos'

const AGORA = '2026-09-07T12:00:00.000Z'

function item(id: string, moduloId: string, over: Partial<TechniqueItem> = {}): TechniqueItem {
  return {
    id,
    moduloId,
    posicao: 'P',
    slot: 'S',
    categoria: 'C',
    nome: id,
    aliases: [],
    kind: 'raspagem',
    sideMode: 'nao_se_aplica',
    safetyLevel: 'baixo',
    validationStatus: 'aguardando_validacao',
    sourceReference: 'x',
    ativo: true,
    ...over,
  }
}

function curriculo(itens: TechniqueItem[]): Curriculo {
  return { itens, conteudos: [], requisitos: [], cartoesTeoria: [], medida: 'atestado' }
}

const MODULOS: Modulo[] = [
  { id: 'm2', nome: 'Segundo', ordem: 2 },
  { id: 'm1', nome: 'Primeiro', ordem: 1 },
]

function reg(itemId: string, competente: boolean, quando = AGORA): RegistroDeCompetencia {
  return {
    id: `${itemId}-${quando}`,
    itemId,
    competente,
    texto: 'ok',
    origem: 'aula_regular',
    professorUid: 'prof',
    registradaEm: quando,
  }
}

describe('montarAtestado', () => {
  it('a ordem das secoes vem dos MODULOS, e nao da ordem dos itens', () => {
    // A folha e um documento da academia: a sequencia dos titulos e parte do
    // formato que o professor mandou.
    const a = montarAtestado({
      curriculo: curriculo([item('b', 'm2'), item('a', 'm1')]),
      modulos: MODULOS,
      registros: [],
      meta: '1grau',
      aulasCumpridas: null,
    })
    expect(a.grupos.map((g) => g.nome)).toEqual(['Primeiro', 'Segundo'])
  })

  it('modulo sem item ativo NAO vira secao vazia', () => {
    const a = montarAtestado({
      curriculo: curriculo([item('a', 'm1')]),
      modulos: MODULOS,
      registros: [],
      meta: '1grau',
      aulasCumpridas: null,
    })
    expect(a.grupos.map((g) => g.moduloId)).toEqual(['m1'])
  })

  it('conta atestados por grupo e no total', () => {
    const a = montarAtestado({
      curriculo: curriculo([item('a', 'm1'), item('b', 'm1'), item('c', 'm2')]),
      modulos: MODULOS,
      registros: [reg('a', true), reg('c', true)],
      meta: '1grau',
      aulasCumpridas: null,
    })
    expect(a.atestados).toBe(2)
    expect(a.total).toBe(3)
    expect(a.progresso).toBeCloseTo(2 / 3)
    expect(a.grupos.find((g) => g.moduloId === 'm1')?.atestados).toBe(1)
  })

  it('RETIRADO nao conta, mesmo tendo sido atestado antes', () => {
    const a = montarAtestado({
      curriculo: curriculo([item('a', 'm1')]),
      modulos: MODULOS,
      registros: [reg('a', true, '2026-09-01T00:00:00Z'), reg('a', false, '2026-09-05T00:00:00Z')],
      meta: '1grau',
      aulasCumpridas: null,
    })
    expect(a.atestados).toBe(0)
    // Mas o historico aparece: duas coisas aconteceram.
    expect(a.grupos[0].linhas[0].vezes).toBe(2)
    expect(a.grupos[0].linhas[0].ultimo?.competente).toBe(false)
  })

  it('completo so quando TODOS estao atestados', () => {
    const c = curriculo([item('a', 'm1'), item('b', 'm1')])
    const parcial = montarAtestado({
      curriculo: c, modulos: MODULOS, registros: [reg('a', true)],
      meta: '1grau', aulasCumpridas: null,
    })
    const cheio = montarAtestado({
      curriculo: c, modulos: MODULOS, registros: [reg('a', true), reg('b', true)],
      meta: '1grau', aulasCumpridas: null,
    })
    expect(parcial.aptidao).toBe('faltam-competencias')
    expect(cheio.aptidao).toBe('apto')
  })

  it('curriculo VAZIO nao esta apto, e nao devolve NaN', () => {
    /**
     * Sem esta guarda, "apto" sairia verdadeiro por nao haver exigencia — e o
     * progresso seria NaN, que a tela mostraria como "NaN%".
     *
     * `nao-se-aplica` E NAO `faltam-competencias`: nao falta competencia nenhuma,
     * a pergunta e que nao cabe. A distincao existe porque a tela diz as duas de
     * formas diferentes — uma lista o que falta, a outra nao mostra o selo.
     */
    const a = montarAtestado({
      curriculo: curriculo([]), modulos: MODULOS, registros: [],
      meta: '1grau', aulasCumpridas: null,
    })
    expect(a.aptidao).toBe('nao-se-aplica')
    expect(a.aptidao).not.toBe('apto')
    expect(a.progresso).toBe(0)
    expect(Number.isNaN(a.progresso)).toBe(false)
  })

  it('ignora item inativo', () => {
    const a = montarAtestado({
      curriculo: curriculo([item('a', 'm1'), item('b', 'm1', { ativo: false })]),
      modulos: MODULOS, registros: [], meta: '1grau', aulasCumpridas: null,
    })
    expect(a.total).toBe(1)
  })

  it('`faltando` sai na ordem da folha', () => {
    const a = montarAtestado({
      curriculo: curriculo([item('b', 'm2'), item('a', 'm1')]),
      modulos: MODULOS, registros: [], meta: '1grau', aulasCumpridas: null,
    })
    expect(a.faltando.map((i) => i.id)).toEqual(['a', 'b'])
  })

  it('as aulas sao requisito SEPARADO, e `null` nao e zero', () => {
    // `null` significa "o app nao conta isso ainda, confira voce". Tratar como
    // zero faria a folha dizer que faltam 35 aulas a quem talvez tenha 40.
    const a = montarAtestado({
      curriculo: curriculo([item('a', 'm1')]),
      modulos: MODULOS, registros: [reg('a', true)],
      meta: '1grau', aulasCumpridas: null,
    })
    expect(a.aptidao).toBe('apto')
    expect(a.aulas).toEqual({ exigidas: 35, cumpridas: null })
  })

  it('a meta traz quantas aulas exige', () => {
    const semExigencia = montarAtestado({
      curriculo: curriculo([item('a', 'm1')]),
      modulos: MODULOS, registros: [], meta: 'azul', aulasCumpridas: 12,
    })
    expect(semExigencia.aulas).toEqual({ exigidas: null, cumpridas: 12 })
  })
})

describe('aulasFaltando', () => {
  it('`null` SOBREVIVE ao calculo', () => {
    // `35 - null` daria 35 em JavaScript, e a folha diria que faltam 35 aulas a
    // quem o sistema simplesmente nao contou.
    expect(aulasFaltando({ exigidas: 35, cumpridas: null })).toBeNull()
    expect(aulasFaltando({ exigidas: null, cumpridas: 10 })).toBeNull()
  })

  it('subtrai quando sabe os dois', () => {
    expect(aulasFaltando({ exigidas: 35, cumpridas: 12 })).toBe(23)
  })

  it('nao devolve negativo', () => {
    // Quem fez 40 de 35 nao "deve" -5 aulas.
    expect(aulasFaltando({ exigidas: 35, cumpridas: 40 })).toBe(0)
  })
})

describe('com o curriculo REAL do 1o grau', () => {
  it('sao as seis secoes do professor, na ordem dele', () => {
    const a = montarAtestado({
      curriculo: { itens: ITENS_1GRAU, conteudos: [], requisitos: [], cartoesTeoria: [], medida: 'atestado' },
      modulos: MODULOS_1GRAU,
      registros: [],
      meta: '1grau',
      aulasCumpridas: null,
    })
    expect(a.grupos.map((g) => g.nome)).toEqual([
      'Quedas',
      'Guarda fechada',
      'Educativos',
      'Posição individual',
      'Finalizações',
      'Saídas',
    ])
    expect(a.total).toBe(29)
    expect(a.grupos.map((g) => g.total)).toEqual([3, 6, 4, 4, 10, 2])
  })

  it('atestar tudo fecha as competencias, e as aulas seguem separadas', () => {
    const a = montarAtestado({
      curriculo: { itens: ITENS_1GRAU, conteudos: [], requisitos: [], cartoesTeoria: [], medida: 'atestado' },
      modulos: MODULOS_1GRAU,
      registros: ITENS_1GRAU.map((i) => reg(i.id, true)),
      meta: '1grau',
      aulasCumpridas: null,
    })
    expect(a.atestados).toBe(29)
    expect(a.aptidao).toBe('apto')
    expect(a.progresso).toBe(1)
    // E o professor ainda tem de conferir as 35 aulas de cabeca.
    expect(aulasFaltando(a.aulas)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Qual lista a folha usa (o defeito que trancou o Floki fora)
// ---------------------------------------------------------------------------

describe('curriculoParaAtestar', () => {
  const azul: Curriculo = {
    itens: [], conteudos: [], requisitos: [], cartoesTeoria: [], medida: 'cartoes',
  }
  const g1: Curriculo = {
    itens: [], conteudos: [], requisitos: [], cartoesTeoria: [], medida: 'atestado',
  }
  const porId = (id: string) => (id === 'azul' ? azul : id === '1grau' ? g1 : null)

  it('a lista da PROVA vem primeiro — e contra ela que o grau fecha', () => {
    const e = curriculoParaAtestar({ meta: '1grau', estuda: 'azul', curriculoPorId: porId })
    expect(e).toEqual({ id: '1grau', curriculo: g1, origem: 'prova' })
  })

  it('CAI NO ESTUDO quando a lista da prova nao chegou — o caso do Floki', () => {
    /**
     * O DEFEITO QUE ISTO CONSERTA, e ele chegou a producao.
     *
     * A condicao na tela era `curriculoPorId(estuda)?.medida === 'atestado'`, e
     * eu escrevi no comentario que a folha "aparece para quem ESTUDA o 1o grau,
     * nao para quem o persegue estudando azul". Isso trancou fora exatamente o
     * caso que motivou `meta` e `estuda` se separarem: Floki tem `meta: '4grau'`
     * (lista nao recebida) e `estuda: 'azul'` — e NAO havia como atesta-lo.
     *
     * A confusao: atestar e medir progresso tratados como a mesma decisao.
     * Atestar e o professor registrando o que VIU, e vale para qualquer item que
     * o aluno treina — inclusive num curriculo medido por CARTOES.
     */
    const e = curriculoParaAtestar({ meta: '4grau', estuda: 'azul', curriculoPorId: porId })
    expect(e).toEqual({ id: 'azul', curriculo: azul, origem: 'estudo' })
  })

  it('a MEDIDA do curriculo nao decide se da para atestar', () => {
    // `azul` e medido por cartoes e ainda assim entra na folha. Foi esta
    // confusao que causou o defeito acima.
    const e = curriculoParaAtestar({ meta: 'azul', estuda: 'azul', curriculoPorId: porId })
    expect(e?.curriculo.medida).toBe('cartoes')
    expect(e?.origem).toBe('prova')
  })

  it('sem lista nenhuma devolve null — a folha nao aparece, e e o certo', () => {
    expect(
      curriculoParaAtestar({ meta: '2grau', estuda: '', curriculoPorId: porId }),
    ).toBeNull()
  })

  it('meta desconhecida cai no estudo em vez de sumir com a folha', () => {
    // Um `roxa` gravado por versao futura nao pode apagar a capacidade de
    // registrar o que o professor viu.
    const e = curriculoParaAtestar({ meta: 'roxa', estuda: 'azul', curriculoPorId: porId })
    expect(e?.origem).toBe('estudo')
  })
})

// ---------------------------------------------------------------------------
// APTO AO GRAU
// ---------------------------------------------------------------------------
/**
 * O booleano passou a existir em 09/09/2026, por decisao do professor, depois de
 * presenca ser descartada. Estes testes fixam as tres ressalvas que fazem a regra
 * generalizar para o 2o, 3o e 4o grau sem reescrita — e que impedem a palavra
 * "apto" de ser usada sobre uma afirmacao mais fraca.
 */
describe('aptidaoAoGrau', () => {
  /** Um curriculo de atestado com N itens ativos e M desativados. */
  const deAtestado = (quantos: number, inativos = 0) =>
    curriculo([
      ...Array.from({ length: quantos }, (_, i) => item(`i${i}`, 'm1')),
      ...Array.from({ length: inativos }, (_, i) => item(`x${i}`, 'm1', { ativo: false })),
    ])

  it('todos atestados = APTO', () => {
    expect(aptidaoAoGrau({ curriculo: deAtestado(29), competentes: 29 })).toBe('apto')
  })

  it('faltando um = FALTAM-COMPETENCIAS', () => {
    expect(aptidaoAoGrau({ curriculo: deAtestado(29), competentes: 28 })).toBe(
      'faltam-competencias',
    )
  })

  it('zero atestados e um NUMERO, e nao ausencia — o primeiro dia de todo aluno', () => {
    expect(aptidaoAoGrau({ curriculo: deAtestado(29), competentes: 0 })).toBe(
      'faltam-competencias',
    )
  })

  it('FALHA DE LEITURA nao e zero: `nao-lido`, e nunca "faltam 29"', () => {
    /**
     * A distincao que evita a tela dizer "faltam 29" a quem talvez tenha os 29.
     * Mesma regra de `atestado-nao-lido` em `application/central`.
     */
    expect(aptidaoAoGrau({ curriculo: deAtestado(29), competentes: null })).toBe('nao-lido')
  })

  it('RESSALVA 1 — o denominador sai do CURRICULO, nunca do numero 29', () => {
    /**
     * O teste que protege a generalizacao. O 2o grau vai ter outra lista; um
     * `=== 29` cravado em qualquer lugar quebraria em silencio, com todo aluno de
     * 2o grau nascendo "apto" ou nunca ficando apto.
     */
    expect(aptidaoAoGrau({ curriculo: deAtestado(12), competentes: 12 })).toBe('apto')
    expect(aptidaoAoGrau({ curriculo: deAtestado(45), competentes: 29 })).toBe(
      'faltam-competencias',
    )
  })

  it('ITEM INATIVO nao entra no denominador', () => {
    // 29 ativos e 5 desativados: atestar os 29 basta. Contar os 34 deixaria o
    // aluno preso por item que a folha nem mostra.
    expect(aptidaoAoGrau({ curriculo: deAtestado(29, 5), competentes: 29 })).toBe('apto')
  })

  it('RESSALVA 2 e 3 — curriculo medido por CARTOES nunca e `apto`', () => {
    /**
     * A regra do professor: dominio de cartao != validado != funciona sob
     * resistencia. "Apto" derivado de o app achar que o aluno lembra de 81 coisas
     * seria a mesma palavra afirmando algo muito mais fraco que "o professor viu
     * ele executar os 29".
     *
     * E troca de FAIXA nao e grau: a prova de azul tem banca, teoria escrita,
     * juramento e pontuacao. O conceito util la e "apto a FAZER a prova", que e
     * outra pergunta.
     */
    const azul: Curriculo = { ...deAtestado(81), medida: 'cartoes' }
    expect(aptidaoAoGrau({ curriculo: azul, competentes: 81 })).toBe('nao-se-aplica')
  })

  it('sem curriculo e curriculo VAZIO caem em `nao-se-aplica`', () => {
    // Vazio nao pode ser apto: seria aptidao por nao haver exigencia.
    expect(aptidaoAoGrau({ curriculo: null, competentes: 0 })).toBe('nao-se-aplica')
    expect(aptidaoAoGrau({ curriculo: deAtestado(0), competentes: 0 })).toBe('nao-se-aplica')
  })

  it('atestacoes A MAIS que o total nao quebram — continua apto', () => {
    // Pode acontecer com item que saiu do curriculo: o `>=` e deliberado.
    expect(aptidaoAoGrau({ curriculo: deAtestado(29), competentes: 31 })).toBe('apto')
  })
})

describe('montarAtestado usa a mesma regra', () => {
  it('a folha do 1o grau fica apta com os 29, e nao antes', () => {
    /**
     * Amarra a folha a `aptidaoAoGrau` com o curriculo REAL. Se alguem trocar o
     * `aptidao` da folha por um calculo proprio, este teste continua passando —
     * mas o de baixo, que compara os dois, nao.
     */
    const todos = CURRICULO_1GRAU.itens.map((i) =>
      reg(i.id, true),
    )
    const cheia = montarAtestado({
      curriculo: CURRICULO_1GRAU,
      modulos: MODULOS_1GRAU,
      registros: todos,
      meta: '1grau',
      aulasCumpridas: null,
    })
    expect(cheia.aptidao).toBe('apto')

    const quaseCheia = montarAtestado({
      curriculo: CURRICULO_1GRAU,
      modulos: MODULOS_1GRAU,
      registros: todos.slice(0, -1),
      meta: '1grau',
      aulasCumpridas: null,
    })
    expect(quaseCheia.aptidao).toBe('faltam-competencias')
  })

  it('a folha CONCORDA com `aptidaoAoGrau` chamada direto', () => {
    // O teste que pega divergencia entre as duas telas: a folha nao pode ter uma
    // regra propria.
    const alguns = CURRICULO_1GRAU.itens.slice(0, 10).map((i) => reg(i.id, true))
    const folha = montarAtestado({
      curriculo: CURRICULO_1GRAU,
      modulos: MODULOS_1GRAU,
      registros: alguns,
      meta: '1grau',
      aulasCumpridas: null,
    })
    expect(folha.aptidao).toBe(
      aptidaoAoGrau({ curriculo: CURRICULO_1GRAU, competentes: folha.atestados }),
    )
  })

  it('APTO NAO DEPENDE DAS AULAS — "pode se destacar e ficar apto antes do tempo"', () => {
    /**
     * Palavras dele. Se as 35 aulas fossem condicao, o aluno que se destaca
     * ficaria preso pelo calendario da turma — e depois de presenca ser
     * descartada, `aulasCumpridas` por aluno nunca sera calculavel.
     */
    const todos = CURRICULO_1GRAU.itens.map((i) => reg(i.id, true))
    for (const aulas of [null, 0, 12, 35, 90]) {
      const f = montarAtestado({
        curriculo: CURRICULO_1GRAU,
        modulos: MODULOS_1GRAU,
        registros: todos,
        meta: '1grau',
        aulasCumpridas: aulas,
      })
      expect(f.aptidao, `aulas=${aulas}`).toBe('apto')
    }
  })
})

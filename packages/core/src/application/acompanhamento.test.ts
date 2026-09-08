import { describe, expect, it } from 'vitest'
import {
  aulaDeCadaItem,
  montarAcompanhamento,
  paresPendentes,
  programacaoDoRequisito,
} from './acompanhamento'
import { ITENS_1GRAU, MODULOS_1GRAU } from '../seed/primeiro-grau'
import type { RegistroDeCompetencia } from '../domain/competencia'

const HOJE = new Date(2026, 8, 22, 12) // 22/09/2026, terca

const ALUNOS = [
  { uid: 'floki', nome: 'Floki' },
  { uid: 'willian', nome: 'Willian' },
  { uid: 'henrique', nome: 'Henrique' },
]

/** Um registro de competencia com o minimo. */
const reg = (
  itemId: string,
  competente: boolean,
  registradaEm = '2026-09-20T10:00:00.000Z',
): RegistroDeCompetencia => ({
  id: `r-${itemId}-${registradaEm}`,
  itemId,
  competente,
  texto: 'Aula 5 · RGI · 22/09/2026',
  origem: 'aula_regular',
  professorUid: 'prof',
  registradaEm,
})

const ukemi = ITENS_1GRAU.find((i) => i.nome === 'Ukemi')!
const doubleLeg = ITENS_1GRAU.find((i) => i.nome === 'Double leg')!

/** Aulas 1 e 2 no passado, aula 20 sem data. */
const AULAS = [
  { numero: 1, itemIds: [ukemi.id], slot: '2026-09-08T0800' },
  { numero: 5, itemIds: [doubleLeg.id], slot: '2026-09-22T0800' },
  { numero: 20, itemIds: [ITENS_1GRAU[6].id], slot: '' },
]

const base = {
  turma: 'RGI',
  alunos: ALUNOS,
  itens: ITENS_1GRAU,
  modulos: MODULOS_1GRAU,
  aulas: AULAS,
  hoje: HOJE,
}

describe('aulaDeCadaItem', () => {
  it('A PRIMEIRA APARICAO GANHA — repeticao e o metodo aqui', () => {
    /**
     * Um item aparece na aula 4 e volta na aula 14 (metodo do circulo). O que
     * decide "foi ensinado" e a PRIMEIRA vez: na segunda o aluno esta revendo, e
     * esperar a revisao atrasaria a fila do professor em dez aulas.
     */
    const m = aulaDeCadaItem([
      { numero: 14, itemIds: ['a'] },
      { numero: 4, itemIds: ['a'] },
    ])
    expect(m.get('a')).toBe(4)
  })

  it('item fora do programa nao tem aula', () => {
    expect(aulaDeCadaItem([{ numero: 1, itemIds: ['a'] }]).has('b')).toBe(false)
  })
})

describe('os tres estados de "esta aprendendo"', () => {
  const a = montarAcompanhamento({ ...base, registrosPorAluno: new Map() })
  const celulaDe = (itemId: string, uid: string) =>
    a.grupos
      .flatMap((g) => g.itens)
      .find((i) => i.item.id === itemId)!
      .celulas.find((c) => c.alunoUid === uid)!

  it('aula JA DADA e sem atestacao = PENDENTE (a fila do professor)', () => {
    // A aula 1 foi em 08/09 e hoje e 22/09.
    expect(celulaDe(ukemi.id, 'willian').estado).toBe('pendente')
  })

  it('aula de HOJE ja conta como dada — o professor atesta depois da aula', () => {
    // A aula 5 e hoje (22/09). Esperar amanha faria ele nao poder marcar o que
    // acabou de ver.
    expect(celulaDe(doubleLeg.id, 'willian').estado).toBe('pendente')
  })

  it('item programado SEM DATA nao e pendente', () => {
    /**
     * Sem esta condicao a fila nasceria com 29 linhas que o professor nao pode
     * resolver — ele nao pode atestar o que nao foi dado, e a tela viraria uma
     * lista de tarefas impossiveis no primeiro dia.
     */
    const semData = ITENS_1GRAU[6]
    expect(celulaDe(semData.id, 'willian').estado).toBe('nao-ensinado')
  })

  it('item FORA do programa tambem nao e pendente', () => {
    const fora = ITENS_1GRAU.find(
      (i) => ![ukemi.id, doubleLeg.id, ITENS_1GRAU[6].id].includes(i.id),
    )!
    expect(celulaDe(fora.id, 'willian').estado).toBe('nao-ensinado')
  })

  it('atestado vira ATESTADO', () => {
    const comAtestado = montarAcompanhamento({
      ...base,
      registrosPorAluno: new Map([['floki', [reg(ukemi.id, true)]]]),
    })
    const c = comAtestado.grupos
      .flatMap((g) => g.itens)
      .find((i) => i.item.id === ukemi.id)!
      .celulas.find((x) => x.alunoUid === 'floki')!
    expect(c.estado).toBe('atestado')
  })

  it('RETIRADO nao volta a parecer esquecimento', () => {
    /**
     * O professor atestou e depois retirou (registro novo com `competente:
     * false`). Se isso virasse `pendente`, ele marcaria de novo sem lembrar por
     * que tirou — e o log append-only ficaria com o vai-e-vem sem ninguem
     * entender.
     */
    const comRetirada = montarAcompanhamento({
      ...base,
      registrosPorAluno: new Map([
        ['floki', [reg(ukemi.id, true, '2026-09-10T10:00:00.000Z'), reg(ukemi.id, false, '2026-09-15T10:00:00.000Z')]],
      ]),
    })
    const c = comRetirada.grupos
      .flatMap((g) => g.itens)
      .find((i) => i.item.id === ukemi.id)!
      .celulas.find((x) => x.alunoUid === 'floki')!
    expect(c.estado).toBe('retirado')
    expect(c.estado).not.toBe('pendente')
  })
})

describe('a matriz', () => {
  const a = montarAcompanhamento({ ...base, registrosPorAluno: new Map() })

  it('cobre os 29 itens do 1o grau', () => {
    expect(a.totalDeItens).toBe(29)
    expect(a.grupos.flatMap((g) => g.itens)).toHaveLength(29)
  })

  it('uma celula por aluno em cada item', () => {
    for (const i of a.grupos.flatMap((g) => g.itens)) {
      expect(i.celulas).toHaveLength(3)
    }
  })

  it('OS GRUPOS SEGUEM A ORDEM DO PROFESSOR, e nao a do seed', () => {
    /**
     * A lista dele e Quedas, Guarda fechada, Educativos, Posicao individual,
     * Finalizacoes, Saidas. Ordenar pela ordem em que os itens aparecem no array
     * faria a tela seguir como o seed foi escrito, e ele procuraria
     * "Finalizacoes" onde ela nao esta.
     */
    expect(a.grupos.map((g) => g.modulo.id)).toEqual([
      'g1-quedas',
      'g1-guarda-fechada',
      'g1-educativos',
      'g1-dominio',
      'g1-finalizacoes',
      'g1-saidas',
    ])
  })

  it('modulo sem item nao vira grupo vazio', () => {
    const so = montarAcompanhamento({
      ...base,
      itens: ITENS_1GRAU.filter((i) => i.moduloId === 'g1-quedas'),
      registrosPorAluno: new Map(),
    })
    expect(so.grupos.map((g) => g.modulo.id)).toEqual(['g1-quedas'])
  })

  it('conta os ENSINADOS: so os itens de aula com data no passado', () => {
    // Ukemi (aula 1, 08/09) e Double leg (aula 5, hoje). O terceiro nao tem data.
    expect(a.ensinados).toBe(2)
  })

  it('a fila da turma e ensinados x alunos', () => {
    // 2 itens ensinados x 3 alunos, nenhum atestado.
    expect(a.pendentes).toBe(6)
  })

  it('cada aluno leva o proprio placar', () => {
    const comUm = montarAcompanhamento({
      ...base,
      registrosPorAluno: new Map([['floki', [reg(ukemi.id, true)]]]),
    })
    const floki = comUm.alunos.find((x) => x.uid === 'floki')!
    const willian = comUm.alunos.find((x) => x.uid === 'willian')!
    expect(floki.atestados).toBe(1)
    expect(floki.pendentes).toBe(1)
    expect(willian.atestados).toBe(0)
    expect(willian.pendentes).toBe(2)
  })

  it('o item diz em que aula foi dado e quando — o eixo "conforme as aulas progridem"', () => {
    const i = a.grupos.flatMap((g) => g.itens).find((x) => x.item.id === ukemi.id)!
    expect(i.aula).toBe(1)
    expect(i.data).toBe('2026-09-08')
    expect(i.ensinado).toBe(true)
  })

  it('turma sem aluno nao estoura', () => {
    const vazia = montarAcompanhamento({ ...base, alunos: [], registrosPorAluno: new Map() })
    expect(vazia.pendentes).toBe(0)
    expect(vazia.grupos.flatMap((g) => g.itens)).toHaveLength(29)
  })
})

describe('atestar a area inteira', () => {
  const a = montarAcompanhamento({
    ...base,
    registrosPorAluno: new Map([
      ['floki', [reg(ukemi.id, true)]],
      ['henrique', [reg(ukemi.id, false, '2026-09-15T10:00:00.000Z')]],
    ]),
  })
  const todos = a.grupos.flatMap((g) => g.itens)

  it('SO OS PENDENTES entram — atestado e retirado ficam fora', () => {
    /**
     * A diferenca entre util e destrutivo.
     *
     * Incluir `atestado` gravaria registro repetido num log append-only —
     * poluicao permanente. Incluir `retirado` DESFARIA uma decisao do professor
     * sem ele pedir, e ele nao veria: a celula so voltaria a verde.
     */
    const pares = paresPendentes(todos)
    const doUkemi = pares.filter((p) => p.itemId === ukemi.id)
    expect(doUkemi.map((p) => p.alunoUid)).toEqual(['willian'])
  })

  it('NAO inclui o que nao foi ensinado', () => {
    // Atestar o que nao foi dado e o unico jeito de o gate ficar sem significado.
    const pares = paresPendentes(todos)
    const semData = ITENS_1GRAU[6].id
    expect(pares.some((p) => p.itemId === semData)).toBe(false)
  })

  it('filtra por aluno quando pedido', () => {
    const doWillian = paresPendentes(todos, 'willian')
    expect(doWillian.every((p) => p.alunoUid === 'willian')).toBe(true)
    expect(doWillian).toHaveLength(2)
  })

  it('um GRUPO inteiro devolve so os pendentes dele', () => {
    const quedas = a.grupos.find((g) => g.modulo.id === 'g1-quedas')!
    const pares = paresPendentes(quedas.itens)
    // Double leg e de quedas e foi dado hoje: 3 alunos pendentes. Single leg e
    // Osoto gari nao tem data.
    expect(pares).toHaveLength(3)
    expect(new Set(pares.map((p) => p.itemId))).toEqual(new Set([doubleLeg.id]))
  })

  it('grupo sem pendencia devolve lista vazia, e o botao pode desabilitar', () => {
    const educativos = a.grupos.find((g) => g.modulo.id === 'g1-educativos')!
    // Ukemi e o unico ensinado ali; floki atestado, henrique retirado, willian pendente.
    expect(paresPendentes(educativos.itens, 'floki')).toEqual([])
    expect(paresPendentes(educativos.itens, 'henrique')).toEqual([])
  })

  it('o contador do grupo casa com o que o botao faria', () => {
    // Sem isto o botao diria "atestar 3" e gravaria 5 — ou o contrario.
    for (const g of a.grupos) {
      expect(paresPendentes(g.itens)).toHaveLength(g.pendentes)
    }
  })
})

// ---------------------------------------------------------------------------
// A MESMA TECNICA COM ID DIFERENTE EM CADA CURRICULO
// ---------------------------------------------------------------------------
/**
 * O DEFEITO QUE ESTE BLOCO FIXA, medido em producao em 08/09/2026.
 *
 * O bolsao do Planner oferece os itens de AZUL; a matriz conta os do 1o GRAU; e
 * os dois conjuntos de ids sao disjuntos. A aula 1 da RGI ensinou rolamento para
 * frente e rolamento para tras — que JUNTOS sao o requisito "Rolamentos (frente e
 * costas)" — e a matriz mostrava o requisito como "fora do programa" e "0 de 29
 * itens ja foram dados em aula".
 *
 * Nenhum dos 23 testes acima pegou isso, e o motivo e instrutivo: todos usam
 * `AULAS`, construido com ids de `ITENS_1GRAU`. A suite inteira vivia no universo
 * em que os dois lados coincidem — universo que a producao nao tem.
 */
describe('requisito satisfeito por itens de OUTRO curriculo', () => {
  const HOJE_TXT = '2026-09-08'
  const mapa = (pares: [string, number][]) => new Map(pares)

  /** As duas partes do requisito "Rolamentos", como estao no azul. */
  const ROLAMENTOS = ['az--rolamento-frente', 'az--rolamento-tras']
  const equivalentes = (id: string) => (id === 'g1-edu--rolamentos' ? ROLAMENTOS : [])

  const resolver = (
    aulaDoItem: Map<string, number>,
    dataDaAula: Map<number, string>,
    requisitoId = 'g1-edu--rolamentos',
  ) => programacaoDoRequisito({ requisitoId, aulaDoItem, dataDaAula, limite: HOJE_TXT, equivalentes })

  it('O CASO DE PRODUCAO: as duas partes na aula 1 ja dada = ENSINADO', () => {
    const r = resolver(
      mapa([
        [ROLAMENTOS[0], 1],
        [ROLAMENTOS[1], 1],
      ]),
      new Map([[1, '2026-09-08']]),
    )
    expect(r.ensinado).toBe(true)
    expect(r.aula).toBe(1)
    expect(r.partes).toEqual({ programadas: 2, dadas: 2, total: 2 })
  })

  it('o caminho DIRETO ganha quando e ele que ja foi dado', () => {
    /**
     * O id proprio na aula 3 (ja dada) contra os equivalentes na aula 9 (futura).
     * Ganha o direto porque ele esta ENSINADO, e nao porque e o direto — ver o
     * teste do o soto gari, em que a comparacao inverte.
     */
    const r = resolver(
      mapa([
        ['g1-edu--rolamentos', 3],
        [ROLAMENTOS[0], 9],
        [ROLAMENTOS[1], 9],
      ]),
      new Map([
        [3, '2026-09-01'],
        [9, '2026-10-20'],
      ]),
    )
    expect(r.aula).toBe(3)
    expect(r.partes).toBe(null)
    expect(r.ensinado).toBe(true)
  })

  it('TODOS OS EQUIVALENTES: uma parte dada e a outra no futuro NAO e ensinado', () => {
    // A decisao do professor: "ukemi conta como todos frente, costas e lateral".
    const r = resolver(
      mapa([
        [ROLAMENTOS[0], 1],
        [ROLAMENTOS[1], 4],
      ]),
      new Map([
        [1, '2026-09-08'],
        [4, '2026-09-17'],
      ]),
    )
    expect(r.ensinado).toBe(false)
    expect(r.partes).toEqual({ programadas: 2, dadas: 1, total: 2 })
  })

  it('A ULTIMA PARTE E A QUE COMPLETA, e nao a primeira', () => {
    /**
     * Se `aula` fosse a primeira, a procedencia gravada diria "Aula 1" para um
     * requisito que so ficou pronto na aula 4 — e seis meses depois o log estaria
     * apontando para a aula errada.
     */
    const r = resolver(
      mapa([
        [ROLAMENTOS[0], 1],
        [ROLAMENTOS[1], 4],
      ]),
      new Map([
        [1, '2026-09-01'],
        [4, '2026-09-08'],
      ]),
    )
    expect(r.aula).toBe(4)
    expect(r.data).toBe('2026-09-08')
    expect(r.ensinado).toBe(true)
  })

  it('FALTANDO UMA PARTE NO PROGRAMA, `aula` e null mas o parcial aparece', () => {
    /**
     * A diferenca entre "falta uma parte" e "nao esta no programa" — que sem
     * `partes` seriam a MESMA celula em branco. Dizer "aula 1" aqui prometeria
     * uma conclusao que nao vem: a outra parte nao esta programada em lugar
     * nenhum.
     */
    const r = resolver(mapa([[ROLAMENTOS[0], 1]]), new Map([[1, '2026-09-08']]))
    expect(r.aula).toBe(null)
    expect(r.ensinado).toBe(false)
    expect(r.partes).toEqual({ programadas: 1, dadas: 1, total: 2 })
  })

  it('parte programada SEM DATA nao conta como dada', () => {
    const r = resolver(
      mapa([
        [ROLAMENTOS[0], 1],
        [ROLAMENTOS[1], 20],
      ]),
      new Map([[1, '2026-09-08']]),
    )
    expect(r.ensinado).toBe(false)
    expect(r.aula).toBe(20)
    expect(r.data).toBe(null)
    expect(r.partes).toEqual({ programadas: 2, dadas: 1, total: 2 })
  })

  it('requisito SEM equivalente e fora do programa tem `partes` null', () => {
    // Os 13 requisitos que o azul nao enumera (dominio de posicao, ataques a
    // partir dela). "Sem partes" e diferente de "zero partes dadas".
    const r = resolver(new Map(), new Map(), 'g1-dom--montada')
    expect(r.aula).toBe(null)
    expect(r.partes).toBe(null)
  })

  it('montarAcompanhamento repassa a tabela — e sem ela nada muda', () => {
    /**
     * O padrao e "sem equivalente nenhum", e este teste fixa isso: os 23 testes
     * acima passam justamente porque o default nao inventa equivalencia. Se
     * alguem trocar o default pela tabela do 1o grau, o `application` passa a
     * conhecer o seed de um curriculo — e este teste quebra.
     */
    const aulas = [{ numero: 1, itemIds: ROLAMENTOS, slot: '2026-09-08T0800' }]
    const rolamentos = ITENS_1GRAU.find((i) => i.id === 'g1-edu--rolamentos')!

    const sem = montarAcompanhamento({ ...base, aulas, registrosPorAluno: new Map() })
    expect(sem.ensinados).toBe(0)

    const com = montarAcompanhamento({
      ...base,
      aulas,
      registrosPorAluno: new Map(),
      equivalentes,
    })
    expect(com.ensinados).toBe(1)
    const linha = com.grupos.flatMap((g) => g.itens).find((i) => i.item.id === rolamentos.id)!
    expect(linha.ensinado).toBe(true)
    expect(linha.celulas.every((c) => c.estado === 'pendente')).toBe(true)
  })
})

/**
 * O CASO QUE DERRUBOU A PRIMEIRA VERSAO DA REGRA, tirado do programa real da RGI
 * em 08/09/2026.
 *
 * `quedas--o-soto-gari` (id de azul) esta na aula 1, dada naquela manha.
 * `g1-quedas--osoto-gari` (o requisito) esta na aula 15, sem data. A regra "o id
 * proprio ganha" devolvia a aula 15 e "nao ensinado" — para uma tecnica que o
 * professor tinha acabado de dar.
 *
 * O erro era de ORDEM: precedencia escolhe o caminho antes de saber qual deles
 * aconteceu. Nenhum teste inventado tinha essa forma; o dado de producao tinha.
 */
describe('entre os dois caminhos, ganha o que JA FOI DADO', () => {
  const equivalentes = (id: string) =>
    id === 'g1-quedas--osoto-gari' ? ['az--o-soto-gari'] : []

  const osoto = (aulaDoItem: Map<string, number>, dataDaAula: Map<number, string>) =>
    programacaoDoRequisito({
      requisitoId: 'g1-quedas--osoto-gari',
      aulaDoItem,
      dataDaAula,
      limite: '2026-09-08',
      equivalentes,
    })

  it('equivalente dado na aula 1 vence o id proprio sem data na aula 15', () => {
    const r = osoto(
      new Map([
        ['az--o-soto-gari', 1],
        ['g1-quedas--osoto-gari', 15],
      ]),
      new Map([[1, '2026-09-08']]),
    )
    expect(r.ensinado).toBe(true)
    expect(r.aula).toBe(1)
  })

  it('entre dois caminhos JA DADOS, ganha a data mais antiga', () => {
    // "A primeira aparicao ganha": o que decide "esta aprendendo" e a primeira
    // vez que o aluno viu, e nao a repeticao.
    const r = osoto(
      new Map([
        ['az--o-soto-gari', 9],
        ['g1-quedas--osoto-gari', 2],
      ]),
      new Map([
        [2, '2026-09-05'],
        [9, '2026-09-01'],
      ]),
    )
    expect(r.ensinado).toBe(true)
    expect(r.data).toBe('2026-09-01')
    expect(r.aula).toBe(9)
  })

  it('nenhum dado ainda: ganha a aula MENOR, que e quando vai ser dado', () => {
    const r = osoto(
      new Map([
        ['az--o-soto-gari', 12],
        ['g1-quedas--osoto-gari', 4],
      ]),
      new Map(),
    )
    expect(r.ensinado).toBe(false)
    expect(r.aula).toBe(4)
  })
})

/**
 * `programadas` E `dadas` SAO PERGUNTAS DIFERENTES, e confundi-las produziu um
 * defeito que a pagina de amostra mostrou na primeira olhada: a coluna dizia
 * "falta parte" para "Raspagem de tesoura", cuja unica parte nao esta programada
 * em lugar nenhum. Nao falta parte — falta o requisito inteiro.
 *
 * `programadas` responde "esta no programa?"; `dadas` responde "ja aconteceu?".
 * A tela usa a primeira para escolher a FRASE e a segunda para o NUMERO.
 */
describe('partes: programadas responde uma coisa, dadas responde outra', () => {
  const TRES = ['az--a', 'az--b', 'az--c']
  const equivalentes = (id: string) => (id === 'req' ? TRES : [])
  const req = (aulaDoItem: Map<string, number>, dataDaAula: Map<number, string>) =>
    programacaoDoRequisito({
      requisitoId: 'req',
      aulaDoItem,
      dataDaAula,
      limite: '2026-09-08',
      equivalentes,
    })

  it('nenhuma parte programada: `programadas` zero — a tela diz "fora do programa"', () => {
    const r = req(new Map(), new Map())
    expect(r.partes).toEqual({ programadas: 0, dadas: 0, total: 3 })
    expect(r.aula).toBe(null)
  })

  it('programadas SEM data conta em `programadas` e NAO em `dadas`', () => {
    /**
     * A distincao que a tela precisa: tres partes no programa, nenhuma com data.
     * "Fora do programa" seria falso (estao lá) e "3 de 3 partes" tambem
     * (nenhuma foi dada).
     */
    const r = req(
      new Map([
        ['az--a', 4],
        ['az--b', 5],
        ['az--c', 6],
      ]),
      new Map(),
    )
    expect(r.partes).toEqual({ programadas: 3, dadas: 0, total: 3 })
    expect(r.aula).toBe(6)
    expect(r.ensinado).toBe(false)
  })

  it('parcialmente programado E parcialmente dado: as duas contagens divergem', () => {
    const r = req(
      new Map([
        ['az--a', 1],
        ['az--b', 9],
      ]),
      new Map([
        [1, '2026-09-01'],
        [9, '2026-10-10'],
      ]),
    )
    // `az--c` fora do programa: o requisito nao pode se completar.
    expect(r.aula).toBe(null)
    expect(r.partes).toEqual({ programadas: 2, dadas: 1, total: 3 })
  })

  it('requisito de UMA parte tambem tem `partes`, e a TELA e que decide nao mostrar', () => {
    /**
     * O core devolve o dado; a decisao de nao imprimir "0 de 1 partes" e de
     * apresentacao e vive no componente. Pôr a regra aqui obrigaria toda outra
     * tela a herdar uma escolha de layout desta.
     */
    const uma = (id: string) => (id === 'req' ? ['az--a'] : [])
    const r = programacaoDoRequisito({
      requisitoId: 'req',
      aulaDoItem: new Map(),
      dataDaAula: new Map(),
      limite: '2026-09-08',
      equivalentes: uma,
    })
    expect(r.partes).toEqual({ programadas: 0, dadas: 0, total: 1 })
  })
})

import { describe, expect, it } from 'vitest'
import {
  AULAS_DO_1GRAU,
  AULAS_PRE_PREENCHIDAS,
  AULA_EXPERIMENTAL,
  ULTIMA_AULA,
  aulaVazia,
  blocoDaAula,
  descreverRotulo,
  montarPlanner,
  numerosDasAulas,
  porItemNaAula,
  porRotulo,
  sugestaoDo1Grau,
  tirarItemDaAula,
  tirarRotulo,
  tipoPrecisaPosicao,
  aulaTemConteudo,
  resumoDasAulas,
} from './programa'
import { ITENS_1GRAU, MODULOS_1GRAU } from '../seed/primeiro-grau'
import { CURRICULO_AZUL } from '../seed/curriculos'
import { bolsaoEmSecoes } from './bolsao'
import { equivalentesDe } from '../seed/equivalencia-1grau'

/** O bolsao real que a Central passa: os 29 requisitos e o catalogo de azul. */
const SECOES = bolsaoEmSecoes({
  requisitos: ITENS_1GRAU,
  modulosDosRequisitos: MODULOS_1GRAU,
  catalogo: CURRICULO_AZUL.itens,
  equivalentes: equivalentesDe,
})

describe('a forma do programa', () => {
  it('vai da aula 00 a 80: experimental + 35 do 1o grau + 45 seguintes', () => {
    // "35 no 1o grau, e 45 depois — 80 no total", confirmado. A 00 e a
    // experimental, e por isso sao 81 caixas para 80 aulas.
    const n = numerosDasAulas()
    expect(n[0]).toBe(0)
    expect(n[n.length - 1]).toBe(80)
    expect(n).toHaveLength(81)
    expect(ULTIMA_AULA).toBe(80)
  })

  it('cada aula sabe em que bloco esta', () => {
    expect(blocoDaAula(0)).toBe('experimental')
    expect(blocoDaAula(1)).toBe('1grau')
    expect(blocoDaAula(35)).toBe('1grau')
    expect(blocoDaAula(36)).toBe('seguintes')
    expect(blocoDaAula(80)).toBe('seguintes')
  })

  it('a aula experimental nao e a aula 1 — sao coisas diferentes', () => {
    // Defesa pessoal e dada na experimental, presencial. Se ela fosse a aula 1,
    // o contador do 1o grau comecaria em uma aula que nao e do programa.
    expect(AULA_EXPERIMENTAL).toBe(0)
    expect(blocoDaAula(AULA_EXPERIMENTAL)).not.toBe('1grau')
  })
})

describe('sugestao do 1o grau', () => {
  const plano = sugestaoDo1Grau(ITENS_1GRAU)
  const programados = [...plano.values()].flat()

  it('programa TODOS os 29 itens — o gate depende disso', () => {
    /**
     * O 1o grau so habilita quando os 29 fecham. Um item que nunca e programado
     * e um item que o aluno nunca ve, e a graduacao dele fica presa sem que a
     * tela diga por que. Por isso a sugestao tem rede de seguranca, e por isso
     * este teste amarra os 29.
     */
    expect(new Set(programados).size).toBe(29)
    expect(new Set(programados)).toEqual(new Set(ITENS_1GRAU.map((i) => i.id)))
  })

  it('nao passa da aula 25 — as dez ultimas do 1o grau ficam livres', () => {
    // Nao e sobra: e o espaco que o professor usa para revisar antes de graduar.
    const aulas = [...plano.keys()]
    expect(Math.min(...aulas)).toBeGreaterThanOrEqual(1)
    expect(Math.max(...aulas)).toBeLessThanOrEqual(AULAS_PRE_PREENCHIDAS)
    expect(AULAS_PRE_PREENCHIDAS).toBeLessThan(AULAS_DO_1GRAU)
  })

  it('UKEMI VEM ANTES DE OSOTO GARI — e isto e seguranca, nao pedagogia', () => {
    /**
     * A lista do professor traz Quedas ANTES de Educativos. Seguir a ordem dela
     * ao pe da letra programaria `osoto gari` na aula 2 e `ukemi` na aula 20:
     * projetar alguem no chao antes de ensina-lo a bater.
     *
     * Se alguem "consertar" a ordem para seguir a lista, este teste falha.
     */
    const aulaDe = (id: string) => {
      for (const [aula, ids] of plano) if (ids.includes(id)) return aula
      return Infinity
    }
    const ukemi = ITENS_1GRAU.find((i) => i.nome === 'Ukemi')!
    const osoto = ITENS_1GRAU.find((i) => i.nome === 'Osoto gari')!
    expect(aulaDe(ukemi.id)).toBeLessThan(aulaDe(osoto.id))
  })

  it('os educativos ocupam as PRIMEIRAS aulas, um por aula', () => {
    const educativos = ITENS_1GRAU.filter((i) => i.moduloId === 'g1-educativos')
    expect(educativos).toHaveLength(4)
    educativos.forEach((item, n) => {
      expect(plano.get(n + 1)).toContain(item.id)
    })
  })

  it('ESPALHA pelas 25 aulas, e nao empilha nas primeiras', () => {
    /**
     * O DEFEITO QUE ESTE TESTE PEGA, e que os outros 24 NAO pegaram.
     *
     * A primeira versao usava `paresDoCirculo(modulos.length)` direto — uma aula
     * por rodada. Com 5 modulos restantes isso da 5 rodadas, e os 25 itens
     * cairam nas aulas 5 a 9: sete tecnicas na aula 6, aulas 10 a 25 VAZIAS. O
     * metodo do espacamento produzindo o oposto de espacamento.
     *
     * Nenhum teste pegou porque todos verificavam propriedades que continuavam
     * verdadeiras: os 29 estavam la, nada passava da aula 25, e "o modulo aparece
     * em mais de uma aula" tambem valia. So a TELA mostrou.
     *
     * Estas duas assercoes sao as que faltavam: o alcance e o teto por aula.
     */
    const aulas = [...plano.keys()].sort((a, b) => a - b)
    const ultima = aulas[aulas.length - 1]
    // Usa a segunda metade do intervalo: com 29 itens em 25 aulas, parar na aula
    // 9 significa empilhar.
    expect(ultima).toBeGreaterThanOrEqual(20)

    // NENHUMA AULA E UMA LISTA. Uma aula de jiu-jitsu com sete tecnicas novas
    // nao e uma aula.
    const maior = Math.max(...[...plano.values()].map((ids) => ids.length))
    expect(maior).toBeLessThanOrEqual(3)
  })

  it('duas aparicoes do mesmo modulo ficam LONGE uma da outra', () => {
    /**
     * O ponto do espacamento, medido em vez de suposto: nao basta o modulo
     * aparecer duas vezes, as duas precisam estar distantes. Aulas 6 e 7 e
     * repetir; aulas 6 e 16 e recuperacao com intervalo.
     */
    const distancias: number[] = []
    for (const m of new Set(ITENS_1GRAU.map((i) => i.moduloId))) {
      if (m === 'g1-educativos') continue
      const ids = new Set(ITENS_1GRAU.filter((i) => i.moduloId === m).map((i) => i.id))
      const aulas = [...plano]
        .filter(([, doPlano]) => doPlano.some((id) => ids.has(id)))
        .map(([aula]) => aula)
        .sort((a, b) => a - b)
      if (aulas.length >= 2) distancias.push(aulas[aulas.length - 1] - aulas[0])
    }
    expect(distancias.length).toBeGreaterThan(0)
    // Todo modulo que repete cobre pelo menos 4 aulas de intervalo.
    expect(Math.min(...distancias)).toBeGreaterThanOrEqual(4)
  })

  it('um modulo aparece em MAIS DE UMA aula — o metodo do circulo', () => {
    /**
     * Espacamento. Ver a guarda fechada inteira numa aula e nunca mais e pior do
     * que ver metade na aula 4 e metade na aula 14. Se a distribuicao voltar a
     * empilhar o modulo numa aula so, este teste falha.
     */
    const aulasDoModulo = (moduloId: string) => {
      const ids = new Set(ITENS_1GRAU.filter((i) => i.moduloId === moduloId).map((i) => i.id))
      const aulas = new Set<number>()
      for (const [aula, doPlano] of plano) {
        if (doPlano.some((id) => ids.has(id))) aulas.add(aula)
      }
      return aulas
    }
    // Finalizacoes tem 10 itens: e o maior, e nao pode caber numa aula.
    expect(aulasDoModulo('g1-finalizacoes').size).toBeGreaterThan(1)
  })

  it('lista vazia devolve plano vazio, sem estourar', () => {
    expect(sugestaoDo1Grau([]).size).toBe(0)
  })
})

describe('montarPlanner', () => {
  const base = {
    turma: 'RGI',
    secoesDoBolsao: SECOES,
    // Os 29 do 1o grau NAO estao no curriculo de azul: ids proprios (ADR-016).
    itensConhecidos: [...CURRICULO_AZUL.itens, ...ITENS_1GRAU],
  }

  it('desenha as 81 caixas mesmo sem nada guardado', () => {
    const e = montarPlanner({ ...base, aulas: [] })
    expect(e.aulas).toHaveLength(81)
    expect(e.aulasComConteudo).toBe(0)
  })

  it('O BOLSAO NAO ENCOLHE quando o item e usado — repeticao e o metodo', () => {
    /**
     * A diferenca central em relacao a `montagem.ts`, onde o bolsao e um estoque
     * e cada item tem um lugar so. Aqui ele e um CATALOGO: a guarda fechada
     * continua disponivel depois de programada na aula 4, porque ela volta na 14.
     *
     * Se alguem copiar a logica de `montagem` para ca, este teste falha.
     */
    const um = CURRICULO_AZUL.itens.find((i) => i.ativo)!
    const vazio = montarPlanner({ ...base, aulas: [] })
    const usado = montarPlanner({
      ...base,
      aulas: [{ ...aulaVazia(4), itemIds: [um.id] }],
    })
    const conta = (e: typeof vazio) => e.bolsao.reduce((n, s) => n + s.total, 0)
    expect(conta(usado)).toBe(conta(vazio))
  })

  it('as 25 aulas pre-preenchidas do 1o grau NAO aparecem como desconhecidas', () => {
    /**
     * O defeito que este teste impede: com uma lista so de itens, os 29 ids do 1o
     * grau (que nao existem no curriculo de azul) apareceriam TODOS como "item
     * desconhecido" — dado certo exibido como erro, nas 25 primeiras aulas.
     */
    const plano = sugestaoDo1Grau(ITENS_1GRAU)
    const aulas = [...plano].map(([numero, itemIds]) => ({ ...aulaVazia(numero), itemIds }))
    const e = montarPlanner({ ...base, aulas })
    expect(e.aulas.flatMap((a) => a.desconhecidos)).toEqual([])
    expect(e.aulasComConteudo).toBeGreaterThan(0)
  })

  it('id que nao existe mais VIRA AVISO, e nao desaparece', () => {
    // Item renomeado no seed deixa a aula com uma referencia orfa. Sumir com ela
    // faria a aula encolher em silencio; o professor precisa saber que algo saiu.
    const e = montarPlanner({ ...base, aulas: [{ ...aulaVazia(3), itemIds: ['fantasma'] }] })
    expect(e.aulas.find((a) => a.numero === 3)?.desconhecidos).toEqual(['fantasma'])
  })

  it('lista o que ficou FORA do programa POR SECAO, com nome e nao so contagem', () => {
    /**
     * "faltam 6 itens" e um numero sem endereco. Para fechar um grau, o professor
     * precisa da lista do que o aluno nunca vai ter visto.
     *
     * POR SECAO E NAO SOMADO, e o numero antigo era sobre a coisa errada: contava
     * os 81 de azul menos os usados, e mostrava 57 na RGI. A pergunta dele e
     * "falta algum dos 29 do 1o grau?", e a resposta estava diluida no catalogo.
     */
    const e = montarPlanner({ ...base, aulas: [] })
    const requisitos = e.bolsao.find((s) => s.id === 'requisitos')!
    const catalogo = e.bolsao.find((s) => s.id === 'catalogo')!
    expect(requisitos.fora).toHaveLength(29)
    expect(catalogo.fora).toHaveLength(69)

    const um = requisitos.fora[0]
    const depois = montarPlanner({ ...base, aulas: [{ ...aulaVazia(40), itemIds: [um.id] }] })
    const foraDepois = depois.bolsao.find((s) => s.id === 'requisitos')!.fora
    expect(foraDepois.map((i) => i.id)).not.toContain(um.id)
    expect(foraDepois).toHaveLength(28)
  })

  it('o bolsao oferece os 29 requisitos E o catalogo — nenhum item desaparece', () => {
    /**
     * O DEFEITO QUE ESTE TESTE IMPEDE, e ele bloqueava a necessidade numero um.
     *
     * O bolsao recebia so `CURRICULO_AZUL.itens`, e os 29 do 1o grau nao estavam
     * nele: o professor nao conseguia programar NENHUM deles. Pior, passar os 29
     * pelo agrupamento por bloco descartaria 17 em SILENCIO — as posicoes deles
     * (`Educativos`, `100 Kilos`, `Montada`, `Costas`) nao caem em bloco nenhum
     * da taxonomia de azul. Ver `bolsaoEmSecoes`.
     */
    const e = montarPlanner({ ...base, aulas: [] })
    expect(e.bolsao.map((s) => s.id)).toEqual(['requisitos', 'catalogo'])
    expect(e.bolsao.find((s) => s.id === 'requisitos')!.total).toBe(29)
    expect(e.bolsao.find((s) => s.id === 'catalogo')!.total).toBe(69)
  })

  it('SEM secoes o planner ainda resolve nomes — o caso da Grade e do app', () => {
    /**
     * `GradeDaTurma` e a tela `Programa` do app do aluno chamam `montarPlanner`
     * so para resolver NOMES de item, e nao desenham bolsao. Antes passavam os 81
     * itens de azul para serem agrupados por bloco a cada render e o resultado
     * jogado fora.
     */
    const um = CURRICULO_AZUL.itens.find((i) => i.ativo)!
    const e = montarPlanner({
      turma: 'RGI',
      aulas: [{ ...aulaVazia(4), itemIds: [um.id] }],
      itensConhecidos: CURRICULO_AZUL.itens,
    })
    expect(e.bolsao).toEqual([])
    expect(e.aulas.find((a) => a.numero === 4)?.itens.map((i) => i.id)).toEqual([um.id])
  })
})

describe('o "+" — rotulo pontual', () => {
  it('descreve posicao, tipo e nome numa linha', () => {
    expect(
      descreverRotulo({ id: 'r1', posicao: 'Montada', tipo: 'finalizacao', nome: 'Gravata romana' }),
    ).toBe('Montada · Finalização · Gravata romana')
  })

  it('queda e avulsa nao pedem posicao — nao saem de posicao nenhuma', () => {
    // "inclua Queda nas tecnicas avulsas": uma queda comeca de pe.
    expect(tipoPrecisaPosicao('queda')).toBe(false)
    expect(tipoPrecisaPosicao('avulsa')).toBe(false)
    expect(tipoPrecisaPosicao('finalizacao')).toBe(true)
    expect(tipoPrecisaPosicao('inventado')).toBe(false)
  })

  it('sem posicao, a descricao nao deixa separador solto', () => {
    expect(descreverRotulo({ id: 'r', posicao: '', tipo: 'queda', nome: 'Uchi mata' })).toBe(
      'Queda · Uchi mata',
    )
  })

  it('entra e sai da aula', () => {
    const r = { id: 'r1', posicao: '', tipo: 'queda', nome: 'Uchi mata' }
    const com = porRotulo(aulaVazia(5), r)
    expect(com.rotulos).toHaveLength(1)
    expect(tirarRotulo(com, 'r1').rotulos).toEqual([])
  })

  it('O ROTULO NAO ENTRA NO BOLSAO nem conta no gate', () => {
    /**
     * "somente um rotulo dentro da aula, isso e para o caso o mestre queira
     * acrescentar um item pontual que por acaso nao esta no bolsao."
     *
     * Ele e uma anotacao. Se um rotulo passasse a contar como item do curriculo,
     * o gate do 1o grau deixaria de ser os 29 e passaria a ser "os 29 mais o que
     * o professor escreveu" — e a regra de negocio mudaria por digitacao.
     */
    const com = porRotulo(aulaVazia(4), { id: 'r', posicao: '', tipo: 'avulsa', nome: 'X' })
    const e = montarPlanner({
      turma: 'RGI',
      aulas: [com],
      secoesDoBolsao: SECOES,
      itensConhecidos: CURRICULO_AZUL.itens,
    })
    const aula = e.aulas.find((a) => a.numero === 4)!
    expect(aula.rotulos).toHaveLength(1)
    // Nao virou item:
    expect(aula.itens).toEqual([])
    // E nao entrou no catalogo:
    expect(
      e.bolsao
        .flatMap((s) => s.grupos)
        .flatMap((g) => g.itens)
        .some((i) => i.nome === 'X'),
    ).toBe(false)
  })
})

describe('edicoes da aula', () => {
  it('poe e tira item', () => {
    const com = porItemNaAula(aulaVazia(7), 'i1')
    expect(com.itemIds).toEqual(['i1'])
    expect(tirarItemDaAula(com, 'i1').itemIds).toEqual([])
  })

  it('nao duplica o mesmo item DENTRO da aula', () => {
    // Repeticao entre aulas e espacamento; duas vezes na mesma aula e clique
    // repetido.
    const uma = porItemNaAula(porItemNaAula(aulaVazia(7), 'i1'), 'i1')
    expect(uma.itemIds).toEqual(['i1'])
  })

  it('MAS PERMITE o mesmo item em aulas diferentes', () => {
    const a4 = porItemNaAula(aulaVazia(4), 'i1')
    const a14 = porItemNaAula(aulaVazia(14), 'i1')
    const e = montarPlanner({
      turma: 'RGI',
      aulas: [a4, a14],
      secoesDoBolsao: [],
      itensConhecidos: [
        {
          id: 'i1', moduloId: 'm', posicao: 'Guarda Fechada', slot: 's', categoria: 'c',
          nome: 'n', aliases: [], kind: 'raspagem', sideMode: 'nao_se_aplica',
          safetyLevel: 'baixo', validationStatus: 'aguardando_validacao',
          sourceReference: 'x', ativo: true,
        },
      ],
    })
    expect(e.aulas.find((a) => a.numero === 4)?.itens).toHaveLength(1)
    expect(e.aulas.find((a) => a.numero === 14)?.itens).toHaveLength(1)
  })
})

describe('os modulos do 1o grau', () => {
  it('a ordem e a do professor, e educativos nao e o primeiro dela', () => {
    // Registro do conflito: a ORDEM DA LISTA dele poe Quedas em primeiro e
    // Educativos em terceiro. A ordem de PROGRAMACAO inverte isso por seguranca.
    // As duas coexistem de proposito — a lista e dele, a programacao e sugestao.
    expect(MODULOS_1GRAU.map((m) => m.id)).toEqual([
      'g1-quedas',
      'g1-guarda-fechada',
      'g1-educativos',
      'g1-dominio',
      'g1-finalizacoes',
      'g1-saidas',
    ])
  })
})

// ---------------------------------------------------------------------------
// O conteudo da aula para quem NAO a montou (o professor substituto)
// ---------------------------------------------------------------------------

describe('resumoDasAulas', () => {
  const base = {
    turma: 'RGI',
    secoesDoBolsao: SECOES,
    itensConhecidos: [...CURRICULO_AZUL.itens, ...ITENS_1GRAU],
  }

  it('traz as TECNICAS de cada aula, e nao so o numero', () => {
    /**
     * A razao de ser desta funcao, e o pedido foi literal: "caso o professor Joao
     * nao for na aula um professor substituto pode ver". Para quem montou, `Aula
     * 6` basta. Para um substituto, o numero e a mesma informacao que uma caixa
     * vazia.
     */
    const plano = sugestaoDo1Grau(ITENS_1GRAU)
    const aulas = [...plano].map(([numero, itemIds]) => ({ ...aulaVazia(numero), itemIds }))
    const r = resumoDasAulas(montarPlanner({ ...base, aulas }).aulas)

    const aula1 = r.get(1)!
    expect(aula1.tecnicas).toHaveLength(1)
    expect(aula1.tecnicas[0]).toBe('Ukemi')
    expect(aulaTemConteudo(aula1)).toBe(true)
  })

  it('usa `slot` quando o item nao tem `nome` — senao um quarto da grade fica em branco', () => {
    /**
     * MEDIDO, e nao suposto: 25 dos 81 itens do curriculo de azul tem `nome`
     * vazio e so o `slot` preenchido (a posicao na prova, tipo "Raspada 1").
     * Mostrar o `nome` cru deixaria essas linhas vazias na Grade — e o
     * substituto leria um espaco em branco onde deveria haver uma tecnica.
     */
    const semNome = CURRICULO_AZUL.itens.find((i) => i.ativo && i.nome === '')
    expect(semNome, 'o seed deveria ter item sem nome').toBeDefined()

    const aulas = [{ ...aulaVazia(4), itemIds: [semNome!.id] }]
    const r = resumoDasAulas(montarPlanner({ ...base, aulas }).aulas)
    expect(r.get(4)?.tecnicas).toEqual([semNome!.slot])
    expect(r.get(4)?.tecnicas[0]).not.toBe('')
  })

  it('o ROTULO pontual entra descrito, junto das tecnicas', () => {
    // O substituto precisa ver o que foi acrescentado a mao: aquilo nao esta em
    // lista nenhuma que ele possa consultar.
    const aulas = [
      { ...aulaVazia(9), rotulos: [{ id: 'r', posicao: 'Montada', tipo: 'finalizacao', nome: 'Gravata romana' }] },
    ]
    const r = resumoDasAulas(montarPlanner({ ...base, aulas }).aulas)
    expect(r.get(9)?.rotulos).toEqual(['Montada · Finalização · Gravata romana'])
    expect(aulaTemConteudo(r.get(9))).toBe(true)
  })

  it('o FOCO viaja, porque e a frase que resume a aula', () => {
    const aulas = [{ ...aulaVazia(5), foco: 'abrir a guarda em pé' }]
    const r = resumoDasAulas(montarPlanner({ ...base, aulas }).aulas)
    expect(r.get(5)?.foco).toBe('abrir a guarda em pé')
    // Foco sozinho JA e conteudo: uma aula sem tecnica do curriculo mas com o
    // foco escrito diz ao substituto o que fazer.
    expect(aulaTemConteudo(r.get(5))).toBe(true)
  })

  it('AULA VAZIA NAO TEM CONTEUDO — e a Grade avisa em vez de mostrar branco', () => {
    // Se o professor faltar numa terca cuja aula esta vazia, o substituto chega e
    // nao ha o que dar. Dizer isso ANTES do dia e o unico jeito de dar tempo.
    const r = resumoDasAulas(montarPlanner({ ...base, aulas: [] }).aulas)
    expect(aulaTemConteudo(r.get(6))).toBe(false)
    expect(aulaTemConteudo(undefined)).toBe(false)
  })

  it('id orfao viaja como desconhecido, e nao desaparece', () => {
    const aulas = [{ ...aulaVazia(3), itemIds: ['fantasma'] }]
    const r = resumoDasAulas(montarPlanner({ ...base, aulas }).aulas)
    expect(r.get(3)?.desconhecidos).toEqual(['fantasma'])
    // Um id orfao NAO conta como conteudo: nao ha tecnica para dar.
    expect(aulaTemConteudo(r.get(3))).toBe(false)
  })

  it('cobre as 81 caixas, para nenhum slot ficar sem resposta', () => {
    const r = resumoDasAulas(montarPlanner({ ...base, aulas: [] }).aulas)
    expect(r.size).toBe(81)
  })
})

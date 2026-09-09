import { describe, expect, it } from 'vitest'
import { bolsaoEmSecoes } from './bolsao'
import type { SecaoDoBolsao } from './bolsao'
import { ITENS_1GRAU, MODULOS_1GRAU } from '../seed/primeiro-grau'
import { CURRICULO_AZUL } from '../seed/curriculos'
import { ehUmMovimentoSo, equivalentesDe } from '../seed/equivalencia-1grau'

const secoes = bolsaoEmSecoes({
  requisitos: ITENS_1GRAU,
  modulosDosRequisitos: MODULOS_1GRAU,
  catalogo: CURRICULO_AZUL.itens,
  equivalentes: equivalentesDe,
  umMovimentoSo: ehUmMovimentoSo,
})

const secao = (id: SecaoDoBolsao['id']) => secoes.find((s) => s.id === id)!
const itensDe = (id: SecaoDoBolsao['id']) => secao(id).grupos.flatMap((g) => g.itens)

describe('NADA DESAPARECE — a garantia que este arquivo existe para dar', () => {
  /**
   * ESTES DOIS TESTES SAO A RAZAO DO ARQUIVO.
   *
   * O agrupamento antigo fazia `if (!blocoDaPosicao(item.posicao)) continue`, e
   * 17 dos 29 requisitos caem nesse ramo: as posicoes deles sao `Educativos`,
   * `100 Kilos`, `Montada` e `Costas` — a posicao EM SI —, enquanto a taxonomia
   * foi construida da folha de azul, que tem `Saida da Montada`. Passar os 29
   * por ali descartaria 17 em SILENCIO, sem erro, com a tela parecendo pronta.
   *
   * A necessidade dele e "garantir que esses itens estao nas aulas da RGI".
   * Um bolsao que oferece 12 dos 29 nao garante nada e nao avisa.
   */
  it('TODO requisito ativo esta em algum grupo da secao de requisitos', () => {
    const nosGrupos = new Set(itensDe('requisitos').map((i) => i.id))
    const faltando = ITENS_1GRAU.filter((i) => i.ativo && !nosGrupos.has(i.id))
    expect(faltando.map((i) => `${i.nome} (${i.posicao})`)).toEqual([])
    expect(nosGrupos.size).toBe(29)
  })

  it('TODO item ativo do catalogo esta em algum grupo, exceto os absorvidos', () => {
    const nosGrupos = new Set(itensDe('catalogo').map((i) => i.id))
    const gemeos = new Set(
      ITENS_1GRAU.flatMap((r) => {
        const e = equivalentesDe(r.id)
        return e.length === 1 || ehUmMovimentoSo(r.id) ? e : []
      }),
    )
    const faltando = CURRICULO_AZUL.itens.filter(
      (i) => i.ativo && !nosGrupos.has(i.id) && !gemeos.has(i.id),
    )
    expect(faltando.map((i) => `${i.nome || i.slot} (${i.posicao})`)).toEqual([])
  })
})

describe('a deduplicacao remove 17 dos 21 equivalentes', () => {
  it('os 12 gemeos UM PARA UM saem do catalogo', () => {
    const noCatalogo = new Set(itensDe('catalogo').map((i) => i.id))
    // "Double leg" <-> "Baiana": duas linhas para a mesma tecnica e ruido, e foi
    // isso que pos "Levantada tecnica" duas vezes na aula 02 do programa real.
    expect(noCatalogo.has('quedas--baiana')).toBe(false)
    expect(noCatalogo.has('quedas--single-leg')).toBe(false)
    expect(noCatalogo.has('base-movimentacao--levantada-tecnica')).toBe(false)
    expect(noCatalogo.has('guarda-fechada--armlock')).toBe(false)
  })

  it('UM MOVIMENTO SO tambem sai: os tres ukemi e os dois rolamentos', () => {
    /**
     * Decisao dele: "pode unificar ukemi em uma coisa so". A prova de azul lista
     * "UKEMI - Frente/ costas/ lateral" separados, mas para PROGRAMAR uma aula
     * sao tres direcoes do mesmo movimento — e o bolsao mostrava quatro entradas
     * para o que ele chama de uma.
     *
     * Rolamentos entra pelo mesmo argumento, e o proprio nome do requisito ja
     * dizia: "Rolamentos (frente e costas)".
     */
    const noCatalogo = new Set(itensDe('catalogo').map((i) => i.id))
    for (const id of [
      'base-movimentacao--ukemi-frente',
      'base-movimentacao--ukemi-costas',
      'base-movimentacao--ukemi-lateral',
      'base-movimentacao--rolamento-para-frente',
      'base-movimentacao--rolamento-para-tras',
    ]) {
      expect(noCatalogo.has(id), `${id} deveria ter sido absorvido`).toBe(false)
    }
  })

  it('AS DUAS SAIDAS FICAM DIVIDIDAS — sao tecnicas diferentes, nao direcoes', () => {
    /**
     * A LINHA QUE SEPARA limpar ruido de apagar conteudo. "Saida da montada"
     * corresponde a "Upa / ponte" e "Cotovelo / reposicao de guarda": duas fugas
     * diferentes, e nao duas direcoes de uma. Unifica-las faria o professor
     * substituto ler "Saida da montada" na aula e nao saber qual dar.
     *
     * Se um dia ele decidir que tambem sao uma coisa so, e uma linha em
     * `UM_MOVIMENTO_SO` — e este teste quebra dizendo exatamente isso.
     */
    const noCatalogo = new Set(itensDe('catalogo').map((i) => i.id))
    for (const id of [
      'saidas--saida-da-montada-1',
      'saidas--saida-da-montada-2',
      'saidas--saida-dos-100-kg-1',
      'saidas--saida-dos-100-kg-2',
    ]) {
      expect(noCatalogo.has(id), `${id} deveria ficar no catalogo`).toBe(true)
    }
  })

  it('os totais: 29 requisitos e 64 no catalogo, sem uma linha repetida', () => {
    /**
     * NUMEROS CRAVADOS DE PROPOSITO. Se alguem afrouxar a deduplicacao, o bolsao
     * volta a oferecer a mesma tecnica duas vezes; se apertar, o catalogo perde
     * conteudo de ensino. Os dois lados quebram este teste, e ele diz qual.
     */
    expect(secao('requisitos').total).toBe(29)
    expect(secao('catalogo').total).toBe(64)

    const todos = [...itensDe('requisitos'), ...itensDe('catalogo')]
    expect(todos).toHaveLength(93)
    expect(new Set(todos.map((i) => i.id)).size).toBe(93)
  })
})

describe('o agrupamento de cada secao segue a fonte certa', () => {
  it('requisitos seguem A ORDEM DO PROFESSOR, e nao a do seed', () => {
    /**
     * A mesma ordem da folha do atestado e da matriz de acompanhamento. Se o
     * bolsao usasse a ordem em que os itens aparecem no array, o professor
     * procuraria "Finalizacoes" onde ela nao esta — em tres telas diferentes,
     * cada uma com uma ordem.
     */
    expect(secao('requisitos').grupos.map((g) => g.id)).toEqual([
      'g1-quedas',
      'g1-guarda-fechada',
      'g1-educativos',
      'g1-dominio',
      'g1-finalizacoes',
      'g1-saidas',
    ])
  })

  it('o grupo leva o NOME que o professor escreveu', () => {
    const nomes = secao('requisitos').grupos.map((g) => g.nome)
    expect(nomes).toContain('Posição individual')
    expect(nomes).toContain('Finalizações')
  })

  it('o catalogo segue a ordem dos BLOCOS da taxonomia', () => {
    const ids = secao('catalogo').grupos.map((g) => g.id)
    expect(ids[0]).toBe('fundamentos')
    expect(ids).toContain('defesa-pessoal')
    // Nenhum grupo `posicao:` — todo item ativo de azul cai num bloco conhecido.
    expect(ids.filter((i) => i.startsWith('posicao:'))).toEqual([])
  })
})

describe('o nome de azul vira alias do requisito', () => {
  it('buscar "baiana" acha o "Double leg" do 1o grau', () => {
    /**
     * Sem o alias, tirar `quedas--baiana` do catalogo tiraria a palavra "baiana"
     * do bolsao inteiro — e o professor pode procurar por ela, que e o nome
     * brasileiro da tecnica. A busca do Planner filtra por nome, slot e posicao;
     * os aliases entram para os dois vocabularios serem achaveis.
     */
    const doubleLeg = itensDe('requisitos').find((i) => i.id === 'g1-quedas--double-leg')!
    expect(doubleLeg.aliases).toContain('Baiana')
  })

  it('alias NAO repete o proprio nome', () => {
    // "Levantada tecnica" se chama igual nos dois lados; um alias identico ao
    // nome seria uma linha de ruido em cada busca.
    const levantada = itensDe('requisitos').find((i) => i.id === 'g1-edu--levantada-tecnica')!
    expect(levantada.aliases).toEqual([])
  })

  it('o UNIFICADO ganha os tres nomes como alias', () => {
    /**
     * Os tres ukemi sairam do catalogo, entao "ukemi lateral" sumiria do bolsao
     * inteiro sem isto — e o professor pode procurar por ela.
     */
    const ukemi = itensDe('requisitos').find((i) => i.id === 'g1-edu--ukemi')!
    expect(ukemi.aliases).toEqual(['Ukemi frente', 'Ukemi costas', 'Ukemi lateral'])
  })

  it('requisito que FICA dividido nao ganha alias — os gemeos seguem no catalogo', () => {
    const saida = itensDe('requisitos').find((i) => i.id === 'g1-saida--montada')!
    expect(saida.aliases).toEqual([])
  })

  it('NAO MUTA O SEED, e isso protege a folha e a matriz', () => {
    /**
     * Acrescentar alias no objeto original mudaria o que a folha do atestado e a
     * matriz mostram — efeito colateral a distancia, do tipo que ninguem procura
     * quando a folha comeca a exibir "Baiana".
     */
    const noSeed = ITENS_1GRAU.find((i) => i.id === 'g1-quedas--double-leg')!
    expect(noSeed.aliases).toEqual([])
  })
})

describe('bordas', () => {
  it('sem requisitos, a secao vem vazia e o catalogo inteiro', () => {
    const s = bolsaoEmSecoes({
      requisitos: [],
      modulosDosRequisitos: [],
      catalogo: CURRICULO_AZUL.itens,
      equivalentes: equivalentesDe,
    })
    expect(s.find((x) => x.id === 'requisitos')!.total).toBe(0)
    expect(s.find((x) => x.id === 'catalogo')!.total).toBe(81)
  })

  it('SEM tabela de equivalencia, nada e removido do catalogo', () => {
    // O caso de uma turma cujo curriculo nao tem equivalencia mapeada: as duas
    // secoes convivem inteiras, com as duplicatas visiveis. Pior que dedup, e
    // melhor que perder item.
    const s = bolsaoEmSecoes({
      requisitos: ITENS_1GRAU,
      modulosDosRequisitos: MODULOS_1GRAU,
      catalogo: CURRICULO_AZUL.itens,
      equivalentes: () => [],
      umMovimentoSo: ehUmMovimentoSo,
    })
    expect(s.find((x) => x.id === 'catalogo')!.total).toBe(81)
    expect(s.find((x) => x.id === 'requisitos')!.total).toBe(29)
  })

  it('as duas secoes sempre existem, mesmo vazias', () => {
    // A tela renderiza cabecalho por secao; uma secao ausente faria o JSX ter de
    // adivinhar qual das duas veio.
    const s = bolsaoEmSecoes({
      requisitos: [],
      modulosDosRequisitos: [],
      catalogo: [],
      equivalentes: () => [],
    })
    expect(s.map((x) => x.id)).toEqual(['requisitos', 'catalogo'])
  })
})

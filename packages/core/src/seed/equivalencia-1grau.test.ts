import { describe, expect, it } from 'vitest'
import { EQUIVALENTES_DO_1GRAU, equivalentesDe } from './equivalencia-1grau'
import { ITENS_1GRAU } from './primeiro-grau'
import { CURRICULO_AZUL } from './curriculos'

const do1grau = new Set(ITENS_1GRAU.map((i) => i.id))
const doAzul = new Set(CURRICULO_AZUL.itens.map((i) => i.id))

describe('a tabela de equivalencia aponta para itens que EXISTEM', () => {
  /**
   * ESTE E O TESTE QUE JUSTIFICA O ARQUIVO TER TESTE.
   *
   * Um id digitado errado — `guarda-fechada--raspada1` sem o hifen, um item de
   * azul renomeado — nao da erro em lugar nenhum: o requisito simplesmente nunca
   * se satisfaz, e a matriz mostra "fora do programa" para sempre. O professor
   * leria isso como "esqueci de programar", programaria de novo, e continuaria
   * fora. Silencioso e permanente e a pior combinacao.
   */
  it('toda CHAVE e um requisito real do 1o grau', () => {
    for (const chave of Object.keys(EQUIVALENTES_DO_1GRAU)) {
      expect(do1grau.has(chave), `chave inexistente: ${chave}`).toBe(true)
    }
  })

  it('todo VALOR e um item real do curriculo de azul', () => {
    for (const [chave, ids] of Object.entries(EQUIVALENTES_DO_1GRAU)) {
      for (const id of ids) {
        expect(doAzul.has(id), `${chave} aponta para item inexistente: ${id}`).toBe(true)
      }
    }
  })

  it('nenhuma lista e VAZIA — ausente e vazio diriam a mesma coisa de formas diferentes', () => {
    for (const [chave, ids] of Object.entries(EQUIVALENTES_DO_1GRAU)) {
      expect(ids.length, `${chave} com lista vazia: remova a chave`).toBeGreaterThan(0)
    }
  })

  it('nenhum equivalente repetido dentro do mesmo requisito', () => {
    // Com a regra "todos os equivalentes", um id repetido nao muda o resultado —
    // mas conta duas vezes no parcial ("2 de 3" quando sao 2 itens distintos).
    for (const [chave, ids] of Object.entries(EQUIVALENTES_DO_1GRAU)) {
      expect(new Set(ids).size, `${chave} tem equivalente repetido`).toBe(ids.length)
    }
  })

  it('os dois universos continuam DISJUNTOS — se um dia se cruzarem, a tabela sobra', () => {
    /**
     * A tabela existe porque nenhum id e compartilhado. Se alguem fundir os
     * curriculos e este teste falhar, a leitura em `acompanhamento` passa a ter
     * dois caminhos para a mesma coisa — e o certo e apagar a tabela, nao
     * contornar.
     */
    const cruzam = [...do1grau].filter((id) => doAzul.has(id))
    expect(cruzam).toEqual([])
  })
})

describe('equivalentesDe', () => {
  it('devolve os tres ukemi — a decisao do professor foi "todos"', () => {
    expect(equivalentesDe('g1-edu--ukemi')).toEqual([
      'base-movimentacao--ukemi-frente',
      'base-movimentacao--ukemi-costas',
      'base-movimentacao--ukemi-lateral',
    ])
  })

  it('requisito sem equivalente devolve lista vazia, e nao undefined', () => {
    // `g1-dom--montada`: o azul nao enumera dominio de posicao. Um `undefined`
    // aqui obrigaria cada chamador a lembrar do `?? []`, e o que esquecer quebra.
    expect(equivalentesDe('g1-dom--montada')).toEqual([])
    expect(equivalentesDe('id-que-nao-existe')).toEqual([])
  })

  it('a rolagem de "Rolamentos (frente e costas)" sao os DOIS rolamentos', () => {
    // O caso que apareceu em producao: a aula 1 da RGI deu os dois, e a matriz
    // mostrava o requisito como "fora do programa".
    expect(equivalentesDe('g1-edu--rolamentos')).toHaveLength(2)
  })
})

describe('quanto da sobreposicao a tabela cobre', () => {
  it('15 E 14 — os numeros do documento do professor', () => {
    /**
     * NUMEROS CRAVADOS DE PROPOSITO, e agora eles vem de uma FONTE e nao do meu
     * julgamento item a item. O `curriculo-compilado.md` do estudo dele lista 94
     * tecnicas: 80 de azul mais 14 exclusivas do 1o grau. Dos 29 requisitos, 15
     * existem em azul e 14 nao.
     *
     * A tabela ja esteve em 16/13, montada por mim com quatro duvidas em aberto.
     * Em 12/09 ele decidiu que o documento vence, e cinco entradas mudaram.
     * Se alguem afrouxar ou apertar a tabela, este teste quebra dizendo em qual
     * direcao ela saiu do documento.
     */
    const cobertos = ITENS_1GRAU.filter((i) => equivalentesDe(i.id).length > 0)
    expect(cobertos).toHaveLength(15)
    expect(ITENS_1GRAU.length - cobertos.length).toBe(14)
  })

  it('19 ITENS DE AZUL levam a marca `[1o]`, e colapsam em 15 requisitos', () => {
    /**
     * A outra metade da aritmetica do documento, e ela e o que prova que 15 e o
     * numero certo: 19 marcas `[Azul, 1o]` viram 15 requisitos porque Ukemi vale
     * 3, Rolamentos 2 e Fuga de quadril 2. 19 - 4 = 15.
     *
     * Contar so os requisitos esconderia um erro de granularidade; contar os dois
     * lados nao.
     */
    const doLadoDeAzul = new Set(ITENS_1GRAU.flatMap((i) => equivalentesDe(i.id)))
    expect(doLadoDeAzul.size).toBe(19)
  })

  it('OS 14 SEM EQUIVALENTE sao os 14 "[Manual]" do curriculo do 1o grau', () => {
    /**
     * A REGRA POR TRAS DOS DOIS DOCUMENTOS, e ela e o achado do estudo:
     *
     *     existe em azul  -> [Auto]    o aluno estuda por cartao, o app mede
     *     nao existe      -> [Manual]  nao ha cartao, so o professor pode dizer
     *
     * `curriculo-1grau.md` marca 15 [Auto] e 14 [Manual], e os 14 [Manual] sao
     * exatamente estes. Isso torna `manual` DERIVAVEL desta tabela em vez de um
     * campo guardado — um campo divergiria da regra no primeiro item que alguem
     * acrescentasse.
     *
     * A lista abaixo esta na ordem do documento (itens 81 a 94 do compilado).
     */
    const semEquivalente = ITENS_1GRAU.filter((i) => equivalentesDe(i.id).length === 0).map(
      (i) => i.nome,
    )
    expect(new Set(semEquivalente)).toEqual(
      new Set([
        '100 kg lateral',
        '100 kg norte-sul',
        'Montada',
        'Domínio de costas com gancho',
        'Double leg',
        'Passagem emborcando',
        'Raspagem tripé',
        'Estrangulamento cruzado', // dos 100 kg e da montada, mesmo nome
        'Americana', // dos 100 kg e da montada
        'Estrangulamento de lapela',
        'Mata-leão',
        'Armlock', // da montada
      ]),
    )
    expect(semEquivalente).toHaveLength(14)
  })

  it('AS QUATRO DUVIDAS FORAM RESOLVIDAS pelo documento, e nao por mim', () => {
    /**
     * Eu havia deixado quatro casos fora por nao saber se a tecnica era a mesma.
     * O compilado responde os quatro, e em direcoes diferentes — o que e a melhor
     * evidencia de que ele nao foi escrito para confirmar o que eu tinha feito.
     */
    // ENTROU: "Ida para as costas a partir da raspagem pendulo" e a esgrimada.
    // Eu perguntei em 09/09 e ele respondeu "nao sao a mesma"; o compilado marca
    // #39 como `[Azul, 1o]`, e em 12/09 ele decidiu que o documento vence.
    expect(equivalentesDe('g1-gf--costas-do-pendulo')).toEqual([
      'guarda-fechada--esgrima-com-ida-para-as-costas',
    ])

    // FICARAM FORA, agora por afirmacao dele e nao por duvida minha: os tres sao
    // exclusivos do 1o grau no compilado (#86, #90, #91).
    for (const id of [
      'g1-gf--passagem-emborcando',
      'g1-fin-costas--mata-leao',
      'g1-fin-costas--lapela',
    ]) {
      expect(do1grau.has(id), `${id} nao existe mais: reveja a tabela`).toBe(true)
      expect(equivalentesDe(id)).toEqual([])
    }
  })

  it('as cinco correcoes de 12/09 estao na tabela', () => {
    /**
     * Uma asercao por mudanca, para que reverter qualquer uma quebre aqui com o
     * nome do caso. Duas corrigem respostas VERBAIS dele; tres corrigem decisoes
     * minhas.
     */
    // 1. Fuga de quadril: as duas (ele dissera "so a tradicional").
    expect(equivalentesDe('g1-edu--fuga-de-quadril')).toHaveLength(2)
    // 2. Ida as costas: mapeada (ele dissera "nao sao a mesma").
    expect(equivalentesDe('g1-gf--costas-do-pendulo')).toHaveLength(1)
    // 3. Double leg: exclusivo (eu mapeara para a Baiana).
    expect(equivalentesDe('g1-quedas--double-leg')).toEqual([])
    // 4. Raspagem tripe: exclusiva (eu mapeara para a raspada 1 da aberta).
    expect(equivalentesDe('g1-gf--raspagem-tripe')).toEqual([])
    // 5. Saidas: so a variacao "1" (eu exigia as duas).
    expect(equivalentesDe('g1-saida--montada')).toEqual(['saidas--saida-da-montada-1'])
    expect(equivalentesDe('g1-saida--100kg')).toEqual(['saidas--saida-dos-100-kg-1'])
  })
})

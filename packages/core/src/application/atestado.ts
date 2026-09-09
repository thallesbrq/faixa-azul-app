/**
 * A folha de atestacao de uma graduacao.
 *
 * O FORMATO E O QUE O PROFESSOR MANDOU, e nao um agrupamento nosso: Quedas,
 * Guarda fechada, Educativos, Posicao individual, Finalizacoes, Saidas. A ordem
 * e os titulos vem dos MODULOS do curriculo, que foram escritos com as palavras
 * dele (ver seed/primeiro-grau). Reagrupar por conta propria criaria uma segunda
 * linguagem — o erro que `taxonomia.ts` registra.
 *
 * DOIS REQUISITOS INDEPENDENTES, e a tela nao pode fundi-los:
 *   1. as 29 competencias atestadas por ele
 *   2. as 35 aulas cumpridas
 *
 * O segundo depende da fatia 3 do ADR-016 (programa da turma + presenca). Ate
 * ela existir, `aulasCumpridas` chega `null` — que NAO e zero: e "o app nao
 * conta isso ainda, confira voce". Tratar como zero faria a folha dizer que
 * faltam 35 aulas a um aluno que talvez tenha 40.
 *
 * ---------------------------------------------------------------------------
 * O BOOLEANO "APTO AO GRAU" PASSOU A EXISTIR — 09/09/2026, decisao do professor.
 *
 * Ate aqui este arquivo dizia: "nao existe um booleano unico 'apto ao grau' aqui
 * de proposito — quem junta os dois requisitos e o professor, porque um deles o
 * sistema ainda nao sabe". Duas coisas mudaram e o argumento caiu:
 *
 *   1. PRESENCA FOI DESCARTADA ("nao vamos nos preocupar com a presenca agora, o
 *      sistema que temos de validar se o aluno tem a competencia ja resolve").
 *      Sem presenca, "35 aulas cumpridas" nunca sera calculavel por aluno, e o
 *      `null` deixou de ser "ainda nao" para virar "nunca".
 *   2. AS AULAS NAO SAO CONDICAO, e ele disse isso antes: "pode acontecer de um
 *      aluno se destacar e conseguir estar apto ao grau antes do tempo, mas nao
 *      e regra, e algo esporadico". Um aluno pode estar apto com 20 aulas.
 *
 * Entao a aptidao ao GRAU e sobre as competencias atestadas, e a contagem de
 * aulas da turma e CONTEXTO ao lado — nao portao.
 * ---------------------------------------------------------------------------
 *
 * Modulo puro: sem React, sem I/O, `agora` injetado onde precisa.
 */

import type { TechniqueItem, Modulo } from '../domain/types'
import type { RegistroDeCompetencia } from '../domain/competencia'
import { historicoDoItem, itensCompetentes } from '../domain/competencia'
import { aulasExigidas } from '../domain/metas'
import type { Curriculo } from '../domain/curriculo'

export interface LinhaDoAtestado {
  item: TechniqueItem
  /** Atestado hoje. Retirado conta como `false`, mesmo tendo sido atestado antes. */
  competente: boolean
  /** A atestacao (ou retirada) mais recente, para a tela mostrar quem e quando. */
  ultimo: RegistroDeCompetencia | null
  /** Quantas vezes este item foi atestado ou retirado. `> 1` merece um olhar. */
  vezes: number
}

export interface GrupoDoAtestado {
  moduloId: string
  /** O titulo que o professor escreveu. */
  nome: string
  linhas: LinhaDoAtestado[]
  atestados: number
  total: number
}

/**
 * Aptidao ao GRAU. Quatro estados, e nao um booleano, porque "nao apto" tem
 * causas que a tela precisa dizer de formas diferentes.
 *
 * `nao-se-aplica` E O ESTADO QUE PROTEGE A PALAVRA. Ele cobre o curriculo medido
 * por CARTOES — o azul — e a razao e a regra do professor: dominio de cartao nao
 * e o mesmo que validado, que nao e o mesmo que funciona sob resistencia. Um
 * "apto" derivado de o app achar que o aluno lembra de 81 coisas seria a mesma
 * palavra afirmando uma coisa muito mais fraca que "o professor viu ele executar
 * os 29". Ver a ressalva 3 no cabecalho de `aptidaoAoGrau`.
 */
export type Aptidao =
  /** Todos os itens do curriculo estao atestados pelo professor. */
  | 'apto'
  /** Curriculo de atestado, e falta atestar algum item. */
  | 'faltam-competencias'
  /**
   * A pergunta nao cabe: sem curriculo, curriculo vazio, ou medido por cartoes.
   * NAO e "nao apto" — e "esta nao e a medida deste aluno".
   */
  | 'nao-se-aplica'
  /** Curriculo de atestado, mas nao conseguimos LER as atestacoes. */
  | 'nao-lido'

/**
 * O aluno esta apto ao grau que persegue?
 *
 * FUNCAO UNICA E EXPORTADA porque tres telas responderao a mesma pergunta: a
 * folha do atestado, a linha da tabela da Central e (um dia) o app do aluno. A
 * regra ja esteve escrita duas vezes como ternario em JSX neste projeto, e as
 * duas vezes ficou errada — ver `curriculoParaAtestar`.
 *
 * ---------------------------------------------------------------------------
 * PENSADO PARA GENERALIZAR, porque a pergunta dele foi exatamente essa: "no
 * futuro podemos usar essa mesma logica para graus em outras faixas e ate troca
 * de faixa?". Sim, com tres ressalvas que estao codificadas aqui:
 *
 *   1. O DENOMINADOR SAI DO CURRICULO, nunca do numero 29. Um `=== 29` em
 *      qualquer lugar quebraria no 2o grau em silencio — o 2o, 3o e 4o tem 45
 *      aulas cada e listas que ainda nao chegaram (ver `domain/metas`).
 *      Acrescentar o 2o grau e acrescentar a lista e virar `temCurriculo: true`;
 *      esta funcao nao muda.
 *
 *   2. A MEDIDA DECIDE SE A PALAVRA CABE, e por isso `medida !== 'atestado'` cai
 *      em `nao-se-aplica`. Grau e assinatura do professor; azul e contagem de
 *      cartao do app.
 *
 *   3. TROCA DE FAIXA NAO E GRAU, e por isso o azul nunca sera `apto` por aqui.
 *      A prova de faixa tem banca, data, teoria escrita, juramento e pontuacao —
 *      "deve ser impressa pelo aluno, respondida e entregue ao professor" (folha
 *      da prova de roxa, 07/09/2026). O grau e o julgamento do professor; a
 *      faixa e um exame. O conceito util para faixa e "apto a FAZER a prova", que
 *      e outra pergunta e merece outra funcao no dia em que existir. `domain/
 *      metas` ja registra metade disso: `aulasExigidas: null` para o azul,
 *      porque "a prova de azul e a prova, e nao tem contagem de aulas".
 * ---------------------------------------------------------------------------
 */
export function aptidaoAoGrau({
  curriculo,
  competentes,
}: {
  /** O curriculo que o aluno ESTUDA. `null` quando nao existe lista. */
  curriculo: Pick<Curriculo, 'itens' | 'medida'> | null
  /**
   * Quantos itens o professor atestou. `null` = NAO CONSEGUIMOS LER.
   *
   * Zero e um numero e nao e ausencia: e o primeiro dia de todo aluno. Tratar
   * falha de leitura como zero diria "faltam 29" a quem talvez tenha os 29.
   */
  competentes: number | null
}): Aptidao {
  if (curriculo === null) return 'nao-se-aplica'
  if (curriculo.medida !== 'atestado') return 'nao-se-aplica'

  const total = curriculo.itens.filter((i) => i.ativo).length
  // Curriculo vazio NAO esta apto: seria aptidao por nao haver exigencia.
  if (total === 0) return 'nao-se-aplica'

  if (competentes === null) return 'nao-lido'
  return competentes >= total ? 'apto' : 'faltam-competencias'
}

export interface Atestado {
  grupos: GrupoDoAtestado[]
  atestados: number
  total: number
  /** 0 a 1 — o progresso de uma meta medida por atestado. */
  progresso: number
  /**
   * Apto ao grau, pela regra unica de `aptidaoAoGrau`.
   *
   * SUBSTITUIU `competenciasCompletas`, que era o fato cru (`atestados ===
   * total`). Manter os dois faria a folha e a tabela poderem discordar: para o
   * 1o grau eles coincidem, e para qualquer curriculo de cartoes nao — e a
   * segunda tela a nascer usaria o que estivesse mais a mao.
   */
  aptidao: Aptidao
  /** Itens que faltam atestar, na ordem da folha. */
  faltando: TechniqueItem[]
  /**
   * Aulas exigidas pela meta, e quantas o sistema conseguiu contar.
   *
   * `cumpridas: null` significa "o app nao conta isso ainda" — e nao zero.
   */
  aulas: { exigidas: number | null; cumpridas: number | null }
}

export function montarAtestado({
  curriculo,
  modulos,
  registros,
  meta,
  aulasCumpridas,
}: {
  curriculo: Curriculo
  /** Os modulos DO CURRICULO, para os titulos e a ordem serem os dele. */
  modulos: readonly Modulo[]
  registros: readonly RegistroDeCompetencia[]
  meta: string
  /** `null` enquanto a contagem de aulas nao existir (fatia 3). */
  aulasCumpridas: number | null
}): Atestado {
  const competentes = itensCompetentes(registros)
  const ativos = curriculo.itens.filter((i) => i.ativo)

  const linhaDe = (item: TechniqueItem): LinhaDoAtestado => {
    const historico = historicoDoItem(item.id, registros)
    return {
      item,
      competente: competentes.has(item.id),
      ultimo: historico.length > 0 ? historico[historico.length - 1] : null,
      vezes: historico.length,
    }
  }

  // A ORDEM VEM DE `modulos`, e nao da ordem dos itens no seed: a folha e um
  // documento da academia, e a sequencia dos titulos e parte do formato.
  const grupos: GrupoDoAtestado[] = [...modulos]
    .sort((a, b) => a.ordem - b.ordem)
    .map((m) => {
      const linhas = ativos.filter((i) => i.moduloId === m.id).map(linhaDe)
      return {
        moduloId: m.id,
        nome: m.nome,
        linhas,
        atestados: linhas.filter((l) => l.competente).length,
        total: linhas.length,
      }
    })
    // Modulo sem item ativo nao vira secao vazia na folha.
    .filter((g) => g.total > 0)

  const total = ativos.length
  const atestados = ativos.filter((i) => competentes.has(i.id)).length

  return {
    grupos,
    atestados,
    total,
    // Curriculo vazio devolve 0 e nao NaN: dividir por zero aqui poria "NaN%" na
    // tela de um professor.
    progresso: total === 0 ? 0 : atestados / total,
    /**
     * `competentes: atestados` E NAO `competentes.size`, e a diferenca aparece
     * num caso real: `competentes` e o Set de TODOS os itens atestados, inclusive
     * de item que saiu do curriculo ou de outro curriculo. `atestados` conta so
     * os itens ATIVOS desta folha. Passar o Set inteiro deixaria alguem apto por
     * atestacao de item que a folha nao mostra.
     */
    aptidao: aptidaoAoGrau({ curriculo, competentes: atestados }),
    faltando: grupos.flatMap((g) => g.linhas.filter((l) => !l.competente).map((l) => l.item)),
    aulas: { exigidas: aulasExigidas(meta), cumpridas: aulasCumpridas },
  }
}

/**
 * Falta quanto para as aulas — `null` quando o sistema nao sabe contar.
 *
 * Existe como funcao propria para a tela nao fazer essa subtracao no meio do
 * JSX: `35 - null` daria `35`, e a folha diria que faltam 35 aulas a quem
 * talvez tenha 40. `null` tem de sobreviver ao calculo.
 */
export function aulasFaltando(aulas: Atestado['aulas']): number | null {
  if (aulas.exigidas === null) return null
  if (aulas.cumpridas === null) return null
  return Math.max(0, aulas.exigidas - aulas.cumpridas)
}

// ---------------------------------------------------------------------------
// Qual lista a folha do atestado usa
// ---------------------------------------------------------------------------

export interface EscolhaDoCurriculo {
  /** O id da lista escolhida: 'azul', '1grau', ... */
  id: string
  curriculo: Curriculo
  /**
   * `'prova'`: a lista da META. Atestar tudo FECHA o gate do grau.
   * `'estudo'`: a lista da meta nao chegou, e esta e a do que ele TREINA.
   *   Atestar registra o que o professor viu e nao fecha grau nenhum.
   */
  origem: 'prova' | 'estudo'
}

/**
 * A lista que a folha do atestado mostra — DUAS TENTATIVAS, nesta ordem.
 *
 * ESTA REGRA JA ERROU DUAS VEZES NA TELA, e por isso ela mora aqui e nao num
 * ternario dentro do JSX:
 *
 *   1a versao: `medidaDoProgresso(meta) === 'atestado'`
 *   2a versao: `curriculoPorId(estuda)?.medida === 'atestado'`
 *
 * A segunda trancou fora exatamente o caso que motivou `meta` e `estuda` se
 * separarem: quem persegue um grau ESTUDANDO o curriculo de azul nunca podia ser
 * atestado. Era o Floki, e era o desenvolvedor.
 *
 * O QUE ESTAVA CONFUNDIDO: "atestar" e "medir progresso" tratados como a mesma
 * decisao. Nao sao.
 *   - ATESTAR e o professor registrando o que VIU. Vale para qualquer item que o
 *     aluno treina, e nao depende de medida nenhuma.
 *   - `medida` decide qual numero vai na coluna Progresso.
 *   - o GATE do grau usa a lista da PROVA, quando ela existe.
 *
 * Dai a ordem: a prova primeiro, porque e contra ela que o grau fecha; o estudo
 * como reserva, porque registrar o que se viu vale mesmo sem a lista da prova.
 *
 * `null` NAO E LACUNA A CORRIGIR: e "nao ha o que atestar" — meta e estudo sem
 * lista. A folha nao aparece, e e o certo.
 */
export function curriculoParaAtestar({
  meta,
  estuda,
  curriculoPorId,
}: {
  meta: string
  estuda: string
  curriculoPorId: (id: string) => Curriculo | null
}): EscolhaDoCurriculo | null {
  const daProva = curriculoPorId(meta)
  if (daProva) return { id: meta, curriculo: daProva, origem: 'prova' }

  const doEstudo = curriculoPorId(estuda)
  if (doEstudo) return { id: estuda, curriculo: doEstudo, origem: 'estudo' }

  return null
}

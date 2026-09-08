/**
 * Meta do aluno — a proxima graduacao que ele persegue.
 *
 * A META E DO ALUNO, NAO DA TURMA (ADR-016, decisao 3), e a razao e concreta: o
 * 1o grau vem antes do azul na progressao. Um faixa branca novo persegue o 1o
 * grau; quem tem tres graus persegue o azul — e OS DOIS CABEM NA MESMA TURMA de
 * iniciantes, porque turma e quem treina no mesmo horario. Se o curriculo fosse
 * propriedade da turma, um dos dois seria medido contra a prova errada.
 *
 * CAMPO E TEXTO LIVRE, LISTA E CONSTANTE — mesma assimetria de `turmas`, e pelo
 * mesmo motivo: o dado guardado no Firestore nao pode ser validado por
 * TypeScript, entao fechar a uniao daria falsa seguranca. A lista abaixo e o que
 * a interface OFERECE.
 *
 * `temCurriculo: false` NAO E LACUNA A CORRIGIR DEPOIS — e o estado honesto de
 * hoje. Existem dois curriculos (1o grau e azul); as listas do 2o, 3o e 4o nao
 * chegaram. Aluno com meta sem curriculo mostra `—` com o motivo escrito, e nao
 * um numero inventado. Ver ADR-015, decisao 6, que criou esse tratamento.
 */

/** Meta sem definir. Todo cadastro anterior a este campo esta nela. */
export const SEM_META = ''

export const ROTULO_SEM_META = 'Sem meta definida'

export interface Meta {
  id: string
  nome: string
  /** Uma linha para a tela: o que essa meta exige. */
  descricao: string
  /**
   * Ha curriculo para medir progresso nesta meta?
   *
   * Conservador quando nao: medir alguem contra um curriculo que nao e o dele
   * produz numero errado com aparencia de certo, e um `—` visivel e melhor.
   */
  temCurriculo: boolean
  /**
   * Aulas exigidas pela regra da graduacao, quando ha.
   *
   * `null` para o azul: a prova de azul e a prova, e nao tem contagem de aulas.
   *
   * NAO CONFUNDIR com `TOTAL_DE_AULAS` (montagem), que e o tamanho do pacote de
   * particulares — coisa contratada, nao exigida por graduacao nenhuma. Sao dois
   * numeros diferentes que por acaso falam de aulas.
   */
  aulasExigidas: number | null
}

/**
 * AS 45 AULAS DO 2o, 3o E 4o GRAU (ADR-017, decisao 9).
 *
 * Sao 35 aulas para o 1o grau e 45 para cada um dos seguintes — 80 no total ate
 * o 4o grau, que e o tamanho do planner.
 *
 * DUAS AUSENCIAS DIFERENTES CONVIVEM AQUI, e nao colapsam numa: `aulasExigidas`
 * e conhecido (45) e `temCurriculo` continua `false`, porque as LISTAS DE ITENS
 * do 2o, 3o e 4o nao chegaram. Saber quantas aulas nao e saber o que se cobra
 * nelas. O app mostra o numero de aulas e um `—` no progresso, cada um pelo que
 * e — em vez de esconder as duas coisas atras da mesma lacuna.
 */
const AULAS_POR_GRAU_SEGUINTE = 45

export const METAS: readonly Meta[] = [
  {
    id: '1grau',
    nome: '1º grau',
    descricao: '35 aulas e competência mínima em 29 itens',
    temCurriculo: true,
    aulasExigidas: 35,
  },
  {
    id: '2grau',
    nome: '2º grau',
    descricao: '45 aulas — lista de itens ainda não recebida',
    temCurriculo: false,
    aulasExigidas: AULAS_POR_GRAU_SEGUINTE,
  },
  {
    id: '3grau',
    nome: '3º grau',
    descricao: '45 aulas — lista de itens ainda não recebida',
    temCurriculo: false,
    aulasExigidas: AULAS_POR_GRAU_SEGUINTE,
  },
  {
    id: '4grau',
    nome: '4º grau',
    descricao: '45 aulas — lista de itens ainda não recebida',
    temCurriculo: false,
    aulasExigidas: AULAS_POR_GRAU_SEGUINTE,
  },
  {
    id: 'azul',
    nome: 'Faixa azul',
    descricao: 'exame de graduação — 81 itens do currículo da banca',
    temCurriculo: true,
    aulasExigidas: null,
  },
]

export function metaPorId(id: string): Meta | null {
  for (const m of METAS) if (m.id === id) return m
  return null
}

/**
 * Nome para exibir, inclusive de meta desconhecida.
 *
 * Devolve o proprio id quando nao reconhece — se o Firestore tem `roxa` e este
 * aparelho ainda nao a conhece, o professor precisa ver `roxa` para entender o
 * que esta olhando. Esconder atras de um erro transformaria uma versao velha do
 * app em dado perdido aparente.
 */
export function nomeDaMeta(id: string): string {
  if (id === SEM_META) return ROTULO_SEM_META
  return metaPorId(id)?.nome ?? id
}

/** Ha curriculo para medir esta meta? Desconhecida responde `false`. */
export function metaTemCurriculo(id: string): boolean {
  return metaPorId(id)?.temCurriculo ?? false
}

/**
 * `medidaDoProgresso` SAIU DAQUI (ADR-017, decisao 6).
 *
 * Ela dizia como medir o progresso de uma META. Passou a ser propriedade do
 * CURRICULO (`Curriculo.medida`), e a mudanca nao e arrumacao: a medida depende
 * de o curriculo ter passo a passo — sem `passos` o gerador so produz o cartao
 * de classificacao, e medir por cartoes daria zero eterno. Isso e fato do
 * curriculo, nao da prova.
 *
 * A separacao ficou visivel quando `meta` e `estuda` deixaram de ser o mesmo
 * campo: eu persigo o 3o grau e estudo o curriculo de azul. Com a medida presa a
 * meta, eu seria medido por atestado (medida do 3o grau) sobre um curriculo de
 * cartoes — a medida de uma prova aplicada ao conteudo de outra.
 */

/** Aulas exigidas pela graduacao, ou `null` quando a meta nao exige contagem. */
export function aulasExigidas(id: string): number | null {
  return metaPorId(id)?.aulasExigidas ?? null
}

/**
 * A meta seguinte, para quando o professor concede a graduacao.
 *
 * `null` no fim da fila (azul): o que vem depois do azul e outra faixa, e a
 * progressao de faixa nao e assunto deste modulo.
 */
export function metaSeguinte(id: string): string | null {
  const i = METAS.findIndex((m) => m.id === id)
  if (i < 0 || i === METAS.length - 1) return null
  return METAS[i + 1].id
}

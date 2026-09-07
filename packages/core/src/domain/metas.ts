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
  /**
   * COMO o progresso desta meta e medido — e as duas formas nao sao escolha de
   * estilo, sao consequencia do que existe.
   *
   * `cartoes`: dominio de cartoes de recuperacao, como o app sempre mediu.
   *   Exige passo a passo, porque sem `passos` o gerador so produz o cartao de
   *   classificacao (medido, nao suposto: ver o cabecalho de seed/primeiro-grau).
   *
   * `atestado`: quantas competências o PROFESSOR confirmou. E a medida do 1o
   *   grau porque a lista dele nao vem com passo a passo — e porque, para quem
   *   busca o grau, o numero que importa e o julgamento do professor, nao quantos
   *   cartoes o aluno acertou. Ver ADR-016, decisao 9.
   */
  medidaDoProgresso: 'cartoes' | 'atestado'
}

export const METAS: readonly Meta[] = [
  {
    id: '1grau',
    nome: '1º grau',
    descricao: '35 aulas e competência mínima em 29 itens',
    temCurriculo: true,
    aulasExigidas: 35,
    medidaDoProgresso: 'atestado',
  },
  {
    id: '2grau',
    nome: '2º grau',
    descricao: 'lista ainda não recebida',
    temCurriculo: false,
    aulasExigidas: null,
    medidaDoProgresso: 'atestado',
  },
  {
    id: '3grau',
    nome: '3º grau',
    descricao: 'lista ainda não recebida',
    temCurriculo: false,
    aulasExigidas: null,
    medidaDoProgresso: 'atestado',
  },
  {
    id: '4grau',
    nome: '4º grau',
    descricao: 'lista ainda não recebida',
    temCurriculo: false,
    aulasExigidas: null,
    medidaDoProgresso: 'atestado',
  },
  {
    id: 'azul',
    nome: 'Faixa azul',
    descricao: 'exame de graduação — 81 itens do currículo da banca',
    temCurriculo: true,
    aulasExigidas: null,
    medidaDoProgresso: 'cartoes',
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
 * Como o progresso desta meta e medido.
 *
 * Meta desconhecida responde `atestado`, e a escolha e conservadora: medir por
 * cartoes um curriculo que talvez nao tenha passo a passo produziria zeros
 * eternos com aparencia de desempenho.
 */
export function medidaDoProgresso(id: string): 'cartoes' | 'atestado' {
  return metaPorId(id)?.medidaDoProgresso ?? 'atestado'
}

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

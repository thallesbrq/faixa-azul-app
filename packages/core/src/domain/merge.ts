/**
 * Juncao de dois estados do mesmo aluno — o dele e o que chegou do professor.
 *
 * O PROBLEMA. Sem servidor nao da para impedir que os dois mexam ao mesmo
 * tempo (ver ./procedencia). Entao a juncao precisa ser segura, nao rara.
 *
 * A SORTE ESTRUTURAL: OS DOIS EDITAM COISAS DIFERENTES. O aluno estuda; o
 * professor programa e valida. A sobreposicao real e minuscula. Logo isto
 * quase nunca e um conflito — e uma UNIAO.
 *
 * TRES MECANISMOS, do mais forte para o mais fraco:
 *
 * 1. LOG EM VEZ DE ESTADO — conflito impossivel. `eventos`, `validacoes`,
 *    `sessoes` e `duvidas` registram o que ACONTECEU e sao imutaveis
 *    (ADR-010). Juntar log e uniao por id: nada se sobrescreve, nada se perde.
 *    Isto ja cobre a maior parte do volume.
 *
 * 2. DONO POR CAMPO — o dono vence, sem consultar relogio. Onde ha dono claro,
 *    a hora do aparelho e irrelevante, e a hora e a parte fragil do sistema.
 *
 * 3. DATA SO PARA DESEMPATE, e POR REGISTRO, nunca global. Esta e a armadilha
 *    que este modulo existe para evitar: com um unico "alterado em" para o
 *    estado inteiro, o arquivo mais novo vence INTEIRO. Se o professor montou a
 *    grade as 10h e o aluno estudou as 10h05, um desempate global joga fora a
 *    grade OU os cartoes — em silencio. Por registro, as duas alteracoes
 *    convivem, porque de fato nao se contradizem.
 *
 * POR QUE `revisoes` VAI PELA REGRA DE DONO E NAO E RECALCULADA. A tentacao e
 * dizer "o evento e append-only, entao recomputa a agenda a partir dele e nunca
 * ha conflito". Nao funciona aqui: `aplicarRevisao` depende de `diasAteProva`,
 * o horizonte NO MOMENTO da revisao, e `ReviewEvent` nao guarda o intervalo
 * resultante. Recomputar hoje usaria o horizonte de hoje e produziria uma
 * agenda diferente da que realmente aconteceu. Como so o aluno revisa, a regra
 * de dono resolve mais barato e sem reescrever historia.
 *
 * Modulo puro: sem React, sem I/O.
 */

import type { Marca, Origem } from './procedencia'
import { maisRecente } from './procedencia'

/** Registro de log: imutavel e identificado. Juntar e unir por id. */
interface ComId {
  id: string
}

/**
 * Une dois logs por id, preservando a ordem de chegada e sem duplicar.
 *
 * O primeiro a aparecer vence em caso de id repetido. Isso e deliberado: o
 * registro e imutavel por contrato, entao duas copias do mesmo id sao a MESMA
 * coisa, e escolher qualquer uma da no mesmo. Escolher a primeira torna a
 * operacao estavel — juntar duas vezes da o mesmo resultado.
 */
export function unirLogs<T extends ComId>(a: readonly T[], b: readonly T[]): T[] {
  const vistos = new Set<string>()
  const saida: T[] = []
  for (const item of [...a, ...b]) {
    if (vistos.has(item.id)) continue
    vistos.add(item.id)
    saida.push(item)
  }
  return saida
}

/**
 * Une colecoes cuja identidade nao e um campo `id` (aulas por numero, itens por
 * itemId), decidindo cada colisao pela regra de dono.
 */
export function unirPorChave<T>(
  a: readonly T[],
  b: readonly T[],
  chave: (t: T) => string,
  resolver: (local: T, recebido: T) => T,
): T[] {
  const porChave = new Map<string, T>()
  const ordem: string[] = []
  for (const item of a) {
    const k = chave(item)
    if (!porChave.has(k)) ordem.push(k)
    porChave.set(k, item)
  }
  for (const item of b) {
    const k = chave(item)
    const existente = porChave.get(k)
    if (existente === undefined) {
      ordem.push(k)
      porChave.set(k, item)
    } else {
      porChave.set(k, resolver(existente, item))
    }
  }
  return ordem.map((k) => porChave.get(k) as T)
}

/**
 * Qual das duas marcas vence, dado quem e o dono daquilo.
 *
 * Se um dos lados foi escrito pelo dono e o outro nao, o do dono vence — sem
 * olhar a hora. So quando OS DOIS vem do mesmo lado (ou nenhum e do dono) e que
 * a data desempata.
 */
export function marcaVencedora(local: Marca, recebido: Marca, dono: Origem): 'local' | 'recebido' {
  const localEhDono = local.alteradoPor === dono
  const recebidoEhDono = recebido.alteradoPor === dono
  if (localEhDono && !recebidoEhDono) return 'local'
  if (recebidoEhDono && !localEhDono) return 'recebido'
  return maisRecente(local, recebido) === local ? 'local' : 'recebido'
}

/** Escolhe entre duas versoes do mesmo registro de dono unico. */
export function escolherPorDono<T extends { marca: Marca }>(
  local: T,
  recebido: T,
  dono: Origem,
): T {
  return marcaVencedora(local.marca, recebido.marca, dono) === 'local' ? local : recebido
}

// ---------------------------------------------------------------------------
// Dono POR CAMPO
// ---------------------------------------------------------------------------

/** Marca de cada campo que pode ser alterado. */
export type Marcas<K extends string> = Partial<Record<K, Marca>>

/**
 * Junta dois registros cujos campos tem DONOS DIFERENTES.
 *
 * POR QUE ISTO PRECISA EXISTIR, e nao basta dono por registro: `AlteracaoAula`
 * tem tres campos e tres donos. `itemIds` e a grade, do professor;
 * `realizadaEm` e o aluno dizendo que a aula aconteceu; `notas` e a observacao
 * do professor sobre a aula.
 *
 * Com dono por registro, "o professor vence" apagaria o `realizadaEm` do aluno
 * TODA VEZ que ele mandasse a grade — em silencio, sempre, e o aluno veria as
 * aulas voltarem a "nao realizada" sem entender. Com dono por campo, a grade
 * dele e a marcacao dela convivem, porque de fato nao se contradizem.
 *
 * Campo sem marca do lado recebido nao mexe no local: dado antigo (anterior as
 * marcas) nunca sobrescreve dado novo por omissao.
 */
export function mesclarCampos<T extends object, K extends Extract<keyof T, string>>(
  local: T,
  recebido: T,
  donos: Record<K, Origem>,
  marcasLocais: Marcas<K> | undefined,
  marcasRecebidas: Marcas<K> | undefined,
): { valor: T; marcas: Marcas<K>; substituidos: K[] } {
  const valor = { ...local }
  const marcas: Marcas<K> = { ...marcasLocais }
  const substituidos: K[] = []

  for (const campo of Object.keys(donos) as K[]) {
    const ml = marcasLocais?.[campo]
    const mr = marcasRecebidas?.[campo]

    // Nada chegou sobre este campo: o local segue como esta.
    if (!mr) continue

    // Chegou marca e aqui nao havia: o recebido preenche.
    if (!ml) {
      valor[campo] = recebido[campo]
      marcas[campo] = mr
      substituidos.push(campo)
      continue
    }

    if (marcaVencedora(ml, mr, donos[campo]) === 'recebido') {
      valor[campo] = recebido[campo]
      marcas[campo] = mr
      substituidos.push(campo)
    }
  }

  return { valor, marcas, substituidos }
}

// ---------------------------------------------------------------------------
// Relatorio — o merge nunca acontece em silencio
// ---------------------------------------------------------------------------

/**
 * O que a juncao fez, para a tela poder contar.
 *
 * Existe porque juncao silenciosa e indistinguivel de perda de dado. O app ja
 * segue esta regra na importacao da grade, que diz o que vai substituir antes
 * de substituir.
 */
export interface RelatorioDeJuncao {
  /** Registros de log que chegaram e nao existiam aqui. */
  novos: Record<string, number>
  /** Registros que existiam nos dois e foram decididos pela regra de dono. */
  substituidos: Record<string, number>
  /**
   * Colisoes em que os DOIS lados vieram do mesmo autor com datas diferentes —
   * o unico caso em que a decisao dependeu do relogio, e portanto o unico que
   * merece ser mostrado a uma pessoa.
   */
  desempatadosPorData: number
}

export function relatorioVazio(): RelatorioDeJuncao {
  return { novos: {}, substituidos: {}, desempatadosPorData: 0 }
}

export function contar(alvo: Record<string, number>, chave: string, quanto = 1): void {
  alvo[chave] = (alvo[chave] ?? 0) + quanto
}

/** Houve alguma mudanca digna de aviso? */
export function houveMudanca(r: RelatorioDeJuncao): boolean {
  const soma = (o: Record<string, number>) => Object.values(o).reduce((s, n) => s + n, 0)
  return soma(r.novos) + soma(r.substituidos) > 0
}

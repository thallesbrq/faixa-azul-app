/**
 * Procedencia: quem alterou cada coisa, e quando.
 *
 * POR QUE ISTO EXISTE. A partir do momento em que o professor tem uma central e
 * programa as aulas, DOIS lados escrevem no mesmo estado. Sem servidor nao ha
 * como impedir que os dois mexam ao mesmo tempo — trava exige uma autoridade
 * unica, e nao existe nenhuma. Uma trava guardada dentro do proprio dado
 * trocado seria pior do que nenhuma: quando o arquivo chega no outro aparelho a
 * trava ja e passado, e ela mentiria com confianca.
 *
 * A SAIDA NAO E IMPEDIR, E TORNAR A JUNCAO SEGURA. Ver ./merge.
 *
 * O VALOR MAIOR DESTE MODULO NAO E O MERGE, E A TELA. Com a marca, o app passa
 * a poder dizer "grade definida pelo professor em 02/09 09:14". Isso constroi
 * confianca e torna qualquer divergencia explicavel, em vez de misteriosa —
 * que e o que separa um conflito de um bug.
 *
 * Modulo puro: sem React, sem I/O.
 */

/**
 * Quem escreveu. Com UM professor no grupo de testes, isto basta e dispensa um
 * `professorId` — que so faria sentido com varios, e ai seria mais um campo
 * para migrar sem ninguem usar.
 */
export type Origem = 'aluno' | 'professor'

export interface Marca {
  /** ISO 8601 em UTC. Vem do relogio do APARELHO — ver o aviso abaixo. */
  alteradoEm: string
  alteradoPor: Origem
  /**
   * Contador monotonico por registro, incrementado a cada alteracao.
   *
   * Existe porque `alteradoEm` vem do relogio do aparelho, e celulares
   * discordam: com o relogio do professor 3 horas atrasado, desempate por data
   * erra. O contador nao resolve entre aparelhos diferentes (cada um conta o
   * seu), mas garante ordem correta entre alteracoes do MESMO aparelho, que e
   * o caso comum de "editei, mandei, editei de novo".
   *
   * A defesa principal contra relogio torto nao e este campo: e a regra de
   * DONO em ./merge, que decide sem olhar a hora.
   */
  versao: number
}

/** Registro que carrega a marca. */
export type ComMarca<T> = T & { marca: Marca }

export function marcar(por: Origem, agora: Date, anterior?: Marca): Marca {
  return {
    alteradoEm: agora.toISOString(),
    alteradoPor: por,
    versao: (anterior?.versao ?? 0) + 1,
  }
}

/**
 * Marca inicial para dado que ja existia antes deste modulo (migracao v1 -> v2).
 *
 * `versao: 0` de proposito: o dado antigo perde qualquer desempate para
 * qualquer alteracao nova, que e o comportamento certo — ninguem sabe quando
 * ele foi escrito, e presumir que e recente seria inventar.
 */
export function marcaDeMigracao(por: Origem, quando: string): Marca {
  return { alteradoEm: quando, alteradoPor: por, versao: 0 }
}

/**
 * Qual das duas marcas e mais recente.
 *
 * Usada SO onde nao ha dono definido — onde ha, o dono ganha sem consultar
 * relogio nenhum.
 *
 * O DESEMPATE NAO PODE DEPENDER DA ORDEM DOS ARGUMENTOS, e este e o detalhe que
 * quase passou: quando aluno e professor mesclam o mesmo par, os dois lados
 * chegam TROCADOS em cada aparelho — o que e `a` num e `b` no outro. Uma regra
 * do tipo "empate devolve o primeiro" faria os dois aparelhos escolherem
 * registros diferentes e divergirem em silencio, e cada troca seguinte
 * espalharia a divergencia.
 *
 * Por isso o ultimo criterio e `alteradoPor` em ordem alfabetica ('aluno' antes
 * de 'professor'): arbitrario, mas IGUAL nos dois aparelhos. Sobra ambiguidade
 * so quando as duas marcas sao identicas em tudo — e ai as duas descrevem a
 * mesma escrita, entao tanto faz.
 */
export function maisRecente(a: Marca, b: Marca): Marca {
  const ta = Date.parse(a.alteradoEm)
  const tb = Date.parse(b.alteradoEm)
  // Data invalida perde: um relogio que devolve lixo nao pode vencer um valido.
  if (!Number.isFinite(ta) && Number.isFinite(tb)) return b
  if (!Number.isFinite(tb) && Number.isFinite(ta)) return a
  if (Number.isFinite(ta) && Number.isFinite(tb) && ta !== tb) return ta > tb ? a : b
  if (a.versao !== b.versao) return a.versao > b.versao ? a : b
  if (a.alteradoPor !== b.alteradoPor) return a.alteradoPor < b.alteradoPor ? a : b
  return a
}

/** Texto curto para a tela: "pelo professor em 02/09 09:14". */
export function descreverMarca(marca: Marca, fuso?: string): string {
  const d = new Date(marca.alteradoEm)
  if (Number.isNaN(d.getTime())) return marca.alteradoPor === 'aluno' ? 'por você' : 'pelo professor'
  const quando = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: fuso,
  }).format(d)
  return `${marca.alteradoPor === 'aluno' ? 'por você' : 'pelo professor'} em ${quando}`
}

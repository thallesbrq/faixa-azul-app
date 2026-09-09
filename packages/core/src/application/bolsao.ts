/**
 * O BOLSAO DO PLANNER — o que o professor pode pôr numa aula.
 *
 * ---------------------------------------------------------------------------
 * O DEFEITO QUE ISTO CONSERTA, e ele bloqueava a necessidade numero um.
 *
 * Nas palavras dele: "criamos o planner para garantir que esses itens estao nas
 * aulas da RGI". O planner nao conseguia garantir isso, porque o bolsao recebia
 * `CURRICULO_AZUL.itens` e mais nada. Os 29 requisitos do 1o grau estavam apenas
 * em `itensConhecidos`, que serve para EXIBIR o que ja esta programado. Efeito
 * pratico: dos 29 itens que o aluno precisa ver nas 35 aulas, o professor nao
 * conseguia programar NENHUM — so podia tirar os que a sugestao automatica pos
 * la, e os 13 sem equivalente em azul nao tinham como voltar.
 * ---------------------------------------------------------------------------
 *
 * DUAS SECOES COM AGRUPAMENTOS DIFERENTES, e isso nao e inconsistencia — e o
 * unico jeito de nao perder informacao:
 *
 *   - REQUISITOS agrupa por MODULO do proprio curriculo (Quedas, Guarda fechada,
 *     Educativos, Posicao individual, Finalizacoes, Saidas), na ordem que o
 *     professor ditou. E a mesma ordem da folha do atestado e da matriz de
 *     acompanhamento, entao as tres telas concordam.
 *
 *   - CATALOGO agrupa por BLOCO da taxonomia (`blocoDaPosicao`), como sempre foi.
 *
 * POR QUE NAO UM AGRUPAMENTO SO. `blocoDaPosicao` foi construida a partir da
 * folha da prova de azul, e 17 dos 29 requisitos NAO caem em bloco nenhum: as
 * posicoes deles sao `Educativos`, `100 Kilos`, `Montada`, `Costas` — a posicao
 * EM SI — enquanto azul tem `Saida da Montada`, `Saida das Costas`, que e sair
 * dela. O laco do bolsao faz `if (!b) continue`, entao passar os 29 pelo caminho
 * de azul descartaria 17 EM SILENCIO, com a tela parecendo pronta. Foi medido,
 * nao suposto.
 *
 * ---------------------------------------------------------------------------
 * A DEDUPLICACAO REMOVE 12 E NAO 21, e a razao esta nos rotulos.
 *
 * 21 itens de azul sao equivalentes de algum requisito. Doze deles sao gemeos
 * UM PARA UM e o rotulo de azul nao diz nada a mais:
 *
 *     "Double leg"  <->  "Baiana"
 *     "Armlock"     <->  "Armlock (chave de braco) da guarda fechada"
 *
 * Esses saem do catalogo: duas linhas para a mesma tecnica e ruido, e foi por
 * isso que a aula 02 do programa real ficou com "Levantada tecnica" duas vezes.
 *
 * Os outros nove sao gemeos UM PARA N, e o lado de azul e MAIS FINO:
 *
 *     "Saida da montada"  ->  "Upa / ponte (trap and roll)"
 *                             "Cotovelo / reposicao de guarda (elbow escape)"
 *
 * Remover esses apagaria conteudo de ensino: o professor substituto leria "Saida
 * da montada" na aula e nao saberia se da o upa ou a fuga de cotovelo. Ficam.
 * ---------------------------------------------------------------------------
 *
 * O NOME DE AZUL VIRA ALIAS DO REQUISITO quando o gemeo 1:1 sai. Sem isso,
 * buscar "baiana" ou "scissor sweep" no bolsao nao acharia nada — o professor
 * perderia o nome pelo qual talvez procure. A busca do Planner filtra por nome,
 * slot e posicao; os aliases entram para ela achar os dois vocabularios.
 *
 * Modulo puro: sem React, sem I/O, sem importar seed.
 */

import type { Modulo, TechniqueItem } from '../domain/types'
import { blocoDaPosicao, ORDEM_BLOCO, ROTULO_BLOCO } from '../domain/taxonomia'

export interface GrupoDoBolsao {
  /** Chave estavel para a tela: id do modulo, ou do bloco. */
  id: string
  nome: string
  itens: TechniqueItem[]
}

export type IdDaSecao = 'requisitos' | 'catalogo'

export interface SecaoDoBolsao {
  id: IdDaSecao
  grupos: GrupoDoBolsao[]
  /** Quantos itens a secao oferece, para o cabecalho nao somar no JSX. */
  total: number
}

/** O rotulo de exibicao de um item — a mesma regra do chip do Planner. */
function rotulo(i: TechniqueItem): string {
  return i.nome.trim() === '' ? i.slot : i.nome
}

/**
 * Requisitos cujo equivalente e UM SO — os que tiram o gemeo do catalogo.
 *
 * Devolve `requisito.id -> id do gemeo`, e nao um Set, porque o alias precisa
 * saber DE QUEM veio.
 */
function gemeosUmParaUm(
  requisitos: readonly TechniqueItem[],
  equivalentes: (id: string) => readonly string[],
): Map<string, string> {
  const pares = new Map<string, string>()
  for (const r of requisitos) {
    const e = equivalentes(r.id)
    if (e.length === 1) pares.set(r.id, e[0])
  }
  return pares
}

export function bolsaoEmSecoes({
  requisitos,
  modulosDosRequisitos,
  catalogo,
  equivalentes,
}: {
  /** Os itens da prova que a turma persegue — os 29 do 1o grau. */
  requisitos: readonly TechniqueItem[]
  /** Os modulos deles, para a secao seguir a ordem do professor. */
  modulosDosRequisitos: readonly Modulo[]
  /** O catalogo maior: os 81 de azul. */
  catalogo: readonly TechniqueItem[]
  /**
   * Os equivalentes de um requisito em outro curriculo.
   *
   * PARAMETRO E NAO IMPORT, pelo mesmo motivo de `montarAcompanhamento`: este
   * modulo e do `application` e nao deve conhecer o seed de um curriculo. No dia
   * do 2o grau, entra outra tabela sem tocar aqui.
   */
  equivalentes: (id: string) => readonly string[]
}): SecaoDoBolsao[] {
  const ativos = requisitos.filter((i) => i.ativo)
  const paresUmParaUm = gemeosUmParaUm(ativos, equivalentes)

  /** Rotulo de azul por id, para virar alias do requisito. */
  const rotuloDoCatalogo = new Map(catalogo.map((i) => [i.id, rotulo(i)]))

  /**
   * O requisito leva o nome de azul como ALIAS.
   *
   * COPIA E NAO MUTACAO: o seed e compartilhado com a folha do atestado e com a
   * matriz, e acrescentar alias no objeto original mudaria o que aquelas telas
   * mostram — um efeito colateral a distancia, do tipo que ninguem procura.
   */
  const comAlias = ativos.map((i) => {
    const gemeo = paresUmParaUm.get(i.id)
    const nomeDeAzul = gemeo === undefined ? null : (rotuloDoCatalogo.get(gemeo) ?? null)
    if (nomeDeAzul === null || nomeDeAzul === rotulo(i)) return i
    return { ...i, aliases: [...i.aliases, nomeDeAzul] }
  })

  // ---- Secao 1: os requisitos, na ordem dos modulos do professor -----------
  const porModulo = new Map<string, TechniqueItem[]>()
  for (const i of comAlias) {
    const lista = porModulo.get(i.moduloId)
    if (lista) lista.push(i)
    else porModulo.set(i.moduloId, [i])
  }

  const gruposDeRequisitos: GrupoDoBolsao[] = [...modulosDosRequisitos]
    .sort((a, b) => a.ordem - b.ordem)
    .flatMap((m) => {
      const itens = porModulo.get(m.id)
      if (!itens?.length) return []
      porModulo.delete(m.id)
      return [{ id: m.id, nome: m.nome, itens }]
    })

  /**
   * ITEM SEM MODULO CONHECIDO NAO DESAPARECE — vai para um grupo com o nome do
   * proprio `moduloId`.
   *
   * Este ramo esta vazio hoje e existe pela licao do outro lado: o `if (!b)
   * continue` do agrupamento por bloco descartava em silencio, e foi assim que
   * eu quase perdi 17 dos 29. Uma lacuna visivel se conserta; uma invisivel
   * viaja para producao com a tela parecendo certa.
   */
  for (const [moduloId, itens] of porModulo) {
    gruposDeRequisitos.push({ id: moduloId, nome: moduloId, itens })
  }

  // ---- Secao 2: o catalogo, sem os gemeos 1:1, por bloco -------------------
  const removidos = new Set(paresUmParaUm.values())
  const doCatalogo = catalogo.filter((i) => i.ativo && !removidos.has(i.id))

  const porBloco = new Map<string, TechniqueItem[]>()
  const semBloco = new Map<string, TechniqueItem[]>()
  for (const i of doCatalogo) {
    const b = blocoDaPosicao(i.posicao)
    const destino = b === null ? semBloco : porBloco
    const chave = b === null ? i.posicao : b
    const lista = destino.get(chave)
    if (lista) lista.push(i)
    else destino.set(chave, [i])
  }

  const gruposDoCatalogo: GrupoDoBolsao[] = ORDEM_BLOCO.flatMap((b) => {
    const itens = porBloco.get(b)
    return itens?.length ? [{ id: b, nome: ROTULO_BLOCO[b], itens }] : []
  })

  // Mesma regra do outro lado: sem bloco vira grupo com o nome da posicao.
  for (const [posicao, itens] of semBloco) {
    gruposDoCatalogo.push({ id: `posicao:${posicao}`, nome: posicao, itens })
  }

  const soma = (grupos: GrupoDoBolsao[]) => grupos.reduce((n, g) => n + g.itens.length, 0)

  return [
    { id: 'requisitos', grupos: gruposDeRequisitos, total: soma(gruposDeRequisitos) },
    { id: 'catalogo', grupos: gruposDoCatalogo, total: soma(gruposDoCatalogo) },
  ]
}

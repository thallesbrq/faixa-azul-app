/**
 * Seed consolidado.
 *
 * Junta o que foi importado do legado (curriculo, aulas, teoria) com o que foi
 * escrito a mao depois (Fundamentos e Quedas). Reexecutar o script de import
 * regenera apenas os arquivos gerados — o conteudo manual sobrevive.
 */

import type { TechniqueContent, TechniqueItem } from '../domain/types'
import { CONTEUDOS as CONTEUDOS_IMPORTADOS, ITENS as ITENS_IMPORTADOS, REQUISITOS } from './curriculo'
import { CONTEUDO_FUNDAMENTOS_QUEDAS } from './conteudo-fundamentos-quedas'
import { AULAS } from './aulas'
import { CARTOES_TEORIA } from './teoria'
import { MODULOS } from './modulos'

/**
 * FOCO DECLARADO: Secoes 4 e 5 (guardas e saidas).
 *
 * As Secoes 1-3 (Fundamentos, Defesa Pessoal, Quedas) ficam DESATIVADAS, nao
 * apagadas: o conteudo permanece no seed e volta trocando este conjunto. O
 * motivo e que o trabalho atual e escolher e validar as posicoes das Secoes 4 e
 * 5 com o professor — as demais entram depois, se entrarem.
 *
 * `ativo: false` ja e respeitado pelo gerador de cartoes e pela fila do dia,
 * entao nada mais precisa saber desta decisao.
 */
const MODULOS_ATIVOS = new Set(['mod-guardas', 'mod-saidas'])

/**
 * COMPLEXO MODERNO: as quatro alternativas ficam ATIVAS.
 *
 * O curriculo do app mantem os 56 itens. A escolha de treinar uma ou as quatro
 * alternativas passa a ser feita na MONTAGEM das aulas, com o professor, em vez
 * de por constante no codigo — e a decisao dele, nao do app.
 *
 * O que a banca pede fica registrado aqui porque a informacao vale na hora de
 * montar: o documento do exame traz UMA entrada,
 *
 *     Guarda One leg / 50-50 / Guarda X / One leg / Berimbolo
 *       • Raspada
 *       • Passagem
 *
 * com "Raspada" e "Passagem" no SINGULAR. Sao alternativas: a prova cobra uma
 * raspagem e uma passagem de uma das quatro. Treinar as quatro e escolha de
 * preparo, nao exigencia — e treinar as quatro e o que faz o curriculo ter 56
 * itens em vez de 50.
 */
const SUBPOSICAO_DO_COMPLEXO: string | null = null

/** Prefixo da posicao que agrupa as quatro alternativas. */
const PREFIXO_COMPLEXO = 'Complexo Moderno'

/** Conteudo manual sobrescreve o importado (que estava vazio para estes itens). */
const CONTEUDOS: TechniqueContent[] = (() => {
  const porItem = new Map(CONTEUDOS_IMPORTADOS.map((c) => [c.itemId, c]))
  for (const manual of CONTEUDO_FUNDAMENTOS_QUEDAS) {
    if (!porItem.has(manual.itemId)) {
      throw new Error(`conteudo manual referencia item inexistente: ${manual.itemId}`)
    }
    porItem.set(manual.itemId, manual)
  }
  return [...porItem.values()]
})()

/**
 * Aplica tres correcoes sobre o import:
 * 1. os 14 itens que ganharam passo a passo depois deixam de "aguardar o
 *    professor" e passam a sugestao nao validada — que e a verdade sobre eles;
 * 2. o foco declarado nas Secoes 4 e 5;
 * 3. opcionalmente, reduzir o Complexo Moderno a uma sub-posicao (desligado).
 */
const ITENS: TechniqueItem[] = (() => {
  const comPassos = new Set(CONTEUDOS.filter((c) => c.passos.length > 0).map((c) => c.itemId))

  /** Com `SUBPOSICAO_DO_COMPLEXO` nulo, nada e excluido. */
  const foraDoComplexo = (item: TechniqueItem) =>
    SUBPOSICAO_DO_COMPLEXO !== null &&
    item.posicao.startsWith(PREFIXO_COMPLEXO) &&
    item.categoria !== SUBPOSICAO_DO_COMPLEXO

  return ITENS_IMPORTADOS.map((item) => ({
    ...item,
    validationStatus:
      comPassos.has(item.id) && item.validationStatus === 'aguardando_validacao'
        ? ('sugestao_nao_validada' as const)
        : item.validationStatus,
    ativo: item.ativo && MODULOS_ATIVOS.has(item.moduloId) && !foraDoComplexo(item),
  }))
})()

export { AULAS, CARTOES_TEORIA, CONTEUDOS, ITENS, MODULOS, REQUISITOS }

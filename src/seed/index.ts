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
import { DUVIDAS_DO_SPEC, duvidasDeLacuna } from './duvidas'
import { MODULOS } from './modulos'

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
 * Corrige o status dos 14 itens que ganharam passo a passo depois do import:
 * deixam de "aguardar o professor" e passam a ser sugestao nao validada — que e
 * a verdade sobre eles.
 */
const ITENS: TechniqueItem[] = (() => {
  const comPassos = new Set(CONTEUDOS.filter((c) => c.passos.length > 0).map((c) => c.itemId))
  return ITENS_IMPORTADOS.map((item) =>
    comPassos.has(item.id) && item.validationStatus === 'aguardando_validacao'
      ? { ...item, validationStatus: 'sugestao_nao_validada' as const }
      : item,
  )
})()

const DUVIDAS = [...DUVIDAS_DO_SPEC, ...duvidasDeLacuna(ITENS, CONTEUDOS)]

export { AULAS, CARTOES_TEORIA, CONTEUDOS, DUVIDAS, ITENS, MODULOS, REQUISITOS }

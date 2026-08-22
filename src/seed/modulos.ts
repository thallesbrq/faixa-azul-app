/** Modulos do curriculo — spec 2.1. */

import type { Modulo } from '../domain/types'

export const MODULOS: Modulo[] = [
  {
    id: 'mod-fundamentos',
    nome: 'Fundamentos e movimentacao',
    ordem: 1,
    secaoProva: 'Secao 1',
  },
  {
    id: 'mod-defesa-pessoal',
    nome: 'Defesa pessoal',
    ordem: 2,
    secaoProva: 'Secao 2',
  },
  {
    id: 'mod-quedas',
    nome: 'Quedas',
    ordem: 3,
    secaoProva: 'Secao 3',
  },
  {
    id: 'mod-guardas',
    nome: 'Complexo de guardas',
    ordem: 4,
    secaoProva: 'Secao 4',
  },
  {
    id: 'mod-saidas',
    nome: 'Saidas e defesas',
    ordem: 5,
    secaoProva: 'Secao 5',
  },
  {
    id: 'mod-teoria',
    nome: 'Valores, historia e pontuacao',
    ordem: 6,
    secaoProva: 'Secao 6',
  },
]

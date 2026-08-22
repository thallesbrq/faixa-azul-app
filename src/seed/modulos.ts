/** Modulos do curriculo — spec 2.1. */

import type { Modulo } from '../domain/types'

export const MODULOS: Modulo[] = [
  {
    id: 'mod-fundamentos',
    nome: 'Fundamentos e movimentação',
    ordem: 1,
    secaoProva: 'Seção 1',
  },
  {
    id: 'mod-defesa-pessoal',
    nome: 'Defesa pessoal',
    ordem: 2,
    secaoProva: 'Seção 2',
  },
  {
    id: 'mod-quedas',
    nome: 'Quedas',
    ordem: 3,
    secaoProva: 'Seção 3',
  },
  {
    id: 'mod-guardas',
    nome: 'Complexo de guardas',
    ordem: 4,
    secaoProva: 'Seção 4',
  },
  {
    id: 'mod-saidas',
    nome: 'Saídas e defesas',
    ordem: 5,
    secaoProva: 'Seção 5',
  },
  {
    id: 'mod-teoria',
    nome: 'Valores, história e pontuação',
    ordem: 6,
    secaoProva: 'Seção 6',
  },
]

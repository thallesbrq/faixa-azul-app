/**
 * A FORMA de um curriculo — contra o que um aluno e medido.
 *
 * MORA NO DOMINIO pelo mesmo motivo que `resumo.ts`: quem precisa do tipo esta
 * abaixo de quem o usava. `seed/curriculos.ts` escolhe o curriculo de uma meta e
 * precisa do tipo; enquanto ele vivia em `application/central`, o seed teria de
 * importar a aplicacao — uma camada de baixo conhecendo uma de cima. Era so
 * tipo, entao nao quebrava em runtime; era inversao mesmo assim.
 *
 * Quem CALCULA progresso a partir dele continua em application. Aqui esta so a
 * forma.
 */

import type { Card, RequisitoProva, TechniqueContent, TechniqueItem } from './types'

export interface Curriculo {
  itens: TechniqueItem[]
  conteudos: TechniqueContent[]
  requisitos: RequisitoProva[]
  cartoesTeoria: Card[]
}

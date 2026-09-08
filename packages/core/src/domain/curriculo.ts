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
  /**
   * COMO se mede progresso NESTE curriculo — e as duas formas nao sao escolha de
   * estilo, sao consequencia do que existe dentro dele.
   *
   * `cartoes`: dominio de cartoes de recuperacao, como o app sempre mediu. Exige
   *   passo a passo, porque sem `passos` o gerador so produz o cartao de
   *   classificacao.
   *
   * `atestado`: quantas competencias o PROFESSOR confirmou. E a medida do 1o
   *   grau porque a lista dele nao vem com passo a passo — e porque, para quem
   *   busca o grau, o numero que importa e o julgamento do professor.
   *
   * MORAVA EM `Meta` E MUDOU DE DONO (ADR-017, decisao 6). A meta e a prova; o
   * curriculo e o conteudo. Quando os dois viraram campos separados no cadastro
   * (`meta` e `estuda`), a medida presa a meta passou a errar no meu proprio
   * caso: persigo o 3o grau (medida de atestado) e estudo o curriculo de azul
   * (medida de cartoes) — a medida de uma prova aplicada ao conteudo de outra.
   */
  medida: 'cartoes' | 'atestado'
}

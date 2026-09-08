/**
 * Contadores de diagnostico da Central, ligados por `?diag=1`.
 *
 * POR QUE ISTO EXISTE, e e uma resposta a um defeito de metodo e nao a um pedido.
 *
 * A tela do planner ficou piscando em producao. Eu achei uma causa (laco de
 * render por array instavel), consertei, implantei — e continuou piscando. Ao
 * tentar reproduzir, montei a arvore REAL localmente com sessao de mentira: 2
 * renders, 5 mutacoes de DOM, estavel. Ou seja, o defeito precisa do ambiente
 * dele, e eu estava adivinhando a partir do codigo.
 *
 * Laco de renderizacao e o tipo de defeito mais hostil a leitura: nao lanca erro,
 * nao aparece no console, nao quebra teste, e nao deixa rastro no servidor. Ele
 * so pisca. Sem numero, "acho que e o hook X" e palpite — e eu ja gastei um
 * deploy num palpite.
 *
 * O QUE CADA CONTADOR RESPONDE:
 * - `renders`         a arvore esta re-renderizando sozinha?
 * - `mutacoes`        o DOM esta mudando? (e o que o olho chama de piscar)
 * - `cargaPrograma`   o efeito de carga do planner esta refazendo a leitura?
 * - `cargaLinhas`     e o da tabela de alunos?
 * - `sessao`          o `setEstado` da sessao esta disparando em serie?
 *
 * A combinacao localiza o laco sem eu ter de adivinhar: `cargaPrograma` subindo
 * aponta `usePrograma`; `sessao` subindo aponta o ouvinte de autenticacao;
 * `mutacoes` subindo com `renders` parado aponta um filho.
 *
 * FICA NO CODIGO depois de resolvido. Custa um `if` numa string de consulta, e a
 * proxima vez que uma tela piscar o instrumento ja esta la.
 */

export const CONTADORES = {
  renders: 0,
  cargaPrograma: 0,
  cargaLinhas: 0,
  sessao: 0,
}

export type ChaveDoContador = keyof typeof CONTADORES

export function contar(chave: ChaveDoContador): void {
  CONTADORES[chave] += 1
}

/**
 * Ligado apenas por `?diag=1`.
 *
 * Lido UMA VEZ, na carga do modulo: se fosse lido a cada render, a propria
 * leitura entraria no caminho quente que estamos medindo.
 */
export const DIAGNOSTICO_LIGADO =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('diag') === '1'

let mutacoes = 0

/**
 * Observa o DOM inteiro, e nao um no.
 *
 * MUTACAO E O QUE O OLHO VE. Um laco dentro de um componente filho nao
 * re-renderiza o pai — o contador de `renders` ficaria em 2 enquanto a tela
 * pisca. Foi por nao medir isto que eu quase concluí que estava consertado.
 */
export function observarMutacoes(): void {
  if (!DIAGNOSTICO_LIGADO || typeof MutationObserver === 'undefined') return
  new MutationObserver((lista) => {
    mutacoes += lista.length
  }).observe(document.documentElement, { childList: true, subtree: true, characterData: true })
}

export function totalDeMutacoes(): number {
  return mutacoes
}

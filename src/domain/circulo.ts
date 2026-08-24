/**
 * Metodo do circulo — combinatoria pura, sem nada de jiu-jitsu aqui.
 *
 * O problema: distribuir n grupos em rodadas de pares de forma que cada grupo
 * apareca exatamente duas vezes, nunca com o mesmo parceiro, e com as duas
 * aparicoes o mais longe possivel uma da outra.
 *
 * O porque disso importar: e pratica intercalada com espacamento. Ver a Guarda
 * Fechada inteira numa aula e nunca mais e pior do que ver metade na aula 1 e
 * metade na aula 5 — a segunda passagem cai justamente quando a memoria comecou
 * a falhar, que e onde a recuperacao fixa mais (mesmo principio do scheduler).
 *
 * Este esquema vem do calendario v2 construido antes deste app; aqui ele fica
 * isolado e testavel em vez de embutido no HTML.
 */

/** Maximo divisor comum, para achar um passo que gere ciclo unico. */
function mdc(a: number, b: number): number {
  return b === 0 ? a : mdc(b, a % b)
}

/**
 * Passo de rotacao do circulo. Precisa ser coprimo com n, senao o ciclo se
 * fecha antes de passar por todos e alguns grupos ficariam de fora.
 *
 * Busca de n/2 para baixo porque quanto maior o passo, maior a distancia entre
 * as duas aparicoes de um mesmo grupo — que e todo o objetivo.
 */
export function passoDoCirculo(n: number): number {
  for (let passo = Math.floor(n / 2); passo >= 1; passo--) {
    if (mdc(passo, n) === 1) return passo
  }
  return 1
}

/**
 * Pares (indice, indice) — uma rodada por grupo.
 *
 * Com n grupos saem n rodadas, e cada grupo aparece 2 vezes: uma como primeiro
 * do par, uma como segundo. Grupos de tamanho diferente sao problema de quem
 * chama: aqui so entra o esqueleto combinatorio.
 */
export function paresDoCirculo(n: number): [number, number][] {
  if (n <= 0) return []
  if (n === 1) return [[0, 0]]
  if (n === 2) return [[0, 1]]

  const passo = passoDoCirculo(n)
  const pares: [number, number][] = []
  for (let i = 0; i < n; i++) {
    pares.push([i, (i + passo) % n])
  }
  return pares
}

/**
 * Tamanhos de `partes` grupos que somam `total`, o mais parecidos possivel.
 *
 * 56 itens em 10 aulas devolve seis 6 e quatro 5 — nao existe divisao exata, e
 * este e o mais proximo dela.
 *
 * `restoNoFim` decide onde ficam os grupos maiores, e no caso das aulas isso
 * importa: o custo de um item cai conforme o aluno estuda, entao as aulas mais
 * cheias devem ser as ULTIMAS, quando cada item ja sai mais barato. Colocar as
 * maiores no comeco seria empilhar mais conteudo justamente onde ele custa mais.
 */
export function tamanhosEquilibrados(total: number, partes: number, restoNoFim = true): number[] {
  if (partes <= 0 || total < 0) return []
  const base = Math.floor(total / partes)
  const resto = total % partes

  return Array.from({ length: partes }, (_, i) => {
    const ganhaExtra = restoNoFim ? i >= partes - resto : i < resto
    return base + (ganhaExtra ? 1 : 0)
  })
}

/**
 * Divide uma lista em `partes` pedacos de tamanho o mais parecido possivel,
 * distribuindo o resto nos primeiros pedacos.
 *
 * Usado para partir uma posicao grande (a Guarda Fechada tem 11 itens) entre as
 * suas duas aparicoes no circulo.
 */
export function dividirEmPartes<T>(lista: T[], partes: number): T[][] {
  if (partes <= 0) return []
  const base = Math.floor(lista.length / partes)
  const resto = lista.length % partes

  const saida: T[][] = []
  let i = 0
  for (let p = 0; p < partes; p++) {
    const tamanho = base + (p < resto ? 1 : 0)
    saida.push(lista.slice(i, i + tamanho))
    i += tamanho
  }
  return saida
}

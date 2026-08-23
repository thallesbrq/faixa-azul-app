/**
 * Validacao do link de video escolhido pelo aluno.
 *
 * Existe por seguranca, nao por capricho. O link vai para o `href` de um link
 * na tela, e um `javascript:...` guardado ali executa quando clicado — o app
 * esta publicado na web, entao um valor colado sem conferencia (de um print, de
 * uma mensagem, de um backup importado de outro aparelho) vira execucao de
 * codigo. Por isso a regra e lista de permissao: so http e https passam, todo o
 * resto e recusado.
 *
 * Modulo puro: sem React, sem I/O.
 */

/** Unicos esquemas aceitos. Qualquer outro (javascript:, data:, file:) e recusado. */
const ESQUEMAS_PERMITIDOS = ['http:', 'https:']

/**
 * Devolve a URL normalizada, ou `null` quando o texto nao e um link utilizavel.
 *
 * Aceita o endereco sem esquema ("youtube.com/watch?v=x"), que e como as pessoas
 * copiam de fato, assumindo https. Nao aceita esquema explicito invalido: quem
 * escreveu `javascript:` escreveu de proposito, e completar para https ali
 * seria adivinhar em cima de uma tentativa suspeita.
 */
export function normalizarUrlDeVideo(bruto: string): string | null {
  const texto = bruto.trim()
  if (!texto) return null

  // Tem esquema explicito? Entao ele precisa ser permitido, sem correcao.
  const temEsquema = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(texto)
  const candidato = temEsquema ? texto : `https://${texto}`

  let url: URL
  try {
    url = new URL(candidato)
  } catch {
    return null
  }

  if (!ESQUEMAS_PERMITIDOS.includes(url.protocol)) return null
  // Sem host nao ha o que abrir — pega casos como "https:///" ou "http://".
  if (!url.hostname || !url.hostname.includes('.')) return null

  return url.toString()
}

/**
 * Identificador do video no YouTube, quando a URL for de la.
 *
 * Serve so para a tela mostrar uma miniatura e um rotulo em vez de uma URL
 * crua. Devolve `null` para qualquer outra origem — o app aceita link de
 * qualquer lugar, apenas nao sabe enfeitar os outros.
 */
export function idDoYoutube(url: string): string | null {
  const normalizada = normalizarUrlDeVideo(url)
  if (!normalizada) return null

  let u: URL
  try {
    u = new URL(normalizada)
  } catch {
    return null
  }

  const host = u.hostname.replace(/^www\./, '')

  if (host === 'youtu.be') {
    const id = u.pathname.slice(1).split('/')[0]
    return /^[\w-]{11}$/.test(id) ? id : null
  }

  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
    // /watch?v=ID
    const v = u.searchParams.get('v')
    if (v && /^[\w-]{11}$/.test(v)) return v
    // /shorts/ID e /embed/ID
    const m = /^\/(?:shorts|embed|live)\/([\w-]{11})/.exec(u.pathname)
    if (m) return m[1]
  }

  return null
}

/** Rotulo curto da origem, para a tela quando nao houver titulo. */
export function origemDoVideo(url: string): string | null {
  const normalizada = normalizarUrlDeVideo(url)
  if (!normalizada) return null
  try {
    return new URL(normalizada).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

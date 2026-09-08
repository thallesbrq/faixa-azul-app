/**
 * Acesso ao Firestore de PRODUCAO por fora do app, com credencial de dono.
 *
 * POR QUE EXISTE. Certas escritas nao pertencem a nenhuma tela: semear um aluno
 * de demonstracao, corrigir um campo que nasceu errado num convite, apagar um
 * convite digitado com o e-mail trocado. Poe-las na Central significaria dar ao
 * professor — que e CLIENTE — botoes de administracao de banco; afrouxar as
 * regras para o gestor escrever em `estados` derrubaria a unica parede que
 * dispensa merge entre aluno e professor (ADR-017, decisao 5).
 *
 * Este modulo e o caminho honesto: roda na maquina de quem mantem o sistema,
 * uma vez, com log do que fez.
 *
 * ATENCAO — ISTO IGNORA AS REGRAS DE SEGURANCA. O token e de dono do projeto,
 * entao `firestore.rules` nao e consultado. Duas consequencias praticas:
 *
 *   1. um documento escrito aqui pode ter forma que o app nunca aceitaria. Os
 *      leitores do app coagem campo a campo (ver `comoCadastro` em
 *      `nuvem/pessoas`), o que evita `undefined` na tela — mas nao evita um
 *      campo com o NOME errado, que simplesmente nao aparece;
 *   2. escrever aqui NAO prova que o app conseguiria escrever o mesmo. Se a
 *      pergunta e "as regras permitem?", a resposta esta nos testes de regras,
 *      nao neste arquivo.
 *
 * `scripts/semear-aluno-demo.ts` tem uma copia destas funcoes: ele e mais antigo
 * e escreve no unico documento que esta em uso como conta de teste, entao nao foi
 * migrado junto. Quem for editar aquele arquivo, migre-o para ca.
 */

import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export const PROJETO = 'rg-centraldoaluno'
export const ACADEMIA = 'rilion-garopaba'

const BASE = `https://firestore.googleapis.com/v1/projects/${PROJETO}/databases/(default)/documents`

// ---------------------------------------------------------------------------
// Valores TIPADOS
// ---------------------------------------------------------------------------
/**
 * A API REST do Firestore nao aceita JSON solto: cada valor vai etiquetado
 * (`stringValue`, `integerValue`, `mapValue`, ...). Converter a mao, campo por
 * campo, seria o caminho mais curto para gravar numero como texto onde o app
 * espera numero — e isso NAO daria erro: o app leria `NaN` e mostraria a celula
 * vazia, com aparencia de defeito da tela.
 */
type Valor = Record<string, unknown>

export function tipar(v: unknown): Valor {
  if (v === null || v === undefined) return { nullValue: null }
  if (typeof v === 'string') return { stringValue: v }
  if (typeof v === 'boolean') return { booleanValue: v }
  if (typeof v === 'number') {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }
  }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(tipar) } }
  if (typeof v === 'object') {
    const fields: Record<string, Valor> = {}
    for (const [k, valor] of Object.entries(v as Record<string, unknown>)) {
      fields[k] = tipar(valor)
    }
    return { mapValue: { fields } }
  }
  throw new Error(`valor de tipo nao suportado: ${typeof v}`)
}

/** O caminho de volta: documento tipado -> objeto legivel, para conferir. */
export function destipar(v: Valor): unknown {
  if ('nullValue' in v) return null
  if ('stringValue' in v) return v.stringValue
  if ('booleanValue' in v) return v.booleanValue
  if ('integerValue' in v) return Number(v.integerValue)
  if ('doubleValue' in v) return v.doubleValue
  if ('arrayValue' in v) {
    const a = v.arrayValue as { values?: Valor[] }
    return (a.values ?? []).map(destipar)
  }
  if ('mapValue' in v) {
    const m = v.mapValue as { fields?: Record<string, Valor> }
    const o: Record<string, unknown> = {}
    for (const [k, valor] of Object.entries(m.fields ?? {})) o[k] = destipar(valor)
    return o
  }
  return '(tipo desconhecido)'
}

function documento(obj: Record<string, unknown>) {
  const fields: Record<string, Valor> = {}
  for (const [k, v] of Object.entries(obj)) fields[k] = tipar(v)
  return { fields }
}

// ---------------------------------------------------------------------------
// Credencial
// ---------------------------------------------------------------------------
/**
 * Token de acesso a partir da credencial que o `firebase login` ja guardou.
 *
 * NAO PEDE SENHA E NAO CRIA SEGREDO NOVO: le o refresh token do configstore do
 * firebase-tools — o mesmo que o CLI usa para implantar — e troca por um token de
 * uma hora. Se `firebase login` nao tiver sido feito, FALHA ANTES da primeira
 * escrita, dizendo isso; a alternativa seria gravar metade dos documentos e
 * parar no meio, que e o pior estado possivel num banco sem transacao entre
 * colecoes.
 *
 * Guarda o token no modulo: um script que grava dez documentos nao precisa de dez
 * idas ao servidor de token, e o token vale uma hora.
 */
let cache: string | null = null

export async function tokenDeAcesso(): Promise<string> {
  if (cache) return cache

  const caminho = join(homedir(), '.config', 'configstore', 'firebase-tools.json')
  let cfg: { tokens?: { refresh_token?: string } }
  try {
    cfg = JSON.parse(readFileSync(caminho, 'utf8'))
  } catch {
    throw new Error(`nao achei a credencial do firebase-tools em ${caminho}. Rode: npx firebase login`)
  }
  const refresh = cfg.tokens?.refresh_token
  if (!refresh) throw new Error('credencial sem refresh_token. Rode: npx firebase login')

  // O client id publico do firebase-tools. Nao e segredo: vai no binario do CLI,
  // que e open source.
  const CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com'
  const CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi'

  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refresh,
      grant_type: 'refresh_token',
    }),
  })
  if (!r.ok) throw new Error(`troca de token falhou: ${r.status} ${await r.text()}`)
  const j = (await r.json()) as { access_token?: string }
  if (!j.access_token) throw new Error('resposta sem access_token')

  cache = j.access_token
  return cache
}

// ---------------------------------------------------------------------------
// Operacoes
// ---------------------------------------------------------------------------

/**
 * Grava (cria ou funde) um documento.
 *
 * COM `updateMask`, e essa e a diferenca entre fundir e destruir: sem a mascara,
 * um PATCH substitui o documento inteiro e apaga todo campo que nao veio na
 * chamada. Escrever `{ meta: '1grau' }` num cadastro completo apagaria nome,
 * turma e `ativo` — sem erro, e a linha simplesmente sumiria da Central.
 */
export async function gravar(caminho: string, dados: Record<string, unknown>): Promise<void> {
  const token = await tokenDeAcesso()
  const mascara = Object.keys(dados)
    .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
    .join('&')
  const r = await fetch(`${BASE}/${caminho}?${mascara}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(documento(dados)),
  })
  if (!r.ok) throw new Error(`PATCH ${caminho} falhou: ${r.status} ${await r.text()}`)
}

/** Le um documento. `null` quando nao existe — ausencia nao e erro. */
export async function ler(caminho: string): Promise<Record<string, unknown> | null> {
  const token = await tokenDeAcesso()
  const r = await fetch(`${BASE}/${caminho}`, { headers: { Authorization: `Bearer ${token}` } })
  if (r.status === 404) return null
  if (!r.ok) throw new Error(`GET ${caminho} falhou: ${r.status} ${await r.text()}`)
  const j = (await r.json()) as { fields?: Record<string, Valor> }
  const o: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(j.fields ?? {})) o[k] = destipar(v)
  return o
}

/** Os documentos de uma colecao, com o id de cada um. */
export async function listar(
  colecao: string,
  pageSize = 300,
): Promise<{ id: string; dados: Record<string, unknown> }[]> {
  const token = await tokenDeAcesso()
  const r = await fetch(`${BASE}/${colecao}?pageSize=${pageSize}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!r.ok) throw new Error(`LIST ${colecao} falhou: ${r.status} ${await r.text()}`)
  const j = (await r.json()) as { documents?: { name: string; fields?: Record<string, Valor> }[] }
  return (j.documents ?? []).map((d) => {
    const dados: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(d.fields ?? {})) dados[k] = destipar(v)
    return { id: String(d.name).split('/').pop() as string, dados }
  })
}

/** Apaga um documento. Idempotente: apagar o que nao existe nao e erro. */
export async function apagar(caminho: string): Promise<void> {
  const token = await tokenDeAcesso()
  const r = await fetch(`${BASE}/${caminho}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!r.ok && r.status !== 404) {
    throw new Error(`DELETE ${caminho} falhou: ${r.status} ${await r.text()}`)
  }
}

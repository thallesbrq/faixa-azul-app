/**
 * Importacao UNICA do curriculo legado para o seed versionado.
 *
 * Le os arquivos construidos nas sessoes anteriores em
 * watcher/prova-azul-jiujitsu/ e emite src/seed/curriculo.ts.
 *
 * Depois desta importacao o seed passa a ser editado a mao — os arquivos
 * legados vao ser aposentados (ADR-013). O script fica no repo apenas para
 * rastreabilidade da origem dos dados.
 *
 *   node scripts/importar-legado.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const LEGADO = '/Users/user/Documents/watcher/prova-azul-jiujitsu'
const SAIDA = resolve(import.meta.dirname, '../src/seed/curriculo.ts')

// --- carrega os arquivos legados -------------------------------------------

function carregarConteudo() {
  const src = readFileSync(`${LEGADO}/conteudo.js`, 'utf8').replace(/if \(typeof window[\s\S]*$/, '')
  return new Function(`${src}; return CONTEUDO`)()
}

function carregarGrupos() {
  const html = readFileSync(`${LEGADO}/index.html`, 'utf8')
  const bloco = html.match(/const GRUPOS = \[([\s\S]*?)\n\];/)[1]
  const grupos = []
  const re = /\{ g:"([^"]+)", itens:\[([\s\S]*?)\]\}/g
  let m
  while ((m = re.exec(bloco))) {
    grupos.push({ grupo: m[1], itens: [...m[2].matchAll(/"([^"]+)"/g)].map((a) => a[1]) })
  }
  return grupos
}

function carregarTree(conteudo) {
  globalThis.window = { CONTEUDO: conteudo }
  const src = readFileSync(`${LEGADO}/mapa-dados.js`, 'utf8')
  return new Function(`${src}; return TREE`)()
}

/**
 * AULAS10 usa constantes (GF, MG, ...) declaradas logo antes de PLANO no
 * index.html. Avaliamos os dois blocos juntos para nao redigitar 56 chaves.
 */
function carregarAulas() {
  const html = readFileSync(`${LEGADO}/index.html`, 'utf8')
  const consts = html.match(/const GF="[\s\S]*?SAI="[^"]+";/)[0]
  const aulas = html.match(/const AULAS10 = \[[\s\S]*?\n\];/)[0]
  return new Function(`${consts}\n${aulas}\nreturn AULAS10`)()
}

function carregarTeoria() {
  const html = readFileSync(`${LEGADO}/index.html`, 'utf8')
  const bloco = html.match(/const TEORIA = \[[\s\S]*?\n\];/)[0]
  return new Function(`${bloco}\nreturn TEORIA`)()
}

const CONTEUDO = carregarConteudo()
const GRUPOS = carregarGrupos()
const TREE = carregarTree(CONTEUDO)
const AULAS10 = carregarAulas()
const TEORIA = carregarTeoria()

// --- indexa metadados vindos da arvore da prova ----------------------------

/**
 * chave "Grupo|Slot" -> { posicao, categoria, rotuloProva, exige }
 *
 * `posicao` vem do rotulo da arvore da prova, que e mais preciso que o grupo do
 * checklist legado: na Secao 5 o checklist tem um unico grupo "Saidas", mas a
 * prova distingue "Saida da Montada", "Saida dos 100 Kilos" etc. — e cada uma
 * tem seu proprio "exige 2". Usar o grupo generico colapsaria requisitos
 * distintos num so.
 */
const META = new Map()
for (const secao of TREE.secoes) {
  for (const guarda of secao.guardas) {
    for (const cat of guarda.cats) {
      for (const item of cat.itens) {
        META.set(item.key, {
          posicao: guarda.label,
          categoria: cat.label,
          rotuloProva: item.label,
          exige: cat.exige ?? null,
        })
      }
    }
  }
}

// --- mapeamento de modulos (spec 2.1) --------------------------------------

const MODULO_POR_GRUPO = {
  'Base & Movimentação': 'mod-fundamentos',
  'Defesa Pessoal': 'mod-defesa-pessoal',
  Quedas: 'mod-quedas',
  Saídas: 'mod-saidas',
}
const moduloDe = (grupo) => MODULO_POR_GRUPO[grupo] ?? 'mod-guardas'

const SECAO_POR_MODULO = {
  'mod-fundamentos': 'Seção 1 — Fundamentos e movimentação',
  'mod-defesa-pessoal': 'Seção 2 — Defesa pessoal',
  'mod-quedas': 'Seção 3 — Quedas',
  'mod-guardas': 'Seção 4 — Complexo de guardas',
  'mod-saidas': 'Seção 5 — Saídas e defesas',
}

function safetyLevel(moduloId, tipo) {
  if (moduloId === 'mod-defesa-pessoal' || moduloId === 'mod-quedas') return 'alto'
  if (tipo === 'finalizacao') return 'medio'
  return 'baixo'
}

function kindPadrao(moduloId, tipo) {
  if (tipo) return tipo
  if (moduloId === 'mod-fundamentos') return 'movimentacao'
  if (moduloId === 'mod-quedas') return 'queda'
  if (moduloId === 'mod-defesa-pessoal') return 'defesa_pessoal'
  return undefined
}

const slug = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

// --- monta itens e conteudos ----------------------------------------------

const itens = []
const conteudos = []
const requisitos = new Map()
const idsUsados = new Set()

for (const { grupo, itens: slots } of GRUPOS) {
  for (const slotNome of slots) {
    const chave = `${grupo}|${slotNome}`
    const c = CONTEUDO[chave]
    const meta = META.get(chave)
    const moduloId = moduloDe(grupo)
    // Posicao precisa (rotulo da prova) com fallback no grupo do checklist.
    const posicao = meta?.posicao ?? grupo

    let id = `${slug(grupo)}--${slug(slotNome)}`
    if (idsUsados.has(id)) throw new Error(`id duplicado: ${id}`)
    idsUsados.add(id)

    const temPassos = Boolean(c?.passos?.length)

    itens.push({
      id,
      moduloId,
      posicao,
      slot: slotNome,
      categoria: meta?.categoria ?? grupo,
      nome: c?.nome ?? '',
      aliases: meta?.rotuloProva && meta.rotuloProva !== c?.nome ? [meta.rotuloProva] : [],
      kind: kindPadrao(moduloId, c?.tipo),
      sideMode: 'nao_se_aplica',
      safetyLevel: safetyLevel(moduloId, c?.tipo),
      // Sem passo a passo => aguarda o professor. Com passo a passo => sugestao minha.
      validationStatus: temPassos ? 'sugestao_nao_validada' : 'aguardando_validacao',
      sourceReference: SECAO_POR_MODULO[moduloId],
      ativo: true,
    })

    conteudos.push({
      itemId: id,
      passos: c?.passos ?? [],
      busca: c?.busca,
      // Deliberadamente vazios: viram perguntas ao professor.
      errosComuns: [],
      reacoes: [],
      notasSeguranca: [],
    })

    if (meta?.exige) {
      requisitos.set(`${posicao}|${meta.categoria}`, {
        posicao,
        categoria: meta.categoria,
        quantidade: meta.exige,
      })
    }
  }
}

// --- emite TS -------------------------------------------------------------

const j = (v) => JSON.stringify(v, null, 2).replace(/\n/g, '\n')

const ts = `/**
 * Curriculo da prova — seed versionado.
 *
 * GERADO por scripts/importar-legado.mjs a partir dos arquivos construidos nas
 * sessoes anteriores (conteudo.js, index.html, mapa-dados.js). A partir daqui e
 * editado a mao: os arquivos legados foram aposentados (ADR-013).
 *
 * IMPORTANTE: os passo a passo aqui sao SUGESTOES padrao de faixa azul, ainda
 * nao validadas pelo Prof. Joao Eduardo. Ver validationStatus de cada item.
 *
 * ${itens.length} itens · ${conteudos.filter((c) => c.passos.length).length} com passo a passo · ${conteudos.filter((c) => !c.passos.length).length} aguardando o professor
 */

import type { RequisitoProva, TechniqueContent, TechniqueItem } from '../domain/types'

export const ITENS: TechniqueItem[] = ${j(itens)}

export const CONTEUDOS: TechniqueContent[] = ${j(conteudos)}

/** Quantidades exigidas segundo o documento da prova — nao confirmadas pelo professor. */
export const REQUISITOS: RequisitoProva[] = ${j(
  [...requisitos.values()].map((r) => ({ ...r, validationStatus: 'aguardando_validacao' })),
)}
`

writeFileSync(SAIDA, ts)

// --- 10 aulas particulares ------------------------------------------------

/** "Grupo|Slot" -> id do item, para traduzir as chaves legadas das aulas. */
const ID_POR_CHAVE = new Map()
for (const { grupo, itens: slots } of GRUPOS) {
  for (const s of slots) ID_POR_CHAVE.set(`${grupo}|${s}`, `${slug(grupo)}--${slug(s)}`)
}

const chavesOrfas = []
const aulas = AULAS10.map((a) => ({
  numero: a.n,
  tema: a.tema,
  foco: a.foco,
  itemIds: (a.keys ?? []).map((k) => {
    const id = ID_POR_CHAVE.get(k)
    if (!id) chavesOrfas.push(k)
    return id
  }),
}))
if (chavesOrfas.length) throw new Error(`chaves de aula sem item: ${chavesOrfas.join(', ')}`)

writeFileSync(
  resolve(import.meta.dirname, '../src/seed/aulas.ts'),
  `/**
 * Pauta das 10 aulas particulares — o motor de validacao do conteudo.
 *
 * GERADO por scripts/importar-legado.mjs. Agrupadas por familia de posicao (nao
 * por contagem), do jeito que uma aula particular flui: a cadeia de ataques de
 * uma guarda inteira em vez de tecnicas isoladas.
 *
 * Cada aula traz os itens a cobrir. As correcoes do professor sao registradas
 * fora daqui, em \`ValidacaoDoProfessor\` (src/domain/validacao.ts) — a unica
 * forma de um item chegar a "validado pelo professor".
 *
 * Estas 10 aulas cobrem apenas as Secoes 4 e 5. Os 25 itens de Fundamentos,
 * Defesa Pessoal e Quedas sao validados na aula regular de segunda e quarta
 * (origem 'aula_regular'), por decisao de planejamento.
 */

import type { AulaParticular } from '../domain/types'

export const AULAS: AulaParticular[] = ${j(aulas)}
`,
)

// --- teoria ---------------------------------------------------------------

writeFileSync(
  resolve(import.meta.dirname, '../src/seed/teoria.ts'),
  `/**
 * Cartoes de teoria (valores, filosofia, historia, pontuacao, juramento).
 *
 * GERADO por scripts/importar-legado.mjs a partir dos flashcards construidos
 * antes. Os \`validationStatus\` seguem o spec 12: apenas os 5 valores eticos
 * vem literalmente do PDF; historia, biografia e pontuacao ficam aguardando
 * confirmacao do professor.
 */

import type { Card } from '../domain/types'

export const CARTOES_TEORIA: Card[] = ${j(
    TEORIA.map((t, i) => ({
      id: `teoria-${i + 1}`,
      type: 'teoria',
      prompt: t.q,
      resposta: t.a.split('\n').filter(Boolean),
      // Somente os 5 valores estao explicitos no PDF (spec 12).
      validationStatus: i === 0 ? 'validado_pelo_professor' : 'aguardando_validacao',
      ativo: true,
    })),
  )}
`,
)

console.log(`aulas: ${aulas.length} (${aulas.reduce((s, a) => s + a.itemIds.length, 0)} itens referenciados)`)
console.log(`cartoes de teoria: ${TEORIA.length}`)
console.log(`itens: ${itens.length}`)
console.log(`com passo a passo: ${conteudos.filter((c) => c.passos.length).length}`)
console.log(`sem passo a passo: ${conteudos.filter((c) => !c.passos.length).length}`)
console.log(`requisitos "exige N": ${requisitos.size}`)
console.log(`escrito em ${SAIDA}`)

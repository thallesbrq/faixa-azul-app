/**
 * Monta a pasta que vai para o Firebase Hosting.
 *
 * DUAS APLICACOES, UMA ORIGEM (ADR-015, decisao 9):
 *
 *   site/           <- app do aluno (PWA, offline)
 *   site/central/   <- Central do Aluno (desktop, so online)
 *
 * A mesma origem e o que da UMA sessao em vez de duas: a sessao do Firebase mora
 * em `localStorage`, que e particionado por origem — dois sites do Hosting
 * exigiriam dois logins do mesmo professor.
 *
 * POR QUE UM SCRIPT E NAO `outDir` cruzado: apontar o build da central para
 * dentro de `apps/aluno/dist` faria um app escrever na pasta do outro, e a ordem
 * dos builds passaria a importar (o `emptyOutDir` do aluno apagaria a central).
 * Montar depois deixa cada build dono da sua pasta.
 *
 * ESTE SCRIPT VERIFICA, e nao apenas copia. Duas armadilhas conhecidas desta
 * arquitetura falham em SILENCIO se ninguem olhar:
 *
 * 1. o service worker do aluno tem escopo `/` e responderia `/central/` com o
 *    index do app do aluno, servido do cache;
 * 2. a central publicada com base relativa quebra em qualquer URL com mais de
 *    um nivel.
 *
 * Nos dois casos nao ha erro: abre a tela errada, ou abre em branco. Entao a
 * verificacao acontece aqui, antes de subir, e o script FALHA em vez de avisar.
 */

import { cp, mkdir, readFile, rm, access } from 'node:fs/promises'
import { join } from 'node:path'

const RAIZ = new URL('..', import.meta.url).pathname
const ALUNO = join(RAIZ, 'apps/aluno/dist')
const CENTRAL = join(RAIZ, 'apps/central/dist')
const SITE = join(RAIZ, 'site')

async function existe(caminho) {
  try {
    await access(caminho)
    return true
  } catch {
    return false
  }
}

function falhar(mensagem) {
  console.error(`\n✖ ${mensagem}\n`)
  process.exit(1)
}

// --- 1. os dois builds precisam existir -----------------------------------

for (const [nome, dir] of [
  ['app do aluno', ALUNO],
  ['central', CENTRAL],
]) {
  if (!(await existe(join(dir, 'index.html')))) {
    falhar(`Build do ${nome} nao encontrado em ${dir}. Rode os builds antes.`)
  }
}

// --- 2. a lista de negacao do service worker sobreviveu ao build? ---------

// Sem isto, `/central/` abre o app do aluno a partir do cache. A checagem e no
// ARQUIVO GERADO, e nao na configuracao: o que vale e o que foi para o disco.
const swArquivos = ['sw.js', 'service-worker.js']
let sw = null
for (const nome of swArquivos) {
  if (await existe(join(ALUNO, nome))) {
    sw = await readFile(join(ALUNO, nome), 'utf8')
    break
  }
}
if (sw === null) {
  falhar(`Service worker nao encontrado no build do aluno (${swArquivos.join(' ou ')}).`)
}
/**
 * Procura a REGRA, e nao a palavra.
 *
 * A primeira versao testava `sw.includes('central')`. Passava — mas passaria
 * tambem se "central" aparecesse num nome de arquivo, numa URL de cache ou em
 * qualquer string do bundle. Um teste que pode passar pelo motivo errado nao
 * protege nada: ele so cria a impressao de que alguem conferiu.
 *
 * O workbox emite a lista minificada como `denylist:[/^\/central\//]`. Procurar
 * o par denylist + o padrao amarra o teste ao efeito, e nao ao vocabulario.
 */
const temDenylist = /denylist:\s*\[[^\]]*\\\/central\\\//.test(sw)
if (!temDenylist) {
  falhar(
    'O service worker do app do aluno NAO tem a lista de negacao de /central/.\n' +
      '  Sem ela, abrir /central/ carrega o app do aluno servido do cache, sem erro.\n' +
      '  Ver navigateFallbackDenylist em apps/aluno/vite.config.ts.',
  )
}

// --- 3. a central foi publicada com base absoluta? ------------------------

const indexCentral = await readFile(join(CENTRAL, 'index.html'), 'utf8')
if (!indexCentral.includes('/central/')) {
  falhar(
    'O index.html da central nao referencia /central/ nos assets.\n' +
      "  Base relativa quebra em URLs com mais de um nivel. Ver base em apps/central/vite.config.ts.",
  )
}

// --- 4. montar ------------------------------------------------------------

await rm(SITE, { recursive: true, force: true })
await mkdir(SITE, { recursive: true })
await cp(ALUNO, SITE, { recursive: true })
await cp(CENTRAL, join(SITE, 'central'), { recursive: true })

console.log('✓ site/ montado: app do aluno na raiz, central em /central/')
console.log('  service worker com /central/ fora do escopo de navegacao: ok')
console.log('  central com base absoluta: ok')

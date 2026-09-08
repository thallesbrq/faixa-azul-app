/**
 * Semeia o cadastro e o estado de um aluno de DEMONSTRACAO em producao.
 *
 * POR QUE ISTO EXISTE E POR QUE NAO E UM ATALHO. O ADR-017 (decisao 5) recusou
 * duas formas de "mockar o Floki":
 *
 *   - afrouxar as regras para o gestor escrever em `estados` destruiria a UNICA
 *     parede que dispensa merge entre aluno e professor;
 *   - sintetizar numeros na tela da Central mostraria valor inventado com
 *     APARENCIA DE MEDIDO, na tela do professor.
 *
 * O caminho honesto e este: o estado e escrito UMA VEZ, por fora do app, com
 * credencial de administrador, e o cadastro nasce com `demo: true` — que a
 * Central exibe como etiqueta ao lado do nome. Os numeros sao reais no sentido
 * de que saem do mesmo gerador de baralho e do mesmo modelo de revisao que o app
 * usa; o que nao e real e o treino no tatame.
 *
 * O `uid` NAO E DE UMA CONTA DE AUTENTICACAO. Nao existe usuario no Firebase Auth
 * para o Floki, e por isso ninguem consegue entrar como ele. Isso e deliberado:
 * criar conta exige um e-mail de verdade, e um e-mail de verdade e do dono. O
 * efeito pratico e que o Floki aparece na Central com progresso e NAO tem a visao
 * do app do aluno — que e exatamente o que foi pedido ("ter a visão do meu
 * progresso"). Se um dia ele for estudar de verdade, cria-se a conta e este
 * documento e apagado ou migrado.
 *
 * USA O GERADOR DE BARALHO DE VERDADE (`gerarBaralho`) em vez de montar ids de
 * cartao a mao. Ids inventados produziriam revisoes que nao casam com nenhum
 * cartao: `progressoPorItem` indexa por `cardId`, entao o resultado seria um
 * aluno com 200 revisoes e 0% de progresso — sem erro nenhum, e com aparencia de
 * bug do app em vez de erro deste arquivo.
 *
 * Rodar:  npx vite-node scripts/semear-aluno-demo.ts
 */

import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { gerarBaralho } from '../packages/core/src/domain/cards'
import { CURRICULO_AZUL } from '../packages/core/src/seed/curriculos'
import { ACERTOS_PARA_DOMINIO } from '../packages/core/src/application/progresso'
import { blocoDaPosicao } from '../packages/core/src/domain/taxonomia'
import type { ReviewState } from '../packages/core/src/domain/types'

const PROJETO = 'rg-centraldoaluno'
const ACADEMIA = 'rilion-garopaba'

/**
 * O aluno de demonstracao. `uid` sintetico e com prefixo `demo-` de proposito:
 * quem for olhar o banco precisa distinguir isto de um uid do Firebase Auth
 * (que e opaco, 28 caracteres) sem ter de consultar nada.
 */
const ALUNO = {
  uid: 'demo-floki-fenrrirson',
  nome: 'Floki Fenrrirson',
  turma: 'RGI',
  /** A prova que ele persegue. Thalles tem 3 graus. */
  meta: '3grau',
  /**
   * O curriculo que ele treina: AZUL, e nao `1grau`.
   *
   * ISTO FOI CONFERIDO E CORRIGIDO EM PRODUCAO. Com `estuda: '1grau'` o
   * curriculo passa a ser medido por ATESTADO — e sem atestacao nenhuma a coluna
   * mostra 0%, nao os 57% de dominio de cartao que ele de fato tem. O conteudo
   * das 35 aulas esta DENTRO do curriculo de azul (fundamentos, quedas, defesa
   * pessoal, guarda fechada, meia guarda), entao `azul` mostra tudo o que ele
   * treina; `1grau` mostraria so o julgamento do professor, que ainda nao houve.
   */
  estuda: 'azul',
  /** Ligado para testar a feature — ele contratou particulares. */
  temParticulares: true,
  demo: true,
}

/**
 * O PERFIL DO ALUNO, e nao uma distribuicao aleatoria.
 *
 * "Considere para o Floki todo o curriculo das 35 aulas completo, inclusive com
 * defesa pessoal" — entao TODO O CONTEUDO DAS 35 AULAS entra como `dominado`. O
 * que fica fraco e o que as 35 aulas nao cobrem: as guardas abertas do exame de
 * azul e o complexo moderno, que sao conteudo de faixa azul de verdade.
 *
 * Uma distribuicao uniforme produziria uma tela bonita e sem informacao nenhuma:
 * o professor nao teria o que ler nela. O contraste E o dado.
 *
 * O QUE AS 35 AULAS COBREM (`dominado`):
 * - fundamentos: base, movimentacao, rolamento, fuga de quadril
 * - quedas: as cinco, com ukemi
 * - defesa pessoal: as onze — dadas na aula 00 experimental
 * - guarda fechada e meia guarda: inteiras, os tres graus de treino
 * - saidas: das posicoes que o 1o grau cobra (montada, 100kg, costas)
 *
 * O QUE ELAS NAO COBREM:
 * - guardas abertas (gancho, aranha, dela riva, laco): `visto`, aparecem na aula
 * - complexo moderno: `nao_iniciado`, e conteudo de azul
 */
const NIVEL_POR_BLOCO: Record<string, 'dominado' | 'aprendendo' | 'visto' | 'nao_iniciado'> = {
  fundamentos: 'dominado',
  quedas: 'dominado',
  fechada: 'dominado',
  meia: 'dominado',
  saidas: 'dominado',
  /**
   * DEFESA PESSOAL ENTRA COMO `dominado` E ISSO MEXE EM UM CARTAO SO.
   *
   * Os 11 itens nao tem cartao proprio (ADR-012: o app nao ensina defesa contra
   * golpe por texto). O modulo tem UM cartao de reconhecimento — "liste os 11
   * itens que a prova exige" — e ele nao carrega `itemId`, entao cai no ramo
   * "cartao sem item" mais abaixo. Marcar aqui documenta a intencao; o efeito
   * numerico vem daquele ramo.
   *
   * Consequencia honesta: nao existe forma de o app registrar que ele EXECUTA
   * defesa de soco. Isso e atestacao do professor, nao cartao — e e exatamente
   * por isso que o 1o grau e medido por atestado.
   */
  'defesa-pessoal': 'dominado',
  gancho: 'visto',
  aranha: 'visto',
  'dela-riva': 'visto',
  laco: 'visto',
  aberta: 'visto',
  complexo: 'nao_iniciado',
}

const DIA_MS = 86_400_000

/**
 * Uma revisao no nivel pedido, com datas que NAO decaem.
 *
 * `dominioDoCartao` recua um nivel quando `agora - ultimaRevisaoAt` passa de
 * `ultimoIntervaloDias * 2`. Se eu escolhesse datas ao acaso, metade dos cartoes
 * decairia e o dado nao mostraria o perfil acima — e o desvio pareceria bug do
 * calculo, nao deste arquivo. Por isso a ultima revisao fica sempre DENTRO da
 * janela do intervalo.
 */
function revisao(
  cardId: string,
  nivel: 'dominado' | 'aprendendo' | 'visto',
  agora: Date,
  desvio: number,
): ReviewState {
  const intervalo = nivel === 'dominado' ? 9 : nivel === 'aprendendo' ? 4 : 1
  // Metade do intervalo: bem dentro da janela, sem parecer que tudo foi revisado
  // no mesmo instante.
  const diasAtras = Math.max(0, Math.round(intervalo / 2) - (desvio % 2))
  const ultima = new Date(agora.getTime() - diasAtras * DIA_MS)
  const proxima = new Date(ultima.getTime() + intervalo * DIA_MS)

  return {
    cardId,
    side: 'unico',
    dueAt: proxima.toISOString(),
    ultimoIntervaloDias: intervalo,
    acertosConsecutivos:
      nivel === 'dominado' ? ACERTOS_PARA_DOMINIO + (desvio % 2) : nivel === 'aprendendo' ? 1 + (desvio % 2) : 0,
    lapses: nivel === 'visto' ? 1 + (desvio % 2) : 0,
    repeticoes: nivel === 'dominado' ? 5 + (desvio % 3) : nivel === 'aprendendo' ? 3 : 2,
    ultimaRevisaoAt: ultima.toISOString(),
  }
}

function montarEstado(agora: Date) {
  const itens = CURRICULO_AZUL.itens.filter((i) => i.ativo)
  const baralho = gerarBaralho({
    itens,
    conteudos: CURRICULO_AZUL.conteudos,
    requisitos: CURRICULO_AZUL.requisitos,
    cartoesTeoria: CURRICULO_AZUL.cartoesTeoria,
  })
  const posicaoPorItem = new Map(itens.map((i) => [i.id, i.posicao]))

  const revisoes: ReviewState[] = []
  let n = 0
  for (const c of baralho) {
    /**
     * Cartao SEM item (requisito da prova, teoria, reconhecimento de defesa
     * pessoal) entra como `dominado`: os tres sao conteudo das 35 aulas —
     * quantas raspagens a prova exige, os termos, e a lista de defesa pessoal.
     *
     * Era `aprendendo`, e mudou junto com o pedido de "35 aulas completo": o
     * cartao de reconhecimento de defesa pessoal e o UNICO caminho que o app tem
     * para representar aquele modulo, e deixa-lo pela metade contradiria o
     * pedido sem que nada na tela dissesse por que.
     */
    const posicao = c.itemId ? posicaoPorItem.get(c.itemId) : undefined
    const bloco = posicao ? blocoDaPosicao(posicao) : null
    const nivel = bloco ? NIVEL_POR_BLOCO[bloco] : 'dominado'
    if (nivel === 'nao_iniciado') continue
    revisoes.push(revisao(c.id, nivel, agora, n++))
  }

  return {
    versao: 2,
    perfil: { id: ALUNO.uid, nome: ALUNO.nome, papel: 'aluno', academiaId: ACADEMIA },
    planoExame: {
      academia: 'Rilion Gracie Garopaba',
      professor: 'Joao Eduardo Goncalves',
      dataAlvo: '2026-12-12T12:00:00.000Z',
      provisoria: true,
      criadoEm: agora.toISOString(),
    },
    config: { limiteDiario: 20, novosPorDia: 8 },
    revisoes,
    // VAZIOS DE PROPOSITO. `eventos` e o log append-only de cada tentativa:
    // fabricar 200 eventos criaria um historico de estudo que nunca aconteceu, e
    // ele e o que o ADR-010 trata como evidencia. As revisoes sao ESTADO (onde o
    // aluno esta); os eventos seriam HISTORICO (o que ele fez), e semear
    // historico e mentir com mais detalhe.
    eventos: [],
    validacoes: [],
    aulas: [],
    itens: [],
    duvidas: [],
    sessoes: [],
    indicacoes: [],
  }
}

// ---------------------------------------------------------------------------
// Firestore REST: valores TIPADOS
// ---------------------------------------------------------------------------
/**
 * A API REST do Firestore nao aceita JSON solto: cada valor vai etiquetado
 * (`stringValue`, `integerValue`, `mapValue`, ...). Converter a mao seria o
 * caminho mais rapido para um campo gravado como texto onde o app espera numero
 * — e isso NAO daria erro: o app leria `NaN` e mostraria tela vazia.
 */
type Valor = Record<string, unknown>

function tipar(v: unknown): Valor {
  if (v === null || v === undefined) return { nullValue: null }
  if (typeof v === 'string') return { stringValue: v }
  if (typeof v === 'boolean') return { booleanValue: v }
  if (typeof v === 'number') {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }
  }
  if (Array.isArray(v)) {
    return { arrayValue: { values: v.map(tipar) } }
  }
  if (typeof v === 'object') {
    const fields: Record<string, Valor> = {}
    for (const [k, valor] of Object.entries(v as Record<string, unknown>)) {
      fields[k] = tipar(valor)
    }
    return { mapValue: { fields } }
  }
  throw new Error(`valor de tipo nao suportado: ${typeof v}`)
}

function documento(obj: Record<string, unknown>) {
  const fields: Record<string, Valor> = {}
  for (const [k, v] of Object.entries(obj)) fields[k] = tipar(v)
  return { fields }
}

/**
 * Token de acesso a partir da credencial que o `firebase login` ja guardou.
 *
 * NAO PEDE SENHA E NAO GUARDA SEGREDO NOVO: le o refresh token do configstore do
 * firebase-tools — o mesmo que o CLI usa para implantar — e troca por um token de
 * uma hora. Se `firebase login` nao tiver sido feito, falha dizendo isso, em vez
 * de gravar metade dos documentos.
 */
async function tokenDeAcesso(): Promise<string> {
  const caminho = join(homedir(), '.config', 'configstore', 'firebase-tools.json')
  let cfg: { tokens?: { refresh_token?: string } }
  try {
    cfg = JSON.parse(readFileSync(caminho, 'utf8'))
  } catch {
    throw new Error(`nao achei a credencial do firebase-tools em ${caminho}. Rode: npx firebase login`)
  }
  const refresh = cfg.tokens?.refresh_token
  if (!refresh) throw new Error('credencial sem refresh_token. Rode: npx firebase login')

  // O client id publico do firebase-tools. Nao e segredo: ele vai no binario do
  // CLI, que e open source.
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
  return j.access_token
}

async function gravar(token: string, caminho: string, dados: Record<string, unknown>) {
  const url =
    `https://firestore.googleapis.com/v1/projects/${PROJETO}/databases/(default)/documents/${caminho}` +
    `?${Object.keys(dados)
      .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
      .join('&')}`
  const r = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(documento(dados)),
  })
  if (!r.ok) throw new Error(`PATCH ${caminho} falhou: ${r.status} ${await r.text()}`)
}

async function main() {
  const agora = new Date()
  const estado = montarEstado(agora)
  const token = await tokenDeAcesso()

  await gravar(token, `pessoas/${ALUNO.uid}`, {
    nome: ALUNO.nome,
    papel: 'aluno',
    academiaId: ACADEMIA,
    ativo: true,
    turma: ALUNO.turma,
    meta: ALUNO.meta,
    estuda: ALUNO.estuda,
    temParticulares: ALUNO.temParticulares,
    demo: ALUNO.demo,
    criadoEm: agora.toISOString(),
  })

  await gravar(token, `estados/${ALUNO.uid}`, {
    dados: estado,
    versao: 1,
    atualizadoEm: agora.toISOString(),
  })

  /**
   * O RESUMO E ESCRITO A MAO AQUI, e nao derivado, porque `resumoDoAluno`
   * precisa de datas de importacao/exportacao que nao existem para um estado que
   * nunca passou por arquivo. Os campos abaixo sao os que a Central le, e os
   * numeros CASAM com o estado acima — `revisoes.length` e a mesma contagem.
   */
  await gravar(token, `resumos/${ALUNO.uid}`, {
    nome: ALUNO.nome,
    aulasFeitas: 0,
    duvidasAbertas: 0,
    revisoes: estado.revisoes.length,
    sincronizadoEm: agora.toISOString(),
  })

  const porNivel = new Map<string, number>()
  for (const r of estado.revisoes) {
    const n =
      r.acertosConsecutivos >= ACERTOS_PARA_DOMINIO
        ? 'dominado'
        : r.acertosConsecutivos > 0
          ? 'aprendendo'
          : 'visto'
    porNivel.set(n, (porNivel.get(n) ?? 0) + 1)
  }

  console.log(`✓ ${ALUNO.nome} semeado em ${ALUNO.turma} (uid ${ALUNO.uid})`)
  console.log(`  ${estado.revisoes.length} revisões: ${[...porNivel].map(([k, v]) => `${v} ${k}`).join(', ')}`)
  console.log(`  meta ${ALUNO.meta} · estuda ${ALUNO.estuda} · particulares ${ALUNO.temParticulares}`)
  console.log('  demo: true — a Central mostra a etiqueta "demo" ao lado do nome')
}

main().catch((e) => {
  console.error(`✗ ${(e as Error).message}`)
  process.exit(1)
})

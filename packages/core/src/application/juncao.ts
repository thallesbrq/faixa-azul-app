/**
 * Juncao de dois estados do MESMO aluno, e o arquivo que os transporta.
 *
 * O CENARIO. O aluno estuda no aparelho dele; o professor programa as aulas na
 * central dele. Os dois exportam, trocam o arquivo, e cada lado junta. Nao ha
 * servidor, entao nao ha como impedir que mexam ao mesmo tempo — a juncao tem
 * de ser segura em vez de rara. As regras vivem em ../domain/merge; aqui elas
 * sao aplicadas a cada colecao do estado.
 *
 * POR QUE ARQUIVO E NAO LINK. O link da GRADE tem 183 caracteres e cabe numa
 * mensagem. O estado completo de um aluno com tres meses de uso da 161 KB;
 * comprimido e em base64 ainda sao ~18 mil caracteres, que nenhum aplicativo de
 * mensagem entrega inteiro. Medido, nao estimado.
 *
 * O QUE NUNCA E MESCLADO, e o erro que isso evita:
 *
 * - `perfil`. Ele diz de QUEM e o aparelho. Mesclar faria o professor virar o
 *   aluno ao importar o arquivo dele — o destino sempre mantem o seu.
 * - `config`. Limite diario e cartoes novos por dia sao preferencia de quem usa
 *   AQUELE aparelho, nao dado do aluno.
 *
 * Modulo de aplicacao: conhece a forma do estado, mas continua sem React e sem
 * I/O — quem le e escreve arquivo e a UI.
 */

import {
  contar,
  escolherPorDono,
  houveMudanca,
  mesclarCampos,
  relatorioVazio,
  unirLogs,
  unirPorChave,
} from '../domain/merge'
import type { RelatorioDeJuncao } from '../domain/merge'
import type { Origem } from '../domain/procedencia'
import { DONO_DA_AULA, DONO_DO_ITEM } from '../persistence/repositorio'
import type { AlteracaoAula, AlteracaoItem, EstadoPersistido } from '../persistence/repositorio'
import type { ReviewState } from '../domain/types'

/** Marca do formato, para o import recusar arquivo que nao e deste app. */
export const FORMATO = 'faixa-azul/estado'

export interface Envelope {
  formato: typeof FORMATO
  /** Versao do ESTADO dentro, para a importacao poder migrar. */
  versaoDoEstado: number
  exportadoEm: string
  exportadoPor: Origem
  /** Nome de quem exportou, so para a central mostrar algo legivel. */
  nome: string
  estado: EstadoPersistido
}

export function empacotar(estado: EstadoPersistido, agora: Date): Envelope {
  return {
    formato: FORMATO,
    versaoDoEstado: estado.versao,
    exportadoEm: agora.toISOString(),
    exportadoPor: estado.perfil.papel,
    nome: estado.perfil.nome,
    estado,
  }
}

/**
 * Nome de arquivo legivel para o professor achar no meio de vinte.
 *
 * Sem o nome da pessoa, vinte arquivos chamados "estado.json" na pasta de
 * downloads sao indistinguiveis — e renomear vinte arquivos a mao e exatamente
 * o tipo de atrito que faz alguem abandonar o processo.
 */
export function nomeDoArquivo(estado: EstadoPersistido, agora: Date): string {
  const limpo = (estado.perfil.nome || 'aluno')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  return `faixa-azul-${limpo || 'aluno'}-${agora.toISOString().slice(0, 10)}.json`
}

export type MotivoDaRecusa =
  | 'formato'
  | 'outro-aluno'
  | 'versao-futura'

export const EXPLICACAO_DA_RECUSA: Record<MotivoDaRecusa, string> = {
  formato: 'O arquivo não parece uma exportação do Faixa Azul.',
  'outro-aluno':
    'Este arquivo é de outro aluno. Importar misturaria o progresso de duas pessoas — use a central para acompanhar vários alunos.',
  'versao-futura':
    'O arquivo foi gerado por uma versão mais nova do app. Atualize antes de importar.',
}

export type Aberto =
  | { ok: true; envelope: Envelope }
  | { ok: false; motivo: MotivoDaRecusa }

/**
 * Le o envelope e RECUSA em vez de adivinhar.
 *
 * `versaoAtual` e a versao de estado que este app entende. Arquivo mais ANTIGO
 * e aceito e migrado por quem chama — com alunos entrando aos poucos, versoes
 * convivem, e recusar o antigo deixaria o aluno de fora ate ele atualizar.
 * Arquivo mais NOVO e recusado: este app nao sabe o que ha nele.
 */
export function abrirEnvelope(
  texto: string,
  versaoAtual: number,
  /**
   * Id do dono deste aparelho, quando o destino so aceita o PROPRIO aluno.
   *
   * O app do aluno passa o seu: importar o arquivo de outra pessoa misturaria
   * dois progressos num estado so, e nao ha como separar depois. A central do
   * professor NAO passa nada — ela existe justamente para receber de varios, e
   * guarda cada um em seu lugar.
   */
  perfilEsperado?: string,
): Aberto {
  let bruto: unknown
  try {
    bruto = JSON.parse(texto)
  } catch {
    return { ok: false, motivo: 'formato' }
  }

  const e = bruto as Partial<Envelope>
  if (e?.formato !== FORMATO || typeof e.versaoDoEstado !== 'number' || !e.estado) {
    return { ok: false, motivo: 'formato' }
  }
  if (!Array.isArray(e.estado.eventos) || !e.estado.perfil) {
    return { ok: false, motivo: 'formato' }
  }
  if (e.versaoDoEstado > versaoAtual) return { ok: false, motivo: 'versao-futura' }
  if (perfilEsperado !== undefined && e.estado.perfil.id !== perfilEsperado) {
    return { ok: false, motivo: 'outro-aluno' }
  }

  return { ok: true, envelope: e as Envelope }
}

/** Chave composta do estado de revisao: um cartao tem um estado por lado. */
function chaveDaRevisao(r: ReviewState): string {
  return `${r.cardId}|${r.side}`
}

export interface ResultadoDaJuncao {
  estado: EstadoPersistido
  relatorio: RelatorioDeJuncao
  mudou: boolean
}

/**
 * Junta `recebido` dentro de `local`, preservando a identidade de `local`.
 *
 * A operacao e COMUTATIVA no conteudo: aluno e professor, partindo do mesmo par
 * de arquivos, chegam ao mesmo resultado. Isso e o que impede os dois de
 * divergirem devagar a cada troca — e depende de `maisRecente` nao olhar a
 * ordem dos argumentos (ver ../domain/procedencia).
 */
export function mesclarEstados({
  local,
  recebido,
}: {
  local: EstadoPersistido
  recebido: EstadoPersistido
}): ResultadoDaJuncao {
  const r = relatorioVazio()

  const contarNovos = <T>(antes: readonly T[], depois: readonly T[], nome: string) => {
    const n = depois.length - antes.length
    if (n > 0) contar(r.novos, nome, n)
  }

  // --- 1. LOGS: uniao por id. Conflito impossivel, nada se perde. ---
  const eventos = unirLogs(local.eventos, recebido.eventos)
  const validacoes = unirLogs(local.validacoes, recebido.validacoes)
  const sessoes = unirLogs(local.sessoes, recebido.sessoes)
  const duvidas = unirLogs(local.duvidas, recebido.duvidas)

  contarNovos(local.eventos, eventos, 'revisões')
  contarNovos(local.validacoes, validacoes, 'validações')
  contarNovos(local.sessoes, sessoes, 'treinos')
  contarNovos(local.duvidas, duvidas, 'dúvidas')

  // --- 2. AGENDA DE REVISAO: dono e o aluno. ---
  // Nao e recalculada dos eventos de proposito: `aplicarRevisao` depende do
  // horizonte NO MOMENTO da revisao e o evento nao guarda o intervalo
  // resultante, entao recomputar hoje inventaria uma agenda que nunca existiu.
  const revisoes = unirPorChave(local.revisoes, recebido.revisoes, chaveDaRevisao, (l) => l)

  // --- 3. AULAS: dono POR CAMPO. A grade e do professor, "aula feita" e do aluno. ---
  const aulas = unirPorChave(
    local.aulas,
    recebido.aulas,
    (a) => String(a.numero),
    (l, rec) => {
      const j = mesclarCampos<AlteracaoAula, keyof typeof DONO_DA_AULA>(
        l,
        rec,
        DONO_DA_AULA,
        l.marcas,
        rec.marcas,
      )
      if (j.substituidos.length > 0) contar(r.substituidos, 'aulas')
      return { ...j.valor, marcas: j.marcas }
    },
  )

  // --- 4. ITENS: tudo do aluno. A indicacao do professor vive separada. ---
  const itens = unirPorChave(
    local.itens,
    recebido.itens,
    (i) => i.itemId,
    (l, rec) => {
      const j = mesclarCampos<AlteracaoItem, keyof typeof DONO_DO_ITEM>(
        l,
        rec,
        DONO_DO_ITEM,
        l.marcas,
        rec.marcas,
      )
      if (j.substituidos.length > 0) contar(r.substituidos, 'itens')
      return { ...j.valor, marcas: j.marcas }
    },
  )

  // --- 5. INDICACOES: registro de dono unico, o professor. ---
  const indicacoes = unirPorChave(
    local.indicacoes,
    recebido.indicacoes,
    (i) => i.itemId,
    (l, rec) => {
      const escolhido = escolherPorDono(l, rec, 'professor')
      if (escolhido !== l) contar(r.substituidos, 'indicações do professor')
      return escolhido
    },
  )
  contarNovos(local.indicacoes, indicacoes, 'indicações do professor')

  return {
    estado: {
      ...local,
      // `perfil` e `config` NAO entram na juncao — ver o cabecalho.
      eventos,
      validacoes,
      sessoes,
      duvidas,
      revisoes,
      aulas,
      itens,
      indicacoes,
    },
    relatorio: r,
    mudou: houveMudanca(r),
  }
}

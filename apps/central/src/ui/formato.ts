/**
 * Formatacao e cor — num lugar so.
 *
 * A REGRA DE COR MORA AQUI E NAO NOS COMPONENTES. Ela e usada em quatro lugares
 * (cartao, rosca, barra, celula da tabela), e espalhada seria a forma mais facil
 * de a rosca discordar da tabela sobre o mesmo aluno. O limiar em si e do
 * dominio: `faixaDaPontuacao` (ADR-015, decisao 4). Aqui so traduzimos faixa em
 * variavel CSS.
 */

import type { FaixaDeCor } from '@faixa-azul/core/application/progresso'

/**
 * Cor de uma faixa.
 *
 * As tres sao as semanticas do app, escolhidas para passar contraste como TEXTO
 * (RNF-04) — e nao as da referencia visual, mais vibrantes, que reprovariam. O
 * percentual e numero, e numero precisa de contraste; bolinha nao precisava.
 */
export function corDaFaixa(faixa: FaixaDeCor | null): string {
  if (faixa === 'alta') return 'var(--verde-sucesso)'
  if (faixa === 'media') return 'var(--amarelo-atencao)'
  if (faixa === 'baixa') return 'var(--vermelho-alerta)'
  // Sem faixa = sem numero. Cinza de texto secundario, e nao vermelho: ausencia
  // de dado nao e desempenho ruim.
  return 'var(--cor-texto-suave)'
}

/**
 * Percentual inteiro, ou `—`.
 *
 * `—` E NAO `0%`, e e a decisao 7 aparecendo na tela. Zero e um fato ("estudou e
 * esta em zero"); tracinho e a ausencia dele. Escrever `0%` onde nao ha dado
 * inventa um fato que ninguem mediu.
 */
export function porcento(v: number | null | undefined): string {
  if (typeof v !== 'number' || !Number.isFinite(v)) return '—'
  return `${Math.round(v * 100)}%`
}

export function numero(v: number | null | undefined): string {
  if (typeof v !== 'number' || !Number.isFinite(v)) return '—'
  return String(v)
}

/** Dias sem estudar, em palavras — a mesma linguagem da Torre do app. */
export function atividade(dias: number | null): string {
  if (dias === null) return 'sem nenhuma revisão'
  if (dias === 0) return 'estudou hoje'
  if (dias === 1) return 'estudou ontem'
  return `${dias} dias sem estudar`
}

export function horaCurta(d: Date | null): string {
  if (!d) return ''
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(d)
}

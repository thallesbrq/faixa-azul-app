/**
 * Navegacao principal.
 *
 * A tela de Duvidas foi removida por decisao do aluno: o fluxo real e ele
 * escolher as posicoes e validar com o Prof. Joao Eduardo, nao percorrer uma
 * lista de 173 perguntas. A validacao continua existindo — dentro do detalhe da
 * tecnica, onde a correcao do professor e registrada.
 */

import type { Papel } from '@faixa-azul/core/domain/papeis'
import { podeVerAcademia } from '@faixa-azul/core/domain/papeis'

export type Tela = 'aulas' | 'hoje' | 'curriculo' | 'simulado' | 'progresso' | 'perfil' | 'torre'

/**
 * A ORDEM AQUI E A ORDEM NA BARRA — e agora ela concorda com a tela que abre.
 *
 * Aulas passou para primeiro por decisao do aluno. Antes de mudar isto, Aulas era
 * a tela inicial mas aparecia em terceiro na barra: quem abrisse o app cairia
 * numa aba do meio, com a marca de ativo longe do canto onde o dedo espera. Era
 * uma incoerencia entre duas decisoes tomadas em momentos diferentes.
 *
 * A ordem do tipo `Tela` acompanha por leitura, nao por necessidade — a uniao nao
 * tem ordem semantica.
 */
const ABAS_DO_ALUNO: { id: Tela; rotulo: string; icone: string }[] = [
  { id: 'aulas', rotulo: 'Aulas', icone: '🥋' },
  { id: 'hoje', rotulo: 'Hoje', icone: '🎯' },
  { id: 'curriculo', rotulo: 'Currículo', icone: '📋' },
  { id: 'simulado', rotulo: 'Simulado', icone: '⏱️' },
  { id: 'progresso', rotulo: 'Progresso', icone: '📈' },
  { id: 'perfil', rotulo: 'Perfil', icone: '👤' },
]

/**
 * O PAPEL TROCA O APP, nao acrescenta uma aba.
 *
 * O professor nao esta se preparando para a prova: simulado, revisao do dia e
 * progresso pessoal nao servem para nada no aparelho dele. Manter as sete abas
 * deixaria cada uma com 53px no 375px e enterraria a Central — que e a unica
 * razao de ele abrir o app — no meio de telas que ele nunca usa.
 */
const ABAS_DO_PROFESSOR: { id: Tela; rotulo: string; icone: string }[] = [
  { id: 'torre', rotulo: 'Central', icone: '🗼' },
  { id: 'curriculo', rotulo: 'Currículo', icone: '📋' },
  { id: 'perfil', rotulo: 'Perfil', icone: '👤' },
]

/**
 * O ADMIN VE AS ABAS DO PROFESSOR, e nao um terceiro conjunto.
 *
 * A diferenca entre os dois papeis nao esta em O QUE se ve — os dois veem a
 * academia inteira — e sim em o que se pode ASSINAR (ADR-017, decisao 1). Um
 * terceiro conjunto de abas sugeriria uma tela que nao existe.
 *
 * `podeVerAcademia` em vez de `!== 'aluno'`: a pergunta que decide as abas e
 * exatamente essa, e escreve-la assim faz um papel futuro cair no lado certo
 * sem ninguem lembrar deste arquivo.
 */
export function abasDoPapel(papel: Papel) {
  return podeVerAcademia(papel) ? ABAS_DO_PROFESSOR : ABAS_DO_ALUNO
}

export function Navegacao({
  atual,
  aoTrocar,
  papel,
}: {
  atual: Tela
  aoTrocar: (t: Tela) => void
  papel: Papel
}) {
  return (
    <nav className="navegacao" aria-label="Navegação principal">
      {abasDoPapel(papel).map((aba) => (
        <button
          key={aba.id}
          className={`nav-item ${atual === aba.id ? 'nav-item--ativo' : ''}`}
          onClick={() => aoTrocar(aba.id)}
          aria-current={atual === aba.id ? 'page' : undefined}
        >
          <span aria-hidden="true">{aba.icone}</span>
          <span>{aba.rotulo}</span>
        </button>
      ))}
    </nav>
  )
}

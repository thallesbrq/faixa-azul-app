/**
 * Navegacao principal.
 *
 * A tela de Duvidas foi removida por decisao do aluno: o fluxo real e ele
 * escolher as posicoes e validar com o Prof. Joao Eduardo, nao percorrer uma
 * lista de 173 perguntas. A validacao continua existindo — dentro do detalhe da
 * tecnica, onde a correcao do professor e registrada.
 */

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

export function abasDoPapel(papel: 'aluno' | 'professor') {
  return papel === 'professor' ? ABAS_DO_PROFESSOR : ABAS_DO_ALUNO
}

export function Navegacao({
  atual,
  aoTrocar,
  papel,
}: {
  atual: Tela
  aoTrocar: (t: Tela) => void
  papel: 'aluno' | 'professor'
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

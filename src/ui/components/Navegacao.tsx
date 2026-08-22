/**
 * Navegacao principal.
 *
 * A tela de Duvidas foi removida por decisao do aluno: o fluxo real e ele
 * escolher as posicoes e validar com o Prof. Joao Eduardo, nao percorrer uma
 * lista de 173 perguntas. A validacao continua existindo — dentro do detalhe da
 * tecnica, onde a correcao do professor e registrada.
 */

export type Tela = 'hoje' | 'curriculo' | 'aulas' | 'simulado' | 'progresso'

const ABAS: { id: Tela; rotulo: string; icone: string }[] = [
  { id: 'hoje', rotulo: 'Hoje', icone: '🎯' },
  { id: 'curriculo', rotulo: 'Currículo', icone: '📋' },
  { id: 'aulas', rotulo: 'Aulas', icone: '🥋' },
  { id: 'simulado', rotulo: 'Simulado', icone: '⏱️' },
  { id: 'progresso', rotulo: 'Progresso', icone: '📈' },
]

export function Navegacao({ atual, aoTrocar }: { atual: Tela; aoTrocar: (t: Tela) => void }) {
  return (
    <nav className="navegacao" aria-label="Navegação principal">
      {ABAS.map((aba) => (
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

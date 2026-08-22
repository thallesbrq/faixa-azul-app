/** Navegacao principal — spec 8.1, reduzida as telas que existem hoje. */

export type Tela = 'hoje' | 'curriculo' | 'duvidas'

const ABAS: { id: Tela; rotulo: string; icone: string }[] = [
  { id: 'hoje', rotulo: 'Hoje', icone: '🎯' },
  { id: 'curriculo', rotulo: 'Currículo', icone: '📋' },
  { id: 'duvidas', rotulo: 'Dúvidas', icone: '❓' },
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

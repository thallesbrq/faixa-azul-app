/**
 * Navegacao principal.
 *
 * A tela de Duvidas foi removida por decisao do aluno: o fluxo real e ele
 * escolher as posicoes e validar com o Prof. Joao Eduardo, nao percorrer uma
 * lista de 173 perguntas. A validacao continua existindo — dentro do detalhe da
 * tecnica, onde a correcao do professor e registrada.
 */

export type Tela = 'aulas' | 'hoje' | 'curriculo' | 'simulado' | 'progresso'

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
const ABAS: { id: Tela; rotulo: string; icone: string }[] = [
  { id: 'aulas', rotulo: 'Aulas', icone: '🥋' },
  { id: 'hoje', rotulo: 'Hoje', icone: '🎯' },
  { id: 'curriculo', rotulo: 'Currículo', icone: '📋' },
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

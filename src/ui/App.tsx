import { useState } from 'react'
import { Hoje } from './screens/Hoje'
import { Revisao } from './screens/Revisao'
import { armazenamentoPersistente, useApp } from './useApp'
import './app.css'

type Tela = 'hoje' | 'revisao'

export function App() {
  const app = useApp()
  const [tela, setTela] = useState<Tela>('hoje')

  return (
    <div className="app">
      <header className="topo">
        <h1>Faixa Azul</h1>
        <span className="academia">Rilion Gracie Garopaba</span>
      </header>

      {tela === 'hoje' ? (
        <Hoje
          diasAteProva={app.diasAteProva}
          metaProvisoria={app.estado.planoExame.provisoria}
          fila={app.fila}
          revisadosHoje={app.revisadosHoje}
          taxaSemDica={app.taxaSemDica}
          risco={app.risco}
          modulos={app.modulos}
          armazenamentoPersistente={armazenamentoPersistente}
          aoComecar={() => setTela('revisao')}
        />
      ) : (
        <Revisao
          fila={app.fila.cartoes}
          aoAvaliar={({ cardId, rating, usouDica }) => app.registrar({ cardId, rating, usouDica })}
          aoSair={() => setTela('hoje')}
        />
      )}
    </div>
  )
}

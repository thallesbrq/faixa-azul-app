import { useState } from 'react'
import { Navegacao } from './components/Navegacao'
import type { Tela } from './components/Navegacao'
import { Curriculo } from './screens/Curriculo'
import { Duvidas } from './screens/Duvidas'
import { Hoje } from './screens/Hoje'
import { Revisao } from './screens/Revisao'
import { armazenamentoPersistente, useApp } from './useApp'
import './app.css'

export function App() {
  const app = useApp()
  const [tela, setTela] = useState<Tela>('hoje')
  const [revisando, setRevisando] = useState(false)

  return (
    <div className="app">
      <header className="topo">
        <h1>Faixa Azul</h1>
        <span className="academia">Rilion Gracie Garopaba</span>
      </header>

      {revisando ? (
        <Revisao
          fila={app.fila.cartoes}
          aoAvaliar={({ cardId, rating, usouDica }) => app.registrar({ cardId, rating, usouDica })}
          aoSair={() => setRevisando(false)}
        />
      ) : (
        <>
          {tela === 'hoje' && (
            <Hoje
              diasAteProva={app.diasAteProva}
              metaProvisoria={app.estado.planoExame.provisoria}
              fila={app.fila}
              revisadosHoje={app.revisadosHoje}
              taxaSemDica={app.taxaSemDica}
              risco={app.risco}
              modulos={app.modulos}
              armazenamentoPersistente={armazenamentoPersistente}
              aoComecar={() => setRevisando(true)}
            />
          )}

          {tela === 'curriculo' && (
            <Curriculo
              itens={app.itens}
              conteudos={app.conteudos}
              modulos={app.modulos}
              requisitos={app.requisitos}
              duvidas={app.duvidas}
              validacoes={app.estado.validacoes}
              aoValidar={app.registrarValidacao}
            />
          )}

          {tela === 'duvidas' && (
            <Duvidas duvidas={app.duvidas} itens={app.itens} aulas={app.aulas} aoAlterar={app.alterarDuvida} />
          )}

          <Navegacao atual={tela} aoTrocar={setTela} />
        </>
      )}
    </div>
  )
}

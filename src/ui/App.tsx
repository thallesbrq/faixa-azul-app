import { useState } from 'react'
import { Navegacao } from './components/Navegacao'
import type { Tela } from './components/Navegacao'
import { Aulas } from './screens/Aulas'
import { Curriculo } from './screens/Curriculo'
import { Montar } from './screens/Montar'
import { EXPLICACAO_DA_RECUSA } from '../domain/compartilhar'
import { Hoje } from './screens/Hoje'
import { Progresso } from './screens/Progresso'
import { Simulado } from './screens/Simulado'
import { Revisao } from './screens/Revisao'
import { Treino } from './screens/Treino'
import { armazenamentoPersistente, useApp } from './useApp'
import './app.css'

export function App() {
  const app = useApp()
  const [tela, setTela] = useState<Tela>('hoje')
  const [revisando, setRevisando] = useState(false)
  /**
   * Em variavel local so por legibilidade — o valor e usado varias vezes no
   * bloco abaixo.
   *
   * Nota de historia: isto comecou como contorno para o estreitamento da uniao
   * discriminada nao funcionar. A causa real nao era o TypeScript e sim o
   * projeto estar sem `strict` no tsconfig, o que desliga `strictNullChecks` e
   * enfraquece o estreitamento. Ligado o strict, o estreitamento passou a
   * funcionar e o contorno virou apenas estilo.
   */
  const recebida = app.recebida
  const [registrandoTreino, setRegistrandoTreino] = useState(false)

  return (
    <div className="app">
      <header className="topo">
        <img
          className="topo-logo"
          src={`${import.meta.env.BASE_URL}logo-rilion.png`}
          alt="Rilion Gracie Garopaba"
          width={125}
          height={96}
        />
        <div className="topo-textos">
          <h1>Faixa Azul</h1>
          <span className="academia">Preparação para a graduação</span>
        </div>
      </header>

      {/* Montagem recebida por link. Nunca aplicada sozinha: importar
          sobrescreve o arranjo atual, e a tela diz o que vai acontecer antes. */}
      {recebida && (
        <div className={recebida.ok ? 'card card--destaque' : 'card'}>
          {recebida.ok ? (
            <>
              <h3 className="detalhe-secao">Montagem recebida</h3>
              <p className="instrucao">
                Alguém compartilhou uma grade com <strong>{recebida.atribuidos} técnicas</strong>{' '}
                distribuídas. Importar <strong>substitui</strong> o arranjo que está no seu aparelho.
              </p>
              <div className="acoes">
                <button className="botao botao--principal" onClick={app.importarRecebida}>
                  Importar
                </button>
                <button className="botao botao--secundario" onClick={app.descartarRecebida}>
                  Descartar
                </button>
              </div>
            </>
          ) : (
            <>
              <h3 className="detalhe-secao">Não foi possível importar</h3>
              <p className="aviso">
                <span aria-hidden="true">⚠️</span>
                <span>{EXPLICACAO_DA_RECUSA[recebida.motivo]}</span>
              </p>
              <button className="botao botao--secundario" onClick={app.descartarRecebida}>
                Entendi
              </button>
            </>
          )}
        </div>
      )}

      {registrandoTreino ? (
        <Treino
          itens={app.itens}
          aoSalvar={(entrada) => {
            app.registrarSessao(entrada)
            setRegistrandoTreino(false)
          }}
          aoSair={() => setRegistrandoTreino(false)}
        />
      ) : revisando ? (
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
              resumoTreino={app.resumoTreino}
              aoRegistrarTreino={() => setRegistrandoTreino(true)}
            />
          )}

          {tela === 'curriculo' && (
            <Curriculo
              itens={app.itens}
              conteudos={app.conteudos}
              modulos={app.modulos}
              requisitos={app.requisitos}
              validacoes={app.estado.validacoes}
              anotacoes={app.anotacoes}
              aoAnotar={app.anotarItem}
              aoValidar={app.registrarValidacao}
            />
          )}

          {tela === 'aulas' && (
            <Aulas
              itens={app.itens}
              baralho={app.baralho}
              revisoes={app.estado.revisoes}
              aulas={app.aulas}
              validacoes={app.estado.validacoes}
              dificuldades={app.dificuldades}
              dataAlvo={app.estado.planoExame.dataAlvo}
              aoMarcarRealizada={app.marcarAulaRealizada}
              montar={
                <Montar
                  itens={app.itens}
                  baralho={app.baralho}
                  revisoes={app.estado.revisoes}
                  atribuicao={app.atribuicao}
                  anotacoes={app.anotacoes}
                  dificuldades={app.dificuldades}
                  aoAtribuir={app.atribuirItem}
                  aoDefinirAtribuicao={app.definirAtribuicao}
                  aoAnotar={app.anotarItem}
                  codigoDaMontagem={app.codigoDaMontagem.codigo}
                />
              }
            />
          )}

          {tela === 'simulado' && (
            <Simulado
              baralho={app.baralho}
              itens={app.itens}
              modulos={app.modulos}
              aoAvaliar={({ cardId, rating, usouDica }) => app.registrar({ cardId, rating, usouDica })}
            />
          )}

          {tela === 'progresso' && (
            <Progresso
              itens={app.itens}
              baralho={app.baralho}
              revisoes={app.estado.revisoes}
              modulos={app.modulos}
            />
          )}

          <Navegacao atual={tela} aoTrocar={setTela} />
        </>
      )}
    </div>
  )
}

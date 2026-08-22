/**
 * Progresso — RF-05.
 *
 * A tela existe para responder "estou pronto?" sem mentir. Por isso mostra dois
 * numeros lado a lado em vez de um: o que o aluno recupera de memoria e o que o
 * professor confirmou. Um numero unico esconderia justamente o risco maior
 * deste projeto — recuperar com seguranca a versao errada da tecnica.
 */

import { useMemo } from 'react'
import {
  gruposMaisFracos,
  progressoPorItem,
  progressoPorModulo,
  progressoPorPosicao,
  prontidao,
} from '../../application/progresso'
import type { NivelDominio, ProgressoDeGrupo } from '../../application/progresso'
import type { Card, Modulo, ReviewState, TechniqueItem } from '../../domain/types'

const ROTULO_NIVEL: Record<NivelDominio, string> = {
  nao_iniciado: 'não iniciado',
  visto: 'visto',
  aprendendo: 'aprendendo',
  dominado: 'dominado',
}

const ORDEM: NivelDominio[] = ['dominado', 'aprendendo', 'visto', 'nao_iniciado']

export interface ProgressoProps {
  itens: TechniqueItem[]
  baralho: Card[]
  revisoes: ReviewState[]
  modulos: Modulo[]
}

function Barras({ grupos }: { grupos: ProgressoDeGrupo[] }) {
  return (
    <ul className="lista-barras">
      {grupos.map((g) => (
        <li key={g.chave}>
          <div className="barra-topo">
            <span>{g.rotulo}</span>
            <span className="barra-valor">{Math.round(g.pontuacao * 100)}%</span>
          </div>
          <div className="barra-trilha">
            <div style={{ width: `${g.pontuacao * 100}%` }} />
          </div>
          <div className="barra-legenda">
            {ORDEM.filter((n) => g.porNivel[n] > 0)
              .map((n) => `${g.porNivel[n]} ${ROTULO_NIVEL[n]}`)
              .join(' · ')}
            {g.validados > 0 && <> · {g.validados} validados</>}
          </div>
        </li>
      ))}
    </ul>
  )
}

export function Progresso({ itens, baralho, revisoes, modulos }: ProgressoProps) {
  const agora = new Date()

  const porItem = useMemo(
    () => progressoPorItem(itens, baralho, revisoes, agora),
    // `agora` muda a cada render; o resultado só muda com os dados.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [itens, baralho, revisoes],
  )

  const nomeDoModulo = useMemo(() => {
    const mapa = new Map(modulos.map((m) => [m.id, m.nome]))
    return (id: string) => mapa.get(id) ?? id
  }, [modulos])

  const geral = useMemo(() => prontidao(porItem), [porItem])
  const modulosProgresso = useMemo(() => progressoPorModulo(porItem, nomeDoModulo), [porItem, nomeDoModulo])
  const posicoes = useMemo(() => progressoPorPosicao(porItem), [porItem])
  const fracas = useMemo(() => gruposMaisFracos(posicoes, 3), [posicoes])

  // Vazio de verdade e "nenhuma revisao ainda", nao "nenhum item dominado".
  // Usar a etiqueta aqui fazia a tela dizer "Nada estudado ainda" ao lado de
  // barras com valor, e escondia o "Onde focar" na hora em que ele passa a ter
  // o que dizer.
  const nadaAinda = porItem.every((p) => p.pontuacao === 0)

  return (
    <div>
      <div className="card">
        <h2 className="detalhe-nome">Prontidão</h2>

        <div className="dois-eixos">
          <div>
            <div className="eixo-valor">{Math.round(geral.dominio * 100)}%</div>
            <div className="eixo-rotulo">
              você recupera
              <small>de memória, sem consultar</small>
            </div>
          </div>
          <div>
            <div className="eixo-valor eixo-valor--validado">{Math.round(geral.validado * 100)}%</div>
            <div className="eixo-rotulo">
              professor validou
              <small>confirmado na academia</small>
            </div>
          </div>
        </div>

        {geral.dominadoSemValidacao > 0 && (
          <p className="aviso" style={{ marginBottom: 0 }}>
            <span aria-hidden="true">⚠️</span>
            <span>
              <strong>{geral.dominadoSemValidacao}</strong>{' '}
              {geral.dominadoSemValidacao === 1 ? 'técnica que você domina' : 'técnicas que você domina'} mas o
              professor ainda não viu. Dominar a versão errada não conta na prova.
            </span>
          </p>
        )}

        {nadaAinda && (
          <p className="instrucao" style={{ marginTop: 'calc(var(--espacamento-base) * 2)', marginBottom: 0 }}>
            Nada estudado ainda. Faça uma sessão em Hoje para os números começarem a existir.
          </p>
        )}
      </div>

      {!nadaAinda && fracas.length > 0 && (
        <div className="card">
          <h3 className="detalhe-secao">Onde focar</h3>
          <Barras grupos={fracas} />
        </div>
      )}

      <div className="card">
        <h3 className="detalhe-secao">Por módulo</h3>
        <Barras grupos={modulosProgresso} />
      </div>

      <div className="card">
        <h3 className="detalhe-secao">Por posição</h3>
        <Barras grupos={[...posicoes].sort((a, b) => b.pontuacao - a.pontuacao)} />
      </div>

      <p className="rodape-nota">
        O progresso pesa <strong>domínio e recência</strong>, não quantidade de cartões respondidos. Uma técnica
        recupera o nível ao ser revista, e perde quando fica muito tempo sem revisão.
      </p>
    </div>
  )
}

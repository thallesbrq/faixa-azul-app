/**
 * Curriculo — spec 8.4.
 *
 * Herda a hierarquia do mapa mental em arvore que ja existia como prototipo
 * (ADR-013): Modulo -> Posicao -> Tecnica. O que a versao anterior nao tinha e
 * chega aqui: status de validacao visivel, notas de seguranca, duvidas do item
 * e o historico de correcoes do professor.
 */

import { useMemo, useState } from 'react'
import type {
  Modulo,
  TeacherQuestion,
  TechniqueContent,
  TechniqueItem,
  ValidationStatus,
} from '../../domain/types'
import type { RequisitoProva } from '../../domain/types'
import { DetalheTecnica } from '../components/DetalheTecnica'

const ROTULO_STATUS: Record<ValidationStatus, string> = {
  sugestao_nao_validada: 'sugestão',
  aguardando_validacao: 'aguardando',
  validado_pelo_professor: 'validado',
  variante_pessoal: 'variante minha',
  descartado: 'descartado',
}

const CLASSE_STATUS: Record<ValidationStatus, string> = {
  sugestao_nao_validada: 'selo--sugestao',
  aguardando_validacao: 'selo--aguardando',
  validado_pelo_professor: 'selo--validado',
  variante_pessoal: 'selo--variante',
  descartado: 'selo--descartado',
}

export interface CurriculoProps {
  itens: TechniqueItem[]
  conteudos: TechniqueContent[]
  modulos: Modulo[]
  requisitos: RequisitoProva[]
  duvidas: TeacherQuestion[]
  validacoes: import('../../domain/types').ValidacaoDoProfessor[]
  aoValidar: (entrada: {
    itemId: string
    texto: string
    novoStatus: ValidationStatus
    origem: 'aula_particular' | 'aula_regular'
    aulaNumero?: number
  }) => void
}

export function Curriculo({
  itens,
  conteudos,
  modulos,
  requisitos,
  duvidas,
  validacoes,
  aoValidar,
}: CurriculoProps) {
  const [selecionado, setSelecionado] = useState<string | null>(null)

  const conteudoPorItem = useMemo(() => new Map(conteudos.map((c) => [c.itemId, c])), [conteudos])

  /** Modulo -> Posicao -> itens, preservando a ordem do curriculo. */
  const arvore = useMemo(() => {
    return modulos
      .map((modulo) => {
        const doModulo = itens.filter((i) => i.moduloId === modulo.id && i.ativo)
        const posicoes = new Map<string, TechniqueItem[]>()
        for (const item of doModulo) {
          const lista = posicoes.get(item.posicao)
          if (lista) lista.push(item)
          else posicoes.set(item.posicao, [item])
        }
        return { modulo, posicoes: [...posicoes.entries()], total: doModulo.length }
      })
      .filter((m) => m.total > 0)
  }, [itens, modulos])

  const validados = itens.filter((i) => i.validationStatus === 'validado_pelo_professor').length

  const item = selecionado ? itens.find((i) => i.id === selecionado) : undefined

  if (item) {
    return (
      <DetalheTecnica
        item={item}
        conteudo={conteudoPorItem.get(item.id)}
        requisito={requisitos.find((r) => r.posicao === item.posicao && r.categoria === item.categoria)}
        duvidas={duvidas.filter((d) => d.itemId === item.id)}
        validacoes={validacoes.filter((v) => v.itemId === item.id)}
        aoValidar={aoValidar}
        aoVoltar={() => setSelecionado(null)}
      />
    )
  }

  return (
    <div>
      <div className="card">
        <p className="instrucao" style={{ margin: 0 }}>
          <strong>{itens.length} itens</strong> da prova · <strong>{validados}</strong> validados pelo professor
        </p>
        {validados === 0 && (
          <p className="aviso" style={{ marginTop: 'var(--espacamento-base)', marginBottom: 0 }}>
            <span aria-hidden="true">⚠️</span>
            <span>
              Nenhum item foi validado ainda. Todo o conteúdo é <strong>sugestão minha</strong> — leve as dúvidas à
              academia e registre aqui o que o professor corrigir.
            </span>
          </p>
        )}
      </div>

      {arvore.map(({ modulo, posicoes, total }) => (
        <details key={modulo.id} className="grupo">
          <summary>
            <span className="grupo-titulo">{modulo.nome}</span>
            <span className="grupo-contagem">{total}</span>
          </summary>

          <div className="grupo-corpo">
            {posicoes.map(([posicao, doPosicao]) => (
              <details key={posicao} className="subgrupo">
                <summary>
                  <span>{posicao}</span>
                  <span className="grupo-contagem">{doPosicao.length}</span>
                </summary>
                <ul className="lista-tecnicas">
                  {doPosicao.map((it) => (
                    <li key={it.id}>
                      <button className="linha-tecnica" onClick={() => setSelecionado(it.id)}>
                        <span className="linha-nome">
                          {it.nome || it.slot}
                          {it.nome && <small>{it.slot}</small>}
                        </span>
                        <span className={`selo ${CLASSE_STATUS[it.validationStatus]}`}>
                          {ROTULO_STATUS[it.validationStatus]}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </details>
      ))}
    </div>
  )
}

/**
 * Montar a grade das 10 aulas de um aluno.
 *
 * SEM ARRASTAR, e isso e escolha. A tela do aluno usa arrasto porque e um dedo
 * num celular; aqui e o professor num computador, e um `<select>` por item
 * ganha do arrasto em tres coisas que importam mais que a fluidez: funciona por
 * teclado, nao tem alvo para errar, e diz por escrito para onde o item vai. A
 * regra de movimento e a MESMA (`atribuir`, do core), que mantem a invariante de
 * um item em um lugar so.
 *
 * OS PROBLEMAS APARECEM, e nao bloqueiam. `montarEstado` ja calcula "faltam N",
 * "aula vazia" e duplicado. Impedir de gravar por causa deles seria decidir pelo
 * professor: uma grade pela metade, gravada hoje, e melhor que nenhuma — ele
 * termina amanha e o aluno ja tem o que treinar.
 */

import { useMemo } from 'react'
import { montarEstado, TOTAL_DE_AULAS } from '@faixa-azul/core/application/montagem'
import type { Atribuicao, Problema } from '@faixa-azul/core/application/montagem'
import { ROTULO_GUARDA } from '@faixa-azul/core/domain/taxonomia'
import type { TechniqueItem } from '@faixa-azul/core/domain/types'
import type { FaseDaGrade } from '../useGrade'

function rotulo(i: TechniqueItem): string {
  return i.nome.trim() === '' ? i.slot : i.nome
}

function textoDoProblema(p: Problema): string {
  if (p.tipo === 'faltam') {
    return `${p.quantos} ${p.quantos === 1 ? 'técnica' : 'técnicas'} ainda no bolsão`
  }
  if (p.tipo === 'aula-vazia') {
    return `${p.aulas.length === 1 ? 'Aula' : 'Aulas'} sem nada: ${p.aulas.join(', ')}`
  }
  if (p.tipo === 'duplicado') return `Item repetido nas aulas ${p.aulas.join(' e ')}`
  return `Item que não existe mais no currículo: ${p.itemId}`
}

export interface AulasProps {
  itens: TechniqueItem[]
  atribuicao: Atribuicao
  pendentes: number[]
  fase: FaseDaGrade
  mensagem: string | null
  aoMover: (itemId: string, aula: number | null) => void
  aoSalvar: () => void
}

/** O seletor de destino de um item. Um lugar so, para nao divergir. */
function Destino({
  item,
  atual,
  aoMover,
}: {
  item: TechniqueItem
  atual: number | null
  aoMover: (itemId: string, aula: number | null) => void
}) {
  return (
    <select
      className="destino"
      value={atual === null ? '' : String(atual)}
      aria-label={`Aula de ${rotulo(item)}`}
      onChange={(e) => aoMover(item.id, e.target.value === '' ? null : Number(e.target.value))}
    >
      <option value="">bolsão</option>
      {Array.from({ length: TOTAL_DE_AULAS }, (_, i) => i + 1).map((n) => (
        <option key={n} value={String(n)}>
          aula {n}
        </option>
      ))}
    </select>
  )
}

export function Aulas({
  itens,
  atribuicao,
  pendentes,
  fase,
  mensagem,
  aoMover,
  aoSalvar,
}: AulasProps) {
  const montagem = useMemo(() => montarEstado({ itens, atribuicao }), [itens, atribuicao])

  if (fase === 'carregando') {
    return <p className="apoio">Lendo a grade…</p>
  }

  return (
    <>
      <section className="cartao">
        <div className="topo-grade">
          <div>
            <h3 style={{ margin: 0 }}>Grade das {TOTAL_DE_AULAS} aulas</h3>
            <p className="apoio" style={{ margin: '4px 0 0' }}>
              {montagem.atribuidos} de {montagem.total} técnicas distribuídas
            </p>
          </div>

          <div className="acoes-grade">
            {/*
              O botao DIZ QUANTAS AULAS VAO, e nao so "salvar". A grade chegando
              muda o app do aluno; ele merece saber o tamanho do que esta
              mandando antes de mandar.
            */}
            <button
              className="botao"
              onClick={aoSalvar}
              disabled={pendentes.length === 0 || fase === 'salvando'}
            >
              {fase === 'salvando'
                ? 'Gravando…'
                : pendentes.length === 0
                  ? 'Nada a gravar'
                  : `Gravar ${pendentes.length} ${pendentes.length === 1 ? 'aula' : 'aulas'}`}
            </button>
          </div>
        </div>

        {mensagem && (
          <p className={fase === 'erro' ? 'aviso' : 'apoio'} style={{ marginTop: 12, marginBottom: 0 }}>
            {mensagem}
          </p>
        )}

        {montagem.problemas.length > 0 && (
          <ul className="problemas">
            {montagem.problemas.map((p, i) => (
              <li key={i}>{textoDoProblema(p)}</li>
            ))}
          </ul>
        )}
      </section>

      <div className="grade">
        <section className="cartao">
          <h3>Aulas</h3>
          <ul className="lista-aulas">
            {montagem.aulas.map((a) => {
              const sugerido = montagem.tamanhosSugeridos[a.numero - 1]
              const pendente = pendentes.includes(a.numero)
              return (
                <li key={a.numero} className={pendente ? 'aula aula--pendente' : 'aula'}>
                  <div className="aula-topo">
                    <strong>Aula {a.numero}</strong>
                    <span className="aula-conta">
                      {a.itens.length}
                      {sugerido !== undefined && <span className="aula-sugerido"> / ~{sugerido}</span>}
                    </span>
                  </div>

                  {/* Aula vazia diz isso em palavras: uma lista em branco nao
                      distingue "vazia" de "a tela nao carregou". */}
                  {a.itens.length === 0 ? (
                    <p className="aula-vazia">nada aqui ainda</p>
                  ) : (
                    <ul className="itens-da-aula">
                      {a.itens.map((i) => (
                        <li key={i.id}>
                          <span className="item-nome">{rotulo(i)}</span>
                          <Destino item={i} atual={a.numero} aoMover={aoMover} />
                        </li>
                      ))}
                    </ul>
                  )}

                  {pendente && <p className="aula-marca-pendente">não gravada</p>}
                </li>
              )
            })}
          </ul>
        </section>

        <section className="cartao">
          <h3>
            Bolsão
            <span className="contagem-linhas">{montagem.naoAtribuidos} sem aula</span>
          </h3>
          {montagem.bolsao.length === 0 ? (
            <p className="apoio" style={{ marginBottom: 0 }}>
              Tudo distribuído.
            </p>
          ) : (
            montagem.bolsao.map((g) => (
              <div className="grupo-bolsao" key={g.guarda}>
                <h4 className="rotulo-guarda">
                  {ROTULO_GUARDA[g.guarda]} <span>{g.itens.length}</span>
                </h4>
                <ul className="itens-do-bolsao">
                  {g.itens.map((i) => (
                    <li key={i.id}>
                      <span className="item-nome">{rotulo(i)}</span>
                      <Destino item={i} atual={null} aoMover={aoMover} />
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </section>
      </div>
    </>
  )
}

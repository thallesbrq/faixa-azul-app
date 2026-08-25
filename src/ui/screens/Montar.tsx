/**
 * Montar as aulas — o professor distribui os 56 itens nas 10 aulas.
 *
 * DOIS TOQUES, nao arrastar. Escolha do aluno, e a razao e pratica: o
 * drag-and-drop nativo do HTML nao funciona em tela de toque, e esta tela vai
 * ser usada no celular, na academia, ao lado do professor. Dois toques
 * funcionam em celular, notebook e teclado desde o primeiro dia — o arrastar
 * entra depois, em cima disto, sem quebrar nada.
 *
 * O OBJETIVO E O BOLSAO CHEGAR A ZERO: os 56 itens precisam caber nas 10 aulas.
 * Sobra e erro a corrigir antes de fechar, nao conteudo para o aulao. Por isso a
 * contagem fica no topo e os problemas ficam visiveis.
 *
 * O ESPACAMENTO fica a mostra porque a montagem manual o perde em silencio: o
 * metodo do circulo garantia rever cada guarda com intervalo, e uma distribuicao
 * feita a mao pode concentrar tudo numa aula. O app nao impede — informa.
 */

import { useMemo, useState } from 'react'
import {
  atribuicaoDoPlano,
  espacamentoPorGuarda,
  montarEstado,
  tamanhosSugeridos,
} from '../../application/montagem'
import type { Atribuicao, Problema } from '../../application/montagem'
import { gerarPlano } from '../../application/aulas'
import { progressoPorItem } from '../../application/progresso'
import { ROTULO_GUARDA, papelDoKind, subPosicao } from '../../domain/taxonomia'
import type { Card, Dificuldade, ReviewState, TechniqueItem } from '../../domain/types'
import type { AlteracaoItem } from '../../persistence/repositorio'

const SIGLA_KIND: Record<string, string> = {
  raspagem: 'RASP',
  passagem: 'PASS',
  finalizacao: 'FINAL',
  saida: 'SAÍDA',
  defesa: 'DEF',
  costas: 'COSTAS',
}

export interface MontarProps {
  itens: TechniqueItem[]
  baralho: Card[]
  revisoes: ReviewState[]
  atribuicao: Atribuicao
  anotacoes: ReadonlyMap<string, AlteracaoItem>
  dificuldades: ReadonlyMap<string, Dificuldade>
  aoAtribuir: (itemId: string, aula: number | null) => void
  aoDefinirAtribuicao: (nova: ReadonlyMap<number, readonly string[]>) => void
  aoAnotar: (
    itemId: string,
    mudanca: { dificuldade?: Dificuldade; video?: string; videoTitulo?: string },
  ) => void
}

function rotulo(item: TechniqueItem): string {
  return item.nome || item.slot
}

export function Montar({
  itens,
  baralho,
  revisoes,
  atribuicao,
  anotacoes,
  dificuldades,
  aoAtribuir,
  aoDefinirAtribuicao,
  aoAnotar,
}: MontarProps) {
  /** Item escolhido, esperando o toque na aula de destino. */
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const [editandoVideo, setEditandoVideo] = useState<string | null>(null)
  const [urlVideo, setUrlVideo] = useState('')

  const estado = useMemo(() => montarEstado({ itens, atribuicao }), [itens, atribuicao])
  const espacamento = useMemo(() => espacamentoPorGuarda(estado.aulas), [estado.aulas])
  const sugeridos = useMemo(() => tamanhosSugeridos(estado.total), [estado.total])

  const itemSelecionado = useMemo(
    () => (selecionado ? itens.find((i) => i.id === selecionado) : undefined),
    [selecionado, itens],
  )

  function sugerir() {
    const progresso = progressoPorItem(itens, baralho, revisoes, new Date())
    const plano = gerarPlano({ progresso, dificuldades })
    aoDefinirAtribuicao(atribuicaoDoPlano(plano.aulas))
    setSelecionado(null)
  }

  function limpar() {
    aoDefinirAtribuicao(new Map())
    setSelecionado(null)
  }

  /** Toque num item: seleciona, ou desmarca se já era o selecionado. */
  function tocarItem(id: string) {
    setSelecionado((atual) => (atual === id ? null : id))
  }

  /** Toque numa aula: se há item selecionado, move para lá. */
  function tocarAula(numero: number) {
    if (!selecionado) return
    aoAtribuir(selecionado, numero)
    setSelecionado(null)
  }

  function devolverAoBolsao() {
    if (!selecionado) return
    aoAtribuir(selecionado, null)
    setSelecionado(null)
  }

  function Linha({ item, dentroDaAula }: { item: TechniqueItem; dentroDaAula: boolean }) {
    const anotacao = anotacoes.get(item.id)
    const sub = subPosicao(item)
    const escolhido = selecionado === item.id
    const editando = editandoVideo === item.id

    return (
      <li className={escolhido ? 'mt-item mt-item--escolhido' : 'mt-item'}>
        <button
          className="mt-toque"
          onClick={() => tocarItem(item.id)}
          aria-pressed={escolhido}
        >
          <span className={`k k--${item.kind}`}>{SIGLA_KIND[item.kind] ?? item.kind}</span>
          <span className="mt-txt">
            <span className="mt-nome">{rotulo(item)}</span>
            <span className="mt-ctx">
              {dentroDaAula ? sub ?? item.posicao : sub ?? ''}
              {dentroDaAula && <> · {papelDoKind(item.kind) === 'passando' ? 'eu passo' : papelDoKind(item.kind) === 'defendendo' ? 'eu defendo' : 'eu ataco'}</>}
            </span>
          </span>
        </button>

        <button
          className={anotacao?.video ? 'mt-video mt-video--tem' : 'mt-video'}
          onClick={() => {
            setUrlVideo(anotacao?.video ?? '')
            setEditandoVideo(editando ? null : item.id)
          }}
          aria-label={anotacao?.video ? 'Trocar vídeo' : 'Adicionar vídeo'}
          title={anotacao?.video ?? 'Adicionar vídeo'}
        >
          ▶
        </button>

        {editando && (
          <div className="mt-video-form">
            <input
              value={urlVideo}
              onChange={(e) => setUrlVideo(e.target.value)}
              placeholder="youtube.com/watch?v=..."
              inputMode="url"
              autoComplete="off"
            />
            <div className="acoes">
              <button
                className="botao botao--principal"
                onClick={() => {
                  aoAnotar(item.id, { video: urlVideo })
                  setEditandoVideo(null)
                }}
              >
                Salvar
              </button>
              <button className="botao botao--secundario" onClick={() => setEditandoVideo(null)}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </li>
    )
  }

  return (
    <div>
      {/* ---------- Contagem: o objetivo e chegar a zero no bolsao ---------- */}
      <div className="card">
        <div className="dois-eixos">
          <div>
            <div className="eixo-valor">
              {estado.atribuidos}/{estado.total}
            </div>
            <div className="eixo-rotulo">
              nas aulas
              <small>{estado.naoAtribuidos} ainda no bolsão</small>
            </div>
          </div>
          <div>
            <div className={estado.completo ? 'eixo-valor eixo-valor--validado' : 'eixo-valor'}>
              {estado.completo ? '✓' : estado.problemas.length}
            </div>
            <div className="eixo-rotulo">
              {estado.completo ? 'montagem fechada' : 'pontos a resolver'}
              <small>
                {estado.total} em 10 aulas ={' '}
                {sugeridos.filter((n) => n === Math.max(...sugeridos)).length} de {Math.max(...sugeridos)} e{' '}
                {sugeridos.filter((n) => n === Math.min(...sugeridos)).length} de {Math.min(...sugeridos)}
              </small>
            </div>
          </div>
        </div>

        {estado.problemas.length > 0 && (
          <ul className="mt-problemas">
            {estado.problemas.map((p, i) => (
              <li key={i}>{textoDoProblema(p)}</li>
            ))}
          </ul>
        )}

        <div className="acoes">
          <button className="botao botao--secundario" onClick={sugerir}>
            Sugerir distribuição
          </button>
          <button className="botao botao--secundario" onClick={limpar} disabled={estado.atribuidos === 0}>
            Limpar tudo
          </button>
        </div>
        <p className="instrucao" style={{ marginBottom: 0 }}>
          A sugestão usa o método do círculo: cada guarda em duas aulas afastadas, para revê-la quando já
          começou a sair da memória. Serve de ponto de partida — mexa por cima.
        </p>
      </div>

      {/* ---------- Barra do item selecionado ---------- */}
      {itemSelecionado && (
        <div className="card card--destaque mt-selecionado">
          <p className="instrucao" style={{ margin: 0 }}>
            <strong>{rotulo(itemSelecionado)}</strong> escolhida — toque numa aula abaixo para colocar.
          </p>
          <div className="acoes">
            <button className="botao botao--secundario" onClick={devolverAoBolsao}>
              Devolver ao bolsão
            </button>
            <button className="botao botao--secundario" onClick={() => setSelecionado(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ---------- As 10 aulas ---------- */}
      <div className="card">
        <h3 className="detalhe-secao">As 10 aulas</h3>
        <ul className="mt-aulas">
          {estado.aulas.map((aula) => {
            const podeReceber = selecionado !== null
            return (
              <li key={aula.numero} className="mt-aula">
                <button
                  className={podeReceber ? 'mt-aula-cabeca mt-aula-cabeca--alvo' : 'mt-aula-cabeca'}
                  onClick={() => tocarAula(aula.numero)}
                  disabled={!podeReceber}
                >
                  <span className="mt-aula-num">{aula.numero}</span>
                  {/* So a contagem. QUAL aula leva 6 e arbitrario — mostrar um
                      alvo por aula fazia "6 de 5" parecer erro quando nao e. A
                      aritmetica do conjunto fica no cabecalho. */}
                  <span className="mt-aula-conta">
                    {aula.itens.length === 0 ? (
                      <em>vazia</em>
                    ) : (
                      <>
                        {aula.itens.length} {aula.itens.length === 1 ? 'técnica' : 'técnicas'}
                      </>
                    )}
                  </span>
                  {podeReceber && <span className="mt-aula-acao">colocar aqui</span>}
                </button>
                {aula.itens.length > 0 && (
                  <ul className="mt-lista">
                    {aula.itens.map((i) => (
                      <Linha key={i.id} item={i} dentroDaAula />
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </div>

      {/* ---------- Espacamento: o que a montagem manual perde ---------- */}
      {espacamento.length > 0 && (
        <div className="card">
          <h3 className="detalhe-secao">Espaçamento por guarda</h3>
          <p className="instrucao">
            Rever uma guarda depois de um intervalo fixa mais do que repeti-la na mesma aula. Guarda
            concentrada numa aula só não tem segunda passagem.
          </p>
          <ul className="mt-espaco">
            {espacamento.map((e) => (
              <li key={e.guarda} className={e.concentrada ? 'mt-esp mt-esp--alerta' : 'mt-esp'}>
                <span>{ROTULO_GUARDA[e.guarda]}</span>
                <span className="mt-esp-aulas">
                  {e.concentrada ? (
                    <>só na aula {e.aulas[0]}</>
                  ) : (
                    <>
                      aulas {e.aulas.join(', ')} · intervalo mínimo {e.menorIntervalo}
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ---------- Bolsao ---------- */}
      <div className="card">
        <h3 className="detalhe-secao">Bolsão ({estado.naoAtribuidos})</h3>
        {estado.naoAtribuidos === 0 ? (
          <p className="instrucao" style={{ marginBottom: 0 }}>
            Todas as {estado.total} técnicas estão distribuídas.
          </p>
        ) : (
          <>
            <p className="instrucao">Toque numa técnica e depois na aula onde ela entra.</p>
            {estado.bolsao.map((grupo) => (
              <div key={grupo.guarda} className="mt-grupo">
                <h4 className="mt-grupo-titulo">
                  {ROTULO_GUARDA[grupo.guarda]}
                  <small>{grupo.itens.length}</small>
                </h4>
                <ul className="mt-lista">
                  {grupo.itens.map((i) => (
                    <Linha key={i.id} item={i} dentroDaAula={false} />
                  ))}
                </ul>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

function textoDoProblema(p: Problema): string {
  switch (p.tipo) {
    case 'faltam':
      return `${p.quantos} ${p.quantos === 1 ? 'técnica' : 'técnicas'} ainda no bolsão`
    case 'aula-vazia':
      return `${p.aulas.length === 1 ? 'Aula' : 'Aulas'} sem nenhuma técnica: ${p.aulas.join(', ')}`
    case 'duplicado':
      return `Uma técnica aparece nas aulas ${p.aulas.join(' e ')} — toque nela para mover`
    case 'item-inexistente':
      return 'Há referência a uma técnica que não existe mais no currículo'
  }
}

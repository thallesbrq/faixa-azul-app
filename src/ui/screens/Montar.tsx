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
import { ATRIBUTO_ALVO, useArrastar } from '../useArrastar'
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


/**
 * Uma linha de tecnica, no bolsao ou dentro de uma aula.
 *
 * FICA NO NIVEL DO MODULO, nao dentro de `Montar`. Um componente definido dentro
 * de outro e um TIPO NOVO a cada render, e o React desmonta e remonta a subarvore
 * inteira quando o pai re-renderiza. Duas consequencias que aconteceram de
 * verdade antes desta extracao:
 *
 * - o no DOM da alca ficava orfao no meio do arraste, e os eventos seguintes
 *   (mover, soltar) nao chegavam a ninguem;
 * - o campo de video perdia o foco a cada caractere digitado.
 */
function Linha({
  item,
  dentroDaAula,
  escolhido,
  arrastando,
  anotacao,
  editando,
  urlVideo,
  propsDaAlca,
  aoTocar,
  aoAbrirVideo,
  aoMudarUrl,
  aoSalvarVideo,
  aoCancelarVideo,
}: {
  item: TechniqueItem
  dentroDaAula: boolean
  escolhido: boolean
  arrastando: boolean
  anotacao: AlteracaoItem | undefined
  editando: boolean
  urlVideo: string
  propsDaAlca: (itemId: string) => React.ComponentProps<'span'>
  aoTocar: (itemId: string) => void
  aoAbrirVideo: (itemId: string, urlAtual: string) => void
  aoMudarUrl: (valor: string) => void
  aoSalvarVideo: (itemId: string) => void
  aoCancelarVideo: () => void
}) {
  const sub = subPosicao(item)
  const papel = papelDoKind(item.kind)

  return (
    <li
      className={['mt-item', escolhido ? 'mt-item--escolhido' : '', arrastando ? 'mt-item--arrastando' : '']
        .filter(Boolean)
        .join(' ')}
    >
      {/* Alca: o unico lugar com touch-action none, para a lista continuar
          rolando quando o dedo pega em qualquer outro ponto da linha. */}
      <span className="mt-alca" aria-hidden="true" {...propsDaAlca(item.id)}>
        ⠿
      </span>

      <button className="mt-toque" onClick={() => aoTocar(item.id)} aria-pressed={escolhido}>
        <span className={`k k--${item.kind}`}>{SIGLA_KIND[item.kind] ?? item.kind}</span>
        <span className="mt-txt">
          <span className="mt-nome">{item.nome || item.slot}</span>
          <span className="mt-ctx">
            {dentroDaAula ? sub ?? item.posicao : sub ?? ''}
            {dentroDaAula && (
              <>
                {' · '}
                {papel === 'passando' ? 'eu passo' : papel === 'defendendo' ? 'eu defendo' : 'eu ataco'}
              </>
            )}
          </span>
        </span>
      </button>

      <button
        className={anotacao?.video ? 'mt-video mt-video--tem' : 'mt-video'}
        onClick={() => aoAbrirVideo(item.id, anotacao?.video ?? '')}
        aria-label={anotacao?.video ? 'Trocar vídeo' : 'Adicionar vídeo'}
        title={anotacao?.video ?? 'Adicionar vídeo'}
      >
        ▶
      </button>

      {editando && (
        <div className="mt-video-form">
          <input
            value={urlVideo}
            onChange={(e) => aoMudarUrl(e.target.value)}
            placeholder="youtube.com/watch?v=..."
            inputMode="url"
            autoComplete="off"
          />
          <div className="acoes">
            <button className="botao botao--principal" onClick={() => aoSalvarVideo(item.id)}>
              Salvar
            </button>
            <button className="botao botao--secundario" onClick={aoCancelarVideo}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </li>
  )
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

  /**
   * Arrastar e soltar. O alvo vem como texto no `data-alvo`: "1".."10" para as
   * aulas e "bolsao" para devolver. Texto em vez de numero porque o atributo do
   * DOM e string de qualquer jeito, e converter num lugar so evita NaN silencioso.
   */
  const { arraste, propsDaAlca } = useArrastar({
    aoSoltar: (itemId, alvo) => {
      aoAtribuir(itemId, alvo === 'bolsao' ? null : Number(alvo))
      setSelecionado(null)
    },
    aoTocar: (itemId) => tocarItem(itemId),
  })

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


  /** Props comuns da linha, para nao repetir a lista em cada uso. */
  const propsDaLinha = (item: TechniqueItem, dentroDaAula: boolean) => ({
    item,
    dentroDaAula,
    escolhido: selecionado === item.id,
    arrastando: arraste?.itemId === item.id,
    anotacao: anotacoes.get(item.id),
    editando: editandoVideo === item.id,
    urlVideo,
    propsDaAlca,
    aoTocar: tocarItem,
    aoAbrirVideo: (id: string, atual: string) => {
      setUrlVideo(atual)
      setEditandoVideo((e) => (e === id ? null : id))
    },
    aoMudarUrl: setUrlVideo,
    aoSalvarVideo: (id: string) => {
      aoAnotar(id, { video: urlVideo })
      setEditandoVideo(null)
    },
    aoCancelarVideo: () => setEditandoVideo(null),
  })

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
              <li
                key={aula.numero}
                className={
                  arraste?.alvo === String(aula.numero) ? 'mt-aula mt-aula--sob' : 'mt-aula'
                }
                {...{ [ATRIBUTO_ALVO]: String(aula.numero) }}
              >
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
                      <Linha key={i.id} {...propsDaLinha(i, true)} />
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

      {/* ---------- Faixa fixa de destinos, so durante o arraste ----------
          Existe para o arrasto ser CURTO: sem ela, tirar um item do bolsao (no
          fim da pagina) e levar para a aula 1 (no topo) exigiria auto-scroll,
          que e a parte mais fragil desse tipo de codigo. Aqui o destino vem ao
          dedo, na area do polegar. */}
      {arraste && (
        <div className="mt-faixa" role="presentation">
          <span className="mt-faixa-rotulo">solte numa aula</span>
          <div className="mt-faixa-alvos">
            {estado.aulas.map((a) => (
              <span
                key={a.numero}
                {...{ [ATRIBUTO_ALVO]: String(a.numero) }}
                className={arraste.alvo === String(a.numero) ? 'mt-alvo mt-alvo--sob' : 'mt-alvo'}
              >
                {a.numero}
                <small>{a.itens.length}</small>
              </span>
            ))}
            <span
              {...{ [ATRIBUTO_ALVO]: 'bolsao' }}
              className={arraste.alvo === 'bolsao' ? 'mt-alvo mt-alvo--sob mt-alvo--bolsao' : 'mt-alvo mt-alvo--bolsao'}
            >
              ↩
              <small>volta</small>
            </span>
          </div>
        </div>
      )}

      {/* Fantasma seguindo o dedo. `pointer-events: none` no CSS e obrigatorio:
          sem isso ele intercepta o proprio ponto e o alvo nunca e encontrado. */}
      {arraste && (
        <div className="mt-fantasma" style={{ left: arraste.x, top: arraste.y }}>
          {rotulo(itens.find((i) => i.id === arraste.itemId) ?? itens[0])}
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
                    <Linha key={i.id} {...propsDaLinha(i, false)} />
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

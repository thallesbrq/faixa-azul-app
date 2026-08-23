/**
 * Detalhe da tecnica — spec 8.4.
 *
 * Mostra tudo o que se sabe sobre um item, incluindo o que NAO se sabe: as
 * duvidas abertas e a ausencia de validacao aparecem com o mesmo destaque que o
 * passo a passo. E aqui que o aluno registra a correcao do professor.
 */

import { useState } from 'react'
import { custoEmMinutos } from '../../application/aulas'
import { idDoYoutube, normalizarUrlDeVideo, origemDoVideo } from '../../domain/video'
import type { AlteracaoItem } from '../../persistence/repositorio'
import type {
  Dificuldade,
  RequisitoProva,
  TechniqueContent,
  TechniqueItem,
  ValidacaoDoProfessor,
  ValidationStatus,
} from '../../domain/types'

export interface DetalheTecnicaProps {
  item: TechniqueItem
  conteudo: TechniqueContent | undefined
  requisito: RequisitoProva | undefined
  validacoes: ValidacaoDoProfessor[]
  aoValidar: (entrada: {
    itemId: string
    texto: string
    novoStatus: ValidationStatus
    origem: 'aula_particular' | 'aula_regular'
    aulaNumero?: number
  }) => void
  aoVoltar: () => void
  /** Anotacoes do aluno sobre este item (dificuldade, video). */
  anotacao: AlteracaoItem | undefined
  aoAnotar: (
    itemId: string,
    mudanca: { dificuldade?: Dificuldade; video?: string; videoTitulo?: string },
  ) => void
}

const DIFICULDADES: { id: Dificuldade; rotulo: string }[] = [
  { id: 'facil', rotulo: 'Fácil' },
  { id: 'medio', rotulo: 'Médio' },
  { id: 'dificil', rotulo: 'Difícil' },
]

function urlDeBusca(conteudo: TechniqueContent | undefined, item: TechniqueItem): string {
  const termo = conteudo?.busca ?? `${item.nome || item.slot} ${item.posicao} jiu jitsu`
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(termo)}`
}

export function DetalheTecnica({
  item,
  conteudo,
  requisito,
  validacoes,
  aoValidar,
  aoVoltar,
  anotacao,
  aoAnotar,
}: DetalheTecnicaProps) {
  const [registrando, setRegistrando] = useState(false)
  const [editandoVideo, setEditandoVideo] = useState(false)
  const [urlVideo, setUrlVideo] = useState('')
  const [tituloVideo, setTituloVideo] = useState('')
  const [texto, setTexto] = useState('')
  const [origem, setOrigem] = useState<'aula_particular' | 'aula_regular'>('aula_regular')
  const [numeroAula, setNumeroAula] = useState('1')

  const validado = item.validationStatus === 'validado_pelo_professor'

  // Miniatura so para YouTube, e servida pelo proprio YouTube. Nao entra no
  // precache do service worker, entao offline o card aparece sem imagem — que e
  // aceitavel: o link e o conteudo, a imagem e enfeite.
  const idYoutube = anotacao?.video ? idDoYoutube(anotacao.video) : null
  const miniatura = idYoutube ? `https://i.ytimg.com/vi/${idYoutube}/mqdefault.jpg` : null
  const semPassos = (conteudo?.passos.length ?? 0) === 0

  /**
   * Registra a correcao.
   *
   * `jaExecuto` e a diferenca entre ouvir a correcao e saber fazer o que foi
   * pedido, e por decisao do aluno ela nao e presumida: o professor falar nao
   * valida sozinho. Quando o aluno diz que ainda nao executa, o item fica em
   * `aguardando_validacao` e volta ao topo da pauta da proxima aula particular
   * (ver application/aulas.ts, repescagensPendentes).
   */
  function salvar(jaExecuto: boolean) {
    if (!texto.trim()) return
    aoValidar({
      itemId: item.id,
      texto: texto.trim(),
      novoStatus: jaExecuto ? 'validado_pelo_professor' : 'aguardando_validacao',
      origem,
      aulaNumero: origem === 'aula_particular' ? Number(numeroAula) : undefined,
    })
    setTexto('')
    setRegistrando(false)
  }

  return (
    <div>
      <button className="botao botao--secundario" onClick={aoVoltar} style={{ marginBottom: 'var(--espacamento-base)' }}>
        ← Currículo
      </button>

      <div className="card">
        <p className="detalhe-posicao">
          {item.posicao} · {item.categoria}
        </p>
        <h2 className="detalhe-nome">{item.nome || item.slot}</h2>
        {item.nome && <p className="detalhe-slot">Slot da prova: {item.slot}</p>}
        {item.aliases.length > 0 && <p className="detalhe-slot">Também chamado: {item.aliases.join(', ')}</p>}

        {requisito && (
          <p className="instrucao" style={{ marginTop: 'var(--espacamento-base)' }}>
            A prova exige <strong>{requisito.quantidade}</strong> {requisito.categoria.toLowerCase()} nesta posição.
          </p>
        )}

        {item.safetyLevel === 'alto' && (
          <p className="aviso aviso--risco">
            <span aria-hidden="true">🚨</span>
            <span>
              Conteúdo de <strong>alto risco</strong>. Treinar somente com o professor ou parceiro qualificado.
            </span>
          </p>
        )}

        {!validado && (
          <p className="aviso">
            <span aria-hidden="true">⚠️</span>
            <span>
              {semPassos
                ? 'O app não traz instrução textual desta técnica por segurança. Aprenda na aula, com o professor.'
                : 'Passo a passo é sugestão minha, não o currículo da academia. Confirme com o professor.'}
            </span>
          </p>
        )}
      </div>

      {!semPassos && (
        <div className="card">
          <h3 className="detalhe-secao">Passo a passo</h3>
          <ol className="resposta-lista">
            {conteudo?.passos.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ol>
        </div>
      )}

      {conteudo?.notasSeguranca.length ? (
        <div className="card">
          <h3 className="detalhe-secao">Segurança</h3>
          <ul className="resposta-lista">
            {conteudo.notasSeguranca.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* ---------- Dificuldade percebida ---------- */}
      <div className="card">
        <h3 className="detalhe-secao">Dificuldade para você</h3>
        <p className="instrucao">
          Seu julgamento, não medição. Serve para estimar quanto tempo de aula particular esta técnica vai
          consumir — o que você pode responder <strong>hoje</strong>, antes de estudar.
        </p>
        <div className="acoes">
          {DIFICULDADES.map((d) => (
            <button
              key={d.id}
              className={`botao ${anotacao?.dificuldade === d.id ? 'botao--principal' : 'botao--secundario'}`}
              style={{ width: 'auto', flex: 1 }}
              onClick={() => aoAnotar(item.id, { dificuldade: d.id })}
              aria-pressed={anotacao?.dificuldade === d.id}
            >
              {d.rotulo}
            </button>
          ))}
        </div>
        {anotacao?.dificuldade && (
          <p className="instrucao" style={{ marginBottom: 0 }}>
            Custo estimado de aula: <strong>{Math.round(custoEmMinutos(0, false, anotacao.dificuldade))} min</strong>{' '}
            enquanto estiver cru, caindo para{' '}
            {Math.round(custoEmMinutos(1, false, anotacao.dificuldade))} min quando você dominar.
          </p>
        )}
      </div>

      {/* ---------- Video ---------- */}
      <div className="card">
        <h3 className="detalhe-secao">Vídeo</h3>

        {anotacao?.video ? (
          <>
            <a className="video-fixado" href={anotacao.video} target="_blank" rel="noopener noreferrer">
              {miniatura && <img src={miniatura} alt="" width={120} height={90} loading="lazy" />}
              <span className="video-textos">
                <span className="video-titulo">{anotacao.videoTitulo || 'Vídeo de referência'}</span>
                <span className="video-origem">{origemDoVideo(anotacao.video)}</span>
              </span>
            </a>
            <div className="acoes">
              <button
                className="botao botao--secundario"
                onClick={() => {
                  setUrlVideo(anotacao.video ?? '')
                  setTituloVideo(anotacao.videoTitulo ?? '')
                  setEditandoVideo(true)
                }}
              >
                Trocar
              </button>
              <button className="botao botao--secundario" onClick={() => aoAnotar(item.id, { video: '' })}>
                Remover
              </button>
            </div>
          </>
        ) : editandoVideo ? null : (
          <>
            <p className="instrucao">
              Nenhum vídeo fixado. Busque, escolha a versão que você vai usar como referência e cole aqui — o
              professor é quem confirma no fim se aquela versão vale.
            </p>
            <div className="acoes acoes--coluna">
              <a
                className="botao botao--secundario"
                href={urlDeBusca(conteudo, item)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Buscar no YouTube
              </a>
              <button className="botao botao--secundario" onClick={() => setEditandoVideo(true)}>
                Colar link do vídeo
              </button>
            </div>
          </>
        )}

        {editandoVideo && (
          <>
            <label className="campo">
              <span>Link do vídeo</span>
              <input
                value={urlVideo}
                onChange={(e) => setUrlVideo(e.target.value)}
                placeholder="youtube.com/watch?v=..."
                inputMode="url"
                autoComplete="off"
              />
            </label>
            {urlVideo.trim() && !normalizarUrlDeVideo(urlVideo) && (
              <p className="instrucao instrucao--erro">
                Isso não é um endereço de vídeo válido. Cole o link inteiro, começando com o site.
              </p>
            )}
            <label className="campo">
              <span>Como chamar (opcional)</span>
              <input
                value={tituloVideo}
                onChange={(e) => setTituloVideo(e.target.value)}
                placeholder="Ex.: versão do Rilion, entrada pelo joelho"
              />
            </label>
            <div className="acoes">
              <button
                className="botao botao--principal"
                disabled={!normalizarUrlDeVideo(urlVideo)}
                onClick={() => {
                  aoAnotar(item.id, { video: urlVideo, videoTitulo: tituloVideo })
                  setEditandoVideo(false)
                }}
              >
                Salvar vídeo
              </button>
              <button className="botao botao--secundario" onClick={() => setEditandoVideo(false)}>
                Cancelar
              </button>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <h3 className="detalhe-secao">Correções do professor</h3>

        {validacoes.length === 0 ? (
          <p className="instrucao">Nada registrado ainda.</p>
        ) : (
          <ul className="historico">
            {[...validacoes]
              .sort((a, b) => b.registradaEm.localeCompare(a.registradaEm))
              .map((v) => (
                <li key={v.id}>
                  <span className="historico-data">
                    {new Date(v.registradaEm).toLocaleDateString('pt-BR')} ·{' '}
                    {v.origem === 'aula_particular' ? `aula particular ${v.aulaNumero}` : 'aula regular'}
                  </span>
                  <span>{v.texto}</span>
                </li>
              ))}
          </ul>
        )}

        {!registrando ? (
          <button className="botao botao--secundario" onClick={() => setRegistrando(true)}>
            Registrar correção
          </button>
        ) : (
          <div className="form-validacao">
            <label>
              <span>O que o professor disse</span>
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                rows={3}
                placeholder="Ex.: a canela entra na barriga, não no quadril."
              />
            </label>

            <fieldset>
              <legend>Onde foi corrigido</legend>
              <label className="radio">
                <input
                  type="radio"
                  name="origem"
                  checked={origem === 'aula_regular'}
                  onChange={() => setOrigem('aula_regular')}
                />
                <span>Aula regular (seg/qua)</span>
              </label>
              <label className="radio">
                <input
                  type="radio"
                  name="origem"
                  checked={origem === 'aula_particular'}
                  onChange={() => setOrigem('aula_particular')}
                />
                <span>Aula particular</span>
              </label>
              {origem === 'aula_particular' && (
                <label className="radio">
                  <span>Número da aula</span>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={numeroAula}
                    onChange={(e) => setNumeroAula(e.target.value)}
                    style={{ width: 64 }}
                  />
                </label>
              )}
            </fieldset>

            <p className="instrucao">
              Depois da correção, você já consegue executar assim?
            </p>

            <div className="acoes acoes--coluna">
              <button
                className="botao botao--principal"
                onClick={() => salvar(true)}
                disabled={!texto.trim()}
              >
                Já executo — validar
              </button>
              <button
                className="botao botao--secundario"
                onClick={() => salvar(false)}
                disabled={!texto.trim()}
              >
                Ainda não — mostrar de novo na próxima aula
              </button>
              <button className="botao botao--secundario" onClick={() => setRegistrando(false)}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Detalhe da tecnica — spec 8.4.
 *
 * Mostra tudo o que se sabe sobre um item, incluindo o que NAO se sabe: as
 * duvidas abertas e a ausencia de validacao aparecem com o mesmo destaque que o
 * passo a passo. E aqui que o aluno registra a correcao do professor.
 */

import { useState } from 'react'
import type {
  RequisitoProva,
  TeacherQuestion,
  TechniqueContent,
  TechniqueItem,
  ValidacaoDoProfessor,
  ValidationStatus,
} from '../../domain/types'

export interface DetalheTecnicaProps {
  item: TechniqueItem
  conteudo: TechniqueContent | undefined
  requisito: RequisitoProva | undefined
  duvidas: TeacherQuestion[]
  validacoes: ValidacaoDoProfessor[]
  aoValidar: (entrada: {
    itemId: string
    texto: string
    novoStatus: ValidationStatus
    origem: 'aula_particular' | 'aula_regular'
    aulaNumero?: number
  }) => void
  aoVoltar: () => void
}

function urlDeBusca(conteudo: TechniqueContent | undefined, item: TechniqueItem): string {
  const termo = conteudo?.busca ?? `${item.nome || item.slot} ${item.posicao} jiu jitsu`
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(termo)}`
}

export function DetalheTecnica({
  item,
  conteudo,
  requisito,
  duvidas,
  validacoes,
  aoValidar,
  aoVoltar,
}: DetalheTecnicaProps) {
  const [registrando, setRegistrando] = useState(false)
  const [texto, setTexto] = useState('')
  const [origem, setOrigem] = useState<'aula_particular' | 'aula_regular'>('aula_regular')
  const [numeroAula, setNumeroAula] = useState('1')

  const validado = item.validationStatus === 'validado_pelo_professor'
  const semPassos = (conteudo?.passos.length ?? 0) === 0
  const abertas = duvidas.filter((d) => d.status === 'aberta')

  function salvar() {
    if (!texto.trim()) return
    aoValidar({
      itemId: item.id,
      texto: texto.trim(),
      novoStatus: 'validado_pelo_professor',
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

      <div className="card">
        <h3 className="detalhe-secao">Vídeo</h3>
        <p className="instrucao">
          O app não embute vídeo: abre a busca para você escolher a fonte, e o professor é quem confirma qual versão
          vale.
        </p>
        <a className="botao botao--secundario" href={urlDeBusca(conteudo, item)} target="_blank" rel="noopener">
          Buscar no YouTube
        </a>
      </div>

      <div className="card">
        <h3 className="detalhe-secao">
          Dúvidas para o professor {abertas.length > 0 && <span className="grupo-contagem">{abertas.length}</span>}
        </h3>
        {abertas.length === 0 ? (
          <p className="instrucao" style={{ margin: 0 }}>
            Nenhuma dúvida aberta desta técnica.
          </p>
        ) : (
          <ul className="resposta-lista">
            {abertas.map((d) => (
              <li key={d.id}>{d.pergunta}</li>
            ))}
          </ul>
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

            <div className="acoes">
              <button className="botao botao--principal" onClick={salvar} disabled={!texto.trim()}>
                Marcar como validado
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

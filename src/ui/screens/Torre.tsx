/**
 * Torre — a central do professor.
 *
 * Responde uma pergunta so: QUEM PRECISA DE MIM AGORA. Por isso a lista nao e
 * alfabetica (ver ordenarPorAtencao) e por isso quem parou aparece marcado, e
 * nao escondido no meio de vinte linhas iguais.
 *
 * Os dados sao COPIAS recebidas por arquivo, com a idade que tinham no momento
 * da exportacao. A tela diz isso em cada linha: sem a data, o professor olharia
 * um retrato de duas semanas atras achando que e hoje.
 */

import { useRef, useState } from 'react'
import type { ResumoDoAluno } from '../../application/torre'
import { situacaoDoAluno } from '../../application/torre'
import type { ResultadoDaImportacao } from '../useTorre'

const ROTULO_SITUACAO = {
  'nunca-estudou': 'nunca estudou',
  parado: 'parado',
  'em-dia': 'em dia',
} as const

function quando(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(d)
}

function diasTexto(dias: number | null): string {
  if (dias === null) return 'sem nenhuma revisão'
  if (dias === 0) return 'estudou hoje'
  if (dias === 1) return 'estudou ontem'
  return `${dias} dias sem estudar`
}

export interface TorreProps {
  lista: ResumoDoAluno[]
  atencao: number
  espaco: { bytes: number; alunos: number; apertado: boolean }
  aoImportar: (texto: string, forcarId?: string) => ResultadoDaImportacao
  aoRemover: (id: string) => void
  /** Gera o arquivo de volta para aquele aluno. */
  aoDevolver: (id: string) => void
}

export function Torre({ lista, atencao, espaco, aoImportar, aoRemover, aoDevolver }: TorreProps) {
  const [aberto, setAberto] = useState<string | null>(null)
  const entrada = useRef<HTMLInputElement>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [conflito, setConflito] = useState<
    { nome: string; idExistente: string; texto: string } | null
  >(null)
  const [confirmandoRemocao, setConfirmandoRemocao] = useState<string | null>(null)

  function tratar(resultado: ResultadoDaImportacao, texto: string) {
    if (resultado.ok) {
      setConflito(null)
      setAviso(
        resultado.novo
          ? `${resultado.nome} entrou na central.`
          : resultado.mudou
            ? `${resultado.nome} atualizado.`
            : `${resultado.nome} já estava atualizado — nada mudou.`,
      )
      return
    }
    if ('conflitoDeNome' in resultado) {
      setAviso(null)
      setConflito({
        nome: resultado.conflitoDeNome.nome,
        idExistente: resultado.conflitoDeNome.idExistente,
        texto,
      })
      return
    }
    setConflito(null)
    setAviso(resultado.mensagem)
  }

  async function aoEscolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return
    const texto = await arquivo.text()
    tratar(aoImportar(texto), texto)
    // Zera o input: sem isto, escolher o MESMO arquivo de novo nao dispara
    // evento nenhum e o professor acha que o app travou.
    e.target.value = ''
  }

  return (
    <div>
      <div className="card">
        <h2 className="detalhe-nome">Central</h2>
        <p className="instrucao" style={{ marginTop: 4 }}>
          {lista.length === 0 ? (
            <>Nenhum aluno ainda. Importe o arquivo que o aluno exportou no app dele.</>
          ) : (
            <>
              {lista.length} {lista.length === 1 ? 'aluno' : 'alunos'} ·{' '}
              {atencao === 0 ? (
                <strong>todos em dia</strong>
              ) : (
                <strong>
                  {atencao} {atencao === 1 ? 'precisa' : 'precisam'} de atenção
                </strong>
              )}
            </>
          )}
        </p>

        <button className="botao botao--principal" onClick={() => entrada.current?.click()}>
          Importar arquivo de aluno
        </button>
        <input
          ref={entrada}
          type="file"
          accept="application/json,.json"
          onChange={aoEscolherArquivo}
          hidden
        />

        {aviso && (
          <p className="instrucao" style={{ marginTop: 12, marginBottom: 0 }}>
            {aviso}
          </p>
        )}

        {/*
          Nome repetido com id diferente. Nao e erro: e o caso do aluno que
          reinstalou o app ou trocou de celular. Sem esta pergunta, a central
          criaria um segundo aluno com o mesmo nome, em silencio, e o professor
          passaria a acompanhar metade do progresso de alguem.
        */}
        {conflito && (
          <div className="aviso" style={{ marginTop: 14, flexDirection: 'column', gap: 10 }}>
            <span>
              Já existe um aluno chamado <strong>{conflito.nome}</strong>, com identificação
              diferente. Costuma acontecer quando a pessoa reinstalou o app ou trocou de celular.
            </span>
            <div className="acoes">
              <button
                className="botao botao--principal"
                onClick={() => tratar(aoImportar(conflito.texto, conflito.idExistente), conflito.texto)}
              >
                É a mesma pessoa
              </button>
              <button
                className="botao botao--secundario"
                onClick={() => setConflito(null)}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {espaco.apertado && (
        <p className="aviso">
          <span aria-hidden="true">⚠️</span>
          <span>
            O armazenamento deste aparelho está perto do limite
            (~{Math.round(espaco.bytes / 1024 / 1024 * 10) / 10} MB de ~5 MB). Remova algum aluno já
            concluído antes de importar mais.
          </span>
        </p>
      )}

      {lista.length > 0 && (
        <ul className="torre-lista">
          {lista.map((r) => {
            const sit = situacaoDoAluno(r)
            return (
              <li key={r.id} className={`torre-aluno torre-aluno--${sit}`}>
                <button
                  className="torre-abrir"
                  onClick={() => setAberto(aberto === r.id ? null : r.id)}
                  aria-expanded={aberto === r.id}
                >
                  <span className="torre-nome">
                    {r.nome}
                    <small>{diasTexto(r.diasSemEstudar)}</small>
                  </span>
                  <span className="torre-numeros">
                    <span className="torre-num">
                      {r.aulasFeitas}/{r.totalDeAulas}
                      <small>aulas</small>
                    </span>
                    <span className="torre-num">
                      {r.itensNaGrade}
                      <small>na grade</small>
                    </span>
                    <span className="torre-num">
                      {r.itensValidados}
                      <small>validados</small>
                    </span>
                  </span>
                </button>

                {aberto === r.id && (
                  <div className="torre-detalhe">
                    <p className="instrucao" style={{ marginBottom: 10 }}>
                      {r.totalDeRevisoes} revisões registradas · {r.duvidasAbertas} dúvida
                      {r.duvidasAbertas === 1 ? '' : 's'} em aberto
                    </p>
                    <button className="botao botao--secundario" onClick={() => aoDevolver(r.id)}>
                      Gerar arquivo de volta
                    </button>
                  </div>
                )}

                <div className="torre-rodape">
                  <span className={`torre-selo torre-selo--${sit}`}>{ROTULO_SITUACAO[sit]}</span>
                  {/* A idade do dado, sempre visivel: isto e um retrato, nao o
                      aluno ao vivo. */}
                  <span className="torre-idade">
                    exportado {quando(r.exportadoEm)} · recebido {quando(r.importadoEm)}
                  </span>
                  {confirmandoRemocao === r.id ? (
                    <span className="acoes">
                      <button
                        className="botao botao--secundario"
                        onClick={() => {
                          aoRemover(r.id)
                          setConfirmandoRemocao(null)
                        }}
                      >
                        Remover mesmo
                      </button>
                      <button className="botao botao--secundario" onClick={() => setConfirmandoRemocao(null)}>
                        Não
                      </button>
                    </span>
                  ) : (
                    <button className="link-desfazer" onClick={() => setConfirmandoRemocao(r.id)}>
                      Remover
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <p className="rodape-nota">
        Cada linha é uma <strong>cópia</strong> do que o aluno exportou, com a idade que tinha
        naquele momento. Para atualizar, peça um arquivo novo — importar de novo mescla, não
        substitui.
      </p>
    </div>
  )
}

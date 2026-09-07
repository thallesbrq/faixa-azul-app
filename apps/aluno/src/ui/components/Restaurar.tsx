/**
 * Restaurar backup — substitui TUDO neste aparelho.
 *
 * DIFERENTE DE RECEBER DO PROFESSOR, e a diferenca e a identidade:
 *
 *   receber   -> "eis o que mudou"        -> junta, mantem quem voce e aqui
 *   restaurar -> "isto sou eu, de antes"  -> substitui, assume quem o arquivo diz
 *
 * DUAS ETAPAS DE PROPOSITO. Substituir e irreversivel, e restaurar o backup de
 * outra pessoa faria este aparelho virar ela. Entao a tela mostra DE QUEM e o
 * arquivo e quanto ele traz, e so age depois de confirmado — em vez de aplicar
 * no instante em que alguem escolhe um arquivo por engano.
 */

import { useRef, useState } from 'react'

export interface Inspecao {
  nome: string
  exportadoEm: string
  mesmoPerfil: boolean
  eventos: number
}

export interface RestaurarProps {
  aoInspecionar: (
    texto: string,
  ) => { ok: true } & Inspecao | { ok: false; mensagem: string }
  aoRestaurar: (texto: string) => { ok: boolean; mensagem: string }
}

function dataCurta(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    .format(d)
}

export function Restaurar({ aoInspecionar, aoRestaurar }: RestaurarProps) {
  const entrada = useRef<HTMLInputElement>(null)
  const [pendente, setPendente] = useState<{ texto: string; info: Inspecao } | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  async function aoEscolher(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return
    const texto = await arquivo.text()
    const r = aoInspecionar(texto)
    if (!r.ok) {
      setPendente(null)
      setAviso(r.mensagem)
      return
    }
    setAviso(null)
    setPendente({ texto, info: r })
  }

  function confirmar() {
    if (!pendente) return
    const r = aoRestaurar(pendente.texto)
    setPendente(null)
    setAviso(r.mensagem)
  }

  return (
    <div className="card">
      <h3 className="detalhe-secao">Restaurar backup</h3>
      <p className="instrucao">
        Traz um arquivo seu de volta — de outro aparelho, de outro endereço do app, ou de antes de
        reinstalar. <strong>Substitui</strong> o que está aqui, incluindo sua identificação.
      </p>

      {!pendente && (
        <button className="botao botao--secundario" onClick={() => entrada.current?.click()}>
          Escolher arquivo de backup
        </button>
      )}
      <input
        ref={entrada}
        type="file"
        accept="application/json,.json"
        onChange={aoEscolher}
        hidden
      />

      {/* Confirmacao com o CONTEUDO na frente: nome, data e quanto traz. Sem
          isso, "confirmar?" e uma pergunta sem informacao. */}
      {pendente && (
        <div className="aviso" style={{ flexDirection: 'column', gap: 10, alignItems: 'stretch' }}>
          <span>
            Este arquivo é de <strong>{pendente.info.nome}</strong>
            {pendente.info.exportadoEm && <> · exportado em {dataCurta(pendente.info.exportadoEm)}</>}
            , com <strong>{pendente.info.eventos}</strong> revisões registradas.
          </span>

          {/* O caso perigoso, dito explicitamente. */}
          {!pendente.info.mesmoPerfil && (
            <span>
              ⚠️ É de <strong>outra identificação</strong> — pode ser você em outro aparelho, ou
              pode ser outra pessoa. Restaurar faz este aparelho passar a ser essa identificação.
            </span>
          )}

          <span>Tudo o que está neste aparelho agora será substituído.</span>

          <div className="acoes">
            <button className="botao botao--principal" onClick={confirmar}>
              Restaurar mesmo
            </button>
            <button className="botao botao--secundario" onClick={() => setPendente(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {aviso && (
        <p className="instrucao" style={{ marginTop: 12, marginBottom: 0 }}>
          {aviso}
        </p>
      )}
    </div>
  )
}

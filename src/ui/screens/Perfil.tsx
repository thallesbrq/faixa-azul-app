/**
 * Perfil — quem e o dono deste aparelho, e a troca de arquivos.
 *
 * O NOME NAO E ENFEITE. Sem ele, a central do professor mostra "Sem nome" em
 * todas as linhas e vinte arquivos na pasta de downloads ficam
 * indistinguiveis. E o unico campo que a pessoa PRECISA preencher.
 *
 * O INTERRUPTOR DE PAPEL NAO E SEGURANCA, e a tela diz isso. Nao ha o que
 * proteger: a central so mostra arquivos que alguem colocou naquele aparelho a
 * mao. Uma senha aqui seria teatro — sem servidor, quem tem o aparelho
 * contorna, e nao existe dado novo do outro lado.
 */

import { useRef, useState } from 'react'
import type { Origem } from '../../domain/procedencia'

export interface PerfilProps {
  nome: string
  papel: Origem
  id: string
  aoDefinir: (nome: string, papel: Origem) => void
  aoExportar: () => void
  aoImportar: (texto: string) => { ok: true; mensagem: string } | { ok: false; mensagem: string }
  /** Quantas técnicas o aparelho conhece, só para a exportação não parecer vazia. */
  totalDeItens: number
}

export function Perfil({
  nome,
  papel,
  id,
  aoDefinir,
  aoExportar,
  aoImportar,
  totalDeItens,
}: PerfilProps) {
  const [rascunho, setRascunho] = useState(nome)
  const [salvo, setSalvo] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const entrada = useRef<HTMLInputElement>(null)

  function salvar() {
    aoDefinir(rascunho.trim(), papel)
    setSalvo(true)
    window.setTimeout(() => setSalvo(false), 2500)
  }

  async function aoEscolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return
    setAviso(aoImportar(await arquivo.text()).mensagem)
    e.target.value = ''
  }

  const semNome = nome.trim() === ''

  return (
    <div>
      <div className="card">
        <h2 className="detalhe-nome">Quem usa este aparelho</h2>

        <label className="campo">
          Seu nome
          <input
            type="text"
            value={rascunho}
            onChange={(e) => setRascunho(e.target.value)}
            placeholder="Como o professor te chama"
            autoComplete="name"
          />
        </label>

        {semNome && (
          <p className="aviso" style={{ marginTop: 12 }}>
            <span aria-hidden="true">⚠️</span>
            <span>
              Sem nome, você aparece como <strong>“Sem nome”</strong> na central do professor.
            </span>
          </p>
        )}

        <div className="acoes" style={{ marginTop: 12 }}>
          <button
            className="botao botao--principal"
            onClick={salvar}
            disabled={rascunho.trim() === nome.trim()}
          >
            {salvo ? 'Salvo' : 'Salvar nome'}
          </button>
        </div>

        <h3 className="detalhe-secao" style={{ marginTop: 26 }}>
          Este aparelho é
        </h3>
        <div className="acoes">
          <button
            className={papel === 'aluno' ? 'botao botao--principal' : 'botao botao--secundario'}
            onClick={() => aoDefinir(rascunho.trim(), 'aluno')}
            aria-pressed={papel === 'aluno'}
          >
            de aluno
          </button>
          <button
            className={papel === 'professor' ? 'botao botao--principal' : 'botao botao--secundario'}
            onClick={() => aoDefinir(rascunho.trim(), 'professor')}
            aria-pressed={papel === 'professor'}
          >
            do professor
          </button>
        </div>
        <p className="instrucao" style={{ marginTop: 10, marginBottom: 0 }}>
          {papel === 'professor'
            ? 'A aba Central lista os alunos cujos arquivos você importou. As telas de estudo ficam ocultas.'
            : 'Marque “do professor” só no aparelho de quem vai acompanhar a turma — isso troca as abas do app.'}
        </p>
      </div>

      <div className="card">
        <h3 className="detalhe-secao">Enviar para o professor</h3>
        <p className="instrucao">
          Gera um arquivo com o seu preparo e o manda pelo aplicativo que você quiser. O professor
          importa na central dele, monta as aulas e devolve outro arquivo.
        </p>

        {/*
          O aluno decidiu que TUDO sobe. Entao o app precisa dizer isso: alguem
          escreveria uma duvida achando que e privada, e descobriria depois que
          o professor le. O aviso e o que torna a decisao segura.
        */}
        <p className="aviso">
          <span aria-hidden="true">👁️</span>
          <span>
            O arquivo leva <strong>tudo</strong>: revisões, dificuldades, dúvidas, registros de
            treino e anotações. Nada fica de fora.
          </span>
        </p>

        <button className="botao botao--principal" onClick={aoExportar} disabled={totalDeItens === 0}>
          Gerar meu arquivo
        </button>
      </div>

      <div className="card">
        <h3 className="detalhe-secao">Receber do professor</h3>
        <p className="instrucao">
          Importar <strong>junta</strong> com o que já está aqui — não apaga o seu estudo. A grade
          das aulas vem dele; o seu progresso continua seu.
        </p>
        <button className="botao botao--secundario" onClick={() => entrada.current?.click()}>
          Escolher arquivo
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
      </div>

      <p className="rodape-nota">
        Identificação deste aparelho: <code>{id.slice(0, 8)}</code>. Ela nasce na primeira abertura e
        é o que liga você ao seu registro na central. Se você reinstalar o app, ela muda — restaure
        um arquivo seu para recuperá-la.
      </p>
    </div>
  )
}

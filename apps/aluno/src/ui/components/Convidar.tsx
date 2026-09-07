/**
 * Convidar alguem para a academia.
 *
 * O CONVITE E POR E-MAIL E NAO POR uid, e essa nao foi escolha estetica: o uid
 * da pessoa so nasce no primeiro login dela, entao o professor nao teria o que
 * digitar. O e-mail ele sabe antes. Ver firestore.rules.
 *
 * O CONVITE NAO MANDA E-MAIL. Ele apenas autoriza — a pessoa entra pelo app
 * normalmente, pede o link, e o cadastro nasce do convite. A tela diz isso, ou
 * o professor fica esperando um e-mail que nunca sai e conclui que quebrou.
 */

import { useState } from 'react'
import type { Origem } from '@faixa-azul/core/domain/procedencia'
import type { Convite } from '@faixa-azul/core/nuvem/pessoas'
import { nomeDaTurma, SEM_TURMA, TURMAS } from '@faixa-azul/core/domain/turmas'
import { pareceEmail } from '@faixa-azul/core/nuvem/autenticacao'

export interface ConvidarProps {
  convites: Convite[]
  carregando: boolean
  aoConvidar: (entrada: {
    email: string
    nome: string
    papel: Origem
    turma: string
  }) => Promise<void>
  aoCancelar: (email: string) => Promise<void>
}

export function Convidar({ convites, carregando, aoConvidar, aoCancelar }: ConvidarProps) {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [papel, setPapel] = useState<Origem>('aluno')
  const [turma, setTurma] = useState<string>(TURMAS[0].id)
  const [aviso, setAviso] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  /**
   * A TURMA NASCE COM O CADASTRO E NAO SE CORRIGE SOZINHA DEPOIS. As regras
   * exigem que a turma do cadastro coincida com a do convite, e o convite e de
   * uso unico — entao convidar sem turma cria alguem que nao aparece em nenhuma
   * visao da central ate o professor atribuir a mao. Exigir aqui e uma trava a
   * mais no formulario; nao exigir e um aluno perdido depois.
   *
   * Professor nao tem turma: ele ve todas.
   */
  const turmaEfetiva = papel === 'professor' ? SEM_TURMA : turma
  const valido =
    nome.trim() !== '' &&
    pareceEmail(email) &&
    (papel === 'professor' || turmaEfetiva !== SEM_TURMA)

  async function convidar() {
    setEnviando(true)
    setAviso(null)
    try {
      await aoConvidar({ email, nome, papel, turma: turmaEfetiva })
      const onde = turmaEfetiva === SEM_TURMA ? '' : ` na ${nomeDaTurma(turmaEfetiva)}`
      setAviso(
        `${nome.trim()} pode entrar agora${onde}, usando ${email.trim().toLowerCase()}.`,
      )
      setNome('')
      setEmail('')
      setPapel('aluno')
      setTurma(TURMAS[0].id)
    } catch (e) {
      setAviso((e as Error)?.message ?? 'Não foi possível convidar agora.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="card">
      <h3 className="detalhe-secao">Convidar</h3>
      <p className="instrucao">
        Autoriza a pessoa a entrar. <strong>Não envia e-mail</strong> — ela abre o app, pede o link
        no próprio e-mail dela, e a conta é criada com o papel que você escolher aqui.
      </p>

      <label className="campo">
        Nome
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Como você chama a pessoa"
        />
      </label>

      <label className="campo">
        E-mail
        <input
          type="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="o e-mail que ela vai usar para entrar"
        />
      </label>

      <h4 className="rotulo-campo">Entra como</h4>
      <div className="acoes">
        <button
          className={papel === 'aluno' ? 'botao botao--principal' : 'botao botao--secundario'}
          onClick={() => setPapel('aluno')}
          aria-pressed={papel === 'aluno'}
        >
          aluno
        </button>
        <button
          className={papel === 'professor' ? 'botao botao--principal' : 'botao botao--secundario'}
          onClick={() => setPapel('professor')}
          aria-pressed={papel === 'professor'}
        >
          professor
        </button>
      </div>

      {/* A turma decide de quem e a media da turma e que grade sera montada, e o
          aluno NAO pode se transferir depois (as regras negam). Entao a escolha e
          aqui, no convite, e nao no aparelho de quem esta entrando. */}
      {papel === 'aluno' && (
        <>
          <h4 className="rotulo-campo">Entra na turma</h4>
          <div className="acoes">
            {TURMAS.map((t) => (
              <button
                key={t.id}
                className={turma === t.id ? 'botao botao--principal' : 'botao botao--secundario'}
                onClick={() => setTurma(t.id)}
                aria-pressed={turma === t.id}
              >
                {t.nome}
              </button>
            ))}
          </div>
          <p className="instrucao" style={{ marginTop: 8 }}>
            {TURMAS.find((t) => t.id === turma)?.descricao}
            {TURMAS.find((t) => t.id === turma)?.medeCurriculoDeAzul === false && (
              <>
                {' '}
                — o progresso no currículo de azul não é medido nesta turma.
              </>
            )}
          </p>
        </>
      )}

      {/* Convidar professor da acesso ao progresso de TODA a turma. Dizer isso
          aqui e mais barato que descobrir depois. */}
      {papel === 'professor' && (
        <p className="aviso" style={{ marginTop: 12 }}>
          <span aria-hidden="true">⚠️</span>
          <span>
            Como professor, essa pessoa vê o progresso de <strong>todos os alunos</strong> da
            academia e pode montar a grade de qualquer um.
          </span>
        </p>
      )}

      <div className="acoes" style={{ marginTop: 14 }}>
        <button
          className="botao botao--principal"
          onClick={convidar}
          disabled={!valido || enviando}
        >
          {enviando ? 'Convidando…' : 'Convidar'}
        </button>
      </div>

      {aviso && (
        <p className="instrucao" style={{ marginTop: 12, marginBottom: 0 }}>
          {aviso}
        </p>
      )}

      <h4 className="rotulo-campo" style={{ marginTop: 24 }}>
        Convites em aberto
      </h4>
      {carregando ? (
        <p className="instrucao" style={{ marginBottom: 0 }}>
          Carregando…
        </p>
      ) : convites.length === 0 ? (
        <p className="instrucao" style={{ marginBottom: 0 }}>
          Nenhum convite esperando. Convite usado desaparece daqui — ele vale uma vez.
        </p>
      ) : (
        <ul className="torre-lista">
          {convites.map((c) => (
            <li key={c.email} className="torre-aluno">
              <div className="torre-rodape" style={{ borderTop: 0 }}>
                <span className="torre-idade" style={{ color: 'var(--cor-texto)' }}>
                  <strong>{c.nome || c.email}</strong>
                  <br />
                  {c.email} · entra como {c.papel}
                  {c.papel === 'aluno' && <> · {nomeDaTurma(c.turma)}</>}
                </span>
                <button className="link-desfazer" onClick={() => void aoCancelar(c.email)}>
                  Cancelar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

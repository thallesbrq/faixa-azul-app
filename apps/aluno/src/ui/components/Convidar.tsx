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
import type { Papel } from '@faixa-azul/core/domain/papeis'
import type { Convite } from '@faixa-azul/core/nuvem/pessoas'
import { nomeDaTurma, SEM_TURMA, TURMAS } from '@faixa-azul/core/domain/turmas'
import { METAS, nomeDaMeta, SEM_META } from '@faixa-azul/core/domain/metas'
import { pareceEmail } from '@faixa-azul/core/nuvem/autenticacao'

export interface ConvidarProps {
  convites: Convite[]
  carregando: boolean
  aoConvidar: (entrada: {
    email: string
    nome: string
    papel: Papel
    turma: string
    meta: string
    estuda: string
  }) => Promise<void>
  aoCancelar: (email: string) => Promise<void>
}

export function Convidar({ convites, carregando, aoConvidar, aoCancelar }: ConvidarProps) {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [papel, setPapel] = useState<Papel>('aluno')
  const [turma, setTurma] = useState<string>(TURMAS[0].id)
  const [meta, setMeta] = useState<string>(METAS[0].id)
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
  /**
   * A META TAMBEM NASCE NO CONVITE, e nao depois. As regras exigem que a meta do
   * cadastro coincida com a do convite, e o convite e de uso unico — entao
   * convidar sem meta cria alguem que nao e medido contra prova nenhuma ate
   * alguem lembrar de definir a mao.
   *
   * Professor nao tem meta: ele nao esta perseguindo graduacao no app.
   */
  const metaEfetiva = papel === 'professor' ? SEM_META : meta
  /**
   * O CURRICULO NASCE IGUAL A META, e o professor pode trocar depois.
   *
   * `estuda` e `meta` sao campos diferentes (ADR-017, decisao 6), mas no convite
   * eles coincidem em todo caso normal: quem entra buscando o 1o grau estuda o
   * currículo do 1o grau. A divergencia (perseguir o 3o grau estudando azul) e
   * excecao, e o lugar certo de resolve-la e a pagina do aluno na central, com a
   * pessoa na frente — nao um quinto campo neste formulario, que o professor
   * teria de preencher toda vez para o caso de um aluno em dez.
   */
  const estudaEfetivo = metaEfetiva
  const valido =
    nome.trim() !== '' &&
    pareceEmail(email) &&
    (papel === 'professor' || (turmaEfetiva !== SEM_TURMA && metaEfetiva !== SEM_META))

  async function convidar() {
    setEnviando(true)
    setAviso(null)
    try {
      await aoConvidar({
        email,
        nome,
        papel,
        turma: turmaEfetiva,
        meta: metaEfetiva,
        estuda: estudaEfetivo,
      })
      const onde = turmaEfetiva === SEM_TURMA ? '' : ` na ${nomeDaTurma(turmaEfetiva)}`
      const rumo = metaEfetiva === SEM_META ? '' : `, buscando o ${nomeDaMeta(metaEfetiva)}`
      setAviso(
        `${nome.trim()} pode entrar agora${onde}${rumo}, usando ${email.trim().toLowerCase()}.`,
      )
      setNome('')
      setEmail('')
      setPapel('aluno')
      setTurma(TURMAS[0].id)
      setMeta(METAS[0].id)
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
          <h4 className="rotulo-campo" style={{ marginTop: 20 }}>
            Buscando
          </h4>
          {/* META E DO ALUNO, NAO DA TURMA (ADR-016, decisao 3): dois alunos da
              mesma turma podem perseguir graduacoes diferentes. */}
          <div className="acoes">
            {METAS.map((m) => (
              <button
                key={m.id}
                className={meta === m.id ? 'botao botao--principal' : 'botao botao--secundario'}
                onClick={() => setMeta(m.id)}
                aria-pressed={meta === m.id}
              >
                {m.nome}
              </button>
            ))}
          </div>
          <p className="instrucao" style={{ marginTop: 8 }}>
            {METAS.find((m) => m.id === meta)?.descricao}
          </p>

          {/* A nota "esta turma nao mede o curriculo de azul" saiu daqui: a
              turma deixou de decidir isso, e a meta acima e que decide. Manter a
              frase faria a tela afirmar uma regra que nao existe mais. */}
          <p className="instrucao" style={{ marginTop: 8 }}>
            {TURMAS.find((t) => t.id === turma)?.descricao} — turma é horário.
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
                  {c.papel === 'aluno' && (
                    <>
                      {' '}· {nomeDaTurma(c.turma)} · {nomeDaMeta(c.meta)}
                    </>
                  )}
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

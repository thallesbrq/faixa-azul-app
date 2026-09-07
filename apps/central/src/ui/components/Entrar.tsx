/**
 * Entrar na central — link por e-mail, sem senha.
 *
 * A FASE `sem-permissao` E O MOTIVO DE ESTA TELA NAO SER SO UM FORMULARIO. Quem
 * chega nela conseguiu autenticar mas nao e professor: e um aluno da academia
 * com o endereco na mao. As regras do Firestore ja negam cada leitura que ele
 * tentar — a central abriria vazia, e vazio parece defeito. Dizer o motivo uma
 * vez, com a saida visivel, e a diferenca entre "nao e para voce" e "quebrou".
 */

import { useState } from 'react'
import type { EstadoDaCentral } from '../useSessaoDoProfessor'

export interface EntrarProps {
  estado: EstadoDaCentral
  aoEnviar: (email: string) => void
  aoConcluir: (email: string, url: string) => void
  aoSair: () => void
}

export function Entrar({ estado, aoEnviar, aoConcluir, aoSair }: EntrarProps) {
  const [email, setEmail] = useState('')

  if (estado.fase === 'abrindo') {
    return (
      <div className="cartao cartao--estreito">
        <p className="apoio">Abrindo…</p>
      </div>
    )
  }

  if (estado.fase === 'concluindo') {
    return (
      <div className="cartao cartao--estreito">
        <h2>Entrando</h2>
        <p className="apoio">Confirmando o link… não feche esta página.</p>
      </div>
    )
  }

  if (estado.fase === 'link-enviado') {
    return (
      <div className="cartao cartao--estreito">
        <h2>Link enviado</h2>
        <p className="apoio">
          Mandamos um link para <strong>{estado.email}</strong>. Abra o e-mail e clique — você
          volta para cá já dentro da central.
        </p>
        <p className="apoio">
          O link vale <strong>uma vez</strong>. Se não chegar em alguns minutos, confira o spam.
        </p>
      </div>
    )
  }

  if (estado.fase === 'precisa-confirmar-email') {
    return (
      <div className="cartao cartao--estreito">
        <h2>Confirme seu e-mail</h2>
        <p className="apoio">
          Você abriu o link em um aparelho diferente do que pediu. Digite o mesmo e-mail para
          concluir.
        </p>
        <label className="campo">
          E-mail
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="o e-mail que recebeu o link"
          />
        </label>
        <button
          className="botao"
          onClick={() => aoConcluir(email, estado.url)}
          disabled={email.trim() === ''}
        >
          Concluir
        </button>
      </div>
    )
  }

  if (estado.fase === 'sem-permissao') {
    const desativado = estado.cadastro !== null && !estado.cadastro.ativo
    return (
      <div className="cartao cartao--estreito">
        <h2>Esta tela é do professor</h2>
        <p className="apoio">
          Você entrou como <strong>{estado.sessao.email ?? 'sua conta'}</strong>, mas{' '}
          {estado.cadastro === null
            ? 'esta conta não tem cadastro nesta academia'
            : desativado
              ? 'este cadastro está desativado'
              : 'esta conta é de aluno'}
          .
        </p>
        {/* Quem e aluno tem o que fazer: o app dele. Sem este ponteiro a pessoa
            fica numa tela que so sabe dizer "nao". */}
        {estado.cadastro?.papel === 'aluno' && (
          <p className="apoio">
            Seu estudo fica no app do aluno, em <a href="../">{'rg-centraldoaluno.web.app'}</a>.
          </p>
        )}
        <button className="botao botao--claro" onClick={aoSair}>
          Sair da conta
        </button>
      </div>
    )
  }

  const enviando = estado.fase === 'enviando'

  return (
    <div className="cartao cartao--estreito">
      <h2>Entrar na central</h2>
      <p className="apoio">
        Acompanhamento das turmas. Só professor da academia entra — e o servidor é que decide
        isso, não esta tela.
      </p>

      {estado.fase === 'falhou' && <p className="aviso">{estado.mensagem}</p>}

      <label className="campo">
        Seu e-mail
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@exemplo.com"
          disabled={enviando}
        />
      </label>

      <button
        className="botao"
        onClick={() => aoEnviar(email)}
        disabled={enviando || email.trim() === ''}
      >
        {enviando ? 'Enviando…' : 'Receber link por e-mail'}
      </button>

      <p className="apoio">
        Não tem senha: você recebe um link e entra clicando nele.
      </p>
    </div>
  )
}

/**
 * Entrar na conta — link por e-mail, sem senha.
 *
 * A tela diz o que o login COMPRA, e nao apenas que existe. "Entrar" sozinho
 * nao responde a pergunta do aluno, que e "para que?". As duas respostas
 * verdadeiras: o professor passa a ver o seu progresso, e voce nao perde nada
 * se trocar de celular.
 *
 * E diz tambem o que ele NAO custa: o app continua funcionando sem conta. Quem
 * nao quiser entrar segue estudando igual.
 */

import { useState } from 'react'
import type { EstadoDoLogin } from '../useSessao'
import type { EstadoDaSincronizacao } from '../useSincronizacao'

/**
 * Estado da sincronizacao em uma frase.
 *
 * O ALUNO PRECISA SABER SE O PROGRESSO CHEGOU. Sem isto, "entrei" e a ultima
 * informacao que ele tem — e ele nao consegue distinguir "o professor ja ve meu
 * estudo" de "esta tudo preso aqui e ninguem sabe". Silencio, aqui, e o mesmo
 * que mentir por omissao.
 */
function frase(s: EstadoDaSincronizacao): { texto: string; problema: boolean } {
  if (s.fase === 'sincronizando') return { texto: 'Enviando seu progresso…', problema: false }
  if (s.fase === 'erro') return { texto: s.mensagem, problema: true }
  if (s.fase === 'ociosa') {
    if (!s.ultimaEm) return { texto: 'Ainda não sincronizado.', problema: false }
    const min = Math.floor((Date.now() - new Date(s.ultimaEm).getTime()) / 60000)
    if (min < 1) return { texto: 'Progresso enviado agora.', problema: false }
    if (min === 1) return { texto: 'Progresso enviado há 1 minuto.', problema: false }
    return { texto: `Progresso enviado há ${min} minutos.`, problema: false }
  }
  return { texto: '', problema: false }
}

export interface EntrarProps {
  estado: EstadoDoLogin
  sincronizacao: EstadoDaSincronizacao
  aoSincronizar: () => void
  aoEnviar: (email: string) => void
  aoConcluir: (email: string, url: string) => void
  aoSair: () => void
  aoTentarDeNovo: () => void
}

export function Entrar({ estado, sincronizacao, aoSincronizar, aoEnviar, aoConcluir, aoSair, aoTentarDeNovo }: EntrarProps) {
  const [email, setEmail] = useState('')

  if (estado.fase === 'logado') {
    return (
      <div className="card">
        <h3 className="detalhe-secao">Sua conta</h3>
        <p className="instrucao">
          Entrou como <strong>{estado.sessao.email ?? 'sua conta'}</strong>
          {estado.cadastro.papel === 'professor' ? ', como professor' : ''}. Seu progresso vai para
          a conta, e o professor vê na central dele.
        </p>
        {(() => {
          const f = frase(sincronizacao)
          if (!f.texto) return null
          return f.problema ? (
            <p className="aviso">
              <span aria-hidden="true">⚠️</span>
              <span>{f.texto}</span>
            </p>
          ) : (
            <p className="instrucao">{f.texto}</p>
          )
        })()}

        <div className="acoes">
          <button className="botao botao--secundario" onClick={aoSincronizar}>
            Enviar agora
          </button>
          <button className="botao botao--secundario" onClick={aoSair}>
            Sair da conta
          </button>
        </div>
      </div>
    )
  }

  // Entrou, mas nao ha convite. Nao e erro tecnico: e alguem que conseguiu
  // autenticar sem ter sido convidado. A mensagem diz o que fazer, e a saida
  // fica visivel para a pessoa nao ficar presa num estado sem acao.
  if (estado.fase === 'sem-convite') {
    return (
      <div className="card">
        <h3 className="detalhe-secao">Você entrou, mas ainda não tem acesso</h3>
        <p className="instrucao">
          O e-mail <strong>{estado.sessao.email}</strong> não tem convite nesta academia. Peça ao
          seu professor para convidar esse endereço — depois disso, basta entrar de novo.
        </p>
        <p className="instrucao">
          O app continua funcionando normalmente sem conta: seu estudo fica salvo neste aparelho.
        </p>
        <button className="botao botao--secundario" onClick={aoSair}>
          Sair da conta
        </button>
      </div>
    )
  }

  if (estado.fase === 'concluindo') {
    return (
      <div className="card">
        <h3 className="detalhe-secao">Entrando</h3>
        <p className="instrucao" style={{ marginBottom: 0 }}>
          Confirmando o link… não feche esta página.
        </p>
      </div>
    )
  }

  if (estado.fase === 'link-enviado') {
    return (
      <div className="card">
        <h3 className="detalhe-secao">Link enviado</h3>
        <p className="instrucao">
          Mandamos um link para <strong>{estado.email}</strong>. Abra o e-mail e toque nele — você
          volta para cá já dentro da conta.
        </p>
        {/*
          Duas coisas que a pessoa precisa saber ANTES de ir para o e-mail, senao
          voltam como suporte: o link morre depois de usado, e pode cair na
          promocao/spam.
        */}
        <p className="instrucao" style={{ marginBottom: 0 }}>
          O link vale <strong>uma vez</strong>. Se não chegar em alguns minutos, confira o spam.
        </p>
      </div>
    )
  }

  // Link aberto num aparelho que nao pediu o link — pedir no celular e abrir no
  // computador e o caso comum. Nao e erro: e uma pergunta.
  if (estado.fase === 'precisa-confirmar-email') {
    return (
      <div className="card">
        <h3 className="detalhe-secao">Confirme seu e-mail</h3>
        <p className="instrucao">
          Você abriu o link em um aparelho diferente do que pediu. Digite o mesmo e-mail para
          concluir.
        </p>
        <label className="campo">
          E-mail
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="o e-mail que recebeu o link"
          />
        </label>
        <div className="acoes" style={{ marginTop: 12 }}>
          <button
            className="botao botao--principal"
            onClick={() => aoConcluir(email, estado.url)}
            disabled={email.trim() === ''}
          >
            Concluir
          </button>
        </div>
      </div>
    )
  }

  const enviando = estado.fase === 'enviando'

  return (
    <div className="card">
      <h3 className="detalhe-secao">Entrar na conta</h3>
      <p className="instrucao">
        Com conta, o professor acompanha seu progresso na central dele, e você não perde nada se
        trocar de celular ou reinstalar o app.
      </p>

      {estado.fase === 'falhou' && (
        <p className="aviso">
          <span aria-hidden="true">⚠️</span>
          <span>{estado.mensagem}</span>
        </p>
      )}

      <label className="campo">
        Seu e-mail
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (estado.fase === 'falhou') aoTentarDeNovo()
          }}
          placeholder="voce@exemplo.com"
          disabled={enviando}
        />
      </label>

      <div className="acoes" style={{ marginTop: 12 }}>
        <button
          className="botao botao--principal"
          onClick={() => aoEnviar(email)}
          disabled={enviando || email.trim() === ''}
        >
          {enviando ? 'Enviando…' : 'Receber link por e-mail'}
        </button>
      </div>

      {/* Sem senha nao e descuido, e menos uma coisa para vazar e esquecer. */}
      <p className="instrucao" style={{ marginTop: 12, marginBottom: 0 }}>
        Não tem senha: você recebe um link e entra tocando nele. O app continua funcionando sem
        conta — entrar só acrescenta a sincronização.
      </p>
    </div>
  )
}

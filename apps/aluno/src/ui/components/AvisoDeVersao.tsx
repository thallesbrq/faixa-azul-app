/**
 * Aviso de versao nova / pronto para offline.
 *
 * DUAS MENSAGENS DIFERENTES, e nao vale misturar: "tem versao nova" pede uma
 * acao do aluno; "ja funciona sem internet" e so uma confirmacao. Se as duas
 * tivessem a mesma cara, a que pede acao passaria batida.
 *
 * O aviso de versao fica ACIMA de tudo e nao e um `card` comum de proposito: a
 * consequencia de nao ver e receber um link do mestre e o app nao reagir, o que
 * parece defeito e nao versao velha.
 */

interface AvisoDeVersaoProps {
  temAtualizacao: boolean
  prontoOffline: boolean
  aoAtualizar: () => void
  aoDispensar: () => void
}

export function AvisoDeVersao({
  temAtualizacao,
  prontoOffline,
  aoAtualizar,
  aoDispensar,
}: AvisoDeVersaoProps) {
  if (temAtualizacao) {
    return (
      <div className="versao versao--nova" role="status">
        <div className="versao-texto">
          <strong>Tem versão nova do app.</strong>
          <span>
            Atualizar recarrega a página. Seu progresso e a grade de aulas ficam salvos no
            aparelho, então nada se perde.
          </span>
        </div>
        <div className="acoes">
          <button className="botao botao--principal" onClick={aoAtualizar}>
            Atualizar agora
          </button>
          {/* "Agora não", nunca "nunca mais": volta na proxima abertura. */}
          <button className="botao botao--secundario" onClick={aoDispensar}>
            Agora não
          </button>
        </div>
      </div>
    )
  }

  if (prontoOffline) {
    return (
      <div className="versao versao--offline" role="status">
        <div className="versao-texto">
          <span>
            <span aria-hidden="true">✓</span> Pronto para usar <strong>sem internet</strong> — dá
            para estudar no caminho da academia.
          </span>
        </div>
        <button className="botao botao--secundario" onClick={aoDispensar}>
          Ok
        </button>
      </div>
    )
  }

  return null
}

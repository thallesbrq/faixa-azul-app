/**
 * Rota da central — duas telas, sem biblioteca.
 *
 * POR QUE URL DE VERDADE E NAO SO ESTADO: a decisao 11 do ADR-015 escolheu
 * pagina propria justamente pelo que a URL da — endereco que se manda para o
 * proprio aluno, e botao voltar do navegador funcionando. Guardar a tela num
 * `useState` daria a mesma aparencia e nenhuma das duas coisas, e o botao voltar
 * passaria a SAIR da central em vez de voltar para a tabela.
 *
 * POR QUE NAO UM ROTEADOR: sao duas rotas. O React Router custa ~10 KB e traz
 * um vocabulario inteiro para resolver um `startsWith`.
 *
 * `import.meta.env.BASE_URL` e `/central/` porque a central e publicada sob esse
 * caminho, na mesma origem do app do aluno. Cravar a string aqui faria a rota
 * quebrar em silencio no dia em que o caminho mudasse — e o sintoma seria a
 * pagina do aluno virando a tabela, sem erro.
 */

import { useCallback, useEffect, useState } from 'react'

export type Rota =
  | { tela: 'turmas' }
  | { tela: 'aluno'; uid: string }
  /**
   * O planner de uma turma. URL PROPRIA pelo mesmo motivo da pagina do aluno
   * (ADR-015, decisao 11): endereco que se manda, e botao voltar funcionando.
   * Guardar em `useState` daria a mesma aparencia e nenhuma das duas coisas.
   */
  | { tela: 'planner'; turma: string }

const BASE = import.meta.env.BASE_URL

/** Caminho -> rota. Qualquer coisa que nao reconhecemos cai na tabela. */
export function rotaDoCaminho(caminho: string, base = BASE): Rota {
  const resto = caminho.startsWith(base) ? caminho.slice(base.length) : caminho.replace(/^\//, '')
  const partes = resto.split('/').filter((p) => p !== '')
  if (partes[0] === 'aluno' && partes[1]) {
    return { tela: 'aluno', uid: decodeURIComponent(partes[1]) }
  }
  if (partes[0] === 'turma' && partes[1]) {
    return { tela: 'planner', turma: decodeURIComponent(partes[1]) }
  }
  return { tela: 'turmas' }
}

export function caminhoDaRota(rota: Rota, base = BASE): string {
  if (rota.tela === 'aluno') return `${base}aluno/${encodeURIComponent(rota.uid)}`
  if (rota.tela === 'planner') return `${base}turma/${encodeURIComponent(rota.turma)}`
  return base
}

export function useRota() {
  const [rota, setRota] = useState<Rota>(() => rotaDoCaminho(window.location.pathname))

  // `popstate` e o que faz o botao voltar funcionar: sem este ouvinte a URL
  // mudaria e a tela nao, o que e pior que nao ter rota nenhuma.
  useEffect(() => {
    const aoVoltar = () => setRota(rotaDoCaminho(window.location.pathname))
    window.addEventListener('popstate', aoVoltar)
    return () => window.removeEventListener('popstate', aoVoltar)
  }, [])

  const irPara = useCallback((proxima: Rota) => {
    window.history.pushState({}, '', caminhoDaRota(proxima))
    setRota(proxima)
    // Ir para a pagina de um aluno rolado no meio da tabela abriria a pagina
    // nova pelo meio. `pushState` nao mexe na rolagem por conta propria.
    window.scrollTo(0, 0)
  }, [])

  return { rota, irPara }
}

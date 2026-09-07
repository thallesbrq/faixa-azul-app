import { describe, expect, it } from 'vitest'
import {
  EXPLICACAO_DA_FALHA,
  chaveDoEmailPendente,
  guardarEmailPendente,
  lerEmailPendente,
  limparEmailPendente,
  motivoDoErro,
  normalizarEmail,
  pareceEmail,
  pareceLinkDeLogin,
} from './autenticacao'
import type { DepositoSimples } from './autenticacao'

function deposito(): DepositoSimples & { mapa: Map<string, string> } {
  const mapa = new Map<string, string>()
  return {
    mapa,
    ler: (c) => mapa.get(c) ?? null,
    escrever: (c, v) => void mapa.set(c, v),
    remover: (c) => void mapa.delete(c),
  }
}

describe('e-mail pendente', () => {
  it('guarda e recupera entre pedir o link e voltar do e-mail', () => {
    // O Firebase exige o e-mail de volta para concluir o login, e quem digitou
    // foi a aba anterior — que pode nem existir mais.
    const d = deposito()
    guardarEmailPendente(d, 'aluno', 'thalles@exemplo.com')
    expect(lerEmailPendente(d, 'aluno')).toBe('thalles@exemplo.com')
  })

  it('NORMALIZA ao guardar — celular manda maiuscula e espaco', () => {
    // O Firebase trata como a mesma conta; a nossa comparacao ao concluir o
    // login e que ficaria diferente.
    const d = deposito()
    guardarEmailPendente(d, 'aluno', '  Thalles@Exemplo.COM ')
    expect(lerEmailPendente(d, 'aluno')).toBe('thalles@exemplo.com')
  })

  it('devolve null quando nao ha nada, e quando ha string vazia', () => {
    const d = deposito()
    expect(lerEmailPendente(d, 'aluno')).toBeNull()
    d.escrever(chaveDoEmailPendente('aluno'), '')
    expect(lerEmailPendente(d, 'aluno')).toBeNull()
  })

  it('os dois apps nao se atrapalham', () => {
    // Mesma origem, chaves diferentes: sem isso, entrar como professor apagaria
    // o e-mail pendente do aluno.
    const d = deposito()
    guardarEmailPendente(d, 'aluno', 'a@x.com')
    guardarEmailPendente(d, 'central', 'p@x.com')
    expect(lerEmailPendente(d, 'aluno')).toBe('a@x.com')
    expect(lerEmailPendente(d, 'central')).toBe('p@x.com')
  })

  it('limpa depois de usar — link de login vale uma vez', () => {
    const d = deposito()
    guardarEmailPendente(d, 'aluno', 'a@x.com')
    limparEmailPendente(d, 'aluno')
    expect(lerEmailPendente(d, 'aluno')).toBeNull()
  })
})

describe('pareceEmail', () => {
  it('aceita o que e plausivel', () => {
    for (const e of ['a@b.co', 'thalles.alvim@brq.com', 'x+tag@dominio.com.br']) {
      expect(pareceEmail(e), e).toBe(true)
    }
  })

  it('recusa o obvio antes de gastar chamada de rede', () => {
    for (const e of ['', 'sem-arroba', 'a@b', 'a@@b.com', '@b.com', 'a@.com', 'a@b.', 'a b@c.com']) {
      expect(pareceEmail(e), e).toBe(false)
    }
  })

  it('normaliza antes de julgar', () => {
    expect(pareceEmail('  THALLES@EXEMPLO.COM  ')).toBe(true)
  })
})

describe('pareceLinkDeLogin', () => {
  it('reconhece o link do Firebase', () => {
    expect(pareceLinkDeLogin('https://app.com/?mode=signIn&oobCode=ABC123&apiKey=x')).toBe(true)
  })

  it('reconhece quando vem embrulhado em `link=`', () => {
    // O Firebase embrulha o destino quando ha dominio de acao proprio.
    const interno = encodeURIComponent('https://app.com/?mode=signIn&oobCode=ABC')
    expect(pareceLinkDeLogin(`https://x.firebaseapp.com/__/auth/action?link=${interno}`)).toBe(true)
  })

  it('recusa URL comum, e nao explode com lixo', () => {
    expect(pareceLinkDeLogin('https://app.com/')).toBe(false)
    expect(pareceLinkDeLogin('https://app.com/?mode=signIn')).toBe(false)
    expect(pareceLinkDeLogin('nao e url')).toBe(false)
    expect(pareceLinkDeLogin('')).toBe(false)
  })
})

describe('traducao de erro', () => {
  it('separa erro do USUARIO de erro de CONFIGURACAO', () => {
    // Falha de configuracao nao pode virar "confira seu e-mail": a pessoa fica
    // tentando de novo achando que errou.
    expect(motivoDoErro('auth/invalid-email')).toBe('email-invalido')
    expect(motivoDoErro('auth/unauthorized-continue-uri')).toBe('dominio-nao-autorizado')
    expect(motivoDoErro('auth/operation-not-allowed')).toBe('metodo-desativado')
    expect(EXPLICACAO_DA_FALHA['dominio-nao-autorizado']).toContain('não é você')
    expect(EXPLICACAO_DA_FALHA['metodo-desativado']).toContain('não é você')
  })

  it('link usado duas vezes tem mensagem propria', () => {
    // O caso mais comum de todos, e o mais confuso se a mensagem for genérica.
    expect(motivoDoErro('auth/invalid-action-code')).toBe('link-invalido')
    expect(EXPLICACAO_DA_FALHA['link-invalido']).toContain('já foi usado')
  })

  it('aceita codigo com e sem o prefixo `auth/`', () => {
    expect(motivoDoErro('network-request-failed')).toBe('sem-rede')
    expect(motivoDoErro('auth/network-request-failed')).toBe('sem-rede')
  })

  it('codigo desconhecido nao quebra e nao mente', () => {
    expect(motivoDoErro('auth/coisa-nova-do-firebase')).toBe('desconhecido')
    expect(EXPLICACAO_DA_FALHA.desconhecido).not.toContain('e-mail')
  })

  it('toda falha tem explicacao — nenhuma cai em undefined na tela', () => {
    const motivos = [
      'email-invalido', 'dominio-nao-autorizado', 'metodo-desativado', 'link-expirado',
      'link-invalido', 'sem-rede', 'muitas-tentativas', 'desconhecido',
    ] as const
    for (const m of motivos) {
      expect(EXPLICACAO_DA_FALHA[m], m).toBeTruthy()
    }
  })
})

describe('normalizarEmail', () => {
  it('tira espaco e baixa a caixa', () => {
    expect(normalizarEmail('  A@B.com ')).toBe('a@b.com')
  })
})

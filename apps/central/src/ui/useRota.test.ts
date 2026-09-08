import { describe, expect, it } from 'vitest'
import { caminhoDaRota, rotaDoCaminho } from './useRota'

const BASE = '/central/'

describe('rotaDoCaminho', () => {
  it('a raiz da central e a tabela', () => {
    expect(rotaDoCaminho('/central/', BASE)).toEqual({ tela: 'turmas' })
  })

  it('reconhece a pagina de um aluno', () => {
    expect(rotaDoCaminho('/central/aluno/abc123', BASE)).toEqual({ tela: 'aluno', uid: 'abc123' })
  })

  it('reconhece o planner de uma turma', () => {
    expect(rotaDoCaminho('/central/turma/RGI', BASE)).toEqual({ tela: 'planner', turma: 'RGI' })
  })

  it('`turma` sem id nao e planner', () => {
    // Mesma regra do `aluno` sem uid: cai na tabela em vez de abrir um planner
    // de turma nenhuma.
    expect(rotaDoCaminho('/central/turma', BASE)).toEqual({ tela: 'turmas' })
    expect(rotaDoCaminho('/central/turma/', BASE)).toEqual({ tela: 'turmas' })
  })

  it('planner e aluno nao se confundem', () => {
    // Os dois tem a mesma forma (`prefixo/id`), e trocar um pelo outro abriria a
    // tela errada sem erro nenhum.
    expect(rotaDoCaminho('/central/aluno/RGI', BASE).tela).toBe('aluno')
    expect(rotaDoCaminho('/central/turma/RGI', BASE).tela).toBe('planner')
  })

  it('caminho desconhecido cai na tabela, e nao em tela vazia', () => {
    // O rewrite do Hosting manda /central/** para o index: qualquer coisa que
    // alguem digite chega aqui. Cair na tabela e a saida util; tela em branco
    // pareceria defeito.
    expect(rotaDoCaminho('/central/qualquer/coisa', BASE)).toEqual({ tela: 'turmas' })
  })

  it('`aluno` sem uid nao e pagina de aluno', () => {
    expect(rotaDoCaminho('/central/aluno', BASE)).toEqual({ tela: 'turmas' })
    expect(rotaDoCaminho('/central/aluno/', BASE)).toEqual({ tela: 'turmas' })
  })

  it('decodifica o uid', () => {
    expect(rotaDoCaminho('/central/aluno/a%2Fb', BASE)).toEqual({ tela: 'aluno', uid: 'a/b' })
  })

  it('funciona se a base mudar', () => {
    // A base vem de import.meta.env.BASE_URL. Cravar '/central/' faria a rota
    // quebrar em silencio no dia em que o caminho mudasse.
    expect(rotaDoCaminho('/outro/aluno/x', '/outro/')).toEqual({ tela: 'aluno', uid: 'x' })
    expect(rotaDoCaminho('/aluno/x', '/')).toEqual({ tela: 'aluno', uid: 'x' })
  })

  it('caminho fora da base nao explode', () => {
    expect(rotaDoCaminho('/fora/de/tudo', BASE)).toEqual({ tela: 'turmas' })
  })
})

describe('caminhoDaRota', () => {
  it('e a volta de rotaDoCaminho', () => {
    for (const uid of ['abc', 'a/b', 'com espaço', 'ç~ão']) {
      const caminho = caminhoDaRota({ tela: 'aluno', uid }, BASE)
      expect(rotaDoCaminho(caminho, BASE)).toEqual({ tela: 'aluno', uid })
    }
  })

  it('a volta do planner tambem fecha', () => {
    const r = { tela: 'planner' as const, turma: 'RGI' }
    expect(rotaDoCaminho(caminhoDaRota(r, BASE), BASE)).toEqual(r)
  })

  it('a tabela e a propria base', () => {
    expect(caminhoDaRota({ tela: 'turmas' }, BASE)).toBe('/central/')
  })
})

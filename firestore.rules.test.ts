/**
 * Testes das regras do Firestore.
 *
 * POR QUE ESTES TESTES EXISTEM, quando decidimos testar tela a mao: falha de
 * regra e SILENCIOSA. Nada quebra, nenhuma tela fica vermelha — apenas alguem
 * le o que nao devia. Nao ha como conferir isso olhando o app. E a checagem
 * certa nao e navegar: e "este usuario alcanca esta linha?", que roda em
 * milissegundos contra o emulador.
 *
 * Rodam sem rede e sem conta no Firebase: o emulador usa um id de projeto
 * falso. `npm run test:regras`.
 */

import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc } from 'firebase/firestore'
import { readFileSync } from 'node:fs'

const ACADEMIA = 'rilion-garopaba'
const OUTRA_ACADEMIA = 'outra-academia'

const PROF = 'prof-joao'
const PROF_DE_FORA = 'prof-de-outra'
const ALUNO_A = 'aluno-a'
const ALUNO_B = 'aluno-b'
const ALUNO_DESATIVADO = 'aluno-desativado'

let amb: RulesTestEnvironment

beforeAll(async () => {
  amb = await initializeTestEnvironment({
    projectId: 'faixa-azul-testes',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  })
})

afterAll(async () => {
  await amb.cleanup()
})

/** Semeia os cadastros ignorando as regras — e o unico jeito de partir de um
 *  estado realista sem depender das proprias regras que estamos testando. */
beforeEach(async () => {
  await amb.clearFirestore()
  await amb.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'pessoas', PROF), {
      nome: 'João Eduardo', papel: 'professor', academiaId: ACADEMIA, ativo: true,
    })
    await setDoc(doc(db, 'pessoas', PROF_DE_FORA), {
      nome: 'Outro Professor', papel: 'professor', academiaId: OUTRA_ACADEMIA, ativo: true,
    })
    await setDoc(doc(db, 'pessoas', ALUNO_A), {
      nome: 'Thalles', papel: 'aluno', academiaId: ACADEMIA, ativo: true, turma: 'RG1A',
    })
    await setDoc(doc(db, 'pessoas', ALUNO_B), {
      nome: 'Outro Aluno', papel: 'aluno', academiaId: ACADEMIA, ativo: true, turma: 'RG1B',
    })
    // SEM `turma` de proposito: e o estado de todo cadastro que existe hoje, e
    // as regras tem de continuar funcionando para ele.
    await setDoc(doc(db, 'pessoas', ALUNO_DESATIVADO), {
      nome: 'Ex-aluno', papel: 'aluno', academiaId: ACADEMIA, ativo: false,
    })

    await setDoc(doc(db, 'estados', ALUNO_A), { dados: { versao: 2 }, versao: 1 })
    await setDoc(doc(db, 'estados', ALUNO_B), { dados: { versao: 2 }, versao: 1 })
    await setDoc(doc(db, 'estados', ALUNO_DESATIVADO), { dados: { versao: 2 }, versao: 1 })
    await setDoc(doc(db, 'resumos', ALUNO_A), { aulasFeitas: 3 })
    await setDoc(doc(db, 'resumos', ALUNO_B), { aulasFeitas: 0 })
    await setDoc(doc(db, 'grades', ALUNO_A, 'aulas', '1'), { itemIds: ['x'] })
    await setDoc(doc(db, 'validacoes', 'v1'), { alunoUid: ALUNO_A, itemId: 'i1' })
    await setDoc(doc(db, 'indicacoes', ALUNO_A, 'itens', 'i1'), { video: 'https://v' })
  })
})

const como = (uid: string) => amb.authenticatedContext(uid).firestore()
const anonimo = () => amb.unauthenticatedContext().firestore()

// ---------------------------------------------------------------------------
// O caso que mais importa: um aluno nao alcanca o outro
// ---------------------------------------------------------------------------

describe('isolamento entre alunos', () => {
  it('aluno A NAO le o estado de B', async () => {
    await assertFails(getDoc(doc(como(ALUNO_A), 'estados', ALUNO_B)))
  })

  it('aluno A NAO escreve no estado de B', async () => {
    await assertFails(setDoc(doc(como(ALUNO_A), 'estados', ALUNO_B), { dados: {}, versao: 9 }))
  })

  it('aluno A NAO le o resumo de B', async () => {
    await assertFails(getDoc(doc(como(ALUNO_A), 'resumos', ALUNO_B)))
  })

  it('aluno A le e escreve o PROPRIO estado', async () => {
    await assertSucceeds(getDoc(doc(como(ALUNO_A), 'estados', ALUNO_A)))
    await assertSucceeds(setDoc(doc(como(ALUNO_A), 'estados', ALUNO_A), { dados: {}, versao: 2 }))
  })
})

// ---------------------------------------------------------------------------
// Posse: o aluno nao escreve no que e do professor
// ---------------------------------------------------------------------------

describe('posse das escritas do professor', () => {
  it('aluno NAO escreve a propria grade', async () => {
    // E o que dispensa merge entre aluno e professor: nao ha dois escritores.
    await assertFails(
      setDoc(doc(como(ALUNO_A), 'grades', ALUNO_A, 'aulas', '1'), { itemIds: ['trapaca'] }),
    )
  })

  it('aluno LE a propria grade', async () => {
    await assertSucceeds(getDoc(doc(como(ALUNO_A), 'grades', ALUNO_A, 'aulas', '1')))
  })

  it('aluno NAO cria validacao para si mesmo', async () => {
    // Validar a si proprio seria o aluno se graduando sozinho.
    await assertFails(
      addDoc(collection(como(ALUNO_A), 'validacoes'), { alunoUid: ALUNO_A, itemId: 'i2' }),
    )
  })

  it('aluno NAO escreve indicacao de video', async () => {
    await assertFails(
      setDoc(doc(como(ALUNO_A), 'indicacoes', ALUNO_A, 'itens', 'i9'), { video: 'https://x' }),
    )
  })

  it('professor escreve grade, validacao e indicacao do aluno dele', async () => {
    await assertSucceeds(
      setDoc(doc(como(PROF), 'grades', ALUNO_A, 'aulas', '2'), { itemIds: ['a', 'b'] }),
    )
    await assertSucceeds(
      addDoc(collection(como(PROF), 'validacoes'), { alunoUid: ALUNO_A, itemId: 'i3' }),
    )
    await assertSucceeds(
      setDoc(doc(como(PROF), 'indicacoes', ALUNO_A, 'itens', 'i4'), { video: 'https://y' }),
    )
  })

  it('professor NAO escreve o estado do aluno', async () => {
    // Se conseguisse, voltaria a existir corrida com a escrita do aluno.
    await assertFails(
      setDoc(doc(como(PROF), 'estados', ALUNO_A), { dados: {}, versao: 99 }),
    )
  })
})

// ---------------------------------------------------------------------------
// Validacao e append-only
// ---------------------------------------------------------------------------

describe('validacao e append-only', () => {
  it('nem o professor edita uma validacao registrada', async () => {
    // Historico de validacao reescrevivel nao serve como evidencia de grau.
    await assertFails(updateDoc(doc(como(PROF), 'validacoes', 'v1'), { itemId: 'outro' }))
  })

  it('nem o professor apaga uma validacao', async () => {
    await assertFails(deleteDoc(doc(como(PROF), 'validacoes', 'v1')))
  })
})

// ---------------------------------------------------------------------------
// Isolamento entre academias — hoje ha uma, e a regra ja esta de pe
// ---------------------------------------------------------------------------

describe('isolamento entre academias', () => {
  it('professor de OUTRA academia nao le estado, resumo nem cadastro', async () => {
    await assertFails(getDoc(doc(como(PROF_DE_FORA), 'estados', ALUNO_A)))
    await assertFails(getDoc(doc(como(PROF_DE_FORA), 'resumos', ALUNO_A)))
    await assertFails(getDoc(doc(como(PROF_DE_FORA), 'pessoas', ALUNO_A)))
  })

  it('professor de OUTRA academia nao escreve grade', async () => {
    await assertFails(
      setDoc(doc(como(PROF_DE_FORA), 'grades', ALUNO_A, 'aulas', '1'), { itemIds: ['x'] }),
    )
  })

  it('professor da academia le estado e resumo dos alunos dele', async () => {
    await assertSucceeds(getDoc(doc(como(PROF), 'estados', ALUNO_A)))
    await assertSucceeds(getDoc(doc(como(PROF), 'resumos', ALUNO_A)))
  })
})

// ---------------------------------------------------------------------------
// Escalada de privilegio
// ---------------------------------------------------------------------------

describe('escalada de privilegio', () => {
  it('aluno NAO se promove a professor', async () => {
    // Sem esta trava, um update no proprio cadastro daria acesso a turma toda.
    await assertFails(
      updateDoc(doc(como(ALUNO_A), 'pessoas', ALUNO_A), { papel: 'professor' }),
    )
  })

  it('aluno NAO se muda de academia', async () => {
    await assertFails(
      updateDoc(doc(como(ALUNO_A), 'pessoas', ALUNO_A), { academiaId: OUTRA_ACADEMIA }),
    )
  })

  it('aluno NAO se reativa sozinho', async () => {
    await assertFails(
      updateDoc(doc(como(ALUNO_DESATIVADO), 'pessoas', ALUNO_DESATIVADO), { ativo: true }),
    )
  })

  it('aluno ATUALIZA o proprio nome', async () => {
    await assertSucceeds(
      updateDoc(doc(como(ALUNO_A), 'pessoas', ALUNO_A), { nome: 'Thalles Alvim' }),
    )
  })

  it('aluno NAO se transfere de turma', async () => {
    // A turma decide de quem e a media da turma e que grade o professor monta.
    // Autoatribuicao tornaria os dois numeros opinioes do aluno.
    await assertFails(
      updateDoc(doc(como(ALUNO_A), 'pessoas', ALUNO_A), { turma: 'RG2' }),
    )
  })

  it('aluno NAO cria campo novo no proprio cadastro', async () => {
    // O ponto da lista de PERMISSAO: campo que ninguem previu nasce protegido.
    // Com a enumeracao antiga isto passava, e era assim que `turma` escaparia.
    await assertFails(
      updateDoc(doc(como(ALUNO_A), 'pessoas', ALUNO_A), { qualquerCoisa: 'x' }),
    )
  })

  it('aluno NAO apaga a propria turma', async () => {
    // Apagar tambem e mudar: sem turma, ele sai da media e da grade.
    await assertFails(
      updateDoc(doc(como(ALUNO_A), 'pessoas', ALUNO_A), { turma: '' }),
    )
  })

  it('professor ATRIBUI turma ao aluno', async () => {
    // O outro lado da mesma trava: alguem tem de poder, e e ele.
    await assertSucceeds(
      updateDoc(doc(como(PROF), 'pessoas', ALUNO_A), { turma: 'RG2' }),
    )
  })

  it('professor de OUTRA academia nao atribui turma', async () => {
    await assertFails(
      updateDoc(doc(como(PROF_DE_FORA), 'pessoas', ALUNO_A), { turma: 'RG2' }),
    )
  })

  it('ninguem se cadastra sozinho — nao existe porta aberta', async () => {
    await assertFails(
      setDoc(doc(como('intruso'), 'pessoas', 'intruso'), {
        nome: 'Intruso', papel: 'aluno', academiaId: ACADEMIA, ativo: true,
      }),
    )
  })
})

// ---------------------------------------------------------------------------
// Desativado e anonimo
// ---------------------------------------------------------------------------

describe('aluno desativado', () => {
  it('perde acesso ao proprio estado', async () => {
    // E o que faz "desativar" na central significar algo: sem isto ele
    // continuaria sincronizando, apenas invisivel para o professor.
    await assertFails(getDoc(doc(como(ALUNO_DESATIVADO), 'estados', ALUNO_DESATIVADO)))
    await assertFails(
      setDoc(doc(como(ALUNO_DESATIVADO), 'estados', ALUNO_DESATIVADO), { dados: {}, versao: 2 }),
    )
  })
})

describe('anonimo', () => {
  it('nao alcanca NADA', async () => {
    await assertFails(getDoc(doc(anonimo(), 'estados', ALUNO_A)))
    await assertFails(getDoc(doc(anonimo(), 'resumos', ALUNO_A)))
    await assertFails(getDoc(doc(anonimo(), 'pessoas', ALUNO_A)))
    await assertFails(getDoc(doc(anonimo(), 'grades', ALUNO_A, 'aulas', '1')))
  })
})

describe('colecao desconhecida', () => {
  it('nasce negada', async () => {
    // Colecao criada no futuro sem regra propria nao pode nascer aberta.
    await assertFails(setDoc(doc(como(PROF), 'qualquer_coisa', 'x'), { a: 1 }))
    await assertFails(getDoc(doc(como(ALUNO_A), 'qualquer_coisa', 'x')))
  })
})

// ---------------------------------------------------------------------------
// Convites: o furo que impedia o sistema de comecar
// ---------------------------------------------------------------------------

const EMAIL_CONVIDADO = 'novo.aluno@exemplo.com'
const NOVO_UID = 'uid-do-novo'

/** Contexto com e-mail VERIFICADO no token, como o link magico produz. */
const comEmail = (uid: string, email: string, verificado = true) =>
  amb.authenticatedContext(uid, { email, email_verified: verificado }).firestore()

describe('convites', () => {
  beforeEach(async () => {
    await amb.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'convites', EMAIL_CONVIDADO), {
        papel: 'aluno', academiaId: ACADEMIA, convidadoEm: '2026-09-07T00:00:00Z',
      })
    })
  })

  it('SEM convite, ninguem se cadastra — nao existe porta aberta', async () => {
    await assertFails(
      setDoc(doc(comEmail('intruso', 'intruso@exemplo.com'), 'pessoas', 'intruso'), {
        nome: 'Intruso', papel: 'aluno', academiaId: ACADEMIA, ativo: true,
      }),
    )
  })

  it('COM convite, a pessoa cria o proprio cadastro', async () => {
    // E o que destrava o convite: o uid so existe depois do primeiro login,
    // entao quem cria o cadastro tem de ser a propria pessoa.
    await assertSucceeds(
      setDoc(doc(comEmail(NOVO_UID, EMAIL_CONVIDADO), 'pessoas', NOVO_UID), {
        nome: 'Novo Aluno', papel: 'aluno', academiaId: ACADEMIA, ativo: true,
      }),
    )
  })

  it('com convite de ALUNO, NAO se cadastra como professor', async () => {
    // Sem essa amarra, quem tem convite veria a turma inteira.
    await assertFails(
      setDoc(doc(comEmail(NOVO_UID, EMAIL_CONVIDADO), 'pessoas', NOVO_UID), {
        nome: 'Novo Aluno', papel: 'professor', academiaId: ACADEMIA, ativo: true,
      }),
    )
  })

  it('nao se cadastra em OUTRA academia que nao a do convite', async () => {
    await assertFails(
      setDoc(doc(comEmail(NOVO_UID, EMAIL_CONVIDADO), 'pessoas', NOVO_UID), {
        nome: 'Novo Aluno', papel: 'aluno', academiaId: OUTRA_ACADEMIA, ativo: true,
      }),
    )
  })

  it('nao usa o convite de OUTRA pessoa', async () => {
    // O convite vale para o e-mail do token, nao para quem apontar para ele.
    await assertFails(
      setDoc(doc(comEmail('outro-uid', 'outro@exemplo.com'), 'pessoas', 'outro-uid'), {
        nome: 'Outro', papel: 'aluno', academiaId: ACADEMIA, ativo: true,
      }),
    )
  })

  it('e-mail NAO VERIFICADO nao vale convite', async () => {
    await assertFails(
      setDoc(doc(comEmail(NOVO_UID, EMAIL_CONVIDADO, false), 'pessoas', NOVO_UID), {
        nome: 'Novo Aluno', papel: 'aluno', academiaId: ACADEMIA, ativo: true,
      }),
    )
  })

  it('nao se cadastra ja desativado para burlar a regra de ativo', async () => {
    await assertFails(
      setDoc(doc(comEmail(NOVO_UID, EMAIL_CONVIDADO), 'pessoas', NOVO_UID), {
        nome: 'Novo Aluno', papel: 'aluno', academiaId: ACADEMIA, ativo: false,
      }),
    )
  })

  it('o convidado LE o proprio convite, e nao o de outro', async () => {
    await assertSucceeds(getDoc(doc(comEmail(NOVO_UID, EMAIL_CONVIDADO), 'convites', EMAIL_CONVIDADO)))
    await assertFails(
      getDoc(doc(comEmail('x', 'outro@exemplo.com'), 'convites', EMAIL_CONVIDADO)),
    )
  })

  it('CONVITE E DE USO UNICO: o convidado apaga o proprio', async () => {
    // Sem isso, um convite antigo valeria para sempre — e desativar alguem
    // apagando o cadastro permitiria recadastro com o convite velho.
    await assertSucceeds(
      deleteDoc(doc(comEmail(NOVO_UID, EMAIL_CONVIDADO), 'convites', EMAIL_CONVIDADO)),
    )
  })

  it('o professor cria e cancela convite; o aluno nao', async () => {
    await assertSucceeds(
      setDoc(doc(como(PROF), 'convites', 'mais.um@exemplo.com'), {
        papel: 'aluno', academiaId: ACADEMIA,
      }),
    )
    await assertFails(
      setDoc(doc(como(ALUNO_A), 'convites', 'invadindo@exemplo.com'), {
        papel: 'professor', academiaId: ACADEMIA,
      }),
    )
  })

  it('professor de OUTRA academia nao convida para a nossa', async () => {
    await assertFails(
      setDoc(doc(como(PROF_DE_FORA), 'convites', 'x@exemplo.com'), {
        papel: 'aluno', academiaId: ACADEMIA,
      }),
    )
  })

  // -------------------------------------------------------------------------
  // A turma nasce do convite, e nao da vontade de quem esta entrando
  // -------------------------------------------------------------------------

  it('convite SEM turma nao autoriza cadastro COM turma', async () => {
    // O convite deste bloco nao tem `turma` — e o formato de todo convite
    // criado antes do campo existir. Ele autoriza entrar sem turma, e nada mais.
    await assertFails(
      setDoc(doc(comEmail(NOVO_UID, EMAIL_CONVIDADO), 'pessoas', NOVO_UID), {
        nome: 'Novo Aluno', papel: 'aluno', academiaId: ACADEMIA, ativo: true, turma: 'RG1A',
      }),
    )
  })

  describe('convite com turma', () => {
    const EMAIL_RG1A = 'convidado.rg1a@exemplo.com'
    const UID_RG1A = 'uid-rg1a'

    beforeEach(async () => {
      await amb.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), 'convites', EMAIL_RG1A), {
          papel: 'aluno', academiaId: ACADEMIA, turma: 'RG1A',
          convidadoEm: '2026-09-07T00:00:00Z',
        })
      })
    })

    it('a pessoa entra na turma do convite', async () => {
      await assertSucceeds(
        setDoc(doc(comEmail(UID_RG1A, EMAIL_RG1A), 'pessoas', UID_RG1A), {
          nome: 'Convidado', papel: 'aluno', academiaId: ACADEMIA, ativo: true, turma: 'RG1A',
        }),
      )
    })

    it('NAO entra em outra turma que nao a do convite', async () => {
      // Sem esta trava, quem foi convidado para iniciantes se poria na RG2 —
      // e a media da turma passaria a depender de ninguem mentir no cadastro.
      await assertFails(
        setDoc(doc(comEmail(UID_RG1A, EMAIL_RG1A), 'pessoas', UID_RG1A), {
          nome: 'Convidado', papel: 'aluno', academiaId: ACADEMIA, ativo: true, turma: 'RG2',
        }),
      )
    })

    it('NAO entra sem turma quando o convite tem uma', async () => {
      // Omitir tambem e divergir: entraria fora de qualquer turma, invisivel em
      // todas as visoes da central.
      await assertFails(
        setDoc(doc(comEmail(UID_RG1A, EMAIL_RG1A), 'pessoas', UID_RG1A), {
          nome: 'Convidado', papel: 'aluno', academiaId: ACADEMIA, ativo: true,
        }),
      )
    })
  })
})

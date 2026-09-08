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
import { doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, addDoc } from 'firebase/firestore'
import { readFileSync } from 'node:fs'

const ACADEMIA = 'rilion-garopaba'
const OUTRA_ACADEMIA = 'outra-academia'

const PROF = 'prof-joao'
const PROF_DE_FORA = 'prof-de-outra'
const ALUNO_A = 'aluno-a'
const ALUNO_B = 'aluno-b'
const ALUNO_DESATIVADO = 'aluno-desativado'
/**
 * O DESENVOLVEDOR (ADR-017, decisao 1): ve a academia inteira e NAO assina
 * evidencia. Ele tambem tem cadastro de aluno nesta mesma academia (`FLOKI`),
 * que e exatamente o que torna a distincao necessaria e nao teorica — sem ela,
 * `mesmaAcademiaQue` deixaria ele atestar a propria competencia.
 */
const ADMIN = 'admin-thalles'
const FLOKI = 'floki-aluno-do-admin'

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
    await setDoc(doc(db, 'pessoas', ADMIN), {
      nome: 'Thalles', papel: 'admin', academiaId: ACADEMIA, ativo: true,
    })
    await setDoc(doc(db, 'pessoas', FLOKI), {
      nome: 'Floki Fenrrirson', papel: 'aluno', academiaId: ACADEMIA, ativo: true,
      turma: 'RGI', meta: '3grau', estuda: 'azul', demo: true,
    })
    await setDoc(doc(db, 'pessoas', ALUNO_A), {
      nome: 'Thalles', papel: 'aluno', academiaId: ACADEMIA, ativo: true, turma: 'RGI', meta: 'azul', estuda: 'azul',
    })
    await setDoc(doc(db, 'pessoas', ALUNO_B), {
      nome: 'Outro Aluno', papel: 'aluno', academiaId: ACADEMIA, ativo: true, turma: 'RGI', meta: '1grau', estuda: '1grau',
    })
    // SEM `turma` de proposito: e o estado de todo cadastro que existe hoje, e
    // as regras tem de continuar funcionando para ele.
    await setDoc(doc(db, 'pessoas', ALUNO_DESATIVADO), {
      nome: 'Ex-aluno', papel: 'aluno', academiaId: ACADEMIA, ativo: false,
    })

    await setDoc(doc(db, 'estados', FLOKI), { dados: { versao: 2 }, versao: 1 })
    await setDoc(doc(db, 'estados', ALUNO_A), { dados: { versao: 2 }, versao: 1 })
    await setDoc(doc(db, 'estados', ALUNO_B), { dados: { versao: 2 }, versao: 1 })
    await setDoc(doc(db, 'estados', ALUNO_DESATIVADO), { dados: { versao: 2 }, versao: 1 })
    await setDoc(doc(db, 'resumos', ALUNO_A), { aulasFeitas: 3 })
    await setDoc(doc(db, 'resumos', ALUNO_B), { aulasFeitas: 0 })
    await setDoc(doc(db, 'grades', ALUNO_A, 'aulas', '1'), { itemIds: ['x'] })
    await setDoc(doc(db, 'validacoes', 'v1'), { alunoUid: ALUNO_A, itemId: 'i1' })
    await setDoc(doc(db, 'competencias', ALUNO_A, 'registros', 'c1'), {
      itemId: 'i1', competente: true, texto: 'fez limpo', origem: 'aula_regular',
      professorUid: PROF, registradaEm: '2026-09-07T00:00:00Z',
    })
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
// Competencias e graduacoes: o atestado do 1o grau
// ---------------------------------------------------------------------------

describe('competencias atestadas', () => {
  const nova = (over: Record<string, unknown> = {}) => ({
    itemId: 'i2',
    competente: true,
    texto: 'fez limpo dos dois lados',
    origem: 'aula_regular',
    professorUid: PROF,
    registradaEm: '2026-09-07T10:00:00Z',
    ...over,
  })

  it('o professor ATESTA competencia do aluno dele', async () => {
    await assertSucceeds(
      addDoc(collection(como(PROF), 'competencias', ALUNO_A, 'registros'), nova()),
    )
  })

  it('o aluno NAO atesta a si mesmo', async () => {
    // Atestar a si proprio seria o aluno se graduando sozinho.
    await assertFails(
      addDoc(collection(como(ALUNO_A), 'competencias', ALUNO_A, 'registros'), nova({ professorUid: ALUNO_A })),
    )
  })

  it('o aluno LE as proprias competencias', async () => {
    // Ele tem direito de saber o que o professor atestou sobre ele.
    await assertSucceeds(getDoc(doc(como(ALUNO_A), 'competencias', ALUNO_A, 'registros', 'c1')))
  })

  it('aluno A nao le as competencias de B', async () => {
    await assertFails(getDoc(doc(como(ALUNO_A), 'competencias', ALUNO_B, 'registros', 'c1')))
  })

  it('o professor LISTA as competencias de um aluno', async () => {
    // E a razao de o uid estar no CAMINHO e nao dentro do documento: com ele no
    // corpo, a regra so seria decidivel documento por documento e o Firestore
    // recusaria a consulta — e a folha do atestado nao carregaria.
    await assertSucceeds(getDocs(collection(como(PROF), 'competencias', ALUNO_A, 'registros')))
  })

  it('atestacao SEM TEXTO e recusada pelo servidor', async () => {
    // O cliente ja exige, mas o cliente e codigo no navegador de qualquer um.
    await assertFails(
      addDoc(collection(como(PROF), 'competencias', ALUNO_A, 'registros'), nova({ texto: '' })),
    )
  })

  it('professor NAO assina atestacao com o uid de OUTRO professor', async () => {
    await assertFails(
      addDoc(collection(como(PROF), 'competencias', ALUNO_A, 'registros'), nova({ professorUid: PROF_DE_FORA })),
    )
  })

  it('APPEND-ONLY: nem o professor edita ou apaga uma atestacao', async () => {
    // Evidencia de graduacao reescrivel nao serve como evidencia. Retirar e um
    // registro novo com `competente: false`.
    await assertFails(
      updateDoc(doc(como(PROF), 'competencias', ALUNO_A, 'registros', 'c1'), { competente: false }),
    )
    await assertFails(deleteDoc(doc(como(PROF), 'competencias', ALUNO_A, 'registros', 'c1')))
  })

  it('RETIRAR e um registro novo, e isso E permitido', async () => {
    await assertSucceeds(
      addDoc(collection(como(PROF), 'competencias', ALUNO_A, 'registros'), nova({ itemId: 'i1', competente: false, texto: 'errou o detalhe do quadril' })),
    )
  })

  it('professor de OUTRA academia nao atesta nem le', async () => {
    await assertFails(
      addDoc(collection(como(PROF_DE_FORA), 'competencias', ALUNO_A, 'registros'), nova({ professorUid: PROF_DE_FORA })),
    )
    await assertFails(getDoc(doc(como(PROF_DE_FORA), 'competencias', ALUNO_A, 'registros', 'c1')))
  })

  it('anonimo nao alcanca competencia nenhuma', async () => {
    await assertFails(getDoc(doc(anonimo(), 'competencias', ALUNO_A, 'registros', 'c1')))
  })
})

describe('graduacoes concedidas', () => {
  const concessao = (over: Record<string, unknown> = {}) => ({
    meta: '1grau',
    texto: 'fechou os 29 itens e as 35 aulas',
    professorUid: PROF,
    aulasConfirmadas: 36,
    concedidaEm: '2026-09-07T10:00:00Z',
    ...over,
  })

  it('o professor CONCEDE a graduacao', async () => {
    await assertSucceeds(
      addDoc(collection(como(PROF), 'graduacoes', ALUNO_A, 'registros'), concessao()),
    )
  })

  it('o aluno NAO se gradua', async () => {
    await assertFails(
      addDoc(collection(como(ALUNO_A), 'graduacoes', ALUNO_A, 'registros'), concessao({ professorUid: ALUNO_A })),
    )
  })

  it('concessao sem META ou sem TEXTO e recusada', async () => {
    await assertFails(
      addDoc(collection(como(PROF), 'graduacoes', ALUNO_A, 'registros'), concessao({ meta: '' })),
    )
    await assertFails(
      addDoc(collection(como(PROF), 'graduacoes', ALUNO_A, 'registros'), concessao({ texto: '' })),
    )
  })

  it('o aluno LE as proprias graduacoes', async () => {
    await assertSucceeds(getDocs(collection(como(ALUNO_A), 'graduacoes', ALUNO_A, 'registros')))
  })

  it('APPEND-ONLY: graduacao concedida nao se apaga', async () => {
    await amb.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'graduacoes', ALUNO_A, 'registros', 'g1'), concessao())
    })
    await assertFails(deleteDoc(doc(como(PROF), 'graduacoes', ALUNO_A, 'registros', 'g1')))
    await assertFails(updateDoc(doc(como(PROF), 'graduacoes', ALUNO_A, 'registros', 'g1'), { meta: 'azul' }))
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
// O papel `admin` (ADR-017, decisao 1 e 2)
//
// A DIVISAO E "O QUE NAO SE DESFAZ": o admin administra o que se desfaz, o
// professor assina o que nao se desfaz. Tudo aqui existe porque o desenvolvedor
// precisa da visao geral e NAO pode conceder a si mesmo a graduacao.
// ---------------------------------------------------------------------------

describe('admin: ve tudo', () => {
  it('le o cadastro de qualquer aluno da academia', async () => {
    await assertSucceeds(getDoc(doc(como(ADMIN), 'pessoas', ALUNO_A)))
  })

  it('le o estado e o resumo de qualquer aluno', async () => {
    await assertSucceeds(getDoc(doc(como(ADMIN), 'estados', ALUNO_A)))
    await assertSucceeds(getDoc(doc(como(ADMIN), 'resumos', ALUNO_A)))
  })

  it('lista as pessoas e os convites', async () => {
    await assertSucceeds(getDocs(collection(como(ADMIN), 'pessoas')))
    await assertSucceeds(getDocs(collection(como(ADMIN), 'convites')))
  })

  it('o PROFESSOR tambem lista pessoas — e isto estava QUEBRADO', async () => {
    /**
     * BUG PRE-EXISTENTE, achado ao escrever o bloco do admin.
     *
     * `allow read` numa linha so nao cobre `list`: na consulta de colecao o
     * curinga `{uid}` nao esta ligado, `mesmaAcademiaQue(null)` monta
     * `get(pessoas/null)`, a regra ERRA, e erro em regra e negacao. Ou seja:
     * `listarPessoas()` — a primeira coisa que a Central faz — era recusada
     * tambem para o professor.
     *
     * Confirmado como anterior a esta mudanca rodando a mesma sonda contra a
     * versao anterior do arquivo de regras. As 67 assercoes que existiam pediam
     * `pessoas` DOCUMENTO POR DOCUMENTO; nenhuma listava. O caminho mais usado da
     * colecao mais importante da Central nao tinha teste.
     */
    await assertSucceeds(getDocs(collection(como(PROF), 'pessoas')))
  })

  it('o ALUNO nao lista pessoas', async () => {
    // `list` liberado para gestor nao pode ter afrouxado o aluno junto.
    await assertFails(getDocs(collection(como(ALUNO_A), 'pessoas')))
  })

  it('professor de OUTRA academia lista, e a lista dele nao e o que importa aqui', async () => {
    /**
     * HONESTIDADE SOBRE O QUE ESTA REGRA NAO FAZ: `list` liberado por
     * `souGestor()` NAO filtra por academia — ele nao pode, porque a regra de
     * lista nao ve documento nenhum. Um professor de outra academia consegue
     * abrir a consulta.
     *
     * ISSO E ACEITAVEL HOJE E NAO SERA quando existir a segunda academia. O
     * conserto e filtrar a consulta no cliente por `academiaId` e exigir esse
     * filtro na regra (`request.query`), ou por a academia numa custom claim.
     * Fica registrado como divida com o gatilho escrito: a segunda academia.
     */
    await assertSucceeds(getDocs(collection(como(PROF_DE_FORA), 'pessoas')))
  })

  it('escreve a grade de aula do aluno', async () => {
    await assertSucceeds(
      setDoc(doc(como(ADMIN), 'grades', ALUNO_A, 'aulas', '2'), { itemIds: ['y'] }),
    )
  })

  it('atribui turma e meta', async () => {
    await assertSucceeds(updateDoc(doc(como(ADMIN), 'pessoas', ALUNO_A), { turma: 'RG2' }))
    await assertSucceeds(updateDoc(doc(como(ADMIN), 'pessoas', ALUNO_A), { meta: '1grau' }))
    await assertSucceeds(updateDoc(doc(como(ADMIN), 'pessoas', ALUNO_A), { estuda: '1grau' }))
  })

  it('apaga cadastro — e isso e de proposito, por causa da LGPD', async () => {
    // Atender pedido de exclusao de dados e trabalho administrativo. Um admin
    // que nao apaga nao honra a lei, e a simetria com `papel` custaria isso.
    await assertSucceeds(deleteDoc(doc(como(ADMIN), 'pessoas', ALUNO_B)))
  })
})

describe('admin: NAO assina evidencia', () => {
  it('NAO atesta competencia de aluno nenhum', async () => {
    await assertFails(
      setDoc(doc(como(ADMIN), 'competencias', ALUNO_A, 'registros', 'novo'), {
        itemId: 'i2', competente: true, texto: 'vi fazer',
        professorUid: ADMIN, registradaEm: '2026-09-07T00:00:00Z',
      }),
    )
  })

  it('NAO atesta a competencia do PROPRIO cadastro de aluno', async () => {
    /**
     * ESTE E O TESTE QUE JUSTIFICA O PAPEL EXISTIR.
     *
     * O admin e o desenvolvedor, e ele tem cadastro de aluno (`FLOKI`) na mesma
     * academia. Enquanto `competencias` usava `mesmaAcademiaQue`, esta escrita
     * seria PERMITIDA — e o log append-only do ADR-010, feito para que evidencia
     * de graduacao nao seja reescrevivel, viraria decoracao: quem escreve o app
     * assinaria a propria graduacao.
     */
    await assertFails(
      setDoc(doc(como(ADMIN), 'competencias', FLOKI, 'registros', 'proprio'), {
        itemId: 'i2', competente: true, texto: 'eu me vi fazendo',
        professorUid: ADMIN, registradaEm: '2026-09-07T00:00:00Z',
      }),
    )
  })

  it('NAO concede graduacao', async () => {
    await assertFails(
      setDoc(doc(como(ADMIN), 'graduacoes', FLOKI, 'registros', 'g'), {
        meta: '1grau', texto: 'mereceu', professorUid: ADMIN,
        concedidaEm: '2026-09-07T00:00:00Z',
      }),
    )
  })

  it('NAO valida o texto de uma tecnica', async () => {
    // Ele escreveu o conteudo do app. Deixa-lo validar seria conferir o proprio
    // trabalho e chamar isso de conferencia do professor.
    await assertFails(
      addDoc(collection(como(ADMIN), 'validacoes'), { alunoUid: ALUNO_A, itemId: 'i9' }),
    )
  })

  it('mas LE a evidencia que o professor assinou', async () => {
    await assertSucceeds(getDocs(collection(como(ADMIN), 'competencias', ALUNO_A, 'registros')))
  })
})

describe('admin: NAO mexe em papel — a porta dos fundos', () => {
  it('NAO se promove a professor', async () => {
    /**
     * SEM ESTA LINHA, TODO O BLOCO ACIMA E TEATRO: bastaria um update no proprio
     * cadastro para o admin passar a assinar competencia e graduacao. A regra que
     * impede o desenvolvedor de se graduar nao e a de `competencias` — e esta.
     */
    await assertFails(updateDoc(doc(como(ADMIN), 'pessoas', ADMIN), { papel: 'professor' }))
  })

  it('NAO promove outra pessoa a professor', async () => {
    await assertFails(updateDoc(doc(como(ADMIN), 'pessoas', ALUNO_A), { papel: 'professor' }))
  })

  it('NAO rebaixa o professor a aluno', async () => {
    // O caminho longo: tirar o poder de quem tem, para ser o unico que sobra.
    await assertFails(updateDoc(doc(como(ADMIN), 'pessoas', PROF), { papel: 'aluno' }))
  })

  it('NAO cria cadastro de professor nem de admin', async () => {
    await assertFails(
      setDoc(doc(como(ADMIN), 'pessoas', 'novo-prof'), {
        nome: 'X', papel: 'professor', academiaId: ACADEMIA, ativo: true,
      }),
    )
    await assertFails(
      setDoc(doc(como(ADMIN), 'pessoas', 'novo-admin'), {
        nome: 'X', papel: 'admin', academiaId: ACADEMIA, ativo: true,
      }),
    )
  })

  it('NAO convida como professor — a porta de entrada tem a mesma trava', () => {
    // Sem isto, o admin se convidaria de novo com um segundo e-mail, entraria
    // como professor, e assinaria. A porta dos fundos anula a da frente.
    return assertFails(
      setDoc(doc(como(ADMIN), 'convites', 'eu-de-novo@x.test'), {
        nome: 'Eu', papel: 'professor', academiaId: ACADEMIA, turma: '', meta: '',
        convidadoEm: '2026-09-07T00:00:00Z',
      }),
    )
  })

  it('convida ALUNO, que e o que ele precisa fazer', async () => {
    await assertSucceeds(
      setDoc(doc(como(ADMIN), 'convites', 'willian@x.test'), {
        nome: 'Willian', papel: 'aluno', academiaId: ACADEMIA, turma: 'RGI',
        meta: '1grau', estuda: '1grau', convidadoEm: '2026-09-07T00:00:00Z',
      }),
    )
  })

  it('cria cadastro de ALUNO direto', async () => {
    await assertSucceeds(
      setDoc(doc(como(ADMIN), 'pessoas', 'novo-aluno'), {
        nome: 'Novo', papel: 'aluno', academiaId: ACADEMIA, ativo: true,
        turma: 'RGI', meta: '1grau', estuda: '1grau',
      }),
    )
  })
})

describe('o professor continua podendo tudo', () => {
  it('muda papel, inclusive nomeando outro professor', async () => {
    await assertSucceeds(updateDoc(doc(como(PROF), 'pessoas', ALUNO_A), { papel: 'professor' }))
  })

  it('assina competencia do aluno do admin', async () => {
    await assertSucceeds(
      setDoc(doc(como(PROF), 'competencias', FLOKI, 'registros', 'do-prof'), {
        itemId: 'i2', competente: true, texto: 'Floki fez limpo',
        professorUid: PROF, registradaEm: '2026-09-07T00:00:00Z',
      }),
    )
  })
})

describe('o ALUNO nao ganha nada com o papel novo', () => {
  it('nao se promove a admin', async () => {
    // `admin` e um papel novo, e o aluno nao pode alcancar nenhum deles.
    await assertFails(updateDoc(doc(como(ALUNO_A), 'pessoas', ALUNO_A), { papel: 'admin' }))
  })

  it('nao le o cadastro do admin', async () => {
    await assertFails(getDoc(doc(como(ALUNO_A), 'pessoas', ADMIN)))
  })

  it('nao atesta a propria competencia', async () => {
    await assertFails(
      setDoc(doc(como(ALUNO_A), 'competencias', ALUNO_A, 'registros', 'eu'), {
        itemId: 'i2', competente: true, texto: 'eu sei',
        professorUid: ALUNO_A, registradaEm: '2026-09-07T00:00:00Z',
      }),
    )
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

  it('aluno NAO troca a propria META', async () => {
    // A meta decide contra QUE PROVA ele e medido. Autoatribuicao deixaria o
    // aluno escolher o proprio exame.
    //
    // Nenhuma regra nova foi escrita para isto: `hasOnly(['nome'])` fez o campo
    // nascer protegido. Com a enumeracao antiga, `meta` teria escapado igual a
    // `turma` teria escapado.
    await assertFails(
      updateDoc(doc(como(ALUNO_A), 'pessoas', ALUNO_A), { meta: '1grau' }),
    )
  })

  it('professor TROCA a meta do aluno', async () => {
    await assertSucceeds(
      updateDoc(doc(como(PROF), 'pessoas', ALUNO_A), { meta: '1grau' }),
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

  // -------------------------------------------------------------------------
  // Convite de PROFESSOR: o caminho que o professor da academia percorre
  // -------------------------------------------------------------------------

  describe('convite de professor', () => {
    const EMAIL_PROF = 'joao.eduardo@exemplo.com'
    const UID_PROF = 'uid-joao'

    beforeEach(async () => {
      await amb.withSecurityRulesDisabled(async (ctx) => {
        // Professor nao tem turma: ele ve todas. A tela de convite nem oferece
        // o seletor nesse papel, e o convite nasce sem a chave.
        await setDoc(doc(ctx.firestore(), 'convites', EMAIL_PROF), {
          nome: 'João Eduardo', papel: 'professor', academiaId: ACADEMIA,
          convidadoEm: '2026-09-07T00:00:00Z',
        })
      })
    })

    it('o convidado nasce PROFESSOR, e nao aluno', async () => {
      // Este e o primeiro acesso do professor da academia. Nunca havia sido
      // exercido: as outras assercoes de convite cobrem papel aluno.
      await assertSucceeds(
        setDoc(doc(comEmail(UID_PROF, EMAIL_PROF), 'pessoas', UID_PROF), {
          nome: 'João Eduardo', papel: 'professor', academiaId: ACADEMIA, ativo: true,
        }),
      )
    })

    it('convite de professor NAO autoriza nascer com turma', async () => {
      // O convite nao tem a chave, entao `get('turma','')` exige '' no cadastro.
      await assertFails(
        setDoc(doc(comEmail(UID_PROF, EMAIL_PROF), 'pessoas', UID_PROF), {
          nome: 'João Eduardo', papel: 'professor', academiaId: ACADEMIA, ativo: true,
          turma: 'RG1A',
        }),
      )
    })

    it('recem-nascido professor JA alcanca os alunos da academia', async () => {
      // Nao basta o cadastro nascer: se as regras nao o reconhecessem em
      // seguida, ele entraria numa central que nega tudo — e o sintoma seria
      // uma tela vazia, sem erro.
      await amb.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), 'pessoas', UID_PROF), {
          nome: 'João Eduardo', papel: 'professor', academiaId: ACADEMIA, ativo: true,
        })
      })
      const dele = comEmail(UID_PROF, EMAIL_PROF)
      await assertSucceeds(getDoc(doc(dele, 'pessoas', ALUNO_A)))
      await assertSucceeds(getDoc(doc(dele, 'estados', ALUNO_A)))
      await assertSucceeds(getDoc(doc(dele, 'resumos', ALUNO_A)))
      // E consegue convidar alunos, que e a outra coisa que ele fara.
      await assertSucceeds(
        setDoc(doc(dele, 'convites', 'novo.aluno2@exemplo.com'), {
          papel: 'aluno', academiaId: ACADEMIA, turma: 'RG1A',
        }),
      )
    })
  })

  describe('convite com meta', () => {
    const EMAIL_META = 'convidado.meta@exemplo.com'
    const UID_META = 'uid-meta'

    beforeEach(async () => {
      await amb.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), 'convites', EMAIL_META), {
          papel: 'aluno', academiaId: ACADEMIA, turma: 'RG1A', meta: '1grau',
          convidadoEm: '2026-09-07T00:00:00Z',
        })
      })
    })

    it('nasce na meta do convite', async () => {
      await assertSucceeds(
        setDoc(doc(comEmail(UID_META, EMAIL_META), 'pessoas', UID_META), {
          nome: 'Convidado', papel: 'aluno', academiaId: ACADEMIA, ativo: true,
          turma: 'RG1A', meta: '1grau',
        }),
      )
    })

    it('NAO nasce em outra meta que nao a do convite', async () => {
      // Sem esta trava, quem foi convidado para o 1o grau se poria no azul — e o
      // progresso dele passaria a ser medido contra a prova errada.
      await assertFails(
        setDoc(doc(comEmail(UID_META, EMAIL_META), 'pessoas', UID_META), {
          nome: 'Convidado', papel: 'aluno', academiaId: ACADEMIA, ativo: true,
          turma: 'RGI', meta: 'azul', estuda: 'azul',
        }),
      )
    })

    it('NAO nasce sem meta quando o convite tem uma', async () => {
      await assertFails(
        setDoc(doc(comEmail(UID_META, EMAIL_META), 'pessoas', UID_META), {
          nome: 'Convidado', papel: 'aluno', academiaId: ACADEMIA, ativo: true,
          turma: 'RG1A',
        }),
      )
    })
  })

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

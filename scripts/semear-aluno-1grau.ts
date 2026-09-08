/**
 * Semeia um aluno de DEMONSTRACAO medido por ATESTADO na RGI.
 *
 * POR QUE ELE EXISTE, e nao e o mesmo motivo do Floki. A matriz de
 * acompanhamento (`application/acompanhamento`) mostra os 29 itens do 1o grau
 * contra os alunos da turma, e ela filtra por `estuda === '1grau'`. Hoje isso da
 * ZERO colunas: o Willian e o Henrique estao em `convites` e so viram cadastro
 * quando criarem conta; o Floki estuda `azul` e fica fora de proposito. Resultado:
 * a tela mostra "Nenhum aluno entrou nesta turma ainda" e o professor nao tem como
 * conferir se ela funciona antes de haver aluno de verdade nela.
 *
 * Este cadastro da a ela uma coluna.
 *
 * ---------------------------------------------------------------------------
 * O QUE ELE **NAO** ESCREVE, e a razao e de categoria e nao de esforco:
 *
 *   - `estados/{uid}`  — estado de CARTAO. Um aluno de `1grau` e medido por
 *     atestado, nao por cartao; um estado aqui produziria porcentagem de dominio
 *     num curriculo que nao usa dominio. `estadosDe` trata documento ausente como
 *     AUSENCIA e nao falha (ver `nuvem/central`), entao a Central mostra a linha
 *     sem progresso de cartao, que e a verdade: ele nunca abriu o app.
 *
 *   - `resumos/{uid}`  — diz `sincronizadoEm`. Nenhuma sincronizacao aconteceu.
 *     Escrever um resumo de zeros com data de agora afirmaria um evento que nao
 *     houve.
 *
 *   - `competencias/{uid}/registros/*`  — ESTE E O IMPORTANTE. Atestacao e a
 *     ASSINATURA DO PROFESSOR num log append-only que o ADR-010 trata como
 *     evidencia de graduacao. Semear revisao de cartao e fabricar pratica do
 *     aluno; semear atestacao e fabricar a assinatura de outra pessoa. Sao coisas
 *     de natureza diferente, e a segunda nao se faz nem em demonstracao.
 *
 * O efeito pratico e o desejado: os itens ja dados em aula nascem PENDENTES, que
 * e o estado clicavel. Quem for testar clica e ve virar atestado — que e
 * exatamente o fluxo em teste.
 * ---------------------------------------------------------------------------
 *
 * SEM CONTA DE AUTENTICACAO, igual ao Floki: o `uid` e sintetico e prefixado com
 * `demo-`, para quem olhar o banco distinguir isto de um uid do Firebase Auth
 * (opaco, 28 caracteres) sem consultar nada. Ninguem consegue entrar como ele.
 *
 * Rodar:  npx vite-node scripts/semear-aluno-1grau.ts
 */

import { montarAcompanhamento } from '../packages/core/src/application/acompanhamento'
import { ITENS_1GRAU, MODULOS_1GRAU } from '../packages/core/src/seed/primeiro-grau'
import { ACADEMIA, gravar, ler, listar } from './firestore-rest'

const ALUNO = {
  uid: 'demo-aluno-1grau',
  /**
   * NOME CURTO E OBVIAMENTE FALSO.
   *
   * Curto porque na matriz ele e cabecalho de coluna (`ac-aluno-nome`) ao lado de
   * um placar "0/29", e nome longo empurra a tabela para a rolagem horizontal.
   * Obviamente falso porque ele vai aparecer na mesma tabela que Willian e
   * Henrique, que sao pessoas reais num teste com consentimento — um nome
   * plausivel ali seria uma pessoa que ninguem consegue identificar.
   *
   * `demo: true` faz a Central mostrar a etiqueta "demo" ao lado do nome; o nome
   * nao depende dela, porque etiqueta se perde num print e o nome nao.
   */
  nome: 'Aluno Demo',
  turma: 'RGI',
  /** A prova que ele persegue E o curriculo que ele treina: os dois, 1o grau. */
  meta: '1grau',
  estuda: '1grau',
  temParticulares: false,
  demo: true,
}

/**
 * Nao sobrescreve cadastro que nao seja de demonstracao.
 *
 * O risco real nao e colisao de uid — `demo-aluno-1grau` nao sai do Firebase
 * Auth. E rodar isto uma segunda vez depois de alguem ter promovido este
 * documento a algo em uso (mudado a turma, o papel, o `estuda`). O `PATCH` com
 * mascara so mexe nos campos que eu mando, mas mandar `estuda: '1grau'` em cima
 * de uma alteracao deliberada e desfaze-la sem aviso.
 */
async function conferirAntes(): Promise<'novo' | 'demo' | never> {
  const atual = await ler(`pessoas/${ALUNO.uid}`)
  if (!atual) return 'novo'
  if (atual.demo !== true) {
    throw new Error(
      `pessoas/${ALUNO.uid} existe e NAO tem demo: true. Recuso sobrescrever: ` +
        `confira o documento a mao antes (nome=${String(atual.nome)}, papel=${String(atual.papel)}).`,
    )
  }
  return 'demo'
}

/**
 * O que a matriz vai mostrar, calculado com a MESMA funcao que a tela usa.
 *
 * Isto e o que faz o script se auto-conferir. Semear o cadastro e barato; o que
 * pode estar errado e a expectativa: se nenhuma aula da turma tem data no
 * passado, a coluna nasce inteira em branco e quem abrir a tela vai ler isso como
 * defeito. Prever com `montarAcompanhamento` — e nao com uma regra reescrita aqui
 * — garante que este numero e o numero da tela. Uma segunda implementacao da
 * regra concordaria hoje e divergiria na primeira mudanca.
 */
async function preverAMatriz(hoje: Date) {
  const docs = await listar(`programas/${ALUNO.turma}/aulas`)
  const aulas = docs.map((d) => ({
    numero: Number(d.id),
    slot: typeof d.dados.slot === 'string' ? d.dados.slot : '',
    itemIds: Array.isArray(d.dados.itemIds) ? (d.dados.itemIds as string[]) : [],
  }))

  return {
    aulas: aulas.length,
    acompanhamento: montarAcompanhamento({
      turma: ALUNO.turma,
      alunos: [{ uid: ALUNO.uid, nome: ALUNO.nome }],
      itens: ITENS_1GRAU,
      modulos: MODULOS_1GRAU,
      aulas,
      registrosPorAluno: new Map(),
      hoje,
    }),
  }
}

async function main() {
  const agora = new Date()
  const antes = await conferirAntes()

  await gravar(`pessoas/${ALUNO.uid}`, {
    nome: ALUNO.nome,
    papel: 'aluno',
    academiaId: ACADEMIA,
    ativo: true,
    turma: ALUNO.turma,
    meta: ALUNO.meta,
    estuda: ALUNO.estuda,
    temParticulares: ALUNO.temParticulares,
    demo: ALUNO.demo,
    criadoEm: agora.toISOString(),
  })

  const { aulas, acompanhamento } = await preverAMatriz(agora)
  const a = acompanhamento.alunos[0]

  console.log(
    `✓ ${ALUNO.nome} ${antes === 'novo' ? 'criado' : 'atualizado'} em ${ALUNO.turma} (uid ${ALUNO.uid})`,
  )
  console.log(`  meta ${ALUNO.meta} · estuda ${ALUNO.estuda} · demo: true`)
  console.log('  sem estados, sem resumos, sem competencias — nada fabricado')
  console.log('')
  console.log(`A matriz de acompanhamento da ${ALUNO.turma}, a partir de agora:`)
  console.log(`  ${aulas} aulas no programa`)
  console.log(`  ${acompanhamento.ensinados} de ${acompanhamento.totalDeItens} itens ja dados em aula`)
  console.log(`  ${a.atestados} atestados · ${a.pendentes} pendentes (clicaveis) na coluna dele`)

  if (a.pendentes === 0) {
    console.log('')
    console.log(
      '⚠ ZERO pendentes: nenhuma aula com item tem data <= hoje, entao a coluna nasce em branco.',
    )
    console.log('  A matriz esta certa; e o programa que nao tem aula dada. Agende no Planner.')
  }

  const porGrupo = acompanhamento.grupos
    .filter((g) => g.pendentes > 0)
    .map((g) => `${g.modulo.nome} (${g.pendentes})`)
  if (porGrupo.length > 0) console.log(`  pendentes por area: ${porGrupo.join(', ')}`)
}

main().catch((e) => {
  console.error(`✗ ${(e as Error).message}`)
  process.exit(1)
})

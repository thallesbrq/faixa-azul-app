/**
 * Estado da central do professor.
 *
 * Separado de `useApp` de proposito: o estado do APARELHO (o preparo de quem
 * usa) e a colecao de OUTROS alunos sao coisas diferentes, com armazenamentos
 * diferentes, e misturar as duas no mesmo hook faria a tela do aluno carregar
 * vinte estados que ela nunca usa.
 */

import { useCallback, useMemo, useState } from 'react'
import { QuotaEstourada, repositorioDeAlunos } from '../persistence/alunos'
import type { Deposito } from '../persistence/deposito'
import { VERSAO_ATUAL, migrar } from '../persistence/repositorio'
import type { EstadoPersistido } from '../persistence/repositorio'
import { abrirEnvelope, mesclarEstados } from '../application/juncao'
import { EXPLICACAO_DA_RECUSA } from '../application/juncao'
import { ordenarPorAtencao, precisamDeAtencao, resumoDoAluno } from '../application/torre'

export type ResultadoDaImportacao =
  | { ok: true; nome: string; novo: boolean; mudou: boolean }
  | { ok: false; mensagem: string }
  /**
   * Nome ja existe com OUTRO id. Nao e erro nem sucesso: e a pergunta que o
   * professor precisa responder. Acontece quando o aluno reinstala o app ou
   * troca de celular — nasce um id novo e, sem esta pergunta, a central criaria
   * um segundo aluno com o mesmo nome, em silencio.
   */
  | { ok: false; conflitoDeNome: { nome: string; idExistente: string; idNovo: string } }

export function useTorre(deposito: Deposito) {
  const repo = useMemo(() => repositorioDeAlunos(deposito), [deposito])

  /**
   * Lista e espaco vivem no MESMO estado de proposito.
   *
   * `espacoUsado()` le o deposito, e nao a lista — entao ele nao tem como ser um
   * `useMemo` que depende dela. Escrever `[repo, lista]` ali seria uma
   * dependencia falsa: `lista` estaria fazendo papel de gatilho de recalculo
   * disfarcado de valor, e o linter reclamou com razao. Recalcular os dois
   * juntos, no momento em que o armazenamento muda, diz a verdade sobre quando
   * cada um envelhece.
   */
  const [{ lista, espaco }, setDados] = useState(() => ({
    lista: repo.listar(),
    espaco: repo.espacoUsado(),
  }))

  const recarregar = useCallback(
    () => setDados({ lista: repo.listar(), espaco: repo.espacoUsado() }),
    [repo],
  )

  const emOrdem = useMemo(() => ordenarPorAtencao(lista), [lista])
  const atencao = useMemo(() => precisamDeAtencao(lista), [lista])

  /**
   * Guarda o arquivo de um aluno.
   *
   * `forcarId` reaproveita o registro existente quando o professor confirma que
   * o nome repetido e a mesma pessoa: o estado que chega e MESCLADO no que ja
   * havia, em vez de substituir. Substituir perderia tudo o que o aluno tinha
   * feito antes de reinstalar.
   */
  const importar = useCallback(
    (texto: string, agora: Date, forcarId?: string): ResultadoDaImportacao => {
      // Sem `perfilEsperado`: a central existe para receber de varios.
      const aberto = abrirEnvelope(texto, VERSAO_ATUAL)
      if (!aberto.ok) return { ok: false, mensagem: EXPLICACAO_DA_RECUSA[aberto.motivo] }

      // Arquivo de versao anterior e migrado, nao recusado: com alunos entrando
      // aos poucos, versoes convivem.
      const recebido = migrar(
        aberto.envelope.estado as unknown as Record<string, unknown>,
        agora,
      ) as EstadoPersistido

      const idDoArquivo = recebido.perfil.id
      const nome = recebido.perfil.nome.trim() || 'Sem nome'

      const jaTem = repo.listar()
      const mesmoId = jaTem.find((r) => r.id === idDoArquivo)
      const mesmoNome = jaTem.find(
        (r) => r.id !== idDoArquivo && r.nome.toLocaleLowerCase('pt-BR') === nome.toLocaleLowerCase('pt-BR'),
      )

      if (!mesmoId && mesmoNome && forcarId === undefined) {
        return {
          ok: false,
          conflitoDeNome: { nome, idExistente: mesmoNome.id, idNovo: idDoArquivo },
        }
      }

      const alvo = forcarId ?? idDoArquivo
      const anterior = repo.ler(alvo)

      // Mescla quando ja havia; o que chega nunca substitui o historico.
      const juncao = anterior ? mesclarEstados({ local: anterior, recebido }) : null
      const estado = juncao ? juncao.estado : recebido
      const mudou = juncao ? juncao.mudou : true

      const resumo = {
        ...resumoDoAluno(estado, {
          importadoEm: agora.toISOString(),
          exportadoEm: aberto.envelope.exportadoEm,
          agora,
        }),
        // Mantem o id do registro escolhido, nao o do arquivo, quando o
        // professor confirmou que e a mesma pessoa.
        id: alvo,
      }

      try {
        repo.gravar({ ...estado, perfil: { ...estado.perfil, id: alvo } }, resumo)
      } catch (erro) {
        if (erro instanceof QuotaEstourada) return { ok: false, mensagem: erro.message }
        throw erro
      }

      recarregar()
      return { ok: true, nome, novo: !anterior, mudou }
    },
    [repo, recarregar],
  )

  const remover = useCallback(
    (id: string) => {
      repo.remover(id)
      recarregar()
    },
    [repo, recarregar],
  )

  const ler = useCallback((id: string) => repo.ler(id), [repo])

  return { lista: emOrdem, atencao, espaco, importar, remover, ler, recarregar }
}

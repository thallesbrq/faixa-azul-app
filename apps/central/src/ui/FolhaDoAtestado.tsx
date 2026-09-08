/**
 * Cola entre `useAtestado` e a folha.
 *
 * COMPONENTE PROPRIO pelo mesmo motivo de `MontarGrade`: o hook so deve existir
 * quando a aba esta aberta. Se `useAtestado` morasse no `Aluno`, abrir a pagina
 * de qualquer aluno leria as competencias dele — inclusive de quem o professor
 * abriu so para ver o progresso.
 */

import type { FirebaseApp } from 'firebase/app'
import type { Curriculo } from '@faixa-azul/core/domain/curriculo'
import type { Modulo } from '@faixa-azul/core/domain/types'
import { useAtestado } from './useAtestado'
import { Atestado } from './components/Atestado'

export function FolhaDoAtestado({
  app,
  alunoUid,
  professorUid,
  curriculo,
  modulos,
  meta,
  origemDoCurriculo,
  idDoCurriculo,
  aulasCumpridas,
  aoConceder,
}: {
  app: FirebaseApp
  alunoUid: string
  professorUid: string
  curriculo: Curriculo
  modulos: readonly Modulo[]
  meta: string
  /**
   * De onde saiu a lista que esta na folha.
   *
   * `'prova'`: e a lista da meta. Atestar tudo FECHA o gate do grau.
   * `'estudo'`: a lista da meta nao chegou, e a folha mostra a do que ele treina.
   *   Atestar registra o que voce viu e NAO fecha grau nenhum.
   *
   * A folha PRECISA dizer isso. Sem essa distincao, marcar 81 itens de azul
   * pareceria completar o 4o grau — e a barra encheria confirmando a leitura
   * errada.
   */
  origemDoCurriculo: 'prova' | 'estudo'
  /** O id do curriculo em uso, para a folha nomear qual lista e. */
  idDoCurriculo: string
  aulasCumpridas: number | null
  /** Chamado DEPOIS de gravar a graduacao, para a meta do aluno avancar. */
  aoConceder: (metaConcedida: string) => Promise<void>
}) {
  const a = useAtestado({ app, alunoUid, professorUid })

  return (
    <Atestado
      curriculo={curriculo}
      modulos={modulos}
      registros={a.registros}
      graduacoes={a.graduacoes}
      meta={meta}
      origemDoCurriculo={origemDoCurriculo}
      idDoCurriculo={idDoCurriculo}
      aulasCumpridas={aulasCumpridas}
      fase={a.fase}
      mensagem={a.mensagem}
      aoAtestar={(e) => void a.atestar(e)}
      aoConceder={(e) => {
        void (async () => {
          await a.conceder(e)
          // Avancar a meta e ato SEPARADO da gravacao do registro, e nesta
          // ordem: se a meta avancasse primeiro e a gravacao falhasse, ficaria
          // um aluno promovido sem registro de por que.
          await aoConceder(e.meta)
        })()
      }}
    />
  )
}

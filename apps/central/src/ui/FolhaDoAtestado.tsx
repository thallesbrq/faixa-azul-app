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
  aulasCumpridas,
  aoConceder,
}: {
  app: FirebaseApp
  alunoUid: string
  professorUid: string
  curriculo: Curriculo
  modulos: readonly Modulo[]
  meta: string
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

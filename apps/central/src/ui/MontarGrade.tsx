/**
 * Cola entre `useGrade` e a tela `Aulas`.
 *
 * COMPONENTE PROPRIO para o hook so existir quando a aba de aulas esta aberta.
 * Se `useGrade` morasse no `App`, abrir a pagina de qualquer aluno leria a
 * grade dele — inclusive de quem o professor abriu so para ver o progresso.
 */

import type { FirebaseApp } from 'firebase/app'
import type { TechniqueItem } from '@faixa-azul/core/domain/types'
import type { EstadoPersistido } from '@faixa-azul/core/persistence/repositorio'
import { useGrade } from './useGrade'
import { Aulas } from './components/Aulas'

export function MontarGrade({
  app,
  alunoUid,
  estadoDoAluno,
  itens,
}: {
  app: FirebaseApp
  alunoUid: string
  estadoDoAluno: EstadoPersistido | null
  itens: TechniqueItem[]
}) {
  const grade = useGrade({ app, alunoUid, estadoDoAluno })
  return (
    <Aulas
      itens={itens}
      atribuicao={grade.atribuicao}
      pendentes={grade.pendentes}
      fase={grade.fase}
      mensagem={grade.mensagem}
      aoMover={grade.mover}
      aoSalvar={grade.salvar}
    />
  )
}

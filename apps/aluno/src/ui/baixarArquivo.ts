/**
 * Baixa um texto como arquivo.
 *
 * `revokeObjectURL` nao e detalhe de estilo: sem ele cada exportacao segura o
 * blob inteiro na memoria da aba ate o app fechar, e o blob tem o tamanho do
 * estado — ~160 KB por aluno, vinte alunos numa sessao da 3 MB presos a toa.
 */
export function baixarArquivo(nome: string, conteudo: string): void {
  const url = URL.createObjectURL(new Blob([conteudo], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.click()
  URL.revokeObjectURL(url)
}

# Documento para o professor

Proposta de pauta das 10 aulas particulares, para o Prof. João Eduardo Gonçalves
validar antes da primeira aula.

| Arquivo | Para que serve |
|---------|----------------|
| `Plano de aulas - Thalles Alvim.pdf` | **Enviar por WhatsApp.** 9 páginas, tema claro, fontes embutidas. |
| `plano-de-aulas.html` | Fonte do documento. É o que é publicado como Artifact. |
| `plano-de-aulas-impressao.html` | Versão standalone com estilos de impressão; é dela que sai o PDF. |

## Como regerar o PDF depois de editar o HTML

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="docs/professor/Plano de aulas - Thalles Alvim.pdf" \
  --virtual-time-budget=8000 \
  "file://$PWD/docs/professor/plano-de-aulas-impressao.html"
```

A versão de impressão força o tema claro (PDF escuro é ilegível no papel) e usa
`break-inside: avoid` nos cartões, para nenhuma pauta de aula ser partida entre
páginas.

## O conteúdo NÃO é escrito à mão

As 10 pautas saem de `gerarPlano()` em `src/application/aulas.ts`. Se a regra de
distribuição mudar, o documento precisa ser regerado a partir dos dados — foi
assim que ele foi montado, justamente para não haver divergência entre o que o
app mostra e o que o professor recebe.

## O que o documento pede ao professor

1. Corrigir a execução de cada técnica na aula.
2. Dizer se a ordem faz sentido.
3. Combinar dias e horários das 10 particulares e dos 2 aulões.

E aponta duas lacunas conhecidas: as aulas 9 e 10 não têm item da Seção 5, e
cada saída aparece uma única vez (as guardas aparecem duas).

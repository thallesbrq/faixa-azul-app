# Documento para o professor

Proposta de pauta das 10 aulas particulares, para o Prof. João Eduardo Gonçalves
validar antes da primeira aula.

> **Estes PDFs são um retrato, não a fonte da verdade.** Eles congelam a
> distribuição que o *app* sugeriu em 2026-08-25. Desde a tela **Aulas → Montar**,
> quem distribui os 56 itens é o professor, e é a montagem dele que o app usa no
> Plano e no Planner (ver `planoVigente` em `src/application/aulas.ts`).
>
> Ou seja: depois que ele montar, **estes arquivos ficam desatualizados** e não
> se atualizam sozinhos. Servem para o que foram feitos — abrir a conversa e
> mostrar os requisitos da prova. A grade combinada vive no app, e viaja entre
> os dois celulares pelo link de compartilhamento.

| Arquivo | Para que serve |
|---------|----------------|
| `Pautas das aulas - Thalles Alvim.pdf` | **Só as pautas, 2 páginas.** Cada técnica com o tipo (raspagem, passagem, finalização, saída, defesa, costas). É o documento para levar ao tatame. |
| `pautas-aulas.html` | Fonte do documento enxuto. |
| `Plano de aulas - Thalles Alvim.pdf` | Documento completo, 9 páginas: o que se pede ao professor, a rotina, as lacunas e os requisitos da prova. |
| `plano-de-aulas.html` | Fonte do documento. É o que é publicado como Artifact. |
| `plano-de-aulas-impressao.html` | Versão standalone com estilos de impressão; é dela que sai o PDF. |

## Como regerar o PDF depois de editar o HTML

```bash
# documento completo
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="docs/professor/Plano de aulas - Thalles Alvim.pdf" \
  --virtual-time-budget=8000 \
  "file://$PWD/docs/professor/plano-de-aulas-impressao.html"

# so as pautas
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="docs/professor/Pautas das aulas - Thalles Alvim.pdf" \
  --virtual-time-budget=8000 \
  "file://$PWD/docs/professor/pautas-aulas.html"
```

## O sistema de cores

Dois canais, de propósito em intensidades diferentes:

| Canal | Codifica | Valores |
|-------|----------|---------|
| **Etiqueta saturada** | tipo de técnica (`kind`) | RASP, PASS, FINAL, SAÍDA, DEF, COSTAS |
| **Quadradinho** | guarda do currículo | Guarda Fechada, Meia Guarda, Guarda Gancho, Guarda Aranha, Guarda Dela Riva, Guarda Laço, Guarda Aberta, Complexo Moderno, Saídas |
| **Texto** | papel | eu ataco / eu passo / eu defendo |

Se a família usasse fundo colorido, brigaria com a etiqueta em cima dela — dois
preenchimentos disputando a mesma área. Um chip e um marcador pequeno convivem
porque ocupam papéis visuais distintos.

Nenhuma cor é a única pista: a etiqueta traz a sigla e o quadradinho vem colado
ao nome da família. O documento é lido em papel, no tatame.

Quando o nome da família já está na posição (`Fechada` / `Guarda Fechada`), o
texto da família é omitido e o quadradinho carrega a informação sozinho — 23 das
56 linhas caem nesse caso.

### Por que existem duas dimensões

`guardaDaPosicao` e `papelDoKind` vivem em `src/domain/taxonomia.ts`, com teste
provando a propriedade que as justifica: **toda guarda do currículo mistura
atacar e passar.** "Guarda Fechada · Raspagem de tesoura" e "Guarda Fechada ·
Abrir em pé e passar" são lados opostos da luta com o mesmo nome de posição.

As guardas são **exatamente as do documento da prova**. Uma versão anterior
agrupava Aranha com Laço e Dela Riva com Gancho por família técnica — invenção
minha, corrigida. Há teste garantindo que não voltem a ser agrupadas: inventar
taxonomia sobre um documento que já tem a sua cria uma segunda linguagem que
ninguém na academia fala.

### Escopo: 50 itens, conferido item a item contra o PDF da banca

O PDF do exame está nesta pasta. A conferência corrigiu um
superdimensionamento: o documento traz **uma entrada única** para o complexo
moderno — `Guarda One leg / 50-50 / Guarda X / One leg / Berimbolo` com
`Raspada` e `Passagem` no **singular**. São alternativas: a prova pede uma
raspagem e uma passagem de **uma** delas. A importação expandiu isso em quatro
posições de dois itens, 8 onde a banca cobra 2.

`SUBPOSICAO_DO_COMPLEXO` em `src/seed/index.ts` escolhe qual fica ativa (hoje
`Guarda X`). As outras três **continuam no seed**, desativadas — trocar é mudar
uma constante.

Efeito: **50 itens em 10 aulas = exatos 5 por aula**, 60 minutos cada, zero
sobra. O atrito de "56 não divide por 10" nunca precisou de solução; precisou de
leitura da fonte.

### Balanço do plano

- **Técnica:** 15 raspagens · 11 passagens · 14 finalizações · 6 saídas · 2 defesas · 2 idas às costas
- **Guarda:** 11 Fechada · 8 Meia Guarda · 5 Aranha · 5 Dela Riva · 4 Gancho · 4 Aberta · 3 Laço · 2 Complexo Moderno · 8 Saídas
- **Papel:** 31 eu ataco · 11 eu passo · 8 eu defendo

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

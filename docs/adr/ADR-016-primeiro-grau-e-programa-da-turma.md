# ADR-016 — 1º grau: currículo próprio, programa da turma e atestado

**Status:** Accepted · **Data:** 07/09/2026

## Contexto

O professor enviou a regra do **1º grau**: após **35 aulas**, o aluno deve ter
"o mínimo de competência" em uma lista de **29 itens** — quedas, guarda fechada,
educativos, domínio de posições, finalizações e saídas. E pediu um **planner de
aulas** para programar as aulas das turmas e dos alunos.

Antes de decidir, a lista foi conferida item por item contra o seed real. **A
primeira conferência estava errada** e vale registrar como se errou: os nomes
foram casados isoladamente, e **a mesma técnica de outra posição é outro item**.
A conferência correta:

| | Itens da lista |
|---|---|
| ✅ existe e ativo | **8** — tesoura · pêndulo · passagem simples (toureando) · cruzado, armlock e triângulo da guarda fechada · saída dos 100kg · saída da montada |
| ⚠️ existe, **desligado** por `MODULOS_ATIVOS` | **7** — Osoto-gari · Baiana (double leg) · Single-leg · Ukemi · Levantada técnica · Rolamentos · Fuga de quadril |
| ❌ **não existe** | **~14** |

Os que não existem, e o motivo — que não é falha de import:

- **Passagem emborcando** e **raspagem tripé**: a Guarda Fechada tem
  *"Abertura com joelho no cóccix (log split)"* e apenas duas raspadas. Tripé e
  emborcando existem no currículo, mas **de outras guardas**.
- **Ida às costas a partir do pêndulo**: existe *"Esgrimada com ida para as
  costas (arm drag)"*, que é outro caminho.
- **Os 4 domínios de posição** (100kg lateral, norte-sul, montada, costas com
  gancho): o currículo só tem as **saídas** dessas posições. Não há item de
  *manter* posição, e `TechniqueKind` não tem esse tipo.
- **7 finalizações** de cima (cruzado e americana dos 100kg; lapela e mata-leão
  das costas; cruzado, americana e armlock da montada). A banca de azul cobra
  finalizações **da guarda**; as de cima são de grau.

Conclusão: o 1º grau **não é uma fatia do currículo de azul**. É outro documento,
com outra meta e outra granularidade.

## Decisões

### 1. Seed próprio do 1º grau

Um currículo de ~29 itens, independente dos 81 do exame de azul. O código já
trata currículo como **parâmetro** (feito assim no ADR-015 esperando o de roxa),
então cabe sem reescrita.

Custo assumido: um item que existe nos dois — tesoura, por exemplo — tem duas
identidades, e dominá-lo num não conta no outro. A alternativa (ampliar o de
azul) diluiria o progresso de azul com itens que a banca de azul não cobra, e a
média de todos cairia sem ninguém piorar.

**OS ITENS NOVOS NASCEM SEM PASSO A PASSO**, com
`validationStatus: 'aguardando_validacao'` e `sourceReference` apontando para a
lista do professor, e não para o PDF do exame. Redigir o passo a passo deles aqui
seria repetir o erro que `taxonomia.ts` registra: inventar conteúdo sobre um
documento que tem o seu. O nome de cada item usa **as palavras dele**.

**UMA AMBIGUIDADE FICA MARCADA E NÃO RESOLVIDA:** *"guarda fechada: 3 raspagens
(tesoura, pêndulo, tripé)"*. O tripé é incomum da fechada — pode ser um cabeçalho
solto ("raspagens em geral"). Interpretar por conta própria seria inventar
currículo. Vai como pergunta ao professor, no `sourceReference`.

### 2. `kind` novo: domínio de posição

Os 4 domínios exigem um tipo que não existe. `grupoDoKind` é um `Record` completo
de propósito — acrescentar um `kind` **quebra a compilação** lá, que é o
comportamento desejado (ADR-015, decisão 2): um item caindo num grupo de sobra
não produziria erro, só um número errado na tela.

### 3. A meta é do ALUNO, não da turma

Campo `meta` em `pessoas`: `1grau` · `2grau` · `3grau` · `4grau` · `azul`.
Definido no convite e trocável na Central, como `turma`.

**POR QUE NÃO DA TURMA:** o 1º grau vem antes do azul na progressão. Um faixa
branca novo persegue o 1º grau; o Thalles, com 3 graus, persegue o azul — e **os
dois cabem na mesma turma de iniciantes**. Se o currículo fosse propriedade da
turma, um dos dois seria medido contra a prova errada. A turma volta a ser o que
é: quem treina no mesmo horário.

Consequência: `2grau`, `3grau` e `4grau` não têm currículo ainda. Aluno com essa
meta mostra `—`, com o motivo escrito — o mesmo tratamento da RG2 (ADR-015,
decisão 6), e pela mesma razão.

Custo: mais duas asserções nas regras, como `turma` — o aluno não muda a própria
meta. Ver a nota do ADR-015, decisão 10, sobre lista de permissão.

### 4. As 35 aulas são PROGRAMA DA TURMA; o cumprimento é do aluno

O professor monta as 35 aulas da RG1A **uma vez**; cada aluno marca as que fez.

**POR QUE NÃO POR ALUNO:** ele não dá 20 aulas individuais, dá uma aula para a
turma. Por aluno, montar seria 35 × nº de alunos, com cópias que divergem no
primeiro ajuste — e aí não existe mais "a aula 12 da RG1A", existem doze versões
dela.

As **10 particulares continuam por aluno** (`grades/{alunoUid}`, ADR-015): elas
são de fato individuais, e já estão em uso.

É o mesmo dono-por-campo que já funciona: **o conteúdo é do professor, o
cumprimento é do aluno**.

### 5. No 1º grau, um item REPETE em várias aulas

E isso inverte uma invariante existente. O comentário de `atribuir` diz:

> *"Retira o item de onde estiver ANTES de pôr no destino — é o que garante a
> invariante de um item em um lugar só."*

Certa para o azul: **56 itens em 10 aulas** é cobertura. Errada para o grau:
**29 itens em 35 aulas** é repetição — com um item por lugar, 29 aulas teriam um
item e **6 ficariam vazias**, e não daria para pôr tesoura nas aulas 1, 8 e 20,
que é como se treina.

Então: função de atribuição **nova** para o programa da turma, com repetição
livre. A de azul não muda. A checagem de completude passa de "todos atribuídos"
para "todos aparecem ao menos uma vez", e a tela mostra **quantas vezes** cada
item foi programado — que é informação útil para o atestado.

**CORREÇÃO desta decisão, feita ao implementar:** `TOTAL_DE_AULAS` **não** vira
propriedade do currículo. São dois números diferentes que por acaso falam de
aulas: `TOTAL_DE_AULAS = 10` é o tamanho do **pacote de particulares
contratado**, e as **35** são exigência da graduação. Confundi-los faria o pacote
do Thalles virar 35 aulas quando a meta dele mudasse. As 35 moram em
`Meta.aulasExigidas`; o 10 fica onde está.

### 6. Competência é registro NOVO, e não `validacoes`

`competencias/{alunoUid}/registros/{id}`: quem atestou, quando, onde viu, e o
texto do professor. Append-only, como `validacoes` — evidência de graduação que
pode ser reescrita não serve como evidência (ADR-010).

**CORREÇÃO desta decisão, feita ao implementar.** Ela dizia
`competencias/{aluno}/itens/{itemId}` — um documento por item, ou seja um
**estado**. Com aquela forma, retirar um atestado dado por engano exigiria
sobrescrever, e o registro anterior desapareceria: o oposto de append-only. É um
**log**, e o estado atual é derivado do registro mais recente de cada item.
Retirar é uma linha nova com `competente: false`, porque o professor pode ter
atestado numa aula e mudado de opinião na seguinte — e as duas coisas
aconteceram.

**E o uid vai no CAMINHO, não dentro do documento**, por exigência das regras e
não por gosto: `validacoes/{id}` guarda `alunoUid` no corpo, então a regra só é
decidível documento por documento e o Firestore **recusa a consulta de coleção**.
A folha precisa LISTAR as competências de um aluno. Com o uid no caminho, a mesma
regra autoriza a lista — é o desenho de `grades/{alunoUid}/aulas/{numero}`.

**POR QUE NÃO REUSAR `validacoes`, e este é o achado que motivou o ADR:**
`validado_pelo_professor` **não é sobre o aluno, é sobre o TEXTO**. O cabeçalho
de `validacao.ts` é explícito:

> *"o maior risco do projeto é o conteúdo: 70 dos 81 itens têm passo a passo
> redigido como sugestão padrão de faixa azul, não como o currículo da academia.
> Se o professor corrigir e o app não registrar, o aluno continua estudando a
> versão errada."*

É o professor corrigindo a **descrição**, com o texto dele, append-only. Não é
avaliação de execução. Reusar aquilo faria `aplicarValidacoes` mudar o item por
causa do desempenho de uma pessoa.

**DEFEITO DECORRENTE, CORRIGIDO em 07/09/2026:** a Central rotulava o eixo como *"você validou ·
confirmado na academia"* ao lado de *"ele recupera"*. Lido junto, isso afirma que
o professor confirmou que **ele** faz — quando o dado diz que confirmou que **o
passo a passo** está certo. O rótulo mente sobre o que mede. (A fila *"Esperando
você olhar"* estava correta: o texto dela fala de *"dominar a versão errada"*, que
é conteúdo.)

O rótulo passou a ser **"passo a passo conferido · você confirmou o CONTEÚDO da
técnica"**. Quem afirma que o aluno executa é a aba Atestado, que é outro
registro.

Com o registro novo, a Central passa a mostrar três coisas honestas: **ele
recupera** · **o texto está conferido** · **você atestou**.

Competência é **binária**: "mínimo de competência" foi a expressão dele, e
inventar uma escala seria criar um vocabulário que o professor não usou.

### 9. Meta azul mede por CARTÕES; meta 1º grau mede por ATESTADO

Descoberto ao implementar, e mediu-se em vez de supor: `cartoesDaTecnica` só gera
os cartões de explicação e sequência quando o item tem `passos`. Sem passo a
passo sobra o de classificação, e só para os `kinds` classificáveis.

Com o seed do 1º grau — que não tem conteúdo, por decisão 1:

| | Cartões |
|---|---|
| Quedas · Educativos · Domínios (**11 itens**) | **zero** |
| Passagens, raspagens, finalizações, saídas (**18**) | 1 cada, e é *"que tipo de técnica é esta?"* |

Item com zero cartões tem `pontuacao: 0` **para sempre**, e 0% ali significaria
"não há o que estudar" — não "ele não sabe". A mesma confusão que `—` separa em
todo o resto do produto, num lugar novo. **Os 56 itens ativos do azul têm cartões;
nenhum tem zero** — o problema é específico do 1º grau.

Então `Meta.medidaDoProgresso` decide: `cartoes` para o azul, `atestado` para o
1º grau. Para quem busca o grau, o número que importa é o julgamento do professor,
não quantos cartões acertou — e os 29 itens passam a servir **sem precisar de
conteúdo nenhum**. Se o passo a passo chegar depois, os cartões aparecem sozinhos.

Meta desconhecida responde `atestado`, conservador pelo mesmo motivo.

Consequência de fatia: o número do 1º grau só existe com o `competencias` da
fatia 2. Até lá, esses alunos mostram `—` com motivo `medido-por-atestado` — que
é um motivo PRÓPRIO, e não "sem currículo": há currículo e há dado, a medida é
que é outra.

### 10. `medeCurriculoDeAzul` foi REMOVIDO de `domain/turmas`

Consequência direta da decisão 3, executada e não adiada. Aquela função decidia
contra que currículo o aluno era medido — e a turma deixou de decidir isso.

Manter um nome que afirma decidir algo e não decide mais nada é a forma mais
eficiente de alguém confiar nele. Duas mensagens de tela também saíram, porque
passaram a ser falsas: a nota "esta turma não mede o currículo de azul" no
convite, e o aviso do seletor de turma que dizia que trocar de turma fazia o
progresso aparecer ou virar `—`.

Há teste garantindo que o campo não volte por conveniência.

### 7. "Apto" é estado; conceder o grau é ato do professor

A Central mostra *apto ao 1º grau* quando 35/35 aulas e 29/29 competências
fecham. **Conceder é um botão dele**, gravado com data — e ao conceder, a `meta`
do aluno avança para o 2º grau.

O app nunca gradua sozinho: ele diz que os requisitos fecharam e o professor
decide. O contrário faria o sistema graduar, o que não é papel dele.

### 8. O aluno marca a presença, e a tela mostra o que ele ganha

Na tela Aulas, uma seção da turma com as aulas programadas; ele toca para marcar,
inclusive retroativo. Em cima, o placar: **"12 de 35 para o 1º grau"**.

**SE ELE NÃO MARCAR, O CONTADOR NUNCA FECHA E O ATESTADO NUNCA DISPARA** — o
mesmo risco que a Central teve ao nascer: tudo funcionando e nada para mostrar,
porque quem alimenta o dado não tinha motivo. Por isso o placar fica à vista: ele
marca porque vê a barra andar.

Marcar *"fiz a particular 3"* e *"estive na aula de terça"* são gestos
diferentes, então as duas seções ficam visualmente distintas — a tela Aulas passa
a ter dois pacotes e não pode confundi-los.

## Consequências

**Isto é maior que as entregas 1 e 2 somadas.** Em três fatias, na ordem em que
cada uma vale sozinha:

| Fatia | O que entra | Vale sozinha porque |
|---|---|---|
| **1 — currículo e meta** | seed do 1º grau · `kind` de domínio · `meta` em `pessoas` + regras | a Central passa a medir cada aluno contra a prova **dele** |
| **2 — atestado** | `competencias` · aba com as 29 linhas agrupadas · estado *apto* · conceder · correção do rótulo | entrega o que foi pedido — atestar aptidão — mesmo antes das 35 aulas existirem no sistema |
| **3 — programa da turma** | `programas/{turma}` · planner de 35 com repetição · presença no app do aluno · placar | fecha o contador e torna o *apto* automático |

**Revisar quando:** chegarem as listas do 2º, 3º e 4º graus, ou o currículo de
roxa (ADR-015, decisão 6) — os dois entram como seeds novos, sem tocar no código.

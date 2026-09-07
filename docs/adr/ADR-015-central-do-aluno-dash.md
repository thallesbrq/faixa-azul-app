# ADR-015 — Central do Aluno: dash de turmas

**Status:** Accepted · **Data:** 07/09/2026

## Contexto

A Central do Aluno (`apps/central`, etapa 5 do planejamento técnico) ganhou uma
referência visual concreta: um dashboard de cobertura de testes por squad, trazido
pelo usuário. A estrutura dele — faixa de veredicto, seis KPIs, rosca, barras,
tabela ordenável com colunas de bolinha e uma tabela de rollup por grupo — mapeia
quase 1:1 no que a Central precisa, trocando `funcionalidade → aluno` e
`grupo → turma`.

Três turmas: **RG1A** e **RG1B** (iniciantes) e **RG2** (intermediário/avançado).

O que já existia e foi reaproveitado sem mudança:

| Peça da referência | No core | Onde |
|---|---|---|
| ordenação por coluna | `ordenarPorAtencao()` | `application/torre.ts` |
| bolinha verde/amarela/vermelha | `situacaoDoAluno()` | `application/torre.ts` |
| contagem do veredicto | `precisamDeAtencao()` | `application/torre.ts` |
| percentual por grupo | `progressoPorCategoria/Posicao/Modulo()` | `application/progresso.ts` |
| dono por campo na grade | `mesclarEstados()` | `application/juncao.ts` |

E o que **não** existia, descoberto ao ler o código antes de desenhar:

1. `turma` não existe em lugar nenhum — nem em `pessoas`, nem no convite, nem no perfil.
2. `resumos` não carrega percentual algum, só contagens. A Central não tinha como
   pintar barra de progresso de ninguém.
3. `grades/{alunoUid}/aulas/{numero}` existe **só** em `firestore.rules`. Nenhuma
   linha de código lê ou escreve essa coleção.
4. Não há dimensão de faixa/graduação. O app conhece um currículo: os 81 itens do
   exame de azul.

## Decisões

### 1. O número da linha é "Progresso", e não uma prontidão composta

A referência é vertebrada num composto com pesos declarados
(*Mapa 25% · Confirm. 25% · Massa 20% · Codegen 30%*). Aqui não há composto.

**Turma selecionada:** Progresso = média dos Progressos dos alunos daquela turma.
**Aluno:** Progresso = `prontidao().dominio` — média por item sobre os 81 ativos.

Média **por item**, não das sete colunas: os grupos têm tamanhos muito diferentes
(Raspagens 18 · Quedas 5), e média de médias faria as 5 quedas pesarem como as 18
raspagens. Consequência aceita: a linha **não** fecha na média das sete células, e
quem somar de cabeça vai achar a coluna errada.

O valor é o mesmo que a tela Progresso do app mostra ao aluno. Professor e aluno
veem o mesmo número — evita a pior discussão possível.

### 2. Colunas: tipo de técnica, sete grupos

Raspagens 18 · Passagens 14 · Finalizações+Costas 16 · Saídas e defesas 8 ·
Quedas 5 · Fundamentos 9 · Defesa pessoal 11 = 81.

Rejeitado **módulo da prova** (5 colunas), que parece a escolha óbvia por ser a
taxonomia oficial do PDF: `mod-guardas` carrega **48 dos 81 itens**, então essa
coluna andaria junto com o Progresso e as outras quatro pareceriam detalhe. A
variação que interessa — raspa bem da fechada, não faz nada da Dela Riva — ficaria
escondida dentro dela.

Rejeitadas as **16 posições/guardas** como colunas: não cabem. Elas viram **linhas**
na página do aluno, onde `progressoPorPosicao()` já é o que a tela Progresso mostra.
A mesma taxonomia serve nos dois níveis, girada 90°.

Exige um `progressoPorGrupoTecnico()` novo — seis linhas reusando o `agrupar()`
existente.

**CORREÇÃO: as colunas são derivadas, não são sete fixas.** A contagem acima é do
seed inteiro (81 itens), e eu a conferi contra a coluna errada. `seed/index.ts`
declara `MODULOS_ATIVOS = {mod-guardas, mod-saidas}` — foco nas Seções 4 e 5 — e
`progressoPorItem` filtra `i.ativo`. Logo só **56** itens contam hoje, e a
distribuição real dos ativos é:

| Grupo | No seed | Ativos |
|---|---|---|
| Raspagens | 18 | 18 |
| Finalizações + Costas | 16 | 16 |
| Passagens | 14 | 14 |
| Saídas e defesas | 8 | 8 |
| Defesa pessoal | 11 | **0** |
| Fundamentos | 9 | **0** |
| Quedas | 5 | **0** |

Sete colunas fixas produziriam **três permanentemente vazias**, e o professor não
teria como distinguir "o aluno não sabe" de "isso não está no ar".

A correção não é trocar a taxonomia: é `gruposComItens(curriculo)` decidir as
colunas a partir do que está ativo. Hoje aparecem quatro; no dia em que Quedas e
Defesa Pessoal forem ativadas, as colunas aparecem sozinhas. O mesmo vale para os
cartões técnicos, que são os três primeiros grupos ativos.

### 3. A célula é percentual colorido, não bolinha

A bolinha da referência não é faixa de percentual: são três verdades discretas
(OK / inferido / ausente), e o dado dela é categórico na origem. O nosso é contínuo.

Com quatro colunas a bolinha passava; com sete, perder a gradação de propósito
repetiria um problema que `progresso.ts` já resolveu uma vez — o comentário do campo
`pontuacao` registra que a etiqueta estrita mostrava 0% para quem tinha estudado
bastante, e *"a tela ficava correta e inútil ao mesmo tempo"*.

A referência já tem os dois idiomas: a tabela 2 (`Por PO / Grupo`) usa
`<span class="pr pr-high">100%</span>`. Adotamos o dela.

### 4. Limiares de cor: 34 e 67, lidos dos pesos do domínio

`PESO` em `progresso.ts` é `visto: 0.34 · aprendendo: 0.67 · dominado: 1`. Logo os
percentuais têm pontos de significado exatos: 34% = tudo visto, 67% = tudo
aprendendo, 100% = tudo dominado.

- vermelho `< 34%` — nem tudo foi visto
- amarelo `34–66%` — visto, aprendendo
- verde `≥ 67%` — aprendendo ou dominado

Rejeitados os limiares da referência (40/80): a fronteira cairia **no meio de um
nível**, e a cor da Central discordaria da etiqueta que o app mostra para o mesmo
aluno no mesmo dia. Cortar em 34/67 é ler o limiar que já existe em vez de inventar
um segundo — o mesmo erro que `taxonomia.ts` registra sobre inventar classificação
sobre um documento que já tem a sua.

### 5. A trinca semântica é a do app, e isso é consequência da decisão 3

A referência usa verde `#16a34a` / âmbar `#f59e0b` / vermelho `#dc2626`. Funcionam
lá porque são **forma** colorida, que não precisa passar contraste de texto.

Escolhemos **número** colorido, e `#f59e0b` como texto em fundo branco dá ~2:1 —
reprova RNF-04. É o mesmo problema que `tokens.css` já documentou sobre o laranja da
marca, e a razão de existir `--laranja-texto`.

Usamos a trinca do app, já resolvida para texto: `--verde-sucesso #1f7a48` ·
`--amarelo-atencao #8a6412` · `--vermelho-alerta #a43d3d`. Menos vibrantes: é o preço
de terem virado número.

Contraste medido no navegador, sobre branco (AA exige 4,5 para texto normal):

| | Referência | Nossa |
|---|---|---|
| verde | `#16a34a` **3,30** ✗ | `#1f7a48` **5,34** ✓ |
| âmbar | `#f59e0b` **2,15** ✗ | `#8a6412` **5,37** ✓ |
| vermelho | `#dc2626` 4,83 ✓ | `#a43d3d` **6,34** ✓ |

**Dois** dos três reprovariam como texto, e não só o âmbar como eu havia estimado.
Consequência assumida: o arco da rosca na faixa média fica num dourado escuro em
vez de âmbar vivo — o número dentro dele é texto e usa a mesma cor, então a
alternativa seria a rosca e o número discordarem.

### 6. RG2 aparece no seletor, sem Progresso

Medir a turma avançada contra os 81 itens do exame de azul mostraria a RG2 inteira em
vermelho — não por não saberem raspar, mas por não usarem um app de preparação para
uma prova que já fizeram. A cor estaria tecnicamente correta e factualmente
mentirosa.

RG2 serve para programar aulas e ver atividade (dias sem estudar, dúvidas,
validações). As sete colunas e o Progresso mostram `—` com a razão escrita na tela.

O currículo de **roxa** será enviado pelo usuário. Por isso o currículo entra como
**parâmetro** desde já: nada de `81` ou `'azul'` fixo no código da Central. Quando
chegar, é um seed novo e um campo em `pessoas`, não uma reescrita.

Isso não apareceu antes porque o app tinha exatamente um aluno, faixa branca indo
para azul. "Três turmas" é a primeira vez que o produto encontra alguém fora desse
caminho.

### 7. Quem nunca sincronizou fica fora da média, com denominador declarado

Três estados, e o modelo já distinguia dois:

| Estado | Detecção | Na tela |
|---|---|---|
| convidado, nunca entrou | só em `convites/{email}` | não aparece — `pessoas/{uid}` nasce no 1º login |
| entrou, nunca sincronizou | sem doc em `estados/{uid}` | linha com `—`, **fora** da média |
| sincronizou, nunca estudou | `diasSemEstudar === null` | 0% real, **dentro** da média |

O card diz `61% · média de 5 dos 7 alunos`.

Contar "não sei" como zero deixaria a média presa e **instável**: no dia em que o
aluno ausente sincronizasse 55%, a média saltaria, e o professor atribuiria o salto
ao ensino dele em vez à chegada de um dado que sempre existiu. `ResumoDoAluno` já
tipava `diasSemEstudar` como `number | null` justamente por isso.

### 8. Seis cards: três técnicos e três de ação

Raspagens % · Passagens % · Finalizações % · Validado por você % ·
Aguardando sua validação (n°) · Parados há 7+ dias (n°).

Os três primeiros são média da turma; os três últimos são fila do professor.
Responde "o que dou na próxima aula" e "quem me espera" na mesma varredura.

Os técnicos rendem mais no nível da turma que no do aluno: no aluno diagnosticam,
na turma **são a pauta da semana**. Na página do aluno os cards viram os sete grupos
técnicos, porque as colunas da tabela giram para linhas.

### 9. Aplicação separada, mesma origem, sob `/central/`

`apps/central` é uma aplicação Vite inteiramente própria — build próprio, sem
service worker, layout desktop — publicada na **mesma origem** do app do aluno,
sob o caminho `/central/`. Um script de deploy monta os dois builds numa pasta só,
e o `firebase.json` ganha um rewrite para `/central/**` antes do catch-all.

**CORREÇÃO DE UM ERRO DESTE ADR.** A primeira versão desta decisão dizia "site
próprio, sessão compartilhada", usando `APP_ALUNO` como nome de app Firebase para
o usuário não logar duas vezes. **Isso era impossível**, e o erro foi confundir
duas coisas já documentadas no próprio código:

- a sessão mora em `localStorage`, na chave `firebase:authUser:{apiKey}:{nomeDoApp}`
- `localStorage` é particionado por **origem**

O nome do app só desempata sessões DENTRO da mesma origem. Dois sites do Hosting
são duas origens: sessões separadas, sempre, qualquer que seja o nome escolhido.
O efeito prático seria pedir link mágico duas vezes — exatamente o atrito que a
decisão dizia evitar.

Pior que o erro: ele viciou a comparação apresentada ao usuário, porque "mesma
sessão" aparecia como vantagem da alternativa *e* da opção recomendada. Ao desfazer
o erro apareceu a opção que ninguém tinha oferecido, e que domina as duas:

| | Site novo | Rota no mesmo app | **Esta** |
|---|---|---|---|
| Bundle separado | ✅ | ❌ | ✅ |
| Sem PWA / layout desktop | ✅ | ⚠️ | ✅ |
| Um login só | ❌ | ✅ | ✅ |
| Trabalho manual no GCP | domínio em 2 listas | nenhum | **nenhum** |
| CSS e versão independentes | ✅ | ❌ | ✅ |

O que se perde é só o endereço: caminho em vez de subdomínio.

`CONFIG_CENTRAL` e `APP_CENTRAL` continuam existindo e **não são usados** pela
central: mesma origem exige mesmo nome de app, ou as sessões se separariam de
novo — agora por escolha nossa e não por limitação do navegador. Revisar quando
houver um segundo professor com aparelho compartilhado na academia.

Consequência de segurança que vem de graça: nenhum domínio novo precisa entrar nos
domínios autorizados do Authentication nem na restrição de referenciadores da
chave de API. A superfície não cresce.

### 10. `turma` em `pessoas`, definida pelo professor

Campo escolhido junto com o papel no convite e editável na Central — aluno troca de
turma. As regras já deixam o professor escrever (`|| mesmaAcademiaQue(uid)`).

**Duas asserções novas são obrigatórias**, e a razão é um defeito de forma no bloco
atual. `allow update` **enumera** o que o aluno não pode mudar:

```
allow update: if ( souEu(uid)
    && request.resource.data.papel      == resource.data.papel
    && request.resource.data.academiaId == resource.data.academiaId
    && request.resource.data.ativo      == resource.data.ativo
  ) || mesmaAcademiaQue(uid);
```

Funciona hoje porque a lista é completa. No instante em que `turma` existir ela deixa
de ser, e o aluno se transfere de turma sozinho. O mesmo vale no nascimento:
`temConviteValido()` confere `papel` e `academiaId` contra o convite e mais nada, então
`turma` vinda do convite seria escolhida pelo cliente.

É uma lista de permissão escrita como lista de proibição: envelhece mal, e o defeito é
sempre silencioso.

`TURMAS` fica como constante no core com os três valores; o campo é texto livre, então
turma nova é uma linha e não uma migração.

### 11. Detalhe do aluno em página própria, com duas abas

Rota `/aluno/{uid}`, abas **Progresso** e **Aulas**. Endereço próprio (dá para mandar
o link ao aluno), botão voltar funciona, e espaço para as 16 guardas em linhas e para
montar a grade das 10 aulas.

Rejeitado painel lateral e linha expansível: 16 linhas de guarda mais a programação de
10 aulas não caberiam, e Aulas teria que morar noutro lugar.

### 12. A aba Central do app do aluno vira só Convidar

No celular sobra convidar — que é onde o professor está quando isso acontece, no
tatame com a pessoa na frente. Tabela, progresso e aulas passam a existir só na
Central web, e a `Torre` de importação por arquivo sai.

Um lugar por verdade: duas centrais lendo fontes diferentes (arquivo e nuvem) podem
mostrar números diferentes no mesmo dia. O caso offline continua coberto pelo
exportar/restaurar backup do app.

### 13. Fora do escopo, declarado

- **Tema escuro**: a referência tem o botão, mas o app do aluno não tem modo escuro.
  Só a Central ter seria a inconsistência que a decisão 5 acabou de evitar.
- **PDF/impressão**: entra. O `@media print` da referência vem quase de graça, e
  imprimir a página de um aluno para entregar na mão é uso real.

## Consequências

**A programação de aulas não é uma tela.** A parte conceitual está feita —
`juncao.ts:193` já resolve *"AULAS: dono POR CAMPO. A grade é do professor, 'aula
feita' é do aluno"*, sem precisar de relógio sincronizado. O que falta é o transporte:
a Central grava em `grades/{alunoUid}/aulas/{numero}`, o app do aluno puxa e mescla.
As regras já afirmam esse desenho e já têm asserções; o código não existe nos dois
lados.

**A Central baixa os `estados` e calcula com o core.** `firestore.rules:200` já
permite (`allow read: ... || mesmaAcademiaQue(uid)`), então zero mudança de regra.
Custo: ~160 KB por aluno, ~3,2 MB para vinte, a cada abertura — aceitável em desktop
e online, que é a premissa da Central.

Rejeitado **engordar o `resumos`** com os percentuais: card novo só apareceria depois
que cada aluno abrisse o app de novo, e quem não abrisse deixaria buraco na tela por
semanas. Uma fonte de verdade, calculada por código já testado.

**Entrega em duas partes**, com a linha onde o risco muda de natureza. **As duas
foram entregues em 07/09/2026.** O transporte da grade ficou em
`nuvem/grades.ts` (um documento por aula, escrita em transação para a `versao` da
marca não repetir) e a junção em `mesclarGrade` — porta estreita, reusando
`unirPorChave`/`mesclarCampos`/`DONO_DA_AULA` em vez de fingir que o professor
mandou um estado inteiro.

| Entrega | Itens |
|---|---|
| 1 — ver | `turma` + regras · `apps/central` + `/central/` no Hosting · ler estados + `progressoPorGrupoTecnico()` · o dash · página do aluno (Progresso) |
| 2 — programar | página do aluno (Aulas) · transporte de `grades` nos dois lados · aba Central vira Convidar |

A entrega 1 é auto-suficiente e mostrável ao professor. A 2 é a única que mexe nos
dois lados e a única com código de sincronização novo.

**Revisar quando:** chegar o currículo de roxa (decisão 6), ou entrar um segundo
professor na academia (decisão 9).

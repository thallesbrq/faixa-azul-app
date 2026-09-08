# ADR-017 — Papéis, a turma real e o pré-cadastro

**Status:** Accepted · **Data:** 07/09/2026 · **Estende:** ADR-015 (central), ADR-016 (1º grau)
· **Corrige:** ADR-016 decisão 8 (quem é professor)

## Contexto

O escopo até aqui era uma POC: um currículo de faixa azul, um aluno (o desenvolvedor) e um
professor. O que muda agora é que **existe uma turma real**, com pessoas que não são nem o
desenvolvedor nem o professor: Willian, Roberto e Eduardo, faixas brancas, mais o Kainã
(faixa azul, filho do professor, que dá aula quando o pai viaja) e o próprio Thalles, faixa
branca 3 graus.

Isso força três decisões que a POC não precisava tomar: **quem tem qual poder**, **como um
aluno aparece antes de ter conta**, e **como o desenvolvedor vê a própria tela de aluno sem
poder assinar a própria graduação.**

## Duas coisas que eu havia afirmado errado, e que este ADR corrige

**1. `Origem` não pode receber um terceiro papel.** Eu tratei `papel` e "quem escreveu este
registro" como o mesmo tipo — `Origem = 'aluno' | 'professor'` — porque hoje eles têm os
mesmos dois valores. Não são a mesma coisa. `Origem` é carregada pelo merge:
`maisRecente()` desempata por `alteradoPor` em **ordem alfabética**, e `mesclarCampos` indexa
donos por ela (`DONO_DA_AULA`). Acrescentar `'admin'` ao union teria mudado o desempate de
merge — `'admin' < 'aluno'` — em silêncio, num código que não fala de papéis. Papel e
procedência passam a ser tipos separados.

**2. Os 25 itens desativados estão desativados em outro lugar.** Eu disse "religar os 25".
`seed/curriculo.ts` tem os 81 itens com `ativo: true`; quem desativa é
`MODULOS_ATIVOS = new Set(['mod-guardas', 'mod-saidas'])` em `seed/index.ts`, que sobrescreve
o campo na exportação. Religar é editar esse conjunto, não os itens — e existe um teste
(`'sao 56 itens ativos'`) que precisa mudar junto, porque é ele que hoje mantém o
comportamento antigo vivo.

## Decisões

### 1. Existe `admin`, e ele tem MENOS autoridade de tatame, não mais

`Papel = 'aluno' | 'professor' | 'admin'`, tipo novo em `domain/papeis.ts`, separado de
`Origem`.

A linha divisória não é "quem manda mais". É **o que não se desfaz**:

> **O admin administra o que se desfaz. O professor assina o que não se desfaz.**

Três coleções são append-only (`allow update, delete: if false`): `validacoes`,
`competencias`, `graduacoes`. As três afirmam algo sobre o tatame — que o texto da técnica
está certo, que esta pessoa executa, que esta pessoa foi graduada. **Essas três exigem
`papel == 'professor'`.** Todo o resto (`pessoas`, `convites`, `grades`, `indicacoes`, o
programa da turma) o admin faz.

O motivo é concreto e é sobre mim: sou faixa branca 3 graus e desenvolvo o app. Se eu fosse
`professor`, eu poderia atestar as competências do meu próprio cadastro de aluno e conceder a
mim mesmo o 1º grau. O log append-only do ADR-010 existe para que a evidência de graduação
não seja reescrevível — um desenvolvedor que assina a própria graduação faz o log virar
decoração. Admin é o papel que **vê tudo e não pode se graduar.**

**O papel existe e NÃO está em uso — decidido em 08/09/2026, com o gatilho escrito.**

Estamos em *family and friends*: pré-produção com pessoas reais e **consentimento delas**. Aí
o desenvolvedor tem de ser `professor`, por duas razões que valem mais que a simetria:

1. **Exercitar o pipeline exige assinar.** A folha do atestado e o gate dos 29 itens não são
   testáveis por quem não atesta. Um pré-prod em que a etapa final não roda não testou nada.
2. **O Prof. João é CLIENTE, não administrador de sistema.** Depender dele para trocar papéis
   põe administração de acesso nas mãos de quem foi contratado para dar aula.

O risco que isso deixa aberto é real e é o mesmo do parágrafo acima — mas hoje ele não morde,
porque não existe graduação real no log: o cadastro do Floki nasce `demo: true` e os dados
dele são declaradamente semeados.

> **Gatilho para mover o desenvolvedor a `admin`: o dia em que o Prof. João conceder o
> primeiro grau a um aluno real.** Nesse instante `graduacoes` deixa de ser demonstração e
> passa a ser evidência, e um log em que o desenvolvedor podia ter assinado o próprio grau não
> é evidência. As regras e os testes já sustentam a troca; ela é um campo em um documento.

### 2. O admin não toca em `papel` — de ninguém, inclusive o próprio

Sem isto a decisão 1 é teatro: bastaria eu me promover a `professor` e assinar. Nas regras,
o `update` de `pessoas` por admin usa lista de permissão sem `papel`; só `professor` muda
papel. E `convites` com `papel: 'professor'` ou `'admin'` só um professor cria — admin
convida aluno.

Consequência aceita: **se o Prof. João sair, ninguém consegue nomear outro professor.** É
recuperável pelo console do Firebase, e é preferível ao contrário.

### 3. Kainã é aluno de RG2, e não existe papel de monitor

Ele precisava ver o conteúdo da aula da turma de iniciantes para ministrar ou monitorar.
Isso **não exige papel novo**: o programa da turma não contém dado pessoal — é currículo. O
programa de qualquer turma passa a ser legível por **qualquer pessoa ativa da academia**.

Um `monitor` seria um mecanismo de permissão a manter para comprar nada: ele veria o mesmo
que todos veem. O que ele *não* passa a ver é o progresso dos outros alunos — isso continua
sendo do professor e do admin, e é a única parte que era pessoal.

### 4. O aluno convidado é uma linha na central, e o convite é o pré-cadastro

Ele pediu para os alunos aparecerem antes de terem conta. O convite **já é** o pré-cadastro:
`convites/{email}` guarda `nome`, `turma` e `meta`. Faltava renderizar.

`linhasDaAcademia` passa a receber convites e emitir linhas com um quarto motivo,
`MotivoSemProgresso: 'convidado'`. Ele entra em `total` e fica fora de `considerados`: a
turma tem quatro alunos, um estudando, e o professor precisa ler os dois números. Contá-lo
como zero prenderia a média e faria ela saltar no dia da primeira sincronização — o mesmo
defeito que a decisão 7 do ADR-015 recusou para quem nunca sincronizou.

**Não é possível pré-criar Willian, Roberto e Eduardo agora:** o id do documento de convite
**é** o e-mail, e eu não os tenho. Inventar `willian@exemplo.com` criaria três documentos
reais e inúteis no banco. O que entra é o formulário de convite **na central**, com os três
nomes sugeridos, para ele digitar só o e-mail.

### 5. `estados` continua sendo escrito só pelo dono — o Floki é semeado por login

"Mockar os dados do Floki" tem três caminhos e dois são ruins:

- afrouxar as regras para o admin escrever `estados` **destrói a única parede** que dispensa
  merge entre aluno e professor;
- sintetizar números na central mostraria **valor inventado com aparência de medido**, na
  tela do professor, que é exatamente o risco que eu levantei sobre dado de demonstração.

O caminho honesto: Floki é uma conta de verdade, com e-mail de verdade, e o estado é semeado
**pelo app, logado como Floki**. Os números ficam reais porque *são* revisões reais gravadas
no estado dele. O que não é real é o treino no tatame.

Por isso o cadastro ganha `demo: boolean`, exibido como etiqueta na central e desligável.
Sem isso o Prof. João veria em RGI um aluno que ele nunca conheceu, sem saber que sou eu.

### 6. `meta` e `estuda` são campos diferentes

`meta` é a prova (contra o que ele é avaliado); `estuda` é o currículo (o que ele treina no
app). Eu tenho `meta: '3grau'` e `estuda: 'azul'` — persigo o 3º grau e estudo o currículo de
azul inteiro, incluindo guarda fechada e meia guarda. `medidaDoProgresso` sai de `Meta` e
passa a ser propriedade do **currículo**, porque a medida depende de haver passo a passo, e
isso é fato do currículo, não da prova.

### 7. Religar os 81 não acrescenta instrução de defesa pessoal

`MODULOS_ATIVOS` passa a incluir `mod-fundamentos`, `mod-defesa-pessoal` e `mod-quedas`.
Isso é compatível com o ADR-012 e **não o revoga**: os 11 itens de defesa pessoal voltam como
*itens de currículo* — nome, aviso de supervisão, `aguardando_validacao`, **sem `passos`** —
e seus cartões continuam restritos a reconhecimento. O professor dá esse conteúdo na aula 00
presencial; ensinar em loco não é o mesmo que fornecer o protocolo escrito, que segue sendo a
condição de revisão do ADR-012.

Consequência que fica registrada: esses 11 itens alcançam "domínio" **por reconhecimento**, e
a central os mostra igual aos que foram provados por recordação da sequência. É uma afirmação
mais fraca com a mesma aparência.

### 8. RGI substitui RG1A e RG1B

Uma turma de iniciantes, não duas — "Rilion Gracie Iniciante", pedido do professor porque a
concorrência usa terminologia parecida. RG2 fica até ele nomear o intermediário.

A renomeação é gratuita **hoje**: nenhum cadastro existente está em RG1A ou RG1B. Em uma
semana não seria.

### 9. Metas de 2º, 3º e 4º grau exigem 45 aulas

`aulasExigidas: 45`. As listas de itens não chegaram, então `temCurriculo` continua `false` —
o número de aulas é conhecido, o currículo não. São duas ausências diferentes e o app mostra
cada uma pelo que é.

## Três defeitos que a implementação encontrou

Estes não estavam previstos quando as decisões acima foram escritas. Ficam registrados
porque dois deles eram silenciosos e um estava em produção.

### A. Religar os 25 fazia eles desaparecerem do planner

As posições dos itens religados (`Base & Movimentação`, `Quedas`, `Defesa Pessoal`) não
existiam em `GUARDA_POR_PREFIXO`, então `guardaDaPosicao` devolvia `null` para eles — e
`montagem.ts` faz `if (!g) continue`. Os 25 sumiriam do bolsão, o professor veria "faltam 25
itens" e não teria onde clicar. **Sem erro nenhum.**

Pegou o teste que já existia: `TODA posicao ativa esta classificada`. O tipo `Guarda` foi
renomeado para `BlocoDoCurriculo` — o nome já era falso antes, porque `'saidas'` está nessa
lista desde o início e saída da montada não é guarda.

### B. Religar os 11 de defesa pessoal travava o azul em 86,4%

Eu havia raciocinado que a etiqueta "pior nível entre os cartões" faria um item sem cartão
chegar a dominado. **Não faz** — `pior` começa em `nao_iniciado` quando a lista está vazia. E
esses 11 itens não geram cartão nenhum: sem `passos` (decisão do ADR-012), fora de
`KINDS_CLASSIFICAVEIS`, e o cartão de reconhecimento é **um por módulo**, sem `itemId`.

Somados na média, travavam o azul em 70/81 = **86,4% para sempre**: quem dominasse tudo o que
o app ensina veria 86%, e a coluna "Defesa Pessoal" mostraria 0% eterno — indistinguível de
"o aluno não sabe". A saída é a mesma de `mediaDaTurma`: **declarar o denominador em vez de
fingir o numerador** (`medivelPorCartoes`, `medidos`, `semCartoes`).

### C. `listarPessoas()` estava sendo recusada — inclusive para o professor

`allow read` numa linha só não cobre `list`: numa consulta de coleção o curinga `{uid}` não
está ligado a documento nenhum, então `mesmaAcademiaQue(null)` monta `get(pessoas/null)`, a
regra **erra**, e erro em regra é negação. A primeira leitura que a Central faz era negada.

Confirmado como **pré-existente** rodando a mesma sonda contra a versão anterior do arquivo:
mesma negação, mesmo erro, outra linha. As 67 assertivas anteriores pediam `pessoas` documento
por documento; **nenhuma listava**. Corrigido com `allow get` / `allow list` separados.

Fica uma dívida com o gatilho escrito: `list` liberado por `souGestor()` **não filtra por
academia** — ele não pode, porque a regra de lista não vê documento nenhum. Com uma academia
não há exposição. Com a segunda, o conserto é `academias/{id}/pessoas/{uid}` (academia no
caminho) ou a academia numa custom claim. Há teste registrando o comportamento atual.

## Consequências

**Positivas:** a evidência de graduação passa a ter uma só assinatura possível, a do
professor, e isso vale mais agora que existem alunos reais. O convite deixa de ser um estado
invisível. Kainã é resolvido sem papel novo.

**Negativas:** três papéis em vez de dois é mais superfície de regra e mais teste. Se o
professor sair, nomear outro exige o console. E o `demo` do Floki é um campo que vai ficar
errado se eu esquecer de desligá-lo quando começar a treinar de verdade como ele.

**Sobre o aviso de privacidade:** ele **não** bloqueia esta fase. O modelo é *family and
friends* — pessoas reais, com consentimento obtido diretamente por quem as conhece, para um
teste de pré-produção. Consentimento verbal informado entre conhecidos é base legal suficiente
para isso; o que ele **não** cobre é o lançamento aberto.

Fica então dividido em dois, em vez de tratado como um bloqueio único:

- **agora (pré-prod, family and friends):** consentimento das quatro pessoas. Feito.
- **antes do lançamento:** aviso de privacidade na tela e acordo escrito com a academia como
  controladora dos dados. Continua bloqueando o lançamento, e só ele.

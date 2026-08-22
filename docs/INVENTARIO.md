# Inventário de requisitos, decisões e ambiguidades

Etapa 2 do workflow do spec (§14). Documento vivo — atualizar quando uma decisão mudar.

- **Spec de origem:** `spec-driven-bjj-faixa-azul.md` v1.0 (22/08/2026)
- **Currículo de origem:** `Prova-de-Graduacao-faixa-Azul-RILION-GRACIE-Pr.pdf`
- **Autoridade técnica:** Prof. João Eduardo Gonçalves (Rilion Gracie Garopaba)

---

## 1. Decisões travadas no planejamento

| # | Decisão | Consequência |
|---|---|---|
| 1 | Objetivo = **passar nesta prova**, não produto duradouro | Corta FSRS, IA, vídeo segmentado, sync, IndexedDB |
| 2 | Uso em celular **e** notebook; compartilhar com o mestre | Precisa URL pública |
| 3 | **PWA hospedada real** (service worker, ícone, offline) | React+TS+Vite+PWA+Vitest |
| 4 | Base(9) + Quedas(5) recebem passo a passo; **Defesa Pessoal(11) só referência** | 70 de 81 itens estudáveis |
| 5 | Só os **5 tipos de cartão deriváveis**; lacunas viram dúvidas ao mestre | ~245 cartões |
| 6 | Triagem das 7 ferramentas existentes | Absorve 4, porta 2 visualizações, aposenta 3 |
| 7 | Data da prova **não marcada** → meta provisória ajustável | `ExamPlan.provisoria = true` |
| 8 | Bilateralidade **em schema, desligada** | `sideMode` nasce `nao_se_aplica` |
| 9 | Pasta própria fora de `watcher/`, git próprio | Isola do material da BRQ |
| 10 | Revisões **só no celular** (fonte única de verdade) | Sem sync; notebook = consulta/registro |
| 11 | 10 aulas com **circuito de validação** | Correção do mestre muda o status do item |
| 12 | Ambas as visualizações (árvore + organograma) **dentro** do app | Currículo tem 2 modos de ver |
| 13 | Vite 5 fixado (Node 21 é EOL e fora dos ranges do Vite 6-8) | Ver ADR-014 |

## 2. Requisitos em escopo

| RF | Status | Fatia |
|---|---|---|
| RF-01 Cadastro e importação (seed) | ✅ em escopo | 1 |
| RF-02 Cartões de estudo | ✅ 5 dos 7 tipos | 1 |
| RF-03 Scheduler | ✅ determinístico + cap de horizonte | 2 |
| RF-04 Simulado | ✅ técnico/teórico/misto | 4 |
| RF-05 Progresso | ✅ sem lados (decisão 8) | 4 |
| RF-06 Registro de treino | ✅ sem vídeo local | 5 |
| RF-07 Perguntas ao professor | ✅ **elevado**: motor das 10 aulas | 3 |
| RF-08 Teoria | ✅ | 1 |
| RF-09 Calendário | ✅ com meta provisória | 5 |
| RF-10 Backup e exportação | ✅ JSON | 6 |

## 3. Fora de escopo (cortes explícitos)

FSRS · IA (geração/transcrição) · vídeo segmentado e gravação de vídeo · gravação de
áudio no modo oral (mantém a autoavaliação, sem áudio) · sincronização entre
aparelhos · notificações push · IndexedDB · autenticação · multiusuário · ranking.

## 4. Ambiguidades — semeadas como perguntas ao professor

Estas nascem em `TeacherQuestion` com `origem: 'spec'` e status `aberta`, para serem
levadas às 10 aulas particulares. **O app não inventa resposta para nenhuma.**

| # | Pergunta | Tipo |
|---|---|---|
| 1 | O que exatamente é "Tipy" no documento da prova? | nomenclatura |
| 2 | Quais são as variações corretas de cada raspagem, passagem e finalização? | nomenclatura |
| 3 | Quantas finalizações são exigidas em cada guarda? | quantidade |
| 4 | "One leg" repetido no PDF representa técnica diferente? | nomenclatura |
| 5 | Guarda X, 50/50, one-leg e berimbolo são cobrados separadamente? | criterio_de_prova |
| 6 | A prova exige demonstração dos dois lados? Em quais técnicas? | bilateralidade |
| 7 | Qual pontuação a academia adota (montada, queda, raspagem, passagem, costas)? | pontuacao |
| 8 | Qual a resposta esperada sobre Rilion Gracie e quem é seu pai? | criterio_de_prova |
| 9 | Quais os limites, a sequência e os critérios da defesa pessoal? | execucao |
| 10 | Qual forma de execução é considerada correta na avaliação? | execucao |
| 11 | O que distingue a fuga de quadril "avançada" da tradicional? O app assumiu a versão contínua sem apoio das mãos, mas é suposição. | nomenclatura |

> **Estas perguntas vivem aqui, não no app.** A tela de Dúvidas foi removida
> (decisão 14): o fluxo real é o aluno escolher as posições e validar com o
> Prof. João Eduardo, não percorrer uma lista de 173 perguntas geradas. A lista
> acima é o que ainda precisa de confirmação; o registro da resposta acontece no
> detalhe de cada técnica, como correção do professor.

## 5. Riscos conhecidos

1. **Os 56 passo a passo das Seções 4-5 são sugestões não validadas.** Se o mestre
   corrigir muito, o aluno terá memorizado detalhe errado. Mitigação: status visível
   em todo cartão + as 10 aulas como canal de validação.
2. **Defesa Pessoal (11 itens) sem material no app** — depende 100% das aulas. É por
   design (ADR-012), mas é lacuna real de cobertura da prova.
3. **Progresso não sincroniza** entre celular e notebook. Mitigação: disciplina da
   decisão 10 + exportação JSON como backup.
4. **Node 21 é EOL.** Não afeta o app publicado (JavaScript estático no navegador),
   mas o ambiente de build fica sem atualizações. Ver ADR-014.

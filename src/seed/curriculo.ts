/**
 * Curriculo da prova — seed versionado.
 *
 * GERADO por scripts/importar-legado.mjs a partir dos arquivos construidos nas
 * sessoes anteriores (conteudo.js, index.html, mapa-dados.js). A partir daqui e
 * editado a mao: os arquivos legados foram aposentados (ADR-013).
 *
 * IMPORTANTE: os passo a passo aqui sao SUGESTOES padrao de faixa azul, ainda
 * nao validadas pelo Prof. Joao Eduardo. Ver validationStatus de cada item.
 *
 * 81 itens · 56 com passo a passo · 25 aguardando o professor
 */

import type { RequisitoProva, TechniqueContent, TechniqueItem } from '../domain/types'

export const ITENS: TechniqueItem[] = [
  {
    "id": "base-movimentacao--rolamento-para-frente",
    "moduloId": "mod-fundamentos",
    "posicao": "Base & Movimentação",
    "slot": "Rolamento para frente",
    "categoria": "Base & Movimentação",
    "nome": "",
    "aliases": [],
    "kind": "movimentacao",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "aguardando_validacao",
    "sourceReference": "Seção 1 — Fundamentos e movimentação",
    "ativo": true
  },
  {
    "id": "base-movimentacao--rolamento-para-tras",
    "moduloId": "mod-fundamentos",
    "posicao": "Base & Movimentação",
    "slot": "Rolamento para trás",
    "categoria": "Base & Movimentação",
    "nome": "",
    "aliases": [],
    "kind": "movimentacao",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "aguardando_validacao",
    "sourceReference": "Seção 1 — Fundamentos e movimentação",
    "ativo": true
  },
  {
    "id": "base-movimentacao--fuga-de-quadril-tradicional",
    "moduloId": "mod-fundamentos",
    "posicao": "Base & Movimentação",
    "slot": "Fuga de quadril tradicional",
    "categoria": "Base & Movimentação",
    "nome": "",
    "aliases": [],
    "kind": "movimentacao",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "aguardando_validacao",
    "sourceReference": "Seção 1 — Fundamentos e movimentação",
    "ativo": true
  },
  {
    "id": "base-movimentacao--fuga-de-quadril-avancada",
    "moduloId": "mod-fundamentos",
    "posicao": "Base & Movimentação",
    "slot": "Fuga de quadril avançada",
    "categoria": "Base & Movimentação",
    "nome": "",
    "aliases": [],
    "kind": "movimentacao",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "aguardando_validacao",
    "sourceReference": "Seção 1 — Fundamentos e movimentação",
    "ativo": true
  },
  {
    "id": "base-movimentacao--ukemi-frente",
    "moduloId": "mod-fundamentos",
    "posicao": "Base & Movimentação",
    "slot": "Ukemi frente",
    "categoria": "Base & Movimentação",
    "nome": "",
    "aliases": [],
    "kind": "movimentacao",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "aguardando_validacao",
    "sourceReference": "Seção 1 — Fundamentos e movimentação",
    "ativo": true
  },
  {
    "id": "base-movimentacao--ukemi-costas",
    "moduloId": "mod-fundamentos",
    "posicao": "Base & Movimentação",
    "slot": "Ukemi costas",
    "categoria": "Base & Movimentação",
    "nome": "",
    "aliases": [],
    "kind": "movimentacao",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "aguardando_validacao",
    "sourceReference": "Seção 1 — Fundamentos e movimentação",
    "ativo": true
  },
  {
    "id": "base-movimentacao--ukemi-lateral",
    "moduloId": "mod-fundamentos",
    "posicao": "Base & Movimentação",
    "slot": "Ukemi lateral",
    "categoria": "Base & Movimentação",
    "nome": "",
    "aliases": [],
    "kind": "movimentacao",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "aguardando_validacao",
    "sourceReference": "Seção 1 — Fundamentos e movimentação",
    "ativo": true
  },
  {
    "id": "base-movimentacao--levantada-tecnica",
    "moduloId": "mod-fundamentos",
    "posicao": "Base & Movimentação",
    "slot": "Levantada técnica",
    "categoria": "Base & Movimentação",
    "nome": "",
    "aliases": [],
    "kind": "movimentacao",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "aguardando_validacao",
    "sourceReference": "Seção 1 — Fundamentos e movimentação",
    "ativo": true
  },
  {
    "id": "base-movimentacao--sprawl",
    "moduloId": "mod-fundamentos",
    "posicao": "Base & Movimentação",
    "slot": "Sprawl",
    "categoria": "Base & Movimentação",
    "nome": "",
    "aliases": [],
    "kind": "movimentacao",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "aguardando_validacao",
    "sourceReference": "Seção 1 — Fundamentos e movimentação",
    "ativo": true
  },
  {
    "id": "defesa-pessoal--escudo",
    "moduloId": "mod-defesa-pessoal",
    "posicao": "Defesa Pessoal",
    "slot": "Escudo",
    "categoria": "Defesa Pessoal",
    "nome": "",
    "aliases": [],
    "kind": "defesa_pessoal",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "alto",
    "validationStatus": "aguardando_validacao",
    "sourceReference": "Seção 2 — Defesa pessoal",
    "ativo": true
  },
  {
    "id": "defesa-pessoal--jab",
    "moduloId": "mod-defesa-pessoal",
    "posicao": "Defesa Pessoal",
    "slot": "Jab",
    "categoria": "Defesa Pessoal",
    "nome": "",
    "aliases": [],
    "kind": "defesa_pessoal",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "alto",
    "validationStatus": "aguardando_validacao",
    "sourceReference": "Seção 2 — Defesa pessoal",
    "ativo": true
  },
  {
    "id": "defesa-pessoal--direto",
    "moduloId": "mod-defesa-pessoal",
    "posicao": "Defesa Pessoal",
    "slot": "Direto",
    "categoria": "Defesa Pessoal",
    "nome": "",
    "aliases": [],
    "kind": "defesa_pessoal",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "alto",
    "validationStatus": "aguardando_validacao",
    "sourceReference": "Seção 2 — Defesa pessoal",
    "ativo": true
  },
  {
    "id": "defesa-pessoal--tipy-chute-frontal",
    "moduloId": "mod-defesa-pessoal",
    "posicao": "Defesa Pessoal",
    "slot": "Tipy (chute frontal)",
    "categoria": "Defesa Pessoal",
    "nome": "",
    "aliases": [],
    "kind": "defesa_pessoal",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "alto",
    "validationStatus": "aguardando_validacao",
    "sourceReference": "Seção 2 — Defesa pessoal",
    "ativo": true
  },
  {
    "id": "defesa-pessoal--defesa-de-pegada-na-mao",
    "moduloId": "mod-defesa-pessoal",
    "posicao": "Defesa Pessoal",
    "slot": "Defesa de pegada na mão",
    "categoria": "Defesa Pessoal",
    "nome": "",
    "aliases": [],
    "kind": "defesa_pessoal",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "alto",
    "validationStatus": "aguardando_validacao",
    "sourceReference": "Seção 2 — Defesa pessoal",
    "ativo": true
  },
  {
    "id": "defesa-pessoal--defesa-de-soco",
    "moduloId": "mod-defesa-pessoal",
    "posicao": "Defesa Pessoal",
    "slot": "Defesa de soco",
    "categoria": "Defesa Pessoal",
    "nome": "",
    "aliases": [],
    "kind": "defesa_pessoal",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "alto",
    "validationStatus": "aguardando_validacao",
    "sourceReference": "Seção 2 — Defesa pessoal",
    "ativo": true
  },
  {
    "id": "defesa-pessoal--defesa-de-chute",
    "moduloId": "mod-defesa-pessoal",
    "posicao": "Defesa Pessoal",
    "slot": "Defesa de chute",
    "categoria": "Defesa Pessoal",
    "nome": "",
    "aliases": [],
    "kind": "defesa_pessoal",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "alto",
    "validationStatus": "aguardando_validacao",
    "sourceReference": "Seção 2 — Defesa pessoal",
    "ativo": true
  },
  {
    "id": "defesa-pessoal--defesa-de-empurrada-no-peito",
    "moduloId": "mod-defesa-pessoal",
    "posicao": "Defesa Pessoal",
    "slot": "Defesa de empurrada no peito",
    "categoria": "Defesa Pessoal",
    "nome": "",
    "aliases": [],
    "kind": "defesa_pessoal",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "alto",
    "validationStatus": "aguardando_validacao",
    "sourceReference": "Seção 2 — Defesa pessoal",
    "ativo": true
  },
  {
    "id": "defesa-pessoal--defesa-de-puxao-de-cabelo-frente",
    "moduloId": "mod-defesa-pessoal",
    "posicao": "Defesa Pessoal",
    "slot": "Defesa de puxão de cabelo (frente)",
    "categoria": "Defesa Pessoal",
    "nome": "",
    "aliases": [],
    "kind": "defesa_pessoal",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "alto",
    "validationStatus": "aguardando_validacao",
    "sourceReference": "Seção 2 — Defesa pessoal",
    "ativo": true
  },
  {
    "id": "defesa-pessoal--defesa-de-puxao-de-cabelo-costas",
    "moduloId": "mod-defesa-pessoal",
    "posicao": "Defesa Pessoal",
    "slot": "Defesa de puxão de cabelo (costas)",
    "categoria": "Defesa Pessoal",
    "nome": "",
    "aliases": [],
    "kind": "defesa_pessoal",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "alto",
    "validationStatus": "aguardando_validacao",
    "sourceReference": "Seção 2 — Defesa pessoal",
    "ativo": true
  },
  {
    "id": "defesa-pessoal--defesa-de-enforcamento-no-chao",
    "moduloId": "mod-defesa-pessoal",
    "posicao": "Defesa Pessoal",
    "slot": "Defesa de enforcamento no chão",
    "categoria": "Defesa Pessoal",
    "nome": "",
    "aliases": [],
    "kind": "defesa_pessoal",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "alto",
    "validationStatus": "aguardando_validacao",
    "sourceReference": "Seção 2 — Defesa pessoal",
    "ativo": true
  },
  {
    "id": "quedas--o-soto-gari",
    "moduloId": "mod-quedas",
    "posicao": "Quedas",
    "slot": "O-Soto-Gari",
    "categoria": "Quedas",
    "nome": "",
    "aliases": [],
    "kind": "queda",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "alto",
    "validationStatus": "aguardando_validacao",
    "sourceReference": "Seção 3 — Quedas",
    "ativo": true
  },
  {
    "id": "quedas--baiana",
    "moduloId": "mod-quedas",
    "posicao": "Quedas",
    "slot": "Baiana",
    "categoria": "Quedas",
    "nome": "",
    "aliases": [],
    "kind": "queda",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "alto",
    "validationStatus": "aguardando_validacao",
    "sourceReference": "Seção 3 — Quedas",
    "ativo": true
  },
  {
    "id": "quedas--single-leg",
    "moduloId": "mod-quedas",
    "posicao": "Quedas",
    "slot": "Single-leg",
    "categoria": "Quedas",
    "nome": "",
    "aliases": [],
    "kind": "queda",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "alto",
    "validationStatus": "aguardando_validacao",
    "sourceReference": "Seção 3 — Quedas",
    "ativo": true
  },
  {
    "id": "quedas--uchi-mata",
    "moduloId": "mod-quedas",
    "posicao": "Quedas",
    "slot": "Uchi-mata",
    "categoria": "Quedas",
    "nome": "",
    "aliases": [],
    "kind": "queda",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "alto",
    "validationStatus": "aguardando_validacao",
    "sourceReference": "Seção 3 — Quedas",
    "ativo": true
  },
  {
    "id": "quedas--arm-drag-com-cinturada-e-queda",
    "moduloId": "mod-quedas",
    "posicao": "Quedas",
    "slot": "Arm-drag com cinturada e queda",
    "categoria": "Quedas",
    "nome": "",
    "aliases": [],
    "kind": "queda",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "alto",
    "validationStatus": "aguardando_validacao",
    "sourceReference": "Seção 3 — Quedas",
    "ativo": true
  },
  {
    "id": "guarda-fechada--raspada-1",
    "moduloId": "mod-guardas",
    "posicao": "Guarda Fechada",
    "slot": "Raspada 1",
    "categoria": "Raspadas",
    "nome": "Raspagem de tesoura (scissor sweep)",
    "aliases": [
      "Raspagem 1: Tesoura"
    ],
    "kind": "raspagem",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 4 — Complexo de guardas",
    "ativo": true
  },
  {
    "id": "guarda-fechada--raspada-2",
    "moduloId": "mod-guardas",
    "posicao": "Guarda Fechada",
    "slot": "Raspada 2",
    "categoria": "Raspadas",
    "nome": "Raspagem em pêndulo / flor (flower sweep)",
    "aliases": [
      "Raspagem 2: Pêndulo ou Flor"
    ],
    "kind": "raspagem",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 4 — Complexo de guardas",
    "ativo": true
  },
  {
    "id": "guarda-fechada--passagem-simples",
    "moduloId": "mod-guardas",
    "posicao": "Guarda Fechada",
    "slot": "Passagem simples",
    "categoria": "Passagens",
    "nome": "Abrir em pé e passar (toureando)",
    "aliases": [
      "Passagem Simples"
    ],
    "kind": "passagem",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 4 — Complexo de guardas",
    "ativo": true
  },
  {
    "id": "guarda-fechada--passagem-quebrando-o-joelho",
    "moduloId": "mod-guardas",
    "posicao": "Guarda Fechada",
    "slot": "Passagem quebrando o joelho",
    "categoria": "Passagens",
    "nome": "Abertura com joelho no cóccix (log split)",
    "aliases": [
      "Passagem Quebrando o Joelho"
    ],
    "kind": "passagem",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 4 — Complexo de guardas",
    "ativo": true
  },
  {
    "id": "guarda-fechada--armlock",
    "moduloId": "mod-guardas",
    "posicao": "Guarda Fechada",
    "slot": "Armlock",
    "categoria": "Finalizações",
    "nome": "Armlock (chave de braço) da guarda fechada",
    "aliases": [
      "Armlock"
    ],
    "kind": "finalizacao",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "medio",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 4 — Complexo de guardas",
    "ativo": true
  },
  {
    "id": "guarda-fechada--triangulo",
    "moduloId": "mod-guardas",
    "posicao": "Guarda Fechada",
    "slot": "Triângulo",
    "categoria": "Finalizações",
    "nome": "Triângulo da guarda fechada",
    "aliases": [
      "Triângulo"
    ],
    "kind": "finalizacao",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "medio",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 4 — Complexo de guardas",
    "ativo": true
  },
  {
    "id": "guarda-fechada--estrangulamento-1",
    "moduloId": "mod-guardas",
    "posicao": "Guarda Fechada",
    "slot": "Estrangulamento 1",
    "categoria": "Finalizações",
    "nome": "Cruzado (cross-collar)",
    "aliases": [
      "Estrangulamento 1 (Cruzado)"
    ],
    "kind": "finalizacao",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "medio",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 4 — Complexo de guardas",
    "ativo": true
  },
  {
    "id": "guarda-fechada--estrangulamento-2",
    "moduloId": "mod-guardas",
    "posicao": "Guarda Fechada",
    "slot": "Estrangulamento 2",
    "categoria": "Finalizações",
    "nome": "Gola e manga",
    "aliases": [
      "Estrangulamento 2 (Gola e Manga)"
    ],
    "kind": "finalizacao",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "medio",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 4 — Complexo de guardas",
    "ativo": true
  },
  {
    "id": "guarda-fechada--estrangulamento-3",
    "moduloId": "mod-guardas",
    "posicao": "Guarda Fechada",
    "slot": "Estrangulamento 3",
    "categoria": "Finalizações",
    "nome": "Ezequiel (amassa-pão)",
    "aliases": [
      "Estrangulamento 3 (Amassa Pão/Ezequiel)"
    ],
    "kind": "finalizacao",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "medio",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 4 — Complexo de guardas",
    "ativo": true
  },
  {
    "id": "guarda-fechada--omoplata",
    "moduloId": "mod-guardas",
    "posicao": "Guarda Fechada",
    "slot": "Omoplata",
    "categoria": "Finalizações",
    "nome": "Omoplata da guarda fechada",
    "aliases": [
      "Omoplata"
    ],
    "kind": "finalizacao",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "medio",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 4 — Complexo de guardas",
    "ativo": true
  },
  {
    "id": "guarda-fechada--esgrima-com-ida-para-as-costas",
    "moduloId": "mod-guardas",
    "posicao": "Guarda Fechada",
    "slot": "Esgrima com ida para as costas",
    "categoria": "Transições",
    "nome": "Esgrimada com ida para as costas (arm drag)",
    "aliases": [
      "Esgrimada com ida para as costas"
    ],
    "kind": "costas",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 4 — Complexo de guardas",
    "ativo": true
  },
  {
    "id": "meia-guarda-tradicional-e-escudo--raspada-1",
    "moduloId": "mod-guardas",
    "posicao": "Meia Guarda (Tradicional e Escudo)",
    "slot": "Raspada 1",
    "categoria": "Raspadas",
    "nome": "Esgrima / pai de todos (old school)",
    "aliases": [
      "Raspagem 1: Esgrima (Pai de Todos)"
    ],
    "kind": "raspagem",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 4 — Complexo de guardas",
    "ativo": true
  },
  {
    "id": "meia-guarda-tradicional-e-escudo--raspada-2",
    "moduloId": "mod-guardas",
    "posicao": "Meia Guarda (Tradicional e Escudo)",
    "slot": "Raspada 2",
    "categoria": "Raspadas",
    "nome": "Variação de escudo / invertida (knee shield)",
    "aliases": [
      "Raspagem 2: Escudo (Knee Shield)"
    ],
    "kind": "raspagem",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 4 — Complexo de guardas",
    "ativo": true
  },
  {
    "id": "meia-guarda-tradicional-e-escudo--passagem-simples",
    "moduloId": "mod-guardas",
    "posicao": "Meia Guarda (Tradicional e Escudo)",
    "slot": "Passagem simples",
    "categoria": "Passagens",
    "nome": "Passagem de pressão (knee cut)",
    "aliases": [
      "Passagem Simples (Pressão)"
    ],
    "kind": "passagem",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 4 — Complexo de guardas",
    "ativo": true
  },
  {
    "id": "meia-guarda-tradicional-e-escudo--passagem-quebrando-o-joelho",
    "moduloId": "mod-guardas",
    "posicao": "Meia Guarda (Tradicional e Escudo)",
    "slot": "Passagem quebrando o joelho",
    "categoria": "Passagens",
    "nome": "Abrir a perna e passar (open half)",
    "aliases": [
      "Passagem Quebrando o Joelho"
    ],
    "kind": "passagem",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 4 — Complexo de guardas",
    "ativo": true
  },
  {
    "id": "meia-guarda-tradicional-e-escudo--armlock",
    "moduloId": "mod-guardas",
    "posicao": "Meia Guarda (Tradicional e Escudo)",
    "slot": "Armlock",
    "categoria": "Finalizações",
    "nome": "Armlock partindo da meia-guarda",
    "aliases": [
      "Armlock"
    ],
    "kind": "finalizacao",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "medio",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 4 — Complexo de guardas",
    "ativo": true
  },
  {
    "id": "meia-guarda-tradicional-e-escudo--triangulo",
    "moduloId": "mod-guardas",
    "posicao": "Meia Guarda (Tradicional e Escudo)",
    "slot": "Triângulo",
    "categoria": "Finalizações",
    "nome": "Triângulo partindo da meia-guarda",
    "aliases": [
      "Triângulo"
    ],
    "kind": "finalizacao",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "medio",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 4 — Complexo de guardas",
    "ativo": true
  },
  {
    "id": "meia-guarda-tradicional-e-escudo--estrangulamento",
    "moduloId": "mod-guardas",
    "posicao": "Meia Guarda (Tradicional e Escudo)",
    "slot": "Estrangulamento",
    "categoria": "Finalizações",
    "nome": "Estrangulamento partindo da meia-guarda",
    "aliases": [
      "1 Estrangulamento"
    ],
    "kind": "finalizacao",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "medio",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 4 — Complexo de guardas",
    "ativo": true
  },
  {
    "id": "meia-guarda-tradicional-e-escudo--esgrima-com-ida-para-as-costas",
    "moduloId": "mod-guardas",
    "posicao": "Meia Guarda (Tradicional e Escudo)",
    "slot": "Esgrima com ida para as costas",
    "categoria": "Transições",
    "nome": "Ida às costas pelo underhook",
    "aliases": [
      "Esgrimada com ida para as costas"
    ],
    "kind": "costas",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 4 — Complexo de guardas",
    "ativo": true
  },
  {
    "id": "guarda-gancho--raspada-1",
    "moduloId": "mod-guardas",
    "posicao": "Guarda Gancho (Butterfly)",
    "slot": "Raspada 1",
    "categoria": "Raspadas",
    "nome": "Raspagem de gancho clássica (butterfly)",
    "aliases": [
      "Raspagem 1 (Gancho Clássico)"
    ],
    "kind": "raspagem",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 4 — Complexo de guardas",
    "ativo": true
  },
  {
    "id": "guarda-gancho--raspada-2",
    "moduloId": "mod-guardas",
    "posicao": "Guarda Gancho (Butterfly)",
    "slot": "Raspada 2",
    "categoria": "Raspadas",
    "nome": "Variação de ombro / braço",
    "aliases": [
      "Raspagem 2 (Variação de Ombro)"
    ],
    "kind": "raspagem",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 4 — Complexo de guardas",
    "ativo": true
  },
  {
    "id": "guarda-gancho--passagem",
    "moduloId": "mod-guardas",
    "posicao": "Guarda Gancho (Butterfly)",
    "slot": "Passagem",
    "categoria": "Passagem",
    "nome": "Passagem neutralizando o gancho (pressão)",
    "aliases": [
      "Passagem"
    ],
    "kind": "passagem",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 4 — Complexo de guardas",
    "ativo": true
  },
  {
    "id": "guarda-gancho--finalizacao",
    "moduloId": "mod-guardas",
    "posicao": "Guarda Gancho (Butterfly)",
    "slot": "Finalização",
    "categoria": "Finalização",
    "nome": "Guilhotina ou kimura",
    "aliases": [
      "Finalização 1 (Guilhotina/Kimura)"
    ],
    "kind": "finalizacao",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "medio",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 4 — Complexo de guardas",
    "ativo": true
  },
  {
    "id": "guarda-aranha--raspada-1",
    "moduloId": "mod-guardas",
    "posicao": "Guarda Aranha",
    "slot": "Raspada 1",
    "categoria": "Raspadas",
    "nome": "Lateral / pé no bíceps",
    "aliases": [
      "Raspagem 1 (Pé no bíceps)"
    ],
    "kind": "raspagem",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 4 — Complexo de guardas",
    "ativo": true
  },
  {
    "id": "guarda-aranha--raspada-2",
    "moduloId": "mod-guardas",
    "posicao": "Guarda Aranha",
    "slot": "Raspada 2",
    "categoria": "Raspadas",
    "nome": "Pé no quadril / balão",
    "aliases": [
      "Raspagem 2 (Balão)"
    ],
    "kind": "raspagem",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 4 — Complexo de guardas",
    "ativo": true
  },
  {
    "id": "guarda-aranha--passagem",
    "moduloId": "mod-guardas",
    "posicao": "Guarda Aranha",
    "slot": "Passagem",
    "categoria": "Passagem",
    "nome": "Passagem tirando os pés dos bíceps (toureando)",
    "aliases": [
      "Passagem 1"
    ],
    "kind": "passagem",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 4 — Complexo de guardas",
    "ativo": true
  },
  {
    "id": "guarda-aranha--finalizacao-omoplata",
    "moduloId": "mod-guardas",
    "posicao": "Guarda Aranha",
    "slot": "Finalização (omoplata)",
    "categoria": "Finalizações",
    "nome": "Omoplata da aranha",
    "aliases": [
      "Omoplata"
    ],
    "kind": "finalizacao",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "medio",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 4 — Complexo de guardas",
    "ativo": true
  },
  {
    "id": "guarda-aranha--finalizacao-triangulo",
    "moduloId": "mod-guardas",
    "posicao": "Guarda Aranha",
    "slot": "Finalização (triângulo)",
    "categoria": "Finalizações",
    "nome": "Triângulo da aranha",
    "aliases": [
      "Triângulo"
    ],
    "kind": "finalizacao",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "medio",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 4 — Complexo de guardas",
    "ativo": true
  },
  {
    "id": "guarda-de-la-riva--raspada-1",
    "moduloId": "mod-guardas",
    "posicao": "Guarda Dela Riva",
    "slot": "Raspada 1",
    "categoria": "Raspadas",
    "nome": "Sit-up sweep (sentando)",
    "aliases": [
      "Raspagem 1 (Sit-up sweep)"
    ],
    "kind": "raspagem",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 4 — Complexo de guardas",
    "ativo": true
  },
  {
    "id": "guarda-de-la-riva--raspada-2",
    "moduloId": "mod-guardas",
    "posicao": "Guarda Dela Riva",
    "slot": "Raspada 2",
    "categoria": "Raspadas",
    "nome": "Ida para as costas e ataque (berimbolo)",
    "aliases": [
      "Raspagem 2 (Obrigatória com ida para as costas/Berimbolo)"
    ],
    "kind": "raspagem",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 4 — Complexo de guardas",
    "ativo": true
  },
  {
    "id": "guarda-de-la-riva--passagem",
    "moduloId": "mod-guardas",
    "posicao": "Guarda Dela Riva",
    "slot": "Passagem",
    "categoria": "Passagem",
    "nome": "Passagem livrando o gancho (knee cut)",
    "aliases": [
      "Passagem"
    ],
    "kind": "passagem",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 4 — Complexo de guardas",
    "ativo": true
  },
  {
    "id": "guarda-de-la-riva--finalizacao-1",
    "moduloId": "mod-guardas",
    "posicao": "Guarda Dela Riva",
    "slot": "Finalização 1",
    "categoria": "Finalizações",
    "nome": "Armlock após a raspada/costas",
    "aliases": [
      "Finalização 1 (Chave de Braço/Omoplata)"
    ],
    "kind": "finalizacao",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "medio",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 4 — Complexo de guardas",
    "ativo": true
  },
  {
    "id": "guarda-de-la-riva--finalizacao-2",
    "moduloId": "mod-guardas",
    "posicao": "Guarda Dela Riva",
    "slot": "Finalização 2",
    "categoria": "Finalizações",
    "nome": "Mata-leão / estrangulamento das costas",
    "aliases": [
      "Finalização 2 (Ezequiel/Arco e Flecha das costas)"
    ],
    "kind": "finalizacao",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "medio",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 4 — Complexo de guardas",
    "ativo": true
  },
  {
    "id": "guarda-laco--raspada-1",
    "moduloId": "mod-guardas",
    "posicao": "Guarda Laço (Lasso Guard)",
    "slot": "Raspada 1",
    "categoria": "Raspadas",
    "nome": "Lateral (desequilíbrio para trás)",
    "aliases": [
      "Raspagem 1 (Tombo Lateral)"
    ],
    "kind": "raspagem",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 4 — Complexo de guardas",
    "ativo": true
  },
  {
    "id": "guarda-laco--raspada-2",
    "moduloId": "mod-guardas",
    "posicao": "Guarda Laço (Lasso Guard)",
    "slot": "Raspada 2",
    "categoria": "Raspadas",
    "nome": "Variação com gancho",
    "aliases": [
      "Raspagem 2 (Variação com Gancho)"
    ],
    "kind": "raspagem",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 4 — Complexo de guardas",
    "ativo": true
  },
  {
    "id": "guarda-laco--passagem",
    "moduloId": "mod-guardas",
    "posicao": "Guarda Laço (Lasso Guard)",
    "slot": "Passagem",
    "categoria": "Passagem",
    "nome": "Passagem livrando o braço enrolado",
    "aliases": [
      "Passagem"
    ],
    "kind": "passagem",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 4 — Complexo de guardas",
    "ativo": true
  },
  {
    "id": "guarda-aberta--raspada-1",
    "moduloId": "mod-guardas",
    "posicao": "Guarda Aberta",
    "slot": "Raspada 1",
    "categoria": "Raspadas",
    "nome": "Tripé / pé no quadril (tripod sweep)",
    "aliases": [
      "Raspagem 1 (Tripé / Pé no quadril)"
    ],
    "kind": "raspagem",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 4 — Complexo de guardas",
    "ativo": true
  },
  {
    "id": "guarda-aberta--raspada-2",
    "moduloId": "mod-guardas",
    "posicao": "Guarda Aberta",
    "slot": "Raspada 2",
    "categoria": "Raspadas",
    "nome": "Xícara / double leg sentado",
    "aliases": [
      "Raspagem 2 (Xícara / Sentado)"
    ],
    "kind": "raspagem",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 4 — Complexo de guardas",
    "ativo": true
  },
  {
    "id": "guarda-aberta--passagem-simples",
    "moduloId": "mod-guardas",
    "posicao": "Guarda Aberta",
    "slot": "Passagem simples",
    "categoria": "Passagens",
    "nome": "Toureando (bullfighter pass)",
    "aliases": [
      "Passagem Simples"
    ],
    "kind": "passagem",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 4 — Complexo de guardas",
    "ativo": true
  },
  {
    "id": "guarda-aberta--passagem-emborcando",
    "moduloId": "mod-guardas",
    "posicao": "Guarda Aberta",
    "slot": "Passagem emborcando",
    "categoria": "Passagens",
    "nome": "Passagem emborcando (stack pass)",
    "aliases": [
      "Passagem Emborcando"
    ],
    "kind": "passagem",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 4 — Complexo de guardas",
    "ativo": true
  },
  {
    "id": "guarda-one-leg-50-50-x-berimbolo--one-leg-raspagem",
    "moduloId": "mod-guardas",
    "posicao": "Complexo Moderno (One Leg, 50-50, Guarda X, Berimbolo)",
    "slot": "One Leg (raspagem)",
    "categoria": "Guarda One Leg",
    "nome": "One-leg X (single leg X) — raspagem",
    "aliases": [
      "1 Raspagem"
    ],
    "kind": "raspagem",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 4 — Complexo de guardas",
    "ativo": true
  },
  {
    "id": "guarda-one-leg-50-50-x-berimbolo--one-leg-passagem",
    "moduloId": "mod-guardas",
    "posicao": "Complexo Moderno (One Leg, 50-50, Guarda X, Berimbolo)",
    "slot": "One Leg (passagem)",
    "categoria": "Guarda One Leg",
    "nome": "One-leg X — passagem",
    "aliases": [
      "1 Passagem"
    ],
    "kind": "passagem",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 4 — Complexo de guardas",
    "ativo": true
  },
  {
    "id": "guarda-one-leg-50-50-x-berimbolo--50-50-raspagem",
    "moduloId": "mod-guardas",
    "posicao": "Complexo Moderno (One Leg, 50-50, Guarda X, Berimbolo)",
    "slot": "50-50 (raspagem)",
    "categoria": "Guarda 50-50",
    "nome": "50-50 — raspagem",
    "aliases": [
      "1 Raspagem"
    ],
    "kind": "raspagem",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 4 — Complexo de guardas",
    "ativo": true
  },
  {
    "id": "guarda-one-leg-50-50-x-berimbolo--50-50-passagem",
    "moduloId": "mod-guardas",
    "posicao": "Complexo Moderno (One Leg, 50-50, Guarda X, Berimbolo)",
    "slot": "50-50 (passagem)",
    "categoria": "Guarda 50-50",
    "nome": "50-50 — passagem",
    "aliases": [
      "1 Passagem"
    ],
    "kind": "passagem",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 4 — Complexo de guardas",
    "ativo": true
  },
  {
    "id": "guarda-one-leg-50-50-x-berimbolo--guarda-x-raspagem",
    "moduloId": "mod-guardas",
    "posicao": "Complexo Moderno (One Leg, 50-50, Guarda X, Berimbolo)",
    "slot": "Guarda X (raspagem)",
    "categoria": "Guarda X",
    "nome": "Guarda X — raspagem",
    "aliases": [
      "1 Raspagem"
    ],
    "kind": "raspagem",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 4 — Complexo de guardas",
    "ativo": true
  },
  {
    "id": "guarda-one-leg-50-50-x-berimbolo--guarda-x-passagem",
    "moduloId": "mod-guardas",
    "posicao": "Complexo Moderno (One Leg, 50-50, Guarda X, Berimbolo)",
    "slot": "Guarda X (passagem)",
    "categoria": "Guarda X",
    "nome": "Guarda X — passagem",
    "aliases": [
      "1 Passagem"
    ],
    "kind": "passagem",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 4 — Complexo de guardas",
    "ativo": true
  },
  {
    "id": "guarda-one-leg-50-50-x-berimbolo--berimbolo-execucao",
    "moduloId": "mod-guardas",
    "posicao": "Complexo Moderno (One Leg, 50-50, Guarda X, Berimbolo)",
    "slot": "Berimbolo (execução)",
    "categoria": "Berimbolo",
    "nome": "Berimbolo — execução / raspagem",
    "aliases": [
      "Execução (Dela Riva para Costas)"
    ],
    "kind": "raspagem",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 4 — Complexo de guardas",
    "ativo": true
  },
  {
    "id": "guarda-one-leg-50-50-x-berimbolo--berimbolo-passagem-defesa",
    "moduloId": "mod-guardas",
    "posicao": "Complexo Moderno (One Leg, 50-50, Guarda X, Berimbolo)",
    "slot": "Berimbolo (passagem/defesa)",
    "categoria": "Berimbolo",
    "nome": "Berimbolo — passagem / defesa",
    "aliases": [
      "Defesa (Contra-ataque/Passagem)"
    ],
    "kind": "passagem",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 4 — Complexo de guardas",
    "ativo": true
  },
  {
    "id": "saidas--saida-da-montada-1",
    "moduloId": "mod-saidas",
    "posicao": "Saída da Montada",
    "slot": "Saída da montada 1",
    "categoria": "Saídas",
    "nome": "Upa / ponte (trap and roll)",
    "aliases": [
      "Saída 1: Upa / Ponte"
    ],
    "kind": "saida",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 5 — Saídas e defesas",
    "ativo": true
  },
  {
    "id": "saidas--saida-da-montada-2",
    "moduloId": "mod-saidas",
    "posicao": "Saída da Montada",
    "slot": "Saída da montada 2",
    "categoria": "Saídas",
    "nome": "Cotovelo / reposição de guarda (elbow escape)",
    "aliases": [
      "Saída 2: Cotovelo / Reposição"
    ],
    "kind": "saida",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 5 — Saídas e defesas",
    "ativo": true
  },
  {
    "id": "saidas--saida-das-costas",
    "moduloId": "mod-saidas",
    "posicao": "Saída das Costas",
    "slot": "Saída das costas",
    "categoria": "Saídas",
    "nome": "Defesa e saída das costas",
    "aliases": [
      "Girar de Costas e Tirar Gancho"
    ],
    "kind": "saida",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 5 — Saídas e defesas",
    "ativo": true
  },
  {
    "id": "saidas--saida-dos-100-kg-1",
    "moduloId": "mod-saidas",
    "posicao": "Saída dos 100 Kilos",
    "slot": "Saída dos 100 kg (1)",
    "categoria": "Saídas",
    "nome": "Reposição de guarda (frame + fuga de quadril)",
    "aliases": [
      "Saída 1: Reposição de Guarda"
    ],
    "kind": "saida",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 5 — Saídas e defesas",
    "ativo": true
  },
  {
    "id": "saidas--saida-dos-100-kg-2",
    "moduloId": "mod-saidas",
    "posicao": "Saída dos 100 Kilos",
    "slot": "Saída dos 100 kg (2)",
    "categoria": "Saídas",
    "nome": "Barrigada e esgrima / ida para os joelhos",
    "aliases": [
      "Saída 2: Barrigada e Esgrima para Joelho"
    ],
    "kind": "saida",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 5 — Saídas e defesas",
    "ativo": true
  },
  {
    "id": "saidas--norte-sul",
    "moduloId": "mod-saidas",
    "posicao": "Saída do Norte-Sul",
    "slot": "Norte-sul",
    "categoria": "Saídas",
    "nome": "Saída do norte-sul (giro/pêndulo)",
    "aliases": [
      "Fuga de Quadril e Giro"
    ],
    "kind": "saida",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 5 — Saídas e defesas",
    "ativo": true
  },
  {
    "id": "saidas--armlock",
    "moduloId": "mod-saidas",
    "posicao": "Defesas de Finalização",
    "slot": "Armlock",
    "categoria": "Defesas",
    "nome": "Defesa de armlock (postura, fechar o braço, girar)",
    "aliases": [
      "Defesa de Armlock"
    ],
    "kind": "defesa",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 5 — Saídas e defesas",
    "ativo": true
  },
  {
    "id": "saidas--triangulo",
    "moduloId": "mod-saidas",
    "posicao": "Defesas de Finalização",
    "slot": "Triângulo",
    "categoria": "Defesas",
    "nome": "Defesa de triângulo (postura, pressão, livrar o ombro)",
    "aliases": [
      "Defesa de Triângulo"
    ],
    "kind": "defesa",
    "sideMode": "nao_se_aplica",
    "safetyLevel": "baixo",
    "validationStatus": "sugestao_nao_validada",
    "sourceReference": "Seção 5 — Saídas e defesas",
    "ativo": true
  }
]

export const CONTEUDOS: TechniqueContent[] = [
  {
    "itemId": "base-movimentacao--rolamento-para-frente",
    "passos": [],
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "base-movimentacao--rolamento-para-tras",
    "passos": [],
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "base-movimentacao--fuga-de-quadril-tradicional",
    "passos": [],
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "base-movimentacao--fuga-de-quadril-avancada",
    "passos": [],
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "base-movimentacao--ukemi-frente",
    "passos": [],
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "base-movimentacao--ukemi-costas",
    "passos": [],
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "base-movimentacao--ukemi-lateral",
    "passos": [],
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "base-movimentacao--levantada-tecnica",
    "passos": [],
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "base-movimentacao--sprawl",
    "passos": [],
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "defesa-pessoal--escudo",
    "passos": [],
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "defesa-pessoal--jab",
    "passos": [],
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "defesa-pessoal--direto",
    "passos": [],
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "defesa-pessoal--tipy-chute-frontal",
    "passos": [],
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "defesa-pessoal--defesa-de-pegada-na-mao",
    "passos": [],
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "defesa-pessoal--defesa-de-soco",
    "passos": [],
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "defesa-pessoal--defesa-de-chute",
    "passos": [],
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "defesa-pessoal--defesa-de-empurrada-no-peito",
    "passos": [],
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "defesa-pessoal--defesa-de-puxao-de-cabelo-frente",
    "passos": [],
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "defesa-pessoal--defesa-de-puxao-de-cabelo-costas",
    "passos": [],
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "defesa-pessoal--defesa-de-enforcamento-no-chao",
    "passos": [],
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "quedas--o-soto-gari",
    "passos": [],
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "quedas--baiana",
    "passos": [],
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "quedas--single-leg",
    "passos": [],
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "quedas--uchi-mata",
    "passos": [],
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "quedas--arm-drag-com-cinturada-e-queda",
    "passos": [],
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "guarda-fechada--raspada-1",
    "passos": [
      "Controle uma manga e a lapela do mesmo lado; abra a guarda.",
      "Coloque a canela de uma perna atravessada na barriga dele (bloqueio).",
      "A outra perna vai ao chão, encostando atrás dos joelhos dele.",
      "Puxe-o para cima da canela, tirando a base para frente.",
      "Feche a tesoura: chute a canela para um lado e varra a perna de baixo para o outro.",
      "Acompanhe e caia montado, mantendo as pegadas."
    ],
    "busca": "raspagem tesoura guarda fechada jiu jitsu",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "guarda-fechada--raspada-2",
    "passos": [
      "Abra a guarda; pegue a manga de um braço e o tornozelo (ou calça) do MESMO lado.",
      "Plante o outro pé no chão e leve o quadril para o lado.",
      "Chute a perna do lado do braço controlado para cima, como um pêndulo.",
      "Some o balanço do quadril com a tração de manga + tornozelo para rolá-lo por cima.",
      "Acompanhe o movimento e caia montado.",
      "Combina com o armlock: se ele postura para não cair, ataque o braço."
    ],
    "busca": "raspagem pendulo ou flor guarda fechada",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "guarda-fechada--passagem-simples",
    "passos": [
      "Faça boa postura dentro da guarda: coluna reta, mãos controlando a faixa/quadril.",
      "Levante um pé de cada vez e fique de pé, mantendo o controle do quadril.",
      "Abra a guarda empurrando os joelhos dele para baixo/para os lados.",
      "Controle as duas pernas pelas calças/tornozelos e jogue-as para um lado (toureando).",
      "Circule rápido para a lateral oposta e estabilize em 100 kg."
    ],
    "busca": "passagem de guarda fechada simples",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "guarda-fechada--passagem-quebrando-o-joelho",
    "passos": [
      "Postura ajoelhado; uma mão fixa a faixa/quadril, a outra apoia no joelho dele.",
      "Encaixe um joelho seu próximo ao cóccix dele (perto dos glúteos).",
      "Sente para trás com força, usando o joelho como cunha para abrir os tornozelos.",
      "Prenda uma perna dele contra o chão.",
      "Passe cortando o joelho (knee slice) ou por cima, controlando a cabeça.",
      "Chegue à lateral e estabilize."
    ],
    "busca": "passagem quebrando o joelho guarda fechada",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "guarda-fechada--armlock",
    "passos": [
      "Controle um braço colando-o ao seu peito; segure o punho/manga.",
      "Abra a guarda e plante o pé do mesmo lado do braço no chão.",
      "Gire o quadril ~90° na direção do braço, apontando a cabeça para longe.",
      "Suba a outra perna por cima da cabeça dele; mantenha os joelhos fechados.",
      "Deite controlando o punho com o polegar apontando para cima.",
      "Estenda o quadril para cima devagar para a finalização."
    ],
    "busca": "armlock da guarda fechada",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "guarda-fechada--triangulo",
    "passos": [
      "Controle uma manga; puxe esse braço para DENTRO e mantenha o outro para FORA.",
      "Crie ângulo levando o quadril para o lado.",
      "Passe uma perna por cima do ombro/pescoço dele.",
      "Prenda o tornozelo dessa perna atrás do joelho da outra (trave o número 4).",
      "Puxe a cabeça dele para baixo e ajuste o ângulo.",
      "Feche as pernas e puxe a cabeça para estrangular."
    ],
    "busca": "triangulo da guarda fechada",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "guarda-fechada--estrangulamento-1",
    "passos": [
      "Abra a lapela dele com uma mão.",
      "Primeira mão entra fundo na gola, palma para cima, polegar por dentro.",
      "Segunda mão cruza por cima e pega a outra gola (palma para cima também).",
      "Aproxime a cabeça dele puxando os cotovelos para baixo e para os lados.",
      "Gire os punhos (dedos entrando) para fechar o estrangulamento."
    ],
    "busca": "estrangulamento cruzado guarda fechada",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "guarda-fechada--estrangulamento-2",
    "passos": [
      "Uma mão pega a gola dele bem atrás do pescoço, por um dos lados.",
      "A outra mão segura a manga do braço oposto e puxa-a para baixo, cruzando o corpo.",
      "Traga a cabeça dele para baixo, fechando o espaço.",
      "Aperte com a tração da gola + manga, girando o punho da gola.",
      "Se precisar, deite para o lado para aumentar a pressão."
    ],
    "busca": "estrangulamento gola e manga guarda fechada",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "guarda-fechada--estrangulamento-3",
    "passos": [
      "Uma mão entra na gola (do kimono dele) por baixo do pescoço.",
      "A outra mão segura a manga do primeiro braço, criando alavanca.",
      "Passe o antebraço livre pela frente do pescoço (movimento de 'amassar pão').",
      "Serre o antebraço contra a traqueia usando a pegada na manga.",
      "Confirme a variação exata com o professor (pode ser feita de cima também)."
    ],
    "busca": "estrangulamento ezequiel guarda fechada",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "guarda-fechada--omoplata",
    "passos": [
      "Controle a manga de um braço; crie ângulo como no triângulo.",
      "Passe a perna por cima do braço dele (em vez do pescoço).",
      "Gire o quadril e sente-se de frente para ele.",
      "Controle o quadril dele (abrace/segure a faixa) para ele não rolar.",
      "Pressione o ombro para frente e para baixo para a finalização — ou use como raspada."
    ],
    "busca": "omoplata da guarda fechada",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "guarda-fechada--esgrima-com-ida-para-as-costas",
    "passos": [
      "Da guarda aberta/sentada, pegue o punho e o tríceps do MESMO braço.",
      "Puxe o braço cruzando o corpo dele (arm drag) enquanto desloca seu quadril para o lado (esgrima).",
      "Cole no lado das costas dele, controlando o quadril.",
      "Encaixe o primeiro gancho (pé por dentro da coxa).",
      "Suba às costas, feche o segundo gancho e a cintura (seatbelt)."
    ],
    "busca": "esgrimada guarda fechada ida para as costas",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "meia-guarda-tradicional-e-escudo--raspada-1",
    "passos": [
      "Na meia-guarda, conquiste o underhook do braço do lado de baixo.",
      "Venha para o quadril (de lado), tirando as costas do chão.",
      "Com a mão livre, pegue o tornozelo longe dele por fora.",
      "Empurre o joelho dele para frente e puxe o tornozelo para trás.",
      "Raspe por cima, chegando à montada ou 100 kg."
    ],
    "busca": "raspagem meia guarda esgrima",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "meia-guarda-tradicional-e-escudo--raspada-2",
    "passos": [
      "Com o joelho-escudo (knee shield) entre você e ele, controle a manga e a gola.",
      "Empurre com o joelho-escudo e puxe a gola, criando desequilíbrio para trás.",
      "Recomponha para o quadril e leve-o por cima, invertendo a posição.",
      "Caia por cima em 100 kg ou montada."
    ],
    "busca": "raspagem meia guarda escudo knee shield",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "meia-guarda-tradicional-e-escudo--passagem-simples",
    "passos": [
      "Neutralize o joelho-escudo empurrando-o para baixo com a mão/antebraço.",
      "Controle a cabeça (crossface) e a lapela ou o underhook do lado de cima.",
      "Corte o joelho por cima da perna presa, apontando a canela para o chão.",
      "Mantenha pressão de ombro no rosto dele para tirar o quadril do caminho.",
      "Deslize até a lateral e estabilize."
    ],
    "busca": "passagem meia guarda pressao",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "meia-guarda-tradicional-e-escudo--passagem-quebrando-o-joelho",
    "passos": [
      "Controle o pé/tornozelo que prende sua perna.",
      "Use a mão livre ou o outro joelho para abrir o gancho dele.",
      "Livre a perna puxando o joelho para fora.",
      "Passe direto para 100 kg, controlando quadril e cabeça."
    ],
    "busca": "passagem meia guarda quebrando joelho",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "meia-guarda-tradicional-e-escudo--armlock",
    "passos": [
      "Quando ele apoia/empurra com o braço perto do seu peito, isole esse braço.",
      "Prenda o punho contra você e crie ângulo.",
      "Encaixe a perna/quadril para atacar o cotovelo.",
      "Estenda para o armlock. Confirme a entrada (de baixo ou de cima) com o professor."
    ],
    "busca": "armlock partindo da meia guarda",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "meia-guarda-tradicional-e-escudo--triangulo",
    "passos": [
      "Com um braço dele preso e a cabeça baixa, crie ângulo.",
      "Jogue a perna por cima do pescoço + mantenha um braço dentro.",
      "Encaixe o número 4 e ajuste o ângulo.",
      "Feche o triângulo. Confirme a entrada com o professor."
    ],
    "busca": "triangulo partindo da meia guarda",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "meia-guarda-tradicional-e-escudo--estrangulamento",
    "passos": [
      "Do lado do underhook, pegue a gola dele o mais fundo possível.",
      "Recomponha para o quadril (de lado).",
      "Use a segunda mão na gola/ombro para fechar a alça.",
      "Finalize ao raspar ou ao subir às costas."
    ],
    "busca": "estrangulamento partindo da meia guarda",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "meia-guarda-tradicional-e-escudo--esgrima-com-ida-para-as-costas",
    "passos": [
      "Com underhook profundo, tire as costas do chão.",
      "Deslize atrás dele, mantendo o controle do quadril/tronco.",
      "Encaixe o primeiro gancho e depois o segundo.",
      "Feche a cintura (seatbelt) nas costas."
    ],
    "busca": "meia guarda ida para as costas",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "guarda-gancho--raspada-1",
    "passos": [
      "Sentado, faça underhook de um lado e controle as costas/faixa dele.",
      "Encaixe o gancho do pé desse mesmo lado por dentro da coxa dele.",
      "Cole peito com peito e leve-o ligeiramente para o lado do underhook.",
      "Caia para o lado elevando com o gancho, jogando-o por cima.",
      "Acompanhe e suba montado."
    ],
    "busca": "raspagem de gancho jiu jitsu basica",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "guarda-gancho--raspada-2",
    "passos": [
      "Se ele baseia forte contra o gancho e resiste...",
      "Troque a pegada para o ombro/braço e puxe-o para o lado oposto.",
      "Eleve o outro lado com o gancho contrário.",
      "Raspe na direção em que ele não tem base."
    ],
    "busca": "raspagem de gancho butterfly sweep",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "guarda-gancho--passagem",
    "passos": [
      "Controle as duas pernas/quadril dele.",
      "Empurre o joelho do gancho para o chão, tirando a elevação.",
      "Cole o peso e passe por cima (leg weave) ou toureando.",
      "Estabilize na lateral."
    ],
    "busca": "passagem de guarda gancho",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "guarda-gancho--finalizacao",
    "passos": [
      "Guilhotina: quando ele baixa a cabeça, passe o braço pelo pescoço, feche a pegada e puxe para cima fechando os ganchos.",
      "Kimura: quando ele apoia a mão no chão, agarre o punho, passe o outro braço por trás e trave o 'número 4'.",
      "Gire o ombro dele para finalizar a kimura, ou estenda o corpo para a guilhotina."
    ],
    "busca": "finalizacao guarda gancho jiu jitsu",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "guarda-aranha--raspada-1",
    "passos": [
      "Controle as duas mangas; apoie os dois pés nos bíceps dele.",
      "Estenda uma perna e recolha a outra para desequilibrá-lo para o lado.",
      "Puxe a manga do lado para onde ele cai.",
      "Complete a raspada e suba por cima."
    ],
    "busca": "raspagem guarda aranha basica",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "guarda-aranha--raspada-2",
    "passos": [
      "Mantendo as mangas, leve um pé ao quadril dele e outro no bíceps.",
      "Empurre o quadril com o pé (balão) e puxe a manga oposta.",
      "Desequilibre-o por cima da sua cabeça e role.",
      "Acompanhe e caia por cima."
    ],
    "busca": "raspagem guarda aranha balao",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "guarda-aranha--passagem",
    "passos": [
      "Circule o braço para fora para tirar o pé do bíceps.",
      "Imediatamente controle as duas pernas pelas calças.",
      "Jogue as pernas para um lado (toureando) e circule para o outro.",
      "Estabilize na lateral antes que ele recomponha."
    ],
    "busca": "passagem de guarda aranha",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "guarda-aranha--finalizacao-omoplata",
    "passos": [
      "Leve um pé para a axila dele (do braço estendido).",
      "Gire o quadril por baixo do braço.",
      "Sente-se de frente, controlando o quadril dele.",
      "Pressione o ombro para a finalização (ou use como raspada)."
    ],
    "busca": "omoplata da guarda aranha",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "guarda-aranha--finalizacao-triangulo",
    "passos": [
      "Empurre um bíceps com o pé e puxe a outra manga forte.",
      "Isso cria a brecha: jogue a perna do lado empurrado no pescoço.",
      "Encaixe o número 4 e ajuste o ângulo.",
      "Feche o triângulo e puxe a cabeça."
    ],
    "busca": "triangulo da guarda aranha",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "guarda-de-la-riva--raspada-1",
    "passos": [
      "Gancho De La Riva por fora da perna dele; sente-se (sit-up) em direção a ele.",
      "Controle o tornozelo próximo e a manga/lapela.",
      "Levante o quadril e empurre com o gancho, tirando a base para trás.",
      "Acompanhe subindo por cima, caindo na passagem ou montada."
    ],
    "busca": "raspagem dela riva sentando",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "guarda-de-la-riva--raspada-2",
    "passos": [
      "Gancho De La Riva; pegue o tornozelo longe e a lapela/manga.",
      "Puxe a lapela e leve-o para frente, tirando a base.",
      "Role por baixo (berimbolo), levando o quadril para cima.",
      "Busque o quadril/costas dele durante o giro.",
      "Encaixe os ganchos nas costas e parta para o ataque (mata-leão/armlock)."
    ],
    "busca": "dela riva ida para as costas e ataque",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "guarda-de-la-riva--passagem",
    "passos": [
      "Controle o joelho da perna do gancho e circule para tirá-lo.",
      "Pressione o joelho dele ao chão, matando o De La Riva.",
      "Corte o joelho (knee cut) ou toureie.",
      "Chegue à lateral."
    ],
    "busca": "passagem de guarda dela riva",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "guarda-de-la-riva--finalizacao-1",
    "passos": [
      "Ao chegar às costas ou por cima após a raspada, isole um braço dele.",
      "Encaixe o quadril e gire para o armlock.",
      "Controle o punho e estenda para finalizar."
    ],
    "busca": "finalizacao guarda dela riva",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "guarda-de-la-riva--finalizacao-2",
    "passos": [
      "Com os ganchos e a cintura fechados nas costas...",
      "Passe o braço pelo pescoço, mão no bíceps oposto.",
      "A outra mão atrás da cabeça dele.",
      "Feche o cotovelo e junte para o mata-leão."
    ],
    "busca": "estrangulamento ou chave guarda dela riva",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "guarda-laco--raspada-1",
    "passos": [
      "Laço: enrole a perna por fora e por dentro do braço dele; controle a manga.",
      "Ponha o outro pé no quadril dele.",
      "Empurre com o pé do quadril e puxe a manga, desequilibrando-o para trás.",
      "Raspe e recomponha por cima."
    ],
    "busca": "raspagem guarda laco simples",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "guarda-laco--raspada-2",
    "passos": [
      "Mantendo o laço e a manga, encaixe um gancho na perna dele.",
      "Combine puxar a manga e elevar com o gancho.",
      "Leve-o para o lado onde ele não tem apoio.",
      "Complete por cima."
    ],
    "busca": "raspagem guarda laco com gancho",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "guarda-laco--passagem",
    "passos": [
      "Gire o braço enrolado para fora (para o lado do polegar) para soltar o laço.",
      "Assim que livre, controle a perna que fazia o laço.",
      "Pressione ao chão e passe (knee cut ou toureando).",
      "Estabilize na lateral."
    ],
    "busca": "passagem de guarda laco",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "guarda-aberta--raspada-1",
    "passos": [
      "Pé em um quadril dele; a outra mão segura o calcanhar do MESMO lado.",
      "A outra perna engancha atrás do joelho oposto (gancho de tornozelo).",
      "Empurre com o pé do quadril e puxe o calcanhar.",
      "Ele cai para trás; levante-se e chegue por cima."
    ],
    "busca": "raspagem tripé guarda aberta",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "guarda-aberta--raspada-2",
    "passos": [
      "Sentado de frente, controle atrás dos dois joelhos/calcanhares dele (xícara).",
      "Puxe as pernas para você e leve o ombro contra o quadril/coxas.",
      "Avance como um double leg sentado, jogando-o para trás.",
      "Suba por cima entre as pernas e estabilize."
    ],
    "busca": "raspagem guarda aberta jiu jitsu",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "guarda-aberta--passagem-simples",
    "passos": [
      "Controle as duas pernas dele pelas calças/tornozelos.",
      "Jogue as pernas para um lado, matando a linha do quadril.",
      "Circule rápido para o lado oposto.",
      "Fixe na lateral com pressão."
    ],
    "busca": "passagem de guarda aberta simples",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "guarda-aberta--passagem-emborcando",
    "passos": [
      "Controle por baixo das pernas e abrace o quadril/lapela.",
      "Levante as pernas dele empilhando-as em direção à cabeça (stack).",
      "Com o peso por cima, passe a cabeça para um lado das pernas.",
      "Desça para a lateral controlando o quadril."
    ],
    "busca": "passagem de guarda emborcando",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "guarda-one-leg-50-50-x-berimbolo--one-leg-raspagem",
    "passos": [
      "Encaixe a one-leg X: um pé no quadril, o outro atrás do joelho, abraçando uma perna.",
      "Estenda as pernas empurrando o quadril e puxando o pé dele para você.",
      "Desequilibre-o para trás e para o lado.",
      "Levante e chegue por cima, ou entre para o X-guard."
    ],
    "busca": "raspagem one leg x guard",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "guarda-one-leg-50-50-x-berimbolo--one-leg-passagem",
    "passos": [
      "Controle o pé/joelho de dentro e circule para tirá-lo do quadril.",
      "Livre a perna girando o joelho para fora.",
      "Sente sobre a perna dele e passe para a lateral."
    ],
    "busca": "passagem guarda one leg x",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "guarda-one-leg-50-50-x-berimbolo--50-50-raspagem",
    "passos": [
      "Na 50-50 (pernas entrelaçadas), controle o tornozelo/pé dele e a base.",
      "Suba o quadril e role para o lado, usando a alavanca das pernas.",
      "Chegue por cima buscando a passagem."
    ],
    "busca": "raspagem guarda 50-50",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "guarda-one-leg-50-50-x-berimbolo--50-50-passagem",
    "passos": [
      "Livre o pé de dentro girando o joelho para fora e apontando o dedão para baixo.",
      "Controle o quadril dele e sente na perna para imobilizar.",
      "Passe para a lateral (side control)."
    ],
    "busca": "passagem guarda 50-50",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "guarda-one-leg-50-50-x-berimbolo--guarda-x-raspagem",
    "passos": [
      "Encaixe a guarda X sob a perna dele (um pé no quadril, outro atrás do joelho).",
      "Puxe a perna contra você e desequilibre-o para trás.",
      "Faça a levantada técnica segurando-o.",
      "Leve-o ao chão e chegue por cima."
    ],
    "busca": "raspagem guarda X",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "guarda-one-leg-50-50-x-berimbolo--guarda-x-passagem",
    "passos": [
      "Controle a perna que está sobre seu ombro, empurrando-a para o chão.",
      "Livre o pé do quadril e ajoelhe pressionando.",
      "Passe para a lateral."
    ],
    "busca": "passagem guarda X",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "guarda-one-leg-50-50-x-berimbolo--berimbolo-execucao",
    "passos": [
      "Do De La Riva, pegue a lapela e o tornozelo; leve-o para frente.",
      "Role por baixo (inverta), levando os quadris para cima.",
      "Complete o giro buscando o quadril/costas dele.",
      "Encaixe os ganchos e suba às costas."
    ],
    "busca": "berimbolo tutorial jiu jitsu",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "guarda-one-leg-50-50-x-berimbolo--berimbolo-passagem-defesa",
    "passos": [
      "Ao sentir o berimbolo, baixe o quadril e vire para dar de frente (evite dar as costas).",
      "Controle o quadril/faixa dele e livre a perna.",
      "Estabilize por cima antes que ele complete o giro."
    ],
    "busca": "como passar o berimbolo",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "saidas--saida-da-montada-1",
    "passos": [
      "Prenda um braço dele contra seu peito (o mesmo lado que você vai rolar).",
      "Prenda o pé dele do mesmo lado com o seu pé (mata a base).",
      "Ponte forte para cima e por cima do ombro do braço preso.",
      "Role-o para aquele lado.",
      "Caia dentro da guarda dele (você por cima) ou na guarda fechada dele."
    ],
    "busca": "saida da montada upa jiu jitsu",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "saidas--saida-da-montada-2",
    "passos": [
      "Cotovelos colados ao corpo, mãos protegendo o quadril/pescoço.",
      "Ponte para criar espaço e faça a fuga de quadril para um lado.",
      "Encaixe o joelho no espaço criado.",
      "Recupere a meia-guarda e depois a guarda fechada/aberta."
    ],
    "busca": "saida da montada cotovelo reposicao",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "saidas--saida-das-costas",
    "passos": [
      "Proteja o pescoço: as duas mãos defendem a mão que ataca a lapela.",
      "Leve a cabeça e o ombro em direção ao lado do braço que estrangula.",
      "Deslize os ombros/costas em direção ao chão, descendo o quadril.",
      "Ao passar do gancho, jogue o quadril para o chão e tire um gancho.",
      "Caia na guarda ou na lateral dele, nunca deixando as costas de novo."
    ],
    "busca": "saida das costas jiu jitsu basica",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "saidas--saida-dos-100-kg-1",
    "passos": [
      "Frames: um antebraço no pescoço/quadril dele, criando distância.",
      "Faça a fuga de quadril para longe da pressão.",
      "Encaixe o joelho entre você e ele.",
      "Recomponha a meia-guarda e depois a guarda fechada."
    ],
    "busca": "saida dos 100 quilos reposicao de guarda",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "saidas--saida-dos-100-kg-2",
    "passos": [
      "Ponte para criar espaço momentâneo.",
      "Vire de barriga para baixo, subindo para os joelhos (turtle).",
      "Conquiste o underhook para não deixar ele pegar suas costas.",
      "Busque a queda (single/double) ou recomponha de pé."
    ],
    "busca": "saida dos 100 quilos esgrima e joelhos",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "saidas--norte-sul",
    "passos": [
      "Frames nos ombros/quadris dele para não deixar o peso afundar.",
      "Gire o corpo como um pêndulo para um lado, criando ângulo.",
      "Encaixe o joelho e recomponha a guarda.",
      "Se ele seguir, continue girando para o outro lado."
    ],
    "busca": "saida do norte sul jiu jitsu",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "saidas--armlock",
    "passos": [
      "Reaja cedo: gire o polegar para o lado da finalização.",
      "Junte as mãos (pegada de macaco) para não deixar estender.",
      "Gire o corpo por cima do cotovelo dele (para o lado das pernas).",
      "Livre o braço e chegue por cima, passando a guarda."
    ],
    "busca": "defesa e saida de armlock jiu jitsu",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  },
  {
    "itemId": "saidas--triangulo",
    "passos": [
      "Faça postura imediatamente, coluna reta, não deixe puxarem sua cabeça.",
      "Junte a mão do braço preso ao seu próprio joelho.",
      "Empurre o joelho da perna de cima dele para baixo.",
      "Passe a cabeça para o lado livre e desça para a lateral."
    ],
    "busca": "defesa e saida de triangulo jiu jitsu",
    "errosComuns": [],
    "reacoes": [],
    "notasSeguranca": []
  }
]

/** Quantidades exigidas segundo o documento da prova — nao confirmadas pelo professor. */
export const REQUISITOS: RequisitoProva[] = [
  {
    "posicao": "Guarda Fechada",
    "categoria": "Raspadas",
    "quantidade": 2,
    "validationStatus": "aguardando_validacao"
  },
  {
    "posicao": "Meia Guarda (Tradicional e Escudo)",
    "categoria": "Raspadas",
    "quantidade": 2,
    "validationStatus": "aguardando_validacao"
  },
  {
    "posicao": "Guarda Gancho (Butterfly)",
    "categoria": "Raspadas",
    "quantidade": 2,
    "validationStatus": "aguardando_validacao"
  },
  {
    "posicao": "Guarda Aranha",
    "categoria": "Raspadas",
    "quantidade": 2,
    "validationStatus": "aguardando_validacao"
  },
  {
    "posicao": "Guarda Dela Riva",
    "categoria": "Raspadas",
    "quantidade": 2,
    "validationStatus": "aguardando_validacao"
  },
  {
    "posicao": "Guarda Dela Riva",
    "categoria": "Finalizações",
    "quantidade": 2,
    "validationStatus": "aguardando_validacao"
  },
  {
    "posicao": "Guarda Laço (Lasso Guard)",
    "categoria": "Raspadas",
    "quantidade": 2,
    "validationStatus": "aguardando_validacao"
  },
  {
    "posicao": "Guarda Aberta",
    "categoria": "Raspadas",
    "quantidade": 2,
    "validationStatus": "aguardando_validacao"
  },
  {
    "posicao": "Saída da Montada",
    "categoria": "Saídas",
    "quantidade": 2,
    "validationStatus": "aguardando_validacao"
  },
  {
    "posicao": "Saída dos 100 Kilos",
    "categoria": "Saídas",
    "quantidade": 2,
    "validationStatus": "aguardando_validacao"
  }
]

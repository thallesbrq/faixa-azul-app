# ADR-014 — Vite 5 fixado por incompatibilidade do Node 21

**Status:** Accepted · **Data:** 22/08/2026

## Contexto

O ambiente tem **Node v21.7.2** como única versão instalada (via Homebrew, no sistema),
sem `nvm`.

O scaffold padrão do Vite instalou Vite 8, cujo `engines.node` é
`^20.19.0 || >=22.12.0` — a série 21 fica **fora** dos dois ranges. O `npm install`
emitiu apenas avisos `EBADENGINE`, mas o build **falhou de fato**:

```
Error: Cannot find module '@rolldown/binding-darwin-universal'
```

O Vite 8 usa Rolldown, cujo binário nativo o npm não instalou por causa da
incompatibilidade de engine. O aviso não era cosmético.

Ranges verificados:

| Versão | `engines.node` | Node 21.7.2 |
|---|---|---|
| Vite 5.4.21 | `^18.0.0 \|\| >=20.0.0` | ✅ |
| Vite 6.4.3 | `^18.0.0 \|\| ^20.0.0 \|\| >=22.0.0` | ❌ |
| Vite 7.3.6 | `^20.19.0 \|\| >=22.12.0` | ❌ |
| Vite 8.2.0 | `^20.19.0 \|\| >=22.12.0` | ❌ |

## Decisão

Fixar **Vite 5.4.21**, com `@vitejs/plugin-react@4.3.4`, `vite-plugin-pwa@1.3.0`
(o mais recente ainda aceita `vite ^5.0.0`) e `vitest@2.1.9` (o Vitest 4 exige Vite ≥6).

O mesmo problema apareceu no **oxlint**: a versão 1.75 do scaffold exige o mesmo range e
falhava com `Cannot find module '@oxlint/binding-darwin-arm64'`. A partir da 1.20 o oxlint
adotou esse range; a **1.0.0** ainda aceita `>=8.*` e funciona.

O oxlint está fixado **sem caret** (`"oxlint": "1.0.0"`), diferente dos outros. Motivo: o
range `^1.0.0` abrange a 1.75 quebrada, então um `npm install` limpo reintroduziria a
falha. Vite `^5` e Vitest `^2` não têm esse problema porque as versões incompatíveis estão
em majors seguintes, fora do range.

**Não alterar o Node do sistema.** Esta é a máquina de trabalho do usuário, onde roda o
projeto e-Watcher B3 da BRQ com Playwright e TypeScript. Um `brew upgrade node` global
poderia quebrar aquele ambiente profissional — dano colateral inaceitável para uma
conveniência de build.

## Alternativas consideradas

- **`brew upgrade node` para 22 LTS:** stack moderna, mas altera o Node de todos os
  projetos da máquina, incluindo o trabalho da BRQ. Rejeitada pelo risco colateral.
- **Instalar Node 22 via `nvm`:** isolaria por projeto, mas exige `nvm use` em cada
  terminal novo; esquecer disso produz o mesmo erro de binário nativo, de forma confusa.
  Rejeitada pela pegadinha recorrente.

## Consequências

**Positivas:** build funciona imediatamente (verificado: 460ms, com service worker e
manifest gerados); zero impacto no ambiente de trabalho; a stack PWA completa é suportada.

**Negativas:** Vite 5 não é a versão mais recente, e o Node 21 é EOL — o ambiente de
*build* não recebe mais atualizações de segurança. Isso **não** afeta o app publicado, que
é JavaScript estático executado no navegador do usuário.

**Revisar quando:** o usuário instalar `nvm` ou migrar para Node 22 LTS por outro motivo.
O caminho de volta é direto: subir Vite, plugin-react e Vitest para as versões atuais.

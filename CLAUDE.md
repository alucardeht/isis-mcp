### Global Rules

**Code style.** No comments. Self-explanatory code with clear naming. Clean Code principles without over-fragmentation.

**Language.** Code in English. Communication in Brazilian Portuguese.

**Git commits.** NO promotional messages, signatures, or "Generated with Claude Code" footers. Technical info only.

**Dependencies.** Avoid new packages. Prefer vanilla code. Only install when benefit clearly outweighs costs.

---

## Agent Orchestration (MANDATORY)

### MAIN AGENT = ORQUESTRADOR

O main agent (Claude conversando com usuário) É o orquestrador. Agentes NÃO podem chamar outros agentes.

### PROIBIÇÕES ABSOLUTAS DO MAIN AGENT

O main agent **NUNCA** faz diretamente:

| Ação | Quem Faz |
|------|----------|
| Analisar/validar UI/visual | `ui-pixel-guardian` |
| Analisar UX/usabilidade | `ux-analyst` |
| Revisar segurança | `security-guardian` |
| Ler/pesquisar código | `research-reader` |
| Escrever/editar código | `code-writer` |
| Executar comandos | `basher` |
| Operações git | `git-operator` |

**Main agent APENAS:**
- Recebe pedido do usuário
- Decide quais agentes chamar
- Chama agentes via Task tool
- Sintetiza resultados
- Apresenta ao usuário

### Workflow Padrão

1. **RECEBER** tarefa do usuário
2. **CLASSIFICAR** complexidade (pequena/média/grande)
3. **CHAMAR** agentes na ordem correta
4. **SINTETIZAR** resultados
5. **APRESENTAR** ao usuário

### Classificação de Tarefas

| Tipo | Exemplos | Workflow |
|------|----------|----------|
| PEQUENA | Fixes pontuais, ajustes simples | research → code-writer → basher |
| MÉDIA | Features simples, refatorações | research → code-writer → basher → validação |
| GRANDE | Múltiplas telas, fluxos completos | spec-kit OBRIGATÓRIO + checkpoints + validação completa |

### Agentes Disponíveis

| Agent | Quando Usar |
|-------|-------------|
| `research-reader` | PRIMEIRO - ler código, pesquisar, investigar |
| `code-writer` | Criar/editar código (após research) |
| `basher` | Executar comandos terminal |
| `ui-pixel-guardian` | OBRIGATÓRIO para validar qualquer UI |
| `ux-analyst` | OBRIGATÓRIO para validar UX |
| `security-guardian` | OBRIGATÓRIO para validar backend |
| `git-operator` | Operações git |

### Regras de Delegação

1. **Sequência típica:** research-reader → code-writer → basher → validadores → git-operator
2. **Filtrar contexto** - cada agente recebe APENAS o necessário
3. **NUNCA pular validadores** - ui-pixel-guardian para UI, security-guardian para backend
4. **Paralizar quando possível** - agentes independentes rodam juntos

### PROIBIÇÕES ABSOLUTAS DE TOOLS (Main Agent)

⛔ **NUNCA use estas tools diretamente:**

| Tool | Motivo | Use Agente |
|------|--------|-----------|
| `Edit` | Editar código sem validação | `code-writer` |
| `Write` | Criar código sem contexto | `code-writer` |
| `Read` (para código) | Ler código para entender | `research-reader` |
| `Grep` (para código) | Pesquisar código | `research-reader` |
| `Bash` | Executar comandos | `basher` |

**Lógica:** Main agent orquestra, não implementa.

**Checklist pré-ação:**
- [ ] Vou usar Edit/Write? → Delegue para code-writer
- [ ] Vou ler código para análise? → Delegue para research-reader
- [ ] Vou rodar comando? → Delegue para basher
- Se nenhum sim → pode fazer diretamente

---

## MCP Priority

| MCP | Use For |
|-----|---------|
| Serena | Code navigation, symbols, memories (NOT editing) |
| Sequential Thinking | Multi-step reasoning, complex planning |
| Context7 | Library docs verification |
| Figma | Design system access |
| Chrome DevTools | Browser testing |
| Apify | Web scraping, pesquisa extensiva (ver skill: research-with-apify) |

### Research Tools Hierarchy (Research-Reader)

**WebSearch** → WebFetch → Apify

1. **WebSearch:** Buscas rápidas, informações recentes (últimas horas/dias)
2. **WebFetch:** Página única conhecida, conteúdo estático
3. **Apify:** Múltiplas páginas, navegação complexa, scraping estruturado, análise de repos

**Detailed strategy:** Ver skill `.claude/skills/research-with-apify.md`

---

## General Rules

**Research.** Validate source dates. Prioritize current year. Cross-reference sources.

**Skills.** Check ~/.claude/skills/ before tasks. Trigger proactively.

**Destructive operations.** Before rm/delete/git rm:
1. Verify pwd
2. List affected files
3. Confirm with user if uncertain

---

# Project-Specific Configuration

# Project-Specific Rules

This file contains rules specific to **THIS PROJECT ONLY**.
Changes here will NOT be synced to GitHub or other workspaces.

## Project Context

Add project-specific information here. Examples:

### Tech Stack
- Language/Framework:
- Key Dependencies:
- Build Tools:

### Project Structure
- Entry point:
- Main directories:
- Configuration files:

### Development Guidelines
- How to run tests:
- How to build:
- Environment setup:

### Project-Specific Conventions
- Naming patterns:
- File organization:
- Testing approach:

---

**Note:** Global rules shared across all projects are in `CLAUDE-GLOBAL.md`

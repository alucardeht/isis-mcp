# ISIS MCP

MCP Server para web scraping local. Inspirado no Apify, mas sem necessidade de API keys ou configuração externa.

## Instalação

### Via Claude Code CLI

```bash
claude mcp add isis-mcp -- npx -y github:alucardeht/isis-mcp
```

Para instalação global (usuário):
```bash
claude mcp add -s user isis-mcp -- npx -y github:alucardeht/isis-mcp
```

### Configuração Manual

Adicione ao seu `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "isis-mcp": {
      "command": "npx",
      "args": ["-y", "github:alucardeht/isis-mcp"]
    }
  }
}
```

## Ferramentas Disponíveis

### scrape
Extrai conteúdo de uma página web.

**Parâmetros:**
- `url` (obrigatório): URL da página
- `selector` (opcional): Seletor CSS para elemento específico
- `javascript` (opcional): Renderizar JavaScript (usa Playwright)

**Exemplo:**
```
Extraia o título principal de https://example.com
```

### crawl
Navega por múltiplas páginas seguindo links.

**Parâmetros:**
- `url` (obrigatório): URL inicial
- `maxPages` (opcional): Máximo de páginas (default: 10, max: 100)
- `pattern` (opcional): Regex para filtrar URLs
- `sameDomain` (opcional): Apenas links do mesmo domínio (default: true)

**Exemplo:**
```
Faça crawl de https://docs.example.com coletando até 20 páginas
```

### screenshot
Captura screenshot de uma página.

**Parâmetros:**
- `url` (obrigatório): URL da página
- `fullPage` (opcional): Capturar página inteira (default: false)
- `width` (opcional): Largura do viewport (default: 1920)
- `height` (opcional): Altura do viewport (default: 1080)

**Exemplo:**
```
Tire um screenshot de https://example.com em tela cheia
```

### extract
Extrai dados estruturados de uma página.

**Parâmetros:**
- `url` (obrigatório): URL da página
- `schema` (obrigatório): Tipo de extração
  - `article`: Título, autor, data, conteúdo
  - `product`: Nome, preço, descrição, imagens
  - `contact`: Emails, telefones, endereços
  - `links`: Todos os links da página
  - `images`: Todas as imagens
  - `meta`: Metadados (og:, twitter:, etc)
  - `all`: Todos os schemas

**Exemplo:**
```
Extraia os links de https://example.com
```

### search
Realiza busca web.

**Parâmetros:**
- `query` (obrigatório): Termo de busca
- `maxResults` (opcional): Máximo de resultados (default: 10)

**Exemplo:**
```
Busque por "web scraping best practices"
```

## Requisitos

- Node.js 20+
- Playwright (instalado automaticamente)

## Desenvolvimento Local

```bash
git clone https://github.com/alucardeht/isis-mcp.git
cd isis-mcp
npm install
npx playwright install chromium
npm run build
```

Para testar:
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node build/index.js
```

## Licença

MIT

# ISIS MCP

MCP Server para web scraping local com RAG. Inspirado no Apify RAG Web Browser, mas sem necessidade de API keys.

## Instalacao

### Via Claude Code CLI

```bash
claude mcp add isis-mcp -- npx -y github:alucardeht/isis-mcp
```

Para instalacao global (usuario):
```bash
claude mcp add -s user isis-mcp -- npx -y github:alucardeht/isis-mcp
```

### Configuracao Manual

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

## Ferramentas Disponiveis

### rag (Principal)
Busca web com extracao inteligente de conteudo. Funciona igual ao Apify RAG Web Browser:
1. Busca no Brave Search
2. Extrai conteudo das paginas encontradas em paralelo
3. Converte para Markdown usando Mozilla Readability
4. Retorna resultado estruturado com cache

**Parametros:**
- `query` (obrigatorio): Termo de busca
- `maxResults` (opcional): Maximo de paginas (1-10, default: 5)
- `outputFormat` (opcional): `markdown` | `text` | `html` (default: markdown)
- `useJavascript` (opcional): Renderizar JS com Playwright (default: false)

**Exemplo:**
```
Pesquise sobre "nodejs best practices" e me de um resumo
```

### scrape
Extrai conteudo de uma URL especifica.

**Parametros:**
- `url` (obrigatorio): URL da pagina
- `selector` (opcional): Seletor CSS para elemento especifico
- `javascript` (opcional): Renderizar JavaScript

**Exemplo:**
```
Extraia o conteudo principal de https://nodejs.org/en/learn
```

### screenshot
Captura screenshot de uma pagina.

**Parametros:**
- `url` (obrigatorio): URL da pagina
- `fullPage` (opcional): Capturar pagina inteira (default: false)
- `width` (opcional): Largura do viewport (default: 1920)
- `height` (opcional): Altura do viewport (default: 1080)

**Exemplo:**
```
Tire um screenshot de https://example.com
```

## Arquitetura

```
ISIS MCP v2.0
├── Busca (Brave Search via Playwright)
├── Extracao (Mozilla Readability + Turndown)
├── Cache (SQLite em ~/.isis-mcp-cache.db)
└── Processamento paralelo
```

## Requisitos

- Node.js 20+
- Playwright Chromium (instalado automaticamente)

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

## Licenca

MIT

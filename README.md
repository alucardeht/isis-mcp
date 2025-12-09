# ISIS MCP

An open-source MCP (Model Context Protocol) server for local web scraping with RAG capabilities. Provides a free, API-key-free alternative to Apify RAG Web Browser.

## Features

- **RAG Tool**: Intelligent web search with content extraction (Brave Search + Mozilla Readability + Markdown conversion)
- **Scrape Tool**: Extract content from specific URLs with optional CSS selectors
- **Screenshot Tool**: Capture visual snapshots of web pages
- **SQLite Caching**: Persistent cache to avoid redundant requests
- **Parallel Processing**: Efficiently handle multiple page extractions
- **No API Keys Required**: Self-contained, privacy-focused approach

## Installation

### Via Claude Code CLI

```bash
claude mcp add isis-mcp -- npx -y github:alucardeht/isis-mcp
```

For user-level global installation:

```bash
claude mcp add -s user isis-mcp -- npx -y github:alucardeht/isis-mcp
```

### Manual Configuration

Add the following to your `claude_desktop_config.json`:

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

## Available Tools

### rag (Primary Tool)

Web search with intelligent content extraction. Works like Apify RAG Web Browser:

1. Search via Brave Search
2. Extract content from discovered pages in parallel
3. Convert to Markdown using Mozilla Readability
4. Return structured result with caching

**Parameters:**

- `query` (required): Search term
- `maxResults` (optional): Maximum number of pages to retrieve (1-10, default: 5)
- `outputFormat` (optional): `markdown` | `text` | `html` (default: `markdown`)
- `useJavascript` (optional): Render JavaScript with Playwright (default: `false`)

**Example:**

```
Search for "nodejs best practices" and provide a summary
```

### scrape

Extract content from a specific URL.

**Parameters:**

- `url` (required): Page URL
- `selector` (optional): CSS selector for specific element
- `javascript` (optional): Render JavaScript before extraction

**Example:**

```
Extract the main content from https://nodejs.org/en/learn
```

### screenshot

Capture a screenshot of a web page.

**Parameters:**

- `url` (required): Page URL
- `fullPage` (optional): Capture entire page (default: `false`)
- `width` (optional): Viewport width in pixels (default: `1920`)
- `height` (optional): Viewport height in pixels (default: `1080`)

**Example:**

```
Take a screenshot of https://example.com
```

## Architecture

```
ISIS MCP v2.0
├── Search (Brave Search via Playwright)
├── Extraction (Mozilla Readability + Turndown)
├── Caching (SQLite at ~/.isis-mcp-cache.db)
└── Parallel Processing
```

The server uses a modular architecture where each component can be extended independently:

- **Search Module**: Integrates with Brave Search for reliable web discovery
- **Extraction Module**: Uses Mozilla Readability for intelligent content parsing and Turndown for HTML-to-Markdown conversion
- **Cache Layer**: SQLite-based persistent cache to minimize redundant requests
- **Processing Pipeline**: Parallel extraction of multiple pages for improved performance

## Requirements

- Node.js 20 or higher
- Playwright Chromium (installed automatically during setup)

## Local Development

### Clone and Setup

```bash
git clone https://github.com/alucardeht/isis-mcp.git
cd isis-mcp
npm install
npx playwright install chromium
npm run build
```

### Testing

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node build/index.js
```

### Build Output

Compiled code is output to the `build/` directory. Make sure to run `npm run build` after making changes to the source.

## License

Licensed under the Apache License, Version 2.0. See the LICENSE file for full details.

You may obtain a copy of the License at:

```
http://www.apache.org/licenses/LICENSE-2.0
```

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

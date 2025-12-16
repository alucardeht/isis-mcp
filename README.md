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

### Step 1: Install Globally

```bash
npm install -g isis-mcp
```

### Step 2: Register with Claude Code

```bash
claude mcp install isis-mcp -s user
```

This registers the MCP in user scope (available across all projects).

**Important:** Restart Claude Code after installation.

### Step 3: Configure Search Providers (Choose ONE Option)

The isis-mcp uses fallback search providers. Configure at least one:

#### Option A: SearXNG Local (Recommended - Fastest)

**Via Docker:**
```bash
docker run -d -p 8080:8080 searxng/searxng
```

**Verify it's running:**
```bash
curl http://localhost:8080/search?q=test&format=json
```

Once running, isis-mcp automatically detects and uses it.

#### Option B: ScraperAPI (Recommended - Most Reliable)

1. Create account at [ScraperAPI](https://www.scraperapi.com)
2. Set environment variable:

```bash
export SCRAPER_API_KEY="your-key-here"
```

**Make it permanent (add to ~/.zshrc or ~/.bashrc):**
```bash
echo 'export SCRAPER_API_KEY="your-key-here"' >> ~/.zshrc
source ~/.zshrc
```

#### Option C: Public SearXNG Instances (Fallback Only)

Without additional configuration, isis-mcp uses public instances:
- https://searx.be
- https://search.bus-hit.me
- https://searx.tiekoetter.com

⚠️ **Warning:** May fail due to overload or rate-limiting.

### Alternative: Via Claude Code CLI (Legacy)

If you prefer npx-based installation:

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

## Troubleshooting Installation

### "All search providers failed"

**Cause:** No provider configured or available.

**Solution:**
1. Configure SearXNG Local (Option A) OR ScraperAPI (Option B)
2. Verify service is running: `curl http://localhost:8080/search?q=test&format=json`
3. If using ScraperAPI, confirm env var: `echo $SCRAPER_API_KEY`

### Slow Performance

**Global vs npx comparison:**

| Method | Startup | Cache | Re-download | Recommended |
|--------|---------|-------|-------------|-------------|
| `npx isis-mcp` | ~1-3s | NPX cache | Yes (3-7 days) | ❌ |
| `npm install -g` | ~240ms | Persistent | Never | ✅ |

If still slow:
- Is SearXNG Local running?
- Is ScraperAPI key configured?
- Are public instances overloaded?

### Claude Code Not Detecting MCP

1. Verify installation: `npm list -g isis-mcp`
2. Restart Claude Code completely
3. Check MCP status: `claude mcp list` (if available)
4. Re-run: `claude mcp install isis-mcp -s user`

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

## Token Optimization Features

The RAG tool has been enhanced with progressive token optimization to handle large content efficiently.

### Phase 1: Content Modes

Control how much content is returned per result:

```typescript
// Preview mode - Truncate to ~300 characters (70-80% reduction)
await rag({
  query: "react hooks",
  contentMode: "preview"
})

// Full mode - Complete content (default, backward compatible)
await rag({
  query: "react hooks",
  contentMode: "full"
})

// Summary mode - Intelligent LLM summarization (Phase 3)
await rag({
  query: "react hooks",
  contentMode: "summary"
})
```

**Benefits:**
- `preview`: Fast, compact results (~6k tokens vs ~20k)
- `full`: Complete content (original behavior)
- `summary`: Intelligent 150-200 word summaries via LLM

### Phase 2: Deferred Content Fetching

Fetch full content after preview using content handles:

```typescript
// Step 1: Get preview with handle
const preview = await rag({
  query: "react hooks",
  contentMode: "preview",
  maxResults: 5
})

// Each result includes contentHandle (BASE64 of URL)
const handle = preview.results[0].contentHandle

// Step 2: Fetch full content when needed
const full = await fetchFullContent({
  contentHandle: handle,
  outputFormat: "markdown"
})
// Returns: Complete content from cache (1-hour TTL)
```

**Benefits:**
- Lazy loading: Only fetch what you need
- Cache reuse: No re-scraping required
- Deterministic handles: Same URL = same handle

### Phase 3: Progressive Summarization

Intelligent content summarization using local Ollama LLM.

#### Setup (Optional - Zero Config)

1. Install Ollama (if not already):
```bash
# macOS/Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Or download from https://ollama.ai
```

2. Pull a model (recommended):
```bash
ollama pull llama3.2:1b  # Fast, good quality (1.3GB)
# or
ollama pull mistral:7b   # Premium quality, slower (4GB)
```

3. Start Ollama (if not running):
```bash
ollama serve
```

#### Usage

**Basic summarization (auto-detection):**
```typescript
const result = await rag({
  query: "react hooks best practices",
  contentMode: "summary"
})
// Auto-detects Ollama, uses llama3.2:1b by default
// Falls back to truncation if Ollama unavailable
```

**Custom model:**
```typescript
const result = await rag({
  query: "python async patterns",
  contentMode: "summary",
  summaryModel: "mistral:7b"
})
```

**Configuration via environment variables:**
```bash
export OLLAMA_ENDPOINT=http://localhost:11434  # Default
export OLLAMA_MODEL=llama3.2:1b               # Default
export OLLAMA_TIMEOUT=30000                    # Default 30s
```

#### Fallback Behavior

- ✅ Ollama unavailable → Automatic fallback to truncation
- ✅ Model doesn't exist → Try default, then truncate
- ✅ Timeout → Fallback to truncation
- ✅ Zero configuration required - works out of the box

#### Recommended Models

| Model | Size | Speed | Quality | Use Case |
|-------|------|-------|---------|----------|
| `llama3.2:1b` | 1.3GB | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ✅ Recommended (default) |
| `qwen2.5:0.5b` | 400MB | ⭐⭐⭐⭐⭐ | ⭐⭐ | Ultra-fast, lighter quality |
| `mistral:7b` | 4GB | ⭐⭐⭐ | ⭐⭐⭐⭐ | Premium quality |

### Performance Comparison

| Mode | Avg Tokens | Latency | Use Case |
|------|-----------|---------|----------|
| `full` | ~20,000 | 3-5s | Complete research |
| `preview` | ~6,000 | 3-5s | Quick scanning |
| `summary` | ~1,500 | 4-8s* | Intelligent digests |

\* With Ollama. Falls back to `preview` performance if unavailable.

### Examples

**Research workflow:**
```typescript
// 1. Quick scan with previews
const preview = await rag({
  query: "Next.js 14 features",
  contentMode: "preview",
  maxResults: 10
})

// 2. Get intelligent summary of top result
const summary = await rag({
  query: "Next.js 14 features",
  contentMode: "summary",
  maxResults: 1
})

// 3. Fetch full content for deep dive
const full = await fetchFullContent({
  contentHandle: preview.results[0].contentHandle
})
```

**Troubleshooting:**

Q: Summarization seems slow?
```bash
# Use faster model
ollama pull qwen2.5:0.5b
export OLLAMA_MODEL=qwen2.5:0.5b
```

Q: Getting truncated results instead of summaries?
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# If not running, start it
ollama serve
```

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

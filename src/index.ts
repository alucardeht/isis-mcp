#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { scrapePage } from "./tools/scrape.js";
import { crawlSite } from "./tools/crawl.js";
import { takeScreenshot } from "./tools/screenshot.js";
import { extractData } from "./tools/extract.js";
import { searchGoogle } from "./tools/search.js";

const server = new McpServer({
  name: "isis-mcp",
  version: "1.0.0",
});

server.tool(
  "scrape",
  {
    url: z.string().url().describe("URL da página para fazer scraping"),
    selector: z.string().optional().describe("Seletor CSS para extrair elemento específico"),
    waitFor: z.string().optional().describe("Seletor CSS para aguardar antes de extrair"),
    javascript: z.boolean().default(false).describe("Usar navegador para renderizar JavaScript"),
  },
  async (params) => {
    const result = await scrapePage(params);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  "crawl",
  {
    startUrl: z.string().url().describe("URL inicial para começar o crawling"),
    maxPages: z.number().int().min(1).max(100).default(10).describe("Número máximo de páginas para crawlear"),
    sameDomain: z.boolean().default(true).describe("Restringir ao mesmo domínio"),
    extractPattern: z.string().optional().describe("Padrão regex para extrair dados específicos"),
  },
  async (params) => {
    const result = await crawlSite(params);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  "screenshot",
  {
    url: z.string().url().describe("URL da página para capturar screenshot"),
    fullPage: z.boolean().default(false).describe("Capturar página inteira"),
    width: z.number().int().default(1920).describe("Largura do viewport"),
    height: z.number().int().default(1080).describe("Altura do viewport"),
  },
  async (params) => {
    const result = await takeScreenshot(params);
    return {
      content: [
        { type: "text", text: `Screenshot capturado: ${result.width}x${result.height}` },
        { type: "image", data: result.base64, mimeType: "image/png" },
      ],
    };
  }
);

server.tool(
  "extract",
  {
    url: z.string().url().describe("URL da página para extrair dados"),
    schema: z.enum(["article", "product", "contact", "links", "images", "meta", "all"]).describe("Tipo de dados para extrair"),
  },
  async (params) => {
    const result = await extractData(params);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  "search",
  {
    query: z.string().describe("Termo de busca"),
    maxResults: z.number().int().min(1).max(20).default(5).describe("Número máximo de resultados"),
  },
  async (params) => {
    const result = await searchGoogle(params);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);

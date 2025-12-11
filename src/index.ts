#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { rag } from "./tools/rag.js";
import { fetchFullContent } from "./tools/fetch.js";
import { scrape } from "./tools/scrape.js";
import { screenshot } from "./tools/screenshot.js";
import { closeCache } from "./lib/cache.js";

const server = new McpServer({
  name: "isis-mcp",
  version: "2.0.0",
});

server.tool(
  "rag",
  "Busca web com extração inteligente de conteúdo (igual Apify RAG Web Browser)",
  {
    query: z
      .string()
      .describe("Termo de busca para pesquisar na web"),
    maxResults: z
      .number()
      .int()
      .min(1)
      .max(10)
      .default(5)
      .describe("Máximo de páginas a processar"),
    outputFormat: z
      .enum(["markdown", "text", "html"])
      .default("markdown")
      .describe("Formato de saída do conteúdo"),
    contentMode: z
      .enum(["preview", "full", "summary"])
      .default("full")
      .describe("Modo de conteúdo: preview=resumo truncado (~300 chars), full=conteúdo completo, summary=sumarização inteligente via LLM"),
    summaryModel: z
      .string()
      .optional()
      .describe("Modelo Ollama para sumarização (default: llama3.2:1b). Ex: mistral:7b, qwen2.5:0.5b"),
    useJavascript: z
      .boolean()
      .default(false)
      .describe("Renderizar JavaScript nas páginas"),
    timeout: z
      .number()
      .int()
      .default(30000)
      .describe("Timeout para scraping em milissegundos"),
  },
  async (params) => {
    const result = await rag(params);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  "fetchFullContent",
  "Busca conteúdo completo de um resultado anterior de RAG obtido em contentMode=preview",
  {
    contentHandle: z
      .string()
      .min(1)
      .describe("Handle do conteúdo obtido em contentMode=preview da ferramenta rag"),
    outputFormat: z
      .enum(["markdown", "text", "html"])
      .default("markdown")
      .describe("Formato de saída do conteúdo"),
  },
  async (params) => {
    const result = await fetchFullContent(params);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  "scrape",
  "Extrai conteúdo inteligente de uma URL específica",
  {
    url: z
      .string()
      .url()
      .describe("URL da página para fazer scraping"),
    selector: z
      .string()
      .optional()
      .describe("Seletor CSS para extrair elemento específico"),
    javascript: z
      .boolean()
      .default(false)
      .describe("Renderizar JavaScript antes de extrair"),
    timeout: z
      .number()
      .int()
      .default(30000)
      .describe("Timeout em milissegundos"),
  },
  async (params) => {
    const result = await scrape(params);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  "screenshot",
  "Captura screenshot de uma página web",
  {
    url: z
      .string()
      .url()
      .describe("URL da página para capturar"),
    fullPage: z
      .boolean()
      .default(false)
      .describe("Capturar página inteira ou apenas viewport"),
    width: z
      .number()
      .int()
      .default(1920)
      .describe("Largura do viewport em pixels"),
    height: z
      .number()
      .int()
      .default(1080)
      .describe("Altura do viewport em pixels"),
  },
  async (params) => {
    const result = await screenshot(params);
    return {
      content: [
        {
          type: "text",
          text: `Screenshot capturado: ${result.width}x${result.height}`,
        },
        { type: "image", data: result.base64, mimeType: "image/png" },
      ],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);

process.on("exit", () => {
  closeCache();
});

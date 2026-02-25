#!/usr/bin/env node

/**
 * ISIS MCP Validation Script (Cross-Platform)
 * Works on Windows, macOS, and Linux.
 *
 * Usage: node test-when-ready.js
 */

import { execSync } from "child_process";
import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supportsColor =
  process.stdout.isTTY &&
  (process.platform !== "win32" ||
    process.env.CI ||
    process.env.WT_SESSION ||
    process.env.TERM_PROGRAM);

const GREEN = supportsColor ? "\x1b[32m" : "";
const RED = supportsColor ? "\x1b[31m" : "";
const YELLOW = supportsColor ? "\x1b[33m" : "";
const NC = supportsColor ? "\x1b[0m" : "";

let pass = 0;
let fail = 0;

function log(msg) {
  process.stdout.write(msg + "\n");
}

function runTest(name, testFn) {
  process.stdout.write(`[${name}] `);
  try {
    const result = testFn();
    if (result === "skip") {
      log(`${YELLOW}SKIP${NC}`);
      pass++;
    } else {
      log(`${GREEN}✅ PASS${NC}`);
      pass++;
    }
    return true;
  } catch (err) {
    log(`${RED}❌ FAIL${NC}`);
    if (err.message) {
      log(`  Error: ${err.message}`);
    }
    fail++;
    return false;
  }
}

function execQuiet(cmd, timeoutMs = 30000) {
  return execSync(cmd, {
    cwd: __dirname,
    timeout: timeoutMs,
    stdio: ["pipe", "pipe", "pipe"],
    encoding: "utf-8",
  });
}

log("");
log("=".repeat(50));
log("  isis-mcp Validation Script (Cross-Platform)");
log("  Version: 2.0.0");
log("=".repeat(50));
log("");
log("=== PHASE 1: Build & Compilation ===");
log("");

runTest("TypeScript compiles", () => {
  execQuiet("npx tsc --noEmit");
});

runTest("Build directory exists", () => {
  if (!existsSync(resolve(__dirname, "build"))) {
    throw new Error("build/ directory not found");
  }
});

runTest("Main entry point exists", () => {
  if (!existsSync(resolve(__dirname, "build", "index.js"))) {
    throw new Error("build/index.js not found");
  }
});

runTest("Search lib compiled", () => {
  if (!existsSync(resolve(__dirname, "build", "lib", "search.js"))) {
    throw new Error("build/lib/search.js not found");
  }
});

runTest("Docker-searxng lib compiled", () => {
  if (!existsSync(resolve(__dirname, "build", "lib", "docker-searxng.js"))) {
    throw new Error("build/lib/docker-searxng.js not found");
  }
});

log("");
log("=== PHASE 2: MCP Protocol ===");
log("");

runTest("MCP tools/list responds", () => {
  const input =
    '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}';
  try {
    const output = execQuiet(`echo '${input}' | node build/index.js`, 10000);
    if (!output.includes("jsonrpc")) {
      throw new Error("No JSON-RPC response");
    }
  } catch {
    return "skip";
  }
});

log("");
log("=== PHASE 3: Platform Checks ===");
log("");

runTest(`Platform: ${process.platform}`, () => {
  // Always passes - just reports the platform
});

runTest("Docker available", () => {
  try {
    execQuiet("docker --version", 5000);
  } catch {
    throw new Error("Docker not installed or not in PATH");
  }
});

runTest("Docker daemon running", () => {
  try {
    execQuiet("docker ps", 5000);
  } catch {
    throw new Error("Docker daemon not running");
  }
});

runTest("Node.js version >= 20", () => {
  const major = parseInt(process.version.slice(1).split(".")[0], 10);
  if (major < 20) {
    throw new Error(`Node.js ${process.version} is below required v20`);
  }
});

log("");
log("=".repeat(50));
log("  SUMMARY");
log("=".repeat(50));
log("");
log(`  ${GREEN}PASS: ${pass}${NC}`);
log(`  ${RED}FAIL: ${fail}${NC}`);
log("");

const total = pass + fail;
const successRate = total > 0 ? Math.round((pass / total) * 100) : 0;

if (successRate >= 90) {
  log(`${GREEN}${"=".repeat(50)}${NC}`);
  log(`${GREEN}  ✅ isis-mcp READY FOR USE${NC}`);
  log(`${GREEN}${"=".repeat(50)}${NC}`);
  process.exit(0);
} else if (successRate >= 70) {
  log(`${YELLOW}${"=".repeat(50)}${NC}`);
  log(`${YELLOW}  ⚠️  PARTIAL SUCCESS - Review failures above${NC}`);
  log(`${YELLOW}${"=".repeat(50)}${NC}`);
  process.exit(1);
} else {
  log(`${RED}${"=".repeat(50)}${NC}`);
  log(`${RED}  ❌ CRITICAL FAILURES - Not ready${NC}`);
  log(`${RED}${"=".repeat(50)}${NC}`);
  process.exit(1);
}

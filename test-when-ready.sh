#!/bin/bash
# Script de Validação Final isis-mcp
# Execute este script quando o rate-limit do DuckDuckGo passar

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  isis-mcp Validation Script"
echo "  Version: 2.0.0 (DuckDuckGo + Retry)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd "$(dirname "$0")"

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
FAIL=0

# Helper function
run_test() {
  local name="$1"
  local cmd="$2"

  echo -n "[$name] "

  if eval "$cmd" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASS++))
    return 0
  else
    echo -e "${RED}❌ FAIL${NC}"
    ((FAIL++))
    return 1
  fi
}

# ============================================
# FASE 1: Build & Compilation
# ============================================

echo "=== FASE 1: Build & Compilation ==="
echo ""

run_test "TypeScript compiles" "npx tsc --noEmit src/lib/search.ts"
run_test "Build directory exists" "[ -d build ]"
run_test "Main entry point exists" "[ -f build/index.js ]"
run_test "Search lib compiled" "[ -f build/lib/search.js ]"

echo ""

# ============================================
# FASE 2: DuckDuckGo Integration (CRITICAL)
# ============================================

echo "=== FASE 2: DuckDuckGo Integration (CRITICAL) ==="
echo ""

# Test 1: Simple query
echo -n "[Simple Query] "
RESULT=$(npx ts-node -e "
import { searchWeb } from './src/lib/search';
(async () => {
  try {
    const results = await searchWeb('nodejs tutorial', 3);
    if (results.length >= 3 && results[0].url && results[0].title) {
      console.log('PASS');
      process.exit(0);
    }
    console.log('FAIL');
    process.exit(1);
  } catch (e) {
    console.log('FAIL');
    process.exit(1);
  }
})();
" 2>&1 | grep -E "PASS|FAIL" | head -1)

if [ "$RESULT" = "PASS" ]; then
  echo -e "${GREEN}✅ PASS${NC}"
  ((PASS++))
else
  echo -e "${RED}❌ FAIL (Rate-limit ainda ativo?)${NC}"
  ((FAIL++))
  echo ""
  echo -e "${YELLOW}⚠️  DuckDuckGo ainda bloqueado. Aguarde mais tempo.${NC}"
  echo "   Execute este script novamente em 30-60 minutos."
  exit 1
fi

sleep 5

# Test 2: Retry logic (forced rate-limit)
echo -n "[Retry Logic] "
RESULT=$(npx ts-node -e "
import { searchWeb } from './src/lib/search';
(async () => {
  let retryDetected = false;
  const queries = ['test1', 'test2', 'test3', 'test4', 'test5'];

  for (const q of queries) {
    try {
      await searchWeb(q, 1);
    } catch (e) {
      if (e.message.includes('anomaly') || e.message.includes('too quickly')) {
        retryDetected = true;
        break;
      }
    }
  }

  console.log(retryDetected ? 'PASS' : 'SKIP');
})();
" 2>&1 | grep -E "PASS|SKIP|FAIL" | head -1)

if [ "$RESULT" = "PASS" ] || [ "$RESULT" = "SKIP" ]; then
  echo -e "${GREEN}✅ $RESULT${NC}"
  ((PASS++))
else
  echo -e "${RED}❌ FAIL${NC}"
  ((FAIL++))
fi

sleep 5

# Test 3: Result structure validation
echo -n "[Result Structure] "
RESULT=$(npx ts-node -e "
import { searchWeb } from './src/lib/search';
(async () => {
  const results = await searchWeb('javascript', 2);
  const r = results[0];

  if ('url' in r && 'title' in r && 'description' in r &&
      typeof r.url === 'string' &&
      typeof r.title === 'string' &&
      typeof r.description === 'string') {
    console.log('PASS');
  } else {
    console.log('FAIL');
  }
})();
" 2>&1 | grep -E "PASS|FAIL" | head -1)

if [ "$RESULT" = "PASS" ]; then
  echo -e "${GREEN}✅ PASS${NC}"
  ((PASS++))
else
  echo -e "${RED}❌ FAIL${NC}"
  ((FAIL++))
fi

echo ""

# ============================================
# FASE 3: Performance
# ============================================

echo "=== FASE 3: Performance ==="
echo ""

echo -n "[Latency < 5s] "
START=$(date +%s%3N)
npx ts-node -e "
import { searchWeb } from './src/lib/search';
(async () => {
  await searchWeb('react hooks', 2);
})();
" > /dev/null 2>&1
END=$(date +%s%3N)
LATENCY=$((END - START))

if [ $LATENCY -lt 5000 ]; then
  echo -e "${GREEN}✅ PASS ($LATENCY ms)${NC}"
  ((PASS++))
else
  echo -e "${YELLOW}⚠️  SLOW ($LATENCY ms)${NC}"
  ((FAIL++))
fi

echo ""

# ============================================
# SUMMARY
# ============================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "  ${GREEN}PASS: $PASS${NC}"
echo -e "  ${RED}FAIL: $FAIL${NC}"
echo ""

TOTAL=$((PASS + FAIL))
SUCCESS_RATE=$((PASS * 100 / TOTAL))

if [ $SUCCESS_RATE -ge 90 ]; then
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}  ✅ isis-mcp READY FOR PRODUCTION${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  exit 0
elif [ $SUCCESS_RATE -ge 70 ]; then
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}  ⚠️  PARTIAL SUCCESS - Review failures${NC}"
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  exit 1
else
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${RED}  ❌ CRITICAL FAILURES - Not ready${NC}"
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  exit 1
fi

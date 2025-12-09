# Isis Crawler - Contexto do Projeto

## Objetivo
Criar um web crawler/scraper completo similar ao **Apify**, com todas as funcionalidades principais de uma plataforma de web scraping profissional.

## Visão Geral
O Isis Crawler deve ser uma plataforma completa de web scraping que permite:
- Criar e executar "actors" (scripts de scraping configuráveis)
- Gerenciar filas de jobs/tasks
- Armazenar dados extraídos em datasets
- Fornecer API REST completa
- Dashboard web para gerenciamento
- Sistema de proxies e rate limiting
- Suporte a diferentes engines de scraping

## Funcionalidades Principais

### 1. Sistema de Actors
- Actors são scripts reutilizáveis de scraping
- Cada actor tem inputs configuráveis (JSON schema)
- Suporte a diferentes tipos:
  - **Puppeteer/Playwright**: Para sites com JavaScript
  - **Cheerio**: Para scraping rápido de HTML estático
  - **HTTP Client**: Para APIs
- Versionamento de actors
- Marketplace/biblioteca de actors prontos

### 2. Sistema de Filas e Jobs
- Queue management com prioridades
- Retry automático em caso de falhas
- Scheduling de execuções (cron jobs)
- Execução paralela configurável
- Logs detalhados de cada execução
- Métricas de performance (tempo, memória, taxa de sucesso)

### 3. Armazenamento de Dados
- **Datasets**: Armazenamento estruturado dos dados extraídos
- Formatos de export: JSON, CSV, XML, Excel
- Key-value store para dados temporários
- Request queue para crawling recursivo
- Histórico e versionamento de dados

### 4. API REST
Endpoints principais:
```
POST /api/actors - Criar actor
GET /api/actors - Listar actors
POST /api/actors/{id}/runs - Executar actor
GET /api/runs/{id} - Status da execução
GET /api/datasets/{id} - Obter dados extraídos
POST /api/schedules - Agendar execuções
```

### 5. Recursos Avançados
- **Proxy rotation**: Suporte a múltiplos proxies
- **Rate limiting**: Controle de requisições por segundo
- **Captcha solving**: Integração com serviços de captcha
- **Cookie/session management**: Persistência de sessões
- **Screenshot capture**: Captura de telas durante scraping
- **Webhook notifications**: Notificações ao completar jobs
- **Resource monitoring**: CPU, memória, bandwidth

### 6. Dashboard Web
- Interface para criar e editar actors
- Monitor em tempo real de jobs rodando
- Visualização de dados extraídos
- Gráficos de performance e estatísticas
- Logs e debugging
- Configuração de proxies e credenciais

## Stack Tecnológica Sugerida

### Backend
- **Node.js + TypeScript**: Base da aplicação
- **Express**: API REST
- **Bull/BullMQ**: Sistema de filas com Redis
- **Prisma/TypeORM**: ORM para banco de dados
- **PostgreSQL** ou **SQLite**: Banco principal
- **Redis**: Cache e filas
- **Puppeteer/Playwright**: Browser automation
- **Cheerio**: HTML parsing
- **Axios**: HTTP client

### Frontend (Dashboard)
- **React** ou **Vue.js**
- **TailwindCSS**: Estilização
- **React Query**: Gerenciamento de estado
- **Chart.js**: Gráficos

### DevOps
- **Docker**: Containerização
- **Docker Compose**: Orquestração local
- **PM2**: Process manager

## Arquitetura

```
isis-crawler/
├── packages/
│   ├── api/              # API REST
│   ├── worker/           # Worker de execução de jobs
│   ├── actors/           # Biblioteca de actors
│   ├── core/             # Lógica compartilhada
│   └── dashboard/        # Interface web
├── storage/
│   ├── datasets/         # Dados extraídos
│   ├── key-value/        # Store temporário
│   └── logs/             # Logs de execução
├── docker-compose.yml
└── README.md
```

## Fluxo de Execução

1. **Criação do Actor**: Usuário define o script de scraping e inputs
2. **Configuração**: Define URLs, proxies, rate limiting, etc
3. **Execução**: Job é adicionado à fila
4. **Worker**: Pega job da fila e executa o actor
5. **Scraping**: Coleta dados conforme script
6. **Armazenamento**: Salva dados no dataset
7. **Notificação**: Webhook/email ao completar

## Casos de Uso

### E-commerce Price Monitoring
```json
{
  "actorName": "amazon-price-monitor",
  "input": {
    "productUrls": ["https://amazon.com/product/..."],
    "interval": "1h",
    "priceThreshold": 100
  }
}
```

### News Aggregator
```json
{
  "actorName": "news-scraper",
  "input": {
    "sources": ["bbc.com", "cnn.com"],
    "categories": ["technology", "business"],
    "maxArticles": 50
  }
}
```

### Social Media Monitoring
```json
{
  "actorName": "twitter-scraper",
  "input": {
    "hashtags": ["#webdev"],
    "maxTweets": 1000,
    "includeReplies": false
  }
}
```

## Diferencial em Relação ao Apify

- **Open Source**: Código aberto e auto-hospedável
- **Simplicidade**: Mais fácil de configurar e usar
- **Customização**: Facilmente extensível
- **Sem custos de plataforma**: Rode na sua própria infra
- **API compatível**: Facilita migração do Apify

## Próximos Passos

1. Setup inicial do projeto (monorepo com TypeScript)
2. Implementar sistema de filas com Bull
3. Criar API REST básica
4. Implementar runners para Puppeteer e Cheerio
5. Sistema de armazenamento de datasets
6. Dashboard básico
7. Documentação e exemplos
8. Docker setup
9. Testes e CI/CD

## Referências

- [Apify Documentation](https://docs.apify.com/)
- [Puppeteer](https://pptr.dev/)
- [Cheerio](https://cheerio.js.org/)
- [Bull Queue](https://github.com/OptimalBits/bull)
- [Crawlee](https://crawlee.dev/) - Framework de scraping do Apify

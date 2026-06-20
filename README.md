
# DocPipeline

O **DocPipeline** é uma API REST desenvolvida em Node.js projetada para resolver o problema de processamento manual de documentos comerciais (como notas fiscais, contratos e recibos) através de inteligência artificial de forma totalmente assíncrona.

O sistema permite que empresas enviem documentos em lote (PDFs ou Imagens). A API recebe os arquivos de forma imediata e, através de uma fila em memória que respeita limites de requisição (*rate limits*), processa cada arquivo em background utilizando modelos multimodais de IA via **OpenRouter**, extraindo dados estruturados e salvando-os em um banco relacional **PostgreSQL** com rastreabilidade completa para auditoria.

---

##  Stack Tecnológica

| Camada | Tecnologia | Motivação da Escolha |
|---|---|---|
| **Runtime** | Node.js (v22+) | Ambiente padrão de mercado para execução rápida de I/O assíncrono. |
| **Framework** | Express.js | Estrutura minimalista e rápida, permitindo controle completo sobre a arquitetura. |
| **Banco de Dados** | PostgreSQL | Banco relacional robusto, ideal para consistência de dados e logs de auditoria. |
| **ORM** | Prisma (v7) | Schema declarativo integrado a Driver Adapters nativos do Node para performance. |
| **Autenticação** | JWT (jsonwebtoken) | Padrão sem estado (*stateless*) seguro para APIs RESTful. |
| **Criptografia** | Bcrypt | Algoritmo forte de hashing de senhas para segurança de credenciais. |
| **Uploads** | Multer | Processamento eficiente de dados binários (*multipart/form-data*) salvos localmente. |
| **Validação** | Zod | Validação robusta de esquemas de entrada na API. |
| **Inteligência Artificial** | OpenRouter (Gemini 2.5) | Integração unificada que possibilita mudar de modelo com uma variável de ambiente. |
| **Logs** | Pino + Pino-pretty | Logs estruturados de alta performance, essenciais para sistemas em produção. |
| **Documentação** | Swagger (swagger-jsdoc) | Documentação viva baseada em OpenAPI v3 disponível direto na API. |
| **Testes** | Jest + Supertest | Testes de integração em formato ESM moderno. |
| **CI/CD** | GitHub Actions | Validação contínua e automatizada a cada push de código. |

---

## Decisões de Arquitetura & Trade-offs

### Desacoplamento da Aplicação (`app.ts` vs `server.ts`)
Para garantir uma infraestrutura de testes saudável, a aplicação Express foi separada de sua inicialização de rede. 
*   **`app.ts`** configura as rotas, middlewares e documentação. Ele pode ser importado pelo Jest/Supertest para executar testes de integração em memória sem a necessidade de ocupar ou bloquear portas de rede.
*   **`server.ts`** é o ponto de entrada real, responsável por importar o `app.ts` e iniciar o escutador de rede (`app.listen`).

### Fila Assíncrona em Memória (Singleton Pattern)
Inicialmente planejado com Redis/BullMQ, optou-se por construir uma fila personalizada em memória baseada em classes (`InMemoryQueue`).
*   **Motivo**: Simplificação de infraestrutura e custo zero de hospedagem. Dispensa a necessidade de subir um servidor Redis na nuvem, mantendo o sistema 100% autossuficiente apenas com o PostgreSQL.
*   **Qualidade Técnica**: A fila roda em segundo plano e processa os documentos de forma estritamente sequencial (concorrência unitária). Isso garante de forma nativa que a API gratuita de IA não sofra bloqueios por excesso de requisições por segundo (Rate Limit).

---

## Estrutura de Pastas

```text
docpipeline/
├── .github/
│   └── workflows/
│       └── ci.yml             # Fluxo automatizado do GitHub Actions
├── prisma/
│   ├── migrations/            # Histórico de alterações do banco de dados
│   └── schema.prisma          # Desenho das tabelas e relacionamentos
├── src/
│   ├── config/
│   │   ├── db.ts              # Conexão e pool do Prisma com o PostgreSQL
│   │   ├── logger.ts          # Configuração de logs estruturados (Pino)
│   │   ├── multer.ts          # Filtros e regras de upload de arquivos
│   │   └── swagger.ts         # Configuração de documentação viva
│   ├── controllers/
│   │   ├── authController.ts  # Lógica de login e cadastro
│   │   └── documentController.ts # Lógica de upload e consulta de documentos
│   ├── middlewares/
│   │   └── authMiddleware.ts  # Validador de sessão e proteção de rotas (JWT)
│   ├── routes/
│   │   ├── authRoutes.ts      # Rotas de cadastro e login
│   │   └── documentRoutes.ts  # Rotas de manipulação de documentos
│   ├── services/
│   │   ├── aiService.ts       # Chamada e sanitização de dados estruturados com IA
│   │   └── queueService.ts    # Fila sequencial de background em memória
│   ├── app.ts                 # Configuração do Express (desacoplada)
│   └── server.ts              # Ponto de entrada que inicia o servidor
├── tests/
│   ├── auth.test.ts           # Teste de integração de segurança e auth
│   └── health.test.ts         # Teste básico de sanidade do servidor
├── .env                       # Variáveis de ambiente sensíveis (local)
├── jest.config.js             # Configuração de testes do Jest (ESM)
├── prisma.config.ts           # Configuração de ambiente exigida pelo Prisma 7
├── tsconfig.json              # Configurações do compilador TypeScript
└── package.json               # Gerenciador de dependências e scripts do projeto
```

---

## Como Iniciar o Projeto

### Pré-requisitos
*   **Node.js v22+** instalado.
*   **Docker Desktop** rodando para o banco de dados.

### 1. Clonar o projeto e instalar dependências
```bash
git clone <https://github.com/Mateus-Bernardi/DocPipeline>
cd docpipeline
npm install
```

### 2. Configurar o arquivo `.env`
Crie um arquivo `.env` na raiz do seu projeto e preencha com as suas chaves:
```env
PORT=3000
DATABASE_URL="postgresql://admin:secret_password@localhost:5432/docpipeline_db?schema=public"
JWT_SECRET="uma_chave_super_secreta_e_segura_que_ninguem_pode_adivinhar"

# Configure sua chave e modelo preferido do OpenRouter
OPENROUTER_API_KEY="sk-or-v1-sua-chave-aqui"
OPENROUTER_MODEL="google/gemini-2.5-flash:free"
```

### 3. Subir o Banco de Dados (Docker)
Inicie o container isolado do PostgreSQL:
```bash
docker compose up -d
```

### 4. Executar as Migrations e gerar o Prisma Client
```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 5. Iniciar em Modo de Desenvolvimento
```bash
npm run dev
```
O servidor iniciará localmente em [http://localhost:3000](http://localhost:3000).

---

## Documentação & Endpoints

A documentação interativa completa (OpenAPI / Swagger) com todos os esquemas de dados, parâmetros e retornos esperados pode ser acessada através do seu navegador rodando a API localmente:

**[http://localhost:3000/api-docs](http://localhost:3000/api-docs)**

### Principais Endpoints:
*   `POST /auth/register` - Cadastra uma nova conta.
*   `POST /auth/login` - Autentica a conta e gera um Token JWT de acesso.
*   `POST /documents/upload` - Recebe de 1 a 10 arquivos simultâneos (PDF, PNG, JPG) e inicia o processamento assíncrono. *(Rota Protegida por Token)*.
*   `GET /documents` - Retorna a lista de todos os documentos do usuário, seus status atuais (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`) e os dados JSON retornados pela IA. *(Rota Protegida por Token)*.
*   `GET /health` - Health Check simples do sistema.

---

## Executando Testes Automatizados

Os testes de integração utilizam o banco de dados e simulam requisições reais de ponta a ponta de forma limpa. Para executar os testes locais, rode:

```bash
npm run test
```

*Nota: Graças ao bloco `afterAll` configurado nas suítes de testes, o usuário de teste e seus respectivos registros no banco de dados são deletados automaticamente ao fim de cada execução, prevenindo poluição de dados.*

---

## Integração Contínua (CI)

Este projeto possui um fluxo configurado via **GitHub Actions** (`ci.yml`). 
Toda vez que uma nova alteração é enviada para as branches `main` ou `master` via pull request ou push:
1.  O GitHub inicia um ambiente Linux (Ubuntu) limpo.
2.  Inicia um container do PostgreSQL 16 para rodar os testes.
3.  Instala as dependências de Node.js de forma limpa.
4.  Roda as migrations e compila o cliente do Prisma.
5.  Executa a suíte de testes automatizados, validando a integridade das regras de negócio do DocPipeline antes do merge.

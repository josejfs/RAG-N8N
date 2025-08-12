Mestre José, segue o README focado **só** neste projeto RAG, já deixando claro que ele foi criado e deve rodar em modo desenvolvimento usando o **N8N-DevHub**. Copie e cole direto no seu `README.md`:

---

# RAG – Upload & Q\&A com Base Vetorial (n8n) 📚⚙️

Projeto RAG (Retrieval-Augmented Generation) para **upload de PDFs/CSVs** e **perguntas e respostas** sobre o conteúdo enviado, construído em **n8n** com LangChain Nodes, **Groq** (LLM) e **Ollama** (embeddings).

> **Observação:** Este projeto foi criado e é recomendado rodar em **modo desenvolvimento** dentro do ambiente **\[N8N-DevHub]** — o ambiente de desenvolvimento n8n que automatiza venv, dependências, Docker e sincronização.

---

## ✨ O que este projeto faz

* Recebe arquivos via **Form Trigger** (`.pdf` e `.csv`).
* Carrega e processa documentos (binary → documento).
* Gera **embeddings com Ollama** (`mxbai-embed-large`).
* Indexa em um **VectorStore in-memory** (para testes rápidos).
* Expõe um **Webhook POST** que:

  * Aciona um **Agente (LangChain Agent)** com a ferramenta `knowledge_base` (RAG).
  * Responde com **texto** no próprio webhook.

---

## 🧩 Arquitetura (nós principais)

* **Form Trigger** – `Upload your file here`
  *Aceita upload `.pdf, .csv`.*
* **Default Data Loader** – `documentDefaultDataLoader`
  *Converte binário em documento para indexação.*
* **Embeddings Ollama** – `mxbai-embed-large:latest`
  *Modelo local de embeddings via Ollama.*
* **VectorStore In-Memory**

  * `Insert Data to Store` (modo `insert`, `memoryKey: vector_store_key`)
  * `Query Data Tool` (modo `retrieve-as-tool`, `topK: 10`, toolName: `knowledge_base`)
* **Groq Chat Model** – `openai/gpt-oss-20b`
  *LLM hospedado na Groq para geração de respostas.*
* **AI Agent** – `LangChain Agent`
  *Prompt com instruções estritas: consultar **sempre** a knowledge\_base e responder **apenas** o perguntado.*
* **Webhook (POST)** – path: `6dc67ac6-5287-451b-a0a9-a2a44b6368c4`
  *Entrada de mensagens; a resposta sai em texto.*
* **Respond to Webhook** – retorna `{{$json.output}}`
* **Simple Memory** – `Buffer Window (contextWindowLength: 4)`
  *Memória curta por sessão, chaveando por `body.message`.*

---

## 🧱 Pré-requisitos

* **Docker** e **Docker Compose**
* **Python 3.8+**
* **Git**
* **N8N-DevHub** (ambiente de desenvolvimento n8n)

> Para funcionar tudo de maneira correta em **modo desenvolvimento**, **use o N8N-DevHub**.
> Na raiz vazia do projeto, você pode baixá-lo diretamente:

```bash
git clone https://github.com/josejfs/N8N-DevHub.git .
chmod +x *.sh
./n8n-dev.sh start
```

Isso cria venv, instala dependências, levanta Docker e deixa o n8n pronto.
Este projeto RAG foi **criado usando o N8N-DevHub**.

---

## 🚀 Como rodar este RAG no N8N-DevHub

1. **Suba o ambiente** (se ainda não estiver rodando):

```bash
./n8n-dev.sh start
```

2. **Importe o workflow** RAG no n8n:

   * Abra `http://localhost:5678`
   * **Import** → cole o JSON do workflow (este projeto)

3. **Configure credenciais**:

   * **Groq API** (`Groq account`) – necessário para o node **Groq Chat Model**

     * Adicione sua **GROQ\_API\_KEY** nas credenciais do n8n.
   * **Ollama** – necessário para **Embeddings Ollama**

     * Tenha o **Ollama** rodando local e o modelo `mxbai-embed-large` disponível:

       ```bash
       ollama pull mxbai-embed-large
       ```
     * Ajuste a credencial **Ollama API** no n8n (URL padrão local, se aplicável).

4. **Habilite o webhook** (se usar modo teste sem “listen” global):

   * Coloque o workflow em **Active** ou use **Test Webhook**.

---

## 🧪 Teste rápido

### 1) Subir documento via Form Trigger

* Acesse o node **Form Trigger** “Upload your file here”.
* Faça upload de **PDF/CSV**.

### 2) Perguntar via Webhook (POST)

* Endpoint (local):

  ```
  POST http://localhost:5678/webhook-test/6dc67ac6-5287-451b-a0a9-a2a44b6368c4
  ```
* Exemplo `curl`:

  ```bash
  curl -X POST \
    http://localhost:5678/webhook-test/6dc67ac6-5287-451b-a0a9-a2a44b6368c4 \
    -H "Content-Type: application/json" \
    -d '{"body":{"message":"qual é o assunto do PDF?"}}'
  ```
* A resposta textual vem do **Respond to Webhook** com `{{$json.output}}`.

> Dica: o **AI Agent** usa o tool `knowledge_base` (VectorStore) para recuperar trechos relevantes e **responde apenas** o que foi perguntado, conforme o prompt.

---

## ⚙️ Variáveis/credenciais esperadas

* **GROQ\_API\_KEY** (credencial do Groq no n8n)
* **Ollama** ativo localmente e modelo `mxbai-embed-large` instalado

Se estiver rodando tudo dentro do **N8N-DevHub**, o `docker-compose` e os scripts já cuidam do ambiente do n8n; você só precisa configurar as credenciais no painel do n8n.

---

## 📁 Estrutura sugerida

```
.
├── workflows/                # JSONs de workflows (sincronizados)
├── n8n_data/                 # Dados do n8n (não versionar)
├── n8n-dev.sh                # Scripts do N8N-DevHub
├── requirements.txt
└── README.md                 # Este arquivo
```

> **Git:** adicione `n8n_data/` ao `.gitignore` para evitar subir dados/sessões:

```
n8n_data/
```

---

## 🔍 Solução de problemas

* **Webhook não responde**

  * Confirme se o workflow está **Active** ou em **Test Webhook**.
  * Verifique os **logs**:

    ```bash
    ./n8n-dev.sh logs
    ./n8n-dev.sh logs n8n
    ```
* **Embeddings falhando**

  * Cheque se o **Ollama** está rodando e o modelo `mxbai-embed-large` está disponível:

    ```bash
    ollama list
    ollama pull mxbai-embed-large
    ```
* **LLM (Groq) sem resposta**

  * Confirme a **GROQ\_API\_KEY** nas credenciais.
* **Conflitos de permissão (Linux)**

  ```bash
  sudo chown -R $USER:$USER n8n_data workflows
  chmod -R 755 n8n_data workflows
  ```

---

## 🗒️ Observações de desenvolvimento

* O **VectorStore** é **in-memory** (excelente para desenvolvimento/teste).
  Para produção, considere um store persistente (ex.: Qdrant, Chroma com volume, etc.).
* O **prompt do Agente** força respostas **enxutas e factuais**, usando sempre a `knowledge_base` primeiro.
* A **memória** do chat é curta (`contextWindowLength: 4`) e identifica a sessão por `body.message` (ajuste se desejar uma chave de sessão mais estável).

---

## 📜 Licença

Uso livre para desenvolvimento e estudos. Ajuste conforme sua necessidade.

---

## 🔗 Ambiente de desenvolvimento recomendado

Este projeto foi criado usando o **N8N-DevHub**. Para garantir que tudo rode corretamente em **modo desenvolvimento** (venv, Docker, sincronização, etc.), use:

```bash
git clone https://github.com/josejfs/N8N-DevHub.git .
chmod +x *.sh
./n8n-dev.sh start
```

Pronto! Suba o workflow, configure Groq e Ollama, faça upload de um PDF/CSV e já pode perguntar 😉
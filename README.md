# Ykire Estoque 2.0 — React + Vite + PHP + MySQL

Migração inicial do sistema Ykire Estoque exportado do Base44, mantendo os 12 módulos React existentes e acrescentando a gestão por unidade. **Versão inicial de desenvolvimento — ainda necessita validação integrada com um servidor MySQL e testes funcionais antes de produção.**

## Novidades implementadas no código

- **Sede administrativa** com **um almoxarifado físico** próprio. A instalação inicial cria os dois.
- **Obras** com **um e apenas um almoxarifado** cada, criado junto com a obra. O banco bloqueia almoxarifados duplicados por unidade.
- **Centros de custo**: quantos forem necessários para cada obra, identificados por código e nome; também podem existir na sede.
- **Produtos**: código interno global, gerado pelo MySQL `AUTO_INCREMENT` (1, 2, 3...), sem preenchimento manual; não é reiniciado por obra, nem reutilizado. Podem ocorrer lacunas na sequência.
- **Estoque**: saldo separado por combinação produto + almoxarifado; tela permite selecionar a unidade, com visão consolidada para Master.
- **Entradas, saídas e ajustes**: a API valida os valores e registra saldo e movimentação na mesma transação MySQL. Saídas bloqueiam saldo negativo.
- **Transferências**: saída na origem e entrada no destino na mesma transação, com número de referência comum e trilha de auditoria.
- **Inventário**: gerencia contagens por almoxarifado e aprovação com atualização atômica; inventários desatualizados são rejeitados para evitar sobrescrita de saldos alterados.
- **Auditoria**: registro de alterações de usuários, unidades, produtos, centros de custo, categorias, fornecedores, inventários e movimentações.
- **Login seguro**: autenticação no PHP, senhas com `password_hash`/`password_verify`, sessão com cookie HttpOnly, proteção CSRF, tentativas inválidas limitadas por 15 minutos, perfis Master/Admin/Comum e escopo das obras validado no servidor.
- **Removidos** os campos e a pesquisa por código de barras; não há recursos de QR Code.
- **Destino da saída**: centro de custo associado à unidade selecionada ou nome da empresa atendida.

## Requisitos

- Node.js 22 LTS para compilar o frontend **no seu computador**.
- HostGator com PHP 8.1+ e extensão `pdo_mysql`, MySQL 8+ (ou MariaDB compatível), HTTPS e acesso ao phpMyAdmin.
- Servidor Apache permitindo `mod_rewrite`; domínio ou **subdomínio dedicado** (ex.: `estoque.seudominio.com.br`).
- As dependências npm devem estar acessíveis na máquina onde o React será compilado. A hospedagem compartilhada não precisa executar Node.js.

## Como testar no PC

No terminal na pasta do projeto:

```bat
npm install
npm run dev
```

Em **outro terminal**, rode um servidor PHP apontado para a pasta do projeto:

```bat
php -S 127.0.0.1:8000
```

O Vite encaminha `/Ykire/api` para o PHP na porta 8000. Para testar movimentações, é necessário configurar um MySQL de desenvolvimento e importar `api/schema.sql` primeiro. Sem isso, o login não terá dados.

## Instalação no HostGator

1. Crie um banco **MySQL** e seu usuário pelo cPanel, concedendo as permissões necessárias sobre esse banco.
2. Abra o **phpMyAdmin**, selecione o banco e **importe** `api/schema.sql`.
3. Copie `api/config.example.php` para `api/config.php` e altere `dsn`, `username`, `password` e `setup_key` (chave aleatória com no mínimo 32 caracteres). **Não coloque credenciais do MySQL nos arquivos React**.
4. No seu computador, execute `npm install` e `npm run build` (precisa de internet para o primeiro comando).
5. No **diretório raiz do subdomínio** (`document root`), envie **o conteúdo de `dist/`**, o arquivo `.htaccess` da raiz do projeto e a pasta inteira `api/` com `config.php`. Não envie a pasta `src` nem as dependências npm para a hospedagem.
6. Acesse `https://estoque.seudominio.com.br/instalar`, informe a chave de instalação, o nome da sede, o usuário Master e **uma senha nova forte (12+ caracteres)**. A página cria a sede e o almoxarifado, além do usuário Master. A inicialização só funciona quando não existem usuários.
7. Depois da instalação, **remova/zerar** `setup_key` no `api/config.php` ou bloqueie o endpoint `/api/index.php?route=setup` na configuração do servidor. Não reutilize a senha do sistema antigo.
8. Faça login, abra **Sede, Obras e Centros de Custo**, crie as obras e centros, depois abra **Usuários** para atribuir as unidades permitidas a cada perfil não-Master.
9. Teste com dados fictícios: um produto, entrada na sede, transferência a uma obra, saída com centro de custo, ajuste e inventário. Configure backup diário automático do MySQL e backup separado fora da hospedagem.

**Importante:** este fonte está configurado para `https://prosegconsultoria.com/Ykire/` (base do Vite `/Ykire/`). Se mudar o caminho, ajuste `vite.config.js` e compile novamente.

## Arquivos relevantes

| Caminho | Finalidade |
|---|---|
| `src/` | Interface React original, adaptada e estendida |
| `src/Pages/Unidades.jsx` | Gestão da sede, obras e centros |
| `src/Pages/Transferencias.jsx` | Transferir saldos entre almoxarifados |
| `src/Pages/Auditoria.jsx` | Histórico de ações |
| `src/components/UnidadeSelector.jsx` | Seletor de estoque ativo |
| `src/api/http.js` | Cliente da API com credenciais de sessão e CSRF |
| `src/api/base44Client.js` | Adaptador de compatibilidade com as telas originais (não faz chamadas ao Base44) |
| `api/index.php` | API própria com autorização e regras de estoque |
| `api/schema.sql` | Estrutura do banco MySQL |
| `api/config.example.php` | Modelo de conexão PHP — criar arquivo `config.php` |
| `.htaccess` | Redirecionamento SPA do React no Apache |

## Itens ainda necessários para considerar produção

- **Executar a instalação em MySQL real** e rodar testes de ponta a ponta no React, inclusive operações simultâneas em unidades diferentes. A API foi verificada sintaticamente, mas não executada contra banco real neste ambiente.
- **Revisar e homologar todos os 12 módulos** herdados do Base44 com os dados reais, especialmente relatórios e inventário. Nem todas as funcionalidades são cobertas por testes automatizados.
- Importar os **dados anteriores do Base44** (o código exportado não inclui automaticamente os registros de produção).
- Realizar testes de segurança, backups e recuperação, permissões por usuário, HTTPS e atualização das dependências.
- As listagens existentes ainda usam limites finitos e algumas páginas tratam erros de rede apenas parcialmente; para grande volume de dados, adicionar paginação no servidor.
- O Dashboard já possui KPIs e gráfico financeiro por dia, com filtros de período e almoxarifado. Análises comparativas por centro de custo e relatórios gerenciais consolidados precisam de evolução e homologação.

## Segurança

- Não coloque `api/config.php` em um repositório público.
- Não envie dados sensíveis pela URL; o `setup_key` é enviado no corpo da requisição.
- Faça backup do banco antes de importar ou atualizar estruturas.
- Caso a HostGator não aceite o arquivo `.htaccess` ou não suporte PDO MySQL, será necessário ajustar as configurações com o suporte da hospedagem.

## Atualização: Funcionários, Ferramentas e EPI

Veja `ATUALIZACAO_FUNCIONARIOS_EPI_FERRAMENTAS.md` para instruções de migração da base publicada.
Essa atualização inclui `api/migrations/002_funcionarios_epi_ferramentas.sql` e os módulos React `src/Pages/Funcionarios.jsx`, `src/Pages/Ferramentas.jsx` e `src/Pages/EPI.jsx`.
A `migration 002` não deve ser executada duas vezes, nem substitui a migração do CMP.

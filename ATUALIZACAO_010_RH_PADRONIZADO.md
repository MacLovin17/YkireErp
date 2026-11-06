# YKIRE ERP — Atualização 010: RH padronizado

Esta atualização parte da **versão 009 — Empresas Ministrantes** do ERP e preserva os módulos de Estoque, SSMA e ADM. Não recrie o banco.

## O que foi adicionado

- RH → **Funções**: cadastro único, ID sequencial como código, nome e situação.
- RH → **Departamentos**: cadastro único, ID sequencial como código, nome e situação.
- RH → **Empresas (CNPJs)**: cadastro das empresas empregadoras (razão social, fantasia, CNPJ, situação). **É diferente do cadastro de empresas ministrantes de cursos do SSMA**.
- RH → **Funcionários**: escolha da função, departamento e empresa por código/nome, sem campo de texto livre; nascimento, PIS, admissão, CTPS número, CTPS série, naturalidade, categoria do vínculo e CBO.
- Os dados anteriores (CPF, RG, endereço, CNH, uniformes, botas, dependentes, função, departamento, unidade, centro de custo) foram mantidos.
- As consultas por matrícula no Estoque/SSMA continuam trazendo apenas os campos básicos necessários; informações pessoais/trabalhistas são retornadas apenas no detalhe protegido do RH.

## Instalação em produção

1. **Faça backup verificado** do banco MySQL e de `public_html/Ykire/api/index.php`. Guarde uma cópia do React anterior.
2. Suspenda cadastros e movimentações durante a atualização. **Confirme que as migrações 001 a 006 foram aplicadas** antes de executar a 007 (006 é a atualização das empresas ministrantes do SSMA).
3. No phpMyAdmin, selecione somente o banco do YKIRE e importe `api/migrations/007_rh_catalogos_vinculos.sql` **uma única vez**. **NÃO importe `schema.sql` de novo.**
4. Confira a criação de `hr_job_roles`, `hr_departments` e `hr_companies` e as novas colunas de `employees`.
5. No cPanel, em `public_html/Ykire/api/`, substitua **somente** `index.php` por `api/index.php` deste pacote. **Não substitua `config.php` nem `.htaccess`.**
6. No VS Code, copie os novos arquivos para as pastas correspondentes em `src/` (veja relação abaixo) ou utilize a versão completa 010.
7. Dentro do projeto React execute `npm install` (se faltar dependência) e `npm run build`. Resolva qualquer erro de build antes de publicar.
8. Envie apenas `dist/index.html` e os arquivos novos de `dist/assets/` para `public_html/Ykire/`. Mantenha `api/` e `.htaccess` existentes.
9. Atualize o navegador com `Ctrl + F5`, acesse o módulo RH e valide as operações com registros de teste.

## Arquivos React modificados

- `src/App.jsx`
- `src/components/Layout.jsx`
- `src/Pages/Funcionarios.jsx`
- `src/Pages/RhCatalog.jsx` (novo, compartilhado)
- `src/Pages/FuncoesRH.jsx` (novo)
- `src/Pages/DepartamentosRH.jsx` (novo)
- `src/Pages/EmpresasRH.jsx` (novo)

## Importante sobre dados antigos

- A migração **importa automaticamente nomes distintos** de funções e departamentos dos funcionários atuais e os vincula aos novos catálogos. Abreviações diferentes (ex.: `Aux. ADM` e `Auxiliar Administrativo`) **não são unificadas automaticamente** porque não sabemos se sempre significam exatamente o mesmo cargo. O RH deve revisar esses itens, escolher a nomenclatura oficial e realocar os colaboradores antes de inativar variantes antigas.
- Nenhuma empresa empregadora é deduzida dos funcionários antigos. O RH deve cadastrar os **três CNPJs verdadeiros** e associar cada colaborador à empresa correta. Nenhum funcionário será removido; na listagem, os ainda sem empresa aparecem como "Pendente".
- Para **cadastrar ou editar** um funcionário na versão nova é obrigatório selecionar uma função, um departamento e uma empresa ativos.
- **Empresa empregadora** e **unidade/obra** são dimensões diferentes. Uma empresa pode ter colaboradores distribuídos em várias obras.
- Códigos internos dos catálogos são os IDs automáticos (1, 2, 3...) e não mudam com uma alteração de nome; registros são inativados, não excluídos.
- O campo **"Categoria do vínculo (RH)"** é informativo e distinto da **categoria da CNH**. Se sua empresa usa um código específico de categoria (por exemplo de folha/eSocial), podemos normalizá-lo em uma futura atualização; por enquanto é livre, opcional e restrito ao RH.

## Teste após instalação

1. Cadastre uma função `Auxiliar Administrativo` e um departamento `Administrativo` (ou selecione os já importados).
2. Cadastre uma empresa usando um CNPJ legítimo. O servidor verifica os dígitos verificadores.
3. Abra RH → Funcionários e crie um registro de teste; pesquise pelos códigos ou nomes dos catálogos e selecione cada registro.
4. Cadastre os campos de nascimento, PIS (11 dígitos), admissão, CTPS/série, naturalidade, categoria e CBO (6 dígitos). Reabra a edição e confirme a persistência.
5. Verifique que uma empresa inativada não pode ser usada em um novo vínculo.
6. Confirme que a tela Saída do Estoque ainda encontra o funcionário pela matrícula e preenche função/setor normalmente; teste somente com item de teste.
7. Confirme que EPIs e certificados previamente emitidos continuam disponíveis.

## Segurança e limitações

- PIS, RG, CTPS, CPF e dados de dependentes são dados pessoais. Restrinja o acesso a administradores autorizados do RH e proteja backups conforme a LGPD.
- Migração e sintaxe verificadas estaticamente; **não houve execução em MySQL da HostGator nem build final do Vite** neste ambiente. Faça primeiro backup e teste controlado.

# YKIRE ERP — Atualização modular sobre o sistema existente

## O que mudou

- Após o login, o usuário com acesso a vários módulos vê a **Central de Módulos**; se tiver acesso a um único módulo, abre diretamente esse módulo.
- **RH:** cadastro único de funcionários por matrícula e ficha individual.
- **ESTOQUE:** dashboard, produtos, entradas, saídas, custo médio ponderado, ferramentas, inventário, transferências, fornecedores, categorias, ajustes e relatórios.
- **SSMA:** controle e entrega de EPI pela matrícula, diretamente no módulo. A entrega usa as transações do Estoque e a mesma ficha de EPI, sem segunda baixa.
- **ADM:** gestão de usuários e módulos (somente Master), sede e obras (Master), auditoria (Master/Administrador).
- Usuários têm módulos configuráveis (`rh`, `estoque`, `ssma`, `adm`) **e** permissões por unidade e perfil. O servidor valida cada módulo, não apenas o menu.
- A barra lateral mantém o usuário e o botão **Sair** fixos no rodapé.
- Layout principal renovado para a marca **YKIRE ERP**.

## O que não mudou

Não foram recriados os dados existentes. O estoque por obra, CMP, saldos, ferramentas, EPIs, histórico, usuários e fichas do RH permanecem nas mesmas tabelas.

## Ordem de instalação na HostGator

**Antes de começar:** faça backup SQL do banco `prosegco_dev` e cópia dos arquivos do site e do `api/index.php`. Se o site está em uso, agende uma janela breve de manutenção. A API e o React devem ser publicados na mesma atualização.

1. No phpMyAdmin, selecione o banco atual e importe **somente** `api/migrations/003_erp_modulos.sql` (uma única vez). **Não** importe de novo `schema.sql` ou as migrações 001/002.
2. No cPanel, copie o `public_html/Ykire/api/index.php` atual como backup e **substitua somente** por `api/index.php` deste pacote. **Não substitua `api/config.php` ou `api/.htaccess`**. De preferência, restrinja o site durante a atualização.
3. No seu computador, faça cópia da pasta do projeto React atual. Substitua os arquivos fornecidos no patch em suas respectivas pastas (ou extraia o ZIP do código-fonte completo como novo projeto). Se usar projeto original, aplique todos os arquivos do patch; não misture um React antigo com a API nova.
4. No terminal CMD do VS Code na raiz do projeto: `npm install` (se necessário) e `npm run build`.
5. Confira `dist/index.html`: os caminhos devem iniciar com `/Ykire/assets/`.
6. No cPanel, dentro de `public_html/Ykire/`, atualize `index.html` e os arquivos da pasta `assets/` usando o conteúdo da nova `dist/`. Preserve `api/`, `.htaccess` e `config.php`.
7. Acesse `https://prosegconsultoria.com/Ykire/` e use Ctrl+F5. O Master já existente continua válido, **não execute novamente a instalação inicial**.

## Preservação dos acessos atuais

A migração insere permissões iniciais para usuários **existentes**: Master possui todos os módulos automaticamente; Administradores têm RH, ESTOQUE, SSMA e ADM; usuários Comuns têm ESTOQUE. Depois o Master poderá ajustar cada pessoa em **ADM → Usuários e Permissões**.

Por segurança, o perfil **Comum** não pode obter o módulo ADM. O perfil Admin pode visualizar Auditoria se o módulo ADM estiver liberado; o gerenciamento de contas e de sede/obras continua exclusivo do Master, seguindo as regras antigas.

## Testes recomendados, com dados de teste

1. Login do Master → página de módulos → entrar e retornar de cada módulo.
2. ADM → Usuários: editar um usuário de teste, liberar somente RH, entrar com ele em navegador privado e conferir acesso. Tente abrir diretamente `/Ykire/estoque/` e confirme o bloqueio.
3. RH → Funcionários e ficha individual por matrícula.
4. Estoque → Dashboard → produtos e valor de custo médio; conferir que nenhuma quantidade foi alterada pela atualização.
5. SSMA → EPI → Entregar EPI: selecione a unidade correta, funcionário de teste, produto de teste e registre entrega. Confira a ficha e **uma** saída no estoque. Depois compare o CMP e o saldo.
6. Ferramentas → conferência de entregas e devoluções anteriores.
7. ADM → alterar o módulo do usuário; verificar o acesso novamente, inclusive tentativas pela API.

## Segurança e limites conhecidos

- O arquivo `config.php` nunca deve estar nos arquivos React ou em repositório público.
- A autorização por módulos é feita na API, mas os testes integrados de permissão com usuários reais ainda são necessários antes do uso em produção.
- A consulta de produto na entrega de EPI mostra produtos disponíveis no almoxarifado. **Ainda não existe uma classificação obrigatória de produto como EPI**; escolha somente os itens adequados até implementarmos esse atributo.
- Uma ficha de EPI sem assinatura não substitui documentos formais de recebimento.
- Esta entrega passou por validação estática de JS/JSX e PHP. Não foi possível executar `npm run build` neste ambiente porque o npm não concluiu a instalação de dependências. Execute o build no VS Code antes de enviar à HostGator.
- Se surgir erro 500 ao abrir o sistema depois de publicar a API, confira **primeiro** se `003_erp_modulos.sql` foi importado no mesmo banco usado pela API.

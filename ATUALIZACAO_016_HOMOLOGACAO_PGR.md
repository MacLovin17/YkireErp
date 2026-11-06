# YKIRE ERP — Atualização 016: Homologação do PGR

A atualização 016 integra uma tela de APRESENTAÇÃO E HOMOLOGAÇÃO da amostra 015 do PGR Fagundes. NÃO integra a amostra ao gerador de documentos existente, NÃO produz PGR oficial e NÃO altera conteúdo técnico.

## Instalação — seguir nesta ordem

1. Faça backup da pasta `public_html/Ykire` e especialmente de `public_html/Ykire/api/index.php`.
2. Faça também backup do MySQL por precaução, embora não haja migração SQL.
3. Na raiz da conta HostGator (geralmente `/home1/prosegco` no cPanel), crie a pasta **`ykire_pgr_homologacao_015`**, FORA de `public_html`.
4. Envie os QUATRO arquivos da pasta `ARQUIVOS_PRIVADOS_PGR_015/` para essa pasta privada. Utilize o Gerenciador de Arquivos do cPanel. Não envie essa pasta para `public_html`, `Ykire`, `api` nem `dist`.
   - PGR_FAGUNDES_AMOSTRA_FIEL_EDITAVEL_015.pdf
   - PGR_FAGUNDES_AMOSTRA_FIEL_EDITAVEL_015.docx
   - PGR_FAGUNDES_COMPARATIVO_VISUAL_015.pdf
   - PGR_FAGUNDES_ORIGINAL_119_PAGINAS.pdf
5. Substitua somente `public_html/Ykire/api/index.php` pelo arquivo `api/index.php` deste pacote. Preserve `api/config.php` e `api/.htaccess`.
6. No seu projeto React da versão 014, substitua `src/App.jsx` e `src/components/Layout.jsx`, e adicione `src/Pages/PgrHomologacao.jsx`.
7. No terminal do VS Code, execute `npm run build`.
8. Publique o CONTEÚDO de `dist/` em `public_html/Ykire/`: substitua `index.html` e atualize `assets/`, PRESERVANDO `api/`, `.htaccess` e os demais diretórios existentes.
9. Acesse `https://prosegconsultoria.com/Ykire/ssma/pgr/homologacao` com usuário com acesso SSMA. No menu lateral, clique em **Homologação do PGR**.

## Como testar

- A prévia de quatro páginas aparece em PDF.
- A aba de comparativo mostra as diferenças visuais.
- A aba de referência mostra o PDF original de 119 páginas.
- Os botões baixam o PDF selecionado e o Word editável da amostra.
- Digite comentários e baixe um arquivo TXT. Eles NÃO são armazenados no sistema.
- Tente acessar a rota de arquivos sem login: a API deve negar com HTTP 401.
- Tente entrar com usuário sem permissão SSMA: deve retornar HTTP 403.

## Segurança e limites

- Os arquivos originais NÃO ficam na pasta pública; a API verifica sessão e módulo SSMA a cada requisição.
- Qualquer usuário ativo autorizado ao SSMA pode visualizar estes arquivos (inclusive TST com esse módulo liberado). Caso deseje acesso exclusivo a revisores, será necessária uma permissão adicional no ADM.
- Downloads e prévias são registrados na auditoria (`PGRHomologacao015`).
- A consulta depende de `api/index.php` e do banco MySQL existentes.
- Nenhum documento é aprovado automaticamente.
- Não há alteração do MySQL ou de `config.php`.

## Solução de problemas

- **Arquivo não instalado**: confira se o nome da pasta privada é exatamente `ykire_pgr_homologacao_015` e se os quatro nomes de arquivo batem, inclusive extensão.
- **404/403 no front-end**: confirme o `index.html` compilado com `base:'/Ykire/'` e o `.htaccess` SPA já existente.
- **PDF não renderiza no navegador**: use o botão de download; alguns navegadores têm leitores PDF bloqueados.
- **Erro 401**: entre novamente no sistema; sessão expirou.

ESTADO: protótipo de homologação, não PGR válido.

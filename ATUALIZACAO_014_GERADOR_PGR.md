# YKIRE ERP — Atualização 014: Gerador de PGR (Modelo Proseg)

**Projeto:** YKIRE ERP, React/Vite, API PHP e MySQL (HostGator).  
**Pré-requisito:** Versão 013 publicada, migrações anteriores aplicadas, módulo SSMA funcionando.  
**Objetivo:** criar **SSMA → Gerador de PGR**, com Word editável e PDF baseados na identidade visual e estrutura do PGR Fagundes 2025–2026 fornecido.

## O que inclui

- Capa verde com logotipo Proseg e identificação de contratante, contratada e subcontratada.
- Cadastro por empresa/CNPJ do RH e por obra/estabelecimento autorizados.
- Descrição de funções (cadastro de funções do RH), GHE/GES, inventário de riscos, plano de ação e cronograma.
- Campos de metodologia, avaliação, medidas preventivas, emergência, manutenção, referências e conclusão.
- Salvar rascunho, encaminhar para revisão, registrar revisão técnica administrativa, histórico de revisões e duplicar para um novo documento.
- Exportar Word `.docx` editável e PDF, no próprio navegador (não exige Word ou LibreOffice na HostGator).
- Autorização **Master/Administrador com módulo SSMA** e verificação de acesso à obra na API.

**Nota de fidelidade:** a estrutura e a identidade visual são inspiradas no PGR original de 119 páginas. **Não** é uma conversão integral/pixel a pixel das 119 páginas. Os textos específicos de risco, os laudos de medições, fichas, anexos, conclusões e avaliações são preenchidos pelo usuário autorizado. Os campos não preenchidos recebem marcador de pendência na minuta. A quantidade final de páginas varia conforme o conteúdo inserido.

**Nota técnica:** não substitui elaboração, levantamentos, revisão técnica, aprovação, assinatura ou registro profissional exigido. Mesmo com status de 'revisado' no ERP, as exportações mantêm o aviso de minuta até ocorrer validação formal externa. Não preencha dados de exposição ou níveis de risco sem evidências.

## Instalação segura na HostGator

1. Faça **backup do MySQL e dos arquivos atuais**. Interrompa alterações simultâneas durante o procedimento.
2. No phpMyAdmin, selecione o banco YKIRE e importe `api/migrations/009_ssma_gerador_pgr.sql` **uma única vez**. São criadas `pgr_documents` e `pgr_document_versions`; nenhuma tabela anterior é apagada.
3. No cPanel, salve cópia do arquivo atual `public_html/Ykire/api/index.php`, depois **substitua somente `api/index.php`** pelo do ZIP de atualização.
4. No VS Code, copie do ZIP os arquivos:
   - `src/App.jsx`
   - `src/components/Layout.jsx`
   - `src/Pages/GeradorPGR.jsx` (novo)
   - `src/lib/pgrDocument.js` (novo)
   - `public/pgr-assets/proseg-logo.jpg` (novo)
5. Rode `npm run build` no projeto React. Corrija eventuais erros antes de publicar.
6. Envie o **conteúdo** de `dist` para `public_html/Ykire/`, incluindo `index.html`, `assets/` e **`pgr-assets/`**. Preserve a pasta `api/` e os dois arquivos `.htaccess` existentes.
7. Abra o YKIRE, módulo SSMA, opção **Gerador de PGR**. Selecione empresa e obra e crie um rascunho.
8. Teste: salvar, reabrir, exportar Word, abrir no Microsoft Word, exportar PDF, verificar capa/tabelas e revisar junto ao SSMA.

## Arquivos que NÃO devem ser substituídos
- `api/config.php`, `.htaccess` da raiz e de `/api`.
- `api/schema.sql` não deve ser reimportado.
- Nunca encaminhe senhas ou `config.php` preenchido.

## Observações de implantação
- O gerador **não** incorpora automaticamente as 119 páginas técnicas do PGR antigo; elas são referência da estrutura. Inclua os levantamentos e anexos revisados pelo profissional competente.
- Os registros armazenam o JSON do documento no MySQL. A lista de versões registra os snapshots a cada salvamento.
- O histórico de revisão não substitui assinatura digital profissional.
- A exportação PDF usa a dependência `jspdf`, já presente no projeto atual; a criação de DOCX utiliza OOXML nativo e ZIP local, sem nova dependência.
- Há um arquivo de prévia marcado como exemplo, que não deve ser utilizado como PGR real.

## Testes executados na preparação
- `php -l` em `api/index.php`: passou.
- Compilação sintática via TypeScript de `GeradorPGR.jsx`, `App.jsx` e `Layout.jsx`: sem erros de sintaxe.
- `node --check` em `pgrDocument.js`: passou.
- Geração de DOCX `.docx` ZIP padrão: `unzip -t` passou; LibreOffice abriu e converteu em PDF para conferir a renderização.
- PDF exportado **pelo navegador com jsPDF** e build Vite completo ainda precisam de teste no seu VS Code e na HostGator.

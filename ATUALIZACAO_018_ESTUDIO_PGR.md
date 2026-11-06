# YKIRE ERP — Atualização 018: Estúdio de PGR inspirado em vídeo de sistema SST

## Objetivo

Entregar dentro de **SSMA > Estúdio de PGR** um fluxo real de cadastro, edição, revisão e exportação de uma minuta de Programa de Gerenciamento de Riscos, baseado nos recursos mostrados no vídeo de referência enviado em 19/10/2026. Mantém também **SSMA > Homologação do PGR** da v016.

## Requisitos

- Projeto React + Vite na base modular v016 (ou substitua o projeto por `YKIRE_ERP_FONTE_COMPLETA_ESTUDIO_PGR_018.zip`).
- API PHP v016 e MySQL existente na HostGator.
- Migração `api/migrations/009_ssma_gerador_pgr.sql` aplicada **uma única vez**, caso ainda não tenha aplicado na v014. **Não execute de novo** se as tabelas `pgr_documents` e `pgr_document_versions` já existirem.
- Uma empresa ativa em RH > Empresas e uma unidade/obra ativa em ADM.

## Funcionalidades

- Identificação da empresa, obra, contratante, contratada, contrato, vigência e responsável técnico.
- Ambientes e setores.
- GHE e funções do RH com CBO, efetivo e atividade.
- Inventário com classificação por tipo de agente, descrição, fonte, possíveis danos, exposição, probabilidade/severidade e avaliação redigida pelo responsável.
- Medidas administrativas, EPC e EPI vinculados ao GHE.
- Avaliações ambientais (ruído, iluminação, calor e outras), método, instrumento, data e registros (SEM inventar resultados).
- Equipamentos utilizados, referência a anexos (sem upload binário nesta versão).
- Plano de ação, cronograma, emergências, divulgação.
- Conclusão, duplicação, histórico de revisões (por banco), exportação Word e PDF como minutas.

## Arquivos alterados

- `src/App.jsx` — nova rota passa a importar `PgrStudio.jsx`, **não** `GeradorPGR`. Isso resolve o problema anterior de componente inexistente, desde que a pasta Pages do pacote também seja instalada.
- `src/components/Layout.jsx` — menu Estúdio de PGR.
- `src/Pages/PgrStudio.jsx` — interface completa por etapas.
- `src/lib/pgrDocument.js` — amplia exportações Word/PDF com os novos cadastros; mantém a marca Proseg.

## Arquivos de pré-requisito incluídos na atualização

- `api/index.php` (da base v016).
- `api/migrations/009_ssma_gerador_pgr.sql` (APLICAR APENAS UMA VEZ).
- `src/Pages/PgrHomologacao.jsx` (da v016).
- `public/pgr-assets/proseg-logo.jpg` (exigido pelo Word/PDF).
- Pasta `ARQUIVOS_PRIVADOS_PGR_015` para Homologação — **DEVE FICAR FORA de `public_html`**, em `$HOME/ykire_pgr_homologacao_015`, se ainda não foi instalada.

## Instalação recomendada

1. Faça backup dos arquivos e do MySQL.
2. Utilize **preferencialmente a FONTE COMPLETA 018**. Não faça a atualização copiando apenas `App.jsx` sobre um YKIRE V2 antigo (o App possui referências a módulos construídos ao longo das versões 005 a 016).
3. Se usar a atualização incremental, trabalhe sobre a fonte **v016**, substitua os caminhos relativos indicados acima. Não use `App.jsx` sem instalar `PgrStudio.jsx`.
4. Em `api`, mantenha seu `config.php` real intacto. Substitua apenas `api/index.php`. Se ainda não existem as tabelas da migração 009, importe-a uma vez no phpMyAdmin. Nunca importe `schema.sql` num banco já em produção.
5. Execute no VS Code, na pasta do `package.json`, `npm install` (caso ainda não tenha node_modules), depois `npm run build`.
6. Envie **o conteúdo** de `dist` para `public_html/Ykire/`. O diretório `pgr-assets` deve estar publicado junto com o build (vem de `public`). Não elimine a pasta `api` e o arquivo `.htaccess` de produção.
7. Entre em `https://prosegconsultoria.com/Ykire/`, selecione SSMA > Estúdio de PGR; teste um PGR rascunho (empresa + obra + GHE + risco + ação), salve e exporte Word/PDF.

## LIMITAÇÕES IMPORTANTES

1. **Ainda NÃO reconstrói automaticamente as 119 páginas** do PGR Fagundes, que só foi fornecido em PDF. Esta é a primeira entrega funcional do *sistema de preenchimento*, não uma entrega do documento Fagundes idêntico ao original. A tela Homologação preserva acesso ao PGR original de referência para avaliação.
2. A conclusão, medições, probabilidades, severidades, avaliação de riscos e controles devem ser cadastrados e validados pelo profissional competente. A etiqueta 'revisão registrada' no sistema não equivale a assinatura/aprovação formal.
3. Não há upload de anexos em binário nesta fase. Registre apenas nome/referência e local de arquivamento.
4. O servidor armazena o conteúdo do PGR como JSON na tabela `pgr_documents`; não há nova migração para a v018. A API atual limita o conteúdo JSON a 300 KB por documento.
5. O Word editável e o PDF são gerados no navegador do usuário, sem serviços externos. O Word foi validado por geração, integridade ZIP/OOXML e abertura/renderização. **Não foi possível executar `npm run build` neste container**, pois não há dependências npm do projeto instaladas. Rode o build no seu VS Code antes de publicar.

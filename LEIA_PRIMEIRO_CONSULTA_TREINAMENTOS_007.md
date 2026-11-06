# YKIRE ERP — Atualização 007: Consulta de Treinamentos no SSMA

## O que muda

- A tela **SSMA > Certificados** deixa de exibir automaticamente um histórico das últimas 250 emissões.
- O usuário primeiro escolhe **Por treinamento** ou **Por funcionário** e clica em **Consultar**.
- **Por treinamento:** mostra quais funcionários concluíram aquele treinamento.
- **Por funcionário:** busca por nome/matrícula e mostra os treinamentos associados.
- Filtro opcional por obra/unidade, respeitando permissões atuais.
- O resultado usa uma linha por combinação funcionário/treinamento e mostra os dados da **última emissão válida** dessa combinação.
- **PDF individual** do certificado continua disponível em cada resultado, usando o gerador atual.
- **Exportar Excel (.xlsx)** e **Exportar PDF (relatório)** produzem apenas uma lista resumida (matrícula, funcionário, treinamento, data, local, carga horária e unidade). Os arquivos individuais NÃO são incluídos, nem o CPF.
- Limite de segurança: a consulta exige filtros e retorna no máximo 2.000 combinações. Para resultados maiores, refine a consulta.

## Instalação na HostGator — etapa a etapa

1. **Faça backup** do banco `prosegco_dev` e principalmente de `public_html/Ykire/api/index.php`.
2. Não é preciso importar SQL nem criar novas tabelas nesta versão.
3. No cPanel, substitua **somente** `public_html/Ykire/api/index.php` pelo `api/index.php` do pacote.
4. No projeto **fonte** do React no VS Code, substitua `src/Pages/Certificados.jsx` e adicione `src/lib/certificateReportExport.js` (preservando as pastas).
5. Rode `npm run build` no CMD dentro da raiz do projeto.
6. Envie o `dist/index.html` e os arquivos atualizados de `dist/assets/` para `public_html/Ykire/` no cPanel. **Não envie a pasta `dist` como subpasta.**
7. Não mexa no `config.php`, nos `.htaccess`, nos modelos em `certificate-templates/`, no banco nem no CPF do RH.
8. No navegador, abra `https://prosegconsultoria.com/Ykire/`, pressione Ctrl + F5 e entre em **SSMA > Certificados**.

## Testes sugeridos

1. Antes de filtrar, nenhuma lista automática de certificados deve aparecer.
2. Escolha **NR-12** e clique em **Consultar**. Os colaboradores que possuem essa capacitação devem aparecer.
3. Clique em **Por funcionário** e pesquise uma matrícula; veja os cursos desse colaborador.
4. Teste **Excel** e **PDF**: ambos devem mostrar apenas o resumo, sem imagem ou PDF de certificados, sem CPF.
5. Clique em **PDF individual** em uma linha e confirme que o certificado segue com o modelo Proseg.
6. Como usuário com permissão só em uma obra, confirme que não aparecem colaboradores de outras unidades.
7. Se houver duas emissões do mesmo curso ao mesmo colaborador, só uma linha aparece, com a emissão mais recente para o botão individual.

## Segurança / dados

A API valida permissão para o módulo SSMA e o acesso às unidades antes de consultar. Nenhum CPF é enviado pela rota de relatórios. O acesso ao PDF individual continua passando pela rota já existente `certificates/detail` e pela auditoria do sistema.

## Arquivos modificados

- `api/index.php` — nova rota `certificates/report`.
- `src/Pages/Certificados.jsx` — filtros, tabela e botões.
- `src/lib/certificateReportExport.js` — exportadores PDF e XLSX sem dependências novas.

**Validações realizadas:** sintaxe PHP; parsing JSX/JavaScript; ZIP XLSX gerado com dados fictícios (XML e integridade do pacote); estrutura de arquivos no pacote. Não executamos testes reais conectados ao MySQL da HostGator ou build completo do Vite neste ambiente.

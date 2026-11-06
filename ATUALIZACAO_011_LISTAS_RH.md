# YKIRE ERP — Atualização 011: seleção simplificada do RH

## O que muda
No formulário **RH > Funcionários > Dados funcionais**, Função, Departamento e Empresa passam a ter apenas uma lista suspensa, sem campo extra de busca.

A opção inicial de cada lista é, respectivamente:
- Função
- Departamento
- Empresa

As opções continuam exibindo **código — nome** e apenas cadastros ativos (ou o item já selecionado na edição). Continua obrigatório selecionar uma opção válida.

## Instalação
1. Faça backup do seu arquivo `src/Pages/Funcionarios.jsx` atual.
2. Substitua esse arquivo pelo `src/Pages/Funcionarios.jsx` incluído neste ZIP (preserve a estrutura de pastas).
3. No VS Code, no diretório principal do projeto, execute `npm run build`.
4. No cPanel, em `public_html/Ykire/`, substitua o `index.html` pelo gerado na nova `dist` e envie os arquivos novos da pasta `dist/assets/` para `assets/`.
5. Abra o site e use Ctrl+F5, depois confira RH > Funcionários > Cadastrar funcionário.

**Não** altere o `config.php`, `api/index.php`, o MySQL ou os arquivos `.htaccess`. Esta mudança é apenas visual no React.

## Testes sugeridos
- Abrir o cadastro e verificar os três placeholders nas listas.
- Selecionar uma função, departamento e empresa e salvar um funcionário de teste.
- Editar um funcionário existente e verificar se as três seleções anteriores permanecem selecionadas.

Verificação realizada: sintaxe JSX via TypeScript `transpileModule`, sem erros. Build completo não foi realizado neste ambiente.

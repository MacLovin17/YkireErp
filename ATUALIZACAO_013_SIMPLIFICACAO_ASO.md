# YKIRE ERP — Atualização 013: simplificação do controle de ASO

Esta correção foi feita em cima do **código completo da versão 012**.

## Alterações

- Retirado do dashboard o cartão vermelho **Até 7 dias**.
- O cartão amarelo foi alterado para **Até 15 dias** e inclui todos os casos entre 0 e 15 dias (inclusive hoje e até 7 dias). Atrasados continuam no cartão **Prazo ultrapassado**.
- Permanecem os cartões **16 a 30 dias** e **Sem próxima data**.
- O filtro e as exportações PDF/Excel exibem as mesmas classificações do novo painel.
- Retirados do formulário de novo acompanhamento e edição os campos **Data agendada** e **ASO recebido em**.
- Permanecem **Data do exame** e **Próxima avaliação (PCMSO)**.
- A API não exige mais data agendada quando a situação é `Agendado`, nem data de recebimento quando a situação é `ASO recebido`. Para marcar `ASO recebido`, continua obrigatório informar a **Data do exame**.
- **Informações já armazenadas** em `scheduled_for` e `received_on` são preservadas no banco durante a edição, mesmo que os campos não estejam no formulário. Na ficha histórica, uma data antiga de recebimento só é exibida quando houver valor.

## Instalação — ordem recomendada

1. Faça backup do `api/index.php`, do React e do banco de dados.
2. Publique `api/index.php` na hospedagem em `public_html/Ykire/api/index.php` (substitua somente esse arquivo). Não altere `config.php` ou `.htaccess`.
3. No seu projeto React local, substitua `src/Pages/AsoControle.jsx` e `src/lib/asoReport.js` pelos arquivos deste pacote.
4. No terminal do VS Code, na raiz do projeto, execute `npm run build`.
5. Publique o **conteúdo** da pasta `dist` em `public_html/Ykire/`: o novo `index.html` e os novos arquivos em `assets`. Mantenha `api/`, o `.htaccess` e `certificate-templates/` existentes.
6. Atualize o navegador com `Ctrl+F5` e teste os cartões do painel, o formulário e os relatórios.

**Não é necessária nenhuma migração SQL.** As colunas antigas continuam no banco para preservar o histórico.

## Testes recomendados

- Avaliação com 7 dias restantes -> `Até 15 dias`, amarelo.
- Avaliação com 15 dias restantes -> `Até 15 dias`, amarelo.
- Avaliação com 16 dias restantes -> `16 a 30 dias`, verde.
- Avaliação com data passada -> `Prazo ultrapassado`, vermelho.
- Sem próxima avaliação -> `Sem próxima data`.
- Situação `Agendado` -> grava sem data de agendamento.
- Situação `ASO recebido` -> grava sem data de recebimento **desde que Data do exame esteja preenchida**.
- Editar registro antigo com `scheduled_for`/`received_on` preenchidos -> valores históricos mantidos.

## Validação

Sintaxe de 117 arquivos JavaScript/JSX verificada com TypeScript (sem erros); sintaxe PHP verificada com `php -l` (sem erros); regras das faixas testadas com datas relativas (-1, 0, 1, 7, 8, 15, 16, 30 e 31 dias). **O `npm run build` e os testes integrados com a HostGator devem ser executados no ambiente do projeto.**

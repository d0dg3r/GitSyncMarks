# Firefox Add-ons (AMO) — GitSyncMarks (Português Brasil)
<!-- See firefox-meta.md for Privacy, Test Instructions, and Distribution -->

### Name
GitSyncMarks

### Summary (max 250 characters)
Sync de favoritos para seu repositório Git. Linkwarden, Smart Search, backup Bitwarden, assistente guiado. Bidirecional, seguro, privado. Suporte Firefox completo. Sem intermediários.

### Detailed Description
GitSyncMarks sincroniza seus favoritos bidirecionalmente com seu próprio repositório Git — grandes plataformas hospedadas e servidores Git auto-hospedados. Sem intermediários, sem servidores de terceiros – seus dados permanecem totalmente sob seu controle.

Destaques

- Sync Git multi-provedor: Conecte GitHub, GitLab ou Git auto-hospedado — cada perfil pode usar seu próprio provedor e URL de servidor.
- Transferência de perfis e espelhos push: Copie favoritos entre perfis (substituir ou mesclar); remotes de backup push-only opcionais após cada sync.
- Progresso de sync ao vivo: Texto de etapa durante push, pull e troca de perfil (ex. `3 / 12 arquivos` ou `1 de 3` etapas).
- Backup Bitwarden / Vaultwarden para Git: Armazene exportações de cofre protegidas por senha no seu repo, criptografia extra opcional; listar, baixar ou excluir backups remotos.
- UI nested-card: Seções agrupadas mais claras em Opções, assistente, popup e busca.
- Histórico de sync e restauração: Navegue commits anteriores, visualize mudanças com diff e restaure qualquer estado anterior com um clique.
- Limpar órfãos remotos: Visualize e exclua arquivos de favoritos remotos que não existem mais localmente.
- Sinergia Linkwarden: Salve páginas ou links na sua instância Linkwarden — capturas viewport, sync de coleções e tags predefinidas.
- Smart Search: Busca de favoritos dedicada e ultrarrápida com temas claro/escuro e navegação completa por teclado.
- Assistente de configuração guiado: O teste de conexão apenas valida o acesso; você escolhe pull, merge/sync, push, configuração de pastas ou pular — com confirmação antes de escrever no repositório.
- Performance Git auto-hospedado: Leituras git tree + blob rápidas e pushes single-commit em hosts compatíveis (fallback Contents API quando necessário).
- Menu de contexto: Pastas rápidas, popup de busca, Abrir tudo da pasta, copiar/baixar favicon e ações de perfil no clique direito.
- Sync de configurações para Git: Backup criptografado de configurações (`settings.enc`) no repositório — compartilhe configuração entre dispositivos.

Capacidades principais

- Privacidade by design: Comunicação direta com a API do seu provedor Git. Nenhum terceiro vê seus dados.
- Otimizado para Firefox: Suporta estruturas nativas (Barra de ferramentas, Menu, Outros).
- Merge three-way: Sync de nível industrial que trata mudanças concorrentes em vários dispositivos automaticamente.
- Armazenamento por arquivo: Cada favorito é um arquivo JSON legível – ideal para versionamento e edição manual.
- Múltiplos perfis: Até 10 perfis separados para trabalho, pessoal ou projetos, cada um com seu repositório.
- Automação: Adicione favoritos via CLI ou GitHub Actions; a extensão os integra no próximo sync.
- Arquivos gerados: README.md (visão geral), bookmarks.html (importação), feed RSS e dashy-conf.yml — opcional por arquivo.
- Design e i18n: Temas claro, escuro e auto-sistema; densidade UI ajustável (compacto / médio / grande); 12 idiomas.

App complementar
Use o GitSyncMarks-App (Android, iOS, Desktop) para gerenciar seus favoritos diretamente do seu repositório Git em dispositivos móveis. (Nota: Firefox para Android não suporta sync direta de favoritos via extensões – use o app.)

GitSyncMarks é Open Source: https://github.com/d0dg3r/GitSyncMarks

### Categories
Bookmarks

### Tags
favoritos, sync, github, gitlab, backup, automação

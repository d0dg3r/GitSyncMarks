# Firefox Add-ons (AMO) — GitSyncMarks (Português Brasil)
<!-- See firefox-meta.md for Privacy, Test Instructions, and Distribution -->

### Name
GitSyncMarks

### Summary (max 250 characters)
Sincronize seus favoritos do Firefox com o GitHub — bidirecional, sem conflitos. JSON por arquivo, merge triplo, auto-sync. Suporte para Barra de Favoritos, Menu e Mobile. Adicione favoritos via Git, CLI ou GitHub Actions. Open source, sem intermediários.

### Detailed Description
GitSyncMarks sincroniza seus favoritos do Firefox com um repositório GitHub — bidirecional, automaticamente e sem intermediários.

Recursos:
• Sem intermediários: comunica diretamente com a API do GitHub — sem servidor de terceiros, sem backend, seus dados ficam entre seu navegador e o GitHub
• Armazenamento por arquivo: cada favorito é um arquivo JSON individual — legível e amigável para diff
• Merge triplo: sincronização automática sem conflitos quando há alterações em ambos os lados
• Suporte completo ao Firefox incluindo a pasta Menu de Favoritos
• Auto-sync a cada alteração de favorito (atraso configurável por perfil)
• Múltiplos perfis de favoritos: até 10 perfis com repositórios GitHub separados; a troca substitui os favoritos locais
• Menu de contexto: clique direito na página ou link — Adicionar à barra de favoritos, Adicionar a outros favoritos, Sincronizar agora, Trocar perfil, Copiar URL do favicon, Baixar favicon
• Ferramentas de favicon: copie a URL do favicon de qualquer site para a área de transferência ou baixe como PNG — usa o favicon do navegador com o serviço do Google como alternativa
• Automatização: adicionar favoritos via Git, CLI ou GitHub Actions — sem abrir o navegador
• Pasta Repos GitHub: pasta opcional com favoritos para todos os seus repositórios GitHub (públicos e privados)
• Perfis de sync: tempo real, frequente, normal ou economia de energia
• Sync ao iniciar / ao focar: sync opcional ao iniciar o navegador ou ao focar a janela (com cooldown)
• Sync periódico para detectar alterações remotas (1–120 minutos, configurável)
• Push, Pull e Sync completo manuais pelo popup
• Detecção de conflitos quando o merge automático não é possível
• Arquivos gerados: README.md (visão geral), bookmarks.html (importação do navegador), feed.xml (feed RSS 2.0) e dashy-conf.yml (painel Dashy) — cada um configurável como Desativado, Manual ou Auto
• Sync de configurações com Git: backup criptografado das configurações da extensão no repositório — modo Global (compartilhado) ou Individual (por dispositivo); importar configurações de outros dispositivos; mesma senha em todos os dispositivos, sincronizado automaticamente
• Importar/Exportar: favoritos (JSON), configuração Dashy (YAML) ou configurações (JSON / .enc criptografado); importação com detecção automática de formato
• Onboarding: navegador de pastas para selecionar o caminho de sync; criar pasta ou importar favoritos ao configurar um novo perfil
• Multilíngue: 12 idiomas — EN, DE, FR, ES, PT-BR, IT, JA, ZH-CN, KO, RU, TR, PL; seleção manual ou auto-detecção
• Atalhos de teclado: sync rápido (Ctrl+Shift+.), abrir configurações (Ctrl+Shift+,) — personalizáveis
• Tema: claro, escuro ou auto — botão de ciclo (A → Escuro → Claro → A) nas opções e popup
• Opções: 5 abas (GitHub, Sync, Arquivos, Ajuda, Sobre) com sub-abas para GitHub e Arquivos — interface organizada
• Notificações: Todas (sucesso + erro), Somente erros ou Desativadas
• Auto-save: todas as configurações são salvas automaticamente ao alterar — sem botões Salvar
• Log de depuração: aba Sync — ativar para diagnósticos de sync, exportar para solução de problemas
• Votação do backlog: enquete comunitária para priorizar próximos recursos
• App móvel: GitSyncMarks-Mobile (iOS + Android) — visualize seus favoritos em qualquer lugar, sync somente leitura do seu repositório

Como funciona:
1. Crie um repositório GitHub para seus favoritos
2. Gere um Personal Access Token com o escopo "repo"
3. Configure o GitSyncMarks com seu token e repositório
4. Clique em "Sincronizar agora" — pronto!

Cada favorito é armazenado como um arquivo JSON individual no seu repositório, organizado em pastas que espelham a hierarquia de favoritos do Firefox (Barra de Favoritos, Menu de Favoritos, Outros Favoritos). Um README.md oferece uma visão geral diretamente no GitHub; um bookmarks.html permite importar em qualquer navegador; um feed.xml RSS permite assinar ou usar para automações; um dashy-conf.yml fornece seções para o painel Dashy.

Automatização:
Você pode adicionar favoritos sem abrir o Firefox. O GitSyncMarks inclui um workflow do GitHub Actions (add-bookmark.yml) que permite adicionar favoritos pela interface web do GitHub ou pela linha de comando:

  gh workflow run add-bookmark.yml -f url="https://example.com" -f title="Example" -f folder="toolbar"

Você também pode criar arquivos de favoritos diretamente no repositório — basta adicionar um arquivo JSON com "title" e "url" em qualquer pasta de favoritos. A extensão detecta novos arquivos automaticamente na próxima sincronização.

GitSyncMarks é totalmente open source: https://github.com/d0dg3r/GitSyncMarks

App móvel: GitSyncMarks-Mobile (iOS + Android) — visualize seus favoritos em qualquer lugar. Companheiro somente leitura; F-Droid e Google Play em breve. https://github.com/d0dg3r/GitSyncMarks-Mobile

### Categories
Favoritos

### Tags
bookmarks, sync, github, backup, automation

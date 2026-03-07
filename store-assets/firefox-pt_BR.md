# Firefox Add-ons (AMO) — GitSyncMarks (Português Brasil)
<!-- See firefox-meta.md for Privacy, Test Instructions, and Distribution -->

### Name
GitSyncMarks

### Summary (max 250 characters)
Sincronização de favoritos via GitHub. Sinergia com Linkwarden, Busca Inteligente e App Companion. Bidirecional, seguro e privado. Suporte completo para Firefox, incluindo estrutura nativa de menus. Sem intermediários.

### Detailed Description
GitSyncMarks é uma extensão profissional para Firefox que sincroniza seus favoritos de forma automática e bidirecional com um repositório GitHub. Sem intermediários, sem servidores de terceiros – controle total e privacidade.

Highlights

- Sinergia com Linkwarden: Salve páginas ou links diretamente em sua instância Linkwarden. Inclui capturas de tela automáticas, sincronização de coleções e tags predefinidas.
- Busca Inteligente: Uma interface de busca dedicada e ultrarrápida para seus favoritos. Suporta temas claro e escuro e é totalmente acessível via teclado.
- Assistente de Configuração Guiado: Um processo de integração passo a passo guia novos usuários desde a configuração do token e repositório até o primeiro sync com sucesso.
- Merge de Três Vias: Confiabilidade de nível industrial através de um algoritmo de merge avançado que combina inteligentemente alterações de múltiplos dispositivos.

Capacidades Chave

- Privado por Design: Comunicação direta com a API do GitHub. Nenhum terceiro vê seus dados.
- Otimizado para Firefox: Suporta estruturas nativas de favoritos (Barra de ferramentas, Menu, Outros).
- Armazenamento por Arquivo: Cada favorito é armazenado como um arquivo JSON legível – ideal para controle de versão e edição manual no GitHub.
- Múltiplos Perfis: Gerencie até 10 perfis separados (ex: Trabalho/Pessoal) com repositórios individuais.
- Automação: Adicione favoritos via CLI ou GitHub Actions; a extensão os integra automaticamente no próximo sync.
- Arquivos Gerados: Cria automaticamente um README.md (visão geral), bookmarks.html (arquivo de importação) ou feed RSS em seu repositório.

Instalação e Configuração

1. Instalação: Instale o GitSyncMarks a partir do Firefox Add-ons (AMO).
2. GitHub PAT: Crie um Token de Acesso Pessoal com escopo "repo".
3. Assistente de Configuração: Siga o processo guiado em Ajuda -> Primeiros Passos.
4. Linkwarden (opcional): Configure sua instância na aba dedicada do Linkwarden.

App Companion
Use o GitSyncMarks-App (Android, iOS, Desktop) para gerenciar seus favoritos diretamente do seu repositório GitHub em dispositivos móveis. (Nota: O Firefox para Android não suporta sincronização direta de favoritos por extensões – use o app em vez disso).

GitSyncMarks é Open Source: https://github.com/d0dg3r/GitSyncMarks

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

App móvel: GitSyncMarks-App (iOS + Android) — visualize seus favoritos em qualquer lugar. Companheiro somente leitura; F-Droid e Google Play em breve. https://github.com/d0dg3r/GitSyncMarks-App

### Categories
Favoritos

### Tags
bookmarks, sync, github, backup, automation

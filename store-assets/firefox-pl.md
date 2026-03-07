# Firefox Add-ons (AMO) — GitSyncMarks (Polski)
<!-- See firefox-meta.md for Privacy, Test Instructions, and Distribution -->
### Nazwa
GitSyncMarks

• Dziennik debugowania: karta Sync — włącz dla diagnostyki synchronizacji, eksportuj do rozwiązywania problemów
• Aplikacja mobilna: GitSyncMarks-App (iOS + Android) — przeglądaj zakładki w podróży, synchronizacja tylko do odczytu z repozytorium
• Automatyczny zapis: wszystkie ustawienia zapisują się automatycznie po zmianie — bez przycisków Zapisz
• Powiadomienia: Wszystkie (sukces + błąd), Tylko błędy lub Wyłączone

Jak to działa:
1. Utwórz repozytorium GitHub na swoje zakładki
2. Wygeneruj Personal Access Token z uprawnieniem "repo" (classic) lub "Contents: Read/Write" (fine-grained)
3. Skonfiguruj GitSyncMarks z tokenem i repozytorium
4. Kliknij „Synchronizuj teraz" — gotowe!

Każda zakładka jest przechowywana jako osobny plik JSON w Twoim repozytorium, zorganizowany w foldery odzwierciedlające hierarchię zakładek Firefoksa (Pasek zakładek, Menu zakładek, Inne zakładki). README.md zapewnia przejrzysty przegląd bezpośrednio na GitHubie; bookmarks.html umożliwia import do dowolnej przeglądarki; feed.xml RSS umożliwia subskrypcję lub automatyzację; dashy-conf.yml dostarcza sekcje dla panelu Dashy.

Automatyzacja:
Możesz dodawać zakładki bez otwierania Firefoksa. GitSyncMarks zawiera workflow GitHub Actions (add-bookmark.yml), który pozwala dodawać zakładki przez interfejs webowy GitHub lub wiersz poleceń:

  gh workflow run add-bookmark.yml -f url="https://example.com" -f title="Example" -f folder="toolbar"

Możesz także tworzyć pliki zakładek bezpośrednio w repozytorium — po prostu dodaj plik JSON z "title" i "url" do dowolnego folderu zakładek. Rozszerzenie automatycznie wykryje nowe pliki przy następnej synchronizacji.

GitSyncMarks jest w pełni open source: https://github.com/d0dg3r/GitSyncMarks

Aplikacja mobilna: GitSyncMarks-App (iOS + Android) — przeglądaj zakładki w podróży. Towarzysz tylko do odczytu; F-Droid i Google Play wkrótce. https://github.com/d0dg3r/GitSyncMarks-App

### Categories
Zakładki

### Tags
bookmarks, sync, github, backup, automation

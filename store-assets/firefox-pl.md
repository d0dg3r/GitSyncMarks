# Firefox Add-ons (AMO) — GitSyncMarks (Polski)
<!-- See firefox-meta.md for Privacy, Test Instructions, and Distribution -->

### Name
GitSyncMarks

### Summary (max 250 characters)
Synchronizuj zakładki Firefoksa z GitHubem — dwukierunkowo, bez konfliktów. JSON per plik, trójdrożny merge, auto-sync. Pełne wsparcie dla Paska zakładek, Menu i Mobilnych. Dodawaj zakładki przez Git, CLI lub GitHub Actions. Open source, bez pośredników.

### Detailed Description
GitSyncMarks synchronizuje Twoje zakładki Firefoksa z repozytorium GitHub — dwukierunkowo, automatycznie i bez pośredników.

Funkcje:
• Bez pośredników — komunikuje się bezpośrednio z API GitHub za pomocą Twojego Personal Access Token
• Przechowywanie per plik: każda zakładka to osobny plik JSON — czytelny i przyjazny dla diff
• Trójdrożny merge: automatyczna synchronizacja bez konfliktów, gdy zmiany występują po obu stronach
• Pełne wsparcie Firefoksa, w tym folder Menu zakładek
• Auto-sync przy każdej zmianie zakładki (opóźnienie konfigurowalne per profil)
• Wiele profili zakładek: do 10 profili z oddzielnymi repozytoriami GitHub; przełączenie zastępuje lokalne zakładki
• Menu kontekstowe: kliknij prawym przyciskiem stronę lub link — Dodaj do paska zakładek, Dodaj do innych zakładek, Synchronizuj teraz, Zmień profil, Kopiuj URL favikony, Pobierz favikonę
• Narzędzia favicon: skopiuj URL faviconu dowolnej strony do schowka lub pobierz jako PNG — używa faviconu przeglądarki z usługą Google jako zapasową
• Automatyzacja: dodawaj zakładki przez Git, CLI lub GitHub Actions — bez otwierania przeglądarki
• Folder GitHub Repos: opcjonalny folder z zakładkami do wszystkich Twoich repozytoriów GitHub (publicznych i prywatnych)
• Profile Sync: czas rzeczywisty, częsty, normalny lub oszczędzanie energii
• Sync przy uruchomieniu / fokusie: opcjonalna synchronizacja przy starcie przeglądarki lub uzyskaniu fokusu (z cooldownem)
• Okresowy Sync do wykrywania zdalnych zmian (1–120 minut, konfigurowalne)
• Ręczny Push, Pull i pełny Sync przez popup
• Wykrywanie konfliktów, gdy automatyczny merge nie jest możliwy
• Generowane pliki: README.md (przegląd), bookmarks.html (import do przeglądarki), feed.xml (kanał RSS 2.0) i dashy-conf.yml (panel Dashy) — każdy konfigurowalny jako Wyłączony, Ręczny lub Automatyczny
• Sync ustawień z Git: zaszyfrowana kopia zapasowa ustawień rozszerzenia w repozytorium — tryb Globalny (współdzielony) lub Indywidualny (per urządzenie); import ustawień z innych urządzeń; to samo hasło na każdym urządzeniu, automatycznie zsynchronizowane
• Import/Eksport: zakładki (JSON), konfiguracja Dashy (YAML) lub ustawienia (zwykły JSON / zaszyfrowany .enc); import z automatycznym wykrywaniem formatu
• Onboarding: przeglądarka folderów do wyboru ścieżki synchronizacji; tworzenie folderu lub pobieranie zakładek podczas konfiguracji nowego profilu
• Opcje: 5 kart (GitHub, Sync, Pliki, Pomoc, O programie) z podkartami dla GitHub i Plików — przejrzysty interfejs ustawień
• Motyw: jasny, ciemny lub automatyczny — przycisk cykliczny (A → Ciemny → Jasny → A) w opcjach i popup
• Głosowanie na backlog: ankieta społecznościowa do ustalania priorytetów kolejnych funkcji
• Wielojęzyczność: 12 języków — EN, DE, FR, ES, PT-BR, IT, JA, ZH-CN, KO, RU, TR, PL; ręczny wybór lub automatyczne wykrywanie
• Skróty klawiszowe: szybki Sync (Ctrl+Shift+.), otwórz ustawienia (Ctrl+Shift+,) — konfigurowalne
• Dziennik debugowania: karta Sync — włącz dla diagnostyki synchronizacji, eksportuj do rozwiązywania problemów
• Aplikacja mobilna: GitSyncMarks-Mobile (iOS + Android) — przeglądaj zakładki w podróży, synchronizacja tylko do odczytu z repozytorium
• Automatyczny zapis: wszystkie ustawienia zapisują się automatycznie po zmianie — bez przycisków Zapisz
• Powiadomienia: Wszystkie (sukces + błąd), Tylko błędy lub Wyłączone

Jak to działa:
1. Utwórz repozytorium GitHub na swoje zakładki
2. Wygeneruj Personal Access Token z uprawnieniem "repo"
3. Skonfiguruj GitSyncMarks z tokenem i repozytorium
4. Kliknij „Synchronizuj teraz" — gotowe!

Każda zakładka jest przechowywana jako osobny plik JSON w Twoim repozytorium, zorganizowany w foldery odzwierciedlające hierarchię zakładek Firefoksa (Pasek zakładek, Menu zakładek, Inne zakładki). README.md zapewnia przejrzysty przegląd bezpośrednio na GitHubie; bookmarks.html umożliwia import do dowolnej przeglądarki; feed.xml RSS umożliwia subskrypcję lub automatyzację; dashy-conf.yml dostarcza sekcje dla panelu Dashy.

Automatyzacja:
Możesz dodawać zakładki bez otwierania Firefoksa. GitSyncMarks zawiera workflow GitHub Actions (add-bookmark.yml), który pozwala dodawać zakładki przez interfejs webowy GitHub lub wiersz poleceń:

  gh workflow run add-bookmark.yml -f url="https://example.com" -f title="Example" -f folder="toolbar"

Możesz także tworzyć pliki zakładek bezpośrednio w repozytorium — po prostu dodaj plik JSON z "title" i "url" do dowolnego folderu zakładek. Rozszerzenie automatycznie wykryje nowe pliki przy następnej synchronizacji.

GitSyncMarks jest w pełni open source: https://github.com/d0dg3r/GitSyncMarks

Aplikacja mobilna: GitSyncMarks-Mobile (iOS + Android) — przeglądaj zakładki w podróży. Towarzysz tylko do odczytu; F-Droid i Google Play wkrótce. https://github.com/d0dg3r/GitSyncMarks-Mobile

### Categories
Zakładki

### Tags
bookmarks, sync, github, backup, automation

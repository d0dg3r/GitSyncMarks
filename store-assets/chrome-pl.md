# Chrome Web Store — GitSyncMarks (Polski)
<!-- See chrome-meta.md for Privacy, Test Instructions, and Distribution -->

### Name
GitSyncMarks

### Summary (max 132 characters)
Twoje zakładki bezpiecznie na GitHub — pliki jednostkowe, synchronizacja z merge trójstronnym, Chrome i Firefox. Bez pośredników.

### Detailed Description
GitSyncMarks synchronizuje zakładki przeglądarki z repozytorium GitHub — dwukierunkowo, automatycznie i bez pośredników.

Funkcje:
• Bez pośredników — komunikuje się bezpośrednio z API GitHub przy użyciu Twojego Personal Access Token
• Plikowe przechowywanie: każda zakładka to osobny plik JSON — czytelny i przyjazny dla diff
• Trójstronny merge: automatyczna, bezkonfliktowa synchronizacja przy zmianach po obu stronach
• Wieloprzeglądarkowy: działa z Chrome, Chromium, Brave, Edge i Firefox
• Auto-Sync przy każdej zmianie zakładki (debounce konfigurowalny per profil)
• Wiele profili zakładek: do 10 profili z oddzielnymi repozytoriami GitHub; przełączenie zastępuje lokalne zakładki
• Menu kontekstowe: kliknij prawym przyciskiem stronę lub link — Dodaj do paska zakładek, Dodaj do innych zakładek, Synchronizuj teraz, Zmień profil, Kopiuj URL favikony, Pobierz favikonę
• Narzędzia favicon: skopiuj URL faviconu dowolnej strony do schowka lub pobierz jako PNG — używa faviconu przeglądarki z usługą Google jako zapasową
• Automatyzacja: dodawanie zakładek przez Git, CLI lub GitHub Actions — bez przeglądarki
• Folder GitHub Repos: opcjonalny folder z zakładkami do wszystkich Twoich repozytoriów GitHub (publicznych i prywatnych)
• Profile Sync: czas rzeczywisty, częsty, normalny lub oszczędzanie energii (ustawione interwały i debounce)
• Sync przy uruchomieniu / fokusie: opcjonalny Sync przy starcie przeglądarki lub powrocie fokusa (z cooldownem)
• Okresowy Sync do wykrywania zdalnych zmian (1–120 minut, konfigurowalne)
• Ręczny Push, Pull i pełny Sync z poziomu popup
• Wykrywanie konfliktów, gdy automatyczny merge jest niemożliwy
• Generowane pliki: README.md (przegląd), bookmarks.html (import do przeglądarki), feed.xml (kanał RSS 2.0) i dashy-conf.yml (panel Dashy) — każdy konfigurowalny jako Wyłączony, Ręczny lub Auto
• Sync ustawień z Git: zaszyfrowana kopia zapasowa ustawień rozszerzenia w repozytorium — tryb Globalny (współdzielony) lub Indywidualny (per urządzenie); importowanie ustawień z innych urządzeń; to samo hasło na każdym urządzeniu, automatycznie synchronizowane
• Import/Eksport: eksport zakładek (JSON), konfiguracji Dashy (YAML) lub ustawień (zwykły JSON / zaszyfrowany .enc); import z automatycznym wykrywaniem formatu
• Pełny reset: « Zresetuj wszystkie dane » w Pliki → Ustawienia — usuwa wszystkie profile, tokeny i ustawienia (zakładki przeglądarki zachowane); potwierdzenie w dwóch krokach
• Kreator konfiguracji: 8-krokowy przewodnik dla tokenu, repozytorium i pierwszej synchronizacji
• Onboarding: przeglądarka folderów do wyboru ścieżki synchronizacji; tworzenie folderu lub Pull zakładek przy konfiguracji nowego profilu
• Opcje: 5 zakładek (GitHub, Sync, Pliki, Pomoc, O programie) z podzakładkami dla GitHub i Plików — przejrzysty interfejs ustawień
• Motyw: jasny, ciemny lub auto — przycisk cykliczny (A → Ciemny → Jasny → A) w opcjach i popup
• Głosowanie na backlog: ankieta społeczności do ustalania priorytetów funkcji
• Wielojęzyczność: 12 języków — EN, DE, FR, ES, PT-BR, IT, JA, ZH-CN, KO, RU, TR, PL; wybór ręczny lub automatyczne wykrywanie
• Skróty klawiszowe: szybki Sync (Ctrl+Shift+.), otwórz ustawienia (Ctrl+Shift+,) — konfigurowalne
• Dziennik debugowania: zakładka Sync — włącz do diagnostyki Sync, eksportuj do rozwiązywania problemów
• Towarzysz mobilny: GitSyncMarks-Mobile (iOS + Android) — przeglądaj zakładki w podróży, Sync tylko do odczytu z repozytorium
• Automatyczny zapis: wszystkie ustawienia zapisują się automatycznie przy zmianie — bez przycisków Zapisz
• Powiadomienia: Wszystkie (sukces + błąd), Tylko błędy lub Wyłączone

Jak to działa:
1. Utwórz repozytorium GitHub na swoje zakładki
2. Wygeneruj Personal Access Token z zakresem „repo"
3. Skonfiguruj GitSyncMarks swoim tokenem i repozytorium
4. Kliknij „Synchronizuj teraz" — gotowe!

Każda zakładka jest przechowywana jako osobny plik JSON w Twoim repozytorium, zorganizowana w foldery odzwierciedlające hierarchię zakładek. README.md daje przejrzysty przegląd bezpośrednio na GitHub; bookmarks.html umożliwia import do dowolnej przeglądarki; feed.xml RSS umożliwia subskrypcję lub wykorzystanie do automatyzacji; dashy-conf.yml dostarcza sekcje dla panelu Dashy.

Automatyzacja:
Możesz dodawać zakładki bez otwierania przeglądarki. GitSyncMarks zawiera workflow GitHub Actions (add-bookmark.yml), który pozwala dodawać zakładki przez interfejs webowy GitHub lub wiersz poleceń:

  gh workflow run add-bookmark.yml -f url="https://example.com" -f title="Przykład" -f folder="toolbar"

Możesz też tworzyć pliki zakładek bezpośrednio w repozytorium — wystarczy dodać plik JSON z „title" i „url" do dowolnego folderu zakładek. Rozszerzenie automatycznie wykrywa nowe pliki przy następnym Sync i normalizuje je do kanonicznego formatu.

GitSyncMarks jest w pełni open source: https://github.com/d0dg3r/GitSyncMarks

Aplikacja mobilna: GitSyncMarks-Mobile (iOS + Android) — zakładki w podróży. Tylko odczyt; F-Droid i Google Play wkrótce. https://github.com/d0dg3r/GitSyncMarks-Mobile

### Category
Produktywność

### Language
Polski

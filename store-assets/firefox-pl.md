# Firefox Add-ons (AMO) — GitSyncMarks (Polski)
<!-- See firefox-meta.md for Privacy, Test Instructions, and Distribution -->

### Name
GitSyncMarks

### Summary (max 250 characters)
Sync zakładek do repozytorium Git. Linkwarden, Smart Search, backup Bitwarden, kreator. Dwukierunkowy, bezpieczny, prywatny. Pełne wsparcie Firefox. Bez pośredników.

### Detailed Description
GitSyncMarks synchronizuje zakładki dwukierunkowo z własnym repozytorium Git — duże platformy hostingowe i self-hosted serwery Git. Bez pośredników, bez serwerów stron trzecich – Twoje dane pozostają w pełni pod Twoją kontrolą.

Najważniejsze

- Sync Git multi-provider: Połącz swój host Git lub serwer self-hosted — każdy profil używa własnego providera i URL. Pełna lista providerów: https://github.com/d0dg3r/GitSyncMarks/blob/main/docs/PROVIDERS.md
- Transfer profili i mirrory push: Kopiowanie zakładek między profilami (zamiana lub scalenie); opcjonalne push-only backup remotes po każdym sync.
- Postęp sync na żywo: Tekst kroku podczas push, pull i zmiany profilu (np. `3 / 12 plików` lub `1 z 3` kroków).
- Backup zgodny z Bitwarden do Git: Przechowywanie eksportów vault chronionych hasłem w repo, opcjonalne dodatkowe szyfrowanie; listowanie, pobieranie lub usuwanie zdalnych backupów.
- UI nested-card: Jaśniejsze grupowane sekcje w Opcjach, kreatorze, popup i wyszukiwaniu.
- Historia sync i przywracanie: Przeglądanie przeszłych commitów, podgląd zmian przez diff i przywracanie poprzedniego stanu jednym kliknięciem.
- Czyszczenie osieroconych zdalnych: Podgląd i usuwanie zdalnych plików zakładek, których nie ma już lokalnie.
- Synergia Linkwarden: Zapisywanie stron lub linków bezpośrednio do instancji Linkwarden — zrzuty viewport, sync kolekcji i predefiniowane tagi.
- Smart Search: Dedykowane, błyskawiczne wyszukiwanie zakładek z motywami jasnym/ciemnym i pełną nawigacją klawiaturową.
- Kreator konfiguracji: Test połączenia tylko weryfikuje dostęp; wybierasz pull, merge/sync, push, konfigurację folderów lub pomiń — z potwierdzeniem przed zapisem do repozytorium.
- Wydajność self-hosted Git: Szybkie odczyty git tree + blob i single-commit push na kompatybilnych hostach (fallback Contents API w razie potrzeby).
- Menu kontekstowe: Szybkie foldery, popup wyszukiwania, Otwórz wszystko z folderu, kopiowanie/pobieranie favicon i akcje profilu z prawego kliknięcia.
- Sync ustawień do Git: Zaszyfrowany backup ustawień (`settings.enc`) w repozytorium — udostępnianie konfiguracji między urządzeniami.

Kluczowe możliwości

- Prywatność by design: Bezpośrednia komunikacja z API providera Git. Żadne strony trzecie nie widzą Twoich danych.
- Zoptymalizowane dla Firefox: Obsługuje natywne struktury (Pasek narzędzi, Menu, Inne).
- Merge three-way: Sync klasy przemysłowej automatycznie obsługuje równoczesne zmiany na wielu urządzeniach.
- Przechowywanie plikowe: Każda zakładka to czytelny plik JSON – idealny do wersjonowania i ręcznej edycji.
- Wiele profili: Do 10 oddzielnych profili dla pracy, osobistego użytku lub projektów, każdy z własnym repozytorium.
- Automatyzacja: Dodawanie zakładek przez CLI lub przepływy CI/CD; rozszerzenie integruje je przy następnym sync.
- Generowane pliki: README.md (przegląd), bookmarks.html (import), kanał RSS i dashy-conf.yml — opcjonalnie per plik.
- Design i i18n: Motywy jasny, ciemny i auto-system; regulowana gęstość UI (kompaktowy / średni / duży); 12 języków.

Aplikacja towarzysząca
Użyj GitSyncMarks-App (mobilne i desktop), aby zarządzać zakładkami bezpośrednio z repozytorium Git. (Uwaga: Firefox for Android nie obsługuje bezpośredniej synchronizacji zakładek przez rozszerzenia – użyj aplikacji.)

GitSyncMarks jest Open Source: https://github.com/d0dg3r/GitSyncMarks

### Categories
Bookmarks

### Tags
zakładki, sync, github, gitlab, backup, automatyzacja

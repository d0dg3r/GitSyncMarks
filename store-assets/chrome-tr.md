# Chrome Web Store — GitSyncMarks (Türkçe)
<!-- See chrome-meta.md for Privacy, Test Instructions, and Distribution -->

### Name
GitSyncMarks

### Summary (max 132 characters)
Yer imleriniz GitHub'da güvende — dosya bazlı depolama, üç yönlü merge sync, Chrome ve Firefox. Aracısız.

### Detailed Description
GitSyncMarks, tarayıcı yer imlerinizi bir GitHub deposuyla senkronize eder — çift yönlü, otomatik ve aracısız.

Özellikler:
• Aracısız — Personal Access Token'ınızı kullanarak doğrudan GitHub API ile iletişim kurar
• Dosya bazlı depolama: her yer imi ayrı bir JSON dosyası — okunabilir ve diff dostu
• Üç yönlü merge: her iki tarafta da değişiklik olduğunda otomatik çakışmasız sync
• Çapraz tarayıcı: Chrome, Chromium, Brave, Edge ve Firefox ile çalışır
• Her yer imi değişikliğinde otomatik Sync (profil başına debounce yapılandırılabilir)
• Çoklu yer imi profili: ayrı GitHub depoları ile en fazla 10 profil; geçiş yerel yer imlerini değiştirir
• Bağlam menüsü: sayfa veya bağlantıya sağ tıklayın — Yer İşareti Çubuğuna Ekle, Diğer Yer İşaretlerine Ekle, Şimdi Senkronize Et, Profil Değiştir, Favicon URL Kopyala, Favicon İndir
• Favicon araçları: herhangi bir sitenin favicon URL'sini panoya kopyalayın veya PNG olarak indirin — tarayıcı faviconunu kullanır, Google favicon hizmeti yedek olarak
• Otomasyon: Git, CLI veya GitHub Actions ile yer imi ekleme — tarayıcı gerektirmez
• GitHub Repos klasörü: tüm GitHub depolarınıza (genel ve özel) yer imleri içeren isteğe bağlı klasör
• Sync profilleri: gerçek zamanlı, sık, normal veya enerji tasarrufu (önceden ayarlanmış aralıklar ve debounce)
• Başlangıçta / odaklanmada Sync: tarayıcı başladığında veya odak kazandığında isteğe bağlı Sync (bekleme süresiyle)
• Uzak değişiklikleri algılamak için periyodik Sync (1–120 dakika, yapılandırılabilir)
• Popup'tan manuel Push, Pull ve tam Sync
• Otomatik merge mümkün olmadığında çakışma algılama
• Oluşturulan dosyalar: README.md (genel bakış), bookmarks.html (tarayıcı içe aktarma), feed.xml (RSS 2.0 akışı) ve dashy-conf.yml (Dashy panosu) — her biri Kapalı, Manuel veya Otomatik olarak yapılandırılabilir
• Git ile ayar Sync'i: depodaki uzantı ayarlarının şifrelenmiş yedekleme — Global (paylaşılan) veya Bireysel (cihaz başına) mod; diğer cihazlardan ayarları içe aktarma; her cihazda aynı şifre, otomatik senkronize
• İçe/Dışa Aktarma: yer imleri (JSON), Dashy yapılandırması (YAML) veya ayarlar (düz JSON / şifreli .enc) dışa aktarma; otomatik format algılama ile içe aktarma
• Başlangıç kurulumu: klasör tarayıcısı ile sync yolunu seçme; yeni profil yapılandırırken klasör oluşturma veya yer imlerini Pull etme
• Seçenekler: 5 sekme (GitHub, Sync, Dosyalar, Yardım, Hakkında) ile GitHub ve Dosyalar için alt sekmeler — düzenli ayarlar arayüzü
• Tema: açık, koyu veya otomatik — döngü düğmesi (A → Koyu → Açık → A) seçeneklerde ve popup'ta
• Backlog oylaması: sonraki özelliklerin önceliğini belirlemek için topluluk anketi
• Çok dilli: 12 dil — EN, DE, FR, ES, PT-BR, IT, JA, ZH-CN, KO, RU, TR, PL; manuel seçim veya otomatik algılama
• Klavye kısayolları: hızlı Sync (Ctrl+Shift+.), ayarları aç (Ctrl+Shift+,) — özelleştirilebilir
• Hata ayıklama günlüğü: Sync sekmesi — Sync tanılama için etkinleştirin, sorun giderme için dışa aktarın
• Mobil eşlik uygulaması: GitSyncMarks-Mobile (iOS + Android) — hareket halindeyken yer imlerinizi görüntüleyin, deponuzdan salt okunur Sync
• Otomatik kaydetme: tüm ayarlar değiştirildiğinde otomatik kaydedilir — Kaydet düğmesi yok
• Bildirimler: Tümü (başarı + hata), Yalnızca hatalar veya Kapalı

Nasıl çalışır:
1. Yer imleriniz için bir GitHub deposu oluşturun
2. "repo" kapsamında bir Personal Access Token oluşturun
3. GitSyncMarks'ı token'ınız ve deponuzla yapılandırın
4. "Şimdi Senkronize Et"e tıklayın — bitti!

Her yer imi, deponuzda ayrı bir JSON dosyası olarak saklanır ve yer imi hiyerarşinizi yansıtan klasörler halinde düzenlenir. README.md doğrudan GitHub'da net bir genel bakış sunar; bookmarks.html herhangi bir tarayıcıya içe aktarmanızı sağlar; feed.xml RSS akışı abone olmanıza veya otomasyonlar için kullanmanıza olanak tanır; dashy-conf.yml, Dashy panosu için bölümler sağlar.

Otomasyon:
Tarayıcıyı açmadan yer imi ekleyebilirsiniz. GitSyncMarks, GitHub Web arayüzü veya komut satırı üzerinden yer imi eklemenizi sağlayan bir GitHub Actions iş akışı (add-bookmark.yml) içerir:

  gh workflow run add-bookmark.yml -f url="https://example.com" -f title="Örnek" -f folder="toolbar"

Doğrudan depoda yer imi dosyaları da oluşturabilirsiniz — herhangi bir yer imi klasörüne "title" ve "url" içeren bir JSON dosyası ekleyin. Uzantı, bir sonraki Sync'te yeni dosyaları otomatik olarak algılar ve bunları kanonik formata normalleştirir.

GitSyncMarks tamamen açık kaynaklıdır: https://github.com/d0dg3r/GitSyncMarks

Mobil uygulama: GitSyncMarks-Mobile (iOS + Android) — hareket halindeyken yer imleriniz. Salt okunur; F-Droid ve Google Play yakında. https://github.com/d0dg3r/GitSyncMarks-Mobile

### Category
Üretkenlik

### Language
Türkçe

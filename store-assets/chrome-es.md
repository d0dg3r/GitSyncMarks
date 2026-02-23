# Chrome Web Store — GitSyncMarks (Español)
<!-- See chrome-meta.md for Privacy, Test Instructions, and Distribution -->

### Name
GitSyncMarks

### Summary (max 132 characters)
Tus marcadores, seguros en GitHub — almacenamiento por archivo, sincronización de fusión triple, Chrome y Firefox. Sin intermediarios.

### Detailed Description
GitSyncMarks sincroniza tus marcadores del navegador con un repositorio GitHub — bidireccional, automáticamente y sin intermediarios.

Características:
• Sin intermediarios: se comunica directamente con la API de GitHub — sin servidor de terceros, sin backend, tus datos permanecen entre tu navegador y GitHub
• Almacenamiento por archivo: cada marcador es un archivo JSON individual — legible y apto para diff
• Fusión triple: sincronización automática sin conflictos cuando hay cambios en ambos lados
• Multi-navegador: funciona con Chrome, Chromium, Brave, Edge y Firefox
• Auto-sync en cada cambio de marcador (retardo configurable por perfil)
• Múltiples perfiles de marcadores: hasta 10 perfiles con repos GitHub separados; el cambio reemplaza los marcadores locales
• Menú contextual: clic derecho en página o enlace — Añadir a la barra de marcadores, Añadir a otros marcadores, Sincronizar ahora, Cambiar perfil, Copiar URL del favicon, Descargar favicon
• Herramientas de favicon: copia la URL del favicon de cualquier sitio al portapapeles o descárgalo como PNG — usa el favicon del navegador con el servicio de Google como alternativa
• Automatización: añadir marcadores vía Git, CLI o GitHub Actions — sin abrir el navegador
• Carpeta Repos GitHub: carpeta opcional con marcadores a todos tus repositorios GitHub (públicos y privados)
• Perfiles de sync: tiempo real, frecuente, normal o ahorro de energía (intervalos predefinidos)
• Sync al inicio / al foco: sync opcional al abrir el navegador o al volver a la ventana (con enfriamiento)
• Sync periódico para detectar cambios remotos (1–120 minutos, configurable)
• Push, Pull y Sync completo manuales desde el popup
• Detección de conflictos cuando la fusión automática no es posible
• Archivos generados: README.md (resumen), bookmarks.html (importación del navegador), feed.xml (feed RSS 2.0) y dashy-conf.yml (panel Dashy) — cada uno configurable como Desactivado, Manual o Auto
• Sync de ajustes con Git: copia cifrada de los ajustes de la extensión en el repositorio — modo Global (compartido) o Individual (por dispositivo); importar ajustes de otros dispositivos; misma contraseña, sincronizado automáticamente
• Importar/Exportar: marcadores (JSON), configuración Dashy (YAML) o ajustes (JSON / .enc cifrado); importación con detección automática de formato
• Integración: crear carpeta o importar marcadores al configurar un nuevo perfil
• Multilingüe: 12 idiomas — EN, DE, FR, ES, PT-BR, IT, JA, ZH-CN, KO, RU, TR, PL; selección manual o auto-detección
• Atajos de teclado: sync rápido, configuración — personalizables
• Tema: claro, oscuro o auto — botón cíclico (A → Oscuro → Claro → A) en opciones y popup
• Opciones: 5 pestañas (GitHub, Sync, Archivos, Ayuda, Acerca de) con sub-pestañas para GitHub y Archivos
• Notificaciones: Todas (éxito + error), Solo errores o Desactivadas
• Guardado automático: todos los ajustes se guardan al cambiar — sin botones Guardar
• Registro de depuración: pestaña Sync — para diagnosticar la sincronización
• Votación del backlog: encuesta comunitaria para priorizar las próximas funciones
• App móvil: GitSyncMarks-Mobile (iOS + Android) — consulta tus marcadores en movimiento

Cómo funciona:
1. Crea un repositorio GitHub para tus marcadores
2. Genera un Personal Access Token con el scope « repo »
3. Configura GitSyncMarks con tu token y el repositorio
4. Haz clic en « Sincronizar ahora » — ¡listo!

Cada marcador se almacena como un archivo JSON individual en tu repositorio, organizado en carpetas que reflejan la jerarquía de tus marcadores. Un README.md te ofrece una visión general directamente en GitHub; un bookmarks.html permite importar en cualquier navegador; un feed.xml RSS permite suscribirse o automatizar; un dashy-conf.yml proporciona secciones para el panel Dashy.

Automatización:
Puedes añadir marcadores sin abrir el navegador. GitSyncMarks incluye un workflow de GitHub Actions (add-bookmark.yml) para añadir marcadores vía la interfaz web de GitHub o la línea de comandos:

  gh workflow run add-bookmark.yml -f url="https://example.com" -f title="Ejemplo" -f folder="toolbar"

También puedes crear archivos de marcadores directamente en el repositorio — solo añade un archivo JSON con « title » y « url » en una carpeta de marcadores. La extensión detecta los nuevos archivos en la próxima sincronización y los normaliza.

GitSyncMarks es totalmente open source: https://github.com/d0dg3r/GitSyncMarks

App móvil: GitSyncMarks-Mobile (iOS + Android) — marcadores en movimiento. Solo lectura; F-Droid y Google Play próximamente. https://github.com/d0dg3r/GitSyncMarks-Mobile

### Category
Productividad

### Language
Español

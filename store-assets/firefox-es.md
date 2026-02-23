# Firefox Add-ons (AMO) — GitSyncMarks (Español)
<!-- See firefox-meta.md for Privacy, Test Instructions, and Distribution -->

### Name
GitSyncMarks

### Summary (max 250 characters)
Sincroniza tus marcadores de Firefox con GitHub — bidireccional, sin conflictos. Almacenamiento JSON por archivo, fusión triple, auto-sync. Soporte completo para Barra de marcadores, Menú y Móvil. Añade marcadores vía Git, CLI o GitHub Actions. Open source, sin servidor externo.

### Detailed Description
GitSyncMarks sincroniza tus marcadores de Firefox con un repositorio GitHub — bidireccional, automáticamente y sin servidor externo.

Características:
• Almacenamiento por archivo: cada marcador es un archivo JSON individual — legible y apto para diff
• Fusión triple: sincronización automática sin conflictos
• Soporte completo Firefox incluyendo el Menú de marcadores
• Múltiples perfiles de marcadores: hasta 10 perfiles con repos GitHub separados
• Carpeta Repos GitHub: carpeta opcional con marcadores a todos tus repositorios GitHub
• Integración: crear carpeta o importar marcadores al configurar un nuevo perfil
• Perfiles de sync: tiempo real, frecuente, normal o ahorro de energía
• Auto-sync en cada cambio de marcador (retardo configurable por perfil)
• Sync al inicio / al foco: sync opcional al abrir el navegador o al volver a la ventana
• Sync periódico para detectar cambios remotos (1–120 minutos, configurable)
• Notificaciones: Todas (éxito + error), Solo errores o Desactivadas
• Push, Pull y Sync completo manuales desde el popup
• Detección de conflictos cuando la fusión automática no es posible
• Archivos generados: README.md, bookmarks.html, feed.xml y dashy-conf.yml — cada uno configurable como Desactivado, Manual o Auto
• Sync de ajustes con Git: copia cifrada en el repositorio — modo Global o Individual (por dispositivo)
• Opciones: 5 pestañas (GitHub, Sync, Archivos, Ayuda, Acerca de) con sub-pestañas para GitHub y Archivos
• Menú contextual: clic derecho en página o enlace — Añadir a la barra de marcadores, Añadir a otros marcadores, Sincronizar ahora, Copiar URL del favicon, Descargar favicon
• Automatización: añadir marcadores vía Git, CLI o GitHub Actions — sin abrir el navegador
• Importar/Exportar: marcadores (JSON), configuración Dashy (YAML) o ajustes (JSON / .enc cifrado)
• Guardado automático: todos los ajustes se guardan al cambiar — sin botones Guardar
• Tema: claro, oscuro o auto — botón cíclico (A → Oscuro → Claro → A)
• Multilingüe: 12 idiomas — EN, DE, FR, ES, PT-BR, IT, JA, ZH-CN, KO, RU, TR, PL
• Atajos de teclado: sync rápido, configuración — personalizables
• Registro de depuración: pestaña Sync — para diagnosticar la sincronización
• Votación del backlog: encuesta comunitaria para priorizar las próximas funciones
• App móvil: GitSyncMarks-Mobile (iOS + Android)
• Sin servidor externo — se comunica directamente con la API de GitHub

Cómo funciona:
1. Crear un repositorio GitHub
2. Generar un Personal Access Token con el scope « repo »
3. Configurar GitSyncMarks
4. Clic en « Sincronizar ahora » — ¡listo!

GitSyncMarks es totalmente open source: https://github.com/d0dg3r/GitSyncMarks

App móvil: GitSyncMarks-Mobile (iOS + Android). https://github.com/d0dg3r/GitSyncMarks-Mobile

### Categories
Marcadores

### Tags
bookmarks, sync, github, backup, automation

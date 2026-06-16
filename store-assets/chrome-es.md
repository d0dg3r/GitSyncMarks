# Chrome Web Store — GitSyncMarks (Español)
<!-- See chrome-meta.md for Privacy, Test Instructions, and Distribution -->

### Name
GitSyncMarks

### Summary (max 132 characters)
Sync marcadores a su repositorio Git. Linkwarden, Smart Search, Companion App. Directo, seguro, privado.

### Detailed Description
GitSyncMarks sincroniza sus marcadores bidireccionalmente con su propio repositorio Git — grandes plataformas alojadas y servidores Git autohospedados. Gestione sus datos en escritorio en su navegador, o en movilidad con la GitSyncMarks Companion App. Sin intermediarios, sin servidores de terceros – control y privacidad totales.

Destacados

- Sync Git multi-proveedor: Conecte su host Git o servidor autohospedado — cada perfil usa su propio proveedor y URL. Lista completa de proveedores: https://github.com/d0dg3r/GitSyncMarks/blob/main/docs/PROVIDERS.md
- Transferencia de perfiles y espejos push: Copie marcadores entre perfiles (reemplazar o fusionar); remotos de respaldo push-only opcionales tras cada sync.
- Progreso de sync en vivo: Texto de paso durante push, pull y cambio de perfil (p. ej. `3 / 12 archivos` o `1 de 3` pasos).
- Backup compatible con Bitwarden a Git: Almacene exportaciones de bóveda protegidas por contraseña en su repo, cifrado extra opcional; listar, descargar o eliminar backups remotos.
- UI nested-card: Secciones agrupadas más claras en Opciones, asistente, popup y búsqueda.
- Historial de sync y restauración: Explore commits anteriores, previsualice cambios con diff y restaure cualquier estado anterior con un clic.
- Limpiar huérfanos remotos: Previsualice y elimine archivos de marcadores remotos que ya no existen localmente.
- Sinergia Linkwarden: Guarde páginas o enlaces en su instancia Linkwarden — capturas viewport, sync de colecciones y etiquetas predefinidas.
- Smart Search: Búsqueda de marcadores dedicada y ultrarrápida con temas claro/oscuro y navegación completa por teclado.
- Asistente de configuración guiado: La prueba de conexión solo valida el acceso; usted elige pull, merge/sync, push, configuración de carpetas u omitir — con confirmación antes de escribir en el repositorio.
- Rendimiento Git autohospedado: Lecturas git tree + blob rápidas y pushes single-commit en hosts compatibles (fallback Contents API cuando sea necesario).
- Menú contextual: Carpetas rápidas, popup de búsqueda, Abrir todo de carpeta, copiar/descargar favicon y acciones de perfil con clic derecho.
- Sync de ajustes a Git: Backup cifrado de ajustes (`settings.enc`) en su repositorio — comparta configuración entre dispositivos.

Capacidades clave

- Privacidad by design: Comunicación directa con la API de su proveedor Git. Ningún tercero ve sus datos.
- Fusión three-way: Sync de grado industrial que maneja cambios concurrentes en varios dispositivos automáticamente.
- Almacenamiento por archivo: Cada marcador es un archivo JSON legible – ideal para versionado y edición manual.
- Múltiples perfiles: Hasta 10 perfiles separados para trabajo, personal o proyectos, cada uno con su repositorio.
- Automatización: Añada JSON de marcadores a su repositorio mediante git o la plantilla de acción de GitHub incluida; la extensión los importa en el próximo sync.
- Archivos generados: README.md (resumen), bookmarks.html (importación), feed RSS y dashy-conf.yml — opcional por archivo.
- Diseño e i18n: Temas claro, oscuro y auto-sistema; densidad UI ajustable (compacto / medio / grande); 12 idiomas.

App complementaria
Use GitSyncMarks-App (móvil y escritorio) para gestionar sus marcadores directamente desde su repositorio Git.

GitSyncMarks es Open Source: https://github.com/d0dg3r/GitSyncMarks

### Category
Productivity

### Language
Español

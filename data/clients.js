/* ============================================================================
   CONFIGURACIÓN DEL PORTAL — Godínez Creativos
   ============================================================================
   Este es el ÚNICO archivo que necesitas editar para gestionar el portal.

   CÓMO AÑADIR UN CLIENTE:
     1. Copia un bloque { ... } dentro de "clients".
     2. Cambia "id", "name", "code" (código de acceso) y "project".
     3. Añade sus videos en la lista "videos".

   CÓMO AÑADIR UN VIDEO:
     1. Copia tu archivo .mp4 dentro de la carpeta  videos/<carpeta-del-cliente>/
     2. Añade un bloque en "videos" con la ruta en "src".
     3. (Opcional) Añade una imagen de portada en assets/posters/ y ponla en "poster".

   NOTA: el "code" es una llave de acceso simple del lado del cliente (no es
   seguridad real). Sirve para que cada cliente vea solo lo suyo con un enlace
   privado. No pongas aquí material confidencial que no quieras que sea visible.
   ============================================================================ */

window.PORTAL_DATA = {
  agency: {
    name: "Godínez Creativos",
    tagline: "Portal de Entregas",
    contactEmail: "hola@godinezcreativos.qzz.io",
    website: "https://godinezcreativos.qzz.io"
  },

  clients: [
    {
      id: "acme-corp",
      name: "ACME Corp",
      code: "ACME2026",
      project: "Campaña Verano 2026",
      videos: [
        {
          id: "acme-spot-30",
          title: "Spot Principal — 30s",
          description: "Versión para redes sociales (formato horizontal 16:9).",
          src: "videos/acme-corp/spot-principal.mp4",
          poster: "assets/posters/acme-spot.jpg",
          version: "v2",
          tags: ["Instagram", "YouTube", "Final"]
        },
        {
          id: "acme-teaser-15",
          title: "Teaser — 15s",
          description: "Corte corto vertical para Stories y Reels.",
          src: "videos/acme-corp/teaser-15s.mp4",
          poster: "",
          version: "v1",
          tags: ["Stories", "Vertical", "Revisión"]
        }
      ]
    },

    {
      id: "lumina",
      name: "Lumina Studio",
      code: "LUMINA07",
      project: "Video Corporativo 2026",
      videos: [
        {
          id: "lumina-corporativo",
          title: "Video Corporativo — 90s",
          description: "Presentación institucional. Pendiente de tu aprobación.",
          src: "videos/lumina/corporativo.mp4",
          poster: "",
          version: "v1",
          tags: ["Web", "LinkedIn", "Revisión"]
        }
      ]
    }
  ]
};

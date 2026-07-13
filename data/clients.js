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
    contactEmail: "godinezcreativoss@gmail.com",
    website: "https://godinezcreativos.qzz.io"
  },

  clients: [
    {
      id: "aura",
      name: "Aura Construcciones",
      code: "aura2026",
      project: "Reels Julio 2026",
      videos: [
        {
          id: "piscina",
          title: "Reel - Piscina",
          description: "Video promocional construccion/remodelación de piscina.",
          src: "videos/aura/REEL PISCINAS AURA .mp4",
          poster: "",
          version: "v1",
          tags: ["piscina", "construcción", "remodelación"]
        }
      ]
    }
  ]
};

# Godínez Creativos — Portal de Entregas de Video

Portal privado para **mostrar videos a tus clientes**. Cada cliente entra con un
código de acceso y ve **solo sus videos**, con opción de **aprobar**, **solicitar
cambios** y **dejar comentarios**. Los videos se reproducen desde archivos MP4
locales (self-hosted).

Diseño basado en la paleta **Cherry / Neon** de tu proyecto `godinez-creativos`.

---

## 🚀 Cómo abrirlo

Como usa archivos de video locales, debes servirlo con un pequeño servidor
(abrir el `index.html` con doble clic puede bloquear la reproducción por seguridad
del navegador). Desde esta carpeta:

**Con Python** (ya suele venir instalado):
```bash
python -m http.server 8080
```
Luego abre 👉 http://localhost:8080

**Con Node.js** (si lo tienes):
```bash
npx serve .
```

**Con VS Code**: instala la extensión *Live Server* y pulsa "Go Live".

> Códigos de demo incluidos: **ACME2026** y **LUMINA07** (o pulsa los chips en la pantalla de acceso).

---

## 👥 Añadir un cliente

Edita **`data/clients.js`** y copia un bloque dentro de `clients`:

```js
{
  id: "nombre-cliente",        // identificador único (sin espacios)
  name: "Nombre Cliente",      // se muestra en el portal
  code: "CODIGO2026",          // código de acceso que le compartes
  project: "Campaña X",        // nombre del proyecto
  videos: [ /* ver abajo */ ]
}
```

Comparte con tu cliente el enlace del portal + su **código de acceso**.

---

## 🎬 Añadir un video

1. Copia el archivo `.mp4` dentro de `videos/<carpeta-del-cliente>/`.
2. (Opcional) Copia una imagen de portada en `assets/posters/`.
3. Añade un bloque en la lista `videos` del cliente:

```js
{
  id: "video-unico",
  title: "Spot Principal — 30s",
  description: "Versión final para redes.",
  src: "videos/nombre-cliente/spot.mp4",   // ruta al MP4
  poster: "assets/posters/spot.jpg",       // opcional (si no, se usa un fondo)
  version: "v2",                           // opcional, se muestra como etiqueta
  tags: ["Instagram", "Final"]             // opcional
}
```

Formato recomendado: **MP4 (H.264 + AAC)**, que reproduce en todos los navegadores.

---

## 📝 Cómo funciona la revisión del cliente

- Cada cliente pulsa **"Ver y revisar"**, reproduce el video y elige
  **Aprobar** o **Solicitar cambios**, con un comentario opcional.
- El estado y los comentarios se guardan en el **navegador del cliente**
  (localStorage) y se reflejan en el resumen (Aprobados / Pendientes / Con cambios).
- Con **"Enviar feedback a la agencia"** se abre su correo con un resumen
  ya redactado hacia `agency.contactEmail` (configúralo en `data/clients.js`).

---

## 🔒 Nota sobre privacidad

El código de acceso es una **llave del lado del cliente** (comodidad, no seguridad
criptográfica): los datos viajan en el propio sitio. Es ideal para compartir
entregas por enlace privado. **No publiques aquí material realmente confidencial**
si el sitio es accesible públicamente. Para privacidad fuerte se necesitaría un
backend con autenticación real (te lo puedo montar si lo necesitas).

---

## 📁 Estructura

```
godinez-video-portal/
├── index.html          # Página del portal
├── styles.css          # Tema Cherry/Neon
├── app.js              # Lógica (acceso, reproductor, revisiones)
├── data/
│   └── clients.js      # ⭐ AQUÍ configuras clientes y videos
├── videos/             # Tus archivos .mp4 por cliente
│   ├── acme-corp/
│   └── lumina/
├── assets/
│   └── posters/        # Imágenes de portada (opcional)
└── README.md
```

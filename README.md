# Godínez Creativos — Portal de Entregas de Video

Portal privado para **mostrar videos a tus clientes**. Cada cliente entra con un
código de acceso y ve **solo sus videos**, con opción de **aprobar**, **solicitar
cambios** y **dejar comentarios**. Los videos se reproducen desde archivos MP4
locales (self-hosted).

Las revisiones ahora se guardan en **Firebase (Firestore)** y la agencia las ve en
**tiempo real** desde un panel de administración (`admin.html`) — ya no dependen del
correo del cliente.

Diseño basado en la paleta **Cherry / Neon** de tu proyecto `godinez-creativos`.

---

## 🔥 Configuración de Firebase (una sola vez)

El portal usa Firebase en el **plan gratuito (Spark)**: Firestore + Authentication.
No se usan Cloud Functions.

1. **Crea/usa un proyecto** en [console.firebase.google.com](https://console.firebase.google.com)
   y registra una **app web** (`</>`). Copia el objeto `firebaseConfig` que te da y
   pégalo en **`firebase-config.js`** (reemplaza los valores `TODO_...`).
2. **Authentication → Método de acceso:** habilita **Anónimo** y
   **Correo electrónico/contraseña**. En **Authentication → Users**, crea el usuario
   admin **`godinezcreativoss@gmail.com`** con la contraseña que elijas.
3. **Firestore Database → Crear base de datos** (modo producción). Ve a la pestaña
   **Reglas**, pega el contenido de **`firestore.rules`** y **Publica**.
   - El admin se identifica por su correo dentro de las reglas. Si cambias de correo,
     actualízalo en `firestore.rules` **y** en `firebase-config.js` (`ADMIN_EMAIL`).
4. Abre **`admin.html`**, inicia sesión con la cuenta admin y pulsa
   **"Importar datos iniciales"** para subir a Firestore los clientes/videos que ya
   tienes en `data/clients.js`.

> El `firebaseConfig` web **no es secreto** (es seguro subirlo a git). La seguridad
> real la dan las Reglas de Firestore.
>
> La primera vez que abras el panel puede que la consola de Firestore te pida crear
> un **índice** para la consulta de revisiones: haz clic en el enlace que aparece en
> la consola del navegador y créalo con un clic.

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

El portal de clientes está en `http://localhost:8080/index.html` y el panel de la
agencia en `http://localhost:8080/admin.html`.

---

## 👥 Añadir un cliente (desde el panel)

Ya **no** se editan clientes a mano en `data/clients.js`. Abre **`admin.html`**,
inicia sesión y usa el formulario **"Nuevo cliente"**:

- **Código de acceso** — es lo que compartes con el cliente (p. ej. `AURA2026`).
  Se guarda en MAYÚSCULAS y es el identificador único del cliente.
- **Nombre** y **Proyecto**.

Comparte con tu cliente el enlace del portal + su **código de acceso**.

> `data/clients.js` se conserva solo como **semilla** para el botón
> "Importar datos iniciales" la primera vez.

---

## 🎬 Añadir un video (desde el panel)

Los videos siguen siendo **self-hosted** (Firebase no aloja los MP4):

1. Copia el archivo `.mp4` dentro de `videos/<carpeta-del-cliente>/`.
2. (Opcional) Copia una imagen de portada en `assets/posters/`.
3. En **`admin.html`**, en la tarjeta del cliente usa **"Añadir / editar video"**:
   - **id** único (ej. `piscina`), **título**, y **ruta del MP4** en `src`
     (ej. `videos/aura/reel.mp4`).
   - Opcionales: **poster**, **versión** (ej. `v1`, `v2`) y **etiquetas**
     (separadas por coma).

Para entregar una nueva versión: sube el nuevo MP4, edita el video en el panel
(cambia `src` y sube la `versión`) y avisa al cliente.

Formato recomendado: **MP4 (H.264 + AAC)**, que reproduce en todos los navegadores.

---

## 📝 Cómo funciona la revisión (flujo completo)

1. El cliente entra con su **código** (o con un **enlace directo** `index.html?code=CODIGO`
   que copias desde el panel), pulsa **"Ver y revisar"**, reproduce el video y elige
   **Aprobar** o **Solicitar cambios** (obligatorio), con un comentario opcional.
2. Al pulsar **"Enviar mi revisión"**, se guarda en **Firestore**
   (`clients/{CODIGO}/reviews/{videoId}`) al instante.
3. En **`admin.html`** la revisión aparece **en tiempo real** y, si tienes el panel
   abierto, salta un **aviso** (sonido + notificación de escritorio + contador en la
   pestaña). Las revisiones sin atender se marcan como **NUEVA**; puedes pulsar
   **"Marcar como atendida"** cuando la resuelvas.
4. Si son cambios: subes la nueva versión (ver arriba) y el ciclo se repite hasta
   que el cliente aprueba.

> **Avisos con el panel cerrado:** las notificaciones en vivo requieren tener
> `admin.html` abierto. Para recibir un correo aunque esté cerrado hace falta
> integrar un envío (p. ej. EmailJS, gratis) o Cloud Functions (plan Blaze).

---

## 🔒 Nota sobre seguridad

- El **admin** entra con **login real** (correo + contraseña) y es el único que puede
  listar clientes y editar datos (garantizado por las Reglas de Firestore).
- El **cliente** entra con su **código**, que es el identificador de su documento.
  Solo se puede leer un cliente **conociendo su código exacto**; nadie puede
  enumerar la lista de clientes. El cliente usa login **anónimo** por detrás para
  poder dejar sus revisiones.
- El `firebaseConfig` web no es secreto; la protección la dan las reglas
  (`firestore.rules`), no el ocultar las claves.

---

## 📁 Estructura

```
godinez-video-portal/
├── index.html          # Portal de clientes
├── admin.html          # Panel de la agencia (admin)
├── styles.css          # Tema Cherry/Neon
├── app.js              # Lógica del cliente (Firestore + login anónimo)
├── admin.js            # Lógica del panel (auth, CRUD, revisiones en vivo)
├── firebase-config.js  # ⭐ Pega aquí tu firebaseConfig + ADMIN_EMAIL
├── firebase-init.js    # Inicializa Firebase (app, auth, db)
├── firestore.rules     # Reglas de seguridad (pégalas en la consola Firebase)
├── data/
│   └── clients.js      # Semilla para "Importar datos iniciales"
├── videos/             # Tus archivos .mp4 por cliente (self-hosted)
│   └── aura/
├── assets/
│   └── posters/        # Imágenes de portada (opcional)
└── README.md
```

/* ============================================================================
   Godínez Creativos — Panel de la agencia (admin)
   ============================================================================
   - Login real (email/contraseña). Solo la cuenta ADMIN_EMAIL entra.
   - Revisiones de todos los clientes en tiempo real (collectionGroup).
   - CRUD de clientes y de sus videos (self-hosted: se guarda la ruta "src").
   - Botón para importar los datos iniciales desde data/clients.js una sola vez.
   ============================================================================ */

import {
  auth, db, ADMIN_EMAIL,
  signInWithEmailAndPassword, signOut, onAuthStateChanged,
  doc, getDoc, getDocs, setDoc, deleteDoc,
  collection, collectionGroup, query, orderBy, onSnapshot, serverTimestamp
} from "./firebase-init.js";

/* ---------- Helpers ---------- */
const $ = (id) => document.getElementById(id);
function esc(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
const STATUS_LABEL = { pending: "Pendiente", approved: "Aprobado", changes: "Cambios solicitados" };
const STATUS_CLASS = { pending: "pending", approved: "approved", changes: "changes" };
const normCode = (c) => (c || "").trim().toUpperCase();

function fmtTime(ts) {
  try {
    const d = ts && typeof ts.toDate === "function" ? ts.toDate() : null;
    if (!d) return "";
    return d.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
  } catch (e) { return ""; }
}

function note(msg, ms = 3500) {
  const n = $("admin-note");
  n.textContent = msg;
  if (ms) setTimeout(() => { if (n.textContent === msg) n.textContent = ""; }, ms);
}

/* ---------- Estado ---------- */
let editingCode = null;     // código en edición (null = alta nueva)
let unsubReviews = null;
let clientsCache = {};      // { CODE: data } de la última carga
let reviewsFirstLoad = true; // para no notificar las revisiones ya existentes al abrir

/* ---------- Aviso: sonido + notificación de escritorio ---------- */
let audioCtx = null;
function beep() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination);
    o.type = "sine"; o.frequency.value = 880; g.gain.value = 0.05;
    o.start(); o.stop(audioCtx.currentTime + 0.15);
  } catch (e) {}
}
function updateTitle(n) {
  document.title = (n > 0 ? `(${n}) ` : "") + "Godínez Creativos — Panel de la agencia";
}
function notifyNewReview(code, d) {
  const name = (clientsCache[code] && clientsCache[code].name) || code;
  beep();
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    try {
      new Notification("Nueva revisión — " + name, {
        body: (STATUS_LABEL[d.status] || "") + ": " + (d.comment || "(sin comentarios)"),
        icon: "assets/favicon.svg"
      });
    } catch (e) {}
  }
}

/* ============================================================================
   AUTENTICACIÓN
   ============================================================================ */
function bindAuth() {
  $("admin-login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("admin-email").value.trim();
    const pass = $("admin-pass").value;
    $("admin-login-error").textContent = "Entrando…";
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      // onAuthStateChanged se encarga del resto.
    } catch (err) {
      console.error(err);
      $("admin-login-error").textContent = "Correo o contraseña incorrectos.";
    }
  });

  $("admin-logout-btn").addEventListener("click", () => signOut(auth));

  onAuthStateChanged(auth, (user) => {
    if (user && user.email === ADMIN_EMAIL) {
      showPanel(user);
    } else if (user) {
      // Autenticado pero NO es el admin: fuera.
      $("admin-login-error").textContent = "Esta cuenta no tiene acceso al panel.";
      signOut(auth);
      showLogin();
    } else {
      showLogin();
    }
  });
}

function showLogin() {
  if (unsubReviews) { unsubReviews(); unsubReviews = null; }
  $("admin-view").classList.add("hidden");
  $("admin-login-view").classList.remove("hidden");
}

function showPanel(user) {
  $("admin-login-error").textContent = "";
  $("admin-badge").innerHTML = "Sesión: <b>" + esc(user.email) + "</b>";
  $("admin-year").textContent = "2026";
  $("admin-login-view").classList.add("hidden");
  $("admin-view").classList.remove("hidden");
  // Pide permiso para notificaciones de escritorio (una sola vez).
  if (typeof Notification !== "undefined" && Notification.permission === "default") {
    Notification.requestPermission();
  }
  subscribeReviews();
  loadClients();
}

/* ============================================================================
   REVISIONES EN TIEMPO REAL
   ============================================================================ */
function tsMillis(ts) {
  try { return ts && typeof ts.toMillis === "function" ? ts.toMillis() : 0; }
  catch (e) { return 0; }
}

function subscribeReviews() {
  if (unsubReviews) { unsubReviews(); unsubReviews = null; }
  reviewsFirstLoad = true;
  // Sin orderBy: así no hace falta crear un índice de collectionGroup.
  unsubReviews = onSnapshot(collectionGroup(db, "reviews"), (qs) => {
    // Avisar solo de revisiones nuevas/actualizadas sin atender (no en la carga inicial).
    if (!reviewsFirstLoad) {
      qs.docChanges().forEach((ch) => {
        if (ch.type === "added" || ch.type === "modified") {
          const d = ch.doc.data();
          if (!d.attended) {
            const code = ch.doc.ref.parent.parent ? ch.doc.ref.parent.parent.id : "?";
            notifyNewReview(code, d);
          }
        }
      });
    }
    reviewsFirstLoad = false;

    const rows = [];
    qs.forEach((d) => {
      const code = d.ref.parent.parent ? d.ref.parent.parent.id : "?";
      rows.push({ code, videoId: d.id, ...d.data() });
    });
    // No atendidas primero; dentro de cada grupo, más recientes primero.
    rows.sort((a, b) => {
      const an = a.attended ? 1 : 0, bn = b.attended ? 1 : 0;
      if (an !== bn) return an - bn;
      return tsMillis(b.updatedAt) - tsMillis(a.updatedAt);
    });
    renderReviews(rows);
  }, (err) => {
    console.error("reviews snapshot:", err);
    note("No se pudieron cargar las revisiones (revisa la consola).", 6000);
  });
}

function renderReviews(rows) {
  const list = $("reviews-list");
  const pending = rows.filter((r) => !r.attended).length;
  updateTitle(pending);
  $("reviews-empty").style.display = rows.length ? "none" : "";
  list.innerHTML = "";
  rows.forEach((r) => {
    const cli = clientsCache[r.code];
    const cliName = cli ? cli.name : r.code;
    const card = document.createElement("article");
    card.className = "review-card" + (r.attended ? " attended" : "");
    card.innerHTML = `
      <div class="review-top">
        <span class="status-pill ${STATUS_CLASS[r.status] || "pending"}">
          <span class="dot ${r.status === "approved" ? "ok" : r.status === "changes" ? "changes" : "pending"}"></span>
          ${STATUS_LABEL[r.status] || "Pendiente"}
        </span>
        <span class="review-time">${esc(fmtTime(r.updatedAt))}</span>
      </div>
      <div class="review-meta">
        ${r.attended ? "" : `<span class="new-pill">NUEVA</span>`}
        <b>${esc(cliName)}</b> · ${esc(r.videoTitle || r.videoId)}${r.videoVersion ? " (" + esc(r.videoVersion) + ")" : ""}
        <span class="review-code">${esc(r.code)}</span>
      </div>
      ${r.comment ? `<p class="review-comment">${esc(r.comment)}</p>` : `<p class="review-comment muted">Sin comentarios.</p>`}
      <div class="review-actions-admin">
        ${r.attended
          ? `<span class="attended-label">✓ Atendida</span>`
          : `<button class="btn btn-ghost btn-xs" data-attend="${esc(r.code)}|${esc(r.videoId)}">Marcar como atendida</button>`}
      </div>
    `;
    list.appendChild(card);
  });

  list.querySelectorAll("[data-attend]").forEach((b) =>
    b.addEventListener("click", () => {
      const [code, vid] = b.getAttribute("data-attend").split("|");
      markAttended(code, vid);
    }));
}

async function markAttended(code, videoId) {
  try {
    await setDoc(doc(db, "clients", code, "reviews", videoId),
      { attended: true, attendedAt: serverTimestamp() }, { merge: true });
    // El onSnapshot re-renderiza solo.
  } catch (e) {
    console.error(e);
    note("No se pudo marcar como atendida.", 6000);
  }
}

/* ============================================================================
   CLIENTES
   ============================================================================ */
async function loadClients() {
  try {
    const qs = await getDocs(collection(db, "clients"));
    clientsCache = {};
    const arr = [];
    qs.forEach((d) => { clientsCache[d.id] = d.data(); arr.push({ code: d.id, ...d.data() }); });
    arr.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    renderClients(arr);
  } catch (e) {
    console.error(e);
    note("No se pudieron cargar los clientes.", 6000);
  }
}

function renderClients(arr) {
  const list = $("clients-list");
  list.innerHTML = "";
  if (!arr.length) {
    list.innerHTML = '<div class="empty">Aún no hay clientes. Crea uno arriba o pulsa "Importar datos iniciales".</div>';
    return;
  }

  arr.forEach((c) => {
    const videos = Array.isArray(c.videos) ? c.videos : [];
    const card = document.createElement("article");
    card.className = "admin-client-card";

    const videoRows = videos.length
      ? videos.map((v) => `
          <li class="admin-video-row">
            <div>
              <b>${esc(v.title || v.id)}</b> ${v.version ? `<span class="version-tag inline">${esc(v.version)}</span>` : ""}
              <div class="admin-video-src">${esc(v.src || "")}</div>
            </div>
            <div class="admin-video-actions">
              <button class="btn btn-ghost btn-xs" data-edit-video="${esc(c.code)}|${esc(v.id)}">Editar</button>
              <button class="btn btn-ghost btn-xs danger" data-del-video="${esc(c.code)}|${esc(v.id)}">Borrar</button>
            </div>
          </li>`).join("")
      : `<li class="admin-video-row muted">Sin videos todavía.</li>`;

    card.innerHTML = `
      <div class="admin-client-head">
        <div>
          <h3 class="card-title">${esc(c.name || c.code)}</h3>
          <p class="card-desc">${esc(c.project || "")} · Código: <b>${esc(c.code)}</b></p>
        </div>
        <div class="admin-client-actions">
          <button class="btn btn-ghost btn-xs" data-copy-link="${esc(c.code)}">Copiar enlace</button>
          <button class="btn btn-ghost btn-xs" data-edit-client="${esc(c.code)}">Editar</button>
          <button class="btn btn-ghost btn-xs danger" data-del-client="${esc(c.code)}">Borrar</button>
        </div>
      </div>

      <ul class="admin-video-list">${videoRows}</ul>

      <form class="admin-form admin-video-form" data-video-form="${esc(c.code)}">
        <h5>Añadir / editar video</h5>
        <div class="admin-form-grid">
          <input class="code-input" data-vf="id" type="text" placeholder="id único (ej. piscina)" />
          <input class="code-input" data-vf="title" type="text" placeholder="Título (ej. Reel - Piscina)" />
          <input class="code-input" data-vf="src" type="text" placeholder="Ruta del MP4 (videos/aura/reel.mp4)" />
          <input class="code-input" data-vf="poster" type="text" placeholder="Poster (opcional)" />
          <input class="code-input" data-vf="version" type="text" placeholder="Versión (ej. v1)" />
          <input class="code-input" data-vf="tags" type="text" placeholder="Etiquetas separadas por coma" />
        </div>
        <input class="code-input" data-vf="description" type="text" placeholder="Descripción (opcional)" style="margin-top:.5rem" />
        <div class="admin-form-actions">
          <button type="submit" class="btn btn-primary btn-sm">Guardar video</button>
          <button type="button" class="btn btn-ghost btn-sm" data-vf-reset>Limpiar</button>
        </div>
      </form>
    `;
    list.appendChild(card);
  });

  bindClientListEvents();
}

function bindClientListEvents() {
  const list = $("clients-list");

  list.querySelectorAll("[data-copy-link]").forEach((b) =>
    b.addEventListener("click", () => copyAccessLink(b.getAttribute("data-copy-link"))));

  list.querySelectorAll("[data-edit-client]").forEach((b) =>
    b.addEventListener("click", () => startEditClient(b.getAttribute("data-edit-client"))));

  list.querySelectorAll("[data-del-client]").forEach((b) =>
    b.addEventListener("click", () => deleteClient(b.getAttribute("data-del-client"))));

  list.querySelectorAll("[data-del-video]").forEach((b) =>
    b.addEventListener("click", () => {
      const [code, vid] = b.getAttribute("data-del-video").split("|");
      deleteVideo(code, vid);
    }));

  list.querySelectorAll("[data-edit-video]").forEach((b) =>
    b.addEventListener("click", () => {
      const [code, vid] = b.getAttribute("data-edit-video").split("|");
      fillVideoForm(code, vid);
    }));

  list.querySelectorAll("[data-video-form]").forEach((f) => {
    const code = f.getAttribute("data-video-form");
    f.addEventListener("submit", (e) => { e.preventDefault(); saveVideo(code, f); });
    f.querySelector("[data-vf-reset]").addEventListener("click", () => f.reset());
  });
}

/* ---------- Alta / edición de cliente ---------- */
function bindClientForm() {
  $("client-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const code = normCode($("cf-code").value);
    const name = $("cf-name").value.trim();
    const project = $("cf-project").value.trim();
    if (!code || !name) { note("Código y nombre son obligatorios."); return; }

    try {
      const ref = doc(db, "clients", code);
      if (editingCode) {
        // Editar: no tocamos videos.
        await setDoc(ref, { name, project }, { merge: true });
        note("Cliente actualizado.");
      } else {
        // Alta: crea con videos vacío si no existe.
        const existing = await getDoc(ref);
        const base = existing.exists() ? {} : { videos: [], createdAt: serverTimestamp() };
        await setDoc(ref, { name, project, ...base }, { merge: true });
        note("Cliente guardado.");
      }
      resetClientForm();
      loadClients();
    } catch (err) {
      console.error(err);
      note("No se pudo guardar el cliente.", 6000);
    }
  });

  $("cf-reset").addEventListener("click", resetClientForm);
}

function startEditClient(code) {
  const c = clientsCache[code];
  if (!c) return;
  editingCode = code;
  $("client-form-title").textContent = "Editar cliente: " + code;
  $("cf-code").value = code;
  $("cf-code").disabled = true;
  $("cf-name").value = c.name || "";
  $("cf-project").value = c.project || "";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetClientForm() {
  editingCode = null;
  $("client-form-title").textContent = "Nuevo cliente";
  $("cf-code").disabled = false;
  $("client-form").reset();
}

async function copyAccessLink(code) {
  const url = new URL("index.html", location.href);
  url.searchParams.set("code", code);
  const link = url.href;
  try {
    await navigator.clipboard.writeText(link);
    note("Enlace copiado: " + link, 6000);
  } catch (e) {
    // Fallback si el navegador bloquea el portapapeles.
    window.prompt("Copia el enlace de acceso:", link);
  }
}

async function deleteClient(code) {
  const c = clientsCache[code];
  const label = c ? c.name : code;
  if (!confirm(`¿Borrar el cliente "${label}" (${code}) y todos sus datos? Esta acción no se puede deshacer.`)) return;
  try {
    await deleteDoc(doc(db, "clients", code));
    note("Cliente borrado.");
    loadClients();
  } catch (e) {
    console.error(e);
    note("No se pudo borrar el cliente.", 6000);
  }
}

/* ---------- Videos ---------- */
function fillVideoForm(code, videoId) {
  const c = clientsCache[code];
  if (!c) return;
  const v = (c.videos || []).find((x) => x.id === videoId);
  if (!v) return;
  const form = document.querySelector(`[data-video-form="${CSS.escape(code)}"]`);
  if (!form) return;
  form.querySelector('[data-vf="id"]').value = v.id || "";
  form.querySelector('[data-vf="title"]').value = v.title || "";
  form.querySelector('[data-vf="src"]').value = v.src || "";
  form.querySelector('[data-vf="poster"]').value = v.poster || "";
  form.querySelector('[data-vf="version"]').value = v.version || "";
  form.querySelector('[data-vf="tags"]').value = (v.tags || []).join(", ");
  form.querySelector('[data-vf="description"]').value = v.description || "";
  form.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function saveVideo(code, form) {
  const get = (k) => form.querySelector(`[data-vf="${k}"]`).value.trim();
  const id = get("id");
  const title = get("title");
  const src = get("src");
  if (!id || !title || !src) { note("Video: id, título y ruta (src) son obligatorios."); return; }

  const video = {
    id, title, src,
    description: get("description"),
    poster: get("poster"),
    version: get("version"),
    tags: get("tags") ? get("tags").split(",").map((t) => t.trim()).filter(Boolean) : []
  };

  try {
    const ref = doc(db, "clients", code);
    const snap = await getDoc(ref);
    const data = snap.exists() ? snap.data() : {};
    const videos = Array.isArray(data.videos) ? data.videos.slice() : [];
    const idx = videos.findIndex((v) => v.id === id);
    if (idx >= 0) videos[idx] = video; else videos.push(video);
    await setDoc(ref, { videos }, { merge: true });
    note(idx >= 0 ? "Video actualizado." : "Video añadido.");
    form.reset();
    loadClients();
  } catch (e) {
    console.error(e);
    note("No se pudo guardar el video.", 6000);
  }
}

async function deleteVideo(code, videoId) {
  if (!confirm(`¿Borrar el video "${videoId}" de ${code}?`)) return;
  try {
    const ref = doc(db, "clients", code);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const videos = (snap.data().videos || []).filter((v) => v.id !== videoId);
    await setDoc(ref, { videos }, { merge: true });
    note("Video borrado.");
    loadClients();
  } catch (e) {
    console.error(e);
    note("No se pudo borrar el video.", 6000);
  }
}

/* ============================================================================
   IMPORTAR DATOS INICIALES (desde data/clients.js → window.PORTAL_DATA)
   ============================================================================ */
function bindImport() {
  $("import-btn").addEventListener("click", async () => {
    const data = window.PORTAL_DATA;
    if (!data || !Array.isArray(data.clients) || !data.clients.length) {
      note("No hay datos en data/clients.js para importar.", 6000);
      return;
    }
    if (!confirm(`Se importarán ${data.clients.length} cliente(s) desde data/clients.js. ¿Continuar?`)) return;

    let ok = 0;
    for (const c of data.clients) {
      const code = normCode(c.code || c.id);
      if (!code) continue;
      try {
        await setDoc(doc(db, "clients", code), {
          name: c.name || code,
          project: c.project || "",
          videos: Array.isArray(c.videos) ? c.videos : [],
          createdAt: serverTimestamp()
        }, { merge: true });
        ok++;
      } catch (e) {
        console.error("import", code, e);
      }
    }
    note(`Importación terminada: ${ok}/${data.clients.length} cliente(s).`, 6000);
    loadClients();
  });
}

/* ============================================================================
   INIT
   ============================================================================ */
function init() {
  bindAuth();
  bindClientForm();
  bindImport();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

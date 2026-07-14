/* ============================================================================
   Godínez Creativos — Portal de Entregas · Lógica del cliente (Firestore)
   ============================================================================
   - Acceso por código de cliente (el código es el ID del documento en Firestore).
   - Autenticación anónima de Firebase para poder leer/escribir revisiones.
   - Renderiza los videos del cliente activo (self-hosted, ruta en "src").
   - Reproductor en modal.
   - Revisión por video: Aprobar / Solicitar cambios + comentario.
   - Las revisiones se guardan en Firestore (clients/{CODE}/reviews/{videoId})
     y la agencia las ve en tiempo real desde el panel admin.
   ============================================================================ */

import {
  auth, db,
  signInAnonymously,
  doc, getDoc, setDoc,
  collection, onSnapshot, serverTimestamp
} from "./firebase-init.js";

/* ---------- Branding (estático, coincide con data/clients.js) ---------- */
const AGENCY = {
  name: "Godínez Creativos",
  tagline: "Portal de Entregas",
  contactEmail: "godinezcreativoss@gmail.com",
  website: "https://godinezcreativos.qzz.io"
};

const SESSION_KEY = "gdz-portal-session";

/* ---------- Estado ---------- */
let activeClient = null;   // { code, name, project, videos: [...] }
let activeVideo = null;
let pendingStatus = null;  // estado elegido en el modal antes de guardar
let reviews = {};          // { [videoId]: { status, comment } } — en vivo desde Firestore
let unsubReviews = null;   // función para cancelar el listener de revisiones

/* ---------- Helpers DOM ---------- */
const $ = (id) => document.getElementById(id);
const el = {};
[
  "login-view", "login-form", "code", "login-error", "demo-chips", "help-mail",
  "brand-name", "brand-sub",
  "dash-view", "client-badge", "logout-btn", "dash-eyebrow", "dash-client",
  "dash-project", "summary", "video-grid", "year", "foot-site",
  "modal-overlay", "modal-video", "modal-title", "modal-desc", "modal-close", "download-btn",
  "status-choices", "choice-approved", "choice-changes", "comment-box", "send-btn", "saved-note"
].forEach((k) => { el[k] = $(k); });

function setNote(msg, isError) {
  el["saved-note"].style.color = isError ? "#ff6a9c" : "";
  el["saved-note"].textContent = msg;
}

/* ---------- Utilidades ---------- */
function normCode(code) { return (code || "").trim().toUpperCase(); }
function esc(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
const STATUS_LABEL = { pending: "Pendiente", approved: "Aprobado", changes: "Cambios solicitados" };
const STATUS_CLASS = { pending: "pending", approved: "approved", changes: "changes" };

function getReview(videoId) {
  return reviews[videoId] || { status: "pending", comment: "" };
}

/* ---------- Branding desde config ---------- */
function applyBranding() {
  if (el["brand-name"]) el["brand-name"].textContent = AGENCY.name;
  if (el["brand-sub"]) el["brand-sub"].textContent = AGENCY.tagline;
  if (el.year) el.year.textContent = "2026";
  if (el["foot-site"]) {
    el["foot-site"].href = AGENCY.website;
    el["foot-site"].textContent = AGENCY.website.replace(/^https?:\/\//, "");
  }
  if (el["help-mail"]) el["help-mail"].href = "mailto:" + AGENCY.contactEmail;
}

/* ---------- Login por código ---------- */
async function attemptLogin(code) {
  const id = normCode(code);
  if (!id) return;
  el["login-error"].textContent = "Verificando…";
  try {
    const snap = await getDoc(doc(db, "clients", id));
    if (!snap.exists()) {
      el["login-error"].textContent = "Código no válido. Revisa e inténtalo de nuevo.";
      el.code.focus();
      return;
    }
    el["login-error"].textContent = "";
    startSession(id, snap.data());
  } catch (e) {
    console.error(e);
    el["login-error"].textContent = "No se pudo conectar. Inténtalo de nuevo en un momento.";
  }
}

function startSession(code, data) {
  activeClient = {
    code,
    name: data.name || code,
    project: data.project || "",
    videos: Array.isArray(data.videos) ? data.videos : []
  };
  try { sessionStorage.setItem(SESSION_KEY, code); } catch (e) {}
  subscribeReviews(code);
  renderDashboard();
  el["login-view"].classList.add("hidden");
  el["dash-view"].classList.remove("hidden");
  window.scrollTo(0, 0);
}

function logout() {
  if (unsubReviews) { unsubReviews(); unsubReviews = null; }
  activeClient = null;
  reviews = {};
  try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
  el.code.value = "";
  el["dash-view"].classList.add("hidden");
  el["login-view"].classList.remove("hidden");
}

/* ---------- Revisiones en tiempo real ---------- */
function subscribeReviews(code) {
  if (unsubReviews) { unsubReviews(); unsubReviews = null; }
  const col = collection(db, "clients", code, "reviews");
  unsubReviews = onSnapshot(col, (qs) => {
    reviews = {};
    qs.forEach((d) => { reviews[d.id] = d.data(); });
    if (activeClient) { renderSummary(); renderVideos(); }
  }, (err) => console.error("reviews snapshot:", err));
}

/* ---------- Dashboard ---------- */
function renderDashboard() {
  const c = activeClient;
  el["dash-client"].textContent = c.name;
  el["client-badge"].innerHTML = "Sesión: <b>" + esc(c.name) + "</b>";
  el["dash-project"].textContent = c.project ? "Proyecto: " + c.project : "";
  const n = (c.videos || []).length;
  el["dash-eyebrow"].textContent = n + (n === 1 ? " entrega" : " entregas");
  renderSummary();
  renderVideos();
}

function renderSummary() {
  const c = activeClient;
  const counts = { approved: 0, pending: 0, changes: 0 };
  (c.videos || []).forEach((v) => {
    const r = getReview(v.id);
    counts[r.status] = (counts[r.status] || 0) + 1;
  });
  el.summary.innerHTML = `
    <div class="stat"><span class="dot ok"></span><b>${counts.approved}</b><span>Aprobados</span></div>
    <div class="stat"><span class="dot pending"></span><b>${counts.pending}</b><span>Pendientes</span></div>
    <div class="stat"><span class="dot changes"></span><b>${counts.changes}</b><span>Con cambios</span></div>
  `;
}

function playIcon() {
  return '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
}
function filmIcon() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="#f60566" stroke-width="1.6">' +
    '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/></svg>';
}


function renderVideos() {
  const c = activeClient;
  const grid = el["video-grid"];
  grid.innerHTML = "";
  const videos = c.videos || [];

  if (!videos.length) {
    grid.innerHTML = '<div class="empty">Aún no hay videos en este proyecto. Vuelve pronto.</div>';
    return;
  }

  videos.forEach((v) => {
    const r = getReview(v.id);
    const card = document.createElement("article");
    card.className = "video-card";

    const posterStyle = v.poster ? ` style="background-image:url('${esc(v.poster)}')"` : "";
    const fallback = v.poster ? "" : `<div class="thumb-fallback">${filmIcon()}</div>`;
    const versionTag = v.version ? `<span class="version-tag">${esc(v.version)}</span>` : "";
    const tags = (v.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("");

    card.innerHTML = `
      <div class="thumb" data-video="${esc(v.id)}"${posterStyle}>
        ${versionTag}
        ${fallback}
        <div class="play-btn">${playIcon()}</div>
      </div>
      <div class="card-body">
        <h3 class="card-title">${esc(v.title)}</h3>
        ${v.description ? `<p class="card-desc">${esc(v.description)}</p>` : ""}
        ${tags ? `<div class="tags">${tags}</div>` : ""}
        <div class="status-row">
          <span class="status-pill ${STATUS_CLASS[r.status]}">
            <span class="dot ${r.status === "approved" ? "ok" : r.status === "changes" ? "changes" : "pending"}"></span>
            ${STATUS_LABEL[r.status]}
          </span>
        </div>
        <div class="card-actions">
          <button class="btn btn-primary btn-sm" data-open="${esc(v.id)}">Ver y revisar</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });

  // listeners
  grid.querySelectorAll("[data-video]").forEach((n) =>
    n.addEventListener("click", () => openModal(n.getAttribute("data-video"))));
  grid.querySelectorAll("[data-open]").forEach((n) =>
    n.addEventListener("click", () => openModal(n.getAttribute("data-open"))));
}

/* ---------- Modal / Reproductor ---------- */
function openModal(videoId) {
  const c = activeClient;
  const v = (c.videos || []).find((x) => x.id === videoId);
  if (!v) return;
  activeVideo = v;

  el["modal-title"].textContent = v.title;
  el["modal-desc"].textContent = v.description || "";
  el["modal-video"].src = v.src;
  if (v.poster) el["modal-video"].poster = v.poster;
  else el["modal-video"].removeAttribute("poster");
  el["modal-video"].load();

  // Enlace de descarga (para verlo sin depender del streaming).
  el["download-btn"].href = v.src;
  el["download-btn"].setAttribute("download", (v.title || v.id) + ".mp4");

  const r = getReview(v.id);
  pendingStatus = r.status === "pending" ? null : r.status;
  el["comment-box"].value = r.comment || "";
  el["saved-note"].textContent = "";
  updateChoiceUI();

  el["modal-overlay"].classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  el["modal-overlay"].classList.remove("open");
  const vid = el["modal-video"];
  vid.pause();
  vid.removeAttribute("src");
  vid.load();
  document.body.style.overflow = "";
  activeVideo = null;
}

function updateChoiceUI() {
  el["choice-approved"].classList.toggle("sel-approved", pendingStatus === "approved");
  el["choice-changes"].classList.toggle("sel-changes", pendingStatus === "changes");
}

/* ---------- Guardar / enviar revisión a Firestore ---------- */
async function persistReview() {
  if (!activeClient || !activeVideo) return null;
  const status = pendingStatus || "pending";
  const payload = {
    status,
    comment: el["comment-box"].value.trim(),
    videoTitle: activeVideo.title || activeVideo.id,
    videoVersion: activeVideo.version || "",
    attended: false,            // una revisión nueva/actualizada vuelve a estar "sin atender"
    updatedAt: serverTimestamp()
  };
  const ref = doc(db, "clients", activeClient.code, "reviews", activeVideo.id);
  await setDoc(ref, payload, { merge: true });
  return payload;
}

async function downloadVideo(v) {
  const btn = el["download-btn"];
  const original = "⬇ Descargar video";
  if (btn.classList.contains("busy")) return;
  btn.classList.add("busy");
  try {
    btn.textContent = "Descargando… 0%";
    const resp = await fetch(v.src);
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    const total = Number(resp.headers.get("Content-Length")) || 0;
    const reader = resp.body.getReader();
    const chunks = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      btn.textContent = total
        ? `Descargando… ${Math.round((received / total) * 100)}%`
        : `Descargando… ${(received / 1e6).toFixed(1)} MB`;
    }
    const url = URL.createObjectURL(new Blob(chunks, { type: "video/mp4" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = (v.title || v.id) + ".mp4";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    btn.textContent = "✓ Descargado — revisa tus descargas";
  } catch (e) {
    console.error(e);
    btn.textContent = "No se pudo descargar. Reintenta.";
  }
  setTimeout(() => { btn.textContent = original; btn.classList.remove("busy"); }, 3000);
}

async function sendFeedback() {
  // Obliga a elegir un estado antes de enviar.
  if (!pendingStatus) {
    setNote("Elige “Aprobar” o “Solicitar cambios” antes de enviar.", true);
    el["status-choices"].classList.remove("shake");
    void el["status-choices"].offsetWidth; // reinicia la animación
    el["status-choices"].classList.add("shake");
    return;
  }
  setNote("Enviando…", false);
  try {
    await persistReview();
    setNote("✓ ¡Listo! Tu revisión llegó a la agencia.", false);
  } catch (e) {
    console.error(e);
    setNote("No se pudo enviar. Inténtalo de nuevo.", true);
    return;
  }
  setTimeout(() => { setNote("", false); }, 4000);
}

/* ---------- Eventos ---------- */
function bindEvents() {
  el["login-form"].addEventListener("submit", (e) => {
    e.preventDefault();
    attemptLogin(el.code.value);
  });
  el.code.addEventListener("input", () => { el["login-error"].textContent = ""; });

  el["logout-btn"].addEventListener("click", logout);

  el["download-btn"].addEventListener("click", (e) => {
    e.preventDefault();
    if (activeVideo) downloadVideo(activeVideo);
  });

  el["modal-close"].addEventListener("click", closeModal);
  el["modal-overlay"].addEventListener("click", (e) => {
    if (e.target === el["modal-overlay"]) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && el["modal-overlay"].classList.contains("open")) closeModal();
  });

  el["choice-approved"].addEventListener("click", () => {
    pendingStatus = pendingStatus === "approved" ? null : "approved";
    updateChoiceUI();
  });
  el["choice-changes"].addEventListener("click", () => {
    pendingStatus = pendingStatus === "changes" ? null : "changes";
    updateChoiceUI();
  });

  el["send-btn"].addEventListener("click", sendFeedback);
}

/* ---------- Init ---------- */
async function init() {
  applyBranding();
  // Los chips de demostración requerían listar todos los clientes; con Firestore
  // eso no está permitido para el cliente (no se puede enumerar). Se ocultan.
  if (el["demo-chips"] && el["demo-chips"].parentElement) {
    el["demo-chips"].parentElement.style.display = "none";
  }
  bindEvents();

  // Autenticación anónima (necesaria para leer/escribir en Firestore).
  try {
    await signInAnonymously(auth);
  } catch (e) {
    console.error("Auth anónima falló:", e);
    el["login-error"].textContent =
      "No se pudo conectar con el servidor. Revisa la configuración de Firebase.";
    return;
  }

  // Enlace directo con código: index.html?code=AURA2026 → entra solo.
  const codeParam = new URLSearchParams(location.search).get("code");
  if (codeParam) { el.code.value = codeParam; attemptLogin(codeParam); return; }

  // Reanudar sesión si existe (mismo navegador).
  let saved = null;
  try { saved = sessionStorage.getItem(SESSION_KEY); } catch (e) {}
  if (saved) attemptLogin(saved);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

/* ============================================================================
   Godínez Creativos — Portal de Entregas · Lógica de la app
   ============================================================================
   - Acceso por código de cliente (lado cliente, no es seguridad real).
   - Renderiza los videos del cliente activo.
   - Reproductor en modal.
   - Revisión por video: Aprobar / Solicitar cambios + comentario.
   - Las revisiones se guardan en localStorage (por navegador del cliente).
   - "Enviar feedback" compone un correo con el resumen de la revisión.
   ============================================================================ */

(function () {
  "use strict";

  const DATA = window.PORTAL_DATA || { agency: {}, clients: [] };
  const STORE_KEY = "gdz-portal-reviews";
  const SESSION_KEY = "gdz-portal-session";

  /* ---------- Estado ---------- */
  let activeClient = null;
  let activeVideo = null;
  let pendingStatus = null; // estado seleccionado en el modal antes de guardar

  /* ---------- Helpers DOM ---------- */
  const $ = (id) => document.getElementById(id);
  const el = {};
  [
    "login-view", "login-form", "code", "login-error", "demo-chips", "help-mail",
    "brand-name", "brand-sub",
    "dash-view", "client-badge", "logout-btn", "dash-eyebrow", "dash-client",
    "dash-project", "summary", "video-grid", "year", "foot-site",
    "modal-overlay", "modal-video", "modal-title", "modal-desc", "modal-close",
    "choice-approved", "choice-changes", "comment-box", "save-btn", "send-btn", "saved-note"
  ].forEach((k) => { el[k] = $(k); });

  /* ---------- Persistencia de revisiones ---------- */
  function loadReviews() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveReviews(obj) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(obj)); } catch (e) {}
  }
  function reviewKey(clientId, videoId) { return clientId + "::" + videoId; }
  function getReview(clientId, videoId) {
    return loadReviews()[reviewKey(clientId, videoId)] || { status: "pending", comment: "" };
  }
  function setReview(clientId, videoId, review) {
    const all = loadReviews();
    all[reviewKey(clientId, videoId)] = review;
    saveReviews(all);
  }

  /* ---------- Utilidades ---------- */
  function findClientByCode(code) {
    const norm = (code || "").trim().toUpperCase();
    return DATA.clients.find((c) => (c.code || "").toUpperCase() === norm) || null;
  }
  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  const STATUS_LABEL = { pending: "Pendiente", approved: "Aprobado", changes: "Cambios solicitados" };
  const STATUS_CLASS = { pending: "pending", approved: "approved", changes: "changes" };

  /* ---------- Branding desde config ---------- */
  function applyBranding() {
    const a = DATA.agency || {};
    if (a.name) { el["brand-name"].textContent = a.name; }
    if (a.tagline) { el["brand-sub"].textContent = a.tagline; }
    if (el.year) el.year.textContent = "2026";
    if (a.website) {
      el["foot-site"].href = a.website;
      el["foot-site"].textContent = a.website.replace(/^https?:\/\//, "");
    }
    if (a.contactEmail) {
      el["help-mail"].href = "mailto:" + a.contactEmail;
    }
  }

  /* ---------- Chips de demostración ---------- */
  function renderDemoChips() {
    el["demo-chips"].innerHTML = "";
    DATA.clients.forEach((c) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "demo-chip";
      chip.textContent = c.code;
      chip.title = "Entrar como " + c.name;
      chip.addEventListener("click", () => {
        el.code.value = c.code;
        el["login-form"].requestSubmit();
      });
      el["demo-chips"].appendChild(chip);
    });
  }

  /* ---------- Login ---------- */
  function attemptLogin(code) {
    const client = findClientByCode(code);
    if (!client) {
      el["login-error"].textContent = "Código no válido. Revisa e inténtalo de nuevo.";
      el.code.focus();
      return;
    }
    el["login-error"].textContent = "";
    startSession(client);
  }

  function startSession(client) {
    activeClient = client;
    try { sessionStorage.setItem(SESSION_KEY, client.code); } catch (e) {}
    renderDashboard();
    el["login-view"].classList.add("hidden");
    el["dash-view"].classList.remove("hidden");
    window.scrollTo(0, 0);
  }

  function logout() {
    activeClient = null;
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
    el.code.value = "";
    el["dash-view"].classList.add("hidden");
    el["login-view"].classList.remove("hidden");
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
      const r = getReview(c.id, v.id);
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
      const r = getReview(c.id, v.id);
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

    const r = getReview(c.id, v.id);
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

  function saveCurrentReview(showNote) {
    if (!activeClient || !activeVideo) return null;
    const status = pendingStatus || "pending";
    const review = { status: status, comment: el["comment-box"].value.trim(), updated: "2026" };
    setReview(activeClient.id, activeVideo.id, review);
    renderSummary();
    renderVideos();
    if (showNote) {
      el["saved-note"].textContent = "✓ Revisión guardada en este dispositivo.";
      setTimeout(() => { el["saved-note"].textContent = ""; }, 3000);
    }
    return review;
  }

  function sendFeedback() {
    const review = saveCurrentReview(false);
    if (!review) return;
    const a = DATA.agency || {};
    const to = a.contactEmail || "";
    const statusText = STATUS_LABEL[review.status] || "Pendiente";
    const subject = `[${activeClient.name}] Revisión: ${activeVideo.title}`;
    const bodyLines = [
      `Cliente: ${activeClient.name}`,
      `Proyecto: ${activeClient.project || "-"}`,
      `Video: ${activeVideo.title}${activeVideo.version ? " (" + activeVideo.version + ")" : ""}`,
      ``,
      `Estado: ${statusText}`,
      ``,
      `Comentarios:`,
      review.comment || "(sin comentarios)"
    ];
    const href = "mailto:" + encodeURIComponent(to) +
      "?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(bodyLines.join("\n"));
    window.location.href = href;
    el["saved-note"].textContent = "✓ Abriendo tu correo con el feedback…";
    setTimeout(() => { el["saved-note"].textContent = ""; }, 4000);
  }

  /* ---------- Eventos ---------- */
  function bindEvents() {
    el["login-form"].addEventListener("submit", (e) => {
      e.preventDefault();
      attemptLogin(el.code.value);
    });
    el.code.addEventListener("input", () => { el["login-error"].textContent = ""; });

    el["logout-btn"].addEventListener("click", logout);

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

    el["save-btn"].addEventListener("click", () => saveCurrentReview(true));
    el["send-btn"].addEventListener("click", sendFeedback);
  }

  /* ---------- Init ---------- */
  function init() {
    if (!DATA.clients || !DATA.clients.length) {
      el["login-error"].textContent = "No hay clientes configurados. Edita data/clients.js.";
    }
    applyBranding();
    renderDemoChips();
    bindEvents();

    // Reanudar sesión si existe (mismo navegador)
    let saved = null;
    try { saved = sessionStorage.getItem(SESSION_KEY); } catch (e) {}
    if (saved) {
      const c = findClientByCode(saved);
      if (c) startSession(c);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

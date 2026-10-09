// ---- Store settings: edit these ----
const CONFIG = {
  whatsapp: "6285365855226",              // 0853-6585-5226 in international format
  tiktok: "https://www.tiktok.com/@premiumperabot",
  instagram: "",                          // e.g. "https://www.instagram.com/username" (hidden if empty)
  mapsQuery: "Warehouse Premium Perabot, Tanjung Pauh, Payakumbuh Barat, Payakumbuh City, West Sumatra 26223",
  // Public API of the admin app (Google Apps Script "Link Publik"): catalog, order form, tracking.
  api: "https://script.google.com/macros/s/AKfycbx0-lUR6IlsUceei2AJ3VSQBe9AJB9YeZEBc6Yj21uCx-bbaENkhDeVN2IjKUdyTBfJIA/exec",
  staffUrl: "staf/",
};

const CATEGORY_LABELS = {
  all: "Semua",
  kamarset: "Kamar Set",
  sofa: "Sofa",
  "meja-makan": "Meja Makan",
  lemari: "Lemari",
  "meja-kursi": "Meja & Kursi",
  lainnya: "Lainnya",
};
const PAGE = 24;

// TikTok gallery = generated data/products.js + edits made by Admin/Staf in the app (Katalog Web):
// new title or category, hidden, or "unggulan" (pinned first). Edits are cached so hidden items never flash.
const BASE_PRODUCTS = window.PRODUCTS || [];
const EDITS_KEY = "pp_katalog_edit";
function cachedEdits() { try { return JSON.parse(localStorage.getItem(EDITS_KEY) || "[]"); } catch (e) { return []; } }
function editedProducts(edits) {
  const map = new Map(edits.map((e) => [String(e.id), e]));
  return BASE_PRODUCTS.filter((p) => !map.get(p.id)?.sembunyikan).map((p) => {
    const e = map.get(p.id);
    return e ? { ...p, title: e.judul || p.title, cat: e.kategori || p.cat, pinned: !!e.unggulan, harga: Number(e.harga) || 0 } : p;
  });
}
let products = editedProducts(cachedEdits());
const pinnedFirst = (a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
const params = new URLSearchParams(location.search);
const state = { cat: params.get("cat") || "all", q: "", sort: params.get("sort") === "popular" ? "popular" : "new", shown: PAGE };
const PAGE_ID = document.body.dataset.page || "index";

// Old WhatsApp nota links pointed to index.html?nota=…#lacak — send them to the tracking page.
if (PAGE_ID === "index" && params.get("nota")) location.replace("lacak.html?nota=" + encodeURIComponent(params.get("nota")));

const $ = (s, el = document) => el.querySelector(s);
const waLink = (msg) => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`;
const fmtNum = (n) => new Intl.NumberFormat("id-ID").format(n);
const fmtViews = (n) => n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(".", ",")} jt` : n >= 1e3 ? `${Math.round(n / 1e3)} rb` : String(n);

// ---- Contact links ----
const defaultMsg = "Halo Premium Perabot, saya mau tanya-tanya produk furniturnya.";
document.querySelectorAll(".js-wa").forEach((a) => (a.href = waLink(defaultMsg)));
document.querySelectorAll(".js-wa-text").forEach((a) => (a.textContent = "0" + CONFIG.whatsapp.slice(2).replace(/(\d{3})(\d{4})(\d+)/, "$1-$2-$3")));
document.querySelectorAll(".js-tiktok").forEach((a) => (a.href = CONFIG.tiktok));
if (CONFIG.instagram) {
  document.querySelectorAll(".js-ig-row").forEach((el) => (el.hidden = false));
  document.querySelectorAll(".js-ig").forEach((a) => { a.href = CONFIG.instagram; a.textContent = CONFIG.instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//, "@").replace(/\/$/, ""); });
}
const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CONFIG.mapsQuery)}`;
document.querySelectorAll(".js-maps").forEach((a) => (a.href = mapsUrl));
if ($(".js-map-embed")) $(".js-map-embed").src = `https://www.google.com/maps?q=${encodeURIComponent(CONFIG.mapsQuery)}&output=embed`;
$("#year").textContent = new Date().getFullYear();

// ---- Mobile menu ----
$("#menu-btn").addEventListener("click", () => {
  const open = document.body.classList.toggle("nav-open");
  $("#menu-btn").setAttribute("aria-expanded", String(open));
});

// ---- Stats ----
if (products.length && $("#stat-products")) $("#stat-products").textContent = `${Math.floor(products.length / 50) * 50}+`;
if (window.STATS?.views && $("#stat-views")) {
  const jt = Math.floor(window.STATS.views / 1e5) / 10;
  $("#stat-views").textContent = `${String(jt).replace(".", ",")} juta+`;
}

// ---- Catalog ----
function renderChips() {
  if (!$("#cat-tiles")) return;
  const linkOut = $("#cat-tiles").dataset.link;
  const counts = {}, cover = {};
  for (const p of products) {
    counts[p.cat] = (counts[p.cat] || 0) + 1;
    if (!cover[p.cat] || p.views > cover[p.cat].views) cover[p.cat] = p;
  }
  const top = products.reduce((m, p) => (p.views > (m?.views || 0) ? p : m), null);
  const cats = ["all", ...Object.keys(CATEGORY_LABELS).filter((c) => counts[c] && c !== "all")];
  $("#cat-tiles").innerHTML = cats.map((c) => {
    const img = (c === "all" ? top : cover[c])?.img || "";
    const inner = `<span class="cat-img"><img src="${img}" alt="" loading="lazy"></span>
      <span class="cat-name">${CATEGORY_LABELS[c]}</span>
      <span class="cat-count">${c === "all" ? products.length : counts[c]} produk</span>`;
    return linkOut
      ? `<a class="cat-tile" href="${linkOut}${c === "all" ? "" : "?cat=" + c}">${inner}</a>`
      : `<button class="cat-tile" data-cat="${c}" aria-pressed="${c === state.cat}">${inner}</button>`;
  }).join("");
  if ($("#catalog-title")) $("#catalog-title").textContent = state.cat === "all" ? "Semua produk" : CATEGORY_LABELS[state.cat];
}

function filtered() {
  const q = state.q.trim().toLowerCase();
  const list = products.filter((p) =>
    (state.cat === "all" || p.cat === state.cat) &&
    (!q || p.title.toLowerCase().includes(q))
  );
  const sorters = {
    new: (a, b) => b.date.localeCompare(a.date),
    popular: (a, b) => b.views - a.views,
  };
  return list.sort((a, b) => pinnedFirst(a, b) || sorters[state.sort](a, b));
}

const recentCutoff = [...products].sort((a, b) => b.date.localeCompare(a.date))[Math.min(11, products.length - 1)]?.date || "";
const popularCutoff = [...products].sort((a, b) => b.views - a.views)[Math.min(19, products.length - 1)]?.views || Infinity;
// Values from the sheet can be numbers (e.g. an all-digit nota), so always convert to text first.
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// TikTok captions carry old prices, so they are never shown. A price appears only when Admin sets one
// in the app (Katalog Web); otherwise "Call / WhatsApp".
const ASK_PRICE = '<p class="price price-ask"><sup>Rp</sup><b>Call / WhatsApp</b></p>';
const priceOf = (p) => (p.harga ? `<p class="price"><sup>Rp</sup><b>${Math.round(p.harga).toLocaleString("id-ID")}</b></p>` : ASK_PRICE);

function card(p, { showPrice = true } = {}) {
  const badge = p.date >= recentCutoff ? `<span class="badge badge-new">Baru</span>`
    : p.views >= popularCutoff ? `<span class="badge badge-hot">Terlaris</span>` : "";
  return `
    <article class="card" data-id="${p.id}" tabindex="0" role="button" aria-label="Tonton video ${esc(p.title)}">
      <div class="card-img">
        <img src="${p.img}" alt="${esc(p.title)}" loading="lazy" decoding="async">
        <span class="play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span>
      </div>
      <div class="card-body">
        ${badge}
        <h3>${esc(p.title)}</h3>
        <p class="card-cat">${p.cat ? CATEGORY_LABELS[p.cat] : "Pengantaran"} · ${fmtViews(p.views)} views</p>
        ${showPrice ? priceOf(p) : ""}
      </div>
    </article>`;
}

function renderGrid() {
  if (!$("#grid")) return;
  const list = filtered();
  $("#grid").innerHTML = list.length
    ? list.slice(0, state.shown).map((p) => card(p)).join("")
    : `<p class="empty">Tidak ada produk yang cocok. Coba kata kunci lain, atau <a href="${waLink("Halo, saya mencari: " + state.q)}" target="_blank" rel="noopener">tanya langsung lewat WhatsApp</a>.</p>`;
  $("#count").textContent = `${fmtNum(list.length)} produk`;
  $("#more").hidden = list.length <= state.shown;
}

if ($("#grid")) {
  $("#cat-tiles").addEventListener("click", (e) => {
    const b = e.target.closest("button.cat-tile");
    if (!b) return;
    state.cat = b.dataset.cat;
    state.shown = PAGE;
    history.replaceState(null, "", state.cat === "all" ? "katalog.html" : `katalog.html?cat=${state.cat}`);
    renderChips();
    renderGrid();
  });
  let t;
  $("#q").addEventListener("input", (e) => {
    clearTimeout(t);
    t = setTimeout(() => { state.q = e.target.value; state.shown = PAGE; renderGrid(); }, 150);
  });
  $("#sort").value = state.sort;
  $("#sort").addEventListener("change", (e) => { state.sort = e.target.value; renderGrid(); });
  $("#more").addEventListener("click", () => { state.shown += PAGE; renderGrid(); });
}

// ---- Home: unggulan first, then most watched ----
function renderHome() {
  if ($("#home-grid")) $("#home-grid").innerHTML = [...products].sort((a, b) => pinnedFirst(a, b) || b.views - a.views).slice(0, 8).map((p) => card(p)).join("");
}
renderHome();

// ---- Deliveries ----
if ($("#deliveries")) $("#deliveries").innerHTML = (window.DELIVERIES || []).slice(0, 4).map((p) => card(p, { showPrice: false })).join("");

// ---- Video player (TikTok official embed player) ----
const buildById = () => new Map([...products, ...(window.DELIVERIES || [])].map((p) => [p.id, p]));
let byId = buildById();
const dlg = $("#player");

function openPlayer(id) {
  const p = byId.get(id);
  if (!p) return;
  $("#player-iframe").src = `https://www.tiktok.com/player/v1/${p.id}?autoplay=1&loop=1&rel=0&description=0&music_info=0`;
  $("#player-cat").textContent = p.cat ? CATEGORY_LABELS[p.cat] : "Pengantaran";
  $("#player-title").textContent = p.title;
  $("#player-price").outerHTML = (p.cat ? priceOf(p) : '<p class="price"></p>').replace('<p class="price', '<p id="player-price" class="price');
  $("#player-wa").href = waLink(`Halo Premium Perabot, saya tertarik dengan "${p.title}". Apakah masih tersedia? ${p.url}`);
  $("#player-link").href = p.url;
  $("#player-order").onclick = () => { closePlayer(); addToOrder(p.title); };
  dlg.showModal();
}
function closePlayer() {
  dlg.close();
}
dlg.addEventListener("close", () => ($("#player-iframe").src = "about:blank"));
$("#player-close").addEventListener("click", closePlayer);
dlg.addEventListener("click", (e) => { if (e.target === dlg) closePlayer(); });

document.addEventListener("click", (e) => {
  const add = e.target.closest("[data-pesan]");
  if (add) { e.stopPropagation(); addToOrder(add.dataset.pesan); return; }
  const c = e.target.closest(".card");
  if (c && c.dataset.id) openPlayer(c.dataset.id);
});
document.addEventListener("keydown", (e) => {
  const c = e.target.closest?.(".card");
  if (c && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openPlayer(c.dataset.id); }
});

renderChips();
renderGrid();

// =========================================================
// Connection to the admin app (public API)
// =========================================================
async function callApi(params, body) {
  const url = CONFIG.api + "?" + new URLSearchParams(params);
  const res = await fetch(url, body
    ? { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "text/plain;charset=utf-8" } }
    : {});
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "Terjadi kesalahan");
  return data.data;
}

const fmtRp = (n) => "Rp " + Math.round(n).toLocaleString("id-ID");
const fdateId = (s) => {
  if (!s) return "-";
  const [y, m, d] = String(s).slice(0, 10).split("-");
  return `${+d} ${["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"][+m - 1]} ${y}`;
};
const tiktokId = (u) => (String(u || "").match(/video\/(\d+)/) || [])[1] || "";
const cleanErr = (e) => String(e.message || e).replace(/^Error:\s*/, "");

// ---- Products & prices from the admin app ----
async function loadApiCatalog() {
  try {
    const { products } = await callApi({ api: "catalog" });
    if (!products.length) return;
    $("#api-grid").innerHTML = products.map((p) => {
      const vid = tiktokId(p.tiktok);
      const local = vid && byId.get(vid);
      const img = p.foto || (local ? local.img : "") || "img/logo-mark.svg";
      return `<article class="card" ${local ? `data-id="${vid}" tabindex="0" role="button"` : ""}>
        <div class="card-img"><img src="${esc(img)}" alt="${esc(p.nama)}" loading="lazy" ${img.endsWith(".svg") ? 'style="object-fit:contain;padding:28%"' : ""}>
          ${local ? '<span class="play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span>' : ""}</div>
        <div class="card-body">
          <h3>${esc(p.nama)}</h3>
          <p class="card-cat">${esc(p.kategori)}${p.deskripsi ? " · " + esc(p.deskripsi) : ""}</p>
          ${p.harga ? `<p class="price"><sup>Rp</sup><b>${Math.round(p.harga).toLocaleString("id-ID")}</b></p>` : '<p class="card-cat">Harga: tanya via WhatsApp</p>'}
          <button class="btn btn-outline btn-sm" style="margin-top:10px" data-pesan="${esc(p.nama)}">+ Pesan</button>
        </div>
      </article>`;
    }).join("");
    $("#produk").hidden = false;
  } catch (e) {
    console.warn("Katalog admin tidak tersedia:", e.message);
  }
}

/* ---- Customer account (Guest): phone + password. Browsing is open; ordering needs an account. ---- */
const ACCT_KEY = "pp_akun";
const account = {
  get() { try { return JSON.parse(localStorage.getItem(ACCT_KEY) || "null"); } catch (e) { return null; } },
  set(v) {
    try { v ? localStorage.setItem(ACCT_KEY, JSON.stringify(v)) : localStorage.removeItem(ACCT_KEY); } catch (e) { /* storage blocked */ }
    renderUserbar();
  },
};
const signedIn = () => !!account.get()?.token;

/** Calls that need the account: the token goes in the POST body. An expired session signs the visitor out. */
async function callAccount(api, body = {}, { quiet = false } = {}) {
  const a = account.get();
  if (!a?.token) throw new Error("SESI_HABIS");
  try {
    return await callApi({ api }, { ...body, token: a.token });
  } catch (e) {
    if (/SESI_HABIS/.test(e.message)) {
      account.set(null);
      cart.set([], { sync: false });
      if (!quiet) openAuth("guest", "Sesi Anda berakhir. Silakan masuk lagi.");
    }
    throw e;
  }
}

function renderUserbar() {
  const a = account.get();
  if ($("#ub-name")) $("#ub-name").textContent = a ? a.akun.nama.split(" ")[0] : "Login";
  $("#ub-login")?.classList.toggle("is-in", !!a);
}

/* ---- Cart ("keranjang"): kept in the account, cached on this device ---- */
const CART_KEY = "pp_pesanan";
let cartTimer;
const cart = {
  get() { try { return JSON.parse(localStorage.getItem(CART_KEY) || "[]"); } catch (e) { return []; } },
  set(list, { sync = true } = {}) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(list)); } catch (e) { /* storage blocked */ }
    updateCartBadge();
    if (sync && signedIn()) {
      clearTimeout(cartTimer);
      cartTimer = setTimeout(() => callAccount("keranjang", { items: cart.get() }, { quiet: true }).catch(() => {}), 400);
    }
  },
};
function updateCartBadge() {
  const n = signedIn() ? cart.get().length : 0, el = $("#cart-count");
  if (el) { el.textContent = n; el.hidden = !n; }
}
let toastTimer;
function toast(html) {
  const el = $("#toast");
  el.innerHTML = html;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 4000);
}

/* ---- Login popup: Admin / Staf / Guest ---- */
const authDlg = $("#auth");
let afterLogin = null;

function showGuestForm(which) {
  ["login", "register", "forgot"].forEach((k) => ($(`#guest-${k}`).hidden = k !== which));
  $(`#guest-${which} input:not([readonly])`)?.focus();
}
function openAuth(tab = "guest", note = "") {
  if (tab === "guest" && signedIn()) tab = "account";
  authDlg.querySelectorAll("[data-tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === tab)));
  $(".auth-tabs", authDlg).hidden = tab === "account";
  authDlg.querySelectorAll("[data-panel]").forEach((p) => (p.hidden = p.dataset.panel !== tab));
  $("#auth-note").textContent = note;
  $("#auth-note").hidden = !note;
  authDlg.querySelectorAll(".form-msg").forEach((m) => { m.textContent = ""; m.className = "form-msg"; });
  if (tab === "guest") showGuestForm("login");
  if (tab === "account") {
    const a = account.get();
    $("#acct-name").textContent = a.akun.nama;
    $("#acct-hp").textContent = a.akun.hp;
  }
  if (!authDlg.open) authDlg.showModal();
}
/** Run `then` now if signed in, otherwise after the visitor signs in or registers. */
function requireLogin(note, then) {
  if (signedIn()) return then();
  afterLogin = then;
  openAuth("guest", note);
}
function signedInAs(data) {
  account.set({ token: data.token, akun: data.akun });
  const merged = [...new Set([...(data.keranjang || []), ...cart.get()])];
  cart.set(merged, { sync: merged.length !== (data.keranjang || []).length });
  authDlg.close();
  toast(`Halo, <b>${esc(data.akun.nama.split(" ")[0])}</b>! Anda sudah masuk.`);
  const next = afterLogin;
  afterLogin = null;
  if (next) next(); else refreshPage();
}

authDlg.addEventListener("close", () => { afterLogin = null; });
authDlg.addEventListener("click", (e) => {
  if (e.target === authDlg) authDlg.close();
  const tab = e.target.closest("[data-tab]");
  if (tab) openAuth(tab.dataset.tab);
  const g = e.target.closest("[data-guest]");
  if (g) { e.preventDefault(); showGuestForm(g.dataset.guest); }
});
$("#auth-close").addEventListener("click", () => authDlg.close());

function bindForm(form, run) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(form));
    const msg = $(".form-msg", form), btn = $("button[type=submit]", form), label = btn.textContent;
    msg.className = "form-msg";
    msg.textContent = "";
    btn.disabled = true;
    btn.textContent = "Mohon tunggu…";
    try {
      await run(f, msg);
    } catch (err) {
      msg.textContent = cleanErr(err);
      msg.classList.add("err");
    } finally {
      btn.disabled = false;
      btn.textContent = label;
    }
  });
}

bindForm($("#guest-login"), async (f) => signedInAs(await callApi({ api: "masuk" }, { hp: f.hp, pass: f.pass })));
bindForm($("#guest-register"), async (f) => {
  if (f.nama.trim().length < 2) throw new Error("Isi nama Anda.");
  if (f.pass.length < 6) throw new Error("Password minimal 6 karakter.");
  if (f.pass !== f.pass2) throw new Error("Ulangi password tidak sama.");
  signedInAs(await callApi({ api: "daftar" }, f));
});
bindForm($("#guest-forgot"), async (f, msg) => {
  await callApi({ api: "lupa" }, { hp: f.hp });
  msg.textContent = "Permintaan terkirim. Admin kami akan mengirim password baru lewat WhatsApp ke nomor tersebut.";
});
bindForm($("#staf-form"), async (f) => {
  const { code } = await callApi({ api: "staf" }, { nama: f.nama, pin: f.pin });
  location.href = CONFIG.staffUrl + "?c=" + code;
});
$("#acct-logout").addEventListener("click", async () => {
  const a = account.get();
  account.set(null);
  cart.set([], { sync: false });
  authDlg.close();
  toast("Anda sudah keluar.");
  if (a?.token) callApi({ api: "keluar" }, { token: a.token }).catch(() => {});
  refreshPage();
});

// User bar: Login · Keranjang · Pesanan Saya
$("#ub-login").addEventListener("click", () => openAuth(signedIn() ? "account" : "guest"));
$("#ub-cart").addEventListener("click", (e) => {
  if (signedIn()) return;
  e.preventDefault();
  requireLogin("Masuk dulu untuk melihat keranjang dan memesan.", () => (location.href = "pesan.html"));
});
$("#ub-orders").addEventListener("click", (e) => {
  if (signedIn()) return;
  e.preventDefault();
  requireLogin("Masuk untuk melihat pesanan Anda.", () => (location.href = "pesanan-saya.html"));
});
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-login]");
  if (b) openAuth(b.dataset.login);
});

function addToOrder(name) {
  if (!signedIn()) {
    requireLogin("Masuk dulu untuk memesan. Cukup nama, nomor HP, dan password.", () => addToOrder(name));
    return;
  }
  const ta = $("#order-produk");
  if (ta && !$("#order-form").hidden) {
    const lines = ta.value.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.some((l) => l.toLowerCase().startsWith(name.toLowerCase()))) lines.push(`${name} x1`);
    ta.value = lines.join("\n");
    ta.classList.add("flash");
    setTimeout(() => ta.classList.remove("flash"), 1200);
  }
  const list = cart.get();
  if (!list.includes(name)) list.push(name);
  cart.set(list);
  if (ta) return;
  if (!cart.get().length) { location.href = "pesan.html?produk=" + encodeURIComponent(name); return; }
  toast(`✓ <b>${esc(name)}</b> masuk keranjang. <a href="pesan.html">Lanjut pesan →</a>`);
}

// ---- Order form (signed-in customers) → admin app inbox ----
function setupOrderPage() {
  if (!$("#order-form")) return;
  const a = account.get();
  $("#order-gate").hidden = !!a;
  $("#order-form").hidden = !a;
  if (!a) return;
  const form = $("#order-form");
  if (!form.nama.value) form.nama.value = a.akun.nama;
  form.hp.value = a.akun.hp;
  if (!form.alamat.value) form.alamat.value = a.akun.alamat || "";
  const fromUrl = params.get("produk");
  const items = [...cart.get(), ...(fromUrl ? [fromUrl] : [])];
  if (items.length && !form.produk.value) form.produk.value = [...new Set(items)].map((n) => `${n} x1`).join("\n");
}

if ($("#order-form")) $("#order-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  const msg = $("#order-msg");
  msg.className = "form-msg";
  if (!f.nama.trim() || !f.produk.trim()) {
    msg.textContent = "Isi nama dan produk yang diinginkan.";
    msg.classList.add("err");
    return;
  }
  const btn = $("#order-submit");
  btn.disabled = true;
  btn.textContent = "Mengirim…";
  try {
    await callAccount("order", f);
    cart.set([], { sync: false });
    const a = account.get();
    if (a && f.alamat) account.set({ ...a, akun: { ...a.akun, alamat: f.alamat } });
    const wa = waLink(`Halo Premium Perabot, saya ${f.nama} baru saja mengisi formulir pesanan di website:\n${f.produk}`);
    e.target.innerHTML = `<div class="form-done"><h3>Terima kasih, ${esc(f.nama.split(" ")[0])}! 🙏</h3>
      <p>Pesanan Anda sudah kami terima. Tim kami akan menghubungi Anda lewat WhatsApp untuk konfirmasi. Statusnya bisa dicek di <a href="pesanan-saya.html"><b>Pesanan Saya</b></a>.</p>
      <a class="btn btn-wa" href="${wa}" target="_blank" rel="noopener">Chat sekarang di WhatsApp</a></div>`;
  } catch (err) {
    if (/SESI_HABIS/.test(err.message)) { setupOrderPage(); return; }
    msg.textContent = cleanErr(err) + " Anda juga bisa langsung chat WhatsApp.";
    msg.classList.add("err");
  } finally {
    btn.disabled = false;
    btn.textContent = "Kirim pesanan";
  }
});

// ---- Voucher code on the order form (the shop applies the discount when confirming the order) ----
if ($("#voucher-check")) $("#voucher-check").addEventListener("click", async () => {
  const input = $("#order-form [name=voucher]"), msg = $("#voucher-msg");
  const kode = input.value.trim();
  msg.className = "voucher-msg";
  if (!kode) { msg.textContent = "Isi kode voucher dulu."; return; }
  msg.textContent = "Memeriksa…";
  try {
    const v = await callApi({ api: "voucher", kode });
    input.value = v.kode;
    msg.textContent = `✓ ${v.kode}: ${v.label}. Potongan dihitung saat pesanan dikonfirmasi.`;
    msg.classList.add("ok");
  } catch (e) {
    msg.textContent = cleanErr(e);
    msg.classList.add("err");
  }
});

// ---- Promo banner (vouchers the shop marked "tampilkan sebagai promo") ----
async function loadPromos() {
  let promos = null;
  try { const c = JSON.parse(sessionStorage.getItem("pp_promo") || "null"); if (c && Date.now() - c.t < 300000) promos = c.d; } catch (e) { /* none */ }
  if (!promos) {
    try {
      promos = await callApi({ api: "promo" });
      try { sessionStorage.setItem("pp_promo", JSON.stringify({ t: Date.now(), d: promos })); } catch (e) { /* storage blocked */ }
    } catch (e) { return; }
  }
  if (!promos.length) return;
  const bar = document.createElement("div");
  bar.className = "promo-bar";
  bar.innerHTML = `<div class="wrap">${promos.map((p) => `<p><span class="promo-tag">PROMO</span> <b>${esc(p.judul)}</b> · pakai kode <code>${esc(p.kode)}</code>
    <a href="pesan.html?voucher=${encodeURIComponent(p.kode)}">Pesan sekarang →</a></p>`).join("")}</div>`;
  document.querySelector(".topbar").after(bar);
}
loadPromos();
if ($("#order-form") && params.get("voucher")) $("#order-form [name=voucher]").value = params.get("voucher");

// ---- Order cards (tracking page and Pesanan Saya) ----
const STAGES = ["Antri", "Diproduksi", "Siap Kirim", "Terkirim"];
function orderCardHtml(o, { greet = false } = {}) {
  const cur = Math.max(0, STAGES.indexOf(o.status));
  return `
      <div class="track-head"><div><span class="muted">Nota #${esc(o.nota)}</span><h3>${greet ? `Halo, ${esc(o.nama)}` : o.items.length ? esc(o.items[0].produk) + (o.items.length > 1 ? ` +${o.items.length - 1}` : "") : "Pesanan"}</h3></div>
        <span class="track-status">${o.status === "Batal" ? "Dibatalkan" : esc(o.status)}</span></div>
      ${o.status === "Batal" ? "" : `<ol class="track-steps">${STAGES.map((s, i) => `<li class="${i < cur ? "done" : i === cur ? "current" : ""}"><i></i><span>${s}</span></li>`).join("")}</ol>`}
      <dl class="track-info">
        <div><dt>Tanggal pesan</dt><dd>${fdateId(o.tanggalOrder)}</dd></div>
        <div><dt>Jadwal kirim</dt><dd>${fdateId(o.tanggalKirim)}</dd></div>
        ${o.diskon ? `<div><dt>Diskon</dt><dd>− ${fmtRp(o.diskon)}</dd></div>` : ""}
        <div><dt>Total</dt><dd>${fmtRp(o.total)}</dd></div>
        <div><dt>Sudah dibayar</dt><dd>${fmtRp(o.terbayar)}</dd></div>
        <div class="${o.sisa > 0 ? "owe" : "paid"}"><dt>Sisa pembayaran</dt><dd>${o.sisa > 0 ? fmtRp(o.sisa) : "LUNAS ✓"}</dd></div>
      </dl>
      ${o.items.length ? `<p class="track-items">${o.items.map((i) => `${esc(i.produk)}${i.qty > 1 ? ` ×${i.qty}` : ""}`).join(" · ")}</p>` : ""}
      <a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="${waLink(`Halo Premium Perabot, saya ingin menanyakan pesanan nota #${o.nota}.`)}">Tanya soal pesanan ini</a>`;
}

// ---- Order tracking (no account needed: nota + phone) ----
if ($("#track-form")) $("#track-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  const msg = $("#track-msg"), out = $("#track-result"), btn = $("#track-submit");
  msg.className = "form-msg";
  msg.textContent = "";
  out.hidden = true;
  btn.disabled = true;
  btn.textContent = "Mencari…";
  try {
    const o = await callApi({ api: "track", nota: f.nota.trim(), hp: f.hp });
    out.innerHTML = orderCardHtml(o, { greet: true });
    out.hidden = false;
  } catch (err) {
    msg.textContent = cleanErr(err);
    msg.classList.add("err");
  } finally {
    btn.disabled = false;
    btn.textContent = "Lacak";
  }
});

// Links from the WhatsApp nota: ?nota=xxxx
const notaParam = params.get("nota");
if (notaParam && $("#track-form")) {
  $("#track-form [name=nota]").value = notaParam;
  $("#track-form [name=hp]").focus();
}

// ---- Pesanan Saya ----
async function loadMyOrders() {
  if (!$("#my-orders")) return;
  const a = account.get();
  $("#my-gate").hidden = !!a;
  $("#my-orders").hidden = !a;
  if (!a) return;
  if (!$("#link-form").hp.value) $("#link-form").hp.value = a.akun.hp;
  const list = $("#my-list"), msg = $("#my-msg");
  list.innerHTML = '<p class="muted">Memuat pesanan…</p>';
  msg.textContent = "";
  try {
    const d = await callAccount("pesanan-saya");
    const reqs = d.permintaan.map((r) => `<div class="track-result my-req">
        <div class="track-head"><div><span class="muted">Dikirim ${fdateId(r.tanggal)}</span><h3>Permintaan pesanan</h3></div>
          <span class="track-status ${r.status === "Ditolak" ? "is-off" : "is-wait"}">${r.status === "Ditolak" ? "Tidak diproses" : "Menunggu konfirmasi"}</span></div>
        <p class="track-items" style="white-space:pre-line">${esc(r.produk)}</p>
        ${r.status === "Ditolak" ? `<p class="muted">Permintaan ini tidak kami proses. Silakan hubungi kami jika ada pertanyaan.</p>` : `<p class="muted">Tim kami akan menghubungi Anda lewat WhatsApp untuk konfirmasi harga dan jadwal.</p>`}
      </div>`).join("");
    const orders = d.pesanan.map((o) => `<div class="track-result">${orderCardHtml(o)}</div>`).join("");
    list.innerHTML = reqs + orders || `<div class="empty-orders"><h3>Belum ada pesanan</h3>
      <p>Pilih produk di <a href="katalog.html">katalog</a>, lalu klik <b>+ Pesan</b>.</p></div>`;
  } catch (err) {
    list.innerHTML = "";
    if (!/SESI_HABIS/.test(err.message)) { msg.textContent = cleanErr(err); msg.classList.add("err"); }
    else loadMyOrders();
  }
}
if ($("#link-form")) bindForm($("#link-form"), async (f, msg) => {
  const o = await callAccount("tautkan", { nota: f.nota.trim(), hp: f.hp });
  $("#link-form").nota.value = "";
  await loadMyOrders();
  msg.textContent = `Pesanan #${o.nota} ditambahkan ke akun Anda.`;
});

/** Re-draw the parts of the page that depend on being signed in. */
function refreshPage() {
  renderUserbar();
  updateCartBadge();
  setupOrderPage();
  loadMyOrders();
}

// Start: show the account state, then confirm the session and fetch the saved cart in the background.
refreshPage();
if (signedIn()) {
  callAccount("akun", {}, { quiet: true }).then((d) => {
    const a = account.get();
    account.set({ ...a, akun: d.akun });
    cart.set(d.keranjang, { sync: false });
    setupOrderPage();
  }).catch(() => refreshPage());
}

if ($("#api-grid")) loadApiCatalog();

// Latest gallery edits from the app; redraw only if they changed since the cached copy.
if ($("#grid") || $("#home-grid") || $("#cat-tiles")) {
  callApi({ api: "katalog-edit" }).then((edits) => {
    const fresh = JSON.stringify(edits);
    if (fresh === JSON.stringify(cachedEdits())) return;
    try { localStorage.setItem(EDITS_KEY, fresh); } catch (e) { /* storage blocked */ }
    products = editedProducts(edits);
    byId = buildById();
    renderChips();
    renderGrid();
    renderHome();
  }).catch(() => {});
}

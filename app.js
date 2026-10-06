// ---- Store settings: edit these ----
const CONFIG = {
  whatsapp: "6285365855226",              // 0853-6585-5226 in international format
  tiktok: "https://www.tiktok.com/@premiumperabot",
  instagram: "",                          // e.g. "https://www.instagram.com/username" (hidden if empty)
  mapsQuery: "Warehouse Premium Perabot, Tanjung Pauh, Payakumbuh Barat, Payakumbuh City, West Sumatra 26223",
  // Public API of the admin app (Google Apps Script "Link Publik"): catalog, order form, tracking.
  api: "https://script.google.com/macros/s/AKfycbx0-lUR6IlsUceei2AJ3VSQBe9AJB9YeZEBc6Yj21uCx-bbaENkhDeVN2IjKUdyTBfJIA/exec",
  staffUrl: "https://script.google.com/macros/s/AKfycbzfRxn1oA_KiOhkyW-vjlqH3GqVdIO8FBuOqQXww-zV_z3Ng3bkYJAHxb_n53SPWHNmsQ/exec",
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

const products = window.PRODUCTS || [];
const params = new URLSearchParams(location.search);
const state = { cat: params.get("cat") || "all", q: "", price: "all", sort: params.get("sort") || "new", shown: PAGE };
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
  const [lo, hi] = state.price === "all" ? [0, Infinity] : state.price.split("-").map(Number);
  const list = products.filter((p) =>
    (state.cat === "all" || p.cat === state.cat) &&
    (!q || p.title.toLowerCase().includes(q)) &&
    p.price >= lo && p.price < hi
  );
  const sorters = {
    new: (a, b) => b.date.localeCompare(a.date),
    popular: (a, b) => b.views - a.views,
    cheap: (a, b) => a.price - b.price,
    expensive: (a, b) => b.price - a.price,
  };
  return list.sort(sorters[state.sort]);
}

const recentCutoff = [...products].sort((a, b) => b.date.localeCompare(a.date))[Math.min(11, products.length - 1)]?.date || "";
const popularCutoff = [...products].sort((a, b) => b.views - a.views)[Math.min(19, products.length - 1)]?.views || Infinity;
const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

function priceHtml(label) {
  if (!label) return "";
  const rest = label.replace(/^Rp\s*/, "");
  const m = rest.match(/^([\d.,–-]+)\s*(.*)$/);
  if (!m) return `<p class="price">${esc(label)}</p>`;
  return `<p class="price"><sup>Rp</sup><b>${m[1]}</b>${m[2] ? `<small>${esc(m[2].toLowerCase())}</small>` : ""}</p>`;
}

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
        ${showPrice ? priceHtml(p.priceLabel) : ""}
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
  $("#price").addEventListener("change", (e) => { state.price = e.target.value; state.shown = PAGE; renderGrid(); });
  $("#sort").value = state.sort;
  $("#sort").addEventListener("change", (e) => { state.sort = e.target.value; renderGrid(); });
  $("#more").addEventListener("click", () => { state.shown += PAGE; renderGrid(); });
}

// ---- Home: most watched ----
if ($("#home-grid")) {
  $("#home-grid").innerHTML = [...products].sort((a, b) => b.views - a.views).slice(0, 8).map((p) => card(p)).join("");
}

// ---- Deliveries ----
if ($("#deliveries")) $("#deliveries").innerHTML = (window.DELIVERIES || []).slice(0, 4).map((p) => card(p, { showPrice: false })).join("");

// ---- Video player (TikTok official embed player) ----
const byId = new Map([...products, ...(window.DELIVERIES || [])].map((p) => [p.id, p]));
const dlg = $("#player");

function openPlayer(id) {
  const p = byId.get(id);
  if (!p) return;
  $("#player-iframe").src = `https://www.tiktok.com/player/v1/${p.id}?autoplay=1&loop=1&rel=0&description=0&music_info=0`;
  $("#player-cat").textContent = p.cat ? CATEGORY_LABELS[p.cat] : "Pengantaran";
  $("#player-title").textContent = p.title;
  $("#player-price").outerHTML = p.priceLabel ? priceHtml(p.priceLabel).replace('<p class="price">', '<p class="price" id="player-price">') : '<p class="price" id="player-price"></p>';
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
document.querySelectorAll(".js-staff").forEach((a) => (a.href = CONFIG.staffUrl));

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

/* ---- Order list ("keranjang") shared between pages ---- */
const CART_KEY = "pp_pesanan";
const cart = {
  get() { try { return JSON.parse(localStorage.getItem(CART_KEY) || "[]"); } catch (e) { return []; } },
  set(list) { try { localStorage.setItem(CART_KEY, JSON.stringify(list)); } catch (e) { /* storage blocked */ } updateCartBadge(); },
};
function updateCartBadge() {
  const n = cart.get().length, el = $("#cart-count");
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

function addToOrder(name) {
  const ta = $("#order-produk");
  if (ta) {
    const lines = ta.value.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.some((l) => l.toLowerCase().startsWith(name.toLowerCase()))) lines.push(`${name} x1`);
    ta.value = lines.join("\n");
    ta.classList.add("flash");
    setTimeout(() => ta.classList.remove("flash"), 1200);
    return;
  }
  const list = cart.get();
  if (!list.includes(name)) list.push(name);
  cart.set(list);
  if (!cart.get().length) { location.href = "pesan.html?produk=" + encodeURIComponent(name); return; }
  toast(`✓ <b>${esc(name)}</b> ditambahkan ke pesanan. <a href="pesan.html">Lanjut isi formulir →</a>`);
}
updateCartBadge();

// Pesan page: fill the form from the list (and ?produk= links)
if ($("#order-produk")) {
  const fromUrl = params.get("produk");
  const items = [...cart.get(), ...(fromUrl ? [fromUrl] : [])];
  if (items.length) $("#order-produk").value = [...new Set(items)].map((n) => `${n} x1`).join("\n");
}

// ---- Order form → admin app inbox ----
if ($("#order-form")) $("#order-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  const msg = $("#order-msg");
  msg.className = "form-msg";
  if (!f.nama.trim() || f.hp.replace(/\D/g, "").length < 10 || !f.produk.trim()) {
    msg.textContent = "Isi nama, nomor HP/WA yang benar, dan produk yang diinginkan.";
    msg.classList.add("err");
    return;
  }
  const btn = $("#order-submit");
  btn.disabled = true;
  btn.textContent = "Mengirim…";
  try {
    await callApi({ api: "order" }, f);
    cart.set([]);
    const wa = waLink(`Halo Premium Perabot, saya ${f.nama} baru saja mengisi formulir pesanan di website:\n${f.produk}`);
    e.target.innerHTML = `<div class="form-done"><h3>Terima kasih, ${esc(f.nama.split(" ")[0])}! 🙏</h3>
      <p>Pesanan Anda sudah kami terima. Tim kami akan menghubungi Anda lewat WhatsApp untuk konfirmasi.</p>
      <a class="btn btn-wa" href="${wa}" target="_blank" rel="noopener">Chat sekarang di WhatsApp</a></div>`;
  } catch (err) {
    msg.textContent = err.message + " Anda juga bisa langsung chat WhatsApp.";
    msg.classList.add("err");
    btn.disabled = false;
    btn.textContent = "Kirim pesanan";
  }
});

// ---- Order tracking ----
const STAGES = ["Antri", "Diproduksi", "Siap Kirim", "Terkirim"];
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
    const cur = Math.max(0, STAGES.indexOf(o.status));
    out.innerHTML = `
      <div class="track-head"><div><span class="muted">Nota #${esc(o.nota)}</span><h3>Halo, ${esc(o.nama)}</h3></div>
        <span class="track-status">${o.status === "Batal" ? "Dibatalkan" : esc(o.status)}</span></div>
      ${o.status === "Batal" ? "" : `<ol class="track-steps">${STAGES.map((s, i) => `<li class="${i < cur ? "done" : i === cur ? "current" : ""}"><i></i><span>${s}</span></li>`).join("")}</ol>`}
      <dl class="track-info">
        <div><dt>Tanggal pesan</dt><dd>${fdateId(o.tanggalOrder)}</dd></div>
        <div><dt>Jadwal kirim</dt><dd>${fdateId(o.tanggalKirim)}</dd></div>
        <div><dt>Total</dt><dd>${fmtRp(o.total)}</dd></div>
        <div><dt>Sudah dibayar</dt><dd>${fmtRp(o.terbayar)}</dd></div>
        <div class="${o.sisa > 0 ? "owe" : "paid"}"><dt>Sisa pembayaran</dt><dd>${o.sisa > 0 ? fmtRp(o.sisa) : "LUNAS ✓"}</dd></div>
      </dl>
      ${o.items.length ? `<p class="track-items">${o.items.map((i) => `${esc(i.produk)}${i.qty > 1 ? ` ×${i.qty}` : ""}`).join(" · ")}</p>` : ""}
      <a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="${waLink(`Halo Premium Perabot, saya ingin menanyakan pesanan nota #${o.nota}.`)}">Tanya soal pesanan ini</a>`;
    out.hidden = false;
  } catch (err) {
    msg.textContent = err.message;
    msg.classList.add("err");
  } finally {
    btn.disabled = false;
    btn.textContent = "Lacak";
  }
});

// Links from the WhatsApp nota: ?nota=xxxx#lacak
const notaParam = params.get("nota");
if (notaParam && $("#track-form")) {
  $("#track-form [name=nota]").value = notaParam;
  $("#track-form [name=hp]").focus();
}

if ($("#api-grid")) loadApiCatalog();

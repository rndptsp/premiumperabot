// ---- Store settings: edit these ----
const CONFIG = {
  whatsapp: "6285365855226",              // 0853-6585-5226 in international format
  tiktok: "https://www.tiktok.com/@premiumperabot",
  instagram: "",                          // e.g. "https://www.instagram.com/username" (hidden if empty)
  mapsQuery: "Warehouse Premium Perabot, Tanjung Pauh, Payakumbuh Barat, Payakumbuh City, West Sumatra 26223",
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
const state = { cat: "all", q: "", price: "all", sort: "new", shown: PAGE };

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
$(".js-map-embed").src = `https://www.google.com/maps?q=${encodeURIComponent(CONFIG.mapsQuery)}&output=embed`;
$("#year").textContent = new Date().getFullYear();

// ---- Stats ----
if (products.length) $("#stat-products").textContent = `${Math.floor(products.length / 50) * 50}+`;
if (window.STATS?.views) {
  const jt = Math.floor(window.STATS.views / 1e5) / 10;
  $("#stat-views").textContent = `${String(jt).replace(".", ",")} juta+`;
}

// ---- Catalog ----
function renderChips() {
  const counts = {}, cover = {};
  for (const p of products) {
    counts[p.cat] = (counts[p.cat] || 0) + 1;
    if (!cover[p.cat] || p.views > cover[p.cat].views) cover[p.cat] = p;
  }
  const top = products.reduce((m, p) => (p.views > (m?.views || 0) ? p : m), null);
  const cats = ["all", ...Object.keys(CATEGORY_LABELS).filter((c) => counts[c] && c !== "all")];
  $("#cat-tiles").innerHTML = cats.map((c) => {
    const img = (c === "all" ? top : cover[c])?.img || "";
    return `<button class="cat-tile" data-cat="${c}" aria-pressed="${c === state.cat}">
      <span class="cat-img"><img src="${img}" alt="" loading="lazy"></span>
      <span class="cat-name">${CATEGORY_LABELS[c]}</span>
      <span class="cat-count">${c === "all" ? products.length : counts[c]} produk</span>
    </button>`;
  }).join("");
  $("#catalog-title").textContent = state.cat === "all" ? "Semua produk" : CATEGORY_LABELS[state.cat];
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
  const list = filtered();
  $("#grid").innerHTML = list.length
    ? list.slice(0, state.shown).map((p) => card(p)).join("")
    : `<p class="empty">Tidak ada produk yang cocok. Coba kata kunci lain, atau <a href="${waLink("Halo, saya mencari: " + state.q)}" target="_blank" rel="noopener">tanya langsung lewat WhatsApp</a>.</p>`;
  $("#count").textContent = `${fmtNum(list.length)} produk`;
  $("#more").hidden = list.length <= state.shown;
}

$("#cat-tiles").addEventListener("click", (e) => {
  const b = e.target.closest(".cat-tile");
  if (!b) return;
  state.cat = b.dataset.cat;
  state.shown = PAGE;
  renderChips();
  renderGrid();
});
let t;
$("#q").addEventListener("input", (e) => {
  clearTimeout(t);
  t = setTimeout(() => { state.q = e.target.value; state.shown = PAGE; renderGrid(); }, 150);
});
$("#price").addEventListener("change", (e) => { state.price = e.target.value; state.shown = PAGE; renderGrid(); });
$("#sort").addEventListener("change", (e) => { state.sort = e.target.value; renderGrid(); });
$("#more").addEventListener("click", () => { state.shown += PAGE; renderGrid(); });

// ---- Deliveries ----
$("#deliveries").innerHTML = (window.DELIVERIES || []).slice(0, 4).map((p) => card(p, { showPrice: false })).join("");

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
  dlg.showModal();
}
function closePlayer() {
  dlg.close();
}
dlg.addEventListener("close", () => ($("#player-iframe").src = "about:blank"));
$("#player-close").addEventListener("click", closePlayer);
dlg.addEventListener("click", (e) => { if (e.target === dlg) closePlayer(); });

document.addEventListener("click", (e) => {
  const c = e.target.closest(".card");
  if (c) openPlayer(c.dataset.id);
});
document.addEventListener("keydown", (e) => {
  const c = e.target.closest?.(".card");
  if (c && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openPlayer(c.dataset.id); }
});

renderChips();
renderGrid();

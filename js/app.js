const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fmt = (n) => "Rp " + Math.round(n || 0).toLocaleString("id-ID");
const todayStr = () => new Date().toISOString().slice(0, 10);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const store = {
  get(k, fallback) {
    try { return JSON.parse(localStorage.getItem(k)) ?? fallback; }
    catch { return fallback; }
  },
  set(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
};

const state = {
  profile: store.get("om_profile", { name: "Mitra", target: 150000, komisi: 8, bbmPerKm: 500, armada: "motor" }),
  orders: store.get("om_orders", []),
  expenses: store.get("om_expenses", []),
  vehicle: store.get("om_vehicle", { km: "", oli: "", servis: "", ban: "", catatan: "" }),
  checklist: store.get("om_check", {})
};

function saveAll() {
  store.set("om_profile", state.profile);
  store.set("om_orders", state.orders);
  store.set("om_expenses", state.expenses);
  store.set("om_vehicle", state.vehicle);
  store.set("om_check", state.checklist);
}

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 1800);
}

function showPage(id) {
  $$(".page").forEach((p) => p.classList.remove("active"));
  $$(".nav button").forEach((b) => b.classList.toggle("active", b.dataset.page === id));
  $("#page-" + id).classList.add("active");
  if (id === "beranda") renderHome();
  if (id === "order") renderOrders();
  if (id === "hitung") renderCalcHint();
  if (id === "motor") renderVehicle();
  if (id === "lain") renderLain();
}

function ordersToday() {
  const d = todayStr();
  return state.orders.filter((o) => o.date === d);
}
function expensesToday() {
  const d = todayStr();
  return state.expenses.filter((e) => e.date === d);
}

function orderNet(o) {
  const komisi = (o.tarif * (o.komisi ?? state.profile.komisi)) / 100;
  const bbm = (o.km || 0) * (state.profile.bbmPerKm || 0);
  return (o.tarif || 0) + (o.tip || 0) - komisi - bbm;
}

function renderHome() {
  const name = state.profile.name || "Mitra";
  const hour = new Date().getHours();
  const greet = hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : hour < 18 ? "Selamat sore" : "Selamat malam";
  $("#greet").textContent = `${greet}, ${name}`;

  const ot = ordersToday();
  const gross = ot.reduce((s, o) => s + (o.tarif || 0) + (o.tip || 0), 0);
  const net = ot.reduce((s, o) => s + orderNet(o), 0);
  const exp = expensesToday().reduce((s, e) => s + (e.amount || 0), 0);
  const target = Number(state.profile.target) || 0;
  const pct = target ? Math.min(100, Math.round((net / target) * 100)) : 0;

  $("#stat-order").textContent = ot.length;
  $("#stat-gross").textContent = fmt(gross);
  $("#stat-net").textContent = fmt(net);
  $("#stat-exp").textContent = fmt(exp);
  $("#stat-target").textContent = `${fmt(net)} / ${fmt(target)}`;
  $("#target-bar").style.width = pct + "%";
  $("#target-pct").textContent = pct + "% dari target harian";

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const ws = weekStart.toISOString().slice(0, 10);
  const weekOrders = state.orders.filter((o) => o.date >= ws);
  const weekNet = weekOrders.reduce((s, o) => s + orderNet(o), 0);
  $("#stat-week").textContent = fmt(weekNet);
  $("#stat-week-n").textContent = weekOrders.length + " order minggu ini";

  const recent = [...state.orders].sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id)).slice(0, 5);
  $("#recent-list").innerHTML = recent.length
    ? recent.map(orderItemHtml).join("")
    : `<div class="empty">Belum ada order. Catat trip pertama kamu di tab Order.</div>`;
}

function orderItemHtml(o) {
  const plat = (o.platform || "lainnya").toLowerCase();
  const arm = o.armada === "mobil" ? "Mobil" : "Motor";
  return `<div class="item">
    <div>
      <div><span class="badge ${plat}">${o.platform}</span> <strong>${fmt(o.tarif)}</strong></div>
      <div class="meta">${o.date} · ${arm} · ${o.km || 0} km · tip ${fmt(o.tip || 0)} · bersih ${fmt(orderNet(o))}</div>
      ${o.note ? `<div class="meta">${o.note}</div>` : ""}
    </div>
    <button class="btn btn-ghost btn-sm" onclick="deleteOrder('${o.id}')">Hapus</button>
  </div>`;
}

function renderOrders() {
  const list = [...state.orders].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  $("#order-list").innerHTML = list.length
    ? list.map(orderItemHtml).join("")
    : `<div class="empty">Belum ada catatan order.</div>`;
  $("#f-date").value = $("#f-date").value || todayStr();
  $("#f-komisi").value = state.profile.komisi;
  if ($("#f-armada") && !$("#f-armada").dataset.touched) {
    $("#f-armada").value = state.profile.armada === "mobil" ? "mobil" : "motor";
  }
}

function addOrder(e) {
  e.preventDefault();
  const o = {
    id: uid(),
    date: $("#f-date").value || todayStr(),
    armada: $("#f-armada").value || "motor",
    platform: $("#f-platform").value,
    tarif: Number($("#f-tarif").value) || 0,
    tip: Number($("#f-tip").value) || 0,
    km: Number($("#f-km").value) || 0,
    komisi: Number($("#f-komisi").value) || state.profile.komisi,
    note: $("#f-note").value.trim()
  };
  if (!o.tarif) return toast("Isi tarif order dulu");
  state.orders.push(o);
  saveAll();
  $("#form-order").reset();
  $("#f-date").value = todayStr();
  $("#f-komisi").value = state.profile.komisi;
  if ($("#f-armada")) $("#f-armada").value = o.armada;
  renderOrders();
  toast("Order tersimpan");
}

function deleteOrder(id) {
  state.orders = state.orders.filter((o) => o.id !== id);
  saveAll();
  renderOrders();
  renderHome();
  toast("Order dihapus");
}

function defaultBbm(armada) {
  if (armada === "mobil") return state.profile.bbmPerKmMobil || 1800;
  return state.profile.bbmPerKm || 500;
}

function renderCalcHint() {
  $("#c-komisi").value = state.profile.komisi;
  const arm = state.profile.armada === "mobil" ? "mobil" : "motor";
  if ($("#c-armada")) $("#c-armada").value = arm;
  $("#c-bbm").value = defaultBbm(arm);
}

function hitung() {
  const tarif = Number($("#c-tarif").value) || 0;
  const tip = Number($("#c-tip").value) || 0;
  const km = Number($("#c-km").value) || 0;
  const komisiPct = Number($("#c-komisi").value) || 0;
  const bbmPerKm = Number($("#c-bbm").value) || 0;
  const lain = Number($("#c-lain").value) || 0;
  const komisi = tarif * komisiPct / 100;
  const bbm = km * bbmPerKm;
  const bersih = tarif + tip - komisi - bbm - lain;
  $("#calc-result").innerHTML = `
    <div class="kv"><span>Tarif + tip</span><strong>${fmt(tarif + tip)}</strong></div>
    <div class="kv"><span>Komisi aplikasi ${komisiPct}%</span><strong class="warn">- ${fmt(komisi)}</strong></div>
    <div class="kv"><span>Estimasi BBM (${km} km × ${fmt(bbmPerKm)})</span><strong class="warn">- ${fmt(bbm)}</strong></div>
    <div class="kv"><span>Biaya lain</span><strong class="warn">- ${fmt(lain)}</strong></div>
    <div style="margin-top:10px" class="muted">Penghasilan bersih</div>
    <div class="big">${fmt(bersih)}</div>
    <div class="muted">Per km bersih: ${km ? fmt(bersih / km) : "-"}</div>
  `;
}

function addExpense(e) {
  e.preventDefault();
  const ex = {
    id: uid(),
    date: $("#e-date").value || todayStr(),
    type: $("#e-type").value,
    amount: Number($("#e-amount").value) || 0,
    note: $("#e-note").value.trim()
  };
  if (!ex.amount) return toast("Isi nominal");
  state.expenses.push(ex);
  saveAll();
  e.target.reset();
  $("#e-date").value = todayStr();
  renderLain();
  toast("Pengeluaran dicatat");
}

function renderVehicle() {
  $("#v-km").value = state.vehicle.km || "";
  $("#v-oli").value = state.vehicle.oli || "";
  $("#v-servis").value = state.vehicle.servis || "";
  $("#v-ban").value = state.vehicle.ban || "";
  $("#v-catatan").value = state.vehicle.catatan || "";
}

function saveVehicle() {
  state.vehicle = {
    km: $("#v-km").value,
    oli: $("#v-oli").value,
    servis: $("#v-servis").value,
    ban: $("#v-ban").value,
    catatan: $("#v-catatan").value
  };
  saveAll();
  toast("Data motor disimpan");
}

const CHECK_ITEMS = [
  ["helm", "Helm SNI (wajib motor) / sabuk pengaman (mobil)"],
  ["lampu", "Lampu depan, sein, rem, kabin menyala"],
  ["ban", "Tekanan ban cukup, tidak botak / gundul"],
  ["rem", "Rem depan & belakang responsif"],
  ["ac", "AC / sirkulasi udara nyaman untuk penumpang"],
  ["bersih", "Kursi & kabin bersih, wangi netral"],
  ["hp", "HP charged + powerbank / charger mobil"],
  ["jas", "Jas hujan / payung siap"],
  ["stnk", "STNK & SIM sesuai armada dibawa"],
  ["saldo", "Saldo e-wallet, tunai cadangan, e-toll"]
];

function renderLain() {
  $("#p-name").value = state.profile.name || "";
  if ($("#p-armada")) $("#p-armada").value = state.profile.armada || "motor";
  $("#p-target").value = state.profile.target || "";
  $("#p-komisi").value = state.profile.komisi || 8;
  $("#p-bbm").value = state.profile.bbmPerKm || 500;
  const d = todayStr();
  const todayCheck = state.checklist[d] || {};
  $("#check-list").innerHTML = CHECK_ITEMS.map(([k, label]) => `
    <label class="check"><input type="checkbox" ${todayCheck[k] ? "checked" : ""} onchange="toggleCheck('${k}', this.checked)"> ${label}</label>
  `).join("");

  const ex = [...state.expenses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  $("#exp-list").innerHTML = ex.length
    ? ex.map((e) => `<div class="item"><div><strong>${e.type}</strong> · ${fmt(e.amount)}<div class="meta">${e.date} ${e.note || ""}</div></div>
      <button class="btn btn-ghost btn-sm" onclick="deleteExpense('${e.id}')">Hapus</button></div>`).join("")
    : `<div class="empty">Belum ada pengeluaran.</div>`;
}

function toggleCheck(k, on) {
  const d = todayStr();
  state.checklist[d] = state.checklist[d] || {};
  state.checklist[d][k] = on;
  saveAll();
}

function saveProfile() {
  state.profile.name = $("#p-name").value.trim() || "Mitra";
  state.profile.armada = $("#p-armada") ? $("#p-armada").value : "motor";
  state.profile.target = Number($("#p-target").value) || 0;
  state.profile.komisi = Number($("#p-komisi").value) || 8;
  state.profile.bbmPerKm = Number($("#p-bbm").value) || 0;
  if (state.profile.armada === "mobil" && state.profile.bbmPerKm < 800) {
    state.profile.bbmPerKmMobil = state.profile.bbmPerKm;
  }
  saveAll();
  toast("Profil disimpan");
  renderHome();
}

function deleteExpense(id) {
  state.expenses = state.expenses.filter((e) => e.id !== id);
  saveAll();
  renderLain();
}

function exportData() {
  const blob = new Blob([JSON.stringify({ profile: state.profile, orders: state.orders, expenses: state.expenses, vehicle: state.vehicle }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "ojekmate-backup-" + todayStr() + ".json";
  a.click();
}

function resetAll() {
  if (!confirm("Hapus semua data di HP ini?")) return;
  localStorage.removeItem("om_profile");
  localStorage.removeItem("om_orders");
  localStorage.removeItem("om_expenses");
  localStorage.removeItem("om_vehicle");
  localStorage.removeItem("om_check");
  location.reload();
}

function installHint() {
  alert("Cara pasang seperti aplikasi:\n\nAndroid Chrome:\n1. Buka file/halaman ini di Chrome\n2. Titik tiga \u22ee \u2192 Tambahkan ke layar utama\n3. Ikon OjekMate muncul seperti APK\n\nAtau bungkus jadi APK lewat pwabuilder.com");
}

window.deleteOrder = deleteOrder;
window.deleteExpense = deleteExpense;
window.toggleCheck = toggleCheck;

document.addEventListener("DOMContentLoaded", () => {
  $$(".nav button").forEach((b) => b.addEventListener("click", () => showPage(b.dataset.page)));
  $("#form-order")?.addEventListener("submit", addOrder);
  $("#form-exp")?.addEventListener("submit", addExpense);
  $("#btn-hitung")?.addEventListener("click", hitung);
  $("#btn-save-vehicle")?.addEventListener("click", saveVehicle);
  $("#btn-save-profile")?.addEventListener("click", saveProfile);
  $("#btn-export")?.addEventListener("click", exportData);
  $("#btn-reset")?.addEventListener("click", resetAll);
  $("#btn-install")?.addEventListener("click", installHint);
  if ($("#f-date")) $("#f-date").value = todayStr();
  if ($("#e-date")) $("#e-date").value = todayStr();
  $("#c-armada")?.addEventListener("change", () => {
    $("#c-bbm").value = defaultBbm($("#c-armada").value);
  });
  renderHome();
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

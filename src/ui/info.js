import { muatDeterminan } from "../data/load.js";
import { KELAS_STUNTING } from "../data/classify.js";
import { onInfoAktif } from "./tabs.js";

/**
 * Panel Info: uji determinan, regresi satu prediktor, dan registry anomali.
 *
 * Semua angka berasal dari determinan.json. Berkas itu sengaja baru dimuat
 * ketika tab Info pertama kali dibuka (bukan saat boot), karena 95 variabel
 * tidak dibutuhkan oleh Home maupun Peta.
 *
 * Tabel determinan adalah hasil eksploratif: tidak ada baris yang lolos
 * koreksi FDR. Karena itu badge "tidak signifikan (FDR)" dipasang di setiap
 * baris, bukan hanya di catatan atas tabel.
 */

const el = (id) => document.getElementById(id);

const fmt = (v, desimal = 3) =>
  Number(v).toLocaleString("id-ID", {
    minimumFractionDigits: desimal,
    maximumFractionDigits: desimal,
  });

/** Tanda + untuk b positif, mengikuti tabel PRD §2.5. */
const fmtB = (v) => `${Number(v) > 0 ? "+" : ""}${fmt(v, 3)}`;

const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );

const badge = (teks, jenis = "netral") => {
  const warna =
    jenis === "peringatan"
      ? "border-[var(--color-warning)] text-[var(--color-ink)]"
      : "border-[var(--color-hairline)] text-[var(--color-ink-2)]";
  return `<span class="inline-flex rounded-full border ${warna} px-2 py-0.5 text-[11px] leading-tight">${teks}</span>`;
};

const sel = (teks, kelas = "") => `<td class="px-3 py-2 align-top ${kelas}">${teks}</td>`;

let data = null;
let memuat = null;
let kontrolTerpasang = false;

const filter = { kelompok: "", actionable: false, cari: "" };

/* --------------------------------------------------------------------------
   Definisi kelas: dirender dari KELAS_STUNTING, bukan ditulis di HTML.
   -------------------------------------------------------------------------- */
function isiDefinisiKelas() {
  const wadah = el("info-kelas-definisi");
  if (!wadah) return;

  wadah.replaceChildren(
    ...KELAS_STUNTING.map((k) => {
      const baris = document.createElement("span");
      baris.className = "flex justify-between gap-3";

      const label = document.createElement("span");
      label.textContent = k.label;

      const rentang = document.createElement("span");
      rentang.className = "tnum shrink-0 text-[var(--color-ink-3)]";
      rentang.textContent = k.keterangan;

      baris.append(label, rentang);
      return baris;
    })
  );
}

/* --------------------------------------------------------------------------
   Uji determinan (FR-05)
   -------------------------------------------------------------------------- */
function isiPilihanKelompok(variabel) {
  const pilih = el("determinan-kelompok");
  if (!pilih) return;

  const kelompok = [...new Set(variabel.map((v) => v.kelompok))].sort((a, b) =>
    a.localeCompare(b, "id")
  );
  pilih.replaceChildren(
    new Option("Semua kelompok", ""),
    ...kelompok.map((k) => new Option(k, k))
  );
}

function barisDeterminan(v) {
  const signifikan = Number(v.fdr) < 0.05;
  const labelArah =
    v.arah === "berlawanan"
      ? `<span title="arah berlawanan">↘ berlawanan</span>`
      : `<span title="arah searah">↗ searah</span>`;

  return `<tr class="border-b border-[var(--color-hairline)] align-top last:border-0">
      ${sel(`<span class="font-medium">${esc(v.nama)}</span>`)}
      ${sel(esc(v.kelompok), "text-[var(--color-ink-2)]")}
      ${sel(fmt(v.r), "tnum text-right")}
      ${sel(fmt(v.rho), "tnum text-right")}
      ${sel(fmt(v.p), "tnum text-right")}
      ${sel(
        `<span class="tnum block text-right">${fmt(v.fdr)}</span>
         <span class="mt-1 block text-right">${
           signifikan
             ? badge("signifikan (FDR)")
             : badge("tidak signifikan (FDR)", "peringatan")
         }</span>`,
        "text-right"
      )}
      ${sel(labelArah)}
      ${sel(v.actionable ? "Ya" : "Tidak", "text-center")}
    </tr>`;
}

function renderDeterminan(d) {
  const tbody = el("determinan-tbody");
  if (!tbody) return;

  const variabel = d.variabel;
  const cari = filter.cari.trim().toLowerCase();
  const hasil = variabel.filter(
    (v) =>
      (!filter.kelompok || v.kelompok === filter.kelompok) &&
      (!filter.actionable || v.actionable) &&
      (!cari || v.nama.toLowerCase().includes(cari))
  );

  tbody.innerHTML = hasil.length
    ? hasil.map(barisDeterminan).join("")
    : `<tr><td colspan="8" class="px-3 py-6 text-center text-[var(--color-ink-3)]">
         Tidak ada variabel yang cocok dengan filter.
       </td></tr>`;

  const jumlah = el("determinan-jumlah");
  if (jumlah) {
    jumlah.textContent = `${hasil.length} dari ${variabel.length} variabel ditampilkan · urut p menaik`;
  }
}

function renderMetaDeterminan(meta) {
  const wadah = el("determinan-meta");
  if (!wadah) return;

  const signif = Number(meta.signif_fdr) || 0;
  wadah.innerHTML =
    `<span class="tnum">n = ${fmt(meta.n, 0)} kecamatan</span> · ` +
    `<span class="tnum">${fmt(meta.n_uji, 0)} uji</span> · ` +
    `${esc(meta.metode)} · ` +
    `<span class="tnum">${fmt(signif, 0)} variabel signifikan pada FDR &lt; 0,05</span>`;
}

/* --------------------------------------------------------------------------
   Regresi satu prediktor (FR-06)
   -------------------------------------------------------------------------- */
function renderRegresi(meta) {
  const wadah = el("regresi-isi");
  if (!wadah || !Array.isArray(meta.regresi)) return;

  const baris = meta.regresi
    .map((m) => {
      const nominal = Number(m.p) < 0.05;
      return `<tr class="border-b border-[var(--color-hairline)] align-top last:border-0">
        ${sel(`<span class="font-medium">${esc(m.prediktor)}</span>`)}
        ${sel(fmtB(m.b), "tnum text-right")}
        ${sel(fmt(m.r2), "tnum text-right")}
        ${sel(fmt(m.p), "tnum text-right")}
        ${sel(
          nominal
            ? badge("nominal", "peringatan")
            : `<span class="text-[var(--color-ink-3)]">tidak signifikan</span>`
        )}
      </tr>`;
    })
    .join("");

  wadah.innerHTML = `<table class="w-full text-sm">
      <caption class="sr-only">Enam model regresi linear satu prediktor terhadap prevalensi stunting</caption>
      <thead>
        <tr class="border-b border-[var(--color-hairline)] text-left text-xs text-[var(--color-ink-3)]">
          <th class="px-3 py-2 font-medium">Prediktor</th>
          <th class="px-3 py-2 text-right font-medium">b</th>
          <th class="px-3 py-2 text-right font-medium">R²</th>
          <th class="px-3 py-2 text-right font-medium">p</th>
          <th class="px-3 py-2 font-medium">Status</th>
        </tr>
      </thead>
      <tbody>${baris}</tbody>
    </table>
    <p class="mt-3 text-xs leading-relaxed text-[var(--color-ink-3)]">
      Nilai p &lt; 0,05 hanya <span class="font-medium text-[var(--color-ink-2)]">nominal</span>:
      tidak lolos koreksi FDR (95 uji). Model ini satu prediktor tanpa variabel kontrol,
      jadi tidak boleh dibaca sebagai hubungan sebab-akibat.
    </p>`;
}

/* --------------------------------------------------------------------------
   Registry anomali (FR-07)
   -------------------------------------------------------------------------- */
function renderAnomali(meta) {
  const wadah = el("anomali-isi");
  if (!wadah || !Array.isArray(meta.anomali)) return;

  const baris = meta.anomali
    .map(
      (a) => `<tr class="border-b border-[var(--color-hairline)] align-top last:border-0">
        ${sel(`<span class="font-medium">${esc(a.variabel)}</span>`)}
        ${sel(esc(a.kecamatan), "text-[var(--color-ink-2)]")}
        ${sel(`<span class="tnum font-medium">${esc(a.nilai)}</span>`, "text-right")}
        ${sel(esc(a.dugaan), "text-[var(--color-ink-2)]")}
        ${sel(
          `<span class="inline-flex rounded-full border border-[var(--color-hairline)] px-2 py-0.5 text-[11px] leading-tight">${esc(a.status)}</span>`
        )}
      </tr>`
    )
    .join("");

  wadah.innerHTML = `<div class="overflow-x-auto">
      <table class="w-full text-sm">
        <caption class="sr-only">Registry tujuh kasus anomali data yang tidak dikoreksi</caption>
        <thead>
          <tr class="border-b border-[var(--color-hairline)] text-left text-xs text-[var(--color-ink-3)]">
            <th class="px-3 py-2 font-medium">Variabel</th>
            <th class="px-3 py-2 font-medium">Kecamatan</th>
            <th class="px-3 py-2 text-right font-medium">Nilai</th>
            <th class="px-3 py-2 font-medium">Dugaan</th>
            <th class="px-3 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>${baris}</tbody>
      </table>
    </div>
    <p class="mt-3 text-xs leading-relaxed text-[var(--color-ink-3)]">
      Data ditampilkan apa adanya sesuai sumber; tidak ada koreksi atau imputasi.
    </p>`;
}

/* --------------------------------------------------------------------------
   Lazy load & kontrol filter
   -------------------------------------------------------------------------- */
function pasangKontrol(d) {
  if (kontrolTerpasang) return;
  kontrolTerpasang = true;

  el("determinan-kelompok")?.addEventListener("change", (e) => {
    filter.kelompok = e.target.value;
    renderDeterminan(d);
  });

  el("determinan-actionable")?.addEventListener("change", (e) => {
    filter.actionable = e.target.checked;
    renderDeterminan(d);
  });

  el("determinan-cari")?.addEventListener("input", (e) => {
    filter.cari = e.target.value;
    renderDeterminan(d);
  });
}

function tampilkanGalatInfo(pesan) {
  const teks = `Hasil uji determinan gagal dimuat: ${pesan}`;
  for (const id of ["determinan-meta", "regresi-isi", "anomali-isi"]) {
    const wadah = el(id);
    if (wadah) wadah.textContent = teks;
  }
}

function muatSekali() {
  if (data) return Promise.resolve(data);
  if (memuat) return memuat;

  memuat = muatDeterminan()
    .then((d) => {
      data = d;
      isiPilihanKelompok(d.variabel);
      renderMetaDeterminan(d.meta);
      renderDeterminan(d);
      renderRegresi(d.meta);
      renderAnomali(d.meta);
      pasangKontrol(d);
      return d;
    })
    .catch((e) => {
      memuat = null;
      tampilkanGalatInfo(e.message);
      throw e;
    });

  return memuat;
}

export function initInfo() {
  // Definisi kelas tidak bergantung pada JSON, jadi langsung tersedia.
  isiDefinisiKelas();

  onInfoAktif(() => {
    muatSekali().catch(() => {
      /* pesan sudah ditulis ke panel */
    });
  });

  // Bila halaman dibuka langsung pada #info, tab sudah aktif sebelum
  // callback terdaftar - muat sekarang juga.
  if (!el("panel-info")?.hidden) {
    muatSekali().catch(() => {
      /* pesan sudah ditulis ke panel */
    });
  }
}

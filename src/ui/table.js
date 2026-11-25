import { getState, setState } from "../state/store.js";
import { angka } from "../data/stats.js";
import { KELAS_STUNTING } from "../data/classify.js";

/**
 * Tabel data per kecamatan.
 *
 * Tabel ini bukan pelengkap: ia menyediakan nilai persis yang tidak bisa
 * dibaca dari warna poligon maupun ujung batang, menyediakan pengurutan yang
 * tidak dimiliki peta, dan menjadi "tampilan tabel" yang membuat grafik tetap
 * terbaca tanpa bergantung pada warna (syarat aksesibilitas).
 *
 * Kolomnya hanya variabel fokus (stunting) dan turunannya (kelas, tingkat
 * prioritas). Determinan - sanitasi dan 94 lainnya - tidak
 * dikolomkan di sini supaya tidak tampil setara dengan outcome; semuanya
 * bisa diperiksa di panel Info dan di berkas unduhan (CSV/GeoJSON).
 *
 * Klik baris membuka detail sekaligus menyorot kecamatan di peta.
 */

const KOLOM = [
  { kunci: "kecamatan", label: "Kecamatan", jenis: "teks" },
  { kunci: "stunting_pct", label: "Stunting", jenis: "persen" },
  { kunci: "stunting_jml", label: "Kasus", jenis: "angka" },
  { kunci: "balita_ukur", label: "Balita diukur", jenis: "angka" },
  { kunci: "kelas", label: "Kelas", jenis: "angka" },
  { kunci: "prioritas", label: "Prioritas", jenis: "teks" },
];

const sel = (teks, kelas = "") =>
  `<td class="px-4 py-2.5 ${kelas}">${teks}</td>`;

const PANAH = { asc: "↑", desc: "↓" };

const idxTeks = (v) => {
  const n = Number(v);
  return `${n > 0 ? "+" : ""}${angka(n, 3)}`;
};

let saatPilih = () => {};

export function onPilihBaris(fn) {
  saatPilih = fn;
}

/** Sorot baris kecamatan terpilih tanpa menggambar ulang seluruh tabel. */
export function tandaiTerpilih(nama) {
  const tbody = document.getElementById("isi-tabel");
  if (!tbody) return;
  for (const tr of tbody.querySelectorAll("tr[data-nama]")) {
    tr.dataset.terpilih = String(tr.dataset.nama === nama);
    tr.setAttribute("aria-selected", String(tr.dataset.nama === nama));
  }
}

function selKelas(r) {
  // r.kelas adalah angka 1..5; indeks ramp memakai angka yang sama.
  const tingkat = Math.min(Math.max(Number(r.kelas) || 1, 1), 5);
  const titik = `var(--color-stunting-${tingkat})`;
  const label = KELAS_STUNTING[tingkat - 1]?.label ?? `Kelas ${tingkat}`;
  // Kelas ditulis sebagai teks, dengan titik warna sebagai penguat - bukan
  // warna saja.
  return `<span class="inline-flex items-center gap-1.5">
      <span class="h-2 w-2 shrink-0 rounded-full" style="background:${titik}" aria-hidden="true"></span>
      ${label}
    </span>`;
}

/** Detail kontekstual saat baris dibuka: outcome dan turunannya. */
function isiDetail(r) {
  const kelasStunting =
    KELAS_STUNTING[Number(r.kelas) - 1]?.label ?? `Kelas ${r.kelas}`;

  return `
    <dl class="grid gap-x-8 gap-y-2 text-[13px] sm:grid-cols-2">
      <div class="flex flex-wrap justify-between gap-x-3 sm:justify-start">
        <dt class="text-[var(--color-ink-2)]">Stunting</dt>
        <dd class="tnum font-medium">
          ${angka(r.stunting_pct, 2)}%
          <span class="font-normal text-[var(--color-ink-3)]">(${kelasStunting})</span>
        </dd>
      </div>
      <div class="flex flex-wrap justify-between gap-x-3 sm:justify-start">
        <dt class="text-[var(--color-ink-2)]">Prioritas</dt>
        <dd class="font-medium">${r.prioritas}</dd>
      </div>
      <div class="flex flex-wrap justify-between gap-x-3 sm:justify-start">
        <dt class="text-[var(--color-ink-2)]">Kapasitas layanan</dt>
        <dd class="tnum font-medium">
          ${idxTeks(r.idx_layanan)}
          <span class="font-normal text-[var(--color-ink-3)]">(indeks, bukan risiko)</span>
        </dd>
      </div>
      <div class="sm:col-span-2">
        <dt class="text-[var(--color-ink-2)]">Alasan prioritas</dt>
        <dd class="text-[var(--color-ink)]">${r.alasanPrioritas}</dd>
      </div>
    </dl>`;
}

export function gambarTabel(rows) {
  const tbody = document.getElementById("isi-tabel");
  if (!tbody) return;

  const { terpilih } = getState();

  const isi = rows.flatMap((r) => {
    const tr = document.createElement("tr");
    tr.dataset.nama = r.kecamatan;
    tr.dataset.terpilih = String(r.kecamatan === terpilih);
    tr.setAttribute("aria-selected", String(r.kecamatan === terpilih));
    tr.setAttribute("aria-expanded", "false");
    tr.tabIndex = 0;
    tr.className =
      "cursor-pointer border-b border-[var(--color-hairline)] transition last:border-0";
    tr.innerHTML =
      sel(r.kecamatan, "font-medium") +
      sel(`${angka(r.stunting_pct, 2)}%`, "tnum text-right") +
      sel(angka(r.stunting_jml), "tnum text-right") +
      sel(angka(r.balita_ukur), "tnum text-right text-[var(--color-ink-2)]") +
      sel(selKelas(r)) +
      sel(r.prioritas, "text-[var(--color-ink-2)]");

    const detail = document.createElement("tr");
    detail.className =
      "border-b border-[var(--color-hairline)] bg-[var(--color-canvas)]";
    detail.hidden = true;
    detail.innerHTML = `<td colspan="6" class="px-4 py-3">${isiDetail(r)}</td>`;

    const pilih = () => saatPilih(r.kecamatan);
    const bukaTutup = () => {
      const buka = detail.hidden;
      detail.hidden = !buka;
      tr.setAttribute("aria-expanded", String(buka));
      tr.classList.toggle("bg-[var(--color-canvas)]", buka);
    };

    tr.addEventListener("click", () => {
      pilih();
      bukaTutup();
    });
    tr.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        pilih();
        bukaTutup();
      }
    });

    return [tr, detail];
  });

  tbody.replaceChildren(...isi);
  perbaruiPanah();
}

/** Judul kolom: klik untuk mengurutkan, klik lagi membalik arah. */
export function initTabel() {
  for (const b of document.querySelectorAll("[data-urut]")) {
    b.addEventListener("click", () => {
      const { urut, arah } = getState();
      const sama = urut === b.dataset.urut;
      setState({
        urut: b.dataset.urut,
        // Kolom baru mulai dari menurun untuk angka (yang "paling" dulu),
        // menaik untuk nama (A-Z).
        arah: sama ? (arah === "asc" ? "desc" : "asc") : b.dataset.urut === "kecamatan" ? "asc" : "desc",
      });
    });
  }
}

export function perbaruiPanah() {
  const { urut, arah } = getState();
  for (const p of document.querySelectorAll("[data-panah]")) {
    const aktif = p.dataset.panah === urut;
    p.textContent = aktif ? PANAH[arah] : "";
    p.setAttribute("aria-hidden", "true");
    p.closest("button")?.setAttribute(
      "aria-sort",
      aktif ? (arah === "asc" ? "ascending" : "descending") : "none"
    );
  }
}

export const HEADER = KOLOM;

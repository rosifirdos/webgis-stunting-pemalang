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
 * Baris dan peta terhubung dua arah: klik baris menyorot kecamatan di peta,
 * klik poligon menyorot barisnya.
 */

const KOLOM = [
  { kunci: "kecamatan", label: "Kecamatan", jenis: "teks" },
  { kunci: "stunting_pct", label: "Stunting", jenis: "persen" },
  { kunci: "sanitasi_pct", label: "Sanitasi layak", jenis: "persen" },
  { kunci: "stunting_jml", label: "Kasus", jenis: "angka" },
  { kunci: "balita_ukur", label: "Balita diukur", jenis: "angka" },
  { kunci: "kelas", label: "Kelas", jenis: "angka" },
];

const sel = (teks, kelas = "") =>
  `<td class="px-4 py-2.5 ${kelas}">${teks}</td>`;

const PANAH = { asc: "↑", desc: "↓" };

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

export function gambarTabel(rows) {
  const tbody = document.getElementById("isi-tabel");
  if (!tbody) return;

  const { terpilih } = getState();

  tbody.replaceChildren(
    ...rows.map((r) => {
      const tr = document.createElement("tr");
      tr.dataset.nama = r.kecamatan;
      tr.dataset.terpilih = String(r.kecamatan === terpilih);
      tr.setAttribute("aria-selected", String(r.kecamatan === terpilih));
      tr.tabIndex = 0;
      tr.className =
        "cursor-pointer border-b border-[var(--color-hairline)] transition last:border-0";
      tr.innerHTML =
        sel(r.kecamatan, "font-medium") +
        sel(`${angka(r.stunting_pct, 2)}%`, "tnum text-right") +
        sel(
          `${angka(r.sanitasi_pct, 2)}%${
            r.sanitasi_pct > 100
              ? ' <span class="text-[var(--color-warning)]" title="Nilai di atas 100% — lihat halaman Info">*</span>'
              : ""
          }`,
          "tnum text-right"
        ) +
        sel(angka(r.stunting_jml), "tnum text-right") +
        sel(angka(r.balita_ukur), "tnum text-right text-[var(--color-ink-2)]") +
        sel(selKelas(r));

      const pilih = () => saatPilih(r.kecamatan);
      tr.addEventListener("click", pilih);
      tr.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          pilih();
        }
      });
      return tr;
    })
  );

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

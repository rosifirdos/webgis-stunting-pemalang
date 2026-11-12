import { getState, setState } from "../state/store.js";
import { angka } from "../data/stats.js";

/**
 * Baris filter di atas dashboard.
 *
 * Satu baris kontrol, di atas semua yang dipengaruhinya, dengan status
 * "berapa dari berapa" yang diumumkan ke pembaca layar setiap kali berubah -
 * supaya efek filter tidak harus disimpulkan dari grafik yang bergerak.
 */

export function initFilter(total) {
  const kelas = document.getElementById("filter-kelas");
  const cari = document.getElementById("cari-kecamatan");
  const reset = document.getElementById("reset-filter");

  kelas?.addEventListener("change", () => setState({ kelas: kelas.value }));
  cari?.addEventListener("input", () => setState({ cari: cari.value.trim() }));

  reset?.addEventListener("click", () => {
    if (kelas) kelas.value = "";
    if (cari) cari.value = "";
    setState({ kelas: "", cari: "" });
    cari?.focus();
  });

  // Enter di kolom pencarian tidak mengirim formulir apa pun (tidak ada form),
  // tapi Esc mengosongkan - kebiasaan yang diharapkan dari input pencarian.
  cari?.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      cari.value = "";
      setState({ cari: "" });
    }
  });

  perbaruiRingkasanFilter(total);
}

export function perbaruiRingkasanFilter(total) {
  const el = document.getElementById("filter-ringkas");
  if (!el) return;

  const { kelas, cari } = getState();
  const aktif = Boolean(kelas || cari);
  const n = Number(el.dataset.n ?? total);

  if (!aktif) {
    el.textContent = `${angka(total)} kecamatan`;
    el.classList.remove("text-[var(--color-warning)]");
    return;
  }

  const bagian = [];
  if (kelas) bagian.push(`kelas ${kelas}`);
  if (cari) bagian.push(`nama mengandung "${cari}"`);

  el.textContent = n === 0 ? "Tidak ada kecamatan yang cocok" : `${angka(n)} dari ${angka(total)} kecamatan — ${bagian.join(", ")}`;
  el.classList.toggle("text-[var(--color-warning)]", n === 0);
}

/** Simpan jumlah hasil terakhir agar ringkasan bisa dibaca ulang. */
export function catatHasil(n) {
  const el = document.getElementById("filter-ringkas");
  if (el) el.dataset.n = String(n);
}

/**
 * Tombol "Tabel" pada tiap grafik: menukar kanvas dengan tabel nilai persis.
 * Ini yang membuat grafik tidak pernah bergantung pada warna saja.
 */
export function initToggleTabel(isi) {
  for (const tombol of document.querySelectorAll("[data-tabel-toggle]")) {
    const nama = tombol.dataset.tabelToggle;
    const kotak = document.querySelector(`[data-chart="${nama}"]`);
    const tabel = document.querySelector(`[data-tabel="${nama}"]`);
    if (!kotak || !tabel) continue;

    if (!tabel.dataset.terisi && isi[nama]) {
      tabel.innerHTML = isi[nama]();
      tabel.dataset.terisi = "1";
    }

    tombol.addEventListener("click", () => {
      const tampilTabel = kotak.hidden === false;
      kotak.hidden = tampilTabel;
      tabel.hidden = !tampilTabel;
      tombol.setAttribute("aria-pressed", String(tampilTabel));
      tombol.textContent = tampilTabel ? "Grafik" : "Tabel";
    });
  }
}

/** Isi ulang tabel alternatif ketika filter berubah. */
export function segarkanTabelGrafik(isi) {
  for (const [nama, fn] of Object.entries(isi)) {
    const tabel = document.querySelector(`[data-tabel="${nama}"]`);
    if (!tabel || tabel.hidden) continue; // hanya yang sedang terlihat
    tabel.innerHTML = fn();
  }
}

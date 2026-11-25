import { ringkas, prioritasRingkas, angka } from "../data/stats.js";

/**
 * KPI & angka utama.
 *
 * Aturan yang dipegang di sini: setiap angka yang tampil harus bisa
 * ditelusuri ke data mentah. Tidak ada angka yang ditulis tangan di HTML -
 * semuanya dihitung dari 14 baris yang sama yang menggambar peta.
 *
 * Tiga kartu di bawah hero menjawab tiga pertanyaan berbeda: berapa beban
 * kabupaten, di mana prioritas utama, dan di mana prioritas menengah.
 * Semuanya diturunkan dari prevalensi stunting; tidak ada faktor penjelas
 * tunggal yang naik ke kartu ringkasan. Hubungan tiap determinan dengan
 * stunting dibahas di panel Info (uji determinan).
 */

const daftarNama = (rows, maks = 3) => {
  const urut = [...rows].sort((a, b) => b.stunting_pct - a.stunting_pct);
  const nama = urut.slice(0, maks).map((r) => r.kecamatan);
  const sisa = urut.length - nama.length;
  return sisa > 0 ? `${nama.join(", ")}, +${angka(sisa)} lainnya` : nama.join(", ");
};

export function gambarKpi(rows) {
  const s = ringkas(rows);
  const k = prioritasRingkas(rows);
  const utama = rows.filter((r) => r.prioritas === "1 Prioritas Utama");
  const menengah = rows.filter((r) => r.prioritas === "2 Prioritas Menengah");

  const hero = document.getElementById("hero-stunting");
  if (hero) hero.textContent = angka(k["1 Prioritas Utama"]);

  const heroCatatan = document.getElementById("hero-catatan");
  if (heroCatatan) {
    heroCatatan.textContent =
      `Beban kabupaten: rerata prevalensi ${angka(s.rerataStunting, 1)}%, ` +
      `berbobot ${angka(s.stuntingBerbobot, 1)}% — ${angka(s.totalKasus)} kasus ` +
      `dari ${angka(s.totalBalita)} balita yang diukur di 14 kecamatan.`;
  }

  const set = (id, teks) => {
    const el = document.getElementById(id);
    if (el) el.textContent = teks;
  };

  // 1. Rerata stunting — angka yang sama dengan hero, tetapi dengan satuan
  //    yang jelas di kartu tersendiri.
  set("kpi-rerata", `${angka(s.rerataStunting, 1)}%`);

  // 2. Prioritas Utama — kelas prevalensi tertinggi (kelas 5).
  set("kpi-prioritas", `${angka(k["1 Prioritas Utama"])} kecamatan`);
  set("kpi-prioritas-nama", daftarNama(utama));

  // 3. Prioritas Menengah — kelas 4, satu tingkat di bawahnya.
  set("kpi-menengah", `${angka(k["2 Prioritas Menengah"])} kecamatan`);
  set("kpi-menengah-nama", daftarNama(menengah));
}

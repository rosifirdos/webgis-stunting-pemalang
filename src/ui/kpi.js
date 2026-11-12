import { ringkas, angka } from "../data/stats.js";

/**
 * KPI & angka utama.
 *
 * Aturan yang dipegang di sini: setiap angka yang tampil harus bisa
 * ditelusuri ke data mentah. Tidak ada angka yang ditulis tangan di HTML -
 * semuanya dihitung dari 14 baris yang sama yang menggambar peta.
 *
 * Angka besar (hero) memakai rerata sederhana antar-kecamatan karena satuannya
 * adalah "kecamatan", bukan "balita". Rerata berbobot kabupaten ditampilkan
 * sebagai catatan di bawahnya, supaya pembaca tahu kedua angka itu ada dan
 * mengapa bisa berbeda.
 */

export function gambarKpi(rows) {
  const s = ringkas(rows);

  const hero = document.getElementById("hero-stunting");
  if (hero) hero.textContent = `${angka(s.rerataStunting, 1)}%`;

  const heroCatatan = document.getElementById("hero-catatan");
  if (heroCatatan) {
    heroCatatan.textContent =
      `Bila dibobot jumlah balita yang diukur, angkanya menjadi ` +
      `${angka(s.stuntingBerbobot, 1)}% — ${angka(s.totalKasus)} kasus dari ` +
      `${angka(s.totalBalita)} balita yang diukur di 14 kecamatan.`;
  }

  const san = document.getElementById("kpi-sanitasi");
  if (san) san.textContent = `${angka(s.rerataSanitasi, 1)}%`;

  const hotspot = document.getElementById("kpi-hotspot");
  const hotspotNilai = document.getElementById("kpi-hotspot-nilai");
  if (hotspot && hotspotNilai) {
    hotspot.textContent = s.maksStunting.kecamatan;
    hotspotNilai.textContent =
      `${angka(s.maksStunting.stunting_pct, 2)}% balita stunting · ` +
      `${angka(s.maksStunting.stunting_jml)} kasus`;
  }

  const sanMin = document.getElementById("kpi-sanitasi-min");
  const sanMinNilai = document.getElementById("kpi-sanitasi-min-nilai");
  if (sanMin && sanMinNilai) {
    sanMin.textContent = s.minSanitasi.kecamatan;
    sanMinNilai.textContent = `${angka(s.minSanitasi.sanitasi_pct, 2)}% keluarga dengan sanitasi layak`;
  }

  const r = document.getElementById("nilai-r");
  const r2 = document.getElementById("nilai-r2");
  const tafsir = document.getElementById("tafsir-r");
  if (r) r.textContent = angka(s.r, 2);
  if (r2) r2.textContent = angka(s.r2, 2);
  if (tafsir) tafsir.textContent = tafsirR(s.r, s.n);

  const infoR = document.getElementById("info-r");
  if (infoR) infoR.textContent = `r = ${angka(s.r, 2)}`;
}

/**
 * Tafsir tanpa melebih-lebihkan: menyebut arah dan kekuatan, lalu menegaskan
 * batasnya (n kecil, agregat kecamatan).
 */
export function tafsirR(r, n) {
  const a = Math.abs(r);
  const kekuatan =
    a < 0.2 ? "sangat lemah" : a < 0.4 ? "lemah" : a < 0.6 ? "sedang" : a < 0.8 ? "kuat" : "sangat kuat";
  const arah = r < 0 ? "negatif" : "positif";
  const pct = angka(r * r * 100, 0);

  return (
    `kecenderungan ${arah} berkekuatan ${kekuatan}: makin tinggi akses sanitasi, ` +
    `stunting cenderung ${r < 0 ? "lebih rendah" : "lebih tinggi"}. ` +
    `Sanitasi menjelaskan sekitar ${pct}% keragaman stunting antar ${n} kecamatan; ` +
    `sisanya ditentukan faktor lain yang tidak tersedia di data ini.`
  );
}

/**
 * Klasifikasi kelas kerentanan.
 *
 * Stunting memakai selang seragam (equal interval) dari nilai minimum ke
 * maksimum, sama seperti klasifikasi pada peta QGIS di laporan, supaya warna
 * di web dan di laporan cetak menunjuk kelas yang sama.
 *
 * Sanitasi sengaja TIDAK memakai selang seragam dari data, melainkan skala
 * 0-100%. Alasannya: satu kecamatan bernilai 111,77% (lihat halaman Info).
 * Bila selang dihitung dari data, anomali itu justru meregangkan skala dan
 * menutupi masalahnya. Dengan skala 0-100%, nilai di atas 100% jatuh di luar
 * kelas teratas sehingga anomali terlihat, bukan tersembunyi.
 */

export const AMBANG_STUNTING = [8.3233, 12.5067];

export const KELAS = [
  {
    nama: "Rendah",
    label: "Rendah",
    keterangan: "< 8,32%",
    gaya: "rendah",
  },
  {
    nama: "Sedang",
    label: "Sedang",
    keterangan: "8,32 – 12,51%",
    gaya: "sedang",
  },
  {
    nama: "Tinggi",
    label: "Tinggi",
    keterangan: "≥ 12,51%",
    gaya: "tinggi",
  },
];

export function kelasStunting(pct) {
  if (pct >= AMBANG_STUNTING[1]) return "Tinggi";
  if (pct >= AMBANG_STUNTING[0]) return "Sedang";
  return "Rendah";
}

/** Indeks kelas 0..2 untuk keperluan warna. */
export function indeksKelas(nama) {
  return nama === "Tinggi" ? 2 : nama === "Sedang" ? 1 : 0;
}

/**
 * Definisi kelas untuk layer sanitasi (skala 0-100%).
 * "Baik" = capaian tinggi.
 */
export function kelasSanitasi(pct) {
  if (pct >= 66.67) return "Baik";
  if (pct >= 33.33) return "Sedang";
  return "Rendah";
}

export function indeksKelasSanitasi(pct) {
  return pct >= 66.67 ? 2 : pct >= 33.33 ? 1 : 0;
}

/**
 * Rincian kelas layer sanitasi beserta rentangnya, untuk legenda.
 * `diLuar` menandai kecamatan di atas 100% bila ada.
 */
export const KELAS_SANITASI = [
  { nama: "Rendah", keterangan: "0 – 33,3%" },
  { nama: "Sedang", keterangan: "33,3 – 66,7%" },
  { nama: "Baik", keterangan: "66,7 – 100%" },
];

/**
 * Kecamatan prioritas: stunting kelas Tinggi DAN sanitasi layak di bawah 60%.
 * Menandai wilayah yang bermasalah pada dua indikator sekaligus.
 */
export function prioritas(row) {
  return row.kelas === "Tinggi" && row.sanitasi_pct < 60;
}

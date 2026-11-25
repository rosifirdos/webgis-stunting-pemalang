/**
 * Klasifikasi 5 kelas kuantil + tingkat prioritas intervensi.
 *
 * Semua break dan label kelas tinggal di satu modul ini supaya peta,
 * legenda, tabel, grafik, dan unduhan tidak pernah menunjuk kelas yang
 * berbeda. Nilainya HARUS identik dengan break QGIS - break yang sama dipakai
 * ekspor QGIS, sehingga warna di web dan di peta cetak cocok.
 *
 * Kelas dikembalikan sebagai ANGKA 1..5, bukan string. Ini disengaja: warna
 * ramp (--color-stunting-1..5) memakai angka yang sama sebagai indeks, jadi
 * tidak ada pemetaan nama->warna yang bisa melenceng.
 *
 * Label tetap berupa teks ("Kelas 1 — sangat rendah" dst.) agar warna bukan
 * satu-satunya pembeda kelas (aksesibilitas).
 *
 * Prioritas intervensi murni mengikuti beban prevalensi stunting per
 * kecamatan. Tidak ada faktor penjelas tunggal - sanitasi maupun lainnya -
 * yang ikut menentukan kategori ini; hubungan tiap determinan dengan
 * stunting dibahas terpisah di panel Info (uji determinan).
 */

export const BREAK_STUNTING = [5.294, 7.396, 9.132, 12.176];
/**
 * Break Indeks Kapasitas Layanan, diambil dari renderer QGIS (Quantile,
 * 5 kelas). Enam angka di README (`-0,5877 / ... / 0,5869`) adalah min +
 * empat break + max; empat break itulah yang dipakai di sini.
 */
export const BREAK_KAPASITAS = [-0.2237, -0.1262, 0.0641, 0.2566];

/** Format angka gaya Indonesia dengan dua desimal (mis. 5.294 -> "5,29"). */
const desimal = (v) =>
  Number(v).toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/**
 * Kelas 1..5 dari daftar break.
 * Nilai di bawah break pertama masuk kelas 1, di atas break terakhir kelas 5.
 */
function kelasDariBreak(nilai, breaks) {
  const v = Number(nilai);
  if (!Number.isFinite(v)) return 1;
  for (let i = 0; i < breaks.length; i++) {
    if (v < breaks[i]) return i + 1;
  }
  return 5;
}

export function kelasStunting(pct) {
  return kelasDariBreak(pct, BREAK_STUNTING);
}

export function kelasKapasitas(idx) {
  return kelasDariBreak(idx, BREAK_KAPASITAS);
}

/**
 * Sanitasi layak diperlakukan persis seperti variabel determinan lain:
 * kelas kuantilnya sendiri (break sama dengan renderer QGIS, ramp Blues),
 * dipakai hanya oleh layer peta opsional - bukan oleh tingkat prioritas,
 * klasifikasi apa pun yang menaikkan statusnya, maupun narasi utama.
 */
export const BREAK_SANITASI = [55.506, 64.24, 71.46, 76.55];

export function kelasSanitasi(pct) {
  return kelasDariBreak(pct, BREAK_SANITASI);
}

/** Teks rentang tiap kelas, dibangun dari break agar tidak bisa melenceng. */
function rentang(i, breaks) {
  if (i === 0) return `< ${desimal(breaks[0])}%`;
  if (i === breaks.length) return `≥ ${desimal(breaks[breaks.length - 1])}%`;
  return `${desimal(breaks[i - 1])} – ${desimal(breaks[i])}%`;
}

/** Rentang indeks (bukan persen); nilai kapasitas bisa negatif. */
function rentangIndeks(i, breaks) {
  if (i === 0) return `< ${desimal(breaks[0])}`;
  if (i === breaks.length) return `≥ ${desimal(breaks[breaks.length - 1])}`;
  return `${desimal(breaks[i - 1])} – ${desimal(breaks[i])}`;
}

const LABEL_STUNTING = [
  "Kelas 1 — sangat rendah",
  "Kelas 2 — rendah",
  "Kelas 3 — sedang",
  "Kelas 4 — tinggi",
  "Kelas 5 — sangat tinggi",
];

const LABEL_KAPASITAS = [
  "Kelas 1 — kapasitas paling rendah",
  "Kelas 2 — rendah",
  "Kelas 3 — sedang",
  "Kelas 4 — tinggi",
  "Kelas 5 — kapasitas paling tinggi",
];

function susunKelas(labels, breaks, rentangFn = rentang) {
  return labels.map((label, i) => ({
    tingkat: i + 1,
    label,
    min: i === 0 ? null : breaks[i - 1],
    max: i === breaks.length ? null : breaks[i],
    keterangan: rentangFn(i, breaks),
  }));
}

export const KELAS_STUNTING = susunKelas(LABEL_STUNTING, BREAK_STUNTING);

/**
 * Indeks Kapasitas Layanan: nilai TINGGI berarti kapasitas layanan lebih baik.
 * Ini bukan indeks risiko. Lihat catatan efek deteksi di panel Info.
 */
export const KELAS_KAPASITAS = susunKelas(
  LABEL_KAPASITAS,
  BREAK_KAPASITAS,
  rentangIndeks
);

const LABEL_SANITASI = [
  "Kelas 1 — terendah",
  "Kelas 2 — rendah",
  "Kelas 3 — sedang",
  "Kelas 4 — tinggi",
  "Kelas 5 — tertinggi",
];

export const KELAS_SANITASI = susunKelas(LABEL_SANITASI, BREAK_SANITASI);

/** Label tanpa awalan "Kelas n — " untuk ruang sempit (popup, tooltip). */
export function labelSingkat(tingkat, daftar = KELAS_STUNTING) {
  const k = daftar[Number(tingkat) - 1];
  return k ? k.label.replace(/^Kelas \d+ — /, "") : "";
}

/**
 * Tingkat prioritas intervensi, murni dari kelas prevalensi stunting.
 * Empat kategori agar tetap ringkas di legenda; kelas 1-2 digabung karena
 * keduanya sama-sama di bawah rerata kabupaten.
 */
export const KATEGORI_PRIORITAS = [
  {
    nilai: "1 Prioritas Utama",
    label: "Prioritas Utama",
    singkat: "Prioritas Utama",
    ket: "prevalensi ≥ 12,18% (kelas 5)",
    kelas: [5],
    warna: "#b2182b",
  },
  {
    nilai: "2 Prioritas Menengah",
    label: "Prioritas Menengah",
    singkat: "Prioritas Menengah",
    ket: "9,13 – 12,18% (kelas 4)",
    kelas: [4],
    warna: "#f4a582",
  },
  {
    nilai: "3 Pemantauan",
    label: "Pemantauan",
    singkat: "Pemantauan",
    ket: "7,40 – 9,13% (kelas 3)",
    kelas: [3],
    warna: "#92c5de",
  },
  {
    nilai: "4 Relatif Rendah",
    label: "Relatif Rendah",
    singkat: "Relatif Rendah",
    ket: "< 7,40% (kelas 1–2)",
    kelas: [1, 2],
    warna: "#2166ac",
  },
];

/** Tingkat prioritas sebuah kecamatan, dari kelas prevalensinya. */
export function prioritas(row) {
  const kelas = Number(row?.kelas ?? kelasStunting(row?.stunting_pct));
  const kategori = KATEGORI_PRIORITAS.find((k) => k.kelas.includes(kelas));
  return kategori?.nilai ?? KATEGORI_PRIORITAS[KATEGORI_PRIORITAS.length - 1].nilai;
}

/** Kalimat alasan prioritas, mis. "prevalensi 16,69% ≥ 12,18% (kelas 5)". */
export function alasanPrioritas(row) {
  const v = Number(row?.stunting_pct);
  const kelas = kelasStunting(v);
  const kategori = KATEGORI_PRIORITAS.find((k) => k.kelas.includes(kelas));
  return `prevalensi ${desimal(v)}% — ${kategori?.ket ?? `kelas ${kelas}`}`;
}

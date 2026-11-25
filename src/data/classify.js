/**
 * Klasifikasi 5 kelas kuantil + kuadran prioritas.
 *
 * Semua break, median, dan label kelas tinggal di satu modul ini supaya peta,
 * legenda, tabel, grafik, dan unduhan tidak pernah menunjuk kelas yang
 * berbeda. Nilainya HARUS identik dengan PRD v2.0 §2.2 dan §2.3 - break yang
 * sama dipakai ekspor QGIS, sehingga warna di web dan di peta cetak cocok.
 *
 * Kelas dikembalikan sebagai ANGKA 1..5, bukan string. Ini disengaja: warna
 * ramp (--color-stunting-1..5) memakai angka yang sama sebagai indeks, jadi
 * tidak ada pemetaan nama->warna yang bisa melenceng.
 *
 * Label tetap berupa teks ("Kelas 1 — sangat rendah" dst.) agar warna bukan
 * satu-satunya pembeda kelas (aksesibilitas, PRD §8.4).
 */

export const BREAK_STUNTING = [5.294, 7.396, 9.132, 12.176];
export const BREAK_SANITASI = [55.506, 64.24, 71.46, 76.55];
/**
 * Break Indeks Kapasitas Layanan, diambil dari renderer QGIS (Quantile,
 * 5 kelas). Enam angka di README (`-0,5877 / ... / 0,5869`) adalah min +
 * empat break + max; empat break itulah yang dipakai di sini.
 */
export const BREAK_KAPASITAS = [-0.2237, -0.1262, 0.0641, 0.2566];
export const MEDIAN_STUNTING = 8.6;
export const MEDIAN_SANITASI = 71.33;

/** Format angka gaya Indonesia dengan dua desimal (mis. 5.294 -> "5,29"). */
const desimal = (v) =>
  Number(v).toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/**
 * Kelas 1..5 dari daftar break.
 * Nilai di bawah break pertama masuk kelas 1, di atas break terakhir kelas 5 -
 * termasuk nilai sanitasi di atas 100% (mis. Warungpring 111,77%).
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

export function kelasSanitasi(pct) {
  return kelasDariBreak(pct, BREAK_SANITASI);
}

export function kelasKapasitas(idx) {
  return kelasDariBreak(idx, BREAK_KAPASITAS);
}

/** Teks rentang tiap kelas, dibangun dari break agar tidak bisa melenceng. */
function rentang(i, breaks) {
  if (i === 0) return `< ${desimal(breaks[0])}%`;
  if (i === breaks.length) return `≥ ${desimal(breaks[breaks.length - 1])}%`;
  return `${desimal(breaks[i - 1])} – ${desimal(breaks[i])}%`;
}

/** Rentang indeks (bukan persen); nilai kapasitas bisa negatif. */
const bertanda = (v) =>
  Number(v).toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function rentangIndeks(i, breaks) {
  if (i === 0) return `< ${bertanda(breaks[0])}`;
  if (i === breaks.length) return `≥ ${bertanda(breaks[breaks.length - 1])}`;
  return `${bertanda(breaks[i - 1])} – ${bertanda(breaks[i])}`;
}

const LABEL_STUNTING = [
  "Kelas 1 — sangat rendah",
  "Kelas 2 — rendah",
  "Kelas 3 — sedang",
  "Kelas 4 — tinggi",
  "Kelas 5 — sangat tinggi",
];

/**
 * Sanitasi memakai kata yang sama untuk capaian, bukan kerentanan: kelas 1
 * berarti cakupan sangat rendah, kelas 5 cakupan sangat tinggi.
 */
const LABEL_SANITASI = [
  "Kelas 1 — sangat rendah",
  "Kelas 2 — rendah",
  "Kelas 3 — sedang",
  "Kelas 4 — tinggi",
  "Kelas 5 — sangat tinggi",
];

function susunKelas(labels, breaks, tambahanKelas5 = {}, rentangFn = rentang) {
  return labels.map((label, i) => ({
    tingkat: i + 1,
    label,
    min: i === 0 ? null : breaks[i - 1],
    max: i === breaks.length ? null : breaks[i],
    keterangan: rentangFn(i, breaks),
    ...(i === labels.length - 1 ? tambahanKelas5 : {}),
  }));
}

export const KELAS_STUNTING = susunKelas(LABEL_STUNTING, BREAK_STUNTING);

export const KELAS_SANITASI = susunKelas(LABEL_SANITASI, BREAK_SANITASI, {
  // Kelas teratas sanitasi memuat nilai > 100% (Warungpring 111,77%).
  // Penanda ini yang membuat UI bisa menulis "di luar skala" tanpa menebak.
  diLuarSkala: true,
});

const LABEL_KAPASITAS = [
  "Kelas 1 — kapasitas paling rendah",
  "Kelas 2 — rendah",
  "Kelas 3 — sedang",
  "Kelas 4 — tinggi",
  "Kelas 5 — kapasitas paling tinggi",
];

/**
 * Indeks Kapasitas Layanan: nilai TINGGI berarti kapasitas layanan lebih baik.
 * Ini bukan indeks risiko. Lihat catatan efek deteksi di panel Info.
 */
export const KELAS_KAPASITAS = susunKelas(
  LABEL_KAPASITAS,
  BREAK_KAPASITAS,
  {},
  rentangIndeks
);

/**
 * Kuadran prioritas sebagai kategori peta. Urutan sama dengan definisi
 * median split; `warna` persis PRD §FR-03.
 */
export const KATEGORI_KUADRAN = [
  {
    nilai: "1 Prioritas Utama",
    label: "Prioritas Utama (kuadran 1)",
    singkat: "Prioritas Utama",
    ket: "stunting ≥ 8,60% · sanitasi < 71,33%",
    warna: "#b2182b",
  },
  {
    nilai: "2 Determinan Lain",
    label: "Determinan Lain (kuadran 2)",
    singkat: "Determinan Lain",
    ket: "stunting ≥ 8,60% · sanitasi ≥ 71,33%",
    warna: "#f4a582",
  },
  {
    nilai: "3 Waspada",
    label: "Waspada (kuadran 3)",
    singkat: "Waspada",
    ket: "stunting < 8,60% · sanitasi < 71,33%",
    warna: "#92c5de",
  },
  {
    nilai: "4 Relatif Aman",
    label: "Relatif Aman (kuadran 4)",
    singkat: "Relatif Aman",
    ket: "stunting < 8,60% · sanitasi ≥ 71,33%",
    warna: "#2166ac",
  },
];

/** Label tanpa awalan "Kelas n — " untuk ruang sempit (popup, tooltip). */
export function labelSingkat(tingkat, daftar = KELAS_STUNTING) {
  const k = daftar[Number(tingkat) - 1];
  return k ? k.label.replace(/^Kelas \d+ — /, "") : "";
}

/**
 * Kuadran prioritas dari median split (PRD §2.3).
 * Memakai sanitasi_pct (sanitasi layak), bukan sanitasi_aman_pct.
 */
export function kuadran(row) {
  const stunting = Number(row?.stunting_pct);
  const sanitasi = Number(row?.sanitasi_pct);
  const stuntingTinggi = stunting >= MEDIAN_STUNTING;
  const sanitasiBaik = sanitasi >= MEDIAN_SANITASI;

  if (stuntingTinggi && !sanitasiBaik) return "1 Prioritas Utama";
  if (stuntingTinggi && sanitasiBaik) return "2 Determinan Lain";
  if (!stuntingTinggi && !sanitasiBaik) return "3 Waspada";
  return "4 Relatif Aman";
}

/** Kalimat alasan kuadran, mis. "stunting 16,69% ≥ median 8,60%; ...". */
export function alasanKuadran(row) {
  const stunting = Number(row?.stunting_pct);
  const sanitasi = Number(row?.sanitasi_pct);
  return (
    `stunting ${desimal(stunting)}% ${stunting >= MEDIAN_STUNTING ? "≥" : "<"} median ${desimal(MEDIAN_STUNTING)}%; ` +
    `sanitasi ${desimal(sanitasi)}% ${sanitasi >= MEDIAN_SANITASI ? "≥" : "<"} median ${desimal(MEDIAN_SANITASI)}`
  );
}

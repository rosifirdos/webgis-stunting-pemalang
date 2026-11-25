import { getState } from "../state/store.js";
import {
  kelasStunting,
  kelasSanitasi,
  kelasKapasitas,
  KELAS_STUNTING,
  KELAS_SANITASI,
  KELAS_KAPASITAS,
  KATEGORI_KUADRAN,
} from "../data/classify.js";

/**
 * Warna isi poligon disalin dari proyek QGIS 3.44.16
 * (../output/Pemalang_Stunting_Sanitasi_2024.qgz), bukan dari token tema:
 *   Prevalensi Stunting 2024        -> Reds    5 kelas kuantil
 *   Cakupan Sanitasi Layak 2024     -> Blues   5 kelas kuantil
 *   Indeks Kapasitas Layanan 2024   -> RdYlGn  5 kelas kuantil
 *   Kuadran prioritas              -> 4 warna kategori (PRD FR-03)
 * Karena ramp ini tetap di tema terang maupun gelap, satu kelas selalu
 * berwarna sama - tidak ada arti warna yang terbalik saat tema berganti -
 * dan peta di layar membaca sama dengan peta cetak.
 *
 * Grafik (batang, sebar) tetap memakai token --color-stunting-* /
 * --color-sanitasi-*, yang langkahnya dipilih ulang untuk tema gelap.
 */
export const RAMP_QGIS = {
  stunting: ["#fff5f0", "#fcbea5", "#fb7050", "#d32020", "#67000d"],
  sanitasi: ["#f7fbff", "#c8dcf0", "#73b2d8", "#2979b9", "#08306b"],
  kapasitas: ["#d7191c", "#fdae61", "#ffffbf", "#a6d96a", "#1a9641"],
};

/** Warna kelas 1..5 (rendah -> tinggi) untuk sebuah variabel peta. */
export function warnaKelas(nama, tingkat) {
  const ramp = RAMP_QGIS[nama] ?? RAMP_QGIS.stunting;
  const i = Math.min(Math.max(Math.round(tingkat), 1), ramp.length) - 1;
  return ramp[i];
}

/**
 * Legenda memakai urutan sesuai tampilan peta. Untuk kelas kuantil nilainya
 * disimpan rendah->tinggi lalu dibalik agar nilai besar di atas; untuk
 * kategori, urutan kuadran 1..4 sudah bermakna dan tidak dibalik.
 */
const legenda = (daftar) =>
  [...daftar].reverse().map((k) => ({
    label: k.label,
    ket: k.keterangan,
    warnaIndeks: k.tingkat - 1,
  }));

const KELOMPOK_KUADRAN = KATEGORI_KUADRAN.map((k) => ({
  label: k.label,
  ket: k.ket,
  warna: k.warna,
}));

export const PANEL = {
  stunting: {
    nama: "stunting",
    jenis: "kuantil",
    judul: "Peta Prevalensi Stunting",
    satuan: "%",
    field: "stunting_pct",
    kelas: legenda(KELAS_STUNTING),
    catatan:
      "Fokus studi. Lima kelas kuantil; batas dan warna kategori (Reds) sama dengan peta QGIS. Kelas tinggi = prevalensi tinggi.",
  },
  sanitasi: {
    nama: "sanitasi",
    jenis: "kuantil",
    judul: "Faktor penjelas: sanitasi layak",
    satuan: "%",
    field: "sanitasi_pct",
    kelas: legenda(KELAS_SANITASI),
    catatan:
      "Faktor penjelas, bukan variabel setara stunting. Lima kelas kuantil dengan warna Blues QGIS. Nilai di atas 100% (Warungpring 111,77%) tetap di kelas 5 dan ditandai di luar skala, tidak dikoreksi.",
  },
  prioritas: {
    nama: "prioritas",
    jenis: "kategori",
    judul: "Kuadran Prioritas Stunting",
    satuan: "",
    field: "kuadran",
    kelas: KELOMPOK_KUADRAN,
    catatan:
      "Kuadran 2×2 dari median stunting 8,60% dan median sanitasi 71,33%. Kuadran 2 (Determinan Lain) adalah pesan kunci: sanitasi baik tidak menjamin stunting rendah.",
  },
  kapasitas: {
    nama: "kapasitas",
    jenis: "kuantil",
    judul: "Indeks Kapasitas Layanan",
    satuan: "",
    field: "idx_layanan",
    kelas: legenda(KELAS_KAPASITAS),
    catatan:
      "Indeks kapasitas layanan, bukan indeks risiko. Nilai tinggi = kapasitas layanan lebih baik, tetapi berkorelasi positif dengan stunting (r = +0,50), diduga karena efek deteksi.",
  },
};

export function panelAktif() {
  return PANEL[getState().layer] ?? PANEL.stunting;
}

/** Tingkat kelas 1..5 untuk sebuah baris pada panel kuantil. */
function tingkatKelas(row, panel) {
  const v = row[panel.field];
  if (panel.nama === "stunting") return kelasStunting(v);
  if (panel.nama === "sanitasi") return kelasSanitasi(v);
  return kelasKapasitas(v);
}

/**
 * Warna isi polygon untuk sebuah kecamatan pada layer aktif.
 * Nilai di atas 100% (sanitasi) tetap memakai langkah teratas, lalu ditandai
 * pada popup/legenda. Panel kategori memakai warna kuadrannya sendiri.
 */
export function warnaUntuk(row, panel = panelAktif()) {
  if (panel.jenis === "kategori") {
    return (
      KATEGORI_KUADRAN.find((k) => k.nilai === row.kuadran)?.warna ??
      "#9ca3af"
    );
  }
  return warnaKelas(panel.nama, tingkatKelas(row, panel));
}

/** Nilai yang ditulis di tooltip/popup, dengan penanda bila di luar skala. */
export function nilaiTeks(row, panel = panelAktif()) {
  const v = row[panel.field];

  if (panel.nama === "prioritas") {
    return { teks: row.kuadran, diLuarSkala: false };
  }

  if (panel.nama === "kapasitas") {
    const teks = Number(v).toLocaleString("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return { teks: `${Number(v) > 0 ? "+" : ""}${teks}`, diLuarSkala: false };
  }

  const teks = Number(v).toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const luar = panel.nama === "sanitasi" && v > 100;
  return { teks: `${teks}%`, diLuarSkala: luar };
}

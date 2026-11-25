import { getState } from "../state/store.js";
import {
  kelasStunting,
  kelasSanitasi,
  KELAS_STUNTING,
  KELAS_SANITASI,
} from "../data/classify.js";

/**
 * Warna isi poligon disalin dari proyek QGIS 3.44.16
 * (../output/Pemalang_Stunting_Sanitasi_2024.qgz), bukan dari token tema:
 *   Prevalensi Stunting 2024        -> Reds  5 kelas kuantil
 *   Cakupan Sanitasi Layak 2024     -> Blues 5 kelas kuantil
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
};

/** Warna kelas 1..5 (rendah -> tinggi) untuk sebuah variabel peta. */
export function warnaKelas(nama, tingkat) {
  const ramp = RAMP_QGIS[nama] ?? RAMP_QGIS.stunting;
  const i = Math.min(Math.max(Math.round(tingkat), 1), ramp.length) - 1;
  return ramp[i];
}

/**
 * Legenda memakai urutan tinggi->rendah (nilai besar di atas), sedangkan
 * konstanta kelas disimpan rendah->tinggi. `warnaIndeks` menunjuk langkah ramp
 * yang sama dengan angka kelas (1..5 -> indeks 0..4).
 */
const legenda = (daftar) =>
  [...daftar].reverse().map((k) => ({
    label: k.label,
    ket: k.keterangan,
    warnaIndeks: k.tingkat - 1,
  }));

export const PANEL = {
  stunting: {
    nama: "stunting",
    judul: "Prevalensi Stunting",
    satuan: "%",
    field: "stunting_pct",
    kelas: legenda(KELAS_STUNTING),
    catatan:
      "Lima kelas kuantil; batas dan warna kategori (Reds) sama dengan peta QGIS. Kelas tinggi = prevalensi tinggi.",
  },
  sanitasi: {
    nama: "sanitasi",
    judul: "Akses Sanitasi Layak",
    satuan: "%",
    field: "sanitasi_pct",
    kelas: legenda(KELAS_SANITASI),
    catatan:
      "Lima kelas kuantil dengan warna Blues QGIS. Nilai di atas 100% (Warungpring 111,77%) tetap di kelas 5 dan ditandai di luar skala, tidak dikoreksi.",
  },
};

export function panelAktif() {
  return PANEL[getState().layer] ?? PANEL.stunting;
}

/**
 * Warna isi polygon untuk sebuah kecamatan pada layer aktif.
 * Nilai di atas 100% (sanitasi) tetap memakai langkah teratas, lalu ditandai
 * pada popup/legenda.
 */
export function warnaUntuk(row, panel) {
  const v = row[panel.field];
  const tingkat = panel.nama === "stunting" ? kelasStunting(v) : kelasSanitasi(v);
  return warnaKelas(panel.nama, tingkat);
}

/** Nilai yang ditulis di tooltip/popup, dengan penanda bila di luar skala. */
export function nilaiTeks(row, panel) {
  const v = row[panel.field];
  const teks = v.toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const luar = panel.nama === "sanitasi" && v > 100;
  return { teks: `${teks}%`, diLuarSkala: luar };
}

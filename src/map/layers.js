import { tokenRamp } from "../tokens.js";
import { getState } from "../state/store.js";
import {
  kelasStunting,
  kelasSanitasi,
  KELAS_STUNTING,
  KELAS_SANITASI,
} from "../data/classify.js";

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
    ramp: "stunting",
    kelas: legenda(KELAS_STUNTING),
    catatan:
      "Lima kelas kuantil; batas sama dengan peta ekspor QGIS. Kelas tinggi = prevalensi tinggi.",
  },
  sanitasi: {
    nama: "sanitasi",
    judul: "Akses Sanitasi Layak",
    satuan: "%",
    field: "sanitasi_pct",
    ramp: "sanitasi",
    kelas: legenda(KELAS_SANITASI),
    catatan:
      "Lima kelas kuantil. Nilai di atas 100% (Warungpring 111,77%) tetap di kelas 5 dan ditandai di luar skala, tidak dikoreksi.",
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
  const ramp = tokenRamp(panel.ramp);
  const v = row[panel.field];
  const tingkat = panel.nama === "stunting" ? kelasStunting(v) : kelasSanitasi(v);
  return ramp[tingkat - 1];
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

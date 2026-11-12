import { tokenRamp } from "../tokens.js";
import { getState } from "../state/store.js";

export const PANEL = {
  stunting: {
    nama: "stunting",
    judul: "Prevalensi Stunting",
    satuan: "%",
    field: "stunting_pct",
    ramp: "stunting",
    // Kelas dari atas ke bawah untuk legenda (nilai tinggi di atas)
    kelas: [
      { label: "Tinggi", ket: "≥ 12,51%", warnaIndeks: 2 },
      { label: "Sedang", ket: "8,32 – 12,51%", warnaIndeks: 1 },
      { label: "Rendah", ket: "< 8,32%", warnaIndeks: 0 },
    ],
    catatan:
      "Kelas memakai selang seragam dari nilai minimum ke maksimum, sama dengan klasifikasi pada peta laporan.",
  },
  sanitasi: {
    nama: "sanitasi",
    judul: "Akses Sanitasi Layak",
    satuan: "%",
    field: "sanitasi_pct",
    ramp: "sanitasi",
    kelas: [
      { label: "Baik", ket: "66,7 – 100%", warnaIndeks: 2 },
      { label: "Sedang", ket: "33,3 – 66,7%", warnaIndeks: 1 },
      { label: "Rendah", ket: "0 – 33,3%", warnaIndeks: 0 },
    ],
    catatan:
      "Skala dipatok 0–100% agar nilai di atas 100% (Warungpring) jatuh di luar kelas teratas dan terlihat sebagai anomali, bukan tersembunyi di dalam skala.",
  },
};

export function panelAktif() {
  return PANEL[getState().layer] ?? PANEL.stunting;
}

/**
 * Warna isi polygon untuk sebuah kecamatan pada layer aktif.
 * Nilai di atas 100% (sanitasi) sengaja tetap memakai langkah teratas, lalu
 * ditandai pada popup/legenda.
 */
export function warnaUntuk(row, panel) {
  const ramp = tokenRamp(panel.ramp);
  const v = row[panel.field];

  if (panel.nama === "stunting") {
    if (v >= 12.5067) return ramp[2];
    if (v >= 8.3233) return ramp[1];
    return ramp[0];
  }

  if (v >= 66.67) return ramp[2];
  if (v >= 33.33) return ramp[1];
  return ramp[0];
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

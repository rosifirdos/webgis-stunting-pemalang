import { getState } from "../state/store.js";
import {
  kelasStunting,
  kelasKapasitas,
  KELAS_STUNTING,
  KELAS_KAPASITAS,
  KATEGORI_PRIORITAS,
  breakKuantil,
  kelasDariKuantil,
  susunKelasDeterminan,
} from "../data/classify.js";
import { determinanDari } from "../data/determinan.js";

/**
 * Warna isi poligon disalin dari proyek QGIS 3.44.16
 * (../output/Pemalang_Stunting_Sanitasi_2024.qgz), bukan dari token tema:
 *   Prevalensi Stunting 2024        -> Reds    5 kelas kuantil
 *   Determinan (termasuk sanitasi)  -> Blues   5 kelas kuantil
 *   Indeks Kapasitas Layanan 2024   -> RdYlGn  5 kelas kuantil
 *   Tingkat prioritas               -> 4 warna kategori
 * Karena ramp ini tetap di tema terang maupun gelap, satu kelas selalu
 * berwarna sama - tidak ada arti warna yang terbalik saat tema berganti -
 * dan peta di layar membaca sama dengan peta cetak.
 *
 * Layer "determinan" sengaja generik: sembilan variabel yang punya nilai per
 * kecamatan dipetakan dengan satu mekanisme yang sama. Tidak ada variabel
 * yang dijadikan pembanding atau diberi kelas tulis tangan - break kuantil
 * dihitung dari data, sehingga sanitasi dan delapan determinan lain benar-
 * benar setara.
 *
 * Grafik batang tetap memakai token --color-stunting-*, yang langkahnya
 * dipilih ulang untuk tema gelap.
 */
export const RAMP_QGIS = {
  stunting: ["#fff5f0", "#fcbea5", "#fb7050", "#d32020", "#67000d"],
  determinan: ["#f7fbff", "#c8dcf0", "#73b2d8", "#2979b9", "#08306b"],
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
 * kategori, urutan tingkat 1..4 sudah bermakna dan tidak dibalik.
 */
const legenda = (daftar) =>
  [...daftar].reverse().map((k) => ({
    label: k.label,
    ket: k.keterangan,
    warnaIndeks: k.tingkat - 1,
  }));

const KELOMPOK_PRIORITAS = KATEGORI_PRIORITAS.map((k) => ({
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
  prioritas: {
    nama: "prioritas",
    jenis: "kategori",
    judul: "Tingkat Prioritas Intervensi",
    satuan: "",
    field: "prioritas",
    kelas: KELOMPOK_PRIORITAS,
    catatan:
      "Empat tingkat yang diturunkan langsung dari kelas prevalensi stunting, bukan dari faktor penjelas. Prioritas Utama = kelas 5; Relatif Rendah menggabungkan kelas 1–2.",
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

/* ---------------------------------------------------------------------------
   Layer determinan: satu panel, sembilan variabel.
   ------------------------------------------------------------------------- */

let barisData = [];
const cachePanel = new Map();

/** Pasang baris statistik sekali setelah GeoJSON termuat. */
export function setDataPeta(rows) {
  barisData = rows ?? [];
  cachePanel.clear();
}

function panelDeterminan(field) {
  const d = determinanDari(field ?? getState().determinan);
  if (cachePanel.has(d.field)) return cachePanel.get(d.field);

  const breaks = breakKuantil(barisData.map((r) => Number(r[d.field])));
  const panel = {
    nama: "determinan",
    jenis: "kuantil",
    judul: `${d.label} (determinan)`,
    satuan: d.satuan,
    field: d.field,
    desimal: d.desimal,
    breaks,
    kelas: legenda(susunKelasDeterminan(breaks, d)),
    catatan:
      breaks.length < 4
        ? "Data determinan belum termuat."
        : `Layer opsional: ${d.label.toLowerCase()} adalah satu dari 95 determinan yang diuji terhadap stunting. Lima kelas kuantil dihitung dari nilai 14 kecamatan (bukan break tulis tangan), warna Blues sama dengan peta QGIS. Hasil ujinya ada di panel Info.`,
  };

  cachePanel.set(d.field, panel);
  return panel;
}

/** Panel determinan untuk variabel yang sedang dipilih. */
export function panelDeterminanAktif() {
  return panelDeterminan();
}

export function panelAktif() {
  const { layer } = getState();
  if (layer === "determinan") return panelDeterminan();
  return PANEL[layer] ?? PANEL.stunting;
}

/** Tingkat kelas 1..5 untuk sebuah baris pada panel kuantil. */
function tingkatKelas(row, panel) {
  if (panel.nama === "stunting") return kelasStunting(row.stunting_pct);
  if (panel.nama === "kapasitas") return kelasKapasitas(row.idx_layanan);
  return kelasDariKuantil(row[panel.field], panel.breaks);
}

/**
 * Warna isi polygon untuk sebuah kecamatan pada layer aktif.
 * Nilai di atas 100% tetap memakai langkah teratas, lalu ditandai pada
 * popup/legenda. Panel kategori memakai warna tingkat prioritasnya.
 */
export function warnaUntuk(row, panel = panelAktif()) {
  if (panel.jenis === "kategori") {
    return (
      KATEGORI_PRIORITAS.find((k) => k.nilai === row.prioritas)?.warna ??
      "#9ca3af"
    );
  }
  return warnaKelas(panel.nama, tingkatKelas(row, panel));
}

/** Nilai yang ditulis di tooltip/popup, dengan penanda bila di luar skala. */
export function nilaiTeks(row, panel = panelAktif()) {
  if (panel.nama === "prioritas") {
    return { teks: row.prioritas, diLuarSkala: false };
  }

  const v = Number(row[panel.field]);

  if (panel.nama === "kapasitas") {
    const teks = v.toLocaleString("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return { teks: `${v > 0 ? "+" : ""}${teks}`, diLuarSkala: false };
  }

  const desimal = panel.desimal ?? 2;
  const teks = v.toLocaleString("id-ID", {
    minimumFractionDigits: desimal,
    maximumFractionDigits: desimal,
  });
  const luar = panel.nama === "determinan" && panel.satuan === "%" && v > 100;
  return { teks: `${teks}${panel.satuan ?? "%"}`, diLuarSkala: luar };
}

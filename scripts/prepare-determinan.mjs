#!/usr/bin/env node
/**
 * prepare-determinan.mjs
 * ----------------------
 * Ubah hasil uji determinan (95 variabel) menjadi berkas JSON yang dibaca
 * panel Info.
 *
 * Kenapa JSON dan bukan CSV langsung:
 *   Browser tidak perlu tahu urutan kolom, tipe, atau parsing FDR; semua sudah
 *   dinormalkan di sini. Nama kunci sengaja bahasa Inggris ("nama", "r",
 *   "rho") agar sama dengan kontrak PRD §6.2, bukan menyalin header CSV.
 *
 * Nama berkas sumber memakai nama kolom versi Python (r_pearson, p_value,
 * fdr, bisa_diintervensi) - itu yang dihasilkan analisis, bukan karangan web.
 *
 * Dijalankan otomatis oleh prepare-data.mjs sebagai langkah terakhir.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bacaCsv } from "./lib/csv.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "scripts", "sumber", "determinan_stunting_2024.csv");
const OUT_DIR = path.join(ROOT, "public", "data");
const OUT = path.join(OUT_DIR, "determinan.json");

if (!fs.existsSync(SRC)) {
  throw new Error(`Berkas sumber tidak ditemukan: ${SRC}`);
}

const rows = bacaCsv(fs.readFileSync(SRC, "utf8"));
if (!rows.length) throw new Error("determinan_stunting_2024.csv kosong");

const angka = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Nilai numerik tidak valid: "${v}"`);
  return n;
};

const variabel = rows
  .map((r) => ({
    nama: r.variabel,
    kelompok: r.kelompok,
    r: angka(r.r_pearson),
    rho: angka(r.rho),
    p: angka(r.p_value),
    fdr: angka(r.fdr),
    arah: r.arah,
    actionable: String(r.bisa_diintervensi).trim().toLowerCase() === "true",
  }))
  .sort((a, b) => a.p - b.p);

const signifFdr = rows.filter(
  (r) => String(r.signif_fdr005).trim().toLowerCase() === "true"
).length;

const nUnik = [...new Set(rows.map((r) => angka(r.n)))];
if (nUnik.length !== 1) {
  throw new Error(`Kolom n tidak seragam: ${nUnik.join(", ")}`);
}

/* --------------------------------------------------------------------------
   Regresi satu prediktor (PRD v2.0 §2.5)
   --------------------------------------------------------------------------
   Nilai b, R², dan p berasal dari analisis sumber, bukan dihitung ulang di
   browser. Disimpan di JSON (bukan HTML) supaya panel Info tidak pernah
   memuat angka statistik yang ditulis tangan.
   -------------------------------------------------------------------------- */
const REGRESI = [
  { prediktor: "tb_anak_jml", b: 0.119, r2: 0.315, p: 0.037 },
  { prediktor: "balita_ds_pct", b: -0.145, r2: 0.29, p: 0.047 },
  { prediktor: "kk_ctps_pct", b: 0.191, r2: 0.229, p: 0.084 },
  { prediktor: "sanitasi_layak_pct", b: -0.054, r2: 0.05, p: 0.443 },
  { prediktor: "sanitasi_aman_pct", b: 0.064, r2: 0.038, p: 0.505 },
  { prediktor: "asi_eksklusif_pct", b: -0.02, r2: 0.005, p: 0.801 },
];

/* --------------------------------------------------------------------------
   Registry anomali data (PRD v2.0 §2.7)
   --------------------------------------------------------------------------
   Daftar variabel diambil dari PRD; nilainya dibaca ulang dari CSV sumber
   supaya yang tampil di web tidak pernah menyimpang dari berkas yang diolah.
   Baris terakhir (sanitasi_aman_pct mendekati nol) tidak menyebut satu
   kecamatan, jadi anggotanya diturunkan dari data: nilai di bawah 1%.
   -------------------------------------------------------------------------- */
const SRC_PROFIL = path.join(ROOT, "scripts", "sumber", "profil-kesehatan-2024.csv");
if (!fs.existsSync(SRC_PROFIL)) {
  throw new Error(`Berkas sumber tidak ditemukan: ${SRC_PROFIL}`);
}
const profil = bacaCsv(fs.readFileSync(SRC_PROFIL, "utf8"));
const petaProfil = new Map(
  profil.map((r) => [String(r.kecamatan).trim().toLowerCase(), r])
);

const judulKecamatan = (s) =>
  String(s).toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const persen = (v, desimal = 2) =>
  `${Number(v).toLocaleString("id-ID", {
    minimumFractionDigits: desimal,
    maximumFractionDigits: desimal,
  })}%`;

const SPEC_ANOMALI = [
  { variabel: "sanitasi_layak_pct", kolom: "sanitasi_layak_pct", kecamatan: "WARUNGPRING", dugaan: "pembilang ≠ penyebut" },
  { variabel: "total_akses_sanitasi_pct", kolom: "total_akses_sanitasi_pct", kecamatan: "WARUNGPRING", dugaan: "basis KK berbeda" },
  { variabel: "kk_sbs_pct", kolom: "kk_sbs_pct", kecamatan: "WARUNGPRING", dugaan: "basis KK berbeda" },
  { variabel: "imd_pct", kolom: "imd_pct", kecamatan: "BODEH", dugaan: "definisi indikator" },
  { variabel: "sarana_air_aman_pct", kolom: "sarana_air_aman_pct", kecamatan: "PEMALANG", dugaan: "sarana > jumlah terdaftar" },
  { variabel: "desa_5pilar_stbm_pct", kolom: "desa_5pilar_stbm_pct", kecamatan: "ULUJAMI", dugaan: "desa > desa sasaran" },
];

const anomali = SPEC_ANOMALI.map((s) => {
  const baris = petaProfil.get(s.kecamatan.toLowerCase());
  if (!baris) throw new Error(`Kecamatan tidak ditemukan di CSV: ${s.kecamatan}`);
  return {
    variabel: s.variabel,
    kecamatan: judulKecamatan(s.kecamatan),
    nilai: persen(baris[s.kolom]),
    dugaan: s.dugaan,
    status: "belum dikoreksi",
  };
});

const amanRendah = profil
  .filter((r) => angka(r.sanitasi_aman_pct) < 1)
  .sort((a, b) => a.sanitasi_aman_pct - b.sanitasi_aman_pct);
if (!amanRendah.length) {
  throw new Error("Tidak ada kecamatan dengan sanitasi_aman_pct < 1%");
}
const nilaiAman = amanRendah.map((r) => angka(r.sanitasi_aman_pct));
anomali.push({
  variabel: "sanitasi_aman_pct",
  kecamatan: amanRendah.map((r) => judulKecamatan(r.kecamatan)).join(", "),
  // PRD menulis 0,00%; data sumber memuat dua nilai kecil (0,03 dan 0,10)
  // yang ikut ditampilkan agar tidak menyembunyikan ketidaktepatan.
  nilai: `${persen(Math.min(...nilaiAman))}–${persen(Math.max(...nilaiAman))}`,
  dugaan: "kemungkinan data belum terisi",
  status: "belum dikoreksi",
});

const hasil = {
  meta: {
    outcome: "stunting_pct",
    n: nUnik[0],
    n_uji: variabel.length,
    metode: "Pearson + Spearman + Benjamini-Hochberg",
    signif_fdr: signifFdr,
    sumber: "Profil Kesehatan Kabupaten Pemalang 2024",
    regresi: REGRESI,
    anomali,
  },
  variabel,
};

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(hasil));

const kb = (fs.statSync(OUT).size / 1024).toFixed(1);
console.log(`  determinan.json  : ${variabel.length} variabel, ${signifFdr} signifikan FDR (${kb} KB)`);

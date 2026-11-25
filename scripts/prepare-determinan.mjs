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

const hasil = {
  meta: {
    outcome: "stunting_pct",
    n: nUnik[0],
    n_uji: variabel.length,
    metode: "Pearson + Spearman + Benjamini-Hochberg",
    signif_fdr: signifFdr,
    sumber: "Profil Kesehatan Kabupaten Pemalang 2024",
  },
  variabel,
};

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(hasil));

const kb = (fs.statSync(OUT).size / 1024).toFixed(1);
console.log(`  determinan.json  : ${variabel.length} variabel, ${signifFdr} signifikan FDR (${kb} KB)`);

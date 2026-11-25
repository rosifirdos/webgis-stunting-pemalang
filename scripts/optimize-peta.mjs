#!/usr/bin/env node
/**
 * optimize-peta.mjs
 * -----------------
 * Buat varian WebP 1200 px dari PNG ekspor QGIS di `public/peta/`.
 *
 * Kenapa dipisah dari prepare-data:
 *   PNG berasal dari QGIS (bukan data numerik). Pipeline data tidak boleh
 *   menyentuh gambar, dan pipeline gambar tidak butuh data. README peta
 *   mencatat hash PNG asli supaya ketidakcocokan terlihat.
 *
 * PNG asli tetap disimpan (sumber, dipakai srcset 3507w). Varian hanya untuk
 * layar sempit supaya LCP tidak menunggu berkas 1 MB.
 *
 * Bila `sharp` tidak terpasang (mis. install script diblokir), skrip ini
 * berhenti dengan kode 0 dan memberi tahu agar dicatat di README — bukan
 * menggagalkan build, sesuai PROMPT_REVISI_V2 R1b poin 3.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, "public", "peta");
const LEBAR = 1200;
const KUALITAS = 82;
const BATAS_WEBP = 250 * 1024;

let sharp;
try {
  ({ default: sharp } = await import("sharp"));
} catch {
  console.log("sharp tidak terpasang - varian 1200 px dilewati.");
  console.log("Catat hal ini di public/peta/README.md sebelum rilis.");
  process.exit(0);
}

if (!fs.existsSync(DIR)) {
  throw new Error(`Folder tidak ditemukan: ${DIR}`);
}

const png = fs
  .readdirSync(DIR)
  .filter((f) => f.endsWith(".png"))
  .sort();

if (!png.length) {
  throw new Error(`${DIR} tidak berisi PNG`);
}

const kb = (n) => (n / 1024).toFixed(0) + " KB";
let totalAsli = 0;
let totalWebp = 0;
const terlaluBesar = [];

console.log("Varian WebP 1200 px");
console.log("-----------------------------------------------");
console.log("  berkas                        PNG        WebP");

for (const nama of png) {
  const sumber = path.join(DIR, nama);
  const keluar = path.join(DIR, nama.replace(/\.png$/, `-${LEBAR}.webp`));

  const info = await sharp(sumber)
    .resize({ width: LEBAR, withoutEnlargement: true })
    .webp({ quality: KUALITAS, effort: 5 })
    .toFile(keluar);

  const asli = fs.statSync(sumber).size;
  const hasil = fs.statSync(keluar).size;
  totalAsli += asli;
  totalWebp += hasil;

  if (hasil > BATAS_WEBP) terlaluBesar.push(`${nama}: ${kb(hasil)}`);
  console.log(
    `  ${nama.padEnd(29)} ${kb(asli).padStart(7)}  ${kb(hasil).padStart(8)}` +
      `  (${info.width}x${info.height})`
  );
}

console.log("-----------------------------------------------");
console.log(`  PNG asli : ${kb(totalAsli)} (${png.length} berkas)`);
console.log(`  WebP     : ${kb(totalWebp)} (batas ${kb(BATAS_WEBP)}/berkas)`);

if (terlaluBesar.length) {
  throw new Error("Varian WebP melebihi 250 KB: " + terlaluBesar.join("; "));
}

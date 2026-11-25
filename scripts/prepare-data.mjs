#!/usr/bin/env node
/**
 * prepare-data.mjs
 * ----------------
 * Konversi Shapefile -> GeoJSON + CSV tanpa GDAL, lalu gabungkan atribut
 * tambahan dari Profil Kesehatan (CSV 100 kolom).
 *
 * Kenapa join CSV:
 *   DBF hanya punya 28 field. Tiga variabel kontrak v2 (ASI eksklusif, balita
 *   ditimbang, anemia catin sebagai persen) tidak ada di DBF sama sekali, jadi
 *   tanpa join kontrak §6.1 tidak bisa dipenuhi.
 *
 * Kenapa tidak memakai mapshaper/ogr2ogr:
 *   Mesin ini tidak punya GDAL, QGIS, maupun mapshaper terpasang, sehingga
 *   konversi dilakukan murni dengan Node (fs + Buffer).
 *
 * Kenapa menghapus titik kolinear, bukan Douglas-Peucker:
 *   DP menyederhanakan setiap ring secara independen. Dua kecamatan bertetangga
 *   memiliki segmen batas yang identik; bila DP mempertahankan titik berbeda di
 *   masing-masing sisi, muncul celah (sliver) di antara poligon. Penghapusan
 *   titik kolinear bersifat deterministik pada koordinat, jadi segmen bersama
 *   disederhanakan dengan cara yang sama di kedua sisi -> nol celah, dan bentuk
 *   peta tidak berubah sama sekali (titik yang dibuang memang berada tepat di
 *   garis lurus antara tetangganya).
 *
 * Jalankan: npm run prepare-data
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bacaCsv, kunci } from "./lib/csv.mjs";
import { prioritas } from "../src/data/classify.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Berkas sumber mentah (Shapefile/DBF dari QGIS) tinggal di folder induk repo,
// satu tingkat di atas folder aplikasi web ini.
const SUMBER = path.resolve(ROOT, "..");
const SRC_SHP = path.join(SUMBER, "Kecamatan_Pemalang_Stunting_Sanitasi_2024.shp");
const SRC_DBF = path.join(SUMBER, "Kecamatan_Pemalang_Stunting_Sanitasi_2024.dbf");
// Sumber atribut tambahan disalin ke dalam repo (scripts/sumber) supaya
// pipeline tidak bergantung pada folder induk saat dijalankan di CI.
const SRC_CSV = path.join(ROOT, "scripts", "sumber", "profil-kesehatan-2024.csv");
const OUT_DIR = path.join(ROOT, "public", "data");
const OUT_GEOJSON = path.join(OUT_DIR, "kecamatan.geojson");
const OUT_CSV = path.join(OUT_DIR, "kecamatan.csv");

for (const f of [SRC_SHP, SRC_DBF, SRC_CSV]) {
  if (!fs.existsSync(f)) {
    console.error(`Berkas sumber tidak ditemukan: ${f}`);
    console.error("Jalankan skrip ini dari dalam folder webgis-stunting-pemalang");
    console.error("sementara Shapefile/DBF berada di folder induk.");
    process.exit(1);
  }
}

// Presisi 4 desimal (~11 m di ekuator). Kabupaten ini membentang ~45 km, jadi
// galat 11 m tak terlihat bahkan saat zoom maksimum, sementara tiap digit yang
// dipangkas memangkas ribuan karakter dari berkas.
const PRECISION = 4;
const COLLINEAR_EPS = 1e-7; // toleransi sudut untuk membuang titik segaris

// ---------------------------------------------------------------------------
// 1. DBF reader (dBASE III, tanpa library eksternal)
// ---------------------------------------------------------------------------
function readDbf(file) {
  const buf = fs.readFileSync(file);
  const numRecords = buf.readUInt32LE(4);
  const headerLen = buf.readUInt16LE(8);
  const recordLen = buf.readUInt16LE(10);

  const fields = [];
  for (let pos = 32; buf[pos] !== 0x0d; pos += 32) {
    fields.push({
      name: buf.toString("ascii", pos, pos + 11).split("\0")[0],
      type: String.fromCharCode(buf[pos + 11]),
      length: buf[pos + 16],
    });
  }

  const rows = [];
  for (let i = 0; i < numRecords; i++) {
    const off = headerLen + i * recordLen;
    if (buf[off] === 0x2a) continue; // record terhapus
    const row = {};
    let p = off + 1;
    for (const f of fields) {
      const raw = buf.toString("latin1", p, p + f.length).trim();
      p += f.length;
      row[f.name] =
        f.type === "N" || f.type === "F"
          ? raw === "" ? 0 : Number(raw)
          : raw;
    }
    rows.push(row);
  }
  return { fields, rows };
}

// ---------------------------------------------------------------------------
// 2. SHP reader (polygon: shapeType 5; dukung juga 15/25 dengan mengabaikan Z/M)
// ---------------------------------------------------------------------------
function readShp(file) {
  const buf = fs.readFileSync(file);
  const shapes = [];
  let pos = 100; // header selalu 100 byte

  while (pos < buf.length) {
    const contentLen = buf.readInt32BE(pos + 4); // dalam word (2 byte)
    const rec = pos + 8;
    const shapeType = buf.readInt32LE(rec);

    if (shapeType === 0) {
      shapes.push(null); // null shape
    } else if ([5, 15, 25].includes(shapeType)) {
      const numParts = buf.readInt32LE(rec + 36);
      const numPoints = buf.readInt32LE(rec + 40);

      const partStart = rec + 44;
      const parts = [];
      for (let i = 0; i < numParts; i++) parts.push(buf.readInt32LE(partStart + i * 4));

      const pointStart = partStart + numParts * 4;
      const points = [];
      for (let i = 0; i < numPoints; i++) {
        points.push([
          buf.readDoubleLE(pointStart + i * 16),
          buf.readDoubleLE(pointStart + i * 16 + 8),
        ]);
      }

      // Potong points menjadi ring berdasarkan indeks `parts`.
      const rings = parts.map((start, i) => {
        const end = i + 1 < parts.length ? parts[i + 1] : numPoints;
        return points.slice(start, end);
      });
      shapes.push(rings);
    } else {
      throw new Error(`shapeType ${shapeType} tidak didukung (hanya poligon)`);
    }
    pos = rec + contentLen * 2;
  }
  return shapes;
}

// ---------------------------------------------------------------------------
// 3. Geometri: pembulatan, dedup, hapus kolinear, klasifikasi ring
// ---------------------------------------------------------------------------
const round = (v) => Number(v.toFixed(PRECISION));

function cleanRing(ring) {
  // (a) bulatkan + buang titik berurutan yang identik
  const out = [];
  for (const [x, y] of ring) {
    const p = [round(x), round(y)];
    const last = out[out.length - 1];
    if (!last || last[0] !== p[0] || last[1] !== p[1]) out.push(p);
  }
  // (b) ring harus tertutup
  const first = out[0];
  const last = out[out.length - 1];
  if (first && last && (first[0] !== last[0] || first[1] !== last[1])) out.push([...first]);

  // (c) hapus titik yang segaris dengan tetangganya. Deterministik terhadap
  //     koordinat, jadi batas bersama dua kecamatan disederhanakan sama persis.
  if (out.length < 4) return out;
  const keep = [out[0]];
  for (let i = 1; i < out.length - 1; i++) {
    const a = keep[keep.length - 1];
    const b = out[i];
    const c = out[i + 1];
    const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const scale = Math.max(Math.abs(c[0] - a[0]), Math.abs(c[1] - a[1]), 1e-12);
    if (Math.abs(cross) / scale > COLLINEAR_EPS) keep.push(b);
  }
  keep.push(out[out.length - 1]);
  return keep.length >= 4 ? keep : out;
}

/** Luas bertanda (shoelace). Negatif = arah clockwise. */
function signedArea(ring) {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    sum += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return sum / 2;
}

/**
 * Shapefile: outer ring searah jarum jam (luas negatif), hole berlawanan.
 * GeoJSON (RFC 7946): outer ring berlawanan jarum jam, hole searah jarum jam.
 */
function ringsToGeometry(rings) {
  const cleaned = rings.map(cleanRing).filter((r) => r.length >= 4);
  if (cleaned.length === 0) return null;

  const outers = cleaned.filter((r) => signedArea(r) < 0);
  const holes = cleaned.filter((r) => signedArea(r) >= 0);

  const orient = (ring, counterClockwise) => {
    const isCCW = signedArea(ring) > 0;
    return isCCW === counterClockwise ? ring : [...ring].reverse();
  };

  if (outers.length === 1) {
    return {
      type: "Polygon",
      coordinates: [orient(outers[0], true), ...holes.map((h) => orient(h, false))],
    };
  }
  // Multi-ring tanpa outer tunggal yang jelas -> perlakukan tiap outer sebagai
  // poligon tersendiri (khas kabupaten kepulauan / geometri multi-bagian).
  return {
    type: "MultiPolygon",
    coordinates: outers.map((o) => [orient(o, true)]),
  };
}

const countVertices = (geom) => {
  const rings = geom.type === "Polygon" ? geom.coordinates : geom.coordinates.flat();
  return rings.reduce((n, r) => n + r.length, 0);
};

// ---------------------------------------------------------------------------
// 4. Pemetaan atribut  (DBF 28 kolom + CSV 100 kolom -> kontrak §6.1)
// ---------------------------------------------------------------------------
const FIELDS = [
  ["kecamatan", "WADMKC", "string", "dbf"],
  ["stunting_pct", "pct_stunt", "number", "dbf"],
  ["stunting_jml", "stunting", "number", "dbf"],
  ["balita_ukur", "balita_tb", "number", "dbf"],
  ["sanitasi_pct", "pct_sn_lyk", "number", "dbf"],
  ["sanitasi_jml", "san_layak", "number", "dbf"],
  ["sanitasi_aman_pct", "sanitasi_aman_pct", "number", "csv"],
  ["jumlah_kk", "jml_kk", "number", "dbf"],
  ["jml_desa", "jml_desa", "number", "dbf"],
  ["asi_eksklusif_pct", "asi_eksklusif_pct", "number", "csv"],
  ["catin_anemia_pct", "catin_anemia_pct", "number", "csv"],
  ["balita_ds_pct", "balita_ds_pct", "number", "csv"],
  ["prioritas", null, "derived", "-"],
  ["idx_layanan", null, "derived", "-"],
  // Field lama yang masih dipakai tabel/peta jelajah (tidak ada di §6.1).
  ["kk_sbs_pct", "pct_sbs", "number", "dbf"],
  ["kk_ctps_pct", "pct_ctps", "number", "dbf"],
  ["pilar5_pct", "pilar5_des", "number", "dbf"],
];

/** Angka dari CSV: kosong/NaN -> null, bukan 0 (0 bisa berarti nilai nyata). */
function angkaCsv(csvRow, kolom) {
  const raw = csvRow?.[kolom];
  if (raw === undefined || String(raw).trim() === "") return null;
  const v = Number(raw);
  return Number.isFinite(v) ? v : null;
}

function buildProperties(row, csvRow, idxLayanan) {
  const props = {};

  for (const [out, src, kind, sumber] of FIELDS) {
    if (kind === "derived") continue; // diisi setelah field dasar lengkap

    if (kind === "number") {
      let v;
      if (sumber === "csv") {
        v = angkaCsv(csvRow, src);
        if (v === null) {
          props[out] = null;
          continue;
        }
      } else {
        v = Number(row[src]);
        if (!Number.isFinite(v)) v = 0;
      }

      // pilar5_des tersimpan sebagai jumlah desa, bukan persen.
      if (out === "pilar5_pct") {
        v = row.jml_desa ? (v / row.jml_desa) * 100 : 0;
      }
      props[out] = Number(v.toFixed(2));
    } else {
      props[out] = String((sumber === "csv" ? csvRow?.[src] : row[src]) ?? "").trim();
    }
  }

  // Turunan: tingkat prioritas (dari kelas prevalensi) + indeks kapasitas
  // layanan (4 desimal).
  props.prioritas = prioritas(props);
  props.idx_layanan = idxLayanan;
  return props;
}

// ---------------------------------------------------------------------------
// 4b. Join DBF <-> CSV + indeks kapasitas layanan
// ---------------------------------------------------------------------------
const { rows } = readDbf(SRC_DBF);
const csvRows = bacaCsv(fs.readFileSync(SRC_CSV, "utf8"));
const csvByKey = new Map(csvRows.map((r) => [kunci(r.kecamatan), r]));

// Validasi dua arah: setiap record DBF punya pasangan, dan tidak ada CSV yatim.
const tanpaPasangan = rows.map((r) => r.WADMKC).filter((n) => !csvByKey.has(kunci(n)));
const dbKey = new Set(rows.map((r) => kunci(r.WADMKC)));
const csvYatim = csvRows.map((r) => r.kecamatan).filter((n) => !dbKey.has(kunci(n)));
if (tanpaPasangan.length || csvYatim.length) {
  throw new Error(
    "Join DBF<->CSV gagal. DBF tanpa pasangan: [" +
      tanpaPasangan.join(", ") +
      "]; CSV tanpa pasangan: [" +
      csvYatim.join(", ") +
      "]"
  );
}
if (rows.length !== 14) {
  throw new Error(`Diharapkan 14 kecamatan di DBF, ditemukan ${rows.length}`);
}

const POS = [
  "asi_eksklusif_pct",
  "k4_pct",
  "imunisasi_idl_pct",
  "sanitasi_aman_pct",
  "kk_ctps_pct",
];
const NEG = ["babs_terbuka_pct", "catin_anemia_pct", "bblr_pct"];

/**
 * Indeks Kapasitas Layanan: rata-rata z-skor bertanda 8 variabel.
 *
 * z memakai simpangan baku POPULASI (bukan sampel) supaya sama dengan
 * perhitungan QGIS pada GPKG. Pembagi rata-rata adalah 8 (banyaknya
 * variabel), bukan 5 dan 3: nilai GPKG `idx_determinan` hanya cocok bila
 * seluruh variabel berbobot sama, dan membagi per kelompok membuat rentang
 * indeks ±1,2 (bukan ±0,6) serta mengubah urutan kecamatan.
 * Fixture di bawah dikunci ke GPKG; bila asersi gagal, rumus yang diperbaiki,
 * bukan angkanya.
 */
function hitungIdxLayanan() {
  const semua = [...POS, ...NEG];
  const data = rows.map((r) => {
    const c = csvByKey.get(kunci(r.WADMKC));
    const nilai = {};
    for (const f of semua) {
      const v = angkaCsv(c, f);
      if (v === null) {
        throw new Error(`Nilai ${f} kosong untuk ${r.WADMKC}`);
      }
      nilai[f] = v;
    }
    return { nama: r.WADMKC, nilai };
  });

  const stat = {};
  for (const f of semua) {
    const v = data.map((d) => d.nilai[f]);
    const mean = v.reduce((a, b) => a + b, 0) / v.length;
    const pstdev = Math.sqrt(
      v.reduce((a, x) => a + (x - mean) ** 2, 0) / v.length
    );
    stat[f] = { mean, pstdev };
  }

  const z = (d, f) => (d.nilai[f] - stat[f].mean) / stat[f].pstdev;

  return new Map(
    data.map((d) => {
      const zPos = POS.map((f) => z(d, f));
      const zNeg = NEG.map((f) => -z(d, f));
      const idx = [...zPos, ...zNeg].reduce((a, b) => a + b, 0) / semua.length;
      return [d.nama, Number(idx.toFixed(4))];
    })
  );
}

const idxByNama = hitungIdxLayanan();

const FIXTURE_IDX = {
  Belik: 0.59,
  Bodeh: 0.51,
  Pemalang: 0.33,
  Petarukan: 0.21,
  Moga: 0.11,
  Taman: 0.09,
  Bantarbolang: -0.03,
  Ampelgading: -0.06,
  Pulosari: -0.14,
  Watukumpul: -0.19,
  Comal: -0.21,
  Randudongkal: -0.25,
  Warungpring: -0.37,
  Ulujami: -0.59,
};

const idxMeleset = Object.entries(FIXTURE_IDX).filter(
  ([nama, harap]) => Math.abs(idxByNama.get(nama) - harap) > 0.01
);
if (idxMeleset.length) {
  throw new Error(
    "Fixture idx_layanan tidak cocok: " +
      idxMeleset
        .map(([n, h]) => `${n} harap ${h} dapat ${idxByNama.get(n)}`)
        .join("; ")
  );
}

// ---------------------------------------------------------------------------
// 5. Jalankan
// ---------------------------------------------------------------------------
const shapes = readShp(SRC_SHP);

if (rows.length !== shapes.length) {
  throw new Error(
    `jumlah record tidak cocok: DBF ${rows.length} vs SHP ${shapes.length}`
  );
}

const features = [];
let rawVerts = 0;
let cleanVerts = 0;

rows.forEach((row, i) => {
  const rings = shapes[i];
  if (!rings) return;
  rawVerts += rings.reduce((n, r) => n + r.length, 0);
  const geometry = ringsToGeometry(rings);
  if (!geometry) return;
  cleanVerts += countVertices(geometry);
  features.push({
    type: "Feature",
    properties: buildProperties(
      row,
      csvByKey.get(kunci(row.WADMKC)),
      idxByNama.get(row.WADMKC)
    ),
    geometry,
  });
});

features.sort((a, b) =>
  a.properties.kecamatan.localeCompare(b.properties.kecamatan, "id")
);

const fc = { type: "FeatureCollection", features };

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_GEOJSON, JSON.stringify(fc));

// CSV untuk unduhan (FR-INFO-02)
const header = FIELDS.map(([out]) => out);
const barisCsv = [
  header.join(","),
  ...features.map((f) =>
    header
      .map((h) => {
        const v = f.properties[h];
        return typeof v === "string" && v.includes(",") ? `"${v}"` : v;
      })
      .join(",")
  ),
];
fs.writeFileSync(OUT_CSV, barisCsv.join("\n") + "\n");

// ---------------------------------------------------------------------------
// 6. Laporan
// ---------------------------------------------------------------------------
const kb = (p) => (fs.statSync(p).size / 1024).toFixed(1) + " KB";
const pct = rawVerts ? (((rawVerts - cleanVerts) / rawVerts) * 100).toFixed(1) : "0";

console.log("Konversi selesai (Node, tanpa GDAL)");
console.log("-----------------------------------------------");
console.log(`  fitur            : ${features.length}`);
console.log(`  join DBF<->CSV   : ${rows.length}/14 cocok`);
console.log(`  fixture idx      : ${Object.keys(FIXTURE_IDX).length}/14 cocok (±0,01)`);
console.log(`  vertex asli      : ${rawVerts}`);
console.log(`  vertex akhir     : ${cleanVerts}  (-${pct}% titik kolinear dibuang)`);
console.log(`  ${OUT_GEOJSON}  ${kb(OUT_GEOJSON)}`);
console.log(`  ${OUT_CSV}  ${kb(OUT_CSV)}`);
console.log("");

const hitungPrioritas = {};
for (const f of features) {
  const q = f.properties.prioritas;
  hitungPrioritas[q] = (hitungPrioritas[q] ?? 0) + 1;
}
console.log("Tingkat prioritas (dari kelas prevalensi):");
for (const [q, n] of Object.entries(hitungPrioritas).sort()) {
  console.log(`  ${q.padEnd(22)} ${n}`);
}
console.log("");
console.log("Ringkasan nilai (urut stunting menurun):");
console.log("  kecamatan        stunting%   sanitasi%   prioritas            idx");
for (const f of [...features].sort(
  (a, b) => b.properties.stunting_pct - a.properties.stunting_pct
)) {
  const p = f.properties;
  console.log(
    `  ${p.kecamatan.padEnd(16)} ${String(p.stunting_pct).padStart(7)} ${String(
      p.sanitasi_pct
    ).padStart(11)}   ${p.prioritas.padEnd(22)} ${String(p.idx_layanan).padStart(7)}`
  );
}

// ---------------------------------------------------------------------------
// 7. Pemeriksaan geospasial
//    Luas dihitung dengan proyeksi sama-luas lokal (latitude acuan di tengah
//    kabupaten), lalu dibandingkan dengan luas Kabupaten Pemalang yang umum
//    dikutip BPS (~1.118 km2). Jumlah 14 kecamatan harus mendekati angka itu -
//    bila tidak, geometri salah dibaca dan peta akan meleset.
//    Selisih wajar 1-3% berasal dari aproksimasi ekuirektangular lokal.
// ---------------------------------------------------------------------------
const REFERENCE_KM2 = 1118; // Kabupaten Pemalang (BPS) - konfirmasi bila perlu
const LAT0 = -6.99;
const R = 6371.0088; // radius bumi rata-rata (km)
const kx = (Math.PI / 180) * R * Math.cos((LAT0 * Math.PI) / 180);
const ky = (Math.PI / 180) * R;

function areaKm2(geom) {
  const rings =
    geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates.map((p) => p);
  let total = 0;
  for (const poly of rings) {
    poly.forEach((ring, idx) => {
      let a = 0;
      for (let i = 0; i < ring.length - 1; i++) {
        a += (ring[i][0] * kx) * (ring[i + 1][1] * ky) - (ring[i + 1][0] * kx) * (ring[i][1] * ky);
      }
      total += (idx === 0 ? 1 : -1) * (a / 2);
    });
  }
  return Math.abs(total);
}

const areas = features
  .map((f) => ({ name: f.properties.kecamatan, km2: areaKm2(f.geometry) }))
  .sort((a, b) => b.km2 - a.km2);
const total = areas.reduce((n, a) => n + a.km2, 0);

console.log("");
console.log("Pemeriksaan geospasial (proyeksi sama-luas lokal):");
for (const a of areas.slice(0, 3)) {
  console.log(`  terluas  ${a.name.padEnd(16)} ${a.km2.toFixed(2)} km2`);
}
for (const a of areas.slice(-3)) {
  console.log(`  terkecil ${a.name.padEnd(16)} ${a.km2.toFixed(2)} km2`);
}
console.log(`  TOTAL            ${total.toFixed(2)} km2  (referensi BPS: ${REFERENCE_KM2} km2)`);
const drift = Math.abs(total - REFERENCE_KM2) / REFERENCE_KM2;
console.log(
  `  selisih          ${(drift * 100).toFixed(2)}%  ->  ${
    drift < 0.05 ? "OK, geometri terbaca benar" : "PERIKSA: di luar toleransi 5%"
  }`
);

const over100 = features.filter((f) => f.properties.sanitasi_pct > 100);
if (over100.length) {
  console.log("");
  console.log(`  CATATAN: ${over100.length} kecamatan bernilai sanitasi > 100%:`);
  for (const f of over100) {
    console.log(`    - ${f.properties.kecamatan} (${f.properties.sanitasi_pct}%)`);
  }
  console.log("  Penyebab: penyebut jumlah_kk tidak konsisten antar-puskesmas.");
  console.log("  Ditampilkan apa adanya + dicatat di halaman Metodologi.");
}

// ---------------------------------------------------------------------------
// 8. Turunan untuk panel Info
//    Dipanggil paling akhir supaya `npm run prepare-data` tetap satu perintah,
//    dan kegagalan join/geometri di atas menghentikan seluruh pipeline sebelum
//    determinan.json ikut ditulis.
// ---------------------------------------------------------------------------
await import("./prepare-determinan.mjs");

#!/usr/bin/env node
/**
 * prepare-data.mjs
 * ----------------
 * Konversi Shapefile -> GeoJSON + CSV tanpa GDAL.
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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Berkas sumber mentah (Shapefile/DBF dari QGIS) tinggal di folder induk repo,
// satu tingkat di atas folder aplikasi web ini.
const SUMBER = path.resolve(ROOT, "..");
const SRC_SHP = path.join(SUMBER, "Kecamatan_Pemalang_Stunting_Sanitasi_2024.shp");
const SRC_DBF = path.join(SUMBER, "Kecamatan_Pemalang_Stunting_Sanitasi_2024.dbf");
const OUT_DIR = path.join(ROOT, "public", "data");
const OUT_GEOJSON = path.join(OUT_DIR, "kecamatan.geojson");
const OUT_CSV = path.join(OUT_DIR, "kecamatan.csv");

for (const f of [SRC_SHP, SRC_DBF]) {
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
// 4. Pemetaan atribut  (27 kolom DBF -> 11 kolom web)
// ---------------------------------------------------------------------------
const FIELDS = [
  ["kecamatan", "WADMKC", "string"],
  ["stunting_pct", "pct_stunt", "number"],
  ["sanitasi_pct", "pct_sn_lyk", "number"],
  ["stunting_jml", "stunting", "number"],
  ["balita_ukur", "balita_tb", "number"],
  ["sanitasi_jml", "san_layak", "number"],
  ["jumlah_kk", "jml_kk", "number"],
  ["jml_desa", "jml_desa", "number"],
  ["kk_sbs_pct", "pct_sbs", "number"],
  ["kk_ctps_pct", "pct_ctps", "number"],
  ["pilar5_pct", "pilar5_des", "number"],
];

function buildProperties(row) {
  const props = {};
  for (const [out, src, kind] of FIELDS) {
    if (kind === "number") {
      let v = Number(row[src]);
      if (!Number.isFinite(v)) v = 0;
      // pilar5_des tersimpan sebagai jumlah desa, bukan persen.
      if (out === "pilar5_pct") {
        v = row.jml_desa ? round((v / row.jml_desa) * 100) : 0;
        v = Number(v.toFixed(2));
      } else {
        v = Number(v.toFixed(2));
      }
      props[out] = v;
    } else {
      props[out] = String(row[src] ?? "").trim();
    }
  }
  return props;
}

// ---------------------------------------------------------------------------
// 5. Jalankan
// ---------------------------------------------------------------------------
const { rows } = readDbf(SRC_DBF);
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
    properties: buildProperties(row),
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
const csvRows = [
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
fs.writeFileSync(OUT_CSV, csvRows.join("\n") + "\n");

// ---------------------------------------------------------------------------
// 6. Laporan
// ---------------------------------------------------------------------------
const kb = (p) => (fs.statSync(p).size / 1024).toFixed(1) + " KB";
const pct = rawVerts ? (((rawVerts - cleanVerts) / rawVerts) * 100).toFixed(1) : "0";

console.log("Konversi selesai (Node, tanpa GDAL)");
console.log("-----------------------------------------------");
console.log(`  fitur            : ${features.length}`);
console.log(`  vertex asli      : ${rawVerts}`);
console.log(`  vertex akhir     : ${cleanVerts}  (-${pct}% titik kolinear dibuang)`);
console.log(`  ${OUT_GEOJSON}  ${kb(OUT_GEOJSON)}`);
console.log(`  ${OUT_CSV}  ${kb(OUT_CSV)}`);
console.log("");
console.log("Ringkasan nilai (urut stunting menurun):");
console.log("  kecamatan        stunting%   sanitasi%   kelas");
for (const f of [...features].sort(
  (a, b) => b.properties.stunting_pct - a.properties.stunting_pct
)) {
  const p = f.properties;
  const kelas =
    p.stunting_pct >= 12.5067 ? "Tinggi" : p.stunting_pct >= 8.3233 ? "Sedang" : "Rendah";
  console.log(
    `  ${p.kecamatan.padEnd(16)} ${String(p.stunting_pct).padStart(7)} ${String(
      p.sanitasi_pct
    ).padStart(11)}   ${kelas}`
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

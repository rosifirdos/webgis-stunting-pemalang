import { siapkanBaris } from "./stats.js";

let cache = null;

/**
 * Muat GeoJSON sekali, simpan di memori.
 * Path relatif terhadap base Vite, jadi aman untuk hosting di sub-path.
 */
export async function muatData() {
  if (cache) return cache;

  const url = `${import.meta.env.BASE_URL}data/kecamatan.geojson`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Gagal memuat ${url} (HTTP ${res.status})`);
  }

  const geojson = await res.json();
  if (!geojson.features?.length) {
    throw new Error("GeoJSON tidak berisi fitur apa pun");
  }

  const rows = siapkanBaris(geojson.features);

  // Validasi ringan saat muat: jumlah dan nama kecamatan.
  if (rows.length !== 14) {
    console.warn(`Diharapkan 14 kecamatan, ditemukan ${rows.length}`);
  }

  cache = { geojson, rows };
  return cache;
}

let cacheDeterminan = null;

/**
 * Muat hasil uji determinan (95 variabel) untuk panel Info.
 * Cache terpisah dan TIDAK dipanggil saat boot: berkasnya hanya dibutuhkan
 * saat tab Info pertama kali dibuka, jadi tidak perlu membebani muat awal.
 */
export async function muatDeterminan() {
  if (cacheDeterminan) return cacheDeterminan;

  const url = `${import.meta.env.BASE_URL}data/determinan.json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Gagal memuat ${url} (HTTP ${res.status})`);
  }

  const data = await res.json();
  if (!Array.isArray(data.variabel)) {
    throw new Error("determinan.json tidak punya daftar `variabel`");
  }

  // Baru di-cache setelah terbukti valid, supaya kegagalan sekali tidak
  // membuat semua percobaan berikutnya ikut gagal.
  cacheDeterminan = data;
  return data;
}

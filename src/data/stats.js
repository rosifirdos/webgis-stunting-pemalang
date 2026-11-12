import { kelasStunting, kelasSanitasi } from "./classify.js";

/**
 * Hitungan statistik. Semua angka dashboard berasal dari sini - tidak ada
 * angka yang ditulis tangan di HTML, supaya dokumen dan aplikasi tidak bisa
 * berbeda.
 */

export function siapkanBaris(features) {
  return features.map((f) => {
    const p = f.properties;
    return {
      ...p,
      kelas: kelasStunting(p.stunting_pct),
      kelasSanitasi: kelasSanitasi(p.sanitasi_pct),
      // Angka bobot untuk rata-rata kabupaten (bukan rerata kecamatan).
      _kasus: p.stunting_jml,
      _diukur: p.balita_ukur,
    };
  });
}

const rata = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

/** Rerata sederhana 14 kecamatan (tiap kecamatan berbobot sama). */
export function rerataSederhana(rows, kunci) {
  return rata(rows.map((r) => r[kunci]));
}

/** Rerata berbobot populasi: total kasus / total penyebut. */
export function rerataBerbobot(rows, kunciNilai, kunciBobot) {
  const total = rows.reduce((n, r) => n + r[kunciBobot], 0);
  if (!total) return 0;
  return (rows.reduce((n, r) => n + r[kunciNilai], 0) / total) * 100;
}

/** Koefisien korelasi Pearson. */
export function pearson(rows, kx, ky) {
  const n = rows.length;
  if (n < 3) return 0;
  const mx = rata(rows.map((r) => r[kx]));
  const my = rata(rows.map((r) => r[ky]));
  let atas = 0;
  let bawahX = 0;
  let bawahY = 0;
  for (const r of rows) {
    const dx = r[kx] - mx;
    const dy = r[ky] - my;
    atas += dx * dy;
    bawahX += dx * dx;
    bawahY += dy * dy;
  }
  const bawah = Math.sqrt(bawahX * bawahY);
  return bawah ? atas / bawah : 0;
}

/** Tafsir kekuatan korelasi, dipakai apa adanya di antarmuka. */
export function tafsirKorelasi(r) {
  const a = Math.abs(r);
  const arah = r < 0 ? "negatif" : "positif";
  if (a < 0.2) return `korelasi ${arah} sangat lemah`;
  if (a < 0.4) return `korelasi ${arah} lemah`;
  if (a < 0.6) return `korelasi ${arah} sedang`;
  if (a < 0.8) return `korelasi ${arah} kuat`;
  return `korelasi ${arah} sangat kuat`;
}

export function ringkas(rows) {
  const stunting = rows.map((r) => r.stunting_pct);
  const sanitasi = rows.map((r) => r.sanitasi_pct);
  const maksStunting = rows.reduce((a, b) =>
    b.stunting_pct > a.stunting_pct ? b : a
  );
  const minSanitasi = rows.reduce((a, b) =>
    b.sanitasi_pct < a.sanitasi_pct ? b : a
  );

  const r = pearson(rows, "sanitasi_pct", "stunting_pct");

  return {
    rerataStunting: rata(stunting),
    rerataSanitasi: rata(sanitasi),
    stuntingBerbobot: rerataBerbobot(rows, "_kasus", "_diukur"),
    sanitasiBerbobot: rerataBerbobot(rows, "sanitasi_jml", "jumlah_kk"),
    maksStunting,
    minSanitasi,
    r,
    r2: r * r,
    totalKasus: rows.reduce((n, x) => n + x.stunting_jml, 0),
    totalBalita: rows.reduce((n, x) => n + x.balita_ukur, 0),
    totalKk: rows.reduce((n, x) => n + x.jumlah_kk, 0),
    totalSanitasi: rows.reduce((n, x) => n + x.sanitasi_jml, 0),
    n: rows.length,
  };
}

/** Format angka gaya Indonesia: koma desimal, titik ribuan. */
export function angka(v, desimal = 0) {
  return v.toLocaleString("id-ID", {
    minimumFractionDigits: desimal,
    maximumFractionDigits: desimal,
  });
}

export function persen(v, desimal = 2) {
  return `${angka(v, desimal)}%`;
}

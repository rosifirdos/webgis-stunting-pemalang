import {
  kelasStunting,
  kelasSanitasi,
  kuadran,
  alasanKuadran,
} from "./classify.js";

/**
 * Hitungan statistik. Semua angka dashboard berasal dari sini - tidak ada
 * angka yang ditulis tangan di HTML, supaya dokumen dan aplikasi tidak bisa
 * berbeda.
 */

export function siapkanBaris(features) {
  return features.map((f) => {
    const p = f.properties;
    const idx = Number(p.idx_layanan);
    return {
      ...p,
      // Angka 1..5, dipakai langsung sebagai indeks ramp warna.
      kelas: kelasStunting(p.stunting_pct),
      kelasSanitasi: kelasSanitasi(p.sanitasi_pct),
      kuadran: kuadran(p),
      alasanKuadran: alasanKuadran(p),
      // Indeks Kapasitas Layanan dihitung di pipeline (QGIS & prepare-data).
      // Fallback 0 hanya untuk GeoJSON lama yang belum punya field ini.
      idx_layanan: Number.isFinite(idx) ? idx : 0,
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

/* --------------------------------------------------------------------------
   Nilai p untuk Pearson
   --------------------------------------------------------------------------
   t = r * sqrt((n-2)/(1-r^2)), lalu p dua sisi dari distribusi t.
   Fungsi beta tak-lengkap di bawah adalah implementasi Numerical Recipes
   (betacf + gammln) - tanpa dependency, akurat jauh di bawah 0,001 untuk
   df >= 1. Nilai p HANYA untuk tampilan; klaim signifikansi tetap memakai
   koreksi FDR dari pipeline (lihat determinan.json).
   -------------------------------------------------------------------------- */
function gammln(xx) {
  const cof = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5,
  ];
  let x = xx;
  let y = xx;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += cof[j] / ++y;
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

function betacf(a, b, x) {
  const TINY = 1e-30;
  const MAXIT = 200;
  const EPS = 3e-12;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < TINY) d = TINY;
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    h *= d * c;

    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    const del = d * c;
    h *= del;

    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

/** Beta tak-lengkap terregularisasi I_x(a,b). */
function betai(a, b, x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    gammln(a + b) - gammln(a) - gammln(b) + a * Math.log(x) + b * Math.log(1 - x)
  );
  if (x < (a + 1) / (a + b + 2)) {
    return (bt * betacf(a, b, x)) / a;
  }
  return 1 - (bt * betacf(b, a, 1 - x)) / b;
}

/** Nilai p dua sisi untuk korelasi Pearson r dengan n pengamatan. */
export function pValue(r, n) {
  const df = Number(n) - 2;
  if (!(df >= 1)) return 1;
  const rr = Math.min(Math.max(Number(r) || 0, -0.999999), 0.999999);
  const t2 = (rr * rr * df) / (1 - rr * rr);
  // Dua sisi: p = I_{df/(df+t^2)}(df/2, 1/2).
  const p = betai(df / 2, 0.5, df / (df + t2));
  return Math.min(1, Math.max(0, p));
}

/** Jumlah kecamatan per kuadran, selalu memuat keempat kunci. */
export function kuadranRingkas(rows) {
  const hasil = {
    "1 Prioritas Utama": 0,
    "2 Determinan Lain": 0,
    "3 Waspada": 0,
    "4 Relatif Aman": 0,
  };
  for (const r of rows) {
    if (r.kuadran in hasil) hasil[r.kuadran] += 1;
  }
  return hasil;
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
    p: pValue(r, rows.length),
    totalKasus: rows.reduce((n, x) => n + x.stunting_jml, 0),
    totalBalita: rows.reduce((n, x) => n + x.balita_ukur, 0),
    totalKk: rows.reduce((n, x) => n + x.jumlah_kk, 0),
    totalSanitasi: rows.reduce((n, x) => n + x.sanitasi_jml, 0),
    n: rows.length,
  };
}

/** Format angka gaya Indonesia: koma desimal, titik ribuan. */
export function angka(v, desimal = 0) {
  return Number(v).toLocaleString("id-ID", {
    minimumFractionDigits: desimal,
    maximumFractionDigits: desimal,
  });
}

export function persen(v, desimal = 2) {
  return `${angka(v, desimal)}%`;
}

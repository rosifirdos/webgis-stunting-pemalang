import { ringkas, kuadranRingkas, angka } from "../data/stats.js";

/**
 * KPI & angka utama.
 *
 * Aturan yang dipegang di sini: setiap angka yang tampil harus bisa
 * ditelusuri ke data mentah. Tidak ada angka yang ditulis tangan di HTML -
 * semuanya dihitung dari 14 baris yang sama yang menggambar peta.
 *
 * Tiga kartu di bawah hero menjawab tiga pertanyaan berbeda: rerata
 * kabupaten, di mana prioritas utama, dan di mana sanitasi tidak lagi
 * menjelaskan stunting. Angka hubungan (r, p, n) tetap tersedia di kotak
 * korelasi di bawah diagram sebar, bukan di kartu tersendiri.
 */

/** Kekuatan hubungan tanpa istilah sebab-akibat. */
function kekuatan(r) {
  const a = Math.abs(r);
  if (a < 0.2) return "sangat lemah";
  if (a < 0.4) return "lemah";
  if (a < 0.6) return "sedang";
  if (a < 0.8) return "kuat";
  return "sangat kuat";
}

const daftarNama = (rows, maks = 3) => {
  const urut = [...rows].sort((a, b) => b.stunting_pct - a.stunting_pct);
  const nama = urut.slice(0, maks).map((r) => r.kecamatan);
  const sisa = urut.length - nama.length;
  return sisa > 0 ? `${nama.join(", ")}, +${angka(sisa)} lainnya` : nama.join(", ");
};

export function gambarKpi(rows) {
  const s = ringkas(rows);
  const k = kuadranRingkas(rows);
  const prioritas = rows.filter((r) => r.kuadran === "1 Prioritas Utama");
  const determinanLain = rows.filter((r) => r.kuadran === "2 Determinan Lain");

  const hero = document.getElementById("hero-stunting");
  if (hero) hero.textContent = `${angka(s.rerataStunting, 1)}%`;

  const heroCatatan = document.getElementById("hero-catatan");
  if (heroCatatan) {
    heroCatatan.textContent =
      `Bila dibobot jumlah balita yang diukur, angkanya menjadi ` +
      `${angka(s.stuntingBerbobot, 1)}% — ${angka(s.totalKasus)} kasus dari ` +
      `${angka(s.totalBalita)} balita yang diukur di 14 kecamatan.`;
  }

  const set = (id, teks) => {
    const el = document.getElementById(id);
    if (el) el.textContent = teks;
  };

  // 1. Rerata stunting — angka yang sama dengan hero, tetapi dengan satuan
  //    yang jelas di kartu tersendiri.
  set("kpi-rerata", `${angka(s.rerataStunting, 1)}%`);

  // 2. Prioritas Utama — kuadran 1 (stunting tinggi, sanitasi rendah).
  set("kpi-prioritas", `${angka(k["1 Prioritas Utama"])} kecamatan`);
  set("kpi-prioritas-nama", daftarNama(prioritas));

  // 3. Determinan Lain — stunting tetap tinggi meski sanitasi sudah baik.
  //    Kalimat penjelas tetap ada, bukan diganti daftar nama.
  set("kpi-determinan", `${angka(k["2 Determinan Lain"])} kecamatan`);
  set(
    "kpi-determinan-nama",
    `${daftarNama(determinanLain)} — sanitasi baik, stunting tetap tinggi`
  );

  // Kotak korelasi di bawah scatter memakai angka yang sama.
  const r = document.getElementById("nilai-r");
  const p = document.getElementById("nilai-p");
  const n = document.getElementById("nilai-n");
  const r2 = document.getElementById("nilai-r2");
  const tafsir = document.getElementById("tafsir-r");
  const label = document.getElementById("label-signifikansi");
  if (r) r.textContent = angka(s.r, 2);
  if (p) p.textContent = angka(s.p, 3);
  if (n) n.textContent = angka(s.n);
  if (r2) r2.textContent = angka(s.r2, 2);
  if (tafsir) tafsir.textContent = tafsirR(s.r, s.n);
  if (label) {
    label.textContent =
      `${kekuatan(s.r)} / ${s.p < 0.05 ? "signifikan" : "tidak signifikan"} ` +
      `(n=${angka(s.n)})`;
  }

  const infoR = document.getElementById("info-r");
  if (infoR) infoR.textContent = `r = ${angka(s.r, 2)}`;
}

/**
 * Tafsir tanpa melebih-lebihkan: menyebut arah dan kekuatan, lalu menegaskan
 * batasnya (n kecil, agregat kecamatan).
 */
export function tafsirR(r, n) {
  const a = Math.abs(r);
  const k = a < 0.2 ? "sangat lemah" : a < 0.4 ? "lemah" : a < 0.6 ? "sedang" : a < 0.8 ? "kuat" : "sangat kuat";
  const arah = r < 0 ? "negatif" : "positif";
  const pct = angka(r * r * 100, 0);

  return (
    `kecenderungan ${arah} berkekuatan ${k}: makin tinggi akses sanitasi, ` +
    `stunting cenderung ${r < 0 ? "lebih rendah" : "lebih tinggi"}. ` +
    `Sanitasi menjelaskan sekitar ${pct}% keragaman stunting antar ${n} kecamatan; ` +
    `sisanya ditentukan faktor lain yang tidak tersedia di data ini.`
  );
}

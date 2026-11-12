import { angka } from "../data/stats.js";

/**
 * Unduhan data.
 *
 * Data yang sama yang menggambar peta disediakan mentah, sehingga angka di
 * aplikasi ini bisa diverifikasi ulang di luar aplikasi tanpa meminta berkas
 * ke penulisnya.
 *
 * Nama berkas diberi tanggal unduh supaya beberapa salinan tidak saling
 * menimpa di folder Unduhan.
 */

function unduh(blob, nama) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nama;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Beri jeda sebelum mencabut URL agar unduhan pada peramban lambat tidak gagal.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const tanggal = () =>
  new Date().toISOString().slice(0, 10); // YYYY-MM-DD

async function ambil(berkas) {
  const res = await fetch(`${import.meta.env.BASE_URL}data/${berkas}`);
  if (!res.ok) throw new Error(`Gagal mengunduh ${berkas} (HTTP ${res.status})`);
  return res.blob();
}

export async function unduhData(jenis) {
  const t = tanggal();

  if (jenis === "geojson") {
    const blob = await ambil("kecamatan.geojson");
    unduh(blob, `kecamatan-pemalang-stunting-sanitasi-2024_${t}.geojson`);
    return;
  }

  if (jenis === "csv") {
    const blob = await ambil("kecamatan.csv");
    unduh(blob, `kecamatan-pemalang-stunting-sanitasi-2024_${t}.csv`);
    return;
  }

  throw new Error(`Jenis unduhan tidak dikenal: ${jenis}`);
}

/**
 * Tautan bantuan bila unduhan gagal - lebih berguna daripada pesan galat saja.
 */
export function pesanGagalUnduh(jenis, pesan) {
  const nama = jenis === "csv" ? "kecamatan.csv" : "kecamatan.geojson";
  return (
    `Unduhan ${nama} gagal: ${pesan}. ` +
    `Berkas tersedia langsung di alamat /data/${nama}.`
  );
}

/** Teks ringkas untuk diumumkan ke pembaca layar setelah unduhan dimulai. */
export function pesanSuksesUnduh(jenis, n) {
  const isi = jenis === "csv" ? `${angka(n)} baris tabel atribut` : `${angka(n)} poligon kecamatan`;
  return `Unduhan dimulai: berkas ${jenis.toUpperCase()} berisi ${isi}.`;
}

/** Menandai tombol saat proses berjalan, agar klik ganda tidak menumpuk. */
export async function jalankanUnduh(jenis, tombol, { n }) {
  const labelAsli = tombol.innerHTML;
  tombol.disabled = true;
  tombol.classList.add("opacity-60");
  try {
    await unduhData(jenis);
    return { ok: true, pesan: pesanSuksesUnduh(jenis, n) };
  } catch (e) {
    return { ok: false, pesan: pesanGagalUnduh(jenis, e.message) };
  } finally {
    tombol.disabled = false;
    tombol.classList.remove("opacity-60");
    tombol.innerHTML = labelAsli;
  }
}

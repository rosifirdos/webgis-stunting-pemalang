/**
 * Galeri peta hasil ekspor QGIS.
 *
 * Ini lampiran cetak, bukan peta utama aplikasi: peta utama ada di kanvas
 * Leaflet (lihat src/map/*). Modul ini hanya menukar src/srcset, alt, dan
 * caption tanpa memuat ulang halaman. Berkas rujukan tetap
 * `public/peta/*.png`; varian WebP dipakai untuk layar sempit lewat `srcset`.
 */

import {
  BREAK_STUNTING,
  MEDIAN_STUNTING,
  MEDIAN_SANITASI,
} from "../data/classify.js";
import { kuadranRingkas, angka } from "../data/stats.js";

const BASE = import.meta.env.BASE_URL;
const url = (berkas) => `${BASE}${berkas}`;

const desimal = (v) => angka(v, 2);

const PETA = [
  {
    id: "stunting",
    nama: "Stunting (utama)",
    judul: "Peta Prevalensi Stunting Kabupaten Pemalang 2024",
    berkas: "peta/peta-stunting-utama.png",
    webp: "peta/peta-stunting-utama-1200.webp",
    alt: "Peta prevalensi stunting 2024 per kecamatan Kabupaten Pemalang, 5 kelas kuantil, legenda tercetak di gambar",
    keterangan:
      "Prevalensi balita stunting per kecamatan, 5 kelas kuantil dengan batas 5,29% / 7,40% / 9,13% / 12,18%.",
  },
  {
    id: "prioritas",
    nama: "Kuadran prioritas",
    judul: "Peta Prioritas Stunting 2024 (kuadran)",
    berkas: "peta/peta-prioritas-stunting.png",
    webp: "peta/peta-prioritas-stunting-1200.webp",
    alt: "Peta kuadran prioritas stunting 2024: Prioritas Utama 3 kecamatan, Determinan Lain 4, Waspada 4, Relatif Aman 3",
    keterangan:
      "Empat kuadran dari median stunting 8,60% dan median sanitasi layak 71,33%: Prioritas Utama 3, Determinan Lain 4, Waspada 4, Relatif Aman 3 kecamatan.",
  },
  {
    id: "sanitasi",
    nama: "Faktor penjelas: sanitasi layak",
    judul: "Faktor penjelas: sanitasi layak — Peta Cakupan Sanitasi Layak 2024",
    berkas: "peta/peta-sanitasi-penjelas.png",
    webp: "peta/peta-sanitasi-penjelas-1200.webp",
    alt: "Peta cakupan sanitasi layak 2024 per kecamatan Kabupaten Pemalang sebagai faktor penjelas stunting",
    keterangan:
      "Persentase keluarga dengan akses sanitasi layak. Ditampilkan sebagai faktor penjelas, bukan peta kedua yang setara dengan peta stunting.",
    tambahan: "Nilai di atas 100% ditandai * dan tidak dikoreksi.",
  },
  {
    id: "kapasitas",
    nama: "Kapasitas layanan",
    judul: "Peta Indeks Kapasitas Layanan 2024",
    berkas: "peta/peta-kapasitas-layanan.png",
    webp: "peta/peta-kapasitas-layanan-1200.webp",
    alt: "Peta indeks kapasitas layanan 2024 per kecamatan Kabupaten Pemalang, 5 kelas kuantil ramp merah sampai hijau",
    keterangan:
      "5 kelas kuantil dengan ramp merah–kuning–hijau; makin tinggi nilainya, makin baik kapasitas layanan.",
    tambahan:
      "Indeks kapasitas layanan, bukan indeks risiko. Berkorelasi positif dengan stunting (r = +0,50), diduga karena efek deteksi.",
  },
];

const TANGGAL = "25 November 2026";

let aktif = PETA[0];

export function initGaleriPeta({ rows = [] } = {}) {
  const gambar = document.getElementById("peta-gambar");
  const sumber = document.getElementById("peta-sumber");
  const picture = gambar?.closest("picture");
  const galat = document.getElementById("peta-galat");

  const judul = document.getElementById("peta-judul");
  const keterangan = document.getElementById("peta-keterangan");
  const tambahan = document.getElementById("peta-keterangan-tambahan");
  const status = document.getElementById("peta-aktif-status");
  const pengumuman = document.getElementById("peta-pengumuman");
  const penuh = document.getElementById("peta-penuh");
  const tombol = [...document.querySelectorAll("#pemilih-peta [data-peta]")];

  if (!gambar || !sumber || !tombol.length) return;

  // Angka di caption dihitung dari data, bukan diketik di modul ini, supaya
  // lampiran QGIS dan kanvas Leaflet tidak bisa saling bertentangan.
  if (rows.length) {
    const k = kuadranRingkas(rows);
    const urutan = [
      "1 Prioritas Utama",
      "2 Determinan Lain",
      "3 Waspada",
      "4 Relatif Aman",
    ];
    const jumlah = urutan.map((q) => k[q]).join(" / ");

    const jumlahEl = document.getElementById("peta-prioritas-jumlah");
    if (jumlahEl) jumlahEl.textContent = `${jumlah} kecamatan`;

    const stunting = PETA.find((p) => p.id === "stunting");
    if (stunting) {
      stunting.keterangan =
        `Prevalensi balita stunting per kecamatan, 5 kelas kuantil dengan batas ` +
        `${BREAK_STUNTING.map((b) => `${desimal(b)}%`).join(" / ")}.`;
    }

    const prioritas = PETA.find((p) => p.id === "prioritas");
    if (prioritas) {
      prioritas.alt =
        `Peta kuadran prioritas stunting 2024: Prioritas Utama ${k["1 Prioritas Utama"]} kecamatan, ` +
        `Determinan Lain ${k["2 Determinan Lain"]}, Waspada ${k["3 Waspada"]}, ` +
        `Relatif Aman ${k["4 Relatif Aman"]}`;
      prioritas.keterangan =
        `Empat kuadran dari median stunting ${desimal(MEDIAN_STUNTING)}% dan ` +
        `median sanitasi layak ${desimal(MEDIAN_SANITASI)}%: ` +
        `Prioritas Utama ${k["1 Prioritas Utama"]}, Determinan Lain ${k["2 Determinan Lain"]}, ` +
        `Waspada ${k["3 Waspada"]}, Relatif Aman ${k["4 Relatif Aman"]} kecamatan.`;
    }
  }

  const tampilkan = (p, { umumkan = true } = {}) => {
    aktif = p;

    // srcset lebih dulu, src terakhir: beberapa browser memilih kandidat saat
    // atribut src berubah, dan urutan sebaliknya bisa memuat PNG 3507 px dulu.
    sumber.srcset = `${url(p.webp)} 1200w`;
    gambar.srcset = `${url(p.berkas)} 3507w`;
    gambar.src = url(p.berkas);
    gambar.alt = p.alt;
    gambar.loading = p.id === "stunting" ? "eager" : "lazy";
    gambar.fetchPriority = p.id === "stunting" ? "high" : "auto";

    judul.textContent = p.judul;
    keterangan.textContent = p.keterangan;
    tambahan.textContent = p.tambahan ?? "";
    tambahan.hidden = !p.tambahan;

    status.textContent = `Peta aktif: ${p.nama} · diekspor ${TANGGAL}`;
    penuh.href = url(p.berkas);
    penuh.setAttribute("aria-label", `Buka ukuran penuh ${p.judul} (PNG, tab baru)`);

    for (const t of tombol) {
      t.setAttribute("aria-checked", String(t.dataset.peta === p.id));
    }

    if (umumkan) pengumuman.textContent = `Peta diganti: ${p.nama}`;
  };

  // Gambar yang belum diekspor (mis. peta kapasitas) harus memberi pesan,
  // bukan kotak kosong. Caption tetap tampil supaya konteksnya tidak hilang.
  gambar.addEventListener("error", () => {
    if (galat) {
      galat.textContent =
        aktif.id === "kapasitas"
          ? "Peta kapasitas belum diekspor dari QGIS."
          : `Gambar "${aktif.judul}" gagal dimuat.`;
      galat.hidden = false;
    }
    if (picture) picture.hidden = true;
  });

  gambar.addEventListener("load", () => {
    if (galat) galat.hidden = true;
    if (picture) picture.hidden = false;
  });

  for (const t of tombol) {
    t.addEventListener("click", () => {
      tampilkan(PETA.find((p) => p.id === t.dataset.peta) ?? PETA[0]);
    });
  }

  // Panah kiri/kanan/atas/bawah memindahkan pilihan, sesuai pola radiogroup.
  document.getElementById("pemilih-peta")?.addEventListener("keydown", (e) => {
    const arah = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!arah) return;
    e.preventDefault();
    const i = tombol.findIndex((t) => t.getAttribute("aria-checked") === "true");
    const berikut = tombol[(i + arah + tombol.length) % tombol.length];
    berikut.focus();
    tampilkan(PETA.find((p) => p.id === berikut.dataset.peta) ?? PETA[0]);
  });

  tampilkan(aktif, { umumkan: false });
}

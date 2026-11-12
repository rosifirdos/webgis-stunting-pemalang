# Web GIS Stunting & Sanitasi — Kabupaten Pemalang 2024

Peta choropleth interaktif dan dashboard analitik untuk prevalensi balita
stunting dan capaian akses sanitasi layak di 14 kecamatan Kabupaten Pemalang.
Angka bersumber dari **Profil Kesehatan Kabupaten Pemalang 2024** (Dinas
Kesehatan Kabupaten Pemalang); batas administrasi dari **LapakGIS** (WGS84 /
EPSG:4326).

Dibuat untuk tugas mata kuliah Sistem Informasi Geografis —
Awanda Rosi Firdaus (NPM 24670105).

---

## Menjalankan

Butuh Node 20 atau lebih baru.

```bash
npm install
npm run dev        # server pengembangan (http://localhost:5173)
npm run build      # hasil produksi ke dist/
npm run preview    # pratinjau hasil build
npm run prepare-data   # regenerasi public/data/ dari Shapefile sumber
```

`npm run prepare-data` membaca Shapefile/DBF dari **folder induk** repo ini
(`../Kecamatan_Pemalang_Stunting_Sanitasi_2024.shp`), jadi Shapefile sumber
harus tetap ada di sana. Skrip ini **tidak memerlukan GDAL, QGIS, atau
mapshaper** — parsing SHP/DBF ditulis sendiri dengan Node murni, tanpa
dependensi tambahan.

---

## Struktur

```
webgis-stunting-pemalang/
├─ public/data/
│  ├─ kecamatan.geojson          14 poligon + atribut (398 KB, 40 KB brotli)
│  └─ kecamatan.csv              tabel atribut untuk diunduh ulang
├─ src/
│  ├─ main.js                    bootstrap + urutan inisialisasi
│  ├─ styles.css                 @import "tailwindcss" + token @theme
│  ├─ tokens.js                  baca token warna dari CSS, simpan preferensi tema
│  ├─ data/
│  │  ├─ load.js                 fetch + cache GeoJSON
│  │  ├─ classify.js             klasifikasi interval + lookup warna
│  │  └─ stats.js                KPI, korelasi Pearson, peringkat
│  ├─ map/
│  │  ├─ init.js                 peta, basemap, kontrol
│  │  ├─ layers.js               definisi layer + atribut
│  │  ├─ choropleth.js           gaya polygon, tooltip, popup
│  │  ├─ legend.js               legenda dinamis
│  │  └─ interactions.js         hover, klik, sinkron tabel
│  ├─ charts/
│  │  ├─ base.js                 registrasi Chart.js + pembacaan tema
│  │  ├─ bar.js                  peringkat stunting (horizontal, menurun)
│  │  └─ scatter.js              sanitasi vs stunting + anotasi r
│  ├─ ui/
│  │  ├─ tabs.js                 navigasi Home / Peta / Info (hash)
│  │  ├─ kpi.js                  kartu ringkasan
│  │  ├─ filters.js              filter kelas kerentanan
│  │  ├─ table.js                tabel: cari, urut, filter
│  │  └─ export.js               unduh GeoJSON + CSV
│  └─ state/store.js             state tunggal (layer aktif, kecamatan terpilih)
├─ scripts/prepare-data.mjs      SHP/DBF → GeoJSON + CSV, tanpa GDAL
└─ vite.config.js
```

**Prinsip:** `src/state/store.js` adalah satu-satunya sumber kebenaran (layer
aktif, kecamatan terpilih, filter). Peta dan grafik berlangganan store yang
sama, sehingga fitur split map (FR-MAP-05, ditunda ke v1.1) cukup menambahkan
instance peta kedua tanpa refactor.

---

## Sumber data & atribusi

| Sumber | Dipakai untuk | Syarat |
| :--- | :--- | :--- |
| Profil Kesehatan Kabupaten Pemalang 2024 | Angka stunting (Tabel 48) dan sanitasi (Tabel 81) | Kutip Dinas Kesehatan |
| LapakGIS | Batas administrasi kecamatan, EPSG:4326 | Sebutkan sumber |
| Esri Canvas (Light/Dark Gray) | Basemap dasar | Atribusi pada peta |
| Esri World Imagery | Citra satelit | Atribusi pada peta |
| OpenStreetMap | Basemap jalan | Atribusi pada peta |

**Atribusi basemap wajib tampil** — itu syarat pemakaian layanan ubinnya, bukan
sekadar kredit. Atribusi ditulis di dalam `BASEMAP[...].attr` pada
`src/map/init.js` dan dirender oleh kontrol atribusi Leaflet. Jangan
menonaktifkan `attributionControl`.

---

## Catatan metodologi

Halaman **Info** di aplikasi memuat penjelasan lengkap. Ringkasnya:

**Nilai sanitasi melebihi 100%.** Warungpring tercatat 111,77%. Persentase
mustahil melebihi 100%; penyebab paling mungkin adalah penyebut `jumlah_kk`
yang tidak konsisten antar-baris puskesmas pada Tabel 81 mentah. Nilai
**ditampilkan apa adanya** agar konsisten dengan peta pada laporan cetak, tetapi:

- skala warna diklasifikasi pada rentang tetap 0–100%, sehingga nilai ini jatuh
  di luar kelas teratas dan terlihat menonjol;
- diberi penanda `*` pada tooltip, popup, dan tabel, plus garis putus-putus
  "batas 100%" pada scatter;
- dicatat eksplisit di halaman Info.

**Korelasi lemah, dan itu ditampilkan sebagai temuan.** Korelasi sanitasi ↔
stunting hanya r = −0,22 (R² = 0,05). Nilai r dan R² ditampilkan apa adanya
dengan keterangan netral: sanitasi bukan satu-satunya faktor penentu stunting
pada tingkat kecamatan. Menyembunyikan angka yang lemah akan menyesatkan.

**Warna web berbeda dari peta cetak.** Peta QGIS memakai ramp *Greens*, di mana
hijau tua = stunting tertinggi — secara persepsi "hijau = baik", sehingga nilai
terburuk justru terlihat aman. Di web, stunting memakai ramp **oranye satu hue**
(rendah → tinggi) dan sanitasi memakai **biru**. Perbedaan ini dicatat di
halaman Info.

---

## Aksesibilitas

- Kontras teks memenuhi WCAG AA (≥ 4,5:1) pada kedua tema. Ini **dihitung**,
  bukan dikira-kira: rasio kontras tiap token teks terhadap kedua permukaan
  (`--color-canvas`, `--color-surface`) dihitung dari `src/styles.css`
  (luminansi relatif WCAG, sRGB→linear). Rentang hasilnya 4,78:1–19,17:1
  (terang) dan 4,85:1–16,90:1 (gelap); tidak ada satu pun di bawah ambang.
- Warna yang dipakai sebagai **teks** tidak meminjam langkah ramp yang dipilih
  sebagai isian peta. `--color-sanitasi-2` (titik scatter, poligon) hanya
  3,47:1 bila dipakai sebagai teks 12px, jadi tautan memakai token tersendiri
  `--color-link` yang langkahnya dipilih dengan mengukur. Judul galat juga
  memakai langkah merah yang lebih terang di tema gelap, karena warna status
  yang tetap akan jatuh di bawah ambang pada latar `#0d0d0d`.
- Rampa warna divalidasi, bukan dikira-kira. Untuk ramp sekuensial, jaminan
  keterbacaan bagi buta warna datang dari **satu hue dengan luminansi yang
  monoton** (CVD mempertahankan luminansi, sehingga urutan tetap terbaca tanpa
  membedakan hue). Validator palet memastikan keempat syaratnya pada kedua tema:
  luminansi monoton, jarak antar-langkah ΔL ≥ 0,06, ujung terang tetap ≥ 2:1
  terhadap permukaan, dan sebaran hue 0°. Keempat ramp (stunting & sanitasi,
  terang & gelap) lolos semua.
- Navigasi tab mendukung panah kiri/kanan dengan *roving tabIndex* dan peran
  ARIA `tablist`; pindah tab dapat di-bookmark lewat `#home` / `#peta` / `#info`.
- Identitas kelas pada tabel tidak bergantung pada warna saja — ada label teks
  di samping titik warna.
- Perubahan status diumumkan lewat `aria-live`.

---

## Deployment

Repo ini menyertakan konfigurasi untuk dua penyedia; pilih salah satu.

### Vercel

`vercel.json` sudah mengatur `buildCommand`, `outputDirectory`, dan rewrite
SPA. Impor repo di Vercel — tanpa penyetelan tambahan.

### Netlify

`netlify.toml` sudah mengatur build, publish, dan redirect SPA. Hubungkan repo
di Netlify — tanpa penyetelan tambahan.

### GitHub Pages (alternatif)

`vite.config.js` memakai `base: "./"`, sehingga aset tetap ditemukan bila
di-host di sub-path. Untuk Pages, terbitkan folder `dist/`. Catatan: Pages tidak
mendukung rewrite SPA, jadi tautan langsung ke `#home` / `#peta` / `#info` tetap
bekerja (bagian setelah `#` tidak dikirim ke server), tetapi alamat tanpa hash
di sub-path perlu disesuaikan.

**Kompresi.** GeoJSON mentah 398 KB; Vercel dan Netlify mengirimnya dengan
brotli otomatis → **40 KB** saat ditransfer (gzip 76 KB). Ini memenuhi target
< 150 KB. Verifikasi dengan `Content-Encoding: br` pada header respons.

---

## Yang sengaja tidak dilakukan di v1

Dua hal berikut ditunda ke v1.1 sesuai keputusan ruang lingkup:

- **Split map** (FR-MAP-05) — arsitektur store sudah disiapkan untuk itu.
- **Ekspor PDF** — halaman Info menyediakan unduh GeoJSON dan CSV, bukan PDF.

Selain itu, dua penyimpangan sadar dari rencana awal:

- **Bukan mapshaper.** Mesin pengembangan tidak punya GDAL/QGIS, sehingga
  konversi SHP → GeoJSON ditulis sendiri dengan Node murni
  (`scripts/prepare-data.mjs`). Simplifikasi memakai **penghapusan titik
  kolinear**, bukan Douglas-Peucker: DP menyederhanakan tiap ring secara
  mandiri, sehingga dua kecamatan bertetangga bisa mendapat titik berbeda di
  segmen batas yang sama dan muncul celah (sliver) di antaranya. Penghapusan
  titik kolinear bersifat deterministik pada koordinat, jadi segmen bersama
  disederhanakan dengan cara yang sama di kedua sisi — nol celah, bentuk peta
  tidak berubah.
- **Bukan YlOrRd.** Rencana awal meminta ramp YlOrRd untuk stunting, tetapi
  validator palet menolaknya: kuning → merah itu dua hue (sebaran hue 53°,
  di atas batas 40°) dan tidak terbaca sebagai ramp sekuensial yang andal.
  Diganti **oranye satu hue** yang lolos validasi di tema terang maupun gelap.

Basemap juga berbeda dari rencana: ubin CartoDB Positron kini menolak permintaan
tanpa kunci API dan mengirim ubin bertanda "API KEY REQUIRED", sehingga diganti
**Esri Light/Dark Gray Canvas** yang tidak memerlukan kunci.

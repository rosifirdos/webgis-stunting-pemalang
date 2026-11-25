# Web GIS Stunting Kabupaten Pemalang 2024

Web GIS dan dashboard analitik untuk prevalensi balita stunting di 14
kecamatan Kabupaten Pemalang. **Stunting adalah fokus studi; sanitasi dipakai
sebagai faktor penjelas**, bukan penyebab. Angka bersumber dari **Profil
Kesehatan Kabupaten Pemalang 2024** (Dinas Kesehatan Kabupaten Pemalang);
batas administrasi dari **LapakGIS** (WGS84 / EPSG:4326).

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
dependensi tambahan. Perintah yang sama juga menulis
`public/data/determinan.json` (95 uji determinan, 6 model regresi, 7 baris
registry anomali), sehingga panel Info tidak memuat angka statistik di HTML.

**Peta interaktif dan lampiran cetak memakai sumber yang sama.** Panel Peta
dirender Leaflet dari `public/data/kecamatan.geojson`; lampiran cetak dan gambar
peta Home berasal dari ekspor QGIS. Bila data berubah, perbarui dua hal:
`npm run prepare-data` **dan** ekspor ulang layout QGIS (langkah lengkap di
`public/peta/README.md`).

Rujukan dokumen: PRD v2 di [`PRD.md`](PRD.md) dan PRD v1 di
[`../PRD.md`](../PRD.md).

---

## Struktur

```
webgis-stunting-pemalang/
├─ public/
│  ├─ data/
│  │  ├─ kecamatan.geojson        14 poligon + atribut (391 KB, 40 KB brotli)
│  │  ├─ kecamatan.csv            tabel atribut untuk diunduh ulang
│  │  └─ determinan.json          95 uji + regresi + anomali (lazy load)
│  ├─ media/                      6 berkas foto (WebP), total 680 KB
│  │                              · 2 hero (lebar/sempit), 2 pita, 2 masthead
│  └─ peta/                       4 layout QGIS cetak (PNG 3507×2480)
│                                 + varian 1200 px (WebP) untuk layar sempit
├─ src/
│  ├─ main.js                    bootstrap + urutan inisialisasi
│  ├─ styles.css                 @import "tailwindcss" + token @theme static
│  ├─ tokens.js                  baca token warna dari CSS, simpan preferensi tema
│  ├─ data/
│  │  ├─ load.js                 fetch + cache GeoJSON
│  │  ├─ classify.js             kelas kuantil 5 + kuadran + indeks kapasitas
│  │  └─ stats.js                KPI, korelasi Pearson, peringkat
│  ├─ map/
│  │  ├─ init.js                 peta, basemap, kontrol
│  │  ├─ layers.js               definisi 4 layer + ramp QGIS (Reds/Blues/RdYlGn/kuadran)
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
│  │  ├─ galeri.js                foto sebagai bagian tata letak + kreditnya
│  │  ├─ galeri-peta.js           pemilih 4 peta cetak hasil QGIS
│  │  ├─ info.js                 uji determinan, regresi, registry anomali
│  │  └─ export.js               unduh GeoJSON + CSV
│  └─ state/store.js             state tunggal (layer aktif, kecamatan terpilih)
├─ scripts/
│  ├─ prepare-data.mjs           SHP/DBF → GeoJSON + CSV, tanpa GDAL
│  └─ prepare-determinan.mjs     uji determinan + regresi + anomali
└─ vite.config.js
```

Tangkapan layar desktop dan mobile untuk laporan ada di `dokumentasi/`.

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

## Sumber foto

Empat foto dipakai sebagai **bagian komposisi halaman**, bukan galeri atau kartu
dokumentasi berketerangan. Tiap foto mengisi slot tata letak yang sudah ada di
`index.html`; slot itulah yang menentukan ukuran dan rasionya, dan modul
`src/ui/galeri.js` hanya mengisi gambar serta baris kreditnya.

| Slot | Berkas | Posisi | Ukuran |
| :--- | :--- | :--- | :--- |
| Hero Home | `hero-pengukuran-panjang-badan.webp` / `-sempit.webp` (≤640px) | Latar penuh selebar jendela, tampil begitu halaman dibuka | 2100×1182 (16:9) / 900×1125 (4:5) |
| Pita sebelum tabel | `pita-lebar.webp` / `pita-sempit.webp` (≤640px) | Selebar jendela, jeda antara grafik dan tabel | 1400×539 (2,6:1) / 1000×625 (1,6:1) |
| Masthead Peta | `masthead-pengukuran-serentak.webp` | Latar judul panel Peta | 720×405 (16:9) |
| Masthead Info | `masthead-penimbangan-berat.webp` | Latar judul panel Info | 1197×673 (16:9) |

Berkasnya WebP, bukan JPEG: halaman ini sudah mengasumsikan browser modern
(`color-mix`, `has-[:checked]`, `aspect-ratio`, `svh`), dan pada kualitas setara
WebP memangkas sekitar sepertiga bobot transfer. Keenam berkas berjumlah
**680 KB**, tetapi yang terunduh untuk menelusuri ketiga tab jauh lebih sedikit
— **445 KB** di layar lebar (hero + pita lebar + dua masthead) atau **359 KB**
di ponsel (hero sempit + pita sempit + dua masthead). Kedua slot dua-berkas
memakai `<picture>` + `<source media="(max-width: 640px)">`, dan browser hanya
mengunduh sumber yang terpilih. Masthead juga `loading="lazy"`, jadi membuka
Home saja hanya mengambil hero (241 KB) dan pita setelah digulir.

**Dua slot memakai dua berkas untuk satu slot**, karena satu potongan tidak
bisa melayani kedua ujung:

- *Hero.* Potongan 16:9 dipakai apa adanya di desktop. Di ponsel hero jauh
  lebih tegak dan lebih tinggi daripada lebarnya, sehingga potongan 16:9 hanya
  menyisakan sepertiga tengah foto — ibu dan kader terpotong. Potongan 4:5
  menjaga ibu, bayi, dan papan ukur tetap bersama.
- *Pita.* Rasio 2,6:1 pas sebagai pita di layar lebar, tetapi di 390px hanya
  setinggi ~150px dan wajah subjeknya hilang. Potongan 1,6:1 dipakai di bawah
  640px. Karena `object-cover` tidak bisa menghindari subjek di dua rasio
  sekaligus, pemotongan dilakukan sekali di berkas dengan bias yang diperiksa.

Hanya satu sumber yang diunduh browser; tidak ada pemborosan. Sisi lain:
berkas yang tidak terpilih tetap ikut ter-deploy.

| Berkas | Kegiatan | Lokasi asli | Pemilik |
| :--- | :--- | :--- | :--- |
| `hero-pengukuran-panjang-badan.webp` (+`-sempit`) | Pengukuran panjang badan balita | Wilayah penerbit: Kabupaten Tangerang, Banten (artikel asli tidak ditemukan) | Puskesmas Kelapa Dua, Kabupaten Tangerang |
| `pita-lebar.webp` + `pita-sempit.webp` | Pemeriksaan tumbuh kembang dan antropometri balita, 18 Sep 2025 | Desa Klepu, Kabupaten Malang, Jawa Timur | P3M Poltekkes Kemenkes Malang |
| `masthead-pengukuran-serentak.webp` | Pengukuran serentak balita, 20 Mei 2025 | Kantor Wali Kota Singkawang, Kalimantan Barat | Singkawang Media Informasi |
| `masthead-penimbangan-berat.webp` | Penimbangan berat badan balita di posyandu | Tidak disebutkan pada sumber | KG Newsroom |

**Foto-foto ini bukan dokumentasi Kabupaten Pemalang.** Kegiatan aslinya
berlangsung di Kota Singkawang, Kabupaten Malang, dan Kabupaten Tangerang.
Foto dipakai sebagai ilustrasi jenis kegiatan yang menghasilkan angka semacam
ini, bukan sebagai bukti keadaan di Pemalang.

Karena foto kini dipakai selebar jendela, risiko salah baca naik, bukan turun:
hero selebar layar paling mudah dianggap potret daerah ini. Karena itu setiap
slot tetap membawa kredit yang menyebut lokasi aslinya — di dasar hero, di dasar
masthead, dan di bawah pita — dan kredit itu tidak boleh dipindah ke kaki
halaman.

Dua baris perlu dicatat sebagai **mata rantai terlemah** atribusinya:
`kgnewsroom.com` adalah portal yang hanya bisa dibuka setelah masuk, sehingga
pemilik sah dan artikel aslinya tidak dapat dipastikan — kredit hanya menyebut
institusi penerbit. Untuk foto Puskesmas Kelapa Dua, penerbitnya terverifikasi
tetapi artikel tempat foto itu tampil tidak ditemukan, jadi tidak ada lokasi
kegiatan maupun tanggal yang bisa dicantumkan. Bila foto-foto ini hendak
dipakai di luar lingkup tugas akademik, izin perlu diminta langsung ke kedua
institusi tersebut.

Ketentuan yang dipegang:

- **Berkas di-host sendiri**, disalin ke `public/media/`, tidak di-hotlink ke
  server sumber. Hotlink membebani server lembaga lain setiap kali halaman
  dibuka, dan gambarnya akan mati begitu berkas aslinya dipindahkan.
- **Kredit menautkan halaman artikel aslinya**, bukan hanya menyebut nama.
- **Daftar foto ada di satu tempat**: objek `FOTO` pada `src/ui/galeri.js`.
  Satu entri mengisi slot gambarnya sekaligus baris kredit di Info. Menambah
  atau menghapus foto cukup di objek itu; tidak ada kredit yang bisa
  tertinggal.
- **Hak cipta tetap pada pemiliknya.** Keempatnya karya lembaga pemerintah atau
  media; pemakaian di sini untuk keperluan tugas akademik non-komersial dengan
  atribusi penuh. Untuk pemakaian publik yang lebih luas, minta izin ke pemilik
  masing-masing.
- **Atribut `width`/`height` ditulis eksplisit** agar tata letak tidak bergeser
  saat gambar selesai dimuat (CLS). Hero memakai `fetchPriority="high"` karena
  ia elemen terbesar di layar pertama (LCP); gambar lain `loading="lazy"`.
- **Teks di atas foto memakai peredup yang diukur, bukan dikira.** `.hero-scrim`
  adalah gradien lima henti (alpha 0,44 → 0,93 dari atas ke bawah). Setiap
  berkas hero/masthead dikompositkan dengan gradien itu, lalu kontras setiap
  alpha teks yang dipakai dihitung terhadap piksel terang terburuk pada pita
  tempat teks benar-benar berada. Hasil terendah 4,73:1 (halaman Info) — lolos
  AA. Versi gradien sebelumnya (0,35/0,72/0,88) hanya mencapai 3,8:1 di hero,
  gagal justru di bagian atas tempat judul mulai.
- **`object-position` masthead ditulis sebagai kelas terpisah.** `.foto-tutup`
  tidak berada di dalam `@layer`, sehingga ia selalu mengalahkan utility
  Tailwind; karena itu pemotongan bawah memakai `.foto-tutup-bawah` (50% 70%),
  bukan `object-[50%_70%]` di HTML. Pada 42% bawaan, masthead setinggi 190–230px
  hanya menampilkan atap dan langit-langit.

---

## Peta

Panel **Peta** memakai **peta Leaflet interaktif** (`src/map/*`) yang digambar
dari `public/data/kecamatan.geojson`: bisa digeser, di-zoom, berganti layer,
berganti basemap, dan diklik per kecamatan. Empat layer tersedia di kanvas yang
sama: **prevalensi stunting** (fokus studi), **faktor penjelas sanitasi layak**,
**kuadran prioritas** (4 warna kategori), dan **indeks kapasitas layanan**.
Klik satu poligon menyorot baris tabel, grafik, dan kartu "Kecamatan terpilih".
Peta ini memakai 5 kelas Quantile dan ramp warna yang sama dengan QGIS.

Empat layout **ekspor QGIS** (`public/peta/*.png`) tetap disediakan sebagai
lampiran cetak dan gambar peta di Home. Semuanya diekspor dari proyek QGIS
3.44.16 (`../output/Pemalang_Stunting_Sanitasi_2024.qgz`) berukuran
3507 × 2480 px: stunting (utama), kuadran prioritas, faktor penjelas sanitasi,
dan indeks kapasitas layanan. Legenda, anotasi, dan skalanya sama persis dengan
layout laporan. Lampiran ini **tidak dibuat oleh browser** dan tidak
menggantikan peta interaktif.

Warna poligon peta Leaflet mengikuti ramp proyek QGIS, sehingga kelas warnanya
sama dengan peta cetak; bedanya hanya ada di grafik, dan itu dijelaskan di
bagian [Catatan metodologi](#catatan-metodologi).

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
stunting hanya r = −0,22 (R² = 0,05; p = 0,443; n = 14). Nilai r dan R²
ditampilkan apa adanya dengan keterangan netral: sanitasi bukan satu-satunya
faktor penentu stunting pada tingkat kecamatan. Menyembunyikan angka yang lemah
akan menyesatkan. Uji terhadap 95 variabel determinan juga tidak menemukan satu
pun yang signifikan setelah koreksi Benjamini–Hochberg; karena itu seluruh
analisis diberi label eksploratif, dan hasil regresi dilaporkan sebagai nominal.
Rinciannya ada di panel Info.

**Peta memakai warna QGIS apa adanya; grafik memakai ramp tema.** Isi poligon
disalin dari proyek QGIS — *Reds* lima kelas untuk stunting dan *Blues* lima
kelas untuk sanitasi — dengan garis batas #232323 seperti outline layout cetak.
Ramp ini **tidak ikut tema**: satu kelas selalu berwarna sama di terang dan
gelap, sehingga arti warnanya tidak terbalik saat tema berganti dan peta di
layar terbaca sama dengan peta cetak. Grafik batang dan sebar tetap memakai
token `--color-stunting-*` / `--color-sanitasi-*`, yang langkahnya dipilih ulang
untuk latar gelap karena grafik duduk di atas permukaan tema, bukan di atas
citra. Perbedaan ini dicatat di halaman Info.

**Kelas ramp harus selalu teremit, jadi `@theme static` — bukan `@theme`.**
Tailwind v4 membuang variabel `@theme` yang tidak terlihat "dipakai", dan
deteksinya statis berbasis teks sumber. Ramp di sini dibaca saat runtime di
`src/tokens.js` dengan nama yang dibangun dari template string
(``--color-${nama}-${i}``), sehingga tak terlihat pemindai. Akibatnya
`--color-sanitasi-1` dan `-3` — yang nol kemunculan literal di HTML/JS —
dibuang dari blok `:root` tema terang, sementara blok tema gelap (CSS biasa,
bukan `@theme`) tetap memuatnya. Gejalanya khas dan menyesatkan: swatch "Baik"
dan "Rendah" di legenda sama-sama transparan sehingga tampak identik, seluruh
choropleth jadi satu warna datar, dan bar gradien legenda peta mati — **hanya di
tema terang**. `@theme static` memaksa semua variabel selalu teremit. Jangan
kembalikan ke `@theme` biasa; lihat komentar di `src/styles.css`.

---

## Aksesibilitas

- Kontras teks memenuhi WCAG AA (≥ 4,5:1) pada kedua tema. Ini **dihitung**,
  bukan dikira-kira: rasio kontras tiap token teks terhadap kedua permukaan
  (`--color-canvas`, `--color-surface`) dihitung dari `src/styles.css`
  (luminansi relatif WCAG, sRGB→linear). Rentang hasilnya 4,78:1–19,17:1
  (terang) dan 4,85:1–16,90:1 (gelap); tidak ada satu pun di bawah ambang.
- Warna yang dipakai sebagai **teks** tidak meminjam langkah ramp yang dipilih
  sebagai isian peta. `--color-sanitasi-2` (titik scatter, poligon) hanya
  4,11–4,22:1 bila dipakai sebagai teks 12px — di bawah ambang AA — jadi tautan
  memakai token tersendiri `--color-link` yang langkahnya dipilih dengan
  mengukur (4,78:1 di kanvas, 4,91:1 di permukaan). Judul galat juga memakai
  langkah merah yang lebih terang di tema gelap, karena warna status yang tetap
  akan jatuh di bawah ambang pada latar `#0d0d0d`.
- Rampa warna divalidasi, bukan dikira-kira. Untuk ramp sekuensial, jaminan
  keterbacaan bagi buta warna datang dari **satu hue dengan luminansi yang
  monoton** (CVD mempertahankan luminansi, sehingga urutan tetap terbaca tanpa
  membedakan hue). Validator memastikan empat syarat pada tiap ramp dan tema:
  luminansi monoton, jarak antar-langkah ΔY ≥ 0,06, ujung terang tetap ≥ 2:1
  terhadap permukaan, dan sebaran hue jauh di bawah 40°. Hasil terukur keempat
  ramp (stunting & sanitasi, terang & gelap):

  | Ramp | ΔY antar langkah | Ujung terang | Sebaran hue |
  |---|---|---|---|
  | sanitasi terang | 0,260 / 0,135 | 2,04:1 | 0,5° |
  | sanitasi gelap  | 0,168 / 0,310 | 2,33:1 | 0,6° |
  | stunting terang | 0,116 / 0,081 | 2,67:1 | 2,0° |
  | stunting gelap  | 0,094 / 0,142 | 2,71:1 | 3,3° |

  Keempatnya lolos semua syarat. Langkah sanitasi sengaja dipilih ulang agar
  jarak antar-kelasnya **sama besar** (ΔL* ≈ 22 per langkah); ramp lama timpang
  (ΔL* 17 lalu 22) sehingga dua kelas teratas tampak berdekatan.
- **Warna poligon peta berada di luar sistem token ini.** Ramp QGIS
  (`Reds`/`Blues`) bukan ramp situs, jadi tidak melewati validator palet:
  ujung terangnya `#fff5f0` hanya 1,05:1 terhadap permukaan putih. Karena itu
  batas wilayah dinyatakan oleh outline `#232323`, bukan oleh kontras isian —
  sama seperti pada layout cetak. Identitas kelas tetap tidak bergantung pada
  warna: setiap langkah legenda membawa label kelas dan rentang angkanya, dan
  tooltip menulis nilai per kecamatan.
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

`vite.config.js` memakai `base: "/webgis-stunting-pemalang/"`, sesuai nama
repo. Bila repo Pages memakai nama lain, ubah `base` agar aset ditemukan;
untuk host di akar domain, gunakan `base: "/"`. Untuk Pages, terbitkan folder
`dist/`. Catatan: Pages tidak mendukung rewrite SPA, jadi tautan langsung ke
`#home` / `#peta` / `#info` tetap bekerja (bagian setelah `#` tidak dikirim ke
server), tetapi alamat tanpa hash perlu diarahkan ke `index.html`.

**Kompresi.** GeoJSON mentah 391 KB; Vercel dan Netlify mengirimnya dengan
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

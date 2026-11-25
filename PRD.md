# PRD — Revisi Web GIS Stunting Kabupaten Pemalang (v2.0)

| | |
|---|---|
| **Produk** | Web GIS Stunting Kabupaten Pemalang 2024 |
| **Versi dokumen** | 2.1 (amandemen atas v2.0; revisi atas PRD v1 di `../PRD.md`) |
| **Status** | Disetujui untuk implementasi |
| **Tanggal** | 25 November 2026 |
| **Pemilik** | Awanda Rosi Firdaus (NPM 24670105) |
| **Lokasi kode** | `webgis-stunting-pemalang/` |
| **Sumber analisis** | `output/Pemalang_Stunting_Sanitasi_2024_join.gpkg`, QGIS 3.44.16 |

---

## Amandemen v2.1 — sanitasi = variabel biasa (25 November 2026)

Setelah v2.0 diimplementasikan, sanitasi masih mendapat posisi istimewa:
ia menentukan kuadran 2×2, punya diagram sebar sendiri, dan menjadi titik
pembanding di grafik batang. Amandemen ini menurunkannya sepenuhnya menjadi
**satu dari 95 determinan**. Butir yang mengubah keputusan v2.0:

1. **Prioritas intervensi tidak lagi kuadran 2×2 median.** Kuadran diganti
   **empat tingkat prioritas** yang diturunkan langsung dari kelas prevalensi
   stunting: Prioritas Utama (kelas 5), Prioritas Menengah (kelas 4),
   Pemantauan (kelas 3), Relatif Rendah (kelas 1–2). Field data `kuadran`
   diganti `prioritas`.
2. **Diagram sebar sanitasi–stunting dihapus**, termasuk kotak korelasinya.
   Hubungan tiap determinan dibaca di panel Info (95 uji + FDR), bukan
   diangkat menjadi grafik tunggal.
3. **Titik pembanding sanitasi di grafik batang dihapus**; grafik batang
   kembali satu seri (stunting).
4. **Layer peta determinan bersifat generik.** Sembilan determinan yang punya
   nilai per kecamatan (sanitasi layak, sanitasi aman, jumlah KK sanitasi
   layak, ASI eksklusif, catin anemia, cakupan penimbangan balita, KK stop
   BABS, KK CTPS, desa 5 pilar STBM) dipilih lewat satu dropdown dan dipetakan
   dengan satu mekanisme: kelas kuantil dihitung dari datanya sendiri, ramp
   Blues yang sama. Tidak ada variabel determinan yang punya layer, kelas,
   atau warna khusus.
5. **Tabel data Home tidak lagi mengkolomkan sanitasi**; nilai tetap tersedia
   di unduhan CSV/GeoJSON dan di layer peta.
6. Gambar lampiran QGIS **tidak disematkan di halaman** (Home maupun tab Peta);
   berkas PNG tetap disimpan sebagai lampiran cetak laporan.

Butir PRD v2.0 di bawah yang bertentangan dengan daftar ini (§2.3 kuadran
median split, FR-03 kuadran 2×2, FR-09 scatter & pembanding batang, contoh
UI "4 KPI") **digantikan oleh amandemen ini**; teks aslinya dipertahankan
sebagai riwayat keputusan.

---

## 0. Ringkasan Eksekutif

Aplikasi v1 memperlakukan **stunting dan sanitasi sebagai dua topik setara** (dua layer, dua legenda, narasi "stunting & sanitasi"). Revisi v2.0 menetapkan **stunting sebagai satu-satunya studi kasus (variabel terikat)**, dan menurunkan sanitasi menjadi **faktor penjelas** beserta variabel determinan lain.

Perubahan ini bukan kosmetik. Hasil analisis QGIS menunjukkan:

1. Sanitasi layak **tidak berhubungan linear** dengan stunting di level kecamatan (r = −0,223; p = 0,443; R² = 5%).
2. **4 kecamatan stunting tinggi justru ber-sanitasi baik** → sanitasi bukan determinan tunggal.
3. Dari 95 variabel yang diuji, **0 yang signifikan setelah koreksi FDR** → aplikasi wajib menyatakan analisis bersifat **eksploratif**, bukan kausal.
4. Indeks kapasitas layanan berkorelasi **positif** dengan stunting (r = +0,50) → indikasi **efek deteksi**, bukan proteksi.

Aplikasi v2.0 harus mengkomunikasikan keempat hal ini secara eksplisit, bukan menyembunyikannya.

### Delta ringkas v1 → v2

| Aspek | v1 (sekarang) | v2 (target) |
|---|---|---|
| Posisi topik | Stunting + sanitasi setara | **Stunting utama**, sanitasi = faktor penjelas |
| Klasifikasi peta | 3 kelas *equal interval* | **5 kelas Quantile** (break sesuai QGIS) |
| Layer peta | 2 (stunting, sanitasi) | **Peta Leaflet 2 layer** (stunting, sanitasi) + **4 lampiran cetak ekspor QGIS** |
| Penanda prioritas | `kelas Tinggi && sanitasi < 60` | **Kuadran 2×2 median** |
| Panel determinan | Tidak ada | **Tabel 95 variabel + FDR** |
| Narasi statistik | r dan R² tanpa uji signifikansi | r, p, n, **status FDR**, disclaimer |
| Anomali data | Disebut di tab Info (narasi) | **Registry anomali terstruktur** |
| Data determinan | Tidak dilayani | `determinan.json` dimuat lazy |
| Sumber peta | Dirender Leaflet dari GeoJSON | **Leaflet interaktif** (5 kelas Quantile) + lampiran PNG ekspor QGIS |

---

## 1. Latar Belakang & Pergeseran Fokus

Stunting adalah masalah gizi kronis yang bersifat multideterminan dan menjadi indikator utama kualitas SDM. Sanitasi hanyalah **satu** jalur (sanitasi → diare → malabsorpsi → gangguan pertumbuhan). Menempatkan keduanya sejajar membuat pembaca menyimpulkan hubungan sebab-akibat yang tidak didukung data.

Kerangka analisis yang benar:

```
Y  : stunting_pct (utama)          ← satu-satunya outcome yang dipetakan besar
X1 : sanitasi_layak_pct            ← faktor penjelas utama
X2 : ASI, K4, imunisasi, diare,
     TB anak, BBLR, catin           ← determinan pendukung
K  : kepadatan, luas, penduduk      ← kontrol / konteks
```

**Prinsip produk:** peta besar = stunting. Peta kecil/sekunder = penjelas. Tidak boleh ada dua peta besar yang bersaing secara visual.

### 1.1 Sumber peta: Leaflet interaktif + ekspor QGIS

Panel **Peta** memakai peta **Leaflet interaktif** yang digambar dari
`public/data/kecamatan.geojson`. Peta inilah peta utama aplikasi: bisa digeser,
di-zoom, berganti layer stunting/sanitasi, dan diklik per kecamatan.

Peta Leaflet memakai **5 kelas Quantile dengan break yang sama dengan QGIS**
(§2.2), ramp warna yang sama (*Reds*/*Blues*), dan legenda 5 kelas di panel.
Karena break dan ramp berasal dari satu modul (`src/data/classify.js`), warna di
layar dan di laporan tidak berbeda.

Selain peta interaktif, QGIS tetap dipakai untuk menghasilkan **lampiran cetak**
(gambar peta di Home dan galeri 4 layout di tab Peta):

```
QGIS 3.44.16 (layout A4 landscape, 300 dpi)
        │
        ├─ Export as Image  →  public/peta/peta-stunting-utama.png
        ├─ Export as Image  →  public/peta/peta-prioritas-stunting.png
        ├─ Export as Image  →  public/peta/peta-sanitasi-penjelas.png
        └─ Export as Image  →  public/peta/peta-kapasitas-layanan.png
                                        │
                                        └─  peta Home + galeri lampiran
```

Konsekuensi yang harus diterima:

- Peta Leaflet **tidak** diklaim sebagai ekspor QGIS. Keduanya artefak berbeda
  dengan break kelas dan ramp yang sama.
- Lampiran QGIS bersifat **statis**; judul, legenda, skala, panah utara, dan
  sumber tercetak di dalam gambar.
- Setiap perubahan angka wajib memperbarui GeoJSON (`npm run prepare-data`)
  **dan** mengekspor ulang lampiran QGIS.
- Konsistensi peta layar ↔ laporan dijaga oleh break/ramp bersama di
  `src/data/classify.js`, bukan oleh satu berkas gambar.

---

## 2. Temuan Analisis yang Wajib Tercermin di UI

Bagian ini adalah **sumber kebenaran angka**. Semua nilai di aplikasi harus berasal dari berkas data, bukan ditulis tangan.

### 2.1 Statistik utama (n = 14)

| Variabel | Min | Maks | Rata-rata | SD |
|---|---|---|---|---|
| `stunting_pct` | 4,14 | 16,69 | 9,00 | 4,03 |
| `sanitasi_layak_pct` | 46,45 | 111,77 | 69,18 | 16,76 |
| `sanitasi_aman_pct` | 0,00 | 39,35 | 9,23 | 12,16 |
| `asi_eksklusif_pct` | 35,32 | 80,59 | 55,62 | 15,05 |
| `catin_anemia_pct` | 1,84 | 11,51 | 7,97 | 2,97 |

### 2.2 Kelas Quantile (menggantikan equal interval)

**Stunting** — 5 kelas, break dari QGIS:

| Kelas | Rentang |
|---|---|
| 1 (terendah) | 4,140 – 5,294 |
| 2 | 5,294 – 7,396 |
| 3 | 7,396 – 9,132 |
| 4 | 9,132 – 12,176 |
| 5 (tertinggi) | 12,176 – 16,690 |

**Sanitasi layak** — 5 kelas:

| Kelas | Rentang |
|---|---|
| 1 | 46,45 – 55,51 |
| 2 | 55,51 – 64,24 |
| 3 | 64,24 – 71,46 |
| 4 | 71,46 – 76,55 |
| 5 | 76,55 – 111,77 |

> Catatan: nilai 111,77% (Warungpring) tetap di kelas 5 dan **wajib** diberi penanda "di luar skala 100%" pada label peta dan caption HTML.

### 2.3 Kuadran prioritas (median split)

Median `stunting_pct` = **8,60**; median `sanitasi_layak_pct` = **71,33**.

| Kuadran | Definisi | Kecamatan (nilai stunting) |
|---|---|---|
| **1 — Prioritas Utama** | stunting tinggi + sanitasi rendah | Pemalang (16,69), Bodeh (9,26), Comal (9,73) |
| **2 — Determinan Lain** | stunting tinggi + sanitasi baik | Bantarbolang (15,59), Belik (13,61), Watukumpul (11,22), Pulosari (8,62) |
| **3 — Waspada** | stunting rendah + sanitasi rendah | Taman (4,94), Petarukan (6,05), Ampelgading (7,10), Ulujami (4,88) |
| **4 — Relatif Aman** | stunting rendah + sanitasi baik | Moga (8,58), Randudongkal (4,14), Warungpring (5,53) |

**Kuadran 2 adalah pesan kunci aplikasi**: sanitasi baik tidak menjamin stunting rendah.

### 2.4 Uji determinan

95 variabel diuji terhadap `stunting_pct` (Pearson + Spearman + Benjamini–Hochberg FDR).

**Hasil: 0 variabel signifikan pada FDR < 0,05.** Nominal p < 0,05 hanya:

| Variabel | r | ρ | p |
|---|---|---|---|
| `kn1_pct` | −0,208 | −0,605 | 0,022 |
| `neonatal_komplikasi_ditangani_pct` | −0,424 | −0,534 | 0,049 |
| `luas_km2` | +0,613 | +0,534 | 0,049 |
| `kk_ctps_pct` | +0,478 | +0,534 | 0,049 |

### 2.5 Regresi satu prediktor

| Prediktor | b | R² | p |
|---|---|---|---|
| `tb_anak_jml` | +0,119 | 0,315 | 0,037 |
| `balita_ds_pct` | −0,145 | 0,290 | 0,047 |
| `kk_ctps_pct` | +0,191 | 0,229 | 0,084 |
| `sanitasi_layak_pct` | −0,054 | 0,050 | 0,443 |
| `sanitasi_aman_pct` | +0,064 | 0,038 | 0,505 |
| `asi_eksklusif_pct` | −0,020 | 0,005 | 0,801 |

### 2.6 Indeks Kapasitas Layanan

Indeks komposit z-score 8 variabel (positif: ASI, K4, imunisasi dasar, sanitasi aman, CTPS; negatif: BABS terbuka, catin anemia, BBLR). Nilai tinggi = kapasitas lebih baik.

- Korelasi dengan stunting: **r = +0,50** (arah berlawanan harapan).
- Interpretasi resmi: **efek deteksi** — kecamatan dengan layanan/pencatatan lebih baik melaporkan stunting lebih lengkap.
- **Indeks ini TIDAK boleh disebut "indeks risiko" atau "indeks protektif".**

### 2.7 Registry anomali data

19 kolom persentase bernilai > 100%. Yang wajib tampil:

| Variabel | Kecamatan | Nilai | Dugaan |
|---|---|---|---|
| `sanitasi_layak_pct` | Warungpring | 111,77% | pembilang ≠ penyebut |
| `total_akses_sanitasi_pct` | Warungpring | 157,14% | basis KK berbeda |
| `kk_sbs_pct` | Warungpring | 156,94% | basis KK berbeda |
| `imd_pct` | Bodeh | 250,20% | definisi indikator |
| `sarana_air_aman_pct` | Pemalang | 137,50% | sarana > jumlah terdaftar |
| `desa_5pilar_stbm_pct` | Ulujami | 111,11% | desa > desa sasaran |
| `sanitasi_aman_pct` | 6 kecamatan | 0,00% | kemungkinan data belum terisi |

---

## 3. Pengguna & Use Case

| Pengguna | Kebutuhan | Use case utama |
|---|---|---|
| Mahasiswa/peneliti SIG | Peta + angka yang bisa dikutip | Melihat sebaran stunting, mengutip statistik, mengunduh CSV |
| Dinas Kesehatan | Prioritas intervensi | Melihat kuadran prioritas dan daftar kecamatan sasaran |
| Dosen/penguji | Ketepatan metodologi | Memeriksa klasifikasi, uji statistik, dan disclaimer |
| Masyarakat umum | Gambaran kondisi | Membaca peta dan narasi sederhana |

**UC-01** Melihat peta utama stunting 5 kelas.
**UC-02** Membandingkan stunting vs sanitasi tanpa menyimpulkan kausalitas.
**UC-03** Menemukan kecamatan prioritas.
**UC-04** Menelusuri variabel determinan dan status signifikansinya.
**UC-05** Mengunduh data untuk analisis lanjutan.

---

## 4. Ruang Lingkup

**Termasuk:**
- Restrukturisasi peta & narasi ke fokus stunting
- **Peta Leaflet interaktif 5 kelas** 
- Klasifikasi Quantile 5 kelas
- Peta kuadran prioritas & kapasitas layanan
- Panel determinan (statis, hasil uji QGIS)
- Registry anomali data
- Pembaruan pipeline data & unduhan

**Tidak termasuk (v2.0):**
- Editor data peta di dalam browser (perubahan data lewat pipeline; layout cetak lewat QGIS)
- Analisis spasial on-the-fly di browser (Moran's I, regresi spasial)
- Dashboard admin / input data
- Data deret waktu (hanya 2024)
- Autentikasi pengguna
- Perubahan unit analisis ke desa

---

## 5. Kebutuhan Fungsional

Prioritas: **M** = Must, **S** = Should, **C** = Could.

> **Keputusan arsitektur (v2.0):** panel **Peta** memakai **peta Leaflet interaktif** yang digambar dari `kecamatan.geojson`. Berkas PNG hasil ekspor QGIS tetap wajib ada sebagai **lampiran cetak** dan gambar peta di Home, tetapi bukan pengganti panel Peta.

### FR-01 — Peta utama stunting interaktif (M)

- Peta utama adalah **peta Leaflet interaktif** (`#kanvas-peta`) yang digambar dari `public/data/kecamatan.geojson`; ukuran dan bingkainya dihitung ulang saat tab Peta dibuka.
- 5 kelas Quantile dengan break persis §2.2 (`BREAK_STUNTING`); legenda 5 kelas dirender di panel, tidak dilipat.
- Peta mendukung pan, zoom, ganti basemap, dan klik kecamatan. Klik satu poligon menyorot baris tabel/grafik dan mengisi kartu "Kecamatan terpilih".
- `aria-label`/`alt` peta menyebut judul, tahun, dan jumlah kelas.

**Acceptance:** `index.html` memuat `#kanvas-peta`, `initPeta()` dipanggil, dan legenda menampilkan 5 kelas; tidak ada klaim bahwa peta Leaflet adalah ekspor QGIS.

### FR-02 — Sanitasi sebagai faktor penjelas (M)

- Sanitasi tampil sebagai **layer kedua pada peta Leaflet yang sama** (bukan peta besar kedua), dengan label "Faktor penjelas: sanitasi layak".
- Nilai > 100% diberi penanda `*`/`⚠` pada tooltip, popup, dan tabel, serta dijelaskan di caption panel.

**Acceptance:** tidak ada teks yang menempatkan sanitasi sejajar stunting (mis. judul "Peta Stunting & Sanitasi"); string "faktor penjelas" muncul minimal sekali di panel peta; hanya ada satu kanvas peta besar.

### FR-03 — Peta kuadran prioritas (M)

- Kuadran tampil di baris tabel yang dibuka dan di **lampiran cetak QGIS** (`peta-prioritas-stunting.png`) dengan 4 kategori warna:
  - Prioritas Utama `#b2182b`
  - Determinan Lain `#f4a582`
  - Waspada `#92c5de`
  - Relatif Aman `#2166ac`
- Legenda lampiran menampilkan definisi median (8,60% dan 71,33%).
- Detail baris menampilkan kuadran + alasan ("stunting 16,69% ≥ median, sanitasi 46,45% < median").

**Acceptance:** jumlah kecamatan per kategori = 3 / 4 / 4 / 3 dan konsisten antara tabel, CSV, serta lampiran.

### FR-04 — Peta Indeks Kapasitas Layanan (S)

- Indeks kapasitas tampil sebagai kolom di tabel dan sebagai lampiran cetak `peta-kapasitas-layanan.png` (5 kelas Quantile, ramp diverging `RdYlGn`, nilai tinggi = kapasitas baik).
- **Wajib** disertai catatan: "Indeks kapasitas layanan, bukan indeks risiko. Berkorelasi positif dengan stunting (r = +0,50), diduga karena efek deteksi."
- Dilarang memberi label "protektif"/"risiko rendah", baik di gambar maupun di caption HTML.

### FR-05 — Panel determinan (M)

Lokasi: tab **Info**, sub-bagian baru "Uji Determinan".

- Tabel 95 baris: `variabel`, `kelompok`, `r`, `ρ`, `p`, `FDR`, `arah`, `bisa_diintervensi`.
- Default urut `p` menaik.
- Kolom FDR dengan badge "tidak signifikan" untuk seluruh baris (0/95).
- Filter: kelompok (Sanitasi, Gizi bayi, Imunisasi, dst.) dan toggle "hanya actionable".
- Pencarian nama variabel.
- Di atas tabel: kalimat tetap — *"Dengan 14 kecamatan dan 95 uji, tidak ada variabel yang signifikan setelah koreksi FDR. Hasil ini eksploratif."*

**Acceptance:** tabel dapat difilter ke kelompok "Sanitasi" dan menampilkan ≤ 14 baris; badge FDR muncul di setiap baris.

### FR-06 — Ringkasan regresi (S)

- Kartu berisi 6 model (prediktor, b, R², p) dari §2.5.
- Penanda visual untuk p < 0,05 **dan** catatan bahwa hasil tidak lolos FDR.

### FR-07 — Registry anomali data (S)

- Tabel anomali dari §2.7, dikelompokkan per variabel.
- Kolom: variabel, kecamatan, nilai, dugaan penyebab, status ("belum dikoreksi").
- Penjelasan bahwa data **tidak diubah** agar sesuai sumber.

### FR-08 — Informasi kontekstual per kecamatan (M)

Nilai per kecamatan tampil di **popup/tooltip peta Leaflet** dan di **tabel/grafik** dashboard. Popup peta menampilkan minimal:

```
Nama kecamatan
Stunting        : 16,69%  (kelas 5/5)
Sanitasi layak  : 46,45%  (kelas 2/5)
Kuadran         : Prioritas Utama
Kapasitas       : +0,33
```

Dengan penanda `⚠` untuk nilai > 100%.

**Acceptance:** klik poligon memunculkan keempat baris di atas; tabel dashboard menampilkan empat baris informasi yang sama untuk 14 kecamatan.

### FR-09 — Tabel, grafik, unduhan (M)

- Grafik batang peringkat: **stunting** sebagai seri utama; sanitasi hanya garis referensi/pembanding, bukan seri setara.
- Scatter: sumbu Y = stunting, sumbu X = sanitasi layak; tampilkan garis tren + `r`, `p`, `n`, dan label "lemah / tidak signifikan".
- Unduhan CSV diperluas dengan kolom `kuadran` dan `idx_layanan`.
- Unduhan tetap menyertakan metadata sumber.

### FR-10 — Narasi & disclaimer (M)

Tiga kalimat wajib muncul (bisa di hero, Info, dan footer peta):

1. "Stunting adalah fokus studi; sanitasi adalah salah satu faktor penjelas."
2. "Analisis bersifat eksploratif: n = 14 kecamatan, tidak ada variabel signifikan setelah koreksi FDR."
3. "Data mengikuti sumber Profil Kesehatan 2024; nilai > 100% tidak dikoreksi."

---

## 6. Kontrak Data

### 6.1 `public/data/kecamatan.geojson`

Tetap ringkas (target < 420 KB). **Catatan v2.0:** GeoJSON adalah sumber untuk grafik, tabel, unduhan, dan **peta Leaflet interaktif**. Lampiran cetak tetap dibaca dari PNG ekspor QGIS (§6.4). Field:

| Field | Tipe | Sumber |
|---|---|---|
| `kecamatan` | string | SHP `WADMKC` |
| `stunting_pct` | number | `stunting_pct` |
| `stunting_jml` | number | `stunting_jml` |
| `balita_ukur` | number | `tb_diukur` |
| `sanitasi_pct` | number | `sanitasi_layak_pct` |
| `sanitasi_jml` | number | `sanitasi_layak_jml` |
| `sanitasi_aman_pct` | number | **baru** |
| `jumlah_kk` | number | `jumlah_kk` |
| `jml_desa` | number | `desa_jml` |
| `asi_eksklusif_pct` | number | **baru** |
| `catin_anemia_pct` | number | **baru** |
| `balita_ds_pct` | number | **baru** |
| `kuadran` | string | **baru** (turunan) |
| `idx_layanan` | number | **baru** (turunan) |

> **Aturan:** jangan memuat 95 kolom ke GeoJSON. Itu akan membengkakkan payload 5–10×.

### 6.2 `public/data/determinan.json` (baru, lazy load)

```json
{
  "meta": {
    "outcome": "stunting_pct",
    "n": 14,
    "n_uji": 95,
    "metode": "Pearson + Spearman + Benjamini-Hochberg",
    "signif_fdr": 0,
    "sumber": "Profil Kesehatan Kabupaten Pemalang 2024"
  },
  "variabel": [
    {
      "nama": "kn1_pct",
      "kelompok": "Neonatal",
      "r": -0.208,
      "rho": -0.605,
      "p": 0.0218,
      "fdr": 0.727,
      "arah": "berlawanan",
      "actionable": true
    }
  ]
}
```

### 6.3 Konstanta klasifikasi

Semua break kelas, median kuadran, dan bobot indeks **wajib** berada di satu modul (`src/data/classify.js`) agar peta, legenda, tabel, dan unduhan tidak pernah berbeda.

```js
export const BREAK_STUNTING = [5.294, 7.396, 9.132, 12.176];
export const BREAK_SANITASI = [55.506, 64.240, 71.460, 76.550];
export const MEDIAN_STUNTING = 8.60;
export const MEDIAN_SANITASI = 71.33;
```

### 6.4 `public/peta/` — berkas ekspor QGIS (baru, lampiran cetak & peta Home)

Empat gambar yang **wajib** ada, semuanya hasil `Layout → Export as Image` dari QGIS 3.44.16. Gambar-gambar ini **bukan** panel Peta utama (panel Peta memakai Leaflet, §8.2), melainkan lampiran cetak dan gambar peta di Home:

| Berkas | Layout QGIS | Fungsi | Ukuran target |
|---|---|---|---|
| `peta-stunting-utama.png` | `Peta Utama Stunting 2024` | Peta Home + lampiran utama | ≤ 1,2 MB |
| `peta-prioritas-stunting.png` | `Peta Prioritas Stunting 2024` | Kuadran prioritas 2×2 | ≤ 0,9 MB |
| `peta-sanitasi-penjelas.png` | `Cakupan Sanitasi Layak 2024` | Faktor penjelas | ≤ 0,9 MB |
| `peta-kapasitas-layanan.png` | *layout baru* | Indeks kapasitas layanan | ≤ 0,9 MB |

Aturan berkas:

- Format **PNG**, 200–300 dpi, rasio A4 landscape (297 × 210 mm).
- Sediakan versi turunan `*-1200.webp` untuk `srcset`; PNG asli tetap disimpan sebagai berkas sumber.
- Nama berkas **tidak boleh mengandung spasi** dan bersifat tetap (dipakai sebagai path di `index.html`).
- Setiap gambar wajib punya `alt` dan `caption` di HTML yang menyebut: judul peta, tahun, sumber data, dan "diekspor dari QGIS".
- Metadata ekspor dicatat di `public/peta/README.md`: tanggal ekspor, versi QGIS, nama layout, dan SHA-256 berkas.

```html
<figure>
  <img src="/peta/peta-stunting-utama.png"
       srcset="/peta/peta-stunting-utama-1200.webp 1200w, /peta/peta-stunting-utama.png 3507w"
       sizes="(max-width: 768px) 100vw, 70vw"
       alt="Peta prevalensi stunting Kabupaten Pemalang 2024, lima kelas kuantil"
       loading="lazy" width="3507" height="2480">
  <figcaption>Peta prevalensi stunting 2024. Diekspor dari QGIS 3.44.16; sumber: Profil Kesehatan Kabupaten Pemalang 2024.</figcaption>
</figure>
```


---

## 7. Perubahan Teknis per Modul

| Berkas | Perubahan | Risiko |
|---|---|---|
| `src/data/classify.js` | Ganti 3 kelas → 5 Quantile; tambah `kuadran()`; hapus `prioritas()` lama | **Tinggi** — dipakai legenda tabel & unduhan |
| `index.html` | **Panel Peta: Leaflet 5 kelas** (kanvas, legenda, layer, kartu terpilih); sematkan 4 lampiran QGIS (`<details>` + gambar Home); panel Info: determinan, regresi, anomali | **Tinggi** — peta utama tetap kanvas, galeri lampiran ditambah |
| `public/peta/*.png` + `public/peta/README.md` | **Baru**; artefak ekspor QGIS + metadata ekspor (§6.4) | Sedang — harus diekspor ulang tiap data berubah |
| `src/map/layers.js` | Peta Leaflet: `PANEL` 4 entri; sanitasi "faktor penjelas"; `idx_layanan` | Rendah — jalur peta utama |
| `src/map/legend.js` | Legenda 5 kelas + catatan kuadran untuk peta Leaflet | Rendah |
| `src/map/choropleth.js` | Warna per kelas baru; popup 4 baris | Rendah |
| `src/ui/kpi.js` | KPI: 3 prioritas utama, 4 determinan lain, r + p | Sedang |
| `src/data/stats.js` | Tambah `pValue()` dan `kuadranRingkas()` | Sedang |
| `src/charts/scatter.js` | Tampilkan p & n; label "tidak signifikan" | Rendah |
| `src/charts/bar.js` | Stunting utama; sanitasi jadi referensi | Rendah |
| `src/ui/table.js` | Kolom kuadran & kapasitas | Rendah |
| `src/ui/galeri.js` | Tidak berubah | — |
| `src/ui/export.js` | CSV kolom baru + metadata | Rendah |
| `src/main.js` | Muat `determinan.json` lazy saat tab Info dibuka; peta Leaflet diinisialisasi sekali, ukuran/fit dihitung saat tab Peta dibuka | Rendah |
| `scripts/prepare-data.mjs` | Field baru + tulis `determinan.json` | **Tinggi** — sumber data |
| `src/data/load.js` | `muatDeterminan()` terpisah dari `muatData()` | Rendah |

**Aturan migrasi:** `prepare-data.mjs` harus tetap **tanpa dependensi GDAL/QGIS**. Nilai `kuadran` dan `idx_layanan` dihitung dari CSV atribut, bukan dari GPKG, agar pipeline tetap portabel.

**Aturan peta:** panel Peta memakai Leaflet dan digambar dari GeoJSON. Gambar di `public/peta/` **tidak dihasilkan** oleh `prepare-data.mjs` (butuh QGIS) dan hanya dipakai sebagai lampiran cetak/Home. Pipeline data dan pipeline lampiran dipisah: perintah pertama menghasilkan CSV/JSON, ekspor gambar dilakukan manual di QGIS, lalu kedua hasil diverifikasi cocok (break kelas, jumlah kecamatan, nilai ekstrem, tanggal ekspor).

---

## 8. UI/UX

### 8.1 Struktur tab

| Tab | Isi v2 |
|---|---|
| **Home** | Hero stunting, 4 KPI, `peta-stunting-utama.png` dari QGIS, grafik peringkat, scatter, tabel |
| **Peta** | Peta Leaflet interaktif (stunting/sanitasi), legenda 5 kelas, kartu kecamatan terpilih; galeri 4 lampiran QGIS di `<details>` |
| **Info** | Metodologi, uji determinan, regresi, anomali data, sumber |

### 8.2 Peta

- **Jalur utama (wajib):** peta Leaflet interaktif (`#kanvas-peta`) yang digambar dari GeoJSON. Peta mengisi kolom kanan; sidebar memuat layer stunting/sanitasi, basemap, reset tampilan, legenda 5 kelas, dan kartu kecamatan terpilih.
- Desktop: peta ≥ 65% lebar konten; legenda di samping peta, tidak dilipat.
- Mobile: peta lebar 100% dengan tinggi minimum 420 px; sidebar menumpuk di atas peta.
- Indikator layer aktif selalu terlihat ("Stunting" atau "Faktor penjelas: sanitasi layak") dan diumumkan lewat `aria-live`.
- Klik poligon menyorot baris tabel/grafik dan mengisi kartu terpilih; tidak ada tooltip yang memuat angka > 100% tanpa penanda.
- **Jalur sekunder (lampiran):** empat gambar ekspor QGIS ditampilkan lewat `<details>` di bawah peta Leaflet, dengan `srcset`, caption, sumber, dan tautan unduh PNG. Lampiran ini untuk kebutuhan cetak, bukan pengganti peta interaktif.

### 8.3 Wording (wajib)

| Jangan | Gunakan |
|---|---|
| "Peta Stunting & Sanitasi" | "Peta Prevalensi Stunting" |
| "Korelasi sanitasi–stunting" | "Hubungan sanitasi layak dengan stunting (lemah, tidak signifikan)" |
| "Indeks risiko" | "Indeks Kapasitas Layanan" |
| "Prioritas" (tanpa konteks) | "Prioritas Utama (kuadran 1)" |

### 8.4 Aksesibilitas

- Setiap peta punya alternatif tabel (sudah ada pola `data-tabel-toggle`), sehingga nilai per kecamatan tetap terbaca tanpa hover atau klik.
- Warna tidak boleh satu-satunya pembeda: sediakan label teks pada legenda peta dan di tabel.
- Kontras teks ≥ 4,5:1; fokus keyboard terlihat pada tab, filter, layer peta, dan tombol pemilih peta.
- Setiap `<img>` lampiran peta memiliki `alt` deskriptif (nama peta, tahun, kelas, sumber); kanvas Leaflet punya `aria-label`.
- `aria-live` untuk perubahan jumlah hasil filter dan untuk perubahan layer peta aktif.

---

## 9. Kebutuhan Non-Fungsional

| Aspek | Target |
|---|---|
| Payload awal | ≤ 450 KB (GeoJSON terkompresi ≤ 60 KB brotli) — tidak termasuk gambar peta |
| Gambar peta | PNG asli ≤ 1,2 MB; varian `-1200.webp` ≤ 250 KB; `loading="lazy"` untuk semua lampiran |
| Total gambar peta | ≤ 3,5 MB untuk 4 PNG + 4 varian WebP |
| `determinan.json` | ≤ 25 KB, dimuat hanya saat tab Info dibuka |
| LCP (4G) | ≤ 2,5 s (gambar Home diberi `fetchpriority="high"` dan dimensi eksplisit; peta Leaflet dihitung ulang saat tab Peta dibuka) |
| Interaksi peta | ≤ 100 ms per klik/hover |
| Browser | Chrome/Edge/Firefox/Safari 2 versi terakhir |
| Tema | Terang & gelap berfungsi penuh |
| Offline | Tidak diperlukan |
| Bahasa | Indonesia, istilah teknis diberi penjelasan singkat |

---

## 10. Kriteria Penerimaan Global

Rilis v2.0 dinyatakan diterima bila **semua** terpenuhi:



- [ ] Panel Peta memakai kanvas **Leaflet interaktif** (`#kanvas-peta`); peta Home tetap `<img>` yang menunjuk berkas ekspor QGIS di `public/peta/`.
- [ ] Empat berkas ekspor tersedia: `peta-stunting-utama.png`, `peta-prioritas-stunting.png`, `peta-sanitasi-penjelas.png`, `peta-kapasitas-layanan.png`, masing-masing dengan caption + `alt` sebagai lampiran.
- [ ] `public/peta/README.md` mencatat tanggal ekspor, versi QGIS, nama layout, dan SHA-256 tiap berkas.
- [ ] Peta stunting memakai 5 kelas Quantile dengan break persis §2.2 (dihitung dari `BREAK_STUNTING`, sama dengan lampiran QGIS).
- [ ] Tidak ada UI yang menempatkan sanitasi sejajar stunting sebagai peta utama.
- [ ] Kuadran prioritas tersedia dan jumlah per kategori 3/4/4/3 (cocok antara tabel, CSV, dan lampiran).
- [ ] Panel determinan memuat 95 variabel dengan kolom r, ρ, p, FDR.
- [ ] Kalimat "0 dari 95 signifikan setelah koreksi FDR" tampil di panel determinan.
- [ ] Indeks kapasitas diberi label dan catatan efek deteksi.
- [ ] Registry anomali menampilkan minimal 6 kasus > 100% dan 1 kasus 0% sistematis.
- [ ] Label/tabel menampilkan kelas, kuadran, dan penanda > 100% untuk setiap kecamatan.
- [ ] CSV unduhan memuat `kuadran` dan `idx_layanan`.
- [ ] `npm run build` lolos tanpa error; `npm run prepare-data` menghasilkan GeoJSON < 420 KB.
- [ ] Uji keyboard: seluruh kontrol tab/peta dapat dicapai tanpa mouse.
- [ ] Tidak ada angka statistik yang ditulis tangan di HTML.

---

## 11. Roadmap

| Fase | Lingkup | Estimasi | Output |
|---|---|---|---|
| **R0** | Bekukan kontrak data (`classify.js`, skema §6.1–§6.4) | 0,5 hari | Konstanta + tipe data + daftar nama berkas peta |
| **R1** | Pipeline data: field baru + `determinan.json` | 1 hari | GeoJSON & JSON baru |
| **R1b** | **Ekspor QGIS**: 4 layout → `public/peta/*.png`, buat varian WebP, tulis `public/peta/README.md` | 0,5 hari | 4 PNG + 4 WebP + metadata |
| **R2** | **Panel Peta Leaflet 5 kelas** + galeri lampiran QGIS: legenda, layer, popup 4 baris, `<details>` caption/unduh | 1 hari | Tab Peta v2 interaktif |
| **R3** | Panel Info: determinan, regresi, anomali | 1,5 hari | Tab Info v2 |
| **R4** | KPI, grafik, tabel, unduhan, a11y | 1 hari | Dashboard v2 |
| **R5** | Uji, build, deploy | 0,5 hari | Rilis |

Total ± 6 hari kerja.

> **Catatan:** R1b **tidak bisa diotomatiskan** lewat `npm` — ekspor dilakukan manual di QGIS. Bila angka sumber berubah, R1 dan R1b harus dijalankan ulang bersamaan, dan hash berkas di `public/peta/README.md` diperbarui.

---

## 12. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Pengguna membaca r = +0,50 indeks sebagai "layanan menyebabkan stunting" | Salah tafsir fatal | Label + catatan efek deteksi di layer dan Info |
| 5 kelas Quantile dianggap "mengarang batas" | Kritik metodologi | Cantumkan metode + break persis; jelaskan Quantile menyamakan jumlah anggota kelas |
| Warungpring 111,77% merusak skala warna | Peta menyesatkan | Kelas dihitung dari break tetap, bukan min–max; penanda > 100% |
| Payload membengkak karena 95 kolom | Lambat di mobile | Determinan dipisah ke JSON lazy |
| `prepare-data.mjs` berubah dan merusak build | Data tidak tampil | Uji dengan 14 baris + cek jumlah & hash field |
| Hasil FDR 0 signifikan dianggap "penelitian gagal" | Narasi lemah | Framing eksploratif + rekomendasi desa-level untuk inferensia |
| **Gambar QGIS tidak sinkron dengan CSV/JSON** (data diperbarui, lampiran tidak diekspor ulang) | Peta Home/lampiran menampilkan angka salah | Checklist rilis: cocokkan tanggal ekspor di `public/peta/README.md` dengan mtime `kecamatan.geojson`; hash berkas dicatat; jadikan item wajib di §10 |
| PNG 300 dpi terlalu berat untuk mobile | LCP lambat | Wajib varian `-1200.webp`, `loading="lazy"`, `width`/`height` eksplisit |
| Peta Leaflet dianggap tidak konsisten dengan laporan QGIS | Kritik metodologi | Break kelas dan ramp berasal dari `src/data/classify.js` yang sama; lampiran QGIS disediakan untuk verifikasi |

---

## 13. Traceability: Artefak Analisis → Elemen UI

| Artefak analisis | Elemen web |
|---|---|
| `layout_utama_stunting_2024.png` | **`public/peta/peta-stunting-utama.png`** → peta Home + lampiran (FR-01) |
| `layout_prioritas_stunting_2024.png` | **`public/peta/peta-prioritas-stunting.png`** → lampiran kuadran (FR-03) |
| `layout_sanitasi_2024.png` | **`public/peta/peta-sanitasi-penjelas.png`** → lampiran faktor penjelas (FR-02) |
| Layer "Indeks Kapasitas Layanan 2024" | **`public/peta/peta-kapasitas-layanan.png`** (layout baru, FR-04) |
| `public/peta/README.md` | Metadata ekspor: tanggal, versi QGIS, layout, SHA-256 (§6.4) |
| `kecamatan.geojson` | Panel Peta Leaflet 5 kelas (FR-01/FR-02/FR-08) |
| `determinan_stunting_2024.csv` | `determinan.json` → FR-05 |
| `kuadran_prioritas_stunting.csv` | `kuadran` di GeoJSON + tabel → FR-03 |
| `ringkasan_statistik.csv` | KPI & tabel ringkasan → FR-09 |
| `idx_determinan` (GPKG) | `idx_layanan` → FR-04 |
| Temuan FDR 0/95 | Disclaimer FR-10 |

---

## 14. Definition of Done

1. Semua item §10 tercentang.
2. Empat berkas peta hasil ekspor QGIS ada di `public/peta/`, beserta `README.md` berisi tanggal ekspor + SHA-256, dan dirujuk dari `index.html` sebagai lampiran/Home; panel Peta memakai Leaflet.
3. `README.md` proyek diperbarui: menjelaskan stunting sebagai fokus, sanitasi sebagai faktor penjelas, panel Peta memakai Leaflet interaktif, dan lampiran cetak berasal dari ekspor QGIS.
4. Tidak ada regresi fungsional pada fitur v1 yang dipertahankan (tema gelap, filter, unduhan, galeri).
5. Screenshot desktop + mobile dilampirkan pada laporan.
6. Dokumen ini dan `../PRD.md` (v1) dirujuk silang agar pembaca tahu versi mana yang berlaku.

---

## Lampiran A — Glosarium

| Istilah | Arti |
|---|---|
| **Stunting** | Balita dengan TB/U < −2 SD |
| **Quantile** | Klasifikasi yang membagi data menjadi kelas beranggota sama banyak |
| **FDR** | False Discovery Rate, koreksi Benjamini–Hochberg untuk uji berganda |
| **Kuadran prioritas** | Pembagian 2×2 berdasarkan median stunting dan median sanitasi |
| **Efek deteksi** | Kecamatan dengan pencatatan baik tampak "lebih buruk" karena kasus terlaporkan lengkap |
| **n = 14** | Jumlah kecamatan; batas atas kekuatan uji statistik |

## Lampiran B — Kelompok Variabel Determinan

| Kelompok | Contoh |
|---|---|
| Gizi bayi | `asi_eksklusif_pct`, `imd_pct`, `vit_a_balita_pct` |
| Bayi baru lahir | `bblr_pct`, `prematur_pct` |
| Neonatal | `kn1_pct`, `kn_lengkap_pct`, `neonatal_komplikasi_ditangani_pct` |
| Posyandu | `balita_dipantau_pct`, `balita_sdidtk_pct` |
| Penyakit infeksi | `diare_balita_pct`, `pneumonia_balita_jml`, `tb_anak_jml` |
| Imunisasi | `imunisasi_idl_pct`, `dpt3_pct`, `campak_pct`, `desa_uci_pct` |
| Kesehatan ibu | `k1_pct`, `k4_pct`, `persalinan_fasyankes_pct`, `bumil_ttd_pct` |
| KB/PUS | `pus_4t_pct`, `pus_alki_pct` |
| Catin | `catin_layanan_kes_pct`, `catin_anemia_pct`, `catin_gizi_kurang_pct` |
| Sanitasi | `sanitasi_layak_pct`, `sanitasi_aman_pct`, `kk_ctps_pct`, `desa_5pilar_stbm_pct` |
| Air minum | `sarana_air_aman_pct` |
| Konteks | `luas_km2`, `kepadatan_penduduk`, `penduduk_jml` |

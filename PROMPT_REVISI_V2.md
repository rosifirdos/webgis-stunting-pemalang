# PROMPT — Implementasi Revisi Web GIS v2.0

> Salin seluruh isi dokumen ini (mulai dari bagian "PERAN" sampai "FORMAT LAPORAN AKHIR")
> sebagai satu instruksi ke coding agent (Claude Code / Codex / Cursor / OpenCode).
> Dokumen ini menggantikan pembacaan bebas PRD: semua keputusan sudah dikunci di sini.

---

## PERAN

Kamu adalah implementator front-end + data pipeline untuk proyek Web GIS statis.
Tugasmu: **menerapkan revisi v2.0 PRD ke dalam aplikasi yang benar-benar berjalan**,
bukan menulis dokumen baru. Setiap perubahan harus mendarat di berkas nyata di
dalam folder `webgis-stunting-pemalang/` dan lolos `npm run build`.

Sumber kebenaran: `webgis-stunting-pemalang/PRD.md` (v2.0).
Dokumen ini adalah turunan operasionalnya — bila ada pertentangan, **PRD menang**,
kecuali untuk konflik yang sudah diselesaikan di bagian "KONFLIK PRD YANG SUDAH DIPUTUSKAN".

---

## 1. KONTEKS YANG SUDAH TERVERIFIKASI (jangan diulang investigasinya)

| Hal | Fakta |
|---|---|
| Stack | Vite 6, Tailwind CSS 4 (`@tailwindcss/vite`), Leaflet 1.9, Chart.js 4 |
| Bahasa UI | Indonesia |
| Backend | Tidak ada. Sepenuhnya statis, deploy ke Vercel/Netlify/GitHub Pages |
| Entry | `index.html` + `src/main.js` |
| Data | `public/data/kecamatan.geojson` (± 398 KB), `public/data/kecamatan.csv` |
| Pipeline | `scripts/prepare-data.mjs`, dijalankan `npm run prepare-data` |
| Tema | Terang/gelap via `src/tokens.js` + atribut `data-tema` |
| Tab | `panel-home`, `panel-peta`, `panel-info` (router di `src/ui/tabs.js`) |
| Peta lama | Leaflet: `src/map/init.js`, `choropleth.js`, `layers.js`, `legend.js`, `interactions.js` |
| Grafik | `src/charts/bar.js` (Chart.js bar), `scatter.js` (Chart.js scatter) |
| State | `src/state/store.js` — kunci: `layer`, `terpilih`, `kelas`, `cari`, `urut`, `arah` |

### 1.1 Fakta kritis sumber data (WAJIB dibaca sebelum menyentuh pipeline)

- `Kecamatan_Pemalang_Stunting_Sanitasi_2024.dbf` punya **27 field**, bukan 100.
- `scripts/prepare-data.mjs` saat ini memetakan **11 field** (`FIELDS`, baris 216–228) dan
  **tidak membaca CSV atribut sama sekali**.
- `Profil_Kesehatan_Pemalang_2024_per_Kecamatan.csv` punya **100 kolom** dan berisi
  field yang dibutuhkan kontrak v2 tetapi **tidak ada di DBF**:
  - `asi_eksklusif_pct` — tidak ada di DBF
  - `balita_ds_pct` — tidak ada di DBF
  - `catin_anemia_pct` — DBF hanya punya `catin_anm` berupa **jumlah orang**, bukan persen
  - `sanitasi_aman_pct` — ada di DBF sebagai `pct_sn_amn` (persen, valid)
- Artinya: **join CSV wajib ditambahkan**, kalau tidak, kontrak §6.1 tidak bisa dipenuhi.

---

## 2. ATURAN KERJA (batas yang tidak boleh dilanggar)

1. **Semua berkas yang diubah/dibuat harus berada di dalam `webgis-stunting-pemalang/`.**
   Satu-satunya pengecualian: membaca `../output/` dan `../Profil_Kesehatan_Pemalang_2024_per_Kecamatan.csv`
   untuk disalin. **Jangan menulis atau menghapus apa pun di `../output/`, `../*.shp`, `../*.dbf`, atau `../PRD.md`.**
2. **Jangan mengarang angka.** Semua nilai statistik dihitung dari data atau dibaca
   dari `public/data/determinan.json`. Dilarang menulis angka statistik di `index.html`.
3. **Jangan menambah dependency runtime** (selain yang sudah ada). Dependency
   build-time (`sharp`) hanya boleh untuk konversi gambar dan harus di `devDependencies`.
4. **Jangan menghapus fitur v1 yang masih valid**: tema gelap, filter, pencarian,
   pengurutan tabel, unduhan, galeri foto, scroll animation.
5. **Jangan menyatakan "sudah diverifikasi secara visual"** bila kamu tidak dapat
   melihat gambar. Laporkan sebagai "belum diperiksa visual" dan sebutkan apa yang
   perlu dicek manusia.
6. **Jangan menghentikan pekerjaan di tengah fase tanpa laporan.** Bila satu item
   mustahil (mis. QGIS tidak tersedia), selesaikan semua item lain, lalu laporkan
   item tersebut sebagai `TERBLOKIR` dengan sebab dan rekomendasi.
7. **Bahasa**: kode/komentar mengikuti gaya berkas sekitarnya (Indonesia, komentar
   menjelaskan *mengapa*). Pesan commit tidak diperlukan.

---

## 3. KONFLIK PRD YANG SUDAH DIPUTUSKAN

PRD v2.0 masih memuat dua kalimat yang bertentangan dengan keputusan "peta = gambar
statis". Selesaikan seperti ini, jangan bertanya ulang:

| Konflik | Penyelesaian wajib |
|---|---|
| FR-03: "Klik poligon menampilkan kuadran + alasan" | Peta kuadran statis tidak punya poligon interaktif. Implementasikan pada **baris tabel** (expand/klik → tampilkan alasan) dan pada **peta jelajah opsional**. Jangan memaksa peta gambar menjadi interaktif. |
| FR-08: "popup menampilkan 4 baris" | Popup hanya ada pada peta jelajah opsional. Jalur wajib: label tercetak di gambar + kolom di tabel. |
| §6.4 menyebut `*-1200.webp` | Bila `sharp` gagal dipasang, gunakan varian **PNG 1200 px** (`*-1200.png`) dan catat penyimpangan di `public/peta/README.md`. Jangan memakai WebP palsu/rename. |

---

## 4. URUTAN PENGERJAAN

Kerjakan berurutan. Setiap fase punya **gerbang verifikasi**; jangan lanjut bila gagal.

> Perintah shell ditulis untuk **bash**. Di PowerShell (Windows): `cp` → `Copy-Item`,
> `mkdir -p` → `New-Item -ItemType Directory -Force`, `grep -c "x" f` →
> `(Select-String -Path f -Pattern "x").Count`, `head -1 f` → `Get-Content f -TotalCount 1`,
> `sha256sum` → `Get-FileHash -Algorithm SHA256`.

### FASE 0 — Inventaris & pengamanan (≤ 15 menit)

1. Jalankan dan catat hasilnya:
   ```bash
   cd webgis-stunting-pemalang
   node -v && npm -v
   npm run build        # baseline: harus lolos SEBELUM perubahan
   ```
2. Simpan baseline: `git status` (bila repo git) atau salin `index.html` + `src/` ke
   `../.backup-v1/` **di luar** folder aplikasi (jangan commit).
3. Catat 3 berkas yang paling berisiko: `index.html`, `src/main.js`, `src/data/classify.js`.

**Gerbang:** baseline build lolos. Bila tidak lolos, HENTIKAN dan laporkan error-nya.

---

### FASE R0 — Bekukan kontrak data

**Berkas:** `src/data/classify.js`, `src/data/stats.js`, `src/data/load.js`

#### R0.1 `src/data/classify.js` — ganti total isi

Hapus `AMBANG_STUNTING`, `KELAS`, `prioritas()`. Pertahankan nama ekspor yang masih
dipakai (`kelasStunting`, `indeksKelas`, `kelasSanitasi`, `indeksKelasSanitasi`,
`KELAS_SANITASI`) agar impor lama tidak pecah, tetapi isinya 5 kelas.

```js
// Konstanta ini HARUS identik dengan PRD §2.2 dan §2.3.
export const BREAK_STUNTING = [5.294, 7.396, 9.132, 12.176];
export const BREAK_SANITASI = [55.506, 64.240, 71.460, 76.550];
export const MEDIAN_STUNTING = 8.60;
export const MEDIAN_SANITASI = 71.33;
```

Fungsi yang wajib ada:

| Fungsi | Perilaku |
|---|---|
| `kelasStunting(pct)` | 1..5 berdasarkan `BREAK_STUNTING` (nilai < break[0] → 1) |
| `indeksKelas(nama)` | kompatibilitas lama: "Rendah"→0, "Sedang"→1, "Tinggi"→2 — **tetap ada**, jangan dipakai untuk warna baru |
| `kelasSanitasi(pct)` | 1..5 berdasarkan `BREAK_SANITASI`; nilai > 100 tetap masuk kelas 5 |
| `indeksKelasSanitasi(pct)` | 0..4 |
| `KELAS_STUNTING` | array 5 objek `{ tingkat, label, min, max, keterangan }` untuk legenda |
| `KELAS_SANITASI` | array 5 objek, sama bentuknya, plus `diLuarSkala: true` pada kelas 5 |
| `kuadran(row)` | `"1 Prioritas Utama" \| "2 Determinan Lain" \| "3 Waspada" \| "4 Relatif Aman"` |
| `alasanKuadran(row)` | string, mis. `"stunting 16,69% ≥ median 8,60%; sanitasi 46,45% < median 71,33%"` |

Aturan `kuadran`: bandingkan `stunting_pct >= MEDIAN_STUNTING` dan
`sanitasi_pct >= MEDIAN_SANITASI` (pakai `sanitasi_pct`, bukan `sanitasi_aman_pct`).

> **Tipe `kelas` adalah angka 1..5**, bukan string. Konsekuensinya wajib ditangani
> sesuai R0.4 sebelum build dianggap lolos.

> Catatan: label kelas harus tetap **teks** ("Kelas 1 — sangat rendah" dst.) agar warna
> bukan satu-satunya pembeda (aksesibilitas §8.4).

#### R0.2 `src/data/stats.js`

- `siapkanBaris()`: set `kelas` (angka 1–5), `kelasSanitasi` (1–5), `kuadran`, `alasanKuadran`,
  `idx_layanan` (dari properti GeoJSON, fallback 0).
- Tambah `pValue(r, n)` — uji-t dua sisi untuk Pearson:
  `t = r * sqrt((n-2)/(1-r²))`, lalu aproksimasi p dengan distribusi t.
  Implementasi tanpa dependency: gunakan aproksimasi normal bila `n > 30`, dan untuk
  n = 14 gunakan tabel/approx sederhana; **cukup akurat 3 desimal** dan **jangan**
  dipakai untuk klaim signifikansi — hanya tampilan.
- Tambah `kuadranRingkas(rows)` → `{ "1 Prioritas Utama": n, ... }`.
- Pertahankan `ringkas()`, `pearson()`, `tafsirKorelasi()`, `angka()`, `persen()`.

#### R0.3 `src/data/load.js`

- Tetap memuat GeoJSON.
- Tambah `muatDeterminan()` terpisah, dengan cache sendiri, memanggil
  `${import.meta.env.BASE_URL}data/determinan.json`. **Jangan** dipanggil saat boot,
  hanya saat tab Info dibuka.

#### R0.4 Dampak perubahan tipe `kelas` (WAJIB, ini breaking change)

`row.kelas` berubah dari **string** (`"Rendah"|"Sedang"|"Tinggi"`) menjadi **angka 1..5**.
Semua pembanding string lama akan diam-diam gagal (tidak error, tetapi warna/filter
salah). Perbaiki tepat di titik-titik ini:

| Berkas | Baris | Masalah | Perbaikan |
|---|---|---|---|
| `src/ui/table.js` | 22, 46–58 | `r.kelas === "Tinggi"` untuk warna & teks | render `r.kelas` (angka) + label dari `KELAS_STUNTING[r.kelas-1].label` |
| `src/charts/bar.js` | 35, 118, 145, 156 | `row.kelas === "Tinggi" ? 3 : ...` | pakai `row.kelas` langsung sebagai indeks warna (1..5) |
| `src/charts/scatter.js` | 219 | `Kelas ${r.kelas} …` | tetap aman (number → string), tetapi ganti ke label |
| `src/map/choropleth.js` | 83 | popup `barisDl("Kelas", p.kelas)` | tampilkan `Kelas x/5 — label` |
| `src/map/interactions.js` | 103 | `isi("terpilih-kelas", row.kelas)` | idem |
| `src/map/layers.js` | 49–57 | ambang 2 kelas | ganti memakai `BREAK_STUNTING`/`BREAK_SANITASI` |
| `src/state/store.js` | 42 | `r.kelas === state.kelas` | `Number(r.kelas) === Number(state.kelas)` |
| `index.html` | 202–208 | 3 `<option>` teks | 5 `<option value="1..5">` berlabel dari daftar kelas |

Catat di laporan bahwa perubahan ini menyentuh 8 berkas — bukan hanya `classify.js`.

**Gerbang R0:**
```bash
node -e "import('./src/data/classify.js').then(m=>{const a=m.kelasStunting(4.14),b=m.kelasStunting(16.69);if(a!==1||b!==5)throw new Error('kelas salah');console.log('OK',a,b)})"
```
(Jika Node menolak ESM tanpa `"type":"module"`, gunakan `npm run build` + inspeksi bundle.)

---

### FASE R1 — Pipeline data

**Berkas:** `scripts/prepare-data.mjs`, berkas baru `scripts/prepare-determinan.mjs`,
berkas baru `scripts/sumber/profil-kesehatan-2024.csv`

#### R1.1 Salin sumber atribut ke dalam repo

```bash
mkdir -p scripts/sumber
cp "../Profil_Kesehatan_Pemalang_2024_per_Kecamatan.csv" scripts/sumber/profil-kesehatan-2024.csv
```
Alasan: pipeline tidak boleh bergantung pada folder induk saat dijalankan di CI.

#### R1.2 Join DBF ↔ CSV di `prepare-data.mjs`

Tambahkan pembaca CSV minimal (tanpa dependency; tangani tanda kutip ganda dan koma
di dalam kutipan). Normalisasi kunci: `String(v).trim().toLowerCase()`.

- Kunci DBF: `WADMKC`; kunci CSV: `kecamatan`.
- Validasi: **14/14 harus cocok**. Bila ada yang tidak cocok, `throw` dengan daftar nama.
- Nilai numerik dari CSV di-`Number()`; kosong/NaN → `null` (bukan 0), kecuali field
  yang memang boleh 0.

#### R1.3 Perluas `FIELDS` menjadi kontrak §6.1

| Field output | Sumber | Catatan |
|---|---|---|
| `kecamatan` | DBF `WADMKC` | |
| `stunting_pct` | DBF `pct_stunt` | |
| `stunting_jml` | DBF `stunting` | |
| `balita_ukur` | DBF `balita_tb` | |
| `sanitasi_pct` | DBF `pct_sn_lyk` | |
| `sanitasi_jml` | DBF `san_layak` | |
| `sanitasi_aman_pct` | **CSV** `sanitasi_aman_pct` | DBF punya `pct_sn_amn`; pakai CSV agar konsisten dengan 95 uji |
| `jumlah_kk` | DBF `jml_kk` | |
| `jml_desa` | DBF `jml_desa` | |
| `asi_eksklusif_pct` | **CSV** `asi_eksklusif_pct` | tidak ada di DBF |
| `catin_anemia_pct` | **CSV** `catin_anemia_pct` | DBF `catin_anm` = jumlah, BUKAN persen |
| `balita_ds_pct` | **CSV** `balita_ds_pct` | tidak ada di DBF |
| `kuadran` | turunan | `kuadran(stunting_pct, sanitasi_pct)` |
| `idx_layanan` | turunan | lihat R1.4 |

Field lama `kk_sbs_pct`, `kk_ctps_pct`, `pilar5_pct` **tetap dipertahankan** (masih
dipakai tabel/peta jelajah), meski tidak tercantum di §6.1.

#### R1.4 Hitung `idx_layanan` (harus sama dengan nilai QGIS)

```js
const POS = ["asi_eksklusif_pct","k4_pct","imunisasi_idl_pct","sanitasi_aman_pct","kk_ctps_pct"];
const NEG = ["babs_terbuka_pct","catin_anemia_pct","bblr_pct"];
// z = (x - mean) / pstdev  → gunakan POPULATION stdev, bukan sample
// idx = mean(z_pos) - mean(z_neg)  → dibulatkan 4 desimal
```

**Fixture wajib** (toleransi ±0,01). Tulis sebagai asersi di akhir skrip:

| Kecamatan | idx_layanan |
|---|---|
| Belik | 0,59 |
| Bodeh | 0,51 |
| Pemalang | 0,33 |
| Petarukan | 0,21 |
| Moga | 0,11 |
| Taman | 0,09 |
| Bantarbolang | −0,03 |
| Ampelgading | −0,06 |
| Pulosari | −0,14 |
| Watukumpul | −0,19 |
| Comal | −0,21 |
| Randudongkal | −0,25 |
| Warungpring | −0,37 |
| Ulujami | −0,59 |

Bila asersi gagal, **jangan** mengubah fixture — perbaiki rumusnya.

#### R1.5 Tulis `public/data/determinan.json`

Berkas baru `scripts/prepare-determinan.mjs`:

- Sumber utama: `scripts/sumber/determinan_stunting_2024.csv`
  (salinan dari `../output/determinan_stunting_2024.csv`; 95 baris, 10 kolom).
- Keluaran: `public/data/determinan.json` dengan bentuk persis PRD §6.2:

```json
{ "meta": { "outcome": "stunting_pct", "n": 14, "n_uji": 95,
  "metode": "Pearson + Spearman + Benjamini-Hochberg",
  "signif_fdr": 0, "sumber": "Profil Kesehatan Kabupaten Pemalang 2024" },
  "variabel": [ { "nama": "...", "kelompok": "...", "r": 0, "rho": 0,
                  "p": 0, "fdr": 0, "arah": "searah|berlawanan",
                  "actionable": true } ] }
```

- Nama kunci JSON **Inggris** (`nama`, `r`, `rho`, `p`), sesuai §6.2.
- Urutkan `p` menaik.
- Panggil dari `prepare-data.mjs` (`import "./prepare-determinan.mjs"` di akhir) supaya
  `npm run prepare-data` tetap satu perintah.
- Tambahkan ke `package.json`: `"prepare-peta": "node scripts/optimize-peta.mjs"` (R1b).

**Gerbang R1:**
```bash
npm run prepare-data
node -e "const g=require('./public/data/kecamatan.geojson');const p=g.features.map(f=>f.properties);
 const k=['kecamatan','stunting_pct','sanitasi_pct','sanitasi_aman_pct','asi_eksklusif_pct','catin_anemia_pct','balita_ds_pct','kuadran','idx_layanan'];
 for(const x of k) if(!(x in p[0])) throw new Error('field hilang: '+x);
 const n={};p.forEach(x=>n[x.kuadran]=(n[x.kuadran]||0)+1);
 if(p.length!==14) throw new Error('bukan 14');
 console.log(p.length,n);"
```
Ekspektasi: 14 fitur; kuadran `3 / 4 / 4 / 3`; tidak ada `null` pada 9 field inti.
Cek ukuran: `kecamatan.geojson` **< 420 KB**.

---

### FASE R1b — Berkas peta QGIS

**Folder baru:** `public/peta/`

1. Salin tiga ekspor yang sudah ada dari `../output/`:
   ```bash
   cp ../output/layout_utama_stunting_2024.png        public/peta/peta-stunting-utama.png
   cp ../output/layout_prioritas_stunting_2024.png    public/peta/peta-prioritas-stunting.png
   cp ../output/layout_sanitasi_2024.png              public/peta/peta-sanitasi-penjelas.png
   ```
2. `peta-kapasitas-layanan.png` **belum ada**. Buat lewat QGIS:
   - layout A4 landscape, layer `Indeks Kapasitas Layanan 2024`, Quantile 5 kelas,
     ramp `RdYlGn`, legenda + catatan "bukan indeks risiko".
   - Ekspor 300 dpi ke `public/peta/peta-kapasitas-layanan.png`.
   - Bila QGIS/QGIS-MCP tidak tersedia: **jangan** membuat gambar palsu. Biarkan
     berkas tidak ada, tandai `TERBLOKIR`, dan pastikan UI menangani `onerror`
     dengan pesan "Peta kapasitas belum diekspor dari QGIS".
3. Varian 1200 px: `scripts/optimize-peta.mjs` memakai `sharp` (`npm i -D sharp`).
   Bila gagal dipasang, lewati dan catat di README peta.
4. Tulis `public/peta/README.md`:

```md
# Berkas peta ekspor QGIS
| Berkas | Layout QGIS | Tanggal ekspor | Dimensi | Ukuran | SHA-256 |
|---|---|---|---|---|---|
...
Sumber: Profil Kesehatan Kabupaten Pemalang 2024. Diekspor dari QGIS 3.44.16.
```

Hitung hash: `sha256sum public/peta/*.png` (Linux) atau `Get-FileHash` (Windows).

**Gerbang R1b:** setiap PNG ≤ 1,2 MB; total ≤ 3,5 MB; README memuat hash semua berkas.

---

### FASE R2 — Home menyematkan peta utama

Panel Peta tetap memakai peta Leaflet yang sudah ada; tidak ada perintah untuk
mengganti panel tersebut menjadi gambar statis.

Di `panel-home`, setelah blok KPI dan sebelum grafik bar, tambahkan `<figure>` yang
menunjuk `peta-stunting-utama.png` dengan caption ringkas. Jangan menduplikasi
`<picture>` lengkap — cukup satu `<img>` + tautan ke tab Peta.

**Gerbang R2:**
```bash
npm run build
grep -c "peta-stunting-utama" index.html   # minimal 1
```

---

### FASE R3 — Panel Info: determinan, regresi, anomali

**Lokasi:** `index.html` (`#panel-info`), `src/main.js`, `src/ui/info.js` (baru).

#### R3.1 Sub-bagian "Uji Determinan" (FR-05)

- Tabel dari `determinan.json`, dimuat **saat tab Info pertama kali dibuka**.
- Kolom: Variabel, Kelompok, r, ρ, p, FDR, Arah, Actionable.
- Default urut `p` menaik.
- Setiap baris punya badge **"tidak signifikan (FDR)"** — 95/95.
- Filter: `<select>` kelompok (opsi dibangun dari data, bukan hardcode) + checkbox
  "hanya yang bisa diintervensi" + `<input type="search">` nama variabel.
- Kalimat tetap di atas tabel, **persis**:
  > Dengan 14 kecamatan dan 95 uji, tidak ada variabel yang signifikan setelah koreksi FDR. Hasil ini eksploratif.
- Tampilkan juga `n`, `n_uji`, `metode`, `signif_fdr` dari `meta`.

#### R3.2 Kartu "Regresi satu prediktor" (FR-06)

6 baris dari PRD §2.5 (tb_anak_jml, balita_ds_pct, kk_ctps_pct, sanitasi_layak_pct,
sanitasi_aman_pct, asi_eksklusif_pct) dengan b, R², p. Tandai p < 0,05 dengan badge
"nominal" **dan** catatan "tidak lolos koreksi FDR (95 uji)".

Nilai ini boleh statis di `determinan.json` (`meta.regresi`), **bukan** di HTML.

#### R3.3 Registry anomali (FR-07)

Tabel 7 baris dari PRD §2.7. Kolom: Variabel, Kecamatan, Nilai, Dugaan, Status.
Status selalu "belum dikoreksi". Tambahkan kalimat: "Data ditampilkan apa adanya
sesuai sumber; tidak ada koreksi atau imputasi."

#### R3.4 Perbaiki narasi lama yang kini salah

Di `#panel-info`, ganti:

| Lama | Baru |
|---|---|
| "dua tantangan ... saling terkait" | "Stunting sebagai fokus studi; sanitasi sebagai faktor penjelas." |
| "Kelas Rendah, Sedang, Tinggi ... selang seragam" | "Lima kelas kuantil; batas sama dengan peta QGIS." |
| Definisi "Kelas kerentanan: < 8,32 / 8,32–12,51 / ≥12,51" | Daftar 5 break dari `KELAS_STUNTING` (render dari JS, bukan hardcode) |
| Alur pengolahan langkah 3–4 | tambah langkah ekspor QGIS → `public/peta/` |

**Gerbang R3:**
```bash
npm run build
grep -c "tidak ada variabel yang signifikan" index.html   # ≥1
grep -c "8,32" index.html                                  # harus 0 (sudah tidak dipakai)
```

---

### FASE R4 — KPI, grafik, tabel, unduhan, aksesibilitas

#### R4.1 KPI (`src/ui/kpi.js`)

Empat kartu (ganti yang lama):

1. **Rerata stunting** — `rerataStunting` (tetap).
2. **Prioritas Utama** — jumlah kecamatan kuadran 1 + daftar 3 nama.
3. **Determinan Lain** — jumlah kuadran 2 + kalimat "sanitasi baik, stunting tetap tinggi".
4. **Hubungan sanitasi–stunting** — `r = −0,22 · p = 0,443 · n = 14` dengan label
   "lemah, tidak signifikan". Hitung dari `ringkas(rows)` + `pValue()`.

Hapus kartu "sanitasi terendah" bila tidak lagi relevan, atau ubah menjadi bagian
dari kartu 4.

#### R4.2 Grafik batang (`src/charts/bar.js`)

- Seri utama: stunting.
- Sanitasi: **bukan seri kedua yang setara**; tampilkan sebagai titik/garis referensi
  atau kolom abu-abu tipis berlabel "pembanding".
- Warna batang mengikuti 5 kelas (`KELAS_STUNTING`), label kelas di tooltip.

#### R4.3 Scatter (`src/charts/scatter.js`)

- Sumbu Y stunting, X sanitasi layak.
- Anotasi: `r`, `p`, `n`, dan teks "lemah / tidak signifikan (n=14)".
- Jangan menyebut "menyebabkan" di tooltip mana pun.

#### R4.4 Tabel (`src/ui/table.js`, `index.html`)

- Tambah kolom: **Kuadran**, **Idx. Layanan**.
- Klik baris → buka detail (boleh `<tr>` expand) yang memuat 4 baris FR-08:
  stunting + kelas x/5, sanitasi + kelas x/5, kuadran + alasan, idx layanan.
- Nilai > 100% diberi `⚠` + `title="di luar skala 100%"`.
- Filter kelas: ganti `<select id="filter-kelas">` menjadi 5 opsi kelas (dari
  `KELAS_STUNTING`), bukan 3.

#### R4.5 Unduhan (`src/ui/export.js`)

- CSV kini memuat `kuadran` dan `idx_layanan` (otomatis bila `FIELDS`/CSV pipeline diperbarui).
- Tambah baris metadata di komentar kepala CSV: `# Sumber: Profil Kesehatan Kabupaten Pemalang 2024; n=14; diekspor <tanggal>`.
  Bila komentar merusak parsing, letakkan metadata di nama berkas + README, **jangan**
  di baris data.
- Unduhan GeoJSON tetap.

#### R4.6 Disclaimer (FR-10)

Tiga kalimat wajib, verbatim, minimal di: hero Home (1), panel Peta (2), panel Info (3):

1. "Stunting adalah fokus studi; sanitasi adalah salah satu faktor penjelas."
2. "Analisis bersifat eksploratif: n = 14 kecamatan, tidak ada variabel signifikan setelah koreksi FDR."
3. "Data mengikuti sumber Profil Kesehatan 2024; nilai > 100% tidak dikoreksi."

#### R4.7 Aksesibilitas

- Semua kontrol peta/tab/filter dapat dicapai keyboard; `:focus-visible` terlihat.
- `aria-live="polite"` untuk perubahan peta aktif dan jumlah hasil filter.
- Setiap `<img>` peta punya `alt` deskriptif.
- Kontras teks ≥ 4,5:1 pada tema terang **dan** gelap.

**Gerbang R4:**
```bash
npm run build
head -1 public/data/kecamatan.csv      # header harus memuat kuadran dan idx_layanan
grep -c "kuadran" public/data/kecamatan.csv     # ≥1
grep -c "idx_layanan" public/data/kecamatan.csv # ≥1
```

---

### FASE R5 — Verifikasi akhir & dokumentasi

1. `npm run prepare-data` → 14 fitur, 4 field baru ada, kuadran 3/4/4/3.
2. `npm run build` → lolos, tanpa warning baru.
3. `npm run preview` → buka manual (atau minta manusia membuka) di `/`, `#peta`, `#info`.
4. Perbarui `README.md` proyek:
   - stunting = fokus, sanitasi = faktor penjelas;
   - peta berasal dari ekspor QGIS (`public/peta/`), bukan render browser;
   - cara memperbarui: `npm run prepare-data` **dan** ekspor ulang QGIS;
   - rujukan silang ke `PRD.md` v2 dan `../PRD.md` v1.
5. Tulis `public/peta/README.md` (R1b) bila belum.
6. Jangan commit `node_modules`, `dist`, `dev.log`.

---

## 5. MATRIKS KETERLACAKAN (harus 100% terisi sebelum selesai)

Isi tabel ini di laporan akhir. Setiap baris wajib punya berkas nyata dan status.

| FR | Berkas utama | Bukti |
|---|---|---|
| FR-01 peta utama gambar | `index.html`, `public/peta/peta-stunting-utama.png` | `<img>` + caption |
| FR-02 sanitasi penjelas | `index.html`, `public/peta/peta-sanitasi-penjelas.png` | string "Faktor penjelas" |
| FR-03 kuadran | `public/peta/peta-prioritas-stunting.png`, `src/ui/table.js` | 3/4/4/3 |
| FR-04 kapasitas | `public/peta/peta-kapasitas-layanan.png` | catatan efek deteksi |
| FR-05 determinan | `public/data/determinan.json`, `src/ui/info.js` | 95 baris, badge FDR |
| FR-06 regresi | `src/ui/info.js` | 6 model |
| FR-07 anomali | `src/ui/info.js` | 7 baris |
| FR-08 info kontekstual | `src/ui/table.js` | 4 baris per kecamatan |
| FR-09 grafik/unduhan | `src/charts/*`, `src/ui/export.js` | kolom baru |
| FR-10 disclaimer | `index.html` | 3 kalimat verbatim |
| §6.1 kontrak data | `scripts/prepare-data.mjs` | 9 field inti |
| §6.3 konstanta | `src/data/classify.js` | nilai persis |
| §6.4 berkas peta | `public/peta/` | 4 PNG + README hash |
| R0.4 breaking change | 8 berkas (tabel, grafik, peta, store, select) | tidak ada pembanding string `"Tinggi"` tersisa |

---

## 6. LARANGAN EKSPLISIT

- ❌ Menulis angka statistik di `index.html` (kecuali contoh teks di PRD).
- ❌ Menyebut sanitasi sebagai "penyebab" atau "determinan utama" tanpa kualifikasi.
- ❌ Menamai indeks sebagai "indeks risiko"/"protektif".
- ❌ Membuat peta baru dengan Leaflet lalu mengklaimnya sebagai "ekspor QGIS".
- ❌ Mengubah `../output/`, `../*.shp`, `../*.dbf`, `../PRD.md`.
- ❌ Menghapus `src/map/*` (biarkan sebagai kode opsional).
- ❌ Menambah 95 kolom ke GeoJSON.
- ❌ Menghapus `loading="lazy"` pada gambar non-utama.

---

## 7. FORMAT LAPORAN AKHIR

Akhiri dengan laporan ringkas, tanpa basa-basi:

```md
## Status
SELESAI / SELESAI DENGAN CATATAN / TERBLOKIR

## Berkas berubah
| Berkas | Aksi | Ringkas |
|---|---|---|

## Berkas baru
| Berkas | Isi |
|---|---|

## Hasil gerbang
- prepare-data : 14 fitur, kuadran 3/4/4/3, GeoJSON <x> KB
- build        : lolos / gagal
- grep checks  : <ringkas>
- peta         : 4/4 ada / <n>/4 ada

## Penyimpangan dari PRD
| Item | Alasan | Dampak |
|---|---|---|

## Belum diverifikasi
- Visual layout peta (perlu mata manusia): <apa yang dicek>

## Langkah manusia berikutnya
1. ...
```

Jangan menulis "semua sudah sesuai PRD" bila ada baris di bagian Penyimpangan.

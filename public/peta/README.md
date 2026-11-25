# Berkas peta ekspor QGIS

Sumber: Profil Kesehatan Kabupaten Pemalang 2024. Diekspor dari QGIS 3.44.16.

## PNG asli (sumber)

| Berkas | Layout QGIS | Tanggal ekspor | Dimensi | Ukuran | SHA-256 |
|---|---|---|---|---|---|
| `peta-stunting-utama.png` | Peta Utama Stunting 2024 (`../output/layout_utama_stunting_2024.png`) | 2026-11-25 | 3507×2480 | 959 KB | `A8F9BAE04187C4940FF3AA7312735338315C9FC1BE192D71DFE6F55CE5D9563B` |
| `peta-prioritas-stunting.png` | Peta Prioritas Stunting 2024 (`../output/layout_prioritas_stunting_2024.png`) | 2026-11-25 | 3507×2480 | 688 KB | `C45DC3E2FFA76762B793822566107BEE29C3878A5108A2960024808C78D83EBB` |
| `peta-sanitasi-penjelas.png` | Peta Sanitasi Layak 2024 (`../output/layout_sanitasi_2024.png`) | 2026-11-25 | 3507×2480 | 645 KB | `5FDED8AB762BFAB84B3AD6C02DFEAD5C87246D4CB77AEFF629D3DB777EF4177F` |
| `peta-kapasitas-layanan.png` | Indeks Kapasitas Layanan 2024 (layout baru) | 2026-11-25 | 3507×2480 | 351 KB | `FC8810FB4EE8F986CE9910BCB69594D9E17D8166C85A3BCE742B3DEE43F01009` |

Total PNG: **2643 KB** (batas 3,5 MB).

## Varian 1200 px (untuk `srcset`)

| Berkas | Ukuran | Dimensi | SHA-256 |
|---|---|---|---|
| `peta-stunting-utama-1200.webp` | 77 KB | 1200×849 | `EA8AB87731120F5AC75CF76DA37B02182DAC9CF9385C3C3006B17C8F65D79FE0` |
| `peta-prioritas-stunting-1200.webp` | 51 KB | 1200×849 | `4D6A46959C033F29FB24F50E62D7F8DEAB73817C532DDD00044FBB4009E22692` |
| `peta-sanitasi-penjelas-1200.webp` | 51 KB | 1200×849 | `DC946A7919CB208BC507E352850C9F979855F33C40E03D4B7E3A71897110BEAD` |
| `peta-kapasitas-layanan-1200.webp` | 39 KB | 1200×849 | `587846FC4733170B437B9ACCD93DC23F4E5B3FF2DF0B729E99F58FAA1E8BEC02` |

Dibuat dengan `npm run prepare-peta` (sharp, kualitas 82). Total WebP: **218 KB**.

## Catatan isi peta kapasitas layanan

- Klasifikasi: **Quantile, 5 kelas**, field `idx_determinan` (sama dengan `idx_layanan` di data web).
- Ramp: `RdYlGn` — merah = kapasitas rendah, hijau = kapasitas tinggi.
- Batas kelas: `−0,5877 / −0,2237 / −0,1262 / 0,0641 / 0,2566 / 0,5869`.
- Legenda tercetak di gambar; judul memuat catatan **"bukan indeks risiko dan bukan skor baku nasional"**.
- Skala bar dari layout sumber (A4 landscape, 300 dpi); extent peta sama dengan tiga layout lain.

## Cara memperbarui

1. Ekspor ulang tiga layout lama dari QGIS ke `../output/` (nama berkas di kolom Layout QGIS), lalu salin ke sini.
2. Untuk peta kapasitas: `& "C:\Program Files\QGIS 3.44.16\bin\python-qgis-ltr.bat" scripts/ekspor-peta-kapasitas.py`
   (menduplikasi layout "Peta Prevalensi Stunting 2024"; tidak menyimpan `.qgz`).
3. `npm run prepare-peta` untuk varian WebP.
4. Perbarui tabel SHA-256 dan tanggal di README ini. Tanggal ekspor harus tetap dekat dengan mtime `public/data/kecamatan.geojson` (lihat PRD §9).

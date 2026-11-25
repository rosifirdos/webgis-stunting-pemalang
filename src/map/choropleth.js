import L from "leaflet";
import { token } from "../tokens.js";
import { panelAktif, warnaUntuk, nilaiTeks } from "./layers.js";
import { angka } from "../data/stats.js";
import { labelSingkat } from "../data/classify.js";

/**
 * Layer choropleth.
 *
 * Catatan gaya:
 * - Isi poligon memakai ramp QGIS apa adanya (Reds / Blues); lihat RAMP_QGIS
 *   di layers.js. Garis batas mengikuti outline QGIS, bukan warna permukaan
 *   tema: kelas teratas hampir sewarna latar, jadi tepinya yang menyatakan
 *   batas wilayah. Ini juga memberi celah antar-poligon sehingga dua
 *   kecamatan bertetangga dengan kelas sama tetap terbaca sebagai dua wilayah.
 * - Kecamatan terpilih selalu diangkat ke lapisan teratas (bringToFront) agar
 *   garis tepinya tidak tertutup tetangganya.
 */

let petaRef = null;
let layerGeo = null;
let indeksRow = new Map();
let namaTerpilih = null;
let saatPilih = () => {};
let perluFit = false;
// Kecamatan yang tersaring keluar oleh filter: tetap tampil sebagai konteks
// keruangan, tapi diredupkan supaya yang tersaring jelas terbaca sebagai fokus.
let keluarFilter = new Set();

/** Baris statistik yang kaya (kelas dll) untuk sebuah feature. */
function baris(feature) {
  return indeksRow.get(feature.properties.kecamatan) ?? feature.properties;
}

function gaya(feature, { hover = false } = {}) {
  const row = baris(feature);
  const panel = panelAktif();
  const terpilih = row.kecamatan === namaTerpilih;
  const diredupkan = keluarFilter.has(row.kecamatan);

  return {
    color: terpilih ? token("--color-ink") : token("--color-peta-garis"),
    weight: terpilih ? 2.5 : hover ? 2.5 : 1,
    opacity: diredupkan ? 0.5 : 1,
    fillColor: diredupkan ? token("--color-axis") : warnaUntuk(row, panel),
    fillOpacity: diredupkan ? 0.25 : hover || terpilih ? 1 : 0.9,
  };
}

function htmlTip(feature) {
  const row = baris(feature);
  const panel = panelAktif();
  const { teks, diLuarSkala } = nilaiTeks(row, panel);

  return `
    <div style="min-width:112px">
      <div class="tnum" style="font-size:15px;font-weight:600;line-height:1.15">
        ${teks}${diLuarSkala ? ' <span style="color:var(--color-warning)">*</span>' : ""}
      </div>
      <div style="margin-top:2px;font-size:11px;color:var(--color-ink-3)">
        ${row.kecamatan} &middot; ${panel.judul}
      </div>
    </div>`;
}

const barisDl = (label, nilai) =>
  `<dt style="color:var(--color-ink-2)">${label}</dt>
   <dd class="tnum" style="margin:0;text-align:right;font-weight:500">${nilai}</dd>`;

function htmlPopup(feature) {
  const p = baris(feature);
  const luar = p.sanitasi_pct > 100;

  return `
    <div style="min-width:196px">
      <p style="margin:0;font-size:14px;font-weight:600">${p.kecamatan}</p>
      <p style="margin:2px 0 0;font-size:11px;color:var(--color-ink-3)">
        Kecamatan &middot; Kabupaten Pemalang
      </p>
      <dl style="margin:10px 0 0;display:grid;grid-template-columns:auto auto;gap:5px 14px;font-size:12px">
        ${barisDl("Stunting", `${angka(p.stunting_pct, 2)}%`)}
        ${barisDl("Sanitasi layak", `${angka(p.sanitasi_pct, 2)}%${luar ? " *" : ""}`)}
        ${barisDl("Kasus stunting", `${angka(p.stunting_jml)} balita`)}
        ${barisDl("Balita diukur", angka(p.balita_ukur))}
        ${barisDl("Kelas", `Kelas ${p.kelas}/5 — ${labelSingkat(p.kelas)}`)}
      </dl>
      ${
        luar
          ? `<p style="margin:9px 0 0;padding-top:8px;border-top:1px solid var(--color-hairline);font-size:11px;line-height:1.45;color:var(--color-ink-2)">
               * Di atas 100% &mdash; dibaca sebagai capaian program, bukan proporsi rumah tangga.
             </p>`
          : ""
      }
    </div>`;
}

/** Angkat poligon terpilih ke depan supaya tepinya tidak tertutup. */
function angkatTerpilih() {
  if (!namaTerpilih || !layerGeo) return;
  layerGeo.eachLayer((l) => {
    if (l.feature.properties.kecamatan === namaTerpilih) l.bringToFront();
  });
}

function pasangInteraksi(feature, layer) {
  layer.on({
    mouseover: (e) => {
      if (feature.properties.kecamatan === namaTerpilih) return;
      e.target.setStyle(gaya(feature, { hover: true }));
      e.target.bringToFront();
    },
    mouseout: (e) => {
      e.target.setStyle(gaya(feature));
      angkatTerpilih();
    },
    click: (e) => {
      L.DomEvent.stopPropagation(e);
      saatPilih(feature.properties.kecamatan);
    },
  });

  // Konten berupa fungsi: Leaflet memanggilnya setiap kali dibuka, sehingga
  // tooltip otomatis ikut layer yang sedang aktif tanpa perlu digambar ulang.
  layer.bindTooltip(() => htmlTip(feature), {
    className: "peta-tip",
    sticky: true,
    direction: "top",
    offset: [0, -12],
    opacity: 1,
  });

  layer.bindPopup(() => htmlPopup(feature), {
    closeButton: true,
    maxWidth: 260,
    autoPanPadding: [16, 16],
  });
}

export function gambarChoropleth(peta, geojson, rows, { pilih: onPilih }) {
  petaRef = peta;
  saatPilih = onPilih;
  indeksRow = new Map(rows.map((r) => [r.kecamatan, r]));

  layerGeo = L.geoJSON(geojson, {
    style: (f) => gaya(f),
    onEachFeature: pasangInteraksi,
  }).addTo(peta);

  // Seluruh kabupaten harus masuk bingkai. Perhitungannya belum bisa
  // dilakukan sekarang: panel peta masih tersembunyi saat halaman dimuat,
  // dan wadah berukuran 0x0 membuat fitBounds memilih zoom yang salah.
  // Penyelesaiannya ditunda ke fitJikaPerlu() saat panel benar-benar tampil.
  perluFit = true;

  // Klik di area kosong melepas pilihan (klik poligon sudah dihentikan).
  peta.on("click", () => saatPilih(null));

  return layerGeo;
}

/**
 * Bingkai seluruh kabupaten, sekali saja.
 *
 * Dipisah dari gambarChoropleth karena fitBounds bergantung pada ukuran
 * wadah yang baru ada setelah panel peta ditampilkan. Dijalankan sekali agar
 * tidak membatalkan geser dan zoom yang sudah dilakukan pengguna.
 */
export function fitJikaPerlu() {
  if (!perluFit || !layerGeo || !petaRef) return;
  const ukuran = petaRef.getSize();
  if (!ukuran.x || !ukuran.y) return; // panel masih tersembunyi
  perluFit = false;
  petaRef.fitBounds(layerGeo.getBounds(), { padding: [20, 20] });
}

/** Hitung ulang warna seluruh poligon (dipakai saat layer atau tema berubah). */
export function gambarUlang() {
  if (!layerGeo) return;
  layerGeo.eachLayer((l) => l.setStyle(gaya(l.feature)));
  angkatTerpilih();
}

/**
 * Redupkan kecamatan di luar hasil filter.
 *
 * Yang tersaring keluar tidak dihilangkan dari peta - menghapusnya akan
 * memutus konteks keruangan dan membuat peta tampak seperti kabupaten yang
 * berbeda. Ia hanya diturunkan kontrasnya.
 */
export function tandaiFilter(rowsTampil) {
  const tampil = new Set((rowsTampil ?? []).map((r) => r.kecamatan));
  // Bila tidak ada filter aktif, semua tetap penuh warna.
  keluarFilter = new Set(
    [...indeksRow.keys()].filter((n) => rowsTampil && !tampil.has(n))
  );
  gambarUlang();
}

/** Tandai satu kecamatan sebagai terpilih; null untuk melepas. */
export function pilih(nama, { bukaPopup = false, geser = false } = {}) {
  namaTerpilih = nama;
  if (!layerGeo) return;

  // Memilih dari tabel atau grafik berarti pengguna sudah menentukan sendiri
  // wilayah yang ingin dilihat. Bingkai "seluruh kabupaten" yang belum
  // dijalankan karena itu dibatalkan, supaya peta tidak melompat kembali.
  if (geser && nama) perluFit = false;

  layerGeo.eachLayer((l) => {
    const ini = l.feature.properties.kecamatan === nama;
    l.setStyle(gaya(l.feature, { hover: ini }));
    if (ini) {
      if (bukaPopup) l.openPopup();
      if (geser) petaRef.panTo(l.getBounds().getCenter(), { animate: true });
    } else if (!bukaPopup) {
      l.closePopup();
    }
  });
  angkatTerpilih();
}

/** Batasi peta ke seluruh kecamatan (dipakai tombol "Reset tampilan"). */
export function muatSemua() {
  if (!layerGeo) return;
  perluFit = false;
  petaRef.fitBounds(layerGeo.getBounds(), { padding: [24, 24] });
}

import L from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * Basemap raster.
 *
 * Ketiganya dapat dipasang tanpa kunci API. Ubin Positron milik CARTO, yang
 * sebelumnya dipakai di sini, kini menolak permintaan tanpa kunci dan
 * menggantinya dengan ubin bertanda "API KEY REQUIRED"; basemap dasar karena
 * itu memakai lapis "canvas" Esri yang tidak memerlukan kunci.
 *
 * Kenapa canvas untuk basemap dasar: gayanya nyaris tanpa warna - bidang abu-
 * abu muda, garis jalan putih, sungai abu-abu. Peta choropleth menaruh warna
 * pada bidang yang sama, jadi basemap berwarna akan berebut perhatian dengan
 * data. Versi gelapnya bukan pembalikan warna, melainkan ubin tersendiri yang
 * langkah abu-abunya dipilih untuk latar gelap.
 *
 * Catatan urutan token: layanan ArcGIS memakai {z}/{y}/{x}, bukan {z}/{x}/{y}
 * seperti sebagian besar penyedia ubin lain.
 *
 * Atribusi tiap penyedia wajib disertakan - itu syarat pemakaian layanannya,
 * bukan sekadar kredit.
 */
const BASEMAP = {
  terang: {
    // Label menyebut keluarga layanannya, bukan salah satu variannya: di mode
    // gelap `gelap` di bawah yang dipakai, jadi menyebut "Light Gray" saja akan
    // menamai layanan yang justru tidak sedang tampil.
    label: "Esri Gray Canvas",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    gelap:
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attr:
      'Tiles &copy; <a href="https://www.esri.com/">Esri</a> &mdash; Esri, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    // Di atas z16 layanan ini tidak punya data untuk wilayah Pemalang dan
    // mengirim ubin "Map data not yet available". maxNativeZoom memberi tahu
    // Leaflet bahwa ubin asli berhenti di z16, sehingga z17 diperbesar dari
    // ubin itu - kabur, tapi tetap terbaca, bukan kotak peringatan.
    maxNativeZoom: 16,
    // detectRetina menaikkan zoom yang diminta ke layanan sebesar 1. Pada
    // lapisan ini itu akan meminta z17 - tepat ubin peringatan yang hendak
    // dihindari - jadi dimatikan. Yang dikorbankan hanya ketajaman: isi
    // basemap ini bidang abu-abu rata tanpa label, dan di atas z16 ubinnya
    // memang sudah diperbesar.
    retina: false,
    maxZoom: 19,
  },
  osm: {
    label: "OpenStreetMap",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attr:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    // OSM tidak menyediakan versi gelap. Ubinnya dibiarkan terang di mode
    // gelap, sama seperti citra satelit.
  },
  satelit: {
    label: "Citra Satelit",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attr:
      'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    maxZoom: 19,
  },
};

const AWAL = { pusat: [-7.0116, 109.3915], zoom: 11 };

/** Apakah basemap ini punya ubin versi gelap sendiri. */
export function punyaVersiGelap(nama) {
  return Boolean(BASEMAP[nama]?.gelap);
}

let peta = null;
let tileLayer = null;
let namaBasemap = "satelit";
let pengamatUkuran = null;

export function getPeta() {
  return peta;
}

export function getTileLayer() {
  return tileLayer;
}

export function buatPeta(elemen, { gelap } = {}) {
  peta = L.map(elemen, {
    center: AWAL.pusat,
    zoom: AWAL.zoom,
    minZoom: 9,
    maxZoom: 17,
    zoomControl: true,
    // Zoom tidak dikunci ke langkah bilangan bulat. Kabupaten ini tingginya
    // hanya sekitar 0,47 derajat, sehingga pada ukuran jendela biasa selisih
    // satu langkah penuh terlalu besar: langkah bulat terdekat meninggalkan
    // sepertiga bingkai kosong. Dengan langkah 0,25 wilayahnya masuk pas.
    zoomSnap: 0.25,
    zoomDelta: 0.5,
    wheelPxPerZoomLevel: 90,
    // Batasi geser agar pengguna tidak tersesat jauh dari kabupaten.
    maxBounds: L.latLngBounds([-7.45, 108.95], [-6.6, 109.85]),
    maxBoundsViscosity: 0.8,
    attributionControl: true,
  });

  L.control.scale({ metric: true, imperial: false, position: "bottomright" }).addTo(peta);

  pasangBasemap(namaBasemap, { gelap });
  pantauUkuran(elemen);
  return peta;
}

/**
 * Ikuti perubahan ukuran wadah peta.
 *
 * Di layar lebar peta dan sidebar berbagi satu baris grid: saat kartu
 * "Kecamatan terpilih" muncul, baris itu meninggi dan wadah peta ikut
 * meninggi. Leaflet menyimpan ukuran lama, sehingga bagian bawah peta
 * tampak kosong sampai jendela diubah ukurannya. ResizeObserver memastikan
 * peta menghitung ulang begitu wadahnya berubah, dari sebab apa pun.
 */
function pantauUkuran(elemen) {
  if (!elemen || typeof ResizeObserver === "undefined") return;
  pengamatUkuran?.disconnect();
  pengamatUkuran = new ResizeObserver(() => peta?.invalidateSize());
  pengamatUkuran.observe(elemen);
}

/**
 * Pasang basemap. `gelap` hanya berpengaruh pada basemap yang punya versi
 * gelap; yang tidak punya dibiarkan apa adanya.
 */
export function pasangBasemap(nama, { gelap } = {}) {
  if (!peta) return;

  namaBasemap = BASEMAP[nama] ? nama : "terang";
  const def = BASEMAP[namaBasemap];
  const url = (gelap && def.gelap) || def.url;

  if (tileLayer) peta.removeLayer(tileLayer);
  tileLayer = L.tileLayer(url, {
    attribution: def.attr,
    maxZoom: def.maxZoom,
    maxNativeZoom: def.maxNativeZoom,
    // Ubin @2x di layar kerapatan tinggi, kecuali dimatikan per lapisan
    // (lihat catatan pada `terang`).
    detectRetina: def.retina !== false,
  }).addTo(peta);
  tileLayer.setZIndex(0);
}

/** Perbarui basemap saat tema berubah tanpa membongkar peta. */
export function perbaruiTemaBasemap({ gelap } = {}) {
  pasangBasemap(namaBasemap, { gelap });
}

export function ukuranUlang() {
  peta?.invalidateSize();
}

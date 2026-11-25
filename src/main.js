import "./styles.css";

import { muatData } from "./data/load.js";
import { getState, setState, subscribe, terapkanFilter } from "./state/store.js";

import { initTabs } from "./ui/tabs.js";
import { gambarKpi } from "./ui/kpi.js";
import {
  initTabel,
  gambarTabel,
  tandaiTerpilih,
  onPilihBaris,
  perbaruiPanah,
} from "./ui/table.js";
import {
  initFilter,
  perbaruiRingkasanFilter,
  catatHasil,
  initToggleTabel,
  segarkanTabelGrafik,
} from "./ui/filters.js";
import { jalankanUnduh } from "./ui/export.js";
import { initFoto } from "./ui/galeri.js";
import { initGaleriPeta } from "./ui/galeri-peta.js";
import { initScrollAnimation } from "./ui/scroll.js";

import { initTema, siklusTema, onTema, isGelap, getMode } from "./tokens.js";
import { fontDashboard, palet } from "./charts/base.js";
import { gambarBar, tabelBar, perbaruiTemaBar, hapusBar } from "./charts/bar.js";
import {
  gambarScatter,
  tabelScatter,
  perbaruiTemaScatter,
  hapusScatter,
} from "./charts/scatter.js";

/* --------------------------------------------------------------------------
   Ikon & label tombol tema
   -------------------------------------------------------------------------- */
const IKON_TERANG = `<svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`;
const IKON_GELAP = `<svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 14.5A8.5 8.5 0 019.5 4a7 7 0 108.5 10.5z"/></svg>`;

const LABEL_MODE = {
  auto: "Tema mengikuti pengaturan sistem. Klik untuk memilih mode terang.",
  light: "Mode terang aktif. Klik untuk beralih ke mode gelap.",
  dark: "Mode gelap aktif. Klik untuk kembali mengikuti sistem.",
};

function initTombolTema() {
  const tombol = document.getElementById("tombol-tema");
  if (!tombol) return;

  const lukis = (m) => {
    // Ikon menunjukkan keadaan sekarang, label menjelaskan langkah berikutnya.
    tombol.innerHTML = isGelap() ? IKON_GELAP : IKON_TERANG;
    tombol.setAttribute("aria-label", LABEL_MODE[m] ?? LABEL_MODE.auto);
    tombol.dataset.mode = m;
  };

  lukis(getMode());
  tombol.addEventListener("click", () => lukis(siklusTema()));
  onTema(({ mode }) => lukis(mode));
}

/* --------------------------------------------------------------------------
   Pesan galat & pengumuman pembaca layar
   -------------------------------------------------------------------------- */
function tampilkanGalat(pesan) {
  document.getElementById("pemuat")?.remove();
  const kotak = document.getElementById("galat");
  if (!kotak) return;
  kotak.hidden = false;
  const p = document.getElementById("galat-pesan");
  if (p) p.textContent = pesan;
}

function umumkan(pesan, ok = true) {
  let live = document.getElementById("pengumuman");
  if (!live) {
    live = document.createElement("div");
    live.id = "pengumuman";
    live.setAttribute("role", "status");
    live.setAttribute("aria-live", "polite");
    live.className = "sr-only";
    document.body.appendChild(live);
  }
  live.textContent = pesan;
  if (!ok) console.warn(pesan);
}

/* --------------------------------------------------------------------------
   Boot
   -------------------------------------------------------------------------- */
let sudahJalan = false;

async function mulai() {
  if (sudahJalan) return;
  sudahJalan = true;

  try {
    initTema();
    initTombolTema();
    initTabs();
    // Foto mengisi slot tata letak yang sudah ada di HTML dan tidak
    // bergantung pada data, jadi dipasang sebelum GeoJSON selesai dimuat
    // supaya unduhan gambarnya berjalan bersamaan, bukan berurutan.
    initFoto();

    const { rows } = await muatData();
    document.getElementById("pemuat")?.remove();

    const semua = rows;
    let rowsTampil = terapkanFilter(semua);

    /* --- galeri peta -------------------------------------------------------
       Peta resmi adalah gambar ekspor QGIS; tidak ada kanvas Leaflet di panel
       Peta. Modul src/map/* dipertahankan sebagai rujukan, tetapi tidak
       dipanggil saat boot. */
    initGaleriPeta();

    /** Pilihan dari tabel/grafik hanya menyorot baris; peta statis tidak bisa
        menampilkan poligon terpilih. */
    function pilihLokal(nama) {
      setState({ terpilih: getState().terpilih === nama ? null : nama });
    }

    /* --- tabel alternatif untuk kedua grafik ------------------------------ */
    const isiTabel = {
      bar: () => tabelBar(rowsTampil),
      scatter: () => tabelScatter(rowsTampil),
    };
    initToggleTabel(isiTabel);

    /* --- KPI ---------------------------------------------------------------
       Selalu dihitung dari 14 kecamatan, tidak ikut tersaring. Rerata tiga
       kecamatan bukan rerata kabupaten; menampilkannya di kartu berjudul
       "Ringkasan Kabupaten Pemalang" akan menyesatkan. */
    gambarKpi(semua);

    /* --- filter ------------------------------------------------------------ */
    initFilter(semua.length);

    /* --- tabel -------------------------------------------------------------- */
    initTabel();
    onPilihBaris((nama) => pilihLokal(nama));

    /* --- unduhan ------------------------------------------------------------ */
    for (const tombol of document.querySelectorAll("[data-unduh]")) {
      tombol.addEventListener("click", async () => {
        const { ok, pesan } = await jalankanUnduh(tombol.dataset.unduh, tombol, {
          n: semua.length,
        });
        umumkan(pesan, ok);
      });
    }

    /* --- render ------------------------------------------------------------
       Dipisah menurut apa yang berubah:
       - grafik+tabel digambar ulang hanya bila filter/pengurutan berganti;
         menggambar ulang saat sekadar memilih kecamatan membuat kanvas
         berkedip di setiap klik.
       - gaya peta diperbarui pada setiap perubahan karena murah. */
    let kunciSebelumnya = "";

    function kunci() {
      const { kelas, cari, urut, arah } = getState();
      return `${kelas}|${cari}|${urut}|${arah}`;
    }

    function render() {
      const state = getState();
      const kunciKini = kunci();
      const dataBerubah = kunciKini !== kunciSebelumnya;
      kunciSebelumnya = kunciKini;

      if (dataBerubah) {
        rowsTampil = terapkanFilter(semua);

        gambarTabel(rowsTampil);
        catatHasil(rowsTampil.length);
        perbaruiRingkasanFilter(semua.length);
        perbaruiPanah();

        gambarBar(rowsTampil, { onPilih: (nama) => pilihLokal(nama) });
        gambarScatter(rowsTampil, { onPilih: (nama) => pilihLokal(nama) });
        segarkanTabelGrafik(isiTabel);
      }

      // Pilihan yang gugur karena filter tidak boleh dibiarkan menggantung.
      if (state.terpilih && dataBerubah && !rowsTampil.some((r) => r.kecamatan === state.terpilih)) {
        setState({ terpilih: null });
        return;
      }

      tandaiTerpilih(state.terpilih);
    }

    render();
    subscribe(render);
    initScrollAnimation();

    /* --- peristiwa global ---------------------------------------------------- */
    // Peta kini gambar statis, jadi tidak ada ukuran kanvas yang perlu
    // diperbarui saat tab Peta dibuka atau jendela diubah ukurannya.
    onTema(() => {
      // Warna dibaca dari token CSS, jadi semuanya digambar ulang setelah
      // atribut tema berganti - bukan sekadar dibalik.
      fontDashboard(palet());
      perbaruiTemaBar();
      perbaruiTemaScatter();
    });
  } catch (e) {
    console.error(e);
    tampilkanGalat(
      `${e.message}. Pastikan berkas data tersedia di folder /data dan halaman dibuka melalui server web (bukan lewat protokol file://).`
    );
  }
}

// Bersihkan instance grafik saat halaman ditinggalkan.
window.addEventListener("pagehide", () => {
  hapusBar();
  hapusScatter();
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mulai, { once: true });
} else {
  mulai();
}

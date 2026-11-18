import "./styles.css";

import { muatData } from "./data/load.js";
import { getState, subscribe, terapkanFilter } from "./state/store.js";

import { initTabs, onPetaAktif, pindahTab } from "./ui/tabs.js";
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

import { initTema, siklusTema, onTema, isGelap, getMode } from "./tokens.js";
import { buatPeta, ukuranUlang } from "./map/init.js";
import { gambarChoropleth, gambarUlang, pilih, tandaiFilter, fitJikaPerlu } from "./map/choropleth.js";
import { gambarLegenda } from "./map/legend.js";
import {
  initKontrolPeta,
  pilihKecamatan,
  segarkanBasemap,
  segarkanKartu,
} from "./map/interactions.js";
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

    const { geojson, rows } = await muatData();
    document.getElementById("pemuat")?.remove();

    const semua = rows;
    let rowsTampil = terapkanFilter(semua);

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

    /* --- peta -------------------------------------------------------------- */
    const peta = buatPeta(document.getElementById("kanvas-peta"), { gelap: isGelap() });
    gambarChoropleth(peta, geojson, semua, {
      pilih: (nama) => pilihKecamatan(nama, { dari: "peta" }),
    });

    /* --- tabel & kontrol peta ---------------------------------------------- */
    initTabel();
    onPilihBaris((nama) => pilihKecamatan(nama, { dari: "tabel" }));
    initKontrolPeta({ rows: semua, pindahTab });

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

        gambarBar(rowsTampil, {
          onPilih: (nama) => pilihKecamatan(nama, { dari: "grafik" }),
        });
        gambarScatter(rowsTampil, {
          onPilih: (nama) => pilihKecamatan(nama, { dari: "grafik" }),
        });
        segarkanTabelGrafik(isiTabel);

        // Peta tetap memuat 14 kecamatan sebagai konteks keruangan; yang
        // tersaring keluar hanya diredupkan, tidak dihilangkan.
        tandaiFilter(rowsTampil.length === semua.length ? null : rowsTampil);
        gambarLegenda();
      }

      // Pilihan yang gugur karena filter tidak boleh dibiarkan menggantung.
      if (state.terpilih && dataBerubah && !rowsTampil.some((r) => r.kecamatan === state.terpilih)) {
        pilihKecamatan(null);
        return;
      }

      tandaiTerpilih(state.terpilih);
      pilih(state.terpilih, { bukaPopup: false });
      segarkanKartu();
    }

    render();
    subscribe(render);

    /* --- peristiwa global ---------------------------------------------------- */
    onPetaAktif(() => {
      ukuranUlang();
      // Panel baru punya ukuran setelah benar-benar terlihat; bingkai awal
      // dihitung pada saat itu, bukan saat wadahnya masih 0x0.
      requestAnimationFrame(() => {
        ukuranUlang();
        fitJikaPerlu();
      });
    });

    window.addEventListener("resize", () => {
      if (!document.getElementById("panel-peta")?.hidden) ukuranUlang();
    });

    onTema(({ gelap }) => {
      // Warna dibaca dari token CSS, jadi semuanya digambar ulang setelah
      // atribut tema berganti - bukan sekadar dibalik.
      fontDashboard(palet());
      gambarUlang();
      gambarLegenda();
      perbaruiTemaBar();
      perbaruiTemaScatter();
      segarkanBasemap({ gelap });
      if (!document.getElementById("panel-peta")?.hidden) ukuranUlang();
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

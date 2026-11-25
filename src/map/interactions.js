import { getState, setState } from "../state/store.js";
import { angka } from "../data/stats.js";
import { labelSingkat } from "../data/classify.js";
import { isGelap } from "../tokens.js";
import { panelAktif } from "./layers.js";
import { pilih as pilihPeta, muatSemua } from "./choropleth.js";
import { gambarLegenda } from "./legend.js";
import { pasangBasemap, perbaruiTemaBasemap, punyaVersiGelap } from "./init.js";

/**
 * Penghubung antara kontrol di sidebar dan isi peta.
 *
 * Semua pemilihan (dari peta, dari tabel, dari grafik) melewati satu fungsi
 * `pilihKecamatan`, supaya tidak mungkin ada dua wilayah yang tampak terpilih
 * di dua tempat berbeda.
 */

let rowsRef = [];
let pindahTabKe = () => {};

export function initKontrolPeta({ rows, pindahTab }) {
  rowsRef = rows;
  pindahTabKe = pindahTab ?? (() => {});

  // --- pengalih layer ---
  for (const radio of document.querySelectorAll('input[name="layer"]')) {
    radio.addEventListener("change", () => {
      if (!radio.checked) return;
      setState({ layer: radio.value });
      gambarLegenda();
    });
  }

  // --- basemap ---
  const basemap = document.getElementById("basemap");
  basemap?.addEventListener("change", () => {
    pasangBasemap(basemap.value, { gelap: isGelap() });
  });

  // --- reset tampilan ---
  document.getElementById("reset-tampilan")?.addEventListener("click", () => {
    muatSemua();
    pilihKecamatan(null);
  });

  // --- tautan "Lihat di tabel data" pada kartu terpilih ---
  document.getElementById("terpilih-detail")?.addEventListener("click", (e) => {
    e.preventDefault();
    pindahTabKe("home");
    document
      .querySelector(`#isi-tabel tr[data-nama="${CSS.escape(getState().terpilih ?? "")}"]`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  });
}

/** Perbarui basemap saat tema berganti, tanpa membongkar peta. */
export function segarkanBasemap({ gelap }) {
  const basemap = document.getElementById("basemap");
  // Hanya basemap yang punya ubin versi gelap yang boleh dipaksa gelap.
  // Citra satelit sudah gelap dengan sendirinya, dan OSM tidak menyediakan
  // versi gelap sama sekali.
  perbaruiTemaBasemap({ gelap: gelap && punyaVersiGelap(basemap?.value) });
}

/**
 * Satu-satunya pintu untuk mengubah kecamatan terpilih.
 * `geser` hanya untuk pemilihan dari luar peta (tabel/grafik), karena
 * memindahkan peta saat pengguna mengklik di peta akan terasa melawan.
 */
export function pilihKecamatan(nama, { dari } = {}) {
  const sama = getState().terpilih === nama;
  setState({ terpilih: sama && dari !== "peta" ? null : nama });

  const nilai = getState().terpilih;
  pilihPeta(nilai, { bukaPopup: dari === "peta", geser: dari && dari !== "peta" });
  perbaruiKartuTerpilih(nilai);
}

function perbaruiKartuTerpilih(nama) {
  const kartu = document.getElementById("kartu-terpilih");
  if (!kartu) return;

  const row = nama ? rowsRef.find((r) => r.kecamatan === nama) : null;
  if (!row) {
    kartu.hidden = true;
    return;
  }

  const panel = panelAktif();
  kartu.hidden = false;

  const isi = (id, teks) => {
    const el = document.getElementById(id);
    if (el) el.textContent = teks;
  };

  isi("terpilih-nama", row.kecamatan);
  isi("terpilih-stunting", `${angka(row.stunting_pct, 2)}%`);
  isi(
    "terpilih-sanitasi",
    `${angka(row.sanitasi_pct, 2)}%${row.sanitasi_pct > 100 ? " *" : ""}`
  );
  isi("terpilih-kasus", `${angka(row.stunting_jml)} dari ${angka(row.balita_ukur)}`);
  isi("terpilih-kelas", `Kelas ${row.kelas}/5 — ${labelSingkat(row.kelas)}`);

  const tautan = document.getElementById("terpilih-detail");
  if (tautan) tautan.setAttribute("aria-label", `Lihat ${row.kecamatan} di tabel data`);

  // Judul kartu menyebut variabel yang sedang aktif supaya "terpilih" tidak
  // ambigu ketika layer diganti.
  const judul = kartu.querySelector("h3");
  if (judul) judul.textContent = `Terpilih · ${panel.nama === "stunting" ? "Stunting" : "Sanitasi"}`;
}

/** Sinkronkan ulang kartu ketika layer berganti. */
export function segarkanKartu() {
  perbaruiKartuTerpilih(getState().terpilih);
}

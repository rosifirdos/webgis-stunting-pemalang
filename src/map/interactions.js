import { getState, setState } from "../state/store.js";
import { angka } from "../data/stats.js";
import { isGelap } from "../tokens.js";
import {
  panelAktif,
  panelDeterminanAktif,
  nilaiTeks,
} from "./layers.js";
import { DETERMINAN, FIELD_BAWAAN } from "../data/determinan.js";
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

/** Indeks kapasitas selalu bertanda, mis. "+0,33" atau "−0,21". */
const idxTeksLayanan = (v) => {
  const n = Number(v);
  return `${n > 0 ? "+" : ""}${angka(n, 3)}`;
};

export function initKontrolPeta({ rows, pindahTab }) {
  rowsRef = rows;
  pindahTabKe = pindahTab ?? (() => {});

  // --- pengalih layer ---
  for (const radio of document.querySelectorAll('input[name="layer"]')) {
    radio.addEventListener("change", () => {
      if (!radio.checked) return;
      setState({ layer: radio.value });
      gambarLegenda();
      const live = document.getElementById("peta-pengumuman");
      if (live) live.textContent = `Layer peta aktif: ${panelAktif().judul}`;
    });
  }

  // --- pemilih variabel determinan ---
  // Daftar opsi dibangun dari registry, bukan ditulis di HTML, supaya label,
  // satuan, dan ketelitian angka tidak pernah berbeda antar-tempat.
  const pilihDeterminan = document.getElementById("determinan-pilih");
  if (pilihDeterminan) {
    pilihDeterminan.replaceChildren(
      ...DETERMINAN.map((d) => {
        const opsi = document.createElement("option");
        opsi.value = d.field;
        opsi.textContent = `${d.label} (${d.satuan.trim() || "indeks"})`;
        return opsi;
      })
    );
    pilihDeterminan.value = getState().determinan ?? FIELD_BAWAAN;

    // Mengganti variabel otomatis mengaktifkan layer determinan: pilihan
    // pengguna tidak boleh diam-diam tidak berefek karena radio masih di
    // layer lain.
    pilihDeterminan.addEventListener("change", () => {
      const radioDet = document.querySelector(
        'input[name="layer"][value="determinan"]'
      );
      if (radioDet) radioDet.checked = true;
      setState({ layer: "determinan", determinan: pilihDeterminan.value });
      gambarLegenda();
      const live = document.getElementById("peta-pengumuman");
      if (live) live.textContent = `Layer peta aktif: ${panelAktif().judul}`;
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
  isi("terpilih-stunting", `${angka(row.stunting_pct, 2)}% (kelas ${row.kelas}/5)`);
  isi("terpilih-prioritas", row.prioritas);
  isi("terpilih-kapasitas", idxTeksLayanan(row.idx_layanan));

  // Baris determinan mengikuti variabel yang sedang dipilih, bukan sanitasi
  // saja - supaya kartu ini tidak kembali memberi satu variabel posisi khusus.
  const det = panelDeterminanAktif();
  const nilaiDet = nilaiTeks(row, det);
  isi("terpilih-determinan-label", det.judul.replace(/ \(determinan\)$/, ""));
  isi("terpilih-determinan", `${nilaiDet.teks}${nilaiDet.diLuarSkala ? " ⚠" : ""}`);

  const tautan = document.getElementById("terpilih-detail");
  if (tautan) tautan.setAttribute("aria-label", `Lihat ${row.kecamatan} di tabel data`);

  // Judul kartu menyebut variabel yang sedang aktif supaya "terpilih" tidak
  // ambigu ketika layer diganti.
  const JUDUL = {
    stunting: "Stunting",
    determinan: det.judul.replace(/ \(determinan\)$/, ""),
    prioritas: "Tingkat prioritas",
    kapasitas: "Kapasitas layanan",
  };
  const judul = kartu.querySelector("h3");
  if (judul) judul.textContent = `Terpilih · ${JUDUL[panel.nama] ?? panel.judul}`;
}

/** Sinkronkan ulang kartu ketika layer berganti. */
export function segarkanKartu() {
  perbaruiKartuTerpilih(getState().terpilih);
}

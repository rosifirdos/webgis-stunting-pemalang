import { panelAktif, warnaKelas, RAMP_QGIS } from "./layers.js";

/**
 * Legenda peta.
 *
 * Dua tempat: panel legenda di sidebar (label kelas + rentangnya, tempat satu-
 * satunya identitas kelas dinyatakan dengan teks), dan bar gradien ringkas
 * yang mengambang di atas peta.
 *
 * Legenda tidak pernah menyandarkan identitas pada warna saja: setiap langkah
 * selalu disertai label kelas dan rentang angkanya.
 */

function jeda(el, warna) {
  const s = document.createElement("span");
  s.className = "h-3.5 w-3.5 shrink-0 rounded-[4px] border";
  s.style.background = warna;
  s.style.borderColor = "var(--color-hairline)";
  el.appendChild(s);
  return s;
}

export function gambarLegenda() {
  const panel = panelAktif();

  const judul = document.getElementById("legenda-judul");
  const isi = document.getElementById("legenda-isi");
  const catatan = document.getElementById("legenda-catatan");
  const petaJudul = document.getElementById("legenda-peta-judul");
  const petaBar = document.getElementById("legenda-peta-bar");
  if (!judul || !isi) return;

  judul.textContent = panel.judul;

  isi.replaceChildren();
  for (const k of panel.kelas) {
    const li = document.createElement("li");
    li.className = "flex items-center gap-2.5";

    jeda(li, warnaKelas(panel.nama, k.warnaIndeks + 1));

    const teks = document.createElement("span");
    teks.className = "flex min-w-0 flex-1 items-baseline justify-between gap-2";

    const label = document.createElement("span");
    label.className = "text-[13px]";
    label.textContent = k.label;

    const ket = document.createElement("span");
    ket.className = "tnum text-xs text-[var(--color-ink-3)]";
    ket.textContent = k.ket;

    teks.append(label, ket);
    li.appendChild(teks);
    isi.appendChild(li);
  }

  // Catatan kaki legenda: menjelaskan pilihan klasifikasi, bukan sekadar hiasan.
  if (catatan) catatan.textContent = panel.catatan;

  if (petaJudul) petaJudul.textContent = panel.judul;
  if (petaBar) {
    // Gradien rendah->tinggi, lima langkah yang sama dengan isi poligon.
    petaBar.style.background = `linear-gradient(to right, ${RAMP_QGIS[panel.nama].join(", ")})`;
  }
}

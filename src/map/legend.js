import { panelAktif, warnaKelas, RAMP_QGIS } from "./layers.js";

/**
 * Legenda peta.
 *
 * Dua tempat: panel legenda di sidebar (label kelas + rentangnya, tempat satu-
 * satunya identitas kelas dinyatakan dengan teks), dan bar gradien ringkas
 * yang mengambang di atas peta.
 *
 * Legenda tidak pernah menyandarkan identitas pada warna saja: setiap langkah
 * selalu disertai label kelas dan rentang angkanya. Panel kategori (tingkat
 * prioritas) memakai empat warna tetap, jadi bar ringkasnya pun menjadi
 * empat blok.
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
  const kategori = panel.jenis === "kategori";

  const judul = document.getElementById("legenda-judul");
  const isi = document.getElementById("legenda-isi");
  const catatan = document.getElementById("legenda-catatan");
  const petaJudul = document.getElementById("legenda-peta-judul");
  const petaBar = document.getElementById("legenda-peta-bar");
  const ujungRendah = document.getElementById("legenda-peta-rendah");
  const ujungTinggi = document.getElementById("legenda-peta-tinggi");
  if (!judul || !isi) return;

  judul.textContent = panel.judul;

  isi.replaceChildren();
  for (const k of panel.kelas) {
    const li = document.createElement("li");
    li.className = "flex items-center gap-2.5";

    // Panel kategori membawa warna sendiri; panel kuantil memakai ramp.
    jeda(li, k.warna ?? warnaKelas(panel.nama, k.warnaIndeks + 1));

    const teks = document.createElement("span");
    teks.className = "flex min-w-0 flex-1 items-baseline justify-between gap-2";

    const label = document.createElement("span");
    label.className = "text-[13px]";
    label.textContent = k.label;

    const ket = document.createElement("span");
    ket.className = "tnum max-w-[11rem] text-right text-xs leading-tight text-[var(--color-ink-3)]";
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
    // Panel kategori hanya punya empat warna tetap (tanpa urutan angka).
    const ramp = kategori
      ? panel.kelas.map((k) => k.warna)
      : RAMP_QGIS[panel.nama];
    petaBar.style.background = `linear-gradient(to right, ${ramp.join(", ")})`;
  }

  // Skala gradien hanya bermakna untuk kelas kuantil. Tingkat prioritas bukan
  // urutan angka, jadi label "Rendah/Tinggi" akan salah.
  if (ujungRendah) ujungRendah.textContent = kategori ? "" : "Rendah";
  if (ujungTinggi) ujungTinggi.textContent = kategori ? "" : "Tinggi";
  if (petaBar) {
    petaBar.classList.toggle("w-24", !kategori);
    petaBar.classList.toggle("w-16", kategori);
    petaBar.classList.toggle("h-2", !kategori);
    petaBar.classList.toggle("h-3", kategori);
  }
}

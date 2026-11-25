import { KELAS_STUNTING } from "../data/classify.js";
import { onInfoAktif } from "./tabs.js";

/**
 * Panel Info.
 *
 * Definisi lima kelas dirender langsung dari KELAS_STUNTING, agar HTML dan
 * logika data tidak pernah berbeda. Analisis statistik (uji determinan,
 * regresi, anomali) bukan bagian aplikasi: semuanya termuat dalam laporan
 * data yang menyertai karya ini.
 */

const el = (id) => document.getElementById(id);

function isiDefinisiKelas() {
  const wadah = el("info-kelas-definisi");
  if (!wadah) return;

  wadah.replaceChildren(
    ...KELAS_STUNTING.map((k) => {
      const baris = document.createElement("span");
      baris.className = "flex justify-between gap-3";

      const label = document.createElement("span");
      label.textContent = k.label;

      const rentang = document.createElement("span");
      rentang.className = "tnum shrink-0 text-[var(--color-ink-3)]";
      rentang.textContent = k.keterangan;

      baris.append(label, rentang);
      return baris;
    })
  );
}

export function initInfo() {
  isiDefinisiKelas();
}

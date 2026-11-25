/**
 * Token warna dibaca dari CSS custom property, bukan ditulis ulang di JS.
 * Alasannya: light/dark memakai langkah ramp yang berbeda (bukan dibalik
 * otomatis), jadi peta dan grafik harus membaca nilai yang sedang aktif dan
 * menggambar ulang saat tema berubah.
 */
export function token(nama) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(nama)
    .trim();
}

/** Lima langkah ramp token tema, mis. tokenRamp("stunting") untuk grafik. */
export function tokenRamp(nama) {
  return [1, 2, 3, 4, 5].map((i) => token(`--color-${nama}-${i}`));
}

/* --------------------------------------------------------------------------
   Tema: 'auto' | 'light' | 'dark'
   Disimpan sebagai preferensi per-penonton; gagal-aman bila storage diblokir.
   -------------------------------------------------------------------------- */
const KUNCI = "sig-tema";
const pendengar = new Set();
let mode = "light";

function terapkan() {
  const root = document.documentElement;
  if (mode === "auto") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", mode);

  const gelap =
    mode === "dark" ||
    (mode === "auto" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.style.colorScheme = gelap ? "dark" : "light";

  pendengar.forEach((fn) => fn({ mode, gelap }));
}

export function initTema() {
  try {
    const simpan = localStorage.getItem(KUNCI);
    if (simpan === "light" || simpan === "dark" || simpan === "auto") mode = simpan;
    else mode = "light";
  } catch {
    mode = "light";
  }

  // Ikuti perubahan tema sistem selama pengguna memilih 'auto'.
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      if (mode === "auto") terapkan();
    });

  terapkan();
  return mode;
}

export function getMode() {
  return mode;
}

/**
 * Apakah tema yang sedang tampil gelap?
 * Dibaca dari mode + preferensi sistem, sama seperti `terapkan()`, sehingga
 * modul lain (peta, grafik) tidak perlu menebak dari atribut DOM.
 */
export function isGelap() {
  return (
    mode === "dark" ||
    (mode === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches)
  );
}

export function setMode(baru) {
  mode = baru;
  try {
    localStorage.setItem(KUNCI, baru);
  } catch {
    /* abaikan */
  }
  terapkan();
}

export function siklusTema() {
  // light -> dark -> auto -> light
  const urutan = ["light", "dark", "auto"];
  setMode(urutan[(urutan.indexOf(mode) + 1) % urutan.length]);
  return mode;
}

export function onTema(fn) {
  pendengar.add(fn);
  return () => pendengar.delete(fn);
}

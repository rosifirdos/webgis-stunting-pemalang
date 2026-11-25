/**
 * Navigasi tab berbasis hash, sehingga setiap bagian bisa di-bookmark.
 * Seksi Peta memanggil callback saat diaktifkan karena Leaflet butuh
 * invalidateSize() ketika wadahnya baru terlihat.
 */

const URUTAN = ["home", "peta", "info"];
let saatPetaAktif = null;
let saatInfoAktif = null;

export function onPetaAktif(fn) {
  saatPetaAktif = fn;
}

/** Panel Info memuat determinan.json secara lazy saat pertama kali dibuka. */
export function onInfoAktif(fn) {
  saatInfoAktif = fn;
}

function aktifkan(nama, { fokus = false } = {}) {
  if (!URUTAN.includes(nama)) nama = "home";

  for (const t of document.querySelectorAll("[data-tab]")) {
    const aktif = t.dataset.tab === nama;
    t.setAttribute("aria-selected", String(aktif));
    t.tabIndex = aktif ? 0 : -1;
    t.classList.toggle("tab-aktif", aktif);
    t.classList.toggle("text-[var(--color-ink-2)]", !aktif);
  }

  for (const p of document.querySelectorAll("[data-panel]")) {
    p.hidden = p.dataset.panel !== nama;
  }

  if (nama === "peta" && saatPetaAktif) saatPetaAktif();
  if (nama === "info" && saatInfoAktif) saatInfoAktif();
  if (fokus) document.getElementById(`panel-${nama}`)?.focus({ preventScroll: true });

  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
}

function dariHash() {
  const nama = (location.hash || "#home").slice(1);
  aktifkan(nama);
}

export function initTabs() {
  for (const t of document.querySelectorAll("[data-tab]")) {
    t.addEventListener("click", () => {
      history.replaceState(null, "", `#${t.dataset.tab}`);
      aktifkan(t.dataset.tab, { fokus: true });
    });

    // Panah kiri/kanan antar-tab (pola WAI-ARIA tablist).
    t.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const i = URUTAN.indexOf(t.dataset.tab);
      const next = URUTAN[(i + (e.key === "ArrowRight" ? 1 : -1) + URUTAN.length) % URUTAN.length];
      document.querySelector(`[data-tab="${next}"]`)?.focus();
      history.replaceState(null, "", `#${next}`);
      aktifkan(next);
    });
  }

  window.addEventListener("hashchange", dariHash);
  dariHash();
}

/** Pindah tab secara programatik (dipakai tautan "Lihat di tabel data"). */
export function pindahTab(nama) {
  history.replaceState(null, "", `#${nama}`);
  aktifkan(nama);
}
/**
 * Animasi scroll berbasis IntersectionObserver.
 * Menghadirkan efek reveal halus (fade-in + slide-up lembut) saat elemen masuk ke viewport saat discroll.
 */

export function initScrollAnimation() {
  if (typeof window === "undefined") return;

  // Efek shadow lembut pada header saat halaman mulai discroll
  const header = document.querySelector("header");
  if (header) {
    const updateHeader = () => {
      header.classList.toggle("header-scrolled", window.scrollY > 15);
    };
    window.addEventListener("scroll", updateHeader, { passive: true });
    updateHeader();
  }

  // Jika pengguna menyetel prefers-reduced-motion, lewati animasi scroll
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  // Target elemen untuk animasi reveal saat discroll
  const targets = document.querySelectorAll(
    "#panel-home .card, #panel-home figure.card, #panel-info .card"
  );

  targets.forEach((el) => {
    el.classList.add("reveal-on-scroll");
  });

  // Staggering delay untuk kartu-kartu yang berada dalam satu baris/grid
  document.querySelectorAll(".grid").forEach((grid) => {
    const children = grid.querySelectorAll(":scope > .reveal-on-scroll");
    children.forEach((child, idx) => {
      child.style.setProperty("--reveal-delay", String(idx % 4));
    });
  });

  if (!("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("is-revealed"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          obs.unobserve(entry.target);
        }
      });
    },
    {
      root: null,
      rootMargin: "0px 0px -40px 0px",
      threshold: 0.08,
    }
  );

  targets.forEach((el) => observer.observe(el));
}


/**
 * Satu sumber kebenaran untuk state UI.
 * Semua modul (tabel, grafik, peta, KPI) berlangganan store yang sama,
 * sehingga perubahan tampilan tidak butuh refactor lintas modul.
 */
const state = {
  layer: "stunting", // layer peta aktif
  terpilih: null, // nama kecamatan yang dipilih
  kelas: "", // filter kelas kerentanan
  cari: "", // kata kunci pencarian
  urut: "stunting_pct", // kolom pengurutan tabel
  arah: "desc", // 'asc' | 'desc'
};

const pelanggan = new Set();

export function getState() {
  return state;
}

export function setState(patch) {
  let berubah = false;
  for (const [k, v] of Object.entries(patch)) {
    if (state[k] !== v) {
      state[k] = v;
      berubah = true;
    }
  }
  if (berubah) pelanggan.forEach((fn) => fn(state));
}

export function subscribe(fn) {
  pelanggan.add(fn);
  return () => pelanggan.delete(fn);
}

/** Terapkan filter + pengurutan yang aktif ke daftar baris. */
export function terapkanFilter(rows) {
  const { kelas, cari, urut, arah } = state;
  let hasil = rows;

  if (kelas) hasil = hasil.filter((r) => Number(r.kelas) === Number(kelas));

  if (cari) {
    const q = cari.toLowerCase();
    hasil = hasil.filter((r) => r.kecamatan.toLowerCase().includes(q));
  }

  const faktor = arah === "asc" ? 1 : -1;
  hasil = [...hasil].sort((a, b) => {
    const va = a[urut];
    const vb = b[urut];
    if (typeof va === "string") return va.localeCompare(vb, "id") * faktor;
    return (va - vb) * faktor;
  });

  return hasil;
}

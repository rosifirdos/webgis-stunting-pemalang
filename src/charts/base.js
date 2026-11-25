import {
  Chart,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  ScatterController,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { token } from "../tokens.js";

/**
 * Registrasi terpilih (tree-shaking Chart.js v4): hanya controller, elemen,
 * dan skala yang benar-benar dipakai. Tanpa ini, `type: "scatter"` gagal
 * dengan "scatter is not a registered controller".
 *
 * Legend didaftarkan karena grafik batang kini punya dua penanda: batang
 * stunting (seri utama) dan titik sanitasi (pembanding). Grafik lain tetap
 * mematikan legend lewat `options.plugins.legend.display = false`.
 */
Chart.register(
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  ScatterController,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
);

/** Palet grafik dibaca dari token tema yang sedang aktif. */
export function palet() {
  return {
    ink: token("--color-ink"),
    ink2: token("--color-ink-2"),
    ink3: token("--color-ink-3"),
    hairline: token("--color-hairline"),
    surface: token("--color-surface"),
    stunting: [1, 2, 3].map((i) => token(`--color-stunting-${i}`)),
    sanitasi: [1, 2, 3].map((i) => token(`--color-sanitasi-${i}`)),
  };
}

/** Gaya tooltip bersama: permukaan kartu, bukan kotak hitam bawaan. */
export function gayaTip(p) {
  return {
    backgroundColor: p.surface,
    titleColor: p.ink,
    bodyColor: p.ink2,
    borderColor: p.hairline,
    borderWidth: 1,
    cornerRadius: 8,
    padding: 10,
    displayColors: false,
    titleFont: { size: 12, weight: "600" },
    bodyFont: { size: 12 },
    caretSize: 5,
  };
}

export function fontDashboard(p) {
  Chart.defaults.font.family = getComputedStyle(
    document.documentElement
  ).getPropertyValue("--font-sans");
  Chart.defaults.font.size = 11;
  Chart.defaults.color = p.ink2;
  Chart.defaults.animation = window.matchMedia("(prefers-reduced-motion: reduce)")
    .matches
    ? false
    : { duration: 320 };
}

/**
 * Tulis nilai di ujung tiap batang.
 *
 * Opsi plugin diambil Chart.js dari `options.plugins.labelBatang` (bukan dari
 * objek plugin itu sendiri) - lihat docs Chart.js "Plugin options".
 */
export const pluginLabelBatang = {
  id: "labelBatang",
  afterDatasetsDraw(chart, _args, opsi) {
    if (!opsi?.aktif) return;
    const { ctx, chartArea } = chart;
    const meta = chart.getDatasetMeta(0);
    const fmt = opsi.format ?? ((v) => String(v));

    ctx.save();
    ctx.font = "500 11px " + Chart.defaults.font.family;
    ctx.textBaseline = "middle";
    for (let i = 0; i < meta.data.length; i++) {
      const el = meta.data[i];
      const teks = fmt(chart.data.datasets[0].data[i]);
      const lebar = ctx.measureText(teks).width;
      // Di dalam batang bila ujungnya sudah dekat tepi kanan area gambar.
      const muatLuar = el.x + 8 + lebar <= chartArea.right;
      ctx.fillStyle = muatLuar ? opsi.warna : opsi.warnaDalam;
      ctx.textAlign = muatLuar ? "left" : "right";
      ctx.fillText(teks, muatLuar ? el.x + 7 : el.x - 7, el.y);
    }
    ctx.restore();
  },
};

/**
 * Label langsung selektif untuk diagram sebar - hanya indeks yang diminta
 * (mis. nilai ekstrem dan anomali), bukan angka di setiap titik.
 */
export const pluginLabelPoin = {
  id: "labelPoin",
  afterDatasetsDraw(chart, _args, opsi) {
    const idx = opsi?.indeks ?? [];
    if (!idx.length) return;
    const { ctx, chartArea } = chart;
    const meta = chart.getDatasetMeta(0);

    ctx.save();
    ctx.font = "500 11px " + Chart.defaults.font.family;
    ctx.textBaseline = "middle";
    for (const i of idx) {
      const el = meta.data[i];
      if (!el) continue;
      const teks = opsi.teks?.[i] ?? "";
      const lebar = ctx.measureText(teks).width;
      // Tempatkan label di sisi yang masih punya ruang.
      const kanan = el.x + 10 + lebar <= chartArea.right - 4;
      ctx.textAlign = kanan ? "left" : "right";
      ctx.fillStyle = opsi.warna;
      ctx.fillText(teks, kanan ? el.x + 10 : el.x - 10, el.y);
    }
    ctx.restore();
  },
};

/** Hapus instance lama sebelum menggambar ulang (Chart.js tidak reuse). */
export function hapus(chart) {
  chart?.destroy();
  return null;
}

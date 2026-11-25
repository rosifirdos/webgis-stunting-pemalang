import { Chart } from "chart.js";
import { token } from "../tokens.js";
import { angka } from "../data/stats.js";
import { labelSingkat } from "../data/classify.js";
import { palet, gayaTip, pluginLabelPoin } from "./base.js";

/**
 * Diagram sebar: akses sanitasi layak (x) vs prevalensi stunting (y),
 * satu titik = satu kecamatan.
 *
 * Kenapa sebar: pertanyaannya adalah hubungan antara dua besaran kontinu,
 * bukan peringkat. Sebar memperlihatkan bentuk sebaran sekaligus
 * menyediakan tempat untuk menyatakan kelemahannya secara jujur.
 *
 * Satu seri saja -> tidak ada kotak legenda; judul dan sumbu sudah menamai
 * kedua variabel. Semua titik memakai satu warna karena warna tidak sedang
 * mengemban tugas identitas apa pun di sini.
 *
 * Garis tren ditambahkan hanya sebagai alat baca arah, bukan model prediksi,
 * dan kekuatan hubungannya dinyatakan eksplisit di bawah grafik (r dan R2),
 * supaya arah yang menurun tidak ditafsirkan sebagai hubungan yang kuat.
 */

let inst = null;

/** Regresi linear sederhana (least squares) untuk garis tren. */
function regresi(xs, ys) {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let atas = 0;
  let bawah = 0;
  for (let i = 0; i < n; i++) {
    atas += (xs[i] - mx) * (ys[i] - my);
    bawah += (xs[i] - mx) ** 2;
  }
  const m = bawah ? atas / bawah : 0;
  return { m, b: my - m * mx };
}

/**
 * Garis acuan x = 100%.
 *
 * Nilai sanitasi di atas 100% mustahil sebagai proporsi, jadi batas ini
 * digambar agar titik Warungpring terbaca sebagai anomali data yang berada
 * di luar skala, bukan sebagai capaian yang luar biasa.
 */
const pluginBatasSkala = {
  id: "batasSkala",
  afterDatasetsDraw(chart, _a, opsi) {
    if (!opsi?.aktif) return;
    const x = chart.scales.x.getPixelForValue(100);
    const { top, bottom, right } = chart.chartArea;
    if (x < chart.chartArea.left || x > right) return;

    const ctx = chart.ctx;
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.strokeStyle = opsi.warna;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = "500 10px " + Chart.defaults.font.family;
    ctx.fillStyle = opsi.warna;
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillText("batas 100%", x - 4, top + 2);
    ctx.restore();
  },
};

function pasangTinggi() {
  const kotak = document.querySelector('[data-chart="scatter"]');
  if (kotak) kotak.style.height = "320px";
}

/** Titik yang diberi label langsung: ekstrem dan anomali, bukan semuanya. */
function titikPenting(rows) {
  const idx = new Set();
  const teks = {};

  const maks = rows.reduce((a, b) => (b.stunting_pct > a.stunting_pct ? b : a));
  const minSan = rows.reduce((a, b) => (b.sanitasi_pct < a.sanitasi_pct ? b : a));
  for (const r of [maks, minSan]) {
    idx.add(rows.indexOf(r));
    teks[rows.indexOf(r)] = r.kecamatan;
  }
  for (const r of rows.filter((x) => x.sanitasi_pct > 100)) {
    idx.add(rows.indexOf(r));
    teks[rows.indexOf(r)] = `${r.kecamatan} *`;
  }
  return { indeks: [...idx], teks };
}

export function gambarScatter(rows, { onPilih } = {}) {
  const canvas = document.getElementById("grafik-scatter");
  if (!canvas) return null;

  const p = palet();
  const data = [...rows].sort((a, b) => a.sanitasi_pct - b.sanitasi_pct);
  const xs = data.map((r) => r.sanitasi_pct);
  const ys = data.map((r) => r.stunting_pct);
  const { m, b } = regresi(xs, ys);

  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const pad = (xMax - xMin) * 0.12;
  const garisX = [xMin - pad, xMax + pad];

  const titik = titikPenting(data);
  const warnaTitik = token("--color-sanitasi-2");
  const warnaAnomali = token("--color-warning");

  pasangTinggi();
  inst?.destroy();

  inst = new Chart(canvas, {
    type: "scatter",
    data: {
      datasets: [
        {
          label: "Kecamatan",
          data: data.map((r) => ({ x: r.sanitasi_pct, y: r.stunting_pct })),
          backgroundColor: data.map((r) =>
            r.sanitasi_pct > 100 ? warnaAnomali : warnaTitik
          ),
          // Cincin 2px warna permukaan pada tanda yang bertumpuk, agar titik
          // yang berdekatan tetap terbaca sebagai dua titik.
          borderColor: p.surface,
          borderWidth: 2,
          pointRadius: 5.5,
          pointHoverRadius: 7.5,
          // Area klik lebih besar dari tanda (>= 24px diameter sasaran).
          pointHitRadius: 14,
        },
        {
          label: "Garis tren",
          type: "line",
          data: garisX.map((x) => ({ x, y: m * x + b })),
          borderColor: p.ink3,
          borderWidth: 2,
          borderDash: [6, 5],
          pointRadius: 0,
          pointHitRadius: 0,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      onClick: (_e, els) => {
        if (els.length && els[0].datasetIndex === 0) {
          onPilih?.(data[els[0].index].kecamatan);
        }
      },
      onHover: (e, els) => {
        e.native.target.style.cursor = els.length ? "pointer" : "default";
      },
      layout: { padding: { right: 40, top: 12 } },
      // Sasaran hover membesar: jarak terdekat menang, tidak perlu tepat di titik.
      interaction: { mode: "nearest", intersect: false, axis: "xy" },
      scales: {
        x: {
          type: "linear",
          min: xMin - pad,
          max: xMax + pad,
          title: {
            display: true,
            text: "Akses sanitasi layak (%)",
            color: p.ink2,
            font: { size: 11, weight: "500" },
            padding: { top: 6 },
          },
          grid: { color: p.hairline, drawTicks: false, lineWidth: 1 },
          border: { display: false },
          ticks: { color: p.ink3, padding: 5, font: { size: 11 }, callback: (v) => `${angka(v, 0)}%` },
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Prevalensi stunting (%)",
            color: p.ink2,
            font: { size: 11, weight: "500" },
            padding: { bottom: 6 },
          },
          grid: { color: p.hairline, drawTicks: false, lineWidth: 1 },
          border: { display: false },
          ticks: { color: p.ink3, padding: 5, font: { size: 11 }, callback: (v) => `${angka(v, 0)}%` },
        },
      },
      plugins: {
        legend: { display: false },
        // Opsi plugin inline dibaca Chart.js dari `options.plugins.<id>`,
        // bukan dari objek plugin di array `plugins`.
        labelPoin: {
          indeks: titik.indeks,
          teks: titik.teks,
          warna: p.ink2,
        },
        batasSkala: { aktif: true, warna: p.ink3 },
        tooltip: {
          ...gayaTip(p),
          // Satu tooltip per titik (bukan per sumbu) untuk diagram sebar.
          mode: "nearest",
          intersect: false,
          callbacks: {
            title: (items) => data[items[0].dataIndex].kecamatan,
            label: (item) => {
              const r = data[item.dataIndex];
              return [
                `Sanitasi layak ${angka(r.sanitasi_pct, 2)}%`,
                `Stunting ${angka(r.stunting_pct, 2)}%`,
                r.sanitasi_pct > 100
                  ? "Nilai melebihi 100% — capaian program, bukan proporsi"
                  : `Kelas ${r.kelas}/5 — ${labelSingkat(r.kelas)} · ${angka(r.stunting_jml)} kasus`,
              ];
            },
          },
        },
      },
    },
    plugins: [pluginLabelPoin, pluginBatasSkala],
  });

  inst.$data = data;
  return inst;
}

/** Versi tabel dari diagram sebar: nilai persis kedua variabel. */
export function tabelScatter(rows) {
  const data = [...rows].sort((a, b) => a.sanitasi_pct - b.sanitasi_pct);
  return `
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <caption class="sr-only">Nilai sanitasi layak dan stunting per kecamatan</caption>
        <thead>
          <tr class="border-b border-[var(--color-hairline)] text-left text-xs text-[var(--color-ink-2)]">
            <th scope="col" class="py-2 pr-3 font-medium">Kecamatan</th>
            <th scope="col" class="py-2 pr-3 text-right font-medium">Sanitasi layak</th>
            <th scope="col" class="py-2 pr-3 text-right font-medium">Stunting</th>
            <th scope="col" class="py-2 pr-0 text-right font-medium">Kasus / diukur</th>
          </tr>
        </thead>
        <tbody>
          ${data
            .map(
              (r) => `
            <tr class="border-b border-[var(--color-hairline)] last:border-0">
              <td class="py-1.5 pr-3">${r.kecamatan}${
                r.sanitasi_pct > 100
                  ? ' <span class="text-[var(--color-warning)]" title="Nilai di atas 100%">*</span>'
                  : ""
              }</td>
              <td class="tnum py-1.5 pr-3 text-right">${angka(r.sanitasi_pct, 2)}%</td>
              <td class="tnum py-1.5 pr-3 text-right">${angka(r.stunting_pct, 2)}%</td>
              <td class="tnum py-1.5 pr-0 text-right text-[var(--color-ink-2)]">
                ${angka(r.stunting_jml)} / ${angka(r.balita_ukur)}
              </td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>`;
}

export function perbaruiTemaScatter() {
  if (!inst) return;
  const p = palet();
  const data = inst.$data;
  const warnaTitik = token("--color-sanitasi-2");
  const warnaAnomali = token("--color-warning");

  inst.data.datasets[0].backgroundColor = data.map((r) =>
    r.sanitasi_pct > 100 ? warnaAnomali : warnaTitik
  );
  inst.data.datasets[0].borderColor = p.surface;
  inst.data.datasets[1].borderColor = p.ink3;

  for (const k of ["x", "y"]) {
    inst.options.scales[k].grid.color = p.hairline;
    inst.options.scales[k].ticks.color = p.ink3;
    inst.options.scales[k].title.color = p.ink2;
  }
  Object.assign(inst.options.plugins.tooltip, gayaTip(p));
  if (inst.options.plugins.labelPoin) inst.options.plugins.labelPoin.warna = p.ink2;
  if (inst.options.plugins.batasSkala) inst.options.plugins.batasSkala.warna = p.ink3;
  inst.update("none");
}

export function hapusScatter() {
  inst?.destroy();
  inst = null;
}

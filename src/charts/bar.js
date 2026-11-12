import { Chart } from "chart.js";
import { token } from "../tokens.js";
import { panelAktif } from "../map/layers.js";
import { angka } from "../data/stats.js";
import { palet, gayaTip, pluginLabelBatang } from "./base.js";

/**
 * Diagram batang horizontal: peringkat 14 kecamatan menurut prevalensi
 * stunting.
 *
 * Kenapa horizontal: nama kecamatan adalah label kategori yang panjang.
 * Pada batang tegak, 14 nama harus diputar 45-90 derajat agar tidak
 * bertumpuk, dan teks miring jauh lebih lambat dibaca daripada teks datar.
 *
 * Kenapa batang, bukan peta saja: peringkat adalah pertanyaan "siapa yang
 * paling tinggi", sedangkan peta menjawab "di mana". Keduanya dibutuhkan.
 *
 * Satu seri saja, jadi tidak ada kotak legenda - judul kartu sudah menamai
 * variabelnya. Warna mengikuti kelas kecamatan (atribut wilayah itu sendiri),
 * bukan peringkatnya, sehingga memfilter data tidak mengecat ulang sisanya.
 */

let inst = null;

const TINGGI_PER_BAR = 26; // px; cukup untuk label 13px + celah

/** Tinggi wadah mengikuti jumlah batang agar tidak ada scroll bersarang. */
function pasangTinggi(n) {
  const kotak = document.querySelector('[data-chart="bar"]');
  if (kotak) kotak.style.height = `${Math.max(220, n * TINGGI_PER_BAR + 44)}px`;
}

function warnaBatang(row) {
  // Warna dari kelas stunting wilayah itu sendiri (Rendah/Sedang/Tinggi).
  const i = row.kelas === "Tinggi" ? 3 : row.kelas === "Sedang" ? 2 : 1;
  return token(`--color-stunting-${i}`);
}

export function gambarBar(rows, { onPilih } = {}) {
  const canvas = document.getElementById("grafik-bar");
  if (!canvas) return null;

  const p = palet();
  const data = [...rows].sort((a, b) => a.stunting_pct - b.stunting_pct);

  pasangTinggi(data.length);
  inst?.destroy();

  inst = new Chart(canvas, {
    type: "bar",
    data: {
      labels: data.map((r) => r.kecamatan),
      datasets: [
        {
          label: "Prevalensi stunting (%)",
          data: data.map((r) => r.stunting_pct),
          backgroundColor: data.map(warnaBatang),
          hoverBackgroundColor: data.map(warnaBatang),
          // Ujung data membulat; pangkal menempel rata di garis nol.
          borderRadius: { topLeft: 0, bottomLeft: 0, topRight: 4, bottomRight: 4 },
          borderSkipped: false,
          // 2px celah permukaan antar-batang.
          barPercentage: 0.72,
          categoryPercentage: 0.86,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      // Klik batang memilih kecamatan - sama seperti klik poligon di peta.
      onClick: (_e, els) => {
        if (els.length) onPilih?.(data[els[0].index].kecamatan);
      },
      onHover: (e, els) => {
        e.native.target.style.cursor = els.length ? "pointer" : "default";
      },
      layout: { padding: { right: 46, top: 4, bottom: 2 } },
      scales: {
        x: {
          beginAtZero: true,
          suggestedMax: Math.max(...data.map((r) => r.stunting_pct)) * 1.12,
          grid: { color: p.hairline, drawTicks: false, lineWidth: 1 },
          border: { display: false },
          ticks: {
            color: p.ink3,
            padding: 6,
            font: { size: 11 },
            callback: (v) => `${angka(v, 0)}%`,
          },
        },
        y: {
          grid: { display: false },
          border: { display: false },
          ticks: { color: p.ink2, font: { size: 12 }, padding: 4, crossAlign: "far" },
        },
      },
      plugins: {
        legend: { display: false },
        // Opsi plugin inline dibaca Chart.js dari `options.plugins.<id>`,
        // bukan dari objek plugin di array `plugins`.
        labelBatang: {
          aktif: true,
          warna: p.ink2,
          warnaDalam: p.surface,
          format: (v) => `${angka(v, 2)}%`,
        },
        tooltip: {
          ...gayaTip(p),
          callbacks: {
            title: (items) => data[items[0].dataIndex].kecamatan,
            label: (item) => {
              const r = data[item.dataIndex];
              return [
                `${angka(r.stunting_pct, 2)}% balita stunting`,
                `${angka(r.stunting_jml)} dari ${angka(r.balita_ukur)} balita diukur`,
                `Kelas ${r.kelas} · sanitasi ${angka(r.sanitasi_pct, 1)}%`,
              ];
            },
          },
        },
      },
    },
    plugins: [pluginLabelBatang],
  });

  // Simpan data urut untuk tampilan tabel alternatif.
  inst.$data = data;
  return inst;
}

/** Versi tabel dari grafik batang (aksesibilitas + nilai persis). */
export function tabelBar(rows) {
  const data = [...rows].sort((a, b) => b.stunting_pct - a.stunting_pct);
  return `
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <caption class="sr-only">Peringkat prevalensi stunting per kecamatan</caption>
        <thead>
          <tr class="border-b border-[var(--color-hairline)] text-left text-xs text-[var(--color-ink-2)]">
            <th scope="col" class="py-2 pr-3 font-medium">#</th>
            <th scope="col" class="py-2 pr-3 font-medium">Kecamatan</th>
            <th scope="col" class="py-2 pr-3 text-right font-medium">Stunting</th>
            <th scope="col" class="py-2 pr-3 text-right font-medium">Kelas</th>
          </tr>
        </thead>
        <tbody>
          ${data
            .map(
              (r, i) => `
            <tr class="border-b border-[var(--color-hairline)] last:border-0">
              <td class="tnum py-1.5 pr-3 text-[var(--color-ink-3)]">${i + 1}</td>
              <td class="py-1.5 pr-3">${r.kecamatan}</td>
              <td class="tnum py-1.5 pr-3 text-right">${angka(r.stunting_pct, 2)}%</td>
              <td class="py-1.5 pr-3 text-right text-[var(--color-ink-2)]">${r.kelas}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>`;
}

export function perbaruiTemaBar() {
  if (!inst) return;
  const p = palet();
  const data = inst.$data;
  inst.data.datasets[0].backgroundColor = data.map(warnaBatang);
  inst.data.datasets[0].hoverBackgroundColor = data.map(warnaBatang);
  inst.options.scales.x.grid.color = p.hairline;
  inst.options.scales.x.ticks.color = p.ink3;
  inst.options.scales.y.ticks.color = p.ink2;
  Object.assign(inst.options.plugins.tooltip, gayaTip(p));
  const label = inst.options.plugins.labelBatang;
  if (label) {
    label.warna = p.ink2;
    label.warnaDalam = p.surface;
  }
  inst.update("none");
}

export function hapusBar() {
  inst?.destroy();
  inst = null;
}

/**
 * Foto kegiatan sebagai bagian tata letak.
 *
 * Empat foto dipakai sebagai elemen visual halaman — bukan galeri tersendiri:
 * satu di hero Home, satu pita lebar sebelum tabel, satu di kepala kolom info
 * peta, dan satu di kepala halaman Info. Semuanya mengisi slot yang sudah ada
 * di index.html lewat atribut data-foto / data-embed, jadi urutan dan
 * penempatannya tetap urusan tata letak, bukan urusan modul ini.
 *
 * Satu daftar di bawah ini mengisi seluruh slot sekaligus daftar kredit di
 * halaman Info. Ditulis sekali agar kredit tidak bisa lepas dari fotonya:
 * menambah foto berarti menambah satu entri, dan atribusinya ikut terbawa.
 *
 * Tiga hal yang dipegang:
 *
 * 1. Foto-foto ini BUKAN dokumentasi Kabupaten Pemalang. Kegiatan aslinya
 *    berlangsung di Kota Singkawang, Kabupaten Malang, dan Kabupaten
 *    Tangerang. Setiap gambar karena itu menyebut lokasi aslinya tepat di
 *    bawah atau di atas gambarnya, supaya tidak terbaca sebagai kondisi di
 *    Pemalang.
 * 2. Atribusi memuat tautan ke pemilik berkas. Itu syarat yang dinyatakan
 *    sumbernya, bukan sekadar kredit sopan.
 * 3. Berkasnya disalin ke public/media, tidak di-hotlink ke server sumber.
 *    Hotlink akan membebani server lembaga lain setiap kali halaman ini
 *    dibuka, dan gambarnya ikut mati begitu berkas aslinya dipindahkan.
 *
 * Mengganti atau menghapus foto cukup dilakukan pada objek FOTO: gambarnya,
 * kreditnya, dan catatan lokasinya ikut berubah.
 */

const BASE = import.meta.env.BASE_URL;

const FOTO = {
  hero: {
    berkas: "pemeriksaan-tumbuh-kembang.webp",
    judul: "Pemeriksaan tumbuh kembang balita",
    alt: "Petugas kesehatan bersarung tangan memeriksa tumbuh kembang seorang anak di meja berlapis kain batik, didampingi ibunya dan sejumlah warga.",
    kegiatan: "Pemeriksaan tumbuh kembang dan antropometri balita",
    lokasi: "Desa Klepu, Kabupaten Malang, Jawa Timur",
    tanggal: "18 September 2025",
    w: 840,
    h: 630,
    pemilik: "P3M Poltekkes Kemenkes Malang",
    urlHalaman:
      "https://p3m.poltekkes-malang.ac.id/berita/detail/edukasi-pemantauan-tumbuh-kembang-balita-melalui-pengabdian-masyarakat-di-desa-klepu",
    urlBerkas: "https://p3m.poltekkes-malang.ac.id/asset/foto_berita/124.jpg",
  },
  band: {
    // Dua potongan untuk satu slot. Rasio yang pas untuk layar lebar (4,4:1)
    // akan jadi pita setipis 80px di ponsel, dan sebaliknya potongan 1,8:1
    // memotong subjeknya di layar lebar. Jadi pemotongannya dilakukan di
    // berkas — sekali, dengan bias yang sudah diperiksa — bukan lewat
    // object-cover yang tidak bisa menghindari subjek di kedua ujung rasio.
    berkas: "pita-lebar.webp",
    berkasSempit: "pita-sempit.webp",
    judul: "Pengukuran panjang badan balita",
    alt: "Bayi berbaring di atas papan ukur panjang badan di serambi rumah, sambil didampingi tiga kader kesehatan.",
    kegiatan: "Pelayanan posyandu",
    lokasi: "Wilayah penerbit: Kabupaten Tangerang, Banten",
    tanggal: null,
    w: 1600,
    h: 360,
    wSempit: 760,
    hSempit: 420,
    pemilik: "Puskesmas Kelapa Dua, Kabupaten Tangerang",
    urlHalaman: "https://pkm-kelapadua.tangerangkab.go.id/",
    urlBerkas:
      "https://pkm-kelapadua.tangerangkab.go.id/storage/photos/217/67ca86bfb1089.jpeg",
  },
  peta: {
    berkas: "pengukuran-serentak-balita.webp",
    judul: "Pengukuran serentak balita",
    alt: "Bayi berbaring di atas timbangan di hadapan sejumlah ibu dan balita di dalam ruangan, dengan layar presentasi di latar belakang.",
    kegiatan: "Program Pengukuran Serentak Balita",
    lokasi: "Kantor Wali Kota Singkawang, Kalimantan Barat",
    tanggal: "20 Mei 2025",
    w: 720,
    h: 405,
    pemilik: "Singkawang Media Informasi",
    urlHalaman:
      "https://singkawangmedia.com/pengukuran-serentak-balita-upaya-cegah-stunting",
    urlBerkas:
      "https://singkawangmedia.s3.ap-southeast-1.amazonaws.com/posts/01JVRPG9DF2Q99SKPVN1PR6AWF.jpg",
  },
  info: {
    berkas: "penimbangan-berat-balita.webp",
    judul: "Penimbangan berat badan balita",
    alt: "Balita berdiri di atas timbangan bayi sambil dipegang dua kader berhijab dan bermasker di tengah keramaian posyandu.",
    kegiatan: "Posyandu",
    lokasi: "Lokasi kegiatan tidak disebutkan pada sumber",
    tanggal: null,
    w: 1196,
    h: 672,
    pemilik: "KG Newsroom",
    urlHalaman: "https://www.kgnewsroom.com/",
    urlBerkas:
      "https://asset.kgnewsroom.com/photo/pre/2023/06/18/9b245500-e789-4e5b-80e8-e32e92ce64e0_jpg.jpg",
  },
};

const KELAS_TAUTAN = "text-[var(--color-link)] underline-offset-2 hover:underline";

/** Elemen dibuat lewat DOM, bukan innerHTML, agar teks dari luar tidak bisa
 *  disisipkan sebagai markup. */
function el(tag, kelas, teks) {
  const n = document.createElement(tag);
  if (kelas) n.className = kelas;
  if (teks != null) n.textContent = teks;
  return n;
}

function tautan(kelas, teks, href) {
  const a = el("a", kelas, teks);
  a.href = href;
  // rel "noopener" menutup akses window.opener dari halaman tujuan; noreferrer
  // mencegah halaman sumber menerima referer dari situs ini.
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  return a;
}

function gambar(f, kelas, prioritas) {
  const img = el("img", kelas);
  img.src = `${BASE}media/${f.berkas}`;
  img.alt = f.alt;
  img.decoding = "async";
  if (!prioritas) img.loading = "lazy";
  // Dimensi intrinsic ditulis eksplisit agar tata letak tidak bergeser saat
  // gambar selesai dimuat (menghindari Cumulative Layout Shift).
  img.width = f.w;
  img.height = f.h;

  // Foto yang punya potongan sempit dibungkus <picture>. Browser memilih
  // satu sumber saja saat memuat — yang tidak terpilih tidak diunduh.
  if (f.berkasSempit) {
    const pic = el("picture");
    const sumber = el("source");
    sumber.media = "(max-width: 640px)";
    sumber.srcset = `${BASE}media/${f.berkasSempit}`;
    sumber.width = f.wSempit;
    sumber.height = f.hSempit;
    pic.append(sumber, img);
    return pic;
  }
  return img;
}

/**
 * Keterangan yang menumpuk di atas gambar.
 *
 * Latar hitamnya pekat dan tidak memakai gradien yang memudar ke nol: teks
 * putih 11-13px butuh kontras AA di atas piksel apa pun, dan foto ini terang
 * di beberapa bagian. Pada kepekatan 0,70 lapisan itu menyisakan kontras
 * sekitar 8:1 bahkan bila piksel di bawahnya benar-benar putih.
 */
function keteranganAtas(f) {
  const cap = el(
    "figcaption",
    "absolute inset-x-0 bottom-0 bg-black/70 px-2.5 py-2 text-white"
  );
  cap.append(el("p", "text-[12px] font-medium leading-snug", f.judul));
  cap.append(
    el("p", "mt-0.5 text-[11px] leading-snug text-white/85", f.lokasi)
  );
  const kredit = el("p", "mt-0.5 text-[11px] leading-snug text-white/85");
  kredit.append(document.createTextNode("Foto: "));
  // Tautan di atas latar hitam memakai putih bergaris bawah, bukan biru:
  // token tautan situs ini dirancang untuk permukaan terang/gelap, bukan
  // untuk ditumpuk di atas foto.
  kredit.append(
    tautan("underline underline-offset-2 hover:text-white", f.pemilik, f.urlHalaman)
  );
  cap.append(kredit);
  return cap;
}

function bingkai(f, kelasBingkai, kelasGambar, prioritas, keterangan) {
  const fig = el("figure", kelasBingkai);
  fig.append(gambar(f, kelasGambar, prioritas));
  fig.append(keterangan ? keterangan(f) : keteranganAtas(f));
  return fig;
}

/**
 * Keterangan di bawah gambar, untuk slot yang gambarnya tidak dipotong paksa.
 * Dipakai pita lebar: keterangan bertumpuk di atas foto akan menutupi subjek
 * pada pita yang tinggi tampilnya hanya 288px.
 */
function keteranganBawah(f) {
  const cap = el(
    "figcaption",
    "flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-t border-[var(--color-hairline)] bg-[var(--color-surface)] px-3 py-2"
  );
  cap.append(el("p", "text-[12px] font-medium leading-snug", f.judul));
  cap.append(el("p", "text-[11px] leading-snug text-[var(--color-ink-3)]", f.lokasi));
  const kredit = el("p", "text-[11px] leading-snug text-[var(--color-ink-3)]");
  kredit.append(document.createTextNode("Foto: "));
  kredit.append(tautan(KELAS_TAUTAN, f.pemilik, f.urlHalaman));
  cap.append(kredit);
  return cap;
}

/* --- Kepala panel: gambar dengan keterangan di bawahnya ------------------- */

function kartuKepala(f) {
  const kotak = el("div", "flex flex-col");
  kotak.append(
    el(
      "p",
      "mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-3)]",
      "Foto kegiatan"
    )
  );

  const bingkaiGambar = el(
    "div",
    "overflow-hidden rounded-lg border border-[var(--color-hairline)]"
  );
  bingkaiGambar.append(gambar(f, "aspect-[16/9] w-full object-cover"));
  kotak.append(bingkaiGambar);

  kotak.append(
    el(
      "p",
      "mt-2 text-[12px] leading-snug text-[var(--color-ink-2)]",
      f.judul
    )
  );
  kotak.append(
    el("p", "mt-0.5 text-[11px] leading-snug text-[var(--color-ink-3)]", f.lokasi)
  );

  const kredit = el("p", "mt-1 text-[11px] leading-snug text-[var(--color-ink-3)]");
  kredit.append(document.createTextNode("Foto: "));
  kredit.append(tautan(KELAS_TAUTAN, f.pemilik, f.urlHalaman));
  kotak.append(kredit);

  return kotak;
}

/* --- Daftar kredit di halaman Info --------------------------------------- */

function barisKredit(f, peran) {
  const li = el(
    "li",
    "flex flex-col gap-0.5 border-t border-[var(--color-hairline)] pt-3 first:border-t-0 first:pt-0"
  );
  li.append(
    el("p", "text-[13px] font-medium leading-snug text-[var(--color-ink)]", f.judul)
  );
  li.append(
    el(
      "p",
      "text-[11px] leading-snug text-[var(--color-ink-3)]",
      `Ditampilkan di: ${peran}`
    )
  );

  const rincian = [f.pemilik, f.lokasi, f.tanggal].filter(Boolean).join(" · ");
  li.append(
    el("p", "mt-0.5 text-xs leading-relaxed text-[var(--color-ink-2)]", rincian)
  );

  const barisTautan = el("p", "mt-0.5 text-xs leading-relaxed");
  barisTautan.append(tautan(KELAS_TAUTAN, "Halaman sumber", f.urlHalaman));
  barisTautan.append(el("span", "text-[var(--color-ink-3)]", " · "));
  barisTautan.append(tautan(KELAS_TAUTAN, "Berkas asli", f.urlBerkas));
  li.append(barisTautan);

  return li;
}

const PERAN = {
  hero: "hero halaman Home",
  band: "pita sebelum tabel data",
  peta: "kepala kolom info peta",
  info: "kepala halaman Info",
};

/** Mengganti wadah cadangan di HTML dengan gambar sebenarnya. */
function isi(tempat, simpul) {
  if (!tempat) return;
  tempat.replaceChildren(...(Array.isArray(simpul) ? simpul : [simpul]));
}

export function initFoto() {
  isi(
    document.querySelector('[data-foto="hero"]'),
    bingkai(
      FOTO.hero,
      "relative h-56 w-full overflow-hidden rounded-xl border border-[var(--color-hairline)] sm:h-full sm:min-h-[260px]",
      "absolute inset-0 h-full w-full object-cover",
      true // gambar hero tampil di layar pertama, jangan ditunda
    )
  );

  isi(
    document.querySelector('[data-foto="band"]'),
    bingkai(
      FOTO.band,
      "overflow-hidden rounded-xl border border-[var(--color-hairline)]",
      // Berkasnya sudah dipotong pada rasio slotnya, jadi tinggi mengikuti
      // rasio gambar dan tidak ada pemotongan ulang lewat CSS.
      "block h-auto w-full",
      false,
      keteranganBawah
    )
  );

  isi(
    document.querySelector('[data-embed="peta"]'),
    kartuKepala(FOTO.peta)
  );

  isi(
    document.querySelector('[data-embed="info"]'),
    kartuKepala(FOTO.info)
  );

  const daftar = document.querySelector("[data-kredit-foto]");
  if (daftar) {
    daftar.replaceChildren(
      ...Object.entries(FOTO).map(([kunci, f]) => barisKredit(f, PERAN[kunci]))
    );
  }
}

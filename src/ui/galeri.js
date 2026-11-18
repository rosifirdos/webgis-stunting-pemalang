/**
 * Foto sebagai bagian komposisi halaman.
 *
 * Empat foto masuk ke komposisi, bukan ke galeri tersendiri: satu mengisi
 * latar hero Home, satu menjadi pita selebar jendela sebelum tabel, dan dua
 * menjadi latar judul (masthead) halaman Peta dan Info. Slotnya sudah ada di
 * index.html lewat atribut data-foto / data-kredit; modul ini hanya mengisi,
 * tidak menentukan posisi. Tata letak tetap urusan HTML.
 *
 * Satu daftar di bawah ini mengisi seluruh slot sekaligus daftar kredit di
 * halaman Info. Ditulis sekali agar kredit tidak bisa lepas dari fotonya:
 * menambah foto berarti menambah satu entri, dan atribusinya ikut terbawa.
 *
 * Tiga hal yang dipegang:
 *
 * 1. Foto-foto ini BUKAN dokumentasi Kabupaten Pemalang. Kegiatan aslinya
 *    berlangsung di Kota Singkawang, Kabupaten Malang, dan Kabupaten
 *    Tangerang. Setiap slot karena itu tetap membawa satu baris kredit berisi
 *    lokasi aslinya — di dasar hero, di dasar masthead, dan di bawah pita.
 *    Foto selebar jendela paling mudah disalahartikan sebagai potret daerah
 *    ini, jadi kreditnya tidak boleh pindah ke kaki halaman.
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
    // Sumbernya satu-satunya yang beresolusi cukup untuk selebar jendela.
    // Dua potongan untuk dua ujung layar: bingkai 16:9 dipakai apa adanya di
    // desktop, sedangkan di ponsel rasio hero jauh lebih tegak sehingga
    // potongan 4:5 mempertahankan ibu, bayi, dan papan ukurnya sekaligus.
    berkas: "hero-pengukuran-panjang-badan.webp",
    berkasSempit: "hero-pengukuran-panjang-badan-sempit.webp",
    judul: "Pengukuran panjang badan balita",
    alt: "Seorang kader berbaju batik memegang kaki bayi yang berbaring di papan ukur panjang badan, didampingi dua kader berhijab di serambi rumah.",
    kegiatan: "Pengukuran panjang badan balita",
    lokasi: "Wilayah penerbit: Kabupaten Tangerang, Banten",
    lokasiSingkat: "Kabupaten Tangerang, Banten",
    tanggal: null,
    w: 2100,
    h: 1182,
    wSempit: 900,
    hSempit: 1125,
    pemilik: "Puskesmas Kelapa Dua, Kabupaten Tangerang",
    urlHalaman: "https://pkm-kelapadua.tangerangkab.go.id/",
    urlBerkas:
      "https://pkm-kelapadua.tangerangkab.go.id/storage/photos/217/67ca86bfb1089.jpeg",
  },
  band: {
    // Sumber hanya 1000px; pita dibuat 2,6:1 supaya tinggi tampilnya wajar
    // (sekitar 550px di layar 1440) dan pemotongannya jatuh di luar subjek.
    // Potongan 1,6:1 untuk ponsel, karena pita 2,6:1 di layar 390px hanya
    // setinggi ~150px dan wajahnya hilang.
    berkas: "pita-lebar.webp",
    berkasSempit: "pita-sempit.webp",
    judul: "Pemeriksaan tumbuh kembang balita",
    alt: "Petugas bersarung tangan memeriksa tangan seorang anak di meja berlapis kain batik, didampingi ibunya dan sejumlah warga.",
    kegiatan: "Pemeriksaan tumbuh kembang dan antropometri balita",
    lokasi: "Desa Klepu, Kabupaten Malang, Jawa Timur",
    lokasiSingkat: "Desa Klepu, Kabupaten Malang, Jawa Timur",
    tanggal: "18 September 2025",
    w: 1400,
    h: 539,
    wSempit: 1000,
    hSempit: 625,
    pemilik: "P3M Poltekkes Kemenkes Malang",
    urlHalaman:
      "https://p3m.poltekkes-malang.ac.id/berita/detail/edukasi-pemantauan-tumbuh-kembang-balita-melalui-pengabdian-masyarakat-di-desa-klepu",
    urlBerkas: "https://p3m.poltekkes-malang.ac.id/asset/foto_berita/124.jpg",
  },
  peta: {
    // Foto asli masthead-pengukuran-serentak.webp hanya 720×405px — terlalu
    // kecil untuk container selebar jendela desktop (maks 1400px) sehingga
    // gambar pecah saat diperbesar object-fit:cover. Diganti dengan foto hero
    // yang beresolusi 2100×1182px agar tampil tajam di semua ukuran layar.
    berkas: "hero-pengukuran-panjang-badan.webp",
    berkasSempit: "hero-pengukuran-panjang-badan-sempit.webp",
    judul: "Pengukuran panjang badan balita",
    alt: "Seorang kader berbaju batik memegang kaki bayi yang berbaring di papan ukur panjang badan, didampingi dua kader berhijab di serambi rumah.",
    kegiatan: "Pengukuran panjang badan balita",
    lokasi: "Wilayah penerbit: Kabupaten Tangerang, Banten",
    lokasiSingkat: "Kabupaten Tangerang, Banten",
    tanggal: null,
    w: 2100,
    h: 1182,
    wSempit: 900,
    hSempit: 1125,
    pemilik: "Puskesmas Kelapa Dua, Kabupaten Tangerang",
    urlHalaman: "https://pkm-kelapadua.tangerangkab.go.id/",
    urlBerkas:
      "https://pkm-kelapadua.tangerangkab.go.id/storage/photos/217/67ca86bfb1089.jpeg",
  },
  info: {
    berkas: "masthead-penimbangan-berat.webp",
    judul: "Penimbangan berat badan balita",
    alt: "Balita berdiri di atas timbangan bayi sambil dipegang dua kader berhijab dan bermasker di tengah keramaian posyandu.",
    kegiatan: "Posyandu",
    lokasi: "Lokasi kegiatan tidak disebutkan pada sumber",
    lokasiSingkat: "lokasi kegiatan tidak disebutkan pada sumber",
    tanggal: null,
    w: 1197,
    h: 673,
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

/**
 * Gambar dengan dimensi intrinsic eksplisit, agar tata letak tidak bergeser
 * saat gambar selesai dimuat (CLS). Foto yang punya potongan sempit dibungkus
 * <picture>: browser memilih satu sumber saja saat memuat, yang tidak terpilih
 * tidak diunduh.
 */
function gambar(f, kelas, { prioritas = false } = {}) {
  const img = el("img", kelas);
  img.src = `${BASE}media/${f.berkas}`;
  img.alt = f.alt;
  img.decoding = "async";
  img.width = f.w;
  img.height = f.h;

  if (prioritas) {
    // Foto hero adalah elemen terbesar di layar pertama; menundanya justru
    // menunda LCP.
    img.fetchPriority = "high";
  } else {
    img.loading = "lazy";
  }

  if (f.berkasSempit) {
    const pic = el("picture", "block h-full w-full");
    const sumber = el("source");
    sumber.media = "(max-width: 640px)";
    sumber.srcset = `${BASE}media/${f.berkasSempit}`;
    pic.append(sumber, img);
    return pic;
  }
  return img;
}

/* --- Teks kredit --------------------------------------------------------- */

/**
 * Satu baris kredit yang menempel pada gambarnya.
 *
 * Lokasi asli wajib ada di baris ini, bukan hanya di daftar Info: foto selebar
 * jendela mudah dibaca sebagai potret Kabupaten Pemalang, dan kredit yang
 * terpisah satu halaman tidak menolong pembaca yang tidak pernah membukanya.
 *
 * `terang` untuk teks di atas foto (putih), bukan token tautan situs — token
 * itu dirancang untuk permukaan terang/gelap, bukan untuk ditumpuk di atas
 * piksel foto.
 */
function kredit(f, { terang = false, judul = false, kelas = "" } = {}) {
  const p = el("p", kelas);
  if (judul) {
    p.append(el("span", "font-medium", f.judul));
    p.append(document.createTextNode(" — "));
  }
  p.append(document.createTextNode("Foto: "));
  p.append(
    tautan(
      terang
        ? "underline decoration-white/40 underline-offset-2 hover:decoration-white"
        : KELAS_TAUTAN,
      f.pemilik,
      f.urlHalaman
    )
  );
  p.append(document.createTextNode(` · ${f.lokasiSingkat}. `));
  p.append(
    el(
      "span",
      terang ? "text-white/60" : "text-[var(--color-ink-3)]",
      "Ilustrasi kegiatan, bukan dokumentasi Kabupaten Pemalang."
    )
  );
  return p;
}

/** Mengisi satu elemen kredit yang sudah ada di HTML (bukan membuat <p> baru,
 *  karena slotnya sendiri sudah berupa paragraf). */
function isiKredit(selektor, f, opsi) {
  const tempat = document.querySelector(selektor);
  if (tempat) tempat.replaceChildren(...kredit(f, opsi).childNodes);
}

/* --- Slot: latar hero / masthead ----------------------------------------- */

/** Gambar penutup penuh. Wadahnya absolute inset-0, jadi gambar mengisi
 *  seluruh bidang tanpa ikut menentukan tinggi — tinggi hero datang dari
 *  class min-h di HTML, sehingga tidak ada lompatan saat gambar dimuat.
 *
 *  `kelasPosisi` memilih bagian foto yang dipertahankan saat rasio wadahnya
 *  jauh lebih lebar daripada berkasnya. Hero diisi potret ibu-bayi yang
 *  subjeknya di tengah-bawah, jadi cukup pembawaan .foto-tutup (42%);
 *  masthead hanya setinggi 190-230px dan harus menyisakan bayi di papan ukur,
 *  bukan atap dan langit-langit, jadi memakai .foto-tutup-bawah (70%). */
function fotoPenutup(f, { prioritas = false, kelasPosisi = "" } = {}) {
  return gambar(f, `foto-tutup${kelasPosisi ? ` ${kelasPosisi}` : ""}`, { prioritas });
}

/* --- Slot: pita selebar jendela ------------------------------------------ */

/**
 * Pita foto dengan kredit di bawahnya, bukan ditumpuk di atas gambar.
 * Kredit bertumpuk akan menutupi subjek pada pita yang tingginya hanya
 * beberapa ratus piksel.
 */
function pita(f) {
  const fig = el("figure", "relative w-full");
  fig.append(
    // max-height menjaga pita tetap pita di layar sangat lebar; pada 2560px
    // rasio 2,6:1 akan menghasilkan gambar setinggi 980px.
    gambar(f, "block h-auto max-h-[560px] w-full object-cover")
  );

  const cap = el(
    "figcaption",
    "border-y border-[var(--color-hairline)] bg-[var(--color-surface)]"
  );
  const isi = el(
    "div",
    "mx-auto w-full max-w-[1400px] px-4 py-2.5 sm:px-6"
  );
  isi.append(
    kredit(f, {
      judul: true,
      kelas: "text-[12px] leading-snug text-[var(--color-ink-2)]",
    })
  );
  cap.append(isi);
  fig.append(cap);
  return fig;
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
  hero: "latar hero halaman Home",
  band: "pita sebelum tabel data",
  peta: "masthead halaman Peta",
  info: "masthead halaman Info",
};

/** Mengganti wadah cadangan di HTML dengan gambar sebenarnya. */
function isi(tempat, simpul) {
  if (!tempat) return;
  tempat.replaceChildren(...(Array.isArray(simpul) ? simpul : [simpul]));
}

export function initFoto() {
  isi(
    document.querySelector('[data-foto="hero"]'),
    fotoPenutup(FOTO.hero, { prioritas: true })
  );
  isiKredit("[data-kredit-hero]", FOTO.hero, { terang: true });


  isi(document.querySelector('[data-foto="info"]'), fotoPenutup(FOTO.info, { kelasPosisi: "foto-tutup-bawah" }));
  isiKredit('[data-kredit="info"]', FOTO.info, { terang: true });

  const daftar = document.querySelector("[data-kredit-foto]");
  if (daftar) {
    daftar.replaceChildren(
      ...Object.entries(FOTO).map(([kunci, f]) => barisKredit(f, PERAN[kunci]))
    );
  }
}
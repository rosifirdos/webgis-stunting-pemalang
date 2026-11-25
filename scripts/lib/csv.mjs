/**
 * Pembaca CSV minimal tanpa dependency.
 *
 * Dibutuhkan karena sumber atribut (Profil Kesehatan per kecamatan) memakai
 * tanda kutip ganda dan koma di dalam kutipan; memecah dengan split(",") akan
 * menggeser kolom dan membuat join DBF<->CSV diam-diam salah.
 *
 * Mendukung: BOM UTF-8, CRLF/LF, kutip ganda berpasangan (""), nilai kosong.
 * Mengembalikan array objek dengan header sebagai kunci.
 */
export function bacaCsv(teks) {
  const bersih = teks.charCodeAt(0) === 0xfeff ? teks.slice(1) : teks;
  const baris = [];
  let sel = [];
  let isi = "";
  let dalamKutip = false;

  for (let i = 0; i < bersih.length; i++) {
    const c = bersih[i];

    if (dalamKutip) {
      if (c === '"') {
        if (bersih[i + 1] === '"') {
          isi += '"';
          i++;
        } else {
          dalamKutip = false;
        }
      } else {
        isi += c;
      }
      continue;
    }

    if (c === '"') {
      dalamKutip = true;
    } else if (c === ",") {
      sel.push(isi);
      isi = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && bersih[i + 1] === "\n") i++;
      sel.push(isi);
      isi = "";
      if (sel.length > 1 || sel[0] !== "") baris.push(sel);
      sel = [];
    } else {
      isi += c;
    }
  }

  if (isi !== "" || sel.length) {
    sel.push(isi);
    if (sel.length > 1 || sel[0] !== "") baris.push(sel);
  }

  const [header, ...records] = baris;
  if (!header) return [];
  const kunci = header.map((h) => h.trim());
  return records.map((r) =>
    Object.fromEntries(kunci.map((k, i) => [k, r[i] ?? ""]))
  );
}

/** Kunci join: trim + lowercase, supaya "MOGA" dan "Moga" bertemu. */
export const kunci = (v) => String(v ?? "").trim().toLowerCase();

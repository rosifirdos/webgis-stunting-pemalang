/**
 * Registry variabel determinan yang punya nilai per kecamatan.
 *
 * Dari 95 determinan yang diuji (lihat panel Info), hanya sembilan yang
 * tersedia di GeoJSON. Kesembilan itulah yang bisa dipetakan - dan semuanya
 * diperlakukan sama: satu kelas kuantil yang dihitung dari datanya sendiri,
 * warna ramp yang sama, tanpa satu pun yang dijadikan pembanding khusus.
 *
 * `desimal` mengikuti ketelitian sumber (jumlah orang tanpa desimal), dan
 * `satuan` dipakai apa adanya di legenda, tooltip, popup, serta kartu
 * terpilih, supaya tidak ada format angka yang ditulis ulang di tiap modul.
 */
export const DETERMINAN = [
  { field: "sanitasi_pct", label: "Sanitasi layak", satuan: "%", desimal: 2 },
  { field: "sanitasi_aman_pct", label: "Sanitasi aman", satuan: "%", desimal: 2 },
  { field: "sanitasi_jml", label: "KK sanitasi layak", satuan: " KK", desimal: 0 },
  { field: "asi_eksklusif_pct", label: "ASI eksklusif", satuan: "%", desimal: 2 },
  { field: "catin_anemia_pct", label: "Catin anemia", satuan: "%", desimal: 2 },
  { field: "balita_ds_pct", label: "Cakupan penimbangan balita", satuan: "%", desimal: 2 },
  { field: "kk_sbs_pct", label: "KK stop BABS", satuan: "%", desimal: 2 },
  { field: "kk_ctps_pct", label: "KK CTPS", satuan: "%", desimal: 2 },
  { field: "pilar5_pct", label: "Desa 5 pilar STBM", satuan: "%", desimal: 2 },
];

/** Determinan yang tampil saat layer pertama kali dibuka. */
export const FIELD_BAWAAN = DETERMINAN[0].field;

/** Cari definisi determinan; jatuh ke variabel pertama bila field tak dikenal. */
export function determinanDari(field) {
  return DETERMINAN.find((d) => d.field === field) ?? DETERMINAN[0];
}

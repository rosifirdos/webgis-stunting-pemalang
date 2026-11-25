# -*- coding: utf-8 -*-
"""Ekspor layout QGIS 'Indeks Kapasitas Layanan 2024' -> PNG 300 dpi.

Dipakai pada Fase R1b. QGIS tetap sumber gambar; skrip ini hanya menduplikasi
layout 'Peta Prevalensi Stunting 2024' (gaya, posisi, skala bar, legenda) lalu
mengganti judul/subjudul/sumber dan layer peta. Tidak menyimpan .qgz, jadi
berkas di ../output tidak berubah.

Jalankan:
  & "C:\\Program Files\\QGIS 3.44.16\\bin\\python-qgis-ltr.bat" scripts/ekspor-peta-kapasitas.py
"""
import os
import sys

from qgis.core import (
    Qgis,
    QgsApplication,
    QgsLayoutExporter,
    QgsLayoutItemLabel,
    QgsLayoutItemLegend,
    QgsLayoutItemMap,
    QgsProject,
)
from qgis.PyQt.QtCore import Qt

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT = os.path.join(ROOT, "..", "output", "Pemalang_Stunting_Sanitasi_2024.qgz")
OUT = os.path.join(ROOT, "public", "peta", "peta-kapasitas-layanan.png")

SRC_LAYOUT = "Peta Prevalensi Stunting 2024"
NEW_LAYOUT = "Indeks Kapasitas Layanan 2024"
LAYER = "Indeks Kapasitas Layanan 2024"

TITLE = "INDEKS KAPASITAS LAYANAN KECAMATAN\nKABUPATEN PEMALANG TAHUN 2024"
SUBTITLE = "Klasifikasi: Quantile - 5 kelas | makin tinggi = kapasitas layanan makin baik"
SOURCE = (
    "Sumber: Profil Kesehatan Kabupaten Pemalang 2024 | Batas adm.: LapakGIS\n"
    "Catatan: bukan indeks risiko dan bukan skor baku nasional."
)


def main():
    qgs = QgsApplication([], False)
    qgs.initQgis()
    try:
        project = QgsProject.instance()
        if not project.read(os.path.abspath(PROJECT)):
            raise SystemExit("Gagal membuka proyek: " + PROJECT)

        layer = project.mapLayersByName(LAYER)
        if not layer:
            raise SystemExit("Layer tidak ditemukan: " + LAYER)
        layer = layer[0]

        # Legenda mengikuti layer proyek, bukan layer peta. Buang layer lain
        # dari proyek sementara (proses ini terpisah dari QGIS yang sedang
        # dibuka dan .qgz tidak disimpan) supaya legenda hanya memuat layer
        # kapasitas.
        for lyr in list(project.mapLayers().values()):
            if lyr.id() != layer.id():
                project.removeMapLayer(lyr.id())
        print("renderer:", layer.renderer().type(), "| kelas:", len(layer.renderer().ranges()))

        manager = project.layoutManager()
        src = manager.layoutByName(SRC_LAYOUT)
        if src is None:
            raise SystemExit("Layout sumber tidak ditemukan: " + SRC_LAYOUT)

        dup = manager.duplicateLayout(src, NEW_LAYOUT)
        if dup is None:
            raise SystemExit("duplicateLayout gagal")

        diganti = 0
        peta = [it for it in dup.items() if isinstance(it, QgsLayoutItemMap)]
        for item in peta:
            item.setLayers([layer])
            item.setKeepLayerSet(True)

        for item in dup.items():
            if isinstance(item, QgsLayoutItemLabel):
                teks = item.text()
                if teks.startswith("PETA PREVALENSI"):
                    item.setText(TITLE)
                    diganti += 1
                elif teks.startswith("Klasifikasi:"):
                    item.setText(SUBTITLE)
                    diganti += 1
                elif teks.startswith("Sumber:"):
                    item.setText(SOURCE)
                    diganti += 1
            elif isinstance(item, QgsLayoutItemLegend):
                # Legenda hasil duplikasi memuat semua layer proyek. Bangun
                # ulang setelah layer lain dibuang.
                item.setAutoUpdateModel(True)
                item.setLegendFilterByMapEnabled(True)
                item.setTitle("Legenda")
                item.updateLegend()

        if diganti != 3:
            raise SystemExit("Label judul/subjudul/sumber tidak lengkap: %d/3" % diganti)

        for item in dup.items():
            if isinstance(item, QgsLayoutItemMap):
                print("peta        :", [x.name() for x in item.layers()])
                print("extent      :", item.extent().toString())
            if isinstance(item, QgsLayoutItemLabel):
                print("label       :", item.text().replace("\n", " / "))
            if isinstance(item, QgsLayoutItemLegend):
                model = item.model()
                for i in range(model.rowCount()):
                    print("legenda     :", model.data(model.index(i, 0), Qt.DisplayRole))
                akar = model.index(0, 0)
                for i in range(model.rowCount(akar)):
                    print(
                        "  kelas     :",
                        model.data(model.index(i, 0, akar), Qt.DisplayRole),
                    )

        os.makedirs(os.path.dirname(OUT), exist_ok=True)
        if os.path.exists(OUT):
            os.remove(OUT)
        exporter = QgsLayoutExporter(dup)
        settings = QgsLayoutExporter.ImageExportSettings()
        settings.dpi = 300
        hasil = exporter.exportToImage(os.path.abspath(OUT), settings)
        if hasil != QgsLayoutExporter.Success:
            raise SystemExit("Ekspor gagal, kode: %s" % hasil)

        print("OK:", OUT, os.path.getsize(OUT), "bytes")
        print("QGIS:", Qgis.QGIS_VERSION)
    finally:
        qgs.exitQgis()


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Genera el afiche A4 para pegar en los postes del barrio, con el QR
genérico incrustado (el mismo QR para todo el barrio — no uno por negocio).

Uso típico (una vez que ya tengas tu dominio real):
    python3 generar_qr.py https://tu-dominio-real.com/
    python3 generar_afiche.py

Si corrés este script sin haber generado antes qr_barrio.png con tu URL
real, el afiche sale con el QR de EJEMPLO (apunta a https://example.com/,
el único dominio "de ejemplo" reservado oficialmente por IANA/ICANN, así
que nunca muestra contenido real de terceros) — sirve para ver el diseño,
pero no hay que imprimir ni pegar ese.
"""
import argparse
import os

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

HERE = os.path.dirname(os.path.abspath(__file__))

# Paleta igual a la del sitio (frontend/tailwind.config.js) para que el
# afiche se sienta parte del mismo proyecto.
ORANGE_600 = HexColor("#ea580c")
ORANGE_500 = HexColor("#f97316")
ORANGE_50 = HexColor("#fff7ed")
INK_900 = HexColor("#191d27")
INK_600 = HexColor("#4c5870")
WHITE = HexColor("#ffffff")


def draw_wrapped(c, text, x, y, max_width, font_name, font_size, leading, color, align="left"):
    """Dibuja texto partiéndolo en líneas que entren en max_width. Devuelve la nueva y (debajo del bloque)."""
    c.setFont(font_name, font_size)
    c.setFillColor(color)
    words = text.split()
    lines, current = [], ""
    for w in words:
        trial = (current + " " + w).strip()
        if pdfmetrics.stringWidth(trial, font_name, font_size) <= max_width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = w
    if current:
        lines.append(current)

    for line in lines:
        if align == "center":
            c.drawCentredString(x, y, line)
        else:
            c.drawString(x, y, line)
        y -= leading
    return y


def generar(salida: str, qr_path: str, url_mostrada: str):
    width, height = A4
    c = canvas.Canvas(salida, pagesize=A4)

    # Fondo general cálido
    c.setFillColor(ORANGE_50)
    c.rect(0, 0, width, height, fill=1, stroke=0)

    # --- Banda superior naranja con el gancho principal ---
    band_h = 78 * mm
    c.setFillColor(ORANGE_600)
    c.rect(0, height - band_h, width, band_h, fill=1, stroke=0)

    margin = 14 * mm
    y = height - 24 * mm
    y = draw_wrapped(
        c,
        "¿HAY UN NEGOCIO DEL BARRIO QUE NO APARECE EN GOOGLE MAPS?",
        width / 2, y, width - 2 * margin,
        "Helvetica-Bold", 27, 33, WHITE, align="center"
    )
    y -= 4 * mm
    y = draw_wrapped(
        c,
        "Un almacén, una peluquería, un taller… ayudanos a que lo encuentren.",
        width / 2, y, width - 2 * margin,
        "Helvetica", 15, 19, WHITE, align="center"
    )

    # --- QR grande y centrado ---
    qr_size = 72 * mm
    qr_x = (width - qr_size) / 2
    qr_y = height - band_h - qr_size - 14 * mm

    # marco blanco con borde para que resalte sobre el fondo
    pad = 6 * mm
    c.setFillColor(WHITE)
    c.setStrokeColor(ORANGE_600)
    c.setLineWidth(2.2)
    c.roundRect(qr_x - pad, qr_y - pad, qr_size + 2 * pad, qr_size + 2 * pad, 6, fill=1, stroke=1)

    if os.path.exists(qr_path):
        c.drawImage(qr_path, qr_x, qr_y, width=qr_size, height=qr_size, preserveAspectRatio=True, mask="auto")
    else:
        c.setFillColor(INK_600)
        c.setFont("Helvetica", 12)
        c.drawCentredString(width / 2, qr_y + qr_size / 2, f"(falta {os.path.basename(qr_path)})")

    # Texto debajo del QR: instrucción + URL legible a mano
    y = qr_y - pad - 10 * mm
    c.setFont("Helvetica-Bold", 16)
    c.setFillColor(INK_900)
    c.drawCentredString(width / 2, y, "ESCANEÁ EL CÓDIGO — TARDÁS 1 MINUTO")
    y -= 7 * mm
    c.setFont("Helvetica", 11)
    c.setFillColor(INK_600)
    c.drawCentredString(width / 2, y, f"o entrá directamente desde el navegador a: {url_mostrada}")

    # --- Dos columnas: vecino/a vs dueño/a ---
    y_cols_top = y - 16 * mm
    col_w = (width - 2 * margin - 10 * mm) / 2
    col_h = 46 * mm

    def columna(x, titulo, lineas):
        c.setFillColor(WHITE)
        c.setStrokeColor(ORANGE_500)
        c.setLineWidth(1.4)
        c.roundRect(x, y_cols_top - col_h, col_w, col_h, 5, fill=1, stroke=1)
        ty = y_cols_top - 10 * mm
        c.setFont("Helvetica-Bold", 13.5)
        c.setFillColor(ORANGE_600)
        c.drawCentredString(x + col_w / 2, ty, titulo)
        ty -= 9 * mm
        for linea in lineas:
            ty = draw_wrapped(c, linea, x + col_w / 2, ty, col_w - 10 * mm, "Helvetica", 11, 14, INK_900, align="center")
            ty -= 1.5 * mm

    columna(
        margin,
        "¿SOS VECINO/A O CLIENTE?",
        ["Contanos qué negocio es y dónde queda.", "Nosotros nos encargamos de avisarle al dueño/a."]
    )
    columna(
        margin + col_w + 10 * mm,
        "¿SOS EL/LA DUEÑO/A?",
        ["Sumalo vos mismo/a, con tu propia cuenta de Google.",
         "Vos confirmás todo antes de publicar — nunca sin tu autorización."]
    )

    # --- Footer ---
    c.setFont("Helvetica-Bold", 13)
    c.setFillColor(INK_900)
    c.drawCentredString(width / 2, margin + 8 * mm, "Negocios de Barrio")
    c.setFont("Helvetica", 9.5)
    c.setFillColor(INK_600)
    c.drawCentredString(width / 2, margin + 3 * mm, "Ayudando a que el comercio de cercanía aparezca en el mapa.")

    c.showPage()
    c.save()
    print(f"Afiche generado -> {salida}")


def generar_minimal(salida: str, qr_path: str, url_mostrada: str):
    """Versión 'banner': casi todo el espacio es el QR, con el mínimo texto
    posible — pensada para que se lea de lejos o en una miniatura (WhatsApp,
    estado, etc.), no para explicar el funcionamiento completo."""
    width, height = A4
    c = canvas.Canvas(salida, pagesize=A4)

    c.setFillColor(ORANGE_50)
    c.rect(0, 0, width, height, fill=1, stroke=0)

    # --- Banda superior naranja: una sola línea de gancho ---
    band_h = 46 * mm
    c.setFillColor(ORANGE_600)
    c.rect(0, height - band_h, width, band_h, fill=1, stroke=0)

    margin = 14 * mm
    draw_wrapped(
        c,
        "¿TU NEGOCIO NO ESTÁ EN GOOGLE MAPS?",
        width / 2, height - band_h / 2 - 6, width - 2 * margin,
        "Helvetica-Bold", 30, 34, WHITE, align="center"
    )

    # --- QR gigante, protagonista de la página ---
    qr_size = 130 * mm
    qr_x = (width - qr_size) / 2
    qr_y = (height - band_h - qr_size) / 2 + 20 * mm

    pad = 7 * mm
    c.setFillColor(WHITE)
    c.setStrokeColor(ORANGE_600)
    c.setLineWidth(2.5)
    c.roundRect(qr_x - pad, qr_y - pad, qr_size + 2 * pad, qr_size + 2 * pad, 8, fill=1, stroke=1)

    if os.path.exists(qr_path):
        c.drawImage(qr_path, qr_x, qr_y, width=qr_size, height=qr_size, preserveAspectRatio=True, mask="auto")
    else:
        c.setFillColor(INK_600)
        c.setFont("Helvetica", 14)
        c.drawCentredString(width / 2, qr_y + qr_size / 2, f"(falta {os.path.basename(qr_path)})")

    # --- Una sola línea abajo del QR ---
    y = qr_y - pad - 14 * mm
    c.setFont("Helvetica-Bold", 20)
    c.setFillColor(INK_900)
    c.drawCentredString(width / 2, y, "ESCANEÁ Y SUMALO")
    y -= 9 * mm
    c.setFont("Helvetica", 12)
    c.setFillColor(INK_600)
    c.drawCentredString(width / 2, y, url_mostrada)

    # --- Footer mínimo ---
    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(INK_900)
    c.drawCentredString(width / 2, margin + 4 * mm, "Negocios de Barrio")

    c.showPage()
    c.save()
    print(f"Banner generado -> {salida}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--qr", default=os.path.join(HERE, "qr_barrio.png"), help="Ruta al PNG del QR (generado con generar_qr.py)")
    parser.add_argument("--salida", default=os.path.join(HERE, "afiche_barrio.pdf"), help="Archivo PDF de salida")
    parser.add_argument("--url-mostrada", default="example.com", help="Texto corto de la URL para quien no pueda escanear")
    parser.add_argument("--minimal", action="store_true", help="Genera la versión banner, con mucho menos texto (QR gigante + una sola línea)")
    args = parser.parse_args()

    if args.minimal:
        generar_minimal(args.salida, args.qr, args.url_mostrada)
    else:
        generar(args.salida, args.qr, args.url_mostrada)

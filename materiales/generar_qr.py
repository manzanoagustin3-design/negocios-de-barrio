#!/usr/bin/env python3
"""
Genera el código QR genérico para pegar en los postes del barrio.

Es UN SOLO QR para todo el barrio (no uno por negocio): apunta siempre a la
home del formulario público (/), donde la encuesta pregunta primero "¿sos
el/la dueño/a?" y deriva a cada persona por la rama que corresponde.

Uso:
    python3 generar_qr.py https://tu-dominio-real.com/
    python3 generar_qr.py https://tu-dominio-real.com/ --salida qr_barrio.png

Si no se pasa ninguna URL, genera el QR con example.com
(https://example.com/) — es el único dominio de "ejemplo" reservado
oficialmente por IANA/ICANN para documentación, así que NUNCA va a mostrar
contenido real de terceros (a diferencia de un nombre como "tudominio.com",
que puede estar registrado de verdad por cualquiera). Aun así, esto es
ÚTIL SOLO PARA VER CÓMO QUEDA EL AFICHE; hay que volver a correr este
script con la URL real antes de imprimir y pegar nada.
"""
import argparse
import qrcode
from qrcode.constants import ERROR_CORRECT_H

DEFAULT_URL = "https://example.com/"


def generar(url: str, salida: str):
    qr = qrcode.QRCode(
        version=None,
        error_correction=ERROR_CORRECT_H,  # alta corrección: sigue siendo legible si se ensucia o rompe un poco en el poste
        box_size=20,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    img.save(salida)
    print(f"QR generado para {url!r} -> {salida}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("url", nargs="?", default=DEFAULT_URL, help="URL pública del formulario (home del frontend)")
    parser.add_argument("--salida", default="qr_barrio.png", help="Archivo PNG de salida")
    args = parser.parse_args()

    if args.url == DEFAULT_URL:
        print("⚠️  Usando el dominio de EJEMPLO. Volvé a correr con tu URL real antes de imprimir el afiche.")

    generar(args.url, args.salida)

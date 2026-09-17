#!/usr/bin/env python3
"""
Prepara as fotos do pavilhão para o site.

As fotos saem do telemóvel com 4000 px de largura e vários MB. Aqui ficam com a
largura certa para o site, comprimidas, e **sem metadados** - que é a parte que
interessa: uma foto de telemóvel traz a localização GPS e a data exata, e estas
são fotos de crianças num sítio conhecido. Nada disso deve ir para a internet.

Uso:
    python3 tools/preparar-fotos-pavilhao.py                 (trata tudo)
    python3 tools/preparar-fotos-pavilhao.py ficheiro.jpg nome-final

Os originais ficam em assets/img/pavilhao/_originais/ e não vão para o
repositório - estão no .gitignore, como os retratos da equipa.
"""

import os
import sys
import shutil
import subprocess
import tempfile
import unicodedata
from PIL import Image, ImageOps

DESTINO = "assets/img/pavilhao"
ORIGENS = os.path.join(DESTINO, "_originais")

# O maior sítio onde uma destas fotos aparece é a metade da grelha de 1360 px.
# 1600 chega para ecrãs de alta densidade sem inchar o peso da página.
LARGURA_MAX = 1600
QUALIDADE = 78


def abrir(caminho):
    """
    Abre a foto. O HEIC do iPhone a Pillow não lê, por isso passa primeiro
    pelo sips, que vem com o macOS.
    """
    if caminho.lower().endswith((".heic", ".heif")):
        tmp = os.path.join(tempfile.mkdtemp(), "convertida.png")
        subprocess.run(["sips", "-s", "format", "png", caminho, "--out", tmp],
                       check=True, capture_output=True)
        im = Image.open(tmp)
        im.load()
        shutil.rmtree(os.path.dirname(tmp), ignore_errors=True)
        return im
    return Image.open(caminho)


def preparar(origem, nome):
    im = ImageOps.exif_transpose(abrir(origem))        # respeita a rotação
    im = im.convert("RGB")

    if im.width > LARGURA_MAX:
        altura = round(im.height * LARGURA_MAX / im.width)
        im = im.resize((LARGURA_MAX, altura), Image.LANCZOS)

    # Image.new + paste deita fora todo o EXIF, incluindo o GPS.
    limpa = Image.new("RGB", im.size)
    limpa.paste(im)

    os.makedirs(DESTINO, exist_ok=True)
    saida = os.path.join(DESTINO, nome + ".jpg")
    limpa.save(saida, "JPEG", quality=QUALIDADE, optimize=True, progressive=True)

    kb = os.path.getsize(saida) // 1024
    print(f"  {os.path.basename(origem)}  ->  {saida}  ({limpa.width}x{limpa.height}, {kb} KB)")
    return saida


def nome_ficheiro(caminho):
    """'IMG_2160.HEIC' -> 'img-2160'"""
    base = os.path.splitext(os.path.basename(caminho))[0].lower()
    base = unicodedata.normalize("NFD", base)
    base = "".join(c for c in base if not unicodedata.combining(c))
    base = "".join(c if c.isalnum() else " " for c in base)
    return "-".join(base.split())


if __name__ == "__main__":
    if len(sys.argv) == 3:
        preparar(sys.argv[1], sys.argv[2])
    elif len(sys.argv) == 1:
        if not os.path.isdir(ORIGENS):
            sys.exit(f"Não existe {ORIGENS}")
        fotos = sorted(
            os.path.join(ORIGENS, f) for f in os.listdir(ORIGENS)
            if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp", ".heic"))
        )
        if not fotos:
            sys.exit(f"Nenhuma foto em {ORIGENS}")
        print(f"A preparar {len(fotos)} foto(s):")
        for f in fotos:
            preparar(f, nome_ficheiro(f))
    else:
        sys.exit(__doc__)

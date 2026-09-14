#!/usr/bin/env python3
"""
Uniformiza os retratos da equipa técnica.

Aceita fotos de origens diferentes (estúdio, recorte com fundo transparente,
recorte sobre branco) e produz retratos 3:4 coerentes entre si: mesmo fundo,
mesmo enquadramento e mesmo tratamento de cor.

Uso:
    python3 tools/preparar-fotos.py ficheiro.jpg nome-final
    python3 tools/preparar-fotos.py --todas          (processa a pasta _originais)

Os originais ficam em assets/img/equipa/_originais/ e não vão para o site.
"""

import sys
import os
from PIL import Image, ImageOps, ImageEnhance, ImageChops

# Fundo neutro claro, próximo do cinzento de estúdio, para que fotos recortadas
# e fotos de estúdio pareçam da mesma sessão.
FUNDO = (238, 236, 232)

LARGURA, ALTURA = 600, 800          # 3:4
FOLGA_TOPO = 0.09                   # espaço acima da cabeça, em % da altura
OCUPACAO = 0.78                     # quanto da altura o sujeito deve ocupar

DESTINO = "assets/img/equipa"


def limites_do_sujeito(im):
    """Onde está a pessoa na imagem, ignorando o fundo."""
    if im.mode in ("RGBA", "LA") and im.getchannel("A").getextrema()[0] < 250:
        # Fundo transparente: o canal alfa diz-nos exatamente onde está.
        return im.getchannel("A").getbbox()

    # Fundo opaco: comparamos com a cor dos cantos.
    rgb = im.convert("RGB")
    canto = rgb.getpixel((2, 2))
    fundo = Image.new("RGB", rgb.size, canto)
    dif = ImageChops.difference(rgb, fundo).convert("L")
    # Tolerância alta para não confundir roupa clara com fundo branco.
    mascara = dif.point(lambda v: 255 if v > 28 else 0)
    return mascara.getbbox() or (0, 0, rgb.width, rgb.height)


def sobre_fundo(im):
    """Assenta a imagem num fundo sólido, se tiver transparência."""
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        base = Image.new("RGBA", im.size, FUNDO + (255,))
        im = Image.alpha_composite(base, im)
    return im.convert("RGB")


def preparar(origem, nome):
    im = ImageOps.exif_transpose(Image.open(origem))

    esq, topo, dir_, base = limites_do_sujeito(im)
    im = sobre_fundo(im)

    larg_im, alt_im = im.size
    centro_x = (esq + dir_) // 2

    # Queremos o topo da cabeça a FOLGA_TOPO da altura do recorte. Daí decorre
    # a maior altura possível que ainda cabe na foto — assim nunca inventamos
    # fundo, que é o que deixa faixas visíveis nas margens.
    max_por_cima = topo / FOLGA_TOPO if topo > 0 else alt_im
    max_por_baixo = (alt_im - topo) / (1 - FOLGA_TOPO)
    max_por_largura = larg_im * ALTURA / LARGURA
    altura_corte = int(min(max_por_cima, max_por_baixo, max_por_largura, alt_im))
    largura_corte = int(altura_corte * LARGURA / ALTURA)

    corte_topo = max(0, min(int(topo - altura_corte * FOLGA_TOPO), alt_im - altura_corte))
    corte_esq = max(0, min(centro_x - largura_corte // 2, larg_im - largura_corte))

    tela = im.crop((corte_esq, corte_topo,
                    corte_esq + largura_corte, corte_topo + altura_corte))
    tela = tela.resize((LARGURA, ALTURA), Image.LANCZOS)

    # Tratamento comum: leve dessaturação para as fotos conversarem entre si
    # sobre o azul-escuro do site.
    tela = ImageEnhance.Color(tela).enhance(0.88)
    tela = ImageEnhance.Contrast(tela).enhance(1.04)

    os.makedirs(DESTINO, exist_ok=True)
    saida = os.path.join(DESTINO, nome + ".jpg")
    tela.save(saida, "JPEG", quality=82, optimize=True, progressive=True)

    kb = os.path.getsize(saida) // 1024
    print(f"  {os.path.basename(origem)}  ->  {saida}  ({LARGURA}x{ALTURA}, {kb} KB)")
    return saida


def nome_ficheiro(caminho):
    """'Foto - Beatriz Maia.png' -> 'beatriz-maia'"""
    base = os.path.splitext(os.path.basename(caminho))[0]
    base = base.lower().replace("foto", "").replace("-", " ").replace("_", " ")
    acentos = str.maketrans("áàâãéêíóôõúç", "aaaaeeiooouc")
    base = base.translate(acentos)
    return "-".join(base.split())


if __name__ == "__main__":
    if len(sys.argv) >= 2 and sys.argv[1] == "--todas":
        pasta = os.path.join(DESTINO, "_originais")
        ficheiros = sorted(
            os.path.join(pasta, f) for f in os.listdir(pasta)
            if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))
        )
        if not ficheiros:
            sys.exit(f"Nenhuma imagem em {pasta}")
        print(f"A preparar {len(ficheiros)} retrato(s):")
        for f in ficheiros:
            preparar(f, nome_ficheiro(f))
    elif len(sys.argv) == 3:
        preparar(sys.argv[1], sys.argv[2])
    else:
        sys.exit(__doc__)

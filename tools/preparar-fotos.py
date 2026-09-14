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
import unicodedata
from PIL import Image, ImageOps, ImageEnhance, ImageChops

# Fundo neutro claro, próximo do cinzento de estúdio, para que fotos recortadas
# e fotos de estúdio pareçam da mesma sessão.
FUNDO = (238, 236, 232)

LARGURA, ALTURA = 600, 800          # 3:4
FOLGA_TOPO = 0.09                   # espaço acima da cabeça, em % da altura
# Recortes afinados à mão, um por retrato.
#
# A deteção automática de fundo/cabeça não é fiável com origens tão diferentes
# (fundo de estúdio com gradiente, recortes em PNG, cabelo comprido que se
# confunde com ombros). Com meia dúzia de fotos, medir à mão dá melhor
# resultado e é previsível.
#
# Cada entrada é (topo_da_cabeca_y, queixo_y, centro_do_rosto_x) no original.
# O recorte é calculado a partir daí para a cabeça ocupar sempre ALTURA_CABECA
# da altura final — é isso que faz os retratos parecerem da mesma sessão.
ROSTOS = {
    "beatriz-maia":      (95,   690,  590),
    "ines-pelica":       (103,  429,  425),
    "silvia-almeida":    (51,   430,  532),
    "francisco-quintela": (615, 1680, 3150),
}

ALTURA_CABECA = 0.40                # a cabeça ocupa 40% da altura do retrato

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


def mascara_do_sujeito(im):
    """Máscara a preto e branco de onde está a pessoa."""
    if im.mode in ("RGBA", "LA") and im.getchannel("A").getextrema()[0] < 250:
        return im.getchannel("A").point(lambda v: 255 if v > 128 else 0)
    rgb = im.convert("RGB")
    canto = rgb.getpixel((2, 2))
    dif = ImageChops.difference(rgb, Image.new("RGB", rgb.size, canto)).convert("L")
    return dif.point(lambda v: 255 if v > 28 else 0)


def altura_da_cabeca(im, caixa):
    """
    Estima a altura da cabeça, para que todos os retratos fiquem à mesma escala.

    A cabeça é a parte estreita no topo; os ombros alargam bruscamente. Procuramos
    essa mudança de largura — é o pescoço, e portanto a base da cabeça.
    """
    esq, topo, dir_, base = caixa
    mascara = mascara_do_sujeito(im).crop(caixa)
    larg, alt = mascara.size

    larguras = []
    for y in range(0, alt, max(1, alt // 200)):
        linha = mascara.crop((0, y, larg, y + 1)).getbbox()
        larguras.append(linha[2] - linha[0] if linha else 0)

    if not larguras:
        return (base - topo) * 0.25

    # A largura da cabeça é a menor largura estável no terço superior.
    topo_terco = [w for w in larguras[:max(3, len(larguras) // 3)] if w > 0]
    larg_cabeca = sorted(topo_terco)[len(topo_terco) // 4] if topo_terco else larg

    # Descemos até a largura passar de 1.5x a da cabeça: são os ombros.
    passo = max(1, alt // 200)
    for i, w in enumerate(larguras):
        if w > larg_cabeca * 1.5:
            return max(i * passo, larg_cabeca * 0.9)

    # Sem ombros visíveis (plano muito fechado): proporção humana típica.
    return larg_cabeca * 1.35


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

    if nome in ROSTOS:
        cabeca_topo, queixo, centro_x = ROSTOS[nome]
        topo = cabeca_topo
        altura_corte = int((queixo - cabeca_topo) / ALTURA_CABECA)
    else:
        # Sem medição à mão, aproximamos pelos limites detetados.
        altura_corte = int((base - topo) * 1.15)

    altura_corte = int(min(altura_corte, alt_im, larg_im * ALTURA / LARGURA))
    largura_corte = int(altura_corte * LARGURA / ALTURA)

    # Posicionamos para deixar FOLGA_TOPO acima da cabeça. Se a cabeça já está
    # colada ao topo da foto, encostamos e ficamos com menos folga — melhor
    # isso do que encolher o recorte e cortar o queixo.
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
    # O macOS guarda os acentos em forma decomposta ("e" + acento separado),
    # por isso decompomos tudo e deitamos fora as marcas — assim funciona
    # independentemente de como o nome do ficheiro chegou.
    base = unicodedata.normalize("NFD", base)
    base = "".join(c for c in base if not unicodedata.combining(c))
    base = "".join(c if c.isalnum() or c.isspace() else " " for c in base)
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

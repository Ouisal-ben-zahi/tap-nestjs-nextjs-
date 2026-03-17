import fitz  # PyMuPDF


def extract_top_image(pdf_path, output_image="photo_cv.png"):
    """
    Version historique : extrait la plus grande image située dans la partie
    haute de la première page et la sauvegarde sur disque.
    """
    doc = fitz.open(pdf_path)
    page = doc[0]  # première page

    image_list = page.get_images(full=True)

    if not image_list:
        print("Aucune image trouvée")
        return None

    best_image = None
    best_area = 0

    for img in image_list:
        xref = img[0]

        # récupérer la position de l'image dans la page
        rects = page.get_image_rects(xref)

        for rect in rects:
            area = rect.width * rect.height

            # vérifier que l'image est dans la partie haute
            if rect.y0 < page.rect.height * 0.4:
                if area > best_area:
                    best_area = area
                    best_image = xref

    if best_image:
        pix = fitz.Pixmap(doc, best_image)

        if pix.n - pix.alpha > 3:  # convertir CMYK -> RGB
            pix = fitz.Pixmap(fitz.csRGB, pix)

        pix.save(output_image)
        print(f"Image extraite : {output_image}")
        return output_image

    print("Aucune image en haut trouvée")
    return None


def extract_top_image_from_bytes(pdf_bytes: bytes) -> bytes | None:
    """
    Extrait la plus grande image située dans la partie haute de la première
    page d'un PDF fourni en bytes et retourne l'image en PNG (bytes).

    Utilisé côté backend (Flask) pour traiter directement le contenu du CV
    uploadé sans passer par le système de fichiers.
    """
    if not pdf_bytes:
        return None

    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception as e:
        print(f"⚠️ Impossible d'ouvrir le PDF pour extraction d'image: {e}")
        return None

    if doc.page_count == 0:
        return None

    page = doc[0]
    image_list = page.get_images(full=True)

    if not image_list:
        return None

    best_image = None
    best_area = 0
    page_height = page.rect.height

    for img in image_list:
        xref = img[0]
        rects = page.get_image_rects(xref)

        for rect in rects:
            area = rect.width * rect.height

            # on ne considère que les images dans la partie haute (40% supérieurs)
            if rect.y0 < page_height * 0.4 and area > best_area:
                best_area = area
                best_image = xref

    if not best_image:
        return None

    pix = fitz.Pixmap(doc, best_image)
    if pix.n - pix.alpha > 3:  # convertir CMYK -> RGB si nécessaire
        pix = fitz.Pixmap(fitz.csRGB, pix)

    try:
        return pix.tobytes("png")
    except Exception as e:
        print(f"⚠️ Impossible de convertir l'image extraite en PNG: {e}")
        return None

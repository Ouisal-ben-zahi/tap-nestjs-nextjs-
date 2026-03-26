from __future__ import annotations

from io import BytesIO

from PIL import Image
from rembg import remove


def remove_background_from_bytes(
    img_bytes: bytes,
    *,
    crop_to_subject: bool = True,
    background_hex: str = "EEEEEE",
) -> bytes:
    """
    Removes background from an input image and applies a solid background color.
    Returns PNG bytes.
    """
    if not img_bytes:
        return img_bytes

    out_bytes = remove(img_bytes)

    # Ensure it's a valid PNG RGBA and optionally crop transparent margins
    img = Image.open(BytesIO(out_bytes)).convert("RGBA")

    if crop_to_subject:
        alpha = img.split()[-1]
        bbox = alpha.getbbox()
        if bbox:
            img = img.crop(bbox)

    # Replace transparency with a solid background color (default: #EEEEEE)
    bg_color = (background_hex or "EEEEEE").strip().lstrip("#")
    if len(bg_color) != 6:
        raise ValueError("background_hex must be a 6-char hex color like 'EEEEEE'")
    r = int(bg_color[0:2], 16)
    g = int(bg_color[2:4], 16)
    b = int(bg_color[4:6], 16)

    bg = Image.new("RGBA", img.size, (r, g, b, 255))
    img = Image.alpha_composite(bg, img).convert("RGB")

    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


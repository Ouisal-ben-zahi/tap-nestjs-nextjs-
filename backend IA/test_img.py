from __future__ import annotations

from pathlib import Path

from PIL import Image
from rembg import remove


def remove_background(
    input_path: str | Path,
    output_path: str | Path,
    *,
    crop_to_subject: bool = True,
    background_hex: str | None = None,
) -> Path:
    """
    Removes image background and saves a PNG with transparency (RGBA).
    """
    input_path = Path(input_path).expanduser().resolve()
    output_path = Path(output_path).expanduser().resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)

    input_bytes = input_path.read_bytes()

    # rembg returns PNG bytes (usually RGBA) with background removed
    out_bytes = remove(input_bytes)

    img = Image.open(__import__("io").BytesIO(out_bytes)).convert("RGBA")

    if crop_to_subject:
        # Crop to non-transparent pixels to remove extra margins
        alpha = img.split()[-1]
        bbox = alpha.getbbox()
        if bbox:
            img = img.crop(bbox)

    # Optional: replace transparency with a solid background color
    if background_hex:
        bg_color = background_hex.strip().lstrip("#")
        if len(bg_color) != 6:
            raise ValueError("background_hex must be a 6-char hex color like 'EEEEEE'")
        r = int(bg_color[0:2], 16)
        g = int(bg_color[2:4], 16)
        b = int(bg_color[4:6], 16)
        bg = Image.new("RGBA", img.size, (r, g, b, 255))
        img = Image.alpha_composite(bg, img).convert("RGB")

    img.save(output_path, format="PNG")
    return output_path


if __name__ == "__main__":
    # Example: image extracted from CV
    input_path = "../frontend/src/templates_modif/Hajar.jpg"
    output_path = "./output/candidate_bg_EEEEEE.png"
    saved_to = remove_background(
        input_path,
        output_path,
        crop_to_subject=True,
        background_hex="EEEEEE",
    )
    print(f"Saved: {saved_to}")
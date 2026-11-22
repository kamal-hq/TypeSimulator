"""Generate multi-resolution Windows app icon matching the TypeSimulator v2 brand."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


def build_icon(out_path: Path) -> None:
    size = 256
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Rounded acid-lime tile (#C9EF35) matching Logo component
    draw.rounded_rectangle([(12, 12), (size - 12, size - 12)], radius=54, fill="#C9EF35")
    # Subtle dark hairline inner stroke
    draw.rounded_rectangle([(12, 12), (size - 12, size - 12)], radius=54, outline="#090909", width=6)

    font = None
    for candidate in ("arialbd.ttf", "segoeuib.ttf", "DejaVuSans-Bold.ttf"):
        try:
            font = ImageFont.truetype(candidate, 132)
            break
        except OSError:
            continue
    if font is None:
        font = ImageFont.load_default()

    # Draw 'T' in carbon black and 'S' in hot magenta (#FF2E93)
    draw.text((42, 52), "T", fill="#090909", font=font)
    draw.text((126, 52), "S", fill="#FF2E93", font=font)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(
        out_path,
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )


if __name__ == "__main__":
    target = Path(__file__).resolve().parent / "assets" / "icon.ico"
    build_icon(target)
    print(f"Generated icon at {target}")

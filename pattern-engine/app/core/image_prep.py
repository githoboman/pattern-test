"""Upload validation and image preparation.

Pillow: validate, auto-rotate (EXIF), convert, resize.
OpenCV (optional): contrast clean-up.
rembg (optional, not installed by default): background removal.
"""
import io
import logging
from dataclasses import dataclass

from PIL import Image, ImageOps, UnidentifiedImageError

from app.config import settings

logger = logging.getLogger(__name__)

ALLOWED_FORMATS = {"JPEG": "jpg", "PNG": "png", "WEBP": "webp"}


class InvalidImage(ValueError):
    pass


@dataclass
class PreparedImage:
    data: bytes          # normalised PNG bytes sent to the AI and stored
    extension: str       # always "png" after preparation
    width: int
    height: int
    original_format: str
    steps: list[str]     # what was done, for the audit trail


def validate_and_prepare(raw: bytes) -> PreparedImage:
    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    if not raw:
        raise InvalidImage("Empty upload")
    if len(raw) > max_bytes:
        raise InvalidImage(f"File is larger than {settings.MAX_UPLOAD_MB} MB")

    # Check the real file content, not the filename or the client's content-type.
    try:
        with Image.open(io.BytesIO(raw)) as probe:
            fmt = probe.format
            probe.verify()
    except (UnidentifiedImageError, OSError, SyntaxError) as exc:
        raise InvalidImage("File is not a readable image") from exc

    if fmt not in ALLOWED_FORMATS:
        raise InvalidImage(f"Unsupported image type {fmt}. Allowed: JPEG, PNG, WEBP")

    steps: list[str] = []
    img = Image.open(io.BytesIO(raw))  # verify() invalidates the object; reopen
    img = ImageOps.exif_transpose(img)
    steps.append("exif_transpose")

    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGB")
        steps.append("convert_rgb")

    side = settings.MAX_IMAGE_SIDE_PX
    if max(img.size) > side:
        img.thumbnail((side, side), Image.Resampling.LANCZOS)
        steps.append(f"resize_max_{side}px")

    if settings.ENABLE_OPENCV_CLEANUP:
        img = _opencv_cleanup(img)
        steps.append("opencv_clahe")

    if settings.ENABLE_REMBG:
        img = _remove_background(img)
        steps.append("rembg")

    out = io.BytesIO()
    img.save(out, format="PNG", optimize=True)
    return PreparedImage(
        data=out.getvalue(),
        extension="png",
        width=img.width,
        height=img.height,
        original_format=fmt,
        steps=steps,
    )


def _opencv_cleanup(img: Image.Image) -> Image.Image:
    """Local contrast enhancement (CLAHE) on the lightness channel. Does not change shapes."""
    import cv2
    import numpy as np

    has_alpha = img.mode == "RGBA"
    rgb = np.array(img.convert("RGB"))
    lab = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB)
    l_chan, a_chan, b_chan = cv2.split(lab)
    l_chan = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(l_chan)
    cleaned = cv2.cvtColor(cv2.merge((l_chan, a_chan, b_chan)), cv2.COLOR_LAB2RGB)
    result = Image.fromarray(cleaned)
    if has_alpha:
        result.putalpha(img.getchannel("A"))
    return result


def _remove_background(img: Image.Image) -> Image.Image:
    try:
        from rembg import remove  # optional dependency
    except ImportError:
        logger.warning("ENABLE_REMBG is set but rembg is not installed; skipping")
        return img
    return remove(img)

"""Technical flat drawing built with svgwrite from reusable components.

Every view uses one shared 300 x 520 coordinate frame. A tailor or designer can replace any
built-in component with an Inkscape drawing saved as data/drawing_components/<name>.svg,
drawn on the same 300 x 520 canvas; it is layered in at the same position.

The drawing is schematic (not to scale). Numbers only ever come from the calculation result.
"""
import base64
from pathlib import Path
from typing import Any, Callable, Dict, Optional

import svgwrite

from app.config import settings

FRAME_W, FRAME_H = 300, 520
INK = "#09090b"
ACCENT = "#18181b"
WARN = "#52525b"
FONT = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"

HEM_Y = {"mini": 360, "knee": 420, "midi": 470, "maxi": 505}

# Key points shared by all components (centre line x = 150)
NL, NR = (125, 40), (175, 40)
SL, SR = (95, 52), (205, 52)
AL, AR = (84, 125), (216, 125)
WL, WR = (104, 215), (196, 215)
HL, HR = (86, 300), (214, 300)


def _p(pt) -> str:
    return f"{pt[0]},{pt[1]}"


# ---------------- components ----------------
def bodice_and_skirt(dwg, g, ctx):
    hem = ctx["hem_y"]
    # Outer 1.5cm Seam Allowance Cut Line (dashed)
    sa_d = (
        f"M 121,34 L 90,46 C 100,78 96,105 78,125 C 82,160 94,185 98,215 "
        f"C 92,248 80,270 80,300 C 80,355 86,{hem - 40} 92,{hem + 8} "
        f"L 208,{hem + 8} C 214,{hem - 40} 220,355 220,300 "
        f"C 220,270 208,248 202,215 C 206,185 218,160 222,125 "
        f"C 204,105 200,78 210,46 L 179,34 Z"
    )
    g.add(dwg.path(d=sa_d, fill="#f4f4f5", fill_opacity=0.6, stroke="#71717a", stroke_width=1, stroke_dasharray="5,3"))

    # Inner Stitch / Net Block Line (cubic Bezier)
    d = (
        f"M{_p(NL)} L{_p(SL)} C 106,82 102,108 {_p(AL)} "
        f"C 88,160 100,185 {_p(WL)} C 98,248 86,270 {_p(HL)} "
        f"C 86,355 92,{hem - 40} 98,{hem} L 202,{hem} "
        f"C 208,{hem - 40} 214,355 {_p(HR)} C 214,270 202,248 {_p(WR)} "
        f"C 200,185 212,160 {_p(AR)} C 198,108 194,82 {_p(SR)} L{_p(NR)}"
    )
    g.add(dwg.path(d=d, fill="#ffffff", stroke=INK, stroke_width=2.2))

    # Construction Balance Lines (Bust, Waist, Hip)
    g.add(dwg.line(start=AL, end=AR, stroke="#a1a1aa", stroke_width=0.9, stroke_dasharray="3,3"))
    g.add(dwg.line(start=WL, end=WR, stroke="#52525b", stroke_width=1.1, stroke_dasharray="5,3"))
    g.add(dwg.line(start=HL, end=HR, stroke="#a1a1aa", stroke_width=0.9, stroke_dasharray="3,3"))

    # Diamond Waist Suppression Darts (Left & Right)
    g.add(dwg.path(d="M 124,155 L 118,215 L 124,275 L 130,215 Z", fill="none", stroke="#3f3f46", stroke_width=1.1))
    g.add(dwg.path(d="M 176,155 L 170,215 L 176,275 L 182,215 Z", fill="none", stroke="#3f3f46", stroke_width=1.1))

    # Bust Apex Targets (Front)
    if ctx.get("view") == "FRONT":
        for bx in (124, 176):
            g.add(dwg.circle(center=(bx, 138), r=4, fill="none", stroke=INK, stroke_width=1))
            g.add(dwg.line(start=(bx - 6, 138), end=(bx + 6, 138), stroke=INK, stroke_width=0.9))
            g.add(dwg.line(start=(bx, 132), end=(bx, 144), stroke=INK, stroke_width=0.9))
        # Side Bust Darts
        g.add(dwg.path(d="M 86,142 L 116,138 L 88,154", fill="none", stroke="#27272a", stroke_width=1.1))
        g.add(dwg.path(d="M 214,142 L 184,138 L 212,154", fill="none", stroke="#27272a", stroke_width=1.1))
        # Grainline Vector
        g.add(dwg.line(start=(150, 95), end=(150, hem - 25), stroke="#27272a", stroke_width=1.1))
        g.add(dwg.polygon(points=[(150, 89), (146, 98), (154, 98)], fill="#27272a"))
        g.add(dwg.polygon(points=[(150, hem - 19), (146, hem - 28), (154, hem - 28)], fill="#27272a"))


def neckline_square(dwg, g, ctx):
    g.add(dwg.polyline([NR, (175, 85), (125, 85), NL], fill="none", stroke=INK, stroke_width=2))


def neckline_round(dwg, g, ctx):
    g.add(dwg.path(d=f"M{_p(NR)} Q150,100 {_p(NL)}", fill="none", stroke=INK, stroke_width=2))


def neckline_v_neck(dwg, g, ctx):
    g.add(dwg.polyline([NR, (150, 110), NL], fill="none", stroke=INK, stroke_width=2))


def neckline_back(dwg, g, ctx):
    g.add(dwg.path(d=f"M{_p(NR)} Q150,55 {_p(NL)}", fill="none", stroke=INK, stroke_width=2))


def sleeve_sleeveless(dwg, g, ctx):
    pass  # armhole already part of the bodice outline


def sleeve_short(dwg, g, ctx):
    for pts in ([SL, (70, 95), (88, 112), AL], [SR, (230, 95), (212, 112), AR]):
        g.add(dwg.polyline(pts, fill="white", stroke=INK, stroke_width=2))


def sleeve_long(dwg, g, ctx):
    for pts in ([SL, (58, 250), (80, 256), AL], [SR, (242, 250), (220, 256), AR]):
        g.add(dwg.polyline(pts, fill="white", stroke=INK, stroke_width=2))


def closure_back_zip(dwg, g, ctx):
    g.add(dwg.line(start=(150, 48), end=(150, 300), stroke=ACCENT, stroke_width=2, stroke_dasharray="6,3"))


def closure_side_zip(dwg, g, ctx):
    g.add(dwg.line(start=(206, 125), end=(196, 260), stroke=ACCENT, stroke_width=2, stroke_dasharray="6,3"))


COMPONENTS: Dict[str, Callable] = {
    "bodice_and_skirt": bodice_and_skirt,
    "neckline_square": neckline_square,
    "neckline_round": neckline_round,
    "neckline_v_neck": neckline_v_neck,
    "neckline_back": neckline_back,
    "sleeve_sleeveless": sleeve_sleeveless,
    "sleeve_short": sleeve_short,
    "sleeve_long": sleeve_long,
    "closure_back_zip": closure_back_zip,
    "closure_side_zip": closure_side_zip,
}


def _draw_component(dwg, g, name: str, ctx: Dict[str, Any]) -> None:
    override = Path(settings.DATA_DIR) / "drawing_components" / f"{name}.svg"
    if override.exists():
        data = base64.b64encode(override.read_bytes()).decode()
        g.add(dwg.image(href=f"data:image/svg+xml;base64,{data}", insert=(0, 0), size=(FRAME_W, FRAME_H)))
        return
    fn = COMPONENTS.get(name)
    if fn:
        fn(dwg, g, ctx)


# ---------------- labels ----------------
def _measure_label(item: Optional[Dict[str, Any]], label: str) -> tuple[str, str]:
    if not item:
        return f"{label}: awaiting tailor rule", WARN
    suffix = "  TEST DATA" if item.get("status") != "approved" else ""
    return f"{label}: {item['garment_cm']:.1f} cm{suffix}", ACCENT if not suffix else WARN


def build_svg(
    analysis: Dict[str, Any],
    inputs: Dict[str, Any],
    calculation: Optional[Dict[str, Any]],
    version_label: str,
    all_values_approved: bool,
) -> str:
    def val(field):
        return (analysis.get(field) or {}).get("value")

    neckline = inputs.get("neckline") or val("neckline")
    sleeves = inputs.get("sleeves") or val("sleeves") or "sleeveless"
    length = val("length") or "midi"
    closure = inputs.get("closure")  # only drawn once confirmed; never guessed
    measurements = (calculation or {}).get("measurements", {})

    ctx = {"hem_y": HEM_Y.get(length, HEM_Y["midi"])}
    dwg = svgwrite.Drawing(size=("100%", "100%"), viewBox="0 0 900 640", profile="full")
    dwg.add(dwg.rect(insert=(0, 0), size=(900, 640), fill="#fafafa"))

    views = [("FRONT", 60, f"neckline_{neckline}" if neckline else None, "closure_side_zip" if closure == "side_zip" else None),
             ("BACK", 520, "neckline_back", "closure_back_zip" if closure == "back_zip" else None)]

    for title, x, neck_part, closure_part in views:
        ctx["view"] = title
        g = dwg.g(transform=f"translate({x},70)")
        dwg.add(g)
        g.add(dwg.text(f"{title} BLOCK // 1.5CM SA", insert=(150, -20), text_anchor="middle", font_family=FONT, font_size=12, font_weight="bold", fill=INK))
        _draw_component(dwg, g, f"sleeve_{sleeves}", ctx)
        _draw_component(dwg, g, "bodice_and_skirt", ctx)
        if neck_part:
            _draw_component(dwg, g, neck_part, ctx)
        if closure_part:
            _draw_component(dwg, g, closure_part, ctx)

    # Measurement callouts on the front view
    front = dwg.g(transform="translate(60,70)")
    dwg.add(front)
    for key, label, y in (("bust", "Finished bust", AL[1] + 5), ("waist", "Finished waist", WL[1]), ("hip", "Finished hip", HL[1])):
        text, colour = _measure_label(measurements.get(key), label)
        front.add(dwg.line(start=(212, y), end=(250, y), stroke=colour, stroke_width=1, stroke_dasharray="2,2"))
        front.add(dwg.text(text, insert=(255, y + 4), font_family=FONT, font_size=12, fill=colour))
    text, colour = _measure_label(measurements.get("dress_length"), "Finished length")
    front.add(dwg.line(start=(30, 40), end=(30, ctx["hem_y"]), stroke=colour, stroke_width=1))
    front.add(dwg.text(text, insert=(22, 300), font_family=FONT, font_size=12, fill=colour, transform="rotate(-90 22 300)", text_anchor="middle"))

    # Notes for things the image could not show
    notes = []
    if not closure:
        notes.append("Closure: needs confirmation (not visible in image)")
    elif closure in ("back_zip", "side_zip"):
        notes.append(f"Closure: {closure.replace('_', ' ')} (zip length: needs tailor value)")
    if not analysis.get("back_view_available"):
        notes.append("Back view drawn from front only: back neckline and details need confirmation")
    if not neckline:
        notes.append("Neckline: needs confirmation")
    for i, note in enumerate(notes):
        dwg.add(dwg.text(note, insert=(20, 600 + i * 16 - 16 * (len(notes) - 1)), font_family=FONT, font_size=11, fill=WARN))

    dwg.add(dwg.text(f"{version_label}  |  Schematic flat, not to scale", insert=(880, 625), text_anchor="end", font_family=FONT, font_size=11, fill="#6b7280"))
    if not all_values_approved:
        dwg.add(dwg.text("PLACEHOLDER, not tailor-approved", insert=(450, 340), text_anchor="middle", font_family=FONT,
                         font_size=40, font_weight="bold", fill=WARN, fill_opacity=0.12, transform="rotate(-20 450 340)"))
    return dwg.tostring()

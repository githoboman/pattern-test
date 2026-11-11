"""PDF export: HTML built from the database record, rendered by Playwright (headless Chromium).

Chosen over WeasyPrint because WeasyPrint needs GTK/Pango native libraries that are awkward on
Windows, while Playwright renders exactly what Chrome shows (same SVG as the editor).
One-time setup: `python -m playwright install chromium`.
"""
from html import escape
from string import Template
from typing import Any, Dict, List

PLACEHOLDER = "PLACEHOLDER, not tailor-approved"

_PAGE = Template("""<!doctype html><html><head><meta charset="utf-8"><title>$title</title>
<style>
  @page { size: A4; margin: 14mm; }
  body { font-family: Helvetica, Arial, sans-serif; color: #111827; font-size: 11px; }
  header { display: flex; justify-content: space-between; border-bottom: 2px solid #111827; padding-bottom: 6px; }
  h1 { font-size: 18px; margin: 0; }
  .status { font-weight: bold; padding: 2px 8px; border: 1px solid; border-radius: 4px; }
  .draft { color: #b45309; } .approved { color: #047857; }
  .banner { margin: 8px 0; padding: 6px 8px; border: 1px dashed #b45309; color: #b45309; font-weight: bold; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0 12px; }
  th, td { border: 1px solid #d1d5db; padding: 4px 6px; text-align: left; }
  th { background: #f3f4f6; }
  .ph { color: #b45309; font-weight: bold; }
  .drawing { border: 1px solid #d1d5db; margin: 8px 0; }
  .drawing svg { width: 100%; height: auto; display: block; }
  h2 { font-size: 13px; margin: 14px 0 4px; }
  ul { margin: 4px 0 0 16px; padding: 0; }
</style></head><body>
<header>
  <div><h1>Astra Tech Pack: $design_id</h1><div>Template: $template_id</div></div>
  <div style="text-align:right">Version $version_number<br><span class="status $status_class">$status_label</span></div>
</header>
$banner
<div class="drawing">$svg</div>
<h2>Observed from image</h2>
<table><tr><th>Feature</th><th>Value</th><th>Status</th></tr>$analysis_rows</table>
<h2>Customer instructions (as written by the customer, not verified)</h2>
<ul>$customer_rows</ul>
<h2>Measurements (cm)</h2>
<table><tr><th>Point</th><th>Body</th><th>Rule</th><th>Ease</th><th>Garment</th><th>Rule status</th></tr>$measure_rows</table>
<h2>Seam allowances (stored separately)</h2>
<table><tr><th>Seam</th><th>Allowance (cm)</th></tr>$seam_rows</table>
<h2>Construction steps</h2>
<ol>$step_rows</ol>
<h2>Open questions</h2>
<ul>$question_rows</ul>
</body></html>""")


def _row(*cells: str) -> str:
    return "<tr>" + "".join(f"<td>{c}</td>" for c in cells) + "</tr>"


def build_html(record: Dict[str, Any], svg: str) -> str:
    approved = record["status"] == "approved_for_sampling"
    analysis = record.get("analysis") or {}
    calc = record.get("calculated_measurements") or {}
    body = record.get("body_measurements") or {}
    seams = record.get("seam_allowances_cm") or {}
    notes = record.get("construction_notes") or {}
    questions: List[str] = list(record.get("open_questions") or [])

    analysis_rows = ""
    for field in ("garment_type", "silhouette", "neckline", "sleeves", "length", "closure", "fabric"):
        item = analysis.get(field) or {}
        value = escape(str(item.get("value"))) if item.get("value") else '<span class="ph">needs confirmation</span>'
        analysis_rows += _row(escape(field.replace("_", " ")), value, escape(item.get("status", "")))

    customer_rows = "".join(f"<li>{escape(t)}</li>" for t in analysis.get("customer_instructions", [])) or "<li>None</li>"

    measure_rows = ""
    measured = calc.get("measurements", {})
    for base, body_val in body.items():
        m = measured.get(base)
        if m:
            status = "approved" if m["status"] == "approved" else f'<span class="ph">TEST DATA / {PLACEHOLDER}</span>'
            measure_rows += _row(escape(base), f"{m['body_cm']:.1f}", escape(m["rule_id"]), f"+{m['adjustment_ease_cm']:.1f}", f"<b>{m['garment_cm']:.1f}</b>", status)
        else:
            measure_rows += _row(escape(base), f"{float(body_val):.1f}", "-", "-", '<span class="ph">blocked</span>', '<span class="ph">awaiting tailor rule</span>')

    seam_rows = ""
    for k, v in seams.items():
        if k == "status":
            continue
        shown = f"{v}" if v is not None else f'<span class="ph">{PLACEHOLDER}</span>'
        seam_rows += _row(escape(k.replace("_", " ")), shown)

    steps = notes.get("construction_steps", [])
    step_rows = "".join(f"<li>{escape(s['text'])}</li>" for s in steps) or f'<li class="ph">No tailor-approved steps yet ({PLACEHOLDER})</li>'
    question_rows = "".join(f"<li>{escape(q)}</li>" for q in questions) or "<li>None</li>"

    banner = "" if record.get("all_values_approved") else f'<div class="banner">{PLACEHOLDER}: this document contains values that a tailor has not approved.</div>'

    return _PAGE.substitute(
        title=escape(f"Astra tech pack {record['design_id']} v{record['version_number']}"),
        design_id=escape(record["design_id"]),
        template_id=escape(record.get("template_id") or "none (needs designer review)"),
        version_number=record["version_number"],
        status_class="approved" if approved else "draft",
        status_label="Approved for sampling" if approved else "Draft",
        banner=banner,
        svg=svg,  # generated by our own svgwrite builder, all text inside is escaped by svgwrite
        analysis_rows=analysis_rows,
        customer_rows=customer_rows,
        measure_rows=measure_rows,
        seam_rows=seam_rows,
        step_rows=step_rows,
        question_rows=question_rows,
    )


class PdfUnavailable(RuntimeError):
    pass


def render_pdf(html: str) -> bytes:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError as exc:
        raise PdfUnavailable("Playwright is not installed") from exc
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page()
            page.set_content(html, wait_until="load")
            pdf = page.pdf(format="A4", print_background=True)
            browser.close()
            return pdf
    except Exception as exc:  # most commonly: browser binary not installed yet
        raise PdfUnavailable(f"PDF rendering failed: {exc}. Run: python -m playwright install chromium") from exc

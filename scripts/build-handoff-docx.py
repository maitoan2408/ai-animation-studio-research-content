#!/usr/bin/env python3
"""Create the current handoff appendix without editing the research Word files.

Dependency: python-docx==1.2.0 (also pinned in validation/requirements.txt).
Markdown source remains authoritative; this report is a reviewable snapshot.
"""
from pathlib import Path
import re
from docx import Document
from docx.shared import Inches, Pt

ROOT = Path(__file__).resolve().parents[1]
doc = Document()
style = doc.styles["Normal"]
style.font.name = "Arial"
style.font.size = Pt(10)
doc.add_heading("Paper Studio — Bàn giao bản nội bộ 0.1", 0)
doc.add_paragraph("Ngày 11/11/2026 (Asia/Saigon). Chương trình và bằng chứng để người dùng duyệt; không thay thế báo cáo nghiên cứu gốc.")
doc.add_paragraph("Kết quả đã kiểm: clean checkout, 16 tests nhanh, 13 integration checks, 9 browser checks. Demo 13 giây, 3 cảnh, 312 frames, 1080p/24 fps, audio 48 kHz. Người dùng chưa duyệt nghệ thuật.")
image = ROOT / "artifacts/morning-frame.png"
if image.exists():
    doc.add_picture(str(image), width=Inches(6))
doc.add_paragraph("Frame demo procedural. Video đầy đủ và gói mở lại nằm trong artifacts/ của repository.")

def plain(text):
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"\1 (\2)", text)
    return text.replace("**", "").replace("`", "")

sources = ["plan.md", "docs/verification.md", "docs/capabilities.md", "docs/phases/README.md", "docs/roadmap-full.md", "docs/reproduction.md", "docs/review-checklist.md"]
for source in sources:
    doc.add_page_break()
    doc.add_paragraph("Nguồn: " + source, style="Caption")
    lines = (ROOT / source).read_text().splitlines()
    index = 0
    code = False
    while index < len(lines):
        line = lines[index]
        if line.startswith("```"):
            code = not code
        elif line.startswith("|"):
            rows = []
            while index < len(lines) and lines[index].startswith("|"):
                row = [plain(c.strip()) for c in lines[index].strip("|").split("|")]
                if not all(re.fullmatch(r"[-: ]+", c) for c in row):
                    rows.append(row)
                index += 1
            if rows:
                table = doc.add_table(rows=0, cols=max(map(len, rows)), style="Light Shading Accent 1")
                for row in rows:
                    cells = table.add_row().cells
                    for cell, value in zip(cells, row):
                        cell.text = value
            continue
        elif line.startswith("#"):
            level = len(line) - len(line.lstrip("#"))
            doc.add_heading(plain(line.lstrip("# ")), min(level, 3))
        elif line.strip():
            if line.startswith("- "):
                doc.add_paragraph(plain(line[2:]), style="List Bullet")
            else:
                paragraph = doc.add_paragraph(plain(line))
                if code:
                    for run in paragraph.runs:
                        run.font.name = "Consolas"
                        run.font.size = Pt(9)
        index += 1
output = ROOT / "reports/Ban_giao_Studio_noi_bo_v0.1.docx"
doc.save(output)
print(output)

"""Export the two review Markdown documents into a readable Word addendum."""
from pathlib import Path
import re
from docx import Document
from docx.shared import Cm, Pt, RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

root=Path(__file__).resolve().parents[2]
doc=Document()
sec=doc.sections[0]
sec.page_width=Cm(21);sec.page_height=Cm(29.7)
sec.top_margin=Cm(1.7);sec.bottom_margin=Cm(1.6)
sec.left_margin=Cm(1.6);sec.right_margin=Cm(1.6)
normal=doc.styles['Normal'];normal.font.name='Calibri';normal.font.size=Pt(10)
normal.paragraph_format.space_after=Pt(5)
for name,size in [('Title',24),('Heading 1',17),('Heading 2',13),('Heading 3',11)]:
    st=doc.styles[name];st.font.name='Calibri';st.font.size=Pt(size);st.font.color.rgb=RGBColor.from_string('184D5A')
doc.core_properties.title='Thẩm định kỹ thuật và kế hoạch triển khai Studio hoạt hình AI'
doc.core_properties.subject='Kiểm thử HyperFrames 0.9.30, Remotion 4.0.542 và kế hoạch studio nội bộ'
doc.core_properties.author='Bản thẩm định theo yêu cầu người dùng'
doc.add_heading('THẨM ĐỊNH KỸ THUẬT\nVÀ KẾ HOẠCH TRIỂN KHAI',0)
doc.add_paragraph('Studio nội bộ tạo hoạt hình 2D / 2.5D từ kịch bản\nPaper-cut • Layered shadow-box • Multiplane',style='Subtitle')
doc.add_paragraph('10/11/2026 • HyperFrames 0.9.30 • Remotion 4.0.542')
doc.add_paragraph('Tài liệu bổ sung cho báo cáo nghiên cứu gốc. Gồm kết quả chạy thực tế, những điểm cần bổ sung và kế hoạch có cổng nghiệm thu. Chưa phải xác nhận một studio production hoặc phim pilot đã được duyệt.')
picture=root/'reports/validation-media/paper-cut-frame-96.png'
if picture.exists():
    shape=doc.add_picture(str(picture),width=Cm(16))
    shape._inline.docPr.set('descr','Frame 96 của fixture: nhân vật cắt lớp đang nhấc cốc bên bàn, trên nền ba lớp parallax có bóng SVG. Hình chỉ minh họa kiểm thử kỹ thuật.')
    doc.add_paragraph('Frame bằng chứng của cảnh thử 10 giây; không phải mẫu chất lượng nghệ thuật cuối.',style='Caption')

def inline(p,text):
    text=re.sub(r'\[([^\]]+)\]\(([^)]+)\)',r'\1 (\2)',text)
    for token in re.split(r'(\*\*.*?\*\*|`[^`]+`)',text):
        if token.startswith('**') and token.endswith('**'):
            p.add_run(token[2:-2]).bold=True
        elif token.startswith('`') and token.endswith('`'):
            r=p.add_run(token[1:-1]);r.font.name='Consolas';r.font.size=Pt(9)
        else:p.add_run(token)

def table(rows):
    cells=[[c.strip() for c in x.strip().strip('|').split('|')] for x in rows]
    cells=[r for r in cells if not all(re.fullmatch(r':?-+:?',c.replace(' ','')) for c in r)]
    t=doc.add_table(rows=0,cols=len(cells[0]));t.style='Light Shading Accent 1'
    for idx,row in enumerate(cells):
        rc=t.add_row().cells
        for c,text in zip(rc,row):
            inline(c.paragraphs[0],text)
            for p in c.paragraphs:
                p.paragraph_format.space_after=Pt(3)
                for r in p.runs:r.font.size=Pt(8.5)
        if idx==0:
            pr=t.rows[0]._tr.get_or_add_trPr();repeat=OxmlElement('w:tblHeader');pr.append(repeat)
            for c in rc:
                for r in c.paragraphs[0].runs:r.bold=True
    doc.add_paragraph()

def markdown(path):
    lines=path.read_text().splitlines();i=0
    while i<len(lines):
        line=lines[i].strip()
        if not line:i+=1;continue
        if line.startswith('|'):
            rows=[]
            while i<len(lines) and lines[i].strip().startswith('|'):rows.append(lines[i]);i+=1
            table(rows);continue
        if line.startswith('```'):
            lang=line[3:];code=[];i+=1
            while i<len(lines) and not lines[i].strip().startswith('```'):code.append(lines[i]);i+=1
            if lang=='mermaid':
                doc.add_paragraph('Kịch bản + style bible → Shot planner → Storyboard/animatic → Người duyệt → Scene IR → Validator + asset preflight → Compiler → Worker → Decode QC → Review → Accepted. Yêu cầu sửa tạo revision mới.')
            else:
                for x in code:
                    r=doc.add_paragraph().add_run(x);r.font.name='Consolas';r.font.size=Pt(8)
            i+=1;continue
        if line.startswith('#'):
            m=re.match(r'^(#+)\s+(.*)',line);doc.add_heading(m[2],min(len(m[1]),3))
        elif line.startswith('- '):inline(doc.add_paragraph(style='List Bullet'),line[2:])
        elif re.match(r'^\d+\. ',line):inline(doc.add_paragraph(style='List Number'),re.sub(r'^\d+\. ','',line))
        else:inline(doc.add_paragraph(),line)
        i+=1

for name in ['Tham_dinh_ky_thuat.md','Ke_hoach_trien_khai.md']:
    doc.add_page_break();markdown(root/'reports'/name)
doc.add_page_break();doc.add_heading('Nguồn và bằng chứng đi kèm',1)
doc.add_paragraph('Các nguồn chính thức và ghi chú truy cập mới được ghi trong bảng sau. Log, package-lock, source fixture và số đo gốc nằm trong thư mục validation của repo.')
markdown(root/'validation/evidence/source-verification.md')
header=sec.header.paragraphs[0];header.text='STUDIO AI • THẨM ĐỊNH VÀ KẾ HOẠCH • 10/11/2026'
for r in header.runs:r.font.size=Pt(8);r.font.color.rgb=RGBColor.from_string('666666')
footer=sec.footer.paragraphs[0];footer.alignment=2
footer.add_run('Trang ')
field=OxmlElement('w:fldSimple');field.set(qn('w:instr'),'PAGE');footer._p.append(field)
target=root/'reports/Tham_dinh_va_ke_hoach_Studio_AI.docx'
doc.save(target)
print(target)

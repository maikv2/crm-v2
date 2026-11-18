from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


OUTPUT = r"C:\Users\eumai\v2-crm\artifacts\Proposta_Comercial_Investimento_V2.docx"
LOGO = r"C:\Users\eumai\v2-crm\public\logo.png"

BLACK = "000000"
CHARCOAL = "25303B"
BRAND_BLUE = "10177D"
PALE_BLUE = "EFF1FA"
PALE_GRAY = "F4F6F7"
MID_GRAY = "66727D"
LIGHT_GRAY = "D9D9D9"
TABLE_LINE = "D5DAE0"
WHITE = "FFFFFF"


def set_cell_shading(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_cell_margins(cell, top=220, start=195, bottom=220, end=195):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for name, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{name}"))
        if node is None:
            node = OxmlElement(f"w:{name}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def set_table_borders(table, color=TABLE_LINE, size="5"):
    tbl_pr = table._tbl.tblPr
    borders = tbl_pr.first_child_found_in("w:tblBorders")
    if borders is None:
        borders = OxmlElement("w:tblBorders")
        tbl_pr.append(borders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        tag = borders.find(qn(f"w:{edge}"))
        if tag is None:
            tag = OxmlElement(f"w:{edge}")
            borders.append(tag)
        tag.set(qn("w:val"), "single")
        tag.set(qn("w:sz"), size)
        tag.set(qn("w:space"), "0")
        tag.set(qn("w:color"), color)


def remove_table_borders(table):
    tbl_pr = table._tbl.tblPr
    borders = tbl_pr.first_child_found_in("w:tblBorders")
    if borders is None:
        borders = OxmlElement("w:tblBorders")
        tbl_pr.append(borders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        tag = borders.find(qn(f"w:{edge}"))
        if tag is None:
            tag = OxmlElement(f"w:{edge}")
            borders.append(tag)
        tag.set(qn("w:val"), "nil")


def set_repeat_table_header(row):
    tr_pr = row._tr.get_or_add_trPr()
    tbl_header = OxmlElement("w:tblHeader")
    tbl_header.set(qn("w:val"), "true")
    tr_pr.append(tbl_header)


def set_row_cant_split(row):
    tr_pr = row._tr.get_or_add_trPr()
    cant_split = OxmlElement("w:cantSplit")
    cant_split.set(qn("w:val"), "true")
    tr_pr.append(cant_split)


def set_cell_width(cell, inches):
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_w = tc_pr.find(qn("w:tcW"))
    if tc_w is None:
        tc_w = OxmlElement("w:tcW")
        tc_pr.append(tc_w)
    tc_w.set(qn("w:w"), str(int(inches * 1440)))
    tc_w.set(qn("w:type"), "dxa")


def set_font(run, name="Aptos", size=None, bold=None, color=None):
    run.font.name = name
    run._element.get_or_add_rPr().get_or_add_rFonts().set(qn("w:ascii"), name)
    run._element.get_or_add_rPr().get_or_add_rFonts().set(qn("w:hAnsi"), name)
    if size is not None:
        run.font.size = Pt(size)
    if bold is not None:
        run.bold = bold
    if color:
        run.font.color.rgb = RGBColor.from_string(color)


def add_page_number(paragraph):
    run = paragraph.add_run()
    fld_char1 = OxmlElement("w:fldChar")
    fld_char1.set(qn("w:fldCharType"), "begin")
    instr_text = OxmlElement("w:instrText")
    instr_text.set(qn("xml:space"), "preserve")
    instr_text.text = " PAGE "
    fld_char2 = OxmlElement("w:fldChar")
    fld_char2.set(qn("w:fldCharType"), "end")
    run._r.extend([fld_char1, instr_text, fld_char2])
    set_font(run, size=9, color=MID_GRAY)


def keep_with_next(paragraph):
    p_pr = paragraph._p.get_or_add_pPr()
    keep = OxmlElement("w:keepNext")
    p_pr.append(keep)


def add_heading(doc, text, level=1, page_break=False):
    p = doc.add_paragraph(style=f"Heading {level}")
    p.paragraph_format.page_break_before = page_break
    p.add_run(text)
    keep_with_next(p)
    return p


def add_body(doc, text, bold_lead=None, after=7):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(after)
    p.paragraph_format.line_spacing = 1.18
    if bold_lead and text.startswith(bold_lead):
        r1 = p.add_run(bold_lead)
        r1.bold = True
        p.add_run(text[len(bold_lead):])
    else:
        p.add_run(text)
    return p


def add_bullet(doc, text):
    p = doc.add_paragraph(style="List Bullet")
    p.paragraph_format.space_after = Pt(5)
    p.paragraph_format.line_spacing = 1.1
    p.add_run(text)
    return p


def add_table(doc, headers, rows, widths, numeric_cols=None):
    numeric_cols = set(numeric_cols or [])
    table = doc.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    set_table_borders(table)
    hdr = table.rows[0]
    set_repeat_table_header(hdr)
    set_row_cant_split(hdr)
    for idx, (cell, value) in enumerate(zip(hdr.cells, headers)):
        set_cell_width(cell, widths[idx])
        set_cell_shading(cell, BRAND_BLUE)
        set_cell_margins(cell)
        cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER if idx in numeric_cols else WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.line_spacing = 1.08
        r = p.add_run(value)
        set_font(r, size=9.8, bold=True, color=WHITE)
    for row_idx, values in enumerate(rows):
        body_row = table.add_row()
        set_row_cant_split(body_row)
        cells = body_row.cells
        for idx, (cell, value) in enumerate(zip(cells, values)):
            set_cell_width(cell, widths[idx])
            if row_idx % 2 == 1:
                set_cell_shading(cell, PALE_BLUE)
            set_cell_margins(cell)
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER if idx in numeric_cols else WD_ALIGN_PARAGRAPH.LEFT
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.1
            r = p.add_run(str(value))
            set_font(r, size=9.7, color=BLACK)
    spacer = doc.add_paragraph()
    spacer.paragraph_format.space_after = Pt(7)
    return table


doc = Document()
section = doc.sections[0]
section.page_width = Inches(8.5)
section.page_height = Inches(11)
section.top_margin = Inches(0.78)
section.bottom_margin = Inches(0.78)
section.left_margin = Inches(0.82)
section.right_margin = Inches(0.82)
section.header_distance = Inches(0.28)
section.footer_distance = Inches(0.32)
section.different_first_page_header_footer = True

styles = doc.styles
normal = styles["Normal"]
normal.font.name = "Aptos"
normal._element.rPr.rFonts.set(qn("w:ascii"), "Aptos")
normal._element.rPr.rFonts.set(qn("w:hAnsi"), "Aptos")
normal.font.size = Pt(10.7)
normal.font.color.rgb = RGBColor.from_string(BLACK)

title_style = styles["Title"]
title_style.font.name = "Aptos Display"
title_style._element.rPr.rFonts.set(qn("w:ascii"), "Aptos Display")
title_style._element.rPr.rFonts.set(qn("w:hAnsi"), "Aptos Display")
title_style.font.size = Pt(25)
title_style.font.bold = True
title_style.font.color.rgb = RGBColor.from_string(BLACK)
title_style.paragraph_format.space_after = Pt(14)
title_p_pr = title_style.element.get_or_add_pPr()
title_border = title_p_pr.find(qn("w:pBdr"))
if title_border is not None:
    title_p_pr.remove(title_border)

for name, size, before, after in (("Heading 1", 16.5, 17, 8), ("Heading 2", 12.5, 12, 6)):
    style = styles[name]
    style.font.name = "Aptos Display"
    style._element.rPr.rFonts.set(qn("w:ascii"), "Aptos Display")
    style._element.rPr.rFonts.set(qn("w:hAnsi"), "Aptos Display")
    style.font.size = Pt(size)
    style.font.bold = True
    style.font.color.rgb = RGBColor.from_string(BLACK)
    style.paragraph_format.space_before = Pt(before)
    style.paragraph_format.space_after = Pt(after)

for style_name in ("List Bullet", "List Number"):
    style = styles[style_name]
    style.font.name = "Aptos"
    style._element.rPr.rFonts.set(qn("w:ascii"), "Aptos")
    style._element.rPr.rFonts.set(qn("w:hAnsi"), "Aptos")
    style.font.size = Pt(10.5)

# Header and footer
doc.settings.odd_and_even_pages_header_footer = False
section.header.paragraphs[0].text = ""

first_header = section.first_page_header
first_header.paragraphs[0].text = ""

footer = section.footer
fp = footer.paragraphs[0]
fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
fr = fp.add_run("Documento confidencial  |  Página ")
set_font(fr, size=8.5, color=MID_GRAY)
add_page_number(fp)

first_footer = section.first_page_footer
ffp = first_footer.paragraphs[0]
ffp.alignment = WD_ALIGN_PARAGRAPH.CENTER
ffr = ffp.add_run("Documento confidencial  |  V2")
set_font(ffr, size=8.5, color=MID_GRAY)

# Cover page
logo_cover = doc.add_paragraph()
logo_cover.alignment = WD_ALIGN_PARAGRAPH.CENTER
logo_cover.paragraph_format.space_before = Pt(24)
logo_cover.paragraph_format.space_after = Pt(14)
logo_cover_run = logo_cover.add_run()
logo_cover_shape = logo_cover_run.add_picture(LOGO, width=Inches(1.28))
logo_cover_shape._inline.docPr.set("descr", "Logo V2")

label = doc.add_paragraph()
label.alignment = WD_ALIGN_PARAGRAPH.CENTER
label.paragraph_format.space_after = Pt(10)
label_run = label.add_run("PROPOSTA COMERCIAL")
set_font(label_run, name="Aptos", size=9.5, bold=True, color=BRAND_BLUE)

title = doc.add_paragraph(style="Title")
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
title.add_run("Proposta para aquisição de 50% da V2")

subtitle = doc.add_paragraph()
subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
subtitle.paragraph_format.space_after = Pt(28)
sr = subtitle.add_run("Valuation de R$ 600 mil e formação de sociedade igualitária")
set_font(sr, name="Aptos Display", size=14, color=CHARCOAL)

intro = doc.add_paragraph()
intro.paragraph_format.space_after = Pt(22)
intro.paragraph_format.line_spacing = 1.18
intro.alignment = WD_ALIGN_PARAGRAPH.CENTER
ir = intro.add_run(
    "Esta proposta apresenta o valor estimado da V2, os fundamentos que justificam esse valor e as condições para que o investidor adquira 50% da empresa, com gestão e participação iguais entre os dois sócios."
)
set_font(ir, size=11.5)

cover_table = doc.add_table(rows=2, cols=3)
cover_table.alignment = WD_TABLE_ALIGNMENT.CENTER
cover_table.autofit = False
set_table_borders(cover_table)
cover_headers = ("Valuation da V2", "Participação", "Valor de 50%")
cover_values = ("R$ 600.000", "50%", "R$ 300.000")
for row_idx, values in enumerate((cover_headers, cover_values)):
    for col_idx, text in enumerate(values):
        cell = cover_table.rows[row_idx].cells[col_idx]
        set_cell_width(cell, (2.25, 1.65, 2.75)[col_idx])
        set_cell_margins(cell, top=220, start=180, bottom=220, end=180)
        set_cell_shading(cell, BRAND_BLUE if row_idx == 0 else PALE_BLUE)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_after = Pt(0)
        rr = p.add_run(text)
        set_font(rr, size=10.3 if row_idx == 0 else 13.5, bold=True, color=WHITE if row_idx == 0 else BRAND_BLUE)

doc.add_paragraph()
conf = doc.add_paragraph()
conf.alignment = WD_ALIGN_PARAGRAPH.CENTER
conf.paragraph_format.space_before = Pt(12)
cr = conf.add_run(
    "Data base  25 de setembro de 2026  |  Documento confidencial de negociação"
)
set_font(cr, size=9.5, color=MID_GRAY)

# Valuation summary
add_heading(doc, "Valuation da V2", page_break=True)
add_body(
    doc,
    "O valor econômico estimado da V2 é de R$ 600.000. Essa estimativa considera a capacidade de geração de lucro, o crescimento recente, os ativos operacionais, a carteira recorrente de clientes e os diferenciais próprios da empresa.",
)

add_table(
    doc,
    ["Base da avaliação", "Referência", "Por que agrega valor"],
    [
        ("Resultado anual normalizado", "R$ 169.680", "Demonstra capacidade de geração de caixa"),
        ("Múltiplo sobre o resultado", "3,54 vezes", "Referência conservadora para o negócio"),
        ("Ativos operacionais", "R$ 168.000", "Estoque, expositores, caixa e recebíveis"),
        ("Carteira comercial", "300 clientes", "Receita pulverizada e recorrente"),
        ("Rede ativa", "225 pontos", "Operação instalada e pronta para expansão"),
        ("Ativos próprios", "Marca e sistema", "Diferenciação, controle e eficiência"),
    ],
    [2.35, 1.45, 3.1],
    numeric_cols=[1],
)

add_body(
    doc,
    "No cenário central, o resultado anual normalizado é de aproximadamente R$ 169.680. O valuation de R$ 600.000 equivale a cerca de 3,54 vezes esse resultado. A faixa estimada foi de R$ 500.000 a R$ 700.000, sendo adotado o ponto médio de R$ 600.000 como valor de referência para a negociação.",
)

add_heading(doc, "Perfil da empresa", page_break=True)
add_body(
    doc,
    "A V2 atua desde 2018 na comercialização de acessórios para celular, eletrônicos e utilidades. A empresa possui CNPJ próprio, catálogo online com aproximadamente 180 produtos e operação baseada em vendas por pedido e expositores consignados instalados em estabelecimentos parceiros.",
)
add_body(
    doc,
    "O catálogo inclui cabos, carregadores, fontes, fones de ouvido, produtos Bluetooth, câmeras, acessórios automotivos, itens para casa e computadores, consoles, copos, produtos de cuidados pessoais, facas, ferramentas, garrafas, lanternas, mochilas, óculos, power banks, relógios, equipamentos de som, suportes e brinquedos.",
)

add_heading(doc, "Modelo de operação")
add_bullet(doc, "Cerca de 300 clientes recorrentes, sem concentração relevante em um único comprador.")
add_bullet(doc, "Aproximadamente 225 expositores ativos em pontos comerciais.")
add_bullet(doc, "Compras típicas entre R$ 200 e R$ 500 por cliente.")
add_bullet(doc, "Produtos fornecidos em consignação, com reposição de acordo com as vendas de cada ponto.")
add_bullet(doc, "Pessoas habilitadas para abrir novos pontos e realizar vendas por comissão.")
add_bullet(doc, "Estrutura familiar enxuta, com custos operacionais e remunerações incluídos na margem informada.")

# Operational metrics
add_heading(doc, "Indicadores financeiros e operacionais", page_break=True)
add_body(
    doc,
    "Os valores abaixo foram informados pela administração da V2 e representam a base utilizada nesta estimativa. A confirmação deverá ocorrer durante a análise documental do comprador.",
)

add_table(
    doc,
    ["Indicador", "Valor informado"],
    [
        ("Faturamento mensal atual", "R$ 30.000 a R$ 40.000"),
        ("Faturamento anual estimado", "R$ 360.000 a R$ 480.000"),
        ("Faturamento mensal há 12 meses", "Aproximadamente R$ 20.000"),
        ("Crescimento anual conservador", "Aproximadamente 50%"),
        ("Margem líquida informada", "Aproximadamente 50%"),
        ("Resultado mensal informado", "R$ 15.000 a R$ 20.000"),
        ("Resultado anual informado", "R$ 180.000 a R$ 240.000"),
        ("Estoque e expositores pelo custo", "Aproximadamente R$ 150.000"),
        ("Caixa disponível", "Aproximadamente R$ 10.000"),
        ("Contas a receber", "Aproximadamente R$ 8.000"),
        ("Dívidas financeiras", "R$ 0"),
        ("Inadimplência", "Praticamente zero, com atrasos limitados"),
    ],
    [3.55, 3.35],
    numeric_cols=[1],
)

add_heading(doc, "Economia dos pontos de venda", page_break=True)
add_table(
    doc,
    ["Métrica por ponto", "Referência"],
    [
        ("Custo médio de abertura", "R$ 198"),
        ("Faturamento mensal médio", "R$ 250"),
        ("Faixa mensal usual", "R$ 200 a R$ 700"),
        ("Picos sazonais", "Acima de R$ 1.000"),
        ("Lucro mensal estimado a 50% de margem", "R$ 125"),
        ("Retorno simples estimado", "Cerca de 1,6 mês"),
        ("Perda anual de pontos", "Aproximadamente 3%, com reposição"),
    ],
    [4.2, 2.7],
    numeric_cols=[1],
)

add_body(
    doc,
    "O retorno simples por ponto é uma referência baseada nas médias informadas. O resultado real varia conforme o tipo de comércio, o fluxo de consumidores, a sazonalidade, a composição do estoque e a velocidade de reposição.",
)

# Assets and differentiators
add_heading(doc, "Ativos e diferenciais da V2", page_break=True)

add_heading(doc, "Marca própria", level=2)
add_body(
    doc,
    "A V2 comercializa produtos com marca própria registrada no INPI. O registro protege a identidade comercial e permite incluir esse ativo na negociação societária, conforme a documentação da marca.",
)

add_heading(doc, "Sistema próprio", level=2)
add_body(
    doc,
    "O proprietário desenvolveu um sistema exclusivo para a V2 ao longo de seis a oito meses. A plataforma controla estoque, caixa, boletos, documentos, vendas e produtos consignados. O portal permite que cada cliente consulte os itens sob sua responsabilidade. O código e os direitos pertencem integralmente à V2, conforme informado.",
)

add_heading(doc, "Carteira de clientes", level=2)
add_body(
    doc,
    "A carteira é pulverizada e nenhum cliente representa parcela relevante do faturamento. Os pedidos costumam variar entre R$ 200 e R$ 500, reduzindo a exposição da empresa à saída isolada de uma conta.",
)

add_heading(doc, "Estrutura operacional", level=2)
add_body(
    doc,
    "A empresa opera sem dívidas e compra mercadorias à vista. Os custos incluem R$ 1.500 mensais para embalagem e cerca de R$ 3.600 em comissões. Profissionais comissionados abrem novos pontos, permitindo ampliar a cobertura com menor crescimento dos custos fixos.",
)

add_heading(doc, "Base patrimonial", level=2)
add_body(
    doc,
    "O estoque e os expositores somam aproximadamente R$ 150.000 pelo custo. Com R$ 10.000 em caixa e R$ 8.000 a receber, a base operacional alcança cerca de R$ 168.000. Esses recursos sustentam o valuation, mas não são somados integralmente ao valor calculado pelo lucro, evitando dupla contagem.",
)

# Valuation
add_heading(doc, "Metodologia de avaliação", page_break=True)
add_body(
    doc,
    "O valuation combina a capacidade de geração de resultado, a base de ativos e os fatores de risco do negócio. Para manter uma premissa conservadora, o lucro foi normalizado considerando incidência tributária estimada sobre a totalidade do faturamento. Essa normalização reduz o resultado utilizado no cálculo e torna a estimativa mais adequada para uma negociação com investidor.",
)

add_table(
    doc,
    ["Cenário", "Receita anual", "Resultado informado", "Resultado normalizado"],
    [
        ("Conservador", "R$ 360.000", "R$ 180.000", "R$ 145.440"),
        ("Central", "R$ 420.000", "R$ 210.000", "R$ 169.680"),
        ("Superior", "R$ 480.000", "R$ 240.000", "R$ 193.920"),
    ],
    [1.35, 1.75, 1.9, 1.9],
    numeric_cols=[1, 2, 3],
)

add_body(
    doc,
    "No cenário central, o resultado anual normalizado é de aproximadamente R$ 169.680. O valuation de R$ 600.000 corresponde a cerca de 3,54 vezes esse resultado anual. A faixa indicativa observada no cálculo ficou entre R$ 500.000 e R$ 700.000, e o ponto médio foi escolhido como referência para a proposta.",
)

add_heading(doc, "Fatores que sustentam o valor")
add_bullet(doc, "Histórico operacional desde 2018.")
add_bullet(doc, "Crescimento aproximado de 50% em 12 meses, pela faixa atual mais conservadora.")
add_bullet(doc, "Margem informada elevada e estrutura de custos enxuta.")
add_bullet(doc, "Ausência de dívida financeira e compras à vista.")
add_bullet(doc, "Carteira pulverizada, baixo atraso e reduzida perda de pontos.")
add_bullet(doc, "Marca registrada, sistema próprio e consignação controlada.")
add_bullet(doc, "Modelo de expansão com baixo custo inicial por novo ponto.")

add_heading(doc, "Premissas que devem ser confirmadas")
add_body(
    doc,
    "O preço definitivo dependerá da conferência de extratos, relatórios, margens, estoque, contas a receber, situação fiscal, registro da marca e titularidade do sistema. Mudanças relevantes podem alterar o valor negociado.",
)

# Deal structure
add_heading(doc, "Proposta para aquisição de 50%", page_break=True)
add_body(
    doc,
    "Com o valuation da V2 estabelecido em R$ 600.000, a aquisição de 50% da empresa corresponde a R$ 300.000. O investidor já realizou R$ 120.000 em investimentos reconhecidos pelas partes. O saldo de R$ 180.000 será composto por uma Fiorino avaliada em R$ 50.000 e por R$ 130.000 em recursos financeiros.",
)

add_table(
    doc,
    ["Composição da proposta", "Valor", "Resultado"],
    [
        ("Valuation total da V2", "R$ 600.000", "100% da empresa"),
        ("Valor correspondente a 50%", "R$ 300.000", "Participação adquirida"),
        ("Investimento já realizado", "R$ 120.000", "Valor reconhecido na negociação"),
        ("Fiorino", "R$ 50.000", "Investimento em bem"),
        ("Saldo financeiro", "R$ 130.000", "Recursos destinados ao caixa da V2"),
        ("Participação final", "50% / 50%", "Sociedade igualitária"),
    ],
    [2.45, 1.55, 2.9],
    numeric_cols=[1],
)

add_heading(doc, "O que o investidor passa a ter", level=2)
add_bullet(doc, "50% das quotas e dos resultados econômicos da V2.")
add_bullet(doc, "Participação igual nas decisões estratégicas da empresa.")
add_bullet(doc, "Acesso aos relatórios, vendas, estoque, caixa e demais informações da operação.")
add_bullet(doc, "Gestão e controle compartilhados com o sócio atual.")
add_bullet(doc, "Participação nos ativos e diferenciais da V2, incluindo marca, sistema, carteira e operação.")

add_body(
    doc,
    "Os R$ 130.000 poderão ser pagos conforme a disponibilidade financeira do investidor, em condições e prazos definidos entre as partes. Cada valor pago será abatido do saldo e revertido ao caixa da V2. A Fiorino será transferida à empresa como parte do investimento, após avaliação e regularização documental.",
)

# Mobile store and governance
add_heading(doc, "Projeto de loja móvel", page_break=True)
add_body(
    doc,
    "A Fiorino, avaliada em R$ 50.000, poderá ser utilizada como parte da negociação para aquisição de uma van estimada em R$ 100.000. A V2 complementará aproximadamente R$ 50.000 com os recursos que entrarem no caixa. A van será preparada para funcionar como loja móvel, ampliando a presença comercial e permitindo vendas em novos locais.",
)

add_table(
    doc,
    ["Composição estimada", "Valor", "Finalidade"],
    [
        ("Fiorino", "R$ 50.000", "Parte do pagamento ou troca pela van"),
        ("Complemento financeiro", "R$ 50.000", "Recursos do caixa da V2"),
        ("Aquisição estimada da van", "R$ 100.000", "Implantação da loja móvel"),
        ("Saldo financeiro remanescente", "R$ 80.000", "Permanece no caixa da empresa"),
    ],
    [2.45, 1.45, 3.0],
    numeric_cols=[1],
)

add_body(
    doc,
    "Os valores são estimados e deverão ser confirmados na compra do veículo. Custos de documentação, adaptação, comunicação visual e equipamentos da loja móvel serão aprovados pelos dois sócios antes da execução.",
)

add_heading(doc, "Governança da sociedade")
add_body(
    doc,
    "Com 50% para cada parte, os dois sócios terão participação igualitária, gestão compartilhada e o mesmo peso nas decisões estratégicas. O acordo de sócios deverá estabelecer regras simples e claras sobre:",
)
add_bullet(doc, "Responsabilidades e dedicação de cada sócio.")
add_bullet(doc, "Limites para compras, investimentos, dívidas e retiradas.")
add_bullet(doc, "Política de pró-labore, comissões e lucros.")
add_bullet(doc, "Acesso aos relatórios, estoque, vendas e contas bancárias.")
add_bullet(doc, "Proteção da marca, código-fonte, dados e carteira de clientes.")
add_bullet(doc, "Venda de quotas, preferência e saída de sócios.")
add_bullet(doc, "Mecanismo de desempate em decisões relevantes.")

# Closing and next steps
add_heading(doc, "Condições para conclusão da negociação", page_break=True)
add_body(
    doc,
    "A proposta econômica será confirmada após uma análise documental objetiva. Recomenda-se que as partes concluam as etapas abaixo antes da assinatura definitiva.",
)

steps = [
    "Conferir os últimos 12 meses de extratos, vendas e relatórios do sistema.",
    "Realizar inventário físico e avaliar produtos sem giro ou sujeitos à obsolescência.",
    "Confirmar caixa, recebíveis, obrigações, marca e titularidade do sistema.",
    "Documentar e reconhecer os R$ 120.000 já investidos para abatimento do preço.",
    "Avaliar a Fiorino em R$ 50.000 e verificar propriedade, documentação e ausência de ônus.",
    "Definir a forma de pagamento dos R$ 130.000 e o registro de cada entrada no caixa.",
    "Aprovar a compra da van e o orçamento de implantação da loja móvel.",
    "Preparar a cessão de quotas, a alteração contratual e o acordo de sócios.",
]
for idx, step in enumerate(steps, start=1):
    p = doc.add_paragraph(style="List Number")
    p.paragraph_format.space_after = Pt(5)
    p.add_run(step)

add_heading(doc, "Conclusão")
add_body(
    doc,
    "Com base no faturamento, na rentabilidade informada, nos ativos operacionais, na carteira de clientes, no histórico desde 2018 e nos diferenciais próprios da operação, a V2 apresenta valuation de referência de R$ 600.000. Portanto, 50% da empresa correspondem a R$ 300.000.",
)
add_body(
    doc,
    "Considerando os R$ 120.000 já investidos, o saldo de R$ 180.000 será atendido pela transferência de uma Fiorino avaliada em R$ 50.000 e pelo pagamento de R$ 130.000 conforme a disponibilidade financeira do investidor. Os pagamentos entrarão no caixa da V2. A Fiorino e aproximadamente R$ 50.000 desses recursos serão utilizados na aquisição de uma van estimada em R$ 100.000 para implantação de uma loja móvel, permanecendo o saldo financeiro na empresa.",
)

add_heading(doc, "Manifestação de interesse")
add_body(
    doc,
    "As assinaturas abaixo registram apenas o interesse em prosseguir com a análise e a negociação. A compra e o investimento dependerão dos documentos definitivos e das condições aprovadas pelas partes.",
)

sig_table = doc.add_table(rows=2, cols=2)
sig_table.alignment = WD_TABLE_ALIGNMENT.CENTER
sig_table.autofit = False
for row in sig_table.rows:
    for idx, cell in enumerate(row.cells):
        set_cell_width(cell, 3.25)
        set_cell_margins(cell, top=230, bottom=90)
        tc_pr = cell._tc.get_or_add_tcPr()
        borders = tc_pr.first_child_found_in("w:tcBorders")
        if borders is None:
            borders = OxmlElement("w:tcBorders")
            tc_pr.append(borders)
        for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
            tag = OxmlElement(f"w:{edge}")
            tag.set(qn("w:val"), "nil")
            borders.append(tag)
sig_table.cell(0, 0).paragraphs[0].add_run("__________________________________")
sig_table.cell(0, 1).paragraphs[0].add_run("__________________________________")
sig_table.cell(1, 0).paragraphs[0].add_run("Proprietário atual da V2")
sig_table.cell(1, 1).paragraphs[0].add_run("Investidor interessado")
for row in sig_table.rows:
    for cell in row.cells:
        for p in cell.paragraphs:
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_after = Pt(0)
            for run in p.runs:
                set_font(run, size=9.5, color=BLACK)

date_p = doc.add_paragraph()
date_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
date_p.paragraph_format.space_before = Pt(18)
date_r = date_p.add_run("Data  ______  /  ______  /  __________")
set_font(date_r, size=9.5, color=MID_GRAY)

doc.core_properties.title = "Proposta de investimento e aquisição de participação societária V2"
doc.core_properties.subject = "Valuation de referência e proposta de aquisição de 50 por cento da V2"
doc.core_properties.author = "V2"
doc.core_properties.keywords = "V2, valuation, investimento, participação societária"

doc.save(OUTPUT)
print(OUTPUT)

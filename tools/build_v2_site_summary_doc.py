from pathlib import Path

from docx import Document
from docx.enum.table import WD_ALIGN_VERTICAL
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


OUT = Path("outputs/resumo-projeto-site-v2-distribuidora.docx").resolve()


def set_cell_shading(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), fill)
    tc_pr.append(shd)


def set_cell_borders(cell, color="D9D9D9"):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    borders = tc_pr.first_child_found_in("w:tcBorders")
    if borders is None:
        borders = OxmlElement("w:tcBorders")
        tc_pr.append(borders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        tag = f"w:{edge}"
        element = borders.find(qn(tag))
        if element is None:
            element = OxmlElement(tag)
            borders.append(element)
        element.set(qn("w:val"), "single")
        element.set(qn("w:sz"), "6")
        element.set(qn("w:space"), "0")
        element.set(qn("w:color"), color)


def set_cell_text(cell, text, bold=False, color=None):
    cell.text = ""
    paragraph = cell.paragraphs[0]
    paragraph.alignment = WD_ALIGN_PARAGRAPH.LEFT
    run = paragraph.add_run(text)
    run.bold = bold
    run.font.name = "Arial"
    run.font.size = Pt(9.5)
    if color:
        run.font.color.rgb = RGBColor.from_string(color)
    cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
    set_cell_borders(cell)


def add_heading(doc, text):
    paragraph = doc.add_heading(text, level=1)
    paragraph.style.font.color.rgb = RGBColor(0, 0, 0)
    paragraph.paragraph_format.space_before = Pt(16)
    paragraph.paragraph_format.space_after = Pt(6)
    return paragraph


def add_bullet(doc, text):
    paragraph = doc.add_paragraph(style="List Bullet")
    paragraph.paragraph_format.space_after = Pt(4)
    run = paragraph.add_run(text)
    run.font.name = "Arial"
    run.font.size = Pt(10.5)


def add_table(doc, rows):
    table = doc.add_table(rows=1, cols=3)
    table.autofit = False
    widths = [Inches(1.35), Inches(2.05), Inches(3.0)]
    headers = ["Área", "Situação atual", "Observação"]
    for idx, header in enumerate(headers):
        cell = table.rows[0].cells[idx]
        cell.width = widths[idx]
        set_cell_shading(cell, "0B35F0")
        set_cell_text(cell, header, bold=True, color="FFFFFF")
    for row_index, row in enumerate(rows):
        cells = table.add_row().cells
        for idx, value in enumerate(row):
            cells[idx].width = widths[idx]
            if row_index % 2 == 1:
                set_cell_shading(cells[idx], "F4F7FF")
            set_cell_text(cells[idx], value)
    doc.add_paragraph()


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc = Document()

    section = doc.sections[0]
    section.top_margin = Inches(0.75)
    section.bottom_margin = Inches(0.75)
    section.left_margin = Inches(0.85)
    section.right_margin = Inches(0.85)

    styles = doc.styles
    styles["Normal"].font.name = "Arial"
    styles["Normal"].font.size = Pt(10.5)
    styles["Title"].font.name = "Arial"
    styles["Title"].font.size = Pt(22)
    styles["Title"].font.bold = True
    styles["Title"].font.color.rgb = RGBColor(0, 0, 0)
    styles["Heading 1"].font.name = "Arial"
    styles["Heading 1"].font.size = Pt(15)
    styles["Heading 1"].font.bold = True
    styles["Heading 1"].font.color.rgb = RGBColor(0, 0, 0)

    title = doc.add_paragraph(style="Title")
    title.add_run("Resumo do projeto do novo site da V2 Distribuidora")

    intro = doc.add_paragraph()
    intro.paragraph_format.space_after = Pt(10)
    intro.add_run(
        "Este documento resume o pedido feito para recriar e melhorar o site v2distribuidora.com, "
        "integrando a nova loja ao CRM v2-crm e preparando a operação para pedidos online e futuros marketplaces."
    )

    add_heading(doc, "Objetivo")
    add_bullet(doc, "Recriar o site atual da V2 Distribuidora mantendo o padrão visual real da marca.")
    add_bullet(doc, "Transformar o site em uma loja B2B mais organizada, com carrinho e checkout.")
    add_bullet(doc, "Conectar os pedidos do site ao CRM v2-crm, evitando uma loja paralela sem controle operacional.")
    add_bullet(doc, "Deixar a base preparada para automação futura com Mercado Livre e outras plataformas.")

    add_heading(doc, "Estado atual")
    add_table(
        doc,
        [
            (
                "Site novo",
                "Criado em uma pasta separada do CRM e publicado em URL temporária do Sites.",
                "A primeira versão já está online e pública.",
            ),
            (
                "Pasta local",
                r"C:\Users\eumai\.codex\visualizations\2026\09\02\01a061e6-db51-7441-b4c3-908640ed87a5\v2-storefront",
                "Contém o código do novo storefront.",
            ),
            (
                "Materiais reais",
                r"E:\NOVA V2",
                "Usada como fonte de imagens, produtos, mockups, fotos e identidade visual.",
            ),
            (
                "CRM",
                r"C:\Users\eumai\v2-crm",
                "Recebeu uma nova rota para pedidos de e-commerce.",
            ),
            (
                "Publicação",
                "Versão 1 publicada. Versão 2 salva com melhorias visuais, aguardando aprovação para ir ao ar.",
                "A versão 2 usa materiais reais e cores mais fiéis ao site atual.",
            ),
        ],
    )

    add_heading(doc, "O que já foi implementado")
    add_bullet(doc, "Novo site público com apresentação institucional, loja B2B, catálogo, carrinho e checkout.")
    add_bullet(doc, "Catálogo ampliado com produtos reais: cabos, carregadores, kits e fones.")
    add_bullet(doc, "Visual ajustado para respeitar o padrão do site real: azul V2, laranja nos destaques e tons de apoio verdes e amarelos.")
    add_bullet(doc, "Uso de imagens reais de produtos, expositores e materiais da pasta NOVA V2.")
    add_bullet(doc, "Configuração inicial de domínio no Sites para v2distribuidora.com e www.v2distribuidora.com.")
    add_bullet(doc, "Rota criada no CRM para receber pedidos online com chave de segurança.")

    add_heading(doc, "Como a integração com o CRM funciona")
    paragraph = doc.add_paragraph()
    paragraph.add_run(
        "O site envia os dados do checkout para uma rota segura no CRM. Quando o cliente já existe, "
        "o CRM cria uma solicitação de pedido vinculada ao cliente. Quando o cliente ainda não existe, "
        "o CRM cria um prospect para atendimento comercial, preservando dados de contato, origem, forma de pagamento, frete e itens solicitados."
    )

    add_heading(doc, "Pendências")
    add_bullet(doc, "Publicar a versão 2 melhorada no site público após aprovação visual.")
    add_bullet(doc, "Configurar no ambiente de produção do CRM a variável ECOMMERCE_API_KEY com a mesma chave usada pelo site.")
    add_bullet(doc, "Publicar o CRM atualizado para a rota de e-commerce ficar disponível em produção.")
    add_bullet(doc, "Adicionar os registros DNS na HostGator para ativar v2distribuidora.com e www.v2distribuidora.com.")
    add_bullet(doc, "Evoluir frete de 'a combinar' para regras de cálculo ou integração com transportadoras.")
    add_bullet(doc, "Criar a camada de canais externos para Mercado Livre, Shopee e outras plataformas.")

    add_heading(doc, "Dados de acesso e domínio")
    table = doc.add_table(rows=1, cols=2)
    table.autofit = False
    table.rows[0].cells[0].width = Inches(2.1)
    table.rows[0].cells[1].width = Inches(4.25)
    set_cell_shading(table.rows[0].cells[0], "0B35F0")
    set_cell_shading(table.rows[0].cells[1], "0B35F0")
    set_cell_text(table.rows[0].cells[0], "Item", bold=True, color="FFFFFF")
    set_cell_text(table.rows[0].cells[1], "Informação", bold=True, color="FFFFFF")
    data_rows = [
        ("URL temporária publicada", "https://v2-distribuidora.maik-mk20-creative.chatgpt.site"),
        ("Domínio principal", "v2distribuidora.com"),
        ("Domínio com www", "www.v2distribuidora.com"),
        ("CRM publicado", "https://crm-v2-jet.vercel.app"),
        ("Observação de segurança", "A chave secreta de integração não foi escrita neste documento."),
    ]
    for idx, row in enumerate(data_rows):
        cells = table.add_row().cells
        for cell_idx, value in enumerate(row):
            cells[cell_idx].width = Inches(2.1 if cell_idx == 0 else 4.25)
            if idx % 2 == 1:
                set_cell_shading(cells[cell_idx], "F4F7FF")
            set_cell_text(cells[cell_idx], value)

    add_heading(doc, "Próximos passos recomendados")
    add_bullet(doc, "Revisar a versão 2 localmente e aprovar a publicação.")
    add_bullet(doc, "Publicar a versão 2 no Sites.")
    add_bullet(doc, "Atualizar variáveis e publicar o CRM.")
    add_bullet(doc, "Configurar DNS na HostGator e validar SSL.")
    add_bullet(doc, "Planejar a segunda fase: frete, estoque online em tempo real, pagamento direto e integração com marketplaces.")

    doc.save(OUT)
    print(OUT)


if __name__ == "__main__":
    main()

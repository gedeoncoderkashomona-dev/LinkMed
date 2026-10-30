import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    HRFlowable,
    Image,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Font configuration
FONT_REG = 'Helvetica'
FONT_BOLD = 'Helvetica-Bold'
FONT_ITALIC = 'Helvetica-Oblique'

if os.path.exists('C:/Windows/Fonts/arial.ttf'):
    try:
        pdfmetrics.registerFont(TTFont('Arial', 'C:/Windows/Fonts/arial.ttf'))
        pdfmetrics.registerFont(TTFont('Arial-Bold', 'C:/Windows/Fonts/arialbd.ttf'))
        pdfmetrics.registerFont(TTFont('Arial-Italic', 'C:/Windows/Fonts/ariali.ttf'))
        FONT_REG = 'Arial'
        FONT_BOLD = 'Arial-Bold'
        FONT_ITALIC = 'Arial-Italic'
    except Exception:
        pass


class ProfessionalNumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_decorations(self, total_pages):
        self.saveState()

        # Running header (from page 2 onwards)
        if self._pageNumber > 1:
            self.setStrokeColor(colors.HexColor('#cbd5e1'))
            self.setLineWidth(0.75)
            self.line(38, 808, 557, 808)

            self.setFont(FONT_BOLD, 8)
            self.setFillColor(colors.HexColor('#0f3460'))
            self.drawString(38, 814, "LINKMED SOLUÇÕES MÉDICAS — PROPOSTA TÉCNICO-COMERCIAL")

            self.setFont(FONT_REG, 8)
            self.setFillColor(colors.HexColor('#64748b'))
            self.drawRightString(557, 814, "PLATAFORMA REGULA-ON (RDC 665/2022 ANVISA)")

        # Running footer (all pages)
        self.setStrokeColor(colors.HexColor('#cbd5e1'))
        self.setLineWidth(0.75)
        self.line(38, 38, 557, 38)

        self.setFont(FONT_BOLD, 7.5)
        self.setFillColor(colors.HexColor('#1e293b'))
        self.drawString(38, 26, "Desenvolvedor: Gedeon Kalala Kashomona")

        self.setFont(FONT_REG, 7.5)
        self.setFillColor(colors.HexColor('#64748b'))
        self.drawString(220, 26, "Cliente: Filipe Gerson Farias")

        page_str = f"Página {self._pageNumber} de {total_pages}"
        self.drawRightString(557, 26, page_str)

        self.restoreState()


def build_proposal_pdf(output_path: str, logo_path: str):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=38,
        rightMargin=38,
        topMargin=38,
        bottomMargin=44,
    )

    styles = getSampleStyleSheet()

    # Corporate Colors
    NAVY = colors.HexColor('#0f3460')
    SLATE_DARK = colors.HexColor('#1e293b')
    SLATE_MUTED = colors.HexColor('#475569')
    TEXT_COLOR = colors.HexColor('#0f172a')
    BG_LIGHT = colors.HexColor('#f8fafc')
    BORDER_COLOR = colors.HexColor('#cbd5e1')
    BLUE_BG = colors.HexColor('#eff6ff')
    BLUE_TEXT = colors.HexColor('#1e40af')
    GREEN_BG = colors.HexColor('#f0fdf4')
    GREEN_TEXT = colors.HexColor('#166534')

    # Typography Styles
    doc_title = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName=FONT_BOLD,
        fontSize=18,
        leading=22,
        textColor=NAVY,
    )

    doc_subtitle = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName=FONT_REG,
        fontSize=10,
        leading=14,
        textColor=SLATE_MUTED,
    )

    sec_title = ParagraphStyle(
        'SecTitle',
        parent=styles['Normal'],
        fontName=FONT_BOLD,
        fontSize=12,
        leading=16,
        textColor=NAVY,
        spaceBefore=12,
        spaceAfter=5,
        keepWithNext=True,
    )

    body = ParagraphStyle(
        'BodyTextCustom',
        parent=styles['Normal'],
        fontName=FONT_REG,
        fontSize=8.6,
        leading=12.2,
        textColor=TEXT_COLOR,
        alignment=0, # Left-aligned to prevent awkward word gaps
    )

    body_bold = ParagraphStyle(
        'BodyBoldCustom',
        parent=body,
        fontName=FONT_BOLD,
    )

    bullet = ParagraphStyle(
        'BulletCustom',
        parent=body,
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=2.5,
    )

    # Table cell styles
    th_style = ParagraphStyle(
        'TH',
        parent=styles['Normal'],
        fontName=FONT_BOLD,
        fontSize=8.2,
        leading=10.5,
        textColor=colors.white,
        alignment=0,
    )

    th_center = ParagraphStyle(
        'THCenter',
        parent=th_style,
        alignment=1,
    )

    td_style = ParagraphStyle(
        'TD',
        parent=styles['Normal'],
        fontName=FONT_REG,
        fontSize=8,
        leading=11,
        textColor=TEXT_COLOR,
        alignment=0,
    )

    td_bold = ParagraphStyle(
        'TDBold',
        parent=td_style,
        fontName=FONT_BOLD,
    )

    td_center = ParagraphStyle(
        'TDCenter',
        parent=td_style,
        alignment=1,
    )

    td_center_bold = ParagraphStyle(
        'TDCenterBold',
        parent=td_bold,
        alignment=1,
    )

    story = []

    # =========================================================================
    # PÁGINA 1 — CAPA, IDENTIFICAÇÃO E ESPECIFICAÇÃO DO SISTEMA
    # =========================================================================
    header_cells = []
    if os.path.exists(logo_path):
        header_cells.append([
            Image(logo_path, width=135, height=46),
            Paragraph(
                "<font size=8 color='#64748b'><b>DOCUMENTO CONFIDENCIAL</b><br/>"
                "ESTUDO TÉCNICO & PROPOSTA COMERCIAL<br/>"
                "VERSÃO: 1.0.1-BETA · OUTUBRO/2026</font>",
                ParagraphStyle('HeaderNote', parent=body, alignment=2)
            )
        ])
    else:
        header_cells.append([
            Paragraph("<b>LINKMED SOLUÇÕES MÉDICAS</b>", doc_title),
            Paragraph("<font size=8 color='#64748b'>PROPOSTA TÉCNICO-COMERCIAL</font>", styles['Normal'])
        ])

    header_table = Table(header_cells, colWidths=[200, 319])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ALIGN', (1,0), (1,0), 'RIGHT'),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width="100%", thickness=1.5, color=NAVY, spaceBefore=2, spaceAfter=10))

    story.append(Paragraph("PROPOSTA TÉCNICO-COMERCIAL & ESTUDO DE VIABILIDADE", doc_title))
    story.append(Spacer(1, 3))
    story.append(Paragraph(
        "Desenvolvimento, Implantação e Sustentação da Plataforma <b>Regula-On / LinkMed</b><br/>"
        "Sistema Especializado de Gestão da Qualidade Sanitária e Assistência Técnica de Equipamentos Médicos",
        doc_subtitle
    ))
    story.append(Spacer(1, 10))

    # Tabela de Identificação das Partes
    partes_data = [
        [
            Paragraph("<b>CLIENTE / CONTRATANTE:</b><br/>Filipe Gerson Farias<br/><font color='#475569'>LinkMed Soluções Médicas</font>", td_style),
            Paragraph("<b>DESENVOLVEDOR / RESPONSÁVEL TÉCNICO:</b><br/>Gedeon Kalala Kashomona<br/><font color='#475569'>Engenheiro de Software Full Stack</font>", td_style),
        ],
        [
            Paragraph("<b>SISTEMA DESENVOLVIDO:</b><br/>Regula-On (Módulos Operacionais & POPs)", td_style),
            Paragraph("<b>ENQUADRAMENTO NORMATIVO:</b><br/>RDC nº 665/2022 ANVISA · Metrologia RBC · INMETRO", td_style),
        ]
    ]
    partes_table = Table(partes_data, colWidths=[259, 260])
    partes_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BG_LIGHT),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(partes_table)
    story.append(Spacer(1, 10))

    # Seção 1
    story.append(Paragraph("1. O QUE É ESTE SOFTWARE (COMPLEXIDADE E VALOR REGULATÓRIO)", sec_title))
    story.append(Paragraph(
        "O <b>Regula-On / LinkMed não é um site comum nem um sistema genérico de chamados</b>. "
        "Ele é um <b>software vertical de engenharia clínica e conformidade regulatória sanitária (HealthTech / MedTech)</b> "
        "desenvolvido sob medida para atender rigorosamente à <b>RDC nº 665/2022 da ANVISA</b> "
        "(Boas Práticas de Fabricação, Manutenção e Rastreabilidade de Dispositivos Médicos). "
        "A ausência desses controles informatizados em uma assistência técnica expõe a empresa a riscos graves de "
        "<b>autuações fiscais, multas pesadas e cancelamento da Autorização de Funcionamento de Empresa (AFE) junto à ANVISA</b>.",
        body
    ))
    story.append(Spacer(1, 6))

    story.append(Paragraph("Módulos e Recursos Críticos Construídos e Homologados:", body_bold))
    story.append(Spacer(1, 3))

    features = [
        "<b>Governança Documental Blindada:</b> Travamento de código onde técnicos e operadores não podem alterar quem elaborou, revisou ou aprovou documentos. Somente a Qualidade e a Diretoria possuem autorização regulamentar.",
        "<b>9 Módulos Operacionais Integrados (REGs):</b> Digitalização com validações metrológicas de REG-022 (Inspeção de Recebimento), REG-034 (Limpeza e Desinfecção), REG-035 (Checklist Olidef/TEB), REG-016 (Etapas com 8 etiquetas de status), REG-030 (Calibração RBC com cálculo automático de erro), REG-017 (Temperatura e Umidade 2x ao dia), REG-018 (Higienização Semanal), REG-040 (Pulseira Antiestática ESD) e Validades de Instrumentos.",
        "<b>Dossiê Unificado por Ordem de Serviço (OS):</b> Janela modal que consolida em tempo real todas as 5 etapas técnicas daquela OS, eliminando digitação duplicada e permitindo auditoria instantânea do equipamento.",
        "<b>POP-020 Oficial Integrado:</b> Digitalização na íntegra do procedimento oficial da LinkMed (seções 1 a 9, tabela de registros e revisões) com geração de PDF oficial de 4 páginas conforme padrão ISO 32000-1.",
        "<b>Trilha de Auditoria (Audit Trail):</b> Registro imutável de quem fez, quando fez, IP e valores anteriores/posteriores de cada ação (requisito mandatório em auditorias sanitárias).",
        "<b>Não Conformidades (REG-020) & Treinamentos (REG-008):</b> Controle de desvios com causa raiz e avaliação de eficácia com notas de 1 a 5 e plano de ação.",
        "<b>Alertas Automáticos de Vencimento:</b> Notificação antecipada de instrumentos a vencer em 60 dias."
    ]

    for f in features:
        story.append(Paragraph(f"• {f}", bullet))

    # =========================================================================
    # PÁGINA 2 — VALORAÇÃO DE MERCADO E CUSTOS REAIS DE NUVEM
    # =========================================================================
    story.append(PageBreak())

    story.append(Paragraph("2. VALORAÇÃO REAL DE MERCADO (FONTES E BENCHMARKING DO SETOR)", sec_title))
    story.append(Paragraph(
        "Para proporcionar total transparência sobre o valor do ativo tecnológico entregue, apresenta-se um levantamento "
        "dos valores praticados no mercado brasileiro de software para Saúde e Gestão da Qualidade Regulatória "
        "(softwares de referência como <i>SoftExpert, Docnix, Qualiex, Arkmeds e Engeman</i>, além de fábricas de software sob medida):",
        body
    ))
    story.append(Spacer(1, 6))

    # Tabela 1: Mercado (com cabeçalho legível em texto branco)
    market_rows = [
        [
            Paragraph("SOLUÇÃO / FORNECEDOR", th_style),
            Paragraph("IMPLANTAÇÃO / SETUP", th_center),
            Paragraph("MENSALIDADE RECORRENTE", th_center),
            Paragraph("CARACTERÍSTICAS NO MERCADO", th_style),
        ],
        [
            Paragraph("<b>Softwares Enterprise SGQ</b><br/>(SoftExpert / Docnix)", td_style),
            Paragraph("R$ 25.000 a R$ 60.000", td_center),
            Paragraph("R$ 2.500 a R$ 6.000 /mês", td_center),
            Paragraph("Cobrado por módulos e por usuário ativo. Custo proibitivo para PMEs.", td_style),
        ],
        [
            Paragraph("<b>Engenharia Clínica SaaS</b><br/>(Arkmeds / Engeman)", td_style),
            Paragraph("R$ 8.000 a R$ 18.000", td_center),
            Paragraph("R$ 1.200 a R$ 3.200 /mês", td_center),
            Paragraph("Focado apenas em OS básica; não contempla os POPs e formulários específicos da LinkMed.", td_style),
        ],
        [
            Paragraph("<b>Fábrica de Software Sob Medida</b><br/>(Desenvolvimento Full Stack)", td_style),
            Paragraph("R$ 35.000 a R$ 75.000", td_center),
            Paragraph("R$ 1.500 a R$ 3.500 /mês<br/>(ou R$ 150 a R$ 220/hora)", td_center),
            Paragraph("Cálculo médio de 250h a 350h de engenharia para regras específicas da RDC 665/2022.", td_style),
        ],
    ]

    t_market = Table(market_rows, colWidths=[120, 110, 115, 174])
    t_market.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), NAVY),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
    ]))
    story.append(t_market)
    story.append(Spacer(1, 12))

    story.append(Paragraph("3. CUSTOS REAIS DE INFRAESTRUTURA DE NUVEM & BANCO DE DADOS", sec_title))
    story.append(Paragraph(
        "Atualmente o sistema operou em ambiente de desenvolvimento no nível gratuito. Para um ambiente de produção regulado pela ANVISA, "
        "<b>é obrigatório migrar para servidores dedicados</b>, pois no plano gratuito o banco de dados é congelado após inatividade "
        "e não possui cópias de segurança diárias (Point-in-Time Recovery), o que é inaceitável em auditorias regulatórias.",
        body
    ))
    story.append(Spacer(1, 6))

    # Tabela 2: Custos de Nuvem (cabeçalho legível em texto branco)
    cloud_rows = [
        [
            Paragraph("COMPONENTE DE NUVEM", th_style),
            Paragraph("FINALIDADE TÉCNICA REGULATÓRIA", th_style),
            Paragraph("CUSTO REAL MENSAL", th_center),
        ],
        [
            Paragraph("<b>Supabase Pro Tier</b><br/>(PostgreSQL Dedicado)", td_style),
            Paragraph("Garante que o banco nunca hiberne, com 8GB de armazenamento, alta performance e <b>backup diário automatizado de 7 dias com restauração pontual</b> (exigido pela ANVISA).", td_style),
            Paragraph("US$ 25,00<br/>(~R$ 145,00 /mês)", td_center),
        ],
        [
            Paragraph("<b>Servidor Next.js Pro</b><br/>(Vercel Pro / VPS Dedicada)", td_style),
            Paragraph("Servidor de alta disponibilidade (99.9% uptime), geração de páginas ultrarrápida, certificado de segurança SSL e suporte contínuo PWA.", td_style),
            Paragraph("US$ 20,00<br/>(~R$ 115,00 /mês)", td_center),
        ],
        [
            Paragraph("<b>Domínio & E-mail Transacional</b><br/>(ex: linkmed.com.br)", td_style),
            Paragraph("Endereço web oficial da empresa e envio de notificações automáticas de alertas de calibração.", td_style),
            Paragraph("~R$ 20,00 a R$ 30,00 /mês", td_center),
        ],
        [
            Paragraph("<b>TOTAL NUVEM A PREÇO DE CUSTO:</b>", td_bold),
            Paragraph("<b>Infraestrutura de alta confiabilidade faturada a preço de fábrica (sem margem do desenvolvedor).</b>", td_style),
            Paragraph("<b>R$ 280,00 a R$ 290,00 /mês</b>", td_center_bold),
        ],
    ]

    t_cloud = Table(cloud_rows, colWidths=[130, 255, 134])
    t_cloud.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), NAVY),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('ROWBACKGROUNDS', (0,1), (-1,-2), [colors.white, BG_LIGHT]),
        ('BACKGROUND', (0,-1), (-1,-1), BLUE_BG),
    ]))
    story.append(t_cloud)
    story.append(Spacer(1, 12))

    # =========================================================================
    # PÁGINA 3 — QUADRO COMPARATIVO DAS PROPOSTAS & ACEITE
    # =========================================================================
    story.append(PageBreak())

    story.append(Paragraph("4. TABELA DE PREÇOS: O QUE O SISTEMA CUSTA vs. QUANTO VOCÊ VAI PAGAR", sec_title))
    story.append(Paragraph(
        "Abaixo está detalhada a comparação direta entre o <b>valor real que o mercado cobra por um software desse porte</b> "
        "e o <b>valor especial que você (Filipe) vai pagar</b> pelo fato de sermos amigos e estarmos iniciando esta parceria na fase Beta:",
        body
    ))
    story.append(Spacer(1, 6))

    # Tabela de Comparação Direta em 4 Colunas
    comp_rows = [
        [
            Paragraph("SERVIÇO / ESCOPO", th_style),
            Paragraph("PREÇO REAL DO SISTEMA<br/>(O que ele vale no mercado)", th_center),
            Paragraph("O QUE VOCÊ VAI PAGAR<br/>(Condição Especial Filipe Farias)", th_center),
            Paragraph("SUA ECONOMIA / DESCONTO", th_center),
        ],
        [
            Paragraph("<b>Mão de Obra de Desenvolvimento</b><br/>(Software completo e módulos)", td_style),
            Paragraph("<b>R$ 38.000,00</b><br/>(Preço padrão de mercado)", td_center),
            Paragraph("<b>R$ 3.500,00</b> parcelado<br/>(ou <b>R$ 3.000,00</b> à vista)", td_center_bold),
            Paragraph("<font color='#166534'><b>Economia de R$ 34.500,00</b><br/>(91% de desconto)</font>", td_center),
        ],
        [
            Paragraph("<b>Hospedagem & Banco de Dados</b><br/>(Supabase Pro + Servidor)", td_style),
            Paragraph("R$ 1.200,00 / mês<br/>(Preço com margem de agência)", td_center),
            Paragraph("<b>R$ 280,00 / mês</b><br/>(Estritamente a preço de custo)", td_center_bold),
            Paragraph("<font color='#166534'><b>Economia de R$ 920,00 / mês</b><br/>(Preço de fábrica)</font>", td_center),
        ],
        [
            Paragraph("<b>Correção de Bugs</b><br/>(Tudo o que foi entregue)", td_style),
            Paragraph("Cobrado por hora<br/>(R$ 180,00 / hora)", td_center),
            Paragraph("<b>R$ 0,00 — 100% GRATUITO</b><br/>(Garantia total com prioridade)", td_center_bold),
            Paragraph("<font color='#166534'><b>100% Incluso</b><br/>Sem custos adicionais</font>", td_center),
        ],
        [
            Paragraph("<b>Novas Telas / Features Futuras</b><br/>(Demandas extras sob pedido)", td_style),
            Paragraph("R$ 180,00 a R$ 220,00 / hora<br/>(Mercado de software médico)", td_center),
            Paragraph("<b>R$ 120,00 / hora técnica</b><br/>(Sob demanda, sem mensalidade extra)", td_center_bold),
            Paragraph("<font color='#166534'><b>Desconto de R$ 60/h a R$ 100/h</b><br/>na hora técnica</font>", td_center),
        ],
    ]

    t_comp = Table(comp_rows, colWidths=[135, 125, 139, 120])
    t_comp.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), NAVY),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
        ('BACKGROUND', (2,1), (2,-1), GREEN_BG),
    ]))
    story.append(t_comp)
    story.append(Spacer(1, 8))

    # Resumo Direto e Claro
    resumo_box_data = [
        [
            Paragraph("<b>RESUMO DIRETO DO QUE O FILIPE VAI PAGAR:</b>", ParagraphStyle('RTitle', parent=body_bold, textColor=NAVY, fontSize=9)),
        ],
        [
            Paragraph(
                "• <b>Mão de Obra de Desenvolvimento (Pagamento Único):</b> <b>R$ 3.000,00 à vista</b> (ou <b>2x de R$ 1.750,00 = R$ 3.500,00</b>).<br/>"
                "• <b>Custo Fixo Mensal de Nuvem (Banco + Servidor):</b> <b>R$ 280,00 / mês</b> (repassado a preço de custo do Supabase Pro e Servidor).<br/>"
                "• <b>Correção de Bugs:</b> <b>Totalmente Gratuito</b> para qualquer ajuste no que já foi desenvolvido.<br/>"
                "• <b>Novas Implementações (se houver necessidade no futuro):</b> <b>R$ 120,00 por hora trabalhada</b>, sem mensalidade extra obrigatória.",
                body
            )
        ],
        [
            Paragraph(
                "<b>POR QUE ESSA DIFERENÇA TÃO GRANDE E COMO FICA DEPOIS?</b><br/>"
                "1. <b>Hoje (Para a LinkMed / Fase Beta):</b> Você paga apenas <b>R$ 3.500,00</b> de mão de obra porque somos amigos e estamos iniciando essa parceria. Como o sistema está na fase Beta, a LinkMed será a empresa pioneira a rodar na prática. Você ganha um software de R$ 38.000,00 por um valor simbólico de piloto, e eu ganho a validação da ferramenta em campo real.<br/>"
                "2. <b>Amanhã (Para Novos Clientes de Mercado):</b> Quando o sistema estiver 100% rodado e formos comercializar para outras assistências técnicas e clínicas no mercado, <b>o preço que vamos cobrar dos outros clientes será de R$ 6.000,00 a R$ 8.000,00 por mês (ou R$ 40.000,00 de licença)</b>. A LinkMed terá a sua condição de parceira fundadora protegida para sempre e participará do sucesso da expansão!",
                ParagraphStyle('RNote', parent=body, fontSize=7.8, leading=10.8, textColor=colors.HexColor('#78350f'))
            )
        ]
    ]

    resumo_box = Table(resumo_box_data, colWidths=[519])
    resumo_box.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#e0f2fe')),
        ('BACKGROUND', (0,1), (-1,1), colors.white),
        ('BACKGROUND', (0,2), (-1,2), colors.HexColor('#fffbeb')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#f59e0b')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#fed7aa')),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(resumo_box)
    story.append(Spacer(1, 8))

    # Seção 5: Garantias e Assinaturas
    story.append(Paragraph("5. GARANTIAS TÉCNICAS E ACEITE", sec_title))
    story.append(Paragraph(
        "O desenvolvedor assegura a total estabilidade do código, 21 testes unitários aprovados, ausência de erros de build e conformidade documental. "
        "O suporte a dúvidas operacionais e correções de bugs da fase Beta é prioritário com SLA de até 24 horas em dias úteis.",
        body
    ))
    story.append(Spacer(1, 12))

    # Assinaturas
    sig_data = [
        [
            Paragraph("____________________________________________<br/><b>FILIPE GERSON FARIAS</b><br/>LinkMed Soluções Médicas<br/><i>Contratante / Parceiro</i>", ParagraphStyle('Sig1', parent=body, alignment=1)),
            Paragraph("____________________________________________<br/><b>GEDEON KALALA KASHOMONA</b><br/>Engenheiro de Software Full Stack<br/><i>Desenvolvedor / Responsável Técnico</i>", ParagraphStyle('Sig2', parent=body, alignment=1)),
        ]
    ]
    sig_table = Table(sig_data, colWidths=[259, 260])
    sig_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(sig_table)

    # Build
    doc.build(story, canvasmaker=ProfessionalNumberedCanvas)
    print(f"[OK] PDF profissional regerado com sucesso em: {output_path}")


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "PROPOSTA_COMERCIAL_LINKMED_FILIPE_FARIAS.pdf"
    logo = sys.argv[2] if len(sys.argv) > 2 else "public/logo-linkmed.jpg"
    build_proposal_pdf(out, logo)

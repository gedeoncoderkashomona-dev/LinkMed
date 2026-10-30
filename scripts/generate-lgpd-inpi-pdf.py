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


class SecurityNumberedCanvas(canvas.Canvas):
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

        if self._pageNumber > 1:
            self.setStrokeColor(colors.HexColor('#cbd5e1'))
            self.setLineWidth(0.75)
            self.line(38, 808, 557, 808)

            self.setFont(FONT_BOLD, 8)
            self.setFillColor(colors.HexColor('#0f3460'))
            self.drawString(38, 814, "LINKMED SOLUÇÕES MÉDICAS — SEGURANÇA DA INFORMAÇÃO, LGPD & PROPRIEDADE INTELECTUAL")

            self.setFont(FONT_REG, 8)
            self.setFillColor(colors.HexColor('#64748b'))
            self.drawRightString(557, 814, "PLATAFORMA REGULA-ON (RDC 665/2022)")

        # Footer
        self.setStrokeColor(colors.HexColor('#cbd5e1'))
        self.setLineWidth(0.75)
        self.line(38, 38, 557, 38)

        self.setFont(FONT_BOLD, 7.5)
        self.setFillColor(colors.HexColor('#1e293b'))
        self.drawString(38, 26, "Responsável Técnico de Software: Gedeon Kalala Kashomona")

        self.setFont(FONT_REG, 7.5)
        self.setFillColor(colors.HexColor('#64748b'))
        self.drawString(275, 26, "Diretoria LinkMed: Filipe Gerson Farias")

        page_str = f"Página {self._pageNumber} de {total_pages}"
        self.drawRightString(557, 26, page_str)

        self.restoreState()


def build_lgpd_inpi_pdf(output_path: str, logo_path: str, sha512_hash: str):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=32,
        bottomMargin=40,
    )

    styles = getSampleStyleSheet()

    NAVY = colors.HexColor('#0f3460')
    SLATE_MUTED = colors.HexColor('#475569')
    TEXT_COLOR = colors.HexColor('#0f172a')
    BG_LIGHT = colors.HexColor('#f8fafc')
    BORDER_COLOR = colors.HexColor('#cbd5e1')
    BLUE_BG = colors.HexColor('#eff6ff')
    GREEN_BG = colors.HexColor('#f0fdf4')

    doc_title = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName=FONT_BOLD,
        fontSize=14.5,
        leading=18,
        textColor=NAVY,
    )

    doc_subtitle = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName=FONT_REG,
        fontSize=8.8,
        leading=12,
        textColor=SLATE_MUTED,
    )

    part_banner = ParagraphStyle(
        'PartBanner',
        parent=styles['Normal'],
        fontName=FONT_BOLD,
        fontSize=9.8,
        leading=12.5,
        textColor=colors.white,
    )

    sec_title = ParagraphStyle(
        'SecTitle',
        parent=styles['Normal'],
        fontName=FONT_BOLD,
        fontSize=10.5,
        leading=13.5,
        textColor=NAVY,
        spaceBefore=7,
        spaceAfter=3,
        keepWithNext=True,
    )

    body = ParagraphStyle(
        'BodyCustom',
        parent=styles['Normal'],
        fontName=FONT_REG,
        fontSize=8,
        leading=11,
        textColor=TEXT_COLOR,
        alignment=0,
    )

    body_bold = ParagraphStyle(
        'BodyBoldCustom',
        parent=body,
        fontName=FONT_BOLD,
    )

    bullet = ParagraphStyle(
        'BulletCustom',
        parent=body,
        leftIndent=10,
        firstLineIndent=-6,
        spaceAfter=1.5,
    )

    th_style = ParagraphStyle(
        'TH',
        parent=styles['Normal'],
        fontName=FONT_BOLD,
        fontSize=7.8,
        leading=10,
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
        fontSize=7.6,
        leading=10.2,
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

    hash_style = ParagraphStyle(
        'HashMono',
        parent=styles['Normal'],
        fontName='Courier-Bold',
        fontSize=7.2,
        leading=9.8,
        textColor=colors.HexColor('#1e3a8a'),
        alignment=0,
    )

    story = []

    # =========================================================================
    # PÁGINA 1 — PARTE 1: DOSSIÊ DE SEGURANÇA E CONFORMIDADE LGPD (HOSPITAIS)
    # =========================================================================
    header_cells = []
    if os.path.exists(logo_path):
        header_cells.append([
            Image(logo_path, width=135, height=46),
            Paragraph(
                "<font size=8 color='#64748b'><b>DOCUMENTO OFICIAL DE GOVERNANÇA E SEGURANÇA</b><br/>"
                "CONFORMIDADE LGPD · SEGURANÇA HOSPITALAR · REGISTRO INPI<br/>"
                "EMISSÃO: OUTUBRO/2026</font>",
                ParagraphStyle('HeaderRight', parent=body, alignment=2)
            )
        ])
    else:
        header_cells.append([
            Paragraph("<b>LINKMED SOLUÇÕES MÉDICAS</b>", doc_title),
            Paragraph("<font size=8 color='#64748b'>GOVERNANÇA E SEGURANÇA DA INFORMAÇÃO</font>", styles['Normal'])
        ])

    header_table = Table(header_cells, colWidths=[200, 319])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ALIGN', (1,0), (1,0), 'RIGHT'),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width="100%", thickness=1.5, color=NAVY, spaceBefore=2, spaceAfter=8))

    story.append(Paragraph("DOSSIÊ DE SEGURANÇA DA INFORMAÇÃO, CONFORMIDADE LGPD E PROPRIEDADE INTELECTUAL (INPI)", doc_title))
    story.append(Spacer(1, 3))
    story.append(Paragraph(
        "Plataforma <b>Regula-On / LinkMed</b> — Sistema de Gestão da Qualidade Sanitária (RDC 665/2022 ANVISA) e Rastreabilidade de Assistência Técnica Hospitalar",
        doc_subtitle
    ))
    story.append(Spacer(1, 8))

    # Banner Parte 1
    banner_p1 = Table(
        [[Paragraph("PARTE 1 — MEMORIAL DE SEGURANÇA E CONFORMIDADE LGPD (PARA HOSPITAIS E AUDITORIAS)", part_banner)]],
        colWidths=[519]
    )
    banner_p1.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), NAVY),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(banner_p1)
    story.append(Spacer(1, 6))

    story.append(Paragraph("1. ENQUADRAMENTO NA LEI GERAL DE PROTEÇÃO DE DADOS (LGPD — LEI Nº 13.709/2018)", sec_title))
    story.append(Paragraph(
        "A plataforma <b>Regula-On / LinkMed</b> foi projetada sob o princípio de <i>Privacy by Design</i> e <i>Security by Design</i>, "
        "atendendo integralmente aos requisitos exigidos por instituições hospitalares, operadoras de saúde e órgãos reguladores:",
        body
    ))
    story.append(Spacer(1, 4))

    lgpd_rows = [
        [
            Paragraph("DIRETRIZ LGPD", th_style),
            Paragraph("APLICAÇÃO PRÁTICA NO SISTEMA REGULA-ON / LINKMED", th_style),
            Paragraph("BASE LEGAL", th_center),
        ],
        [
            Paragraph("<b>Ausência de Dados Sensíveis de Pacientes</b><br/>(Minimização)", td_style),
            Paragraph("O sistema <b>não coleta, não processa e não armazena prontuários médicos, nomes de pacientes ou diagnósticos clínicos</b>. Todos os registros referem-se estritamente a ativos patrimoniais (equipamentos médicos, números de série, calibrações e laudos metrológicos).", td_style),
            Paragraph("Art. 6º, III<br/>(Princípio da Necessidade)", td_center),
        ],
        [
            Paragraph("<b>Dados Corporativos e Técnicos (B2B)</b>", td_style),
            Paragraph("Os dados cadastrais limitam-se à identificação da instituição hospitalar contratante (Razão Social, CNPJ e Ordem de Serviço) e à identificação funcional dos técnicos e engenheiros responsáveis pelos laudos.", td_style),
            Paragraph("Art. 7º, V<br/>(Execução de Contrato)", td_center),
        ],
        [
            Paragraph("<b>Rastreabilidade Sanitária Obrigatória</b>", td_style),
            Paragraph("A identificação nominal de quem elaborou, revisou, aprovou ou executou a manutenção técnica decorre de obrigação sanitária estrita para garantia da segurança de dispositivos médicos.", td_style),
            Paragraph("Art. 7º, II<br/>(Obrigação Regulatória RDC 665/22)", td_center),
        ],
        [
            Paragraph("<b>Divisão de Papéis (Agentes de Tratamento)</b>", td_style),
            Paragraph("<b>Controladora:</b> LinkMed Soluções Médicas.<br/><b>Operador Tecnológico:</b> Gestão da Plataforma Regula-On e infraestrutura de nuvem certificada.", td_style),
            Paragraph("Art. 5º, VI e VII<br/>da LGPD", td_center),
        ],
    ]

    t_lgpd = Table(lgpd_rows, colWidths=[125, 294, 100])
    t_lgpd.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), NAVY),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
    ]))
    story.append(t_lgpd)
    story.append(Spacer(1, 5))

    story.append(Paragraph("2. ARQUITETURA DE SEGURANÇA DOS ARQUIVOS E PROCESSOS HOSPITALARES (5 CAMADAS)", sec_title))
    story.append(Paragraph(
        "Para assegurar aos hospitais clientes a inviolabilidade dos laudos técnicos, certificados de calibração RBC, POPs e registros de manutenção, "
        "o sistema implementa cinco camadas independentes de proteção cibernética:",
        body
    ))
    story.append(Spacer(1, 3))

    sec_layers = [
        [
            Paragraph("CAMADA DE PROTEÇÃO", th_style),
            Paragraph("MECANISMO TÉCNICO IMPLEMENTADO NO CÓDIGO", th_style),
            Paragraph("GARANTIA PARA O HOSPITAL", th_style),
        ],
        [
            Paragraph("<b>1. Assinatura Criptográfica de Arquivos (SHA-256)</b>", td_style),
            Paragraph("Todo documento PDF e versão de POP recebe um resumo criptográfico <b>SHA-256</b> único no momento da publicação e aprovação eletrônica.", td_style),
            Paragraph("Garante autenticidade e impede qualquer adulteração pós-aprovação no documento.", td_style),
        ],
        [
            Paragraph("<b>2. Criptografia em Trânsito e em Repouso</b>", td_style),
            Paragraph("Tráfego 100% criptografado via <b>TLS 1.3 (HTTPS 256-bits)</b>. Banco de dados e arquivos em repouso criptografados em padrão <b>AES-256</b> (infraestrutura AWS com certificações <b>ISO 27001 e SOC 2 Tipo II</b>).", td_style),
            Paragraph("Impede interceptação de dados na rede e protege os arquivos armazenados na nuvem.", td_style),
        ],
        [
            Paragraph("<b>3. Controle de Acesso Estrito (RBAC) e Governança</b>", td_style),
            Paragraph("Segregação rigorosa entre perfis (<i>Diretor, Qualidade, Técnico e Estoquista</i>). Bloqueio em nível de API que impede operadores de alterarem responsáveis por elaboração, revisão e aprovação.", td_style),
            Paragraph("Elimina risco de fraude interna ou preenchimento por profissional não habilitado.", td_style),
        ],
        [
            Paragraph("<b>4. Autenticação Blindada e Timeout de Sessão</b>", td_style),
            Paragraph("Senhas protegidas com hash <b>Bcrypt (custo 12)</b>. Sessões em cookies <i>HttpOnly, Secure e SameSite</i> (anti-XSS/CSRF) com encerramento automático por inatividade na bancada.", td_style),
            Paragraph("Impede acesso indevido caso um terminal técnico seja deixado aberto na oficina.", td_style),
        ],
        [
            Paragraph("<b>5. Trilha de Auditoria Imutável & Backups Diários</b>", td_style),
            Paragraph("Tabela <i>audit_logs</i> imutável (grava usuário, data/hora, IP e estado anterior/posterior) aliada a <b>Row Level Security (RLS)</b> no PostgreSQL e backups diários automatizados.", td_style),
            Paragraph("Rastreabilidade total para auditorias da ANVISA, ONA e acreditação hospitalar.", td_style),
        ],
    ]

    t_sec = Table(sec_layers, colWidths=[125, 224, 170])
    t_sec.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), NAVY),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
    ]))
    story.append(t_sec)

    # =========================================================================
    # PÁGINA 2 — PARTE 2: REGISTRO DE PROPRIEDADE INTELECTUAL NO INPI
    # =========================================================================
    story.append(PageBreak())

    banner_p2 = Table(
        [[Paragraph("PARTE 2 — GUIA OFICIAL E FICHA TÉCNICA PARA REGISTRO DO SOFTWARE NO INPI", part_banner)]],
        colWidths=[519]
    )
    banner_p2.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), NAVY),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(banner_p2)
    story.append(Spacer(1, 4))

    story.append(Paragraph("3. PROTEÇÃO LEGAL DO SOFTWARE NO BRASIL (LEI Nº 9.609/1998 — INPI)", sec_title))
    story.append(Paragraph(
        "No ordenamento jurídico brasileiro (Lei nº 9.609/98 e Lei nº 9.610/98), a proteção de propriedade intelectual de um sistema "
        "é realizada por meio do <b>Certificado de Registro de Programa de Computador</b> emitido pelo <b>INPI (Instituto Nacional da Propriedade Industrial)</b>. "
        "Diferente de uma patente industrial (que leva anos), o registro de software no INPI:",
        body
    ))
    story.append(Spacer(1, 2))
    story.append(Paragraph("• <b>Expedição Rápida:</b> Certificado oficial emitido em média entre <b>7 e 10 dias úteis</b> após o protocolo.", bullet))
    story.append(Paragraph("• <b>Validade de 50 Anos:</b> Proteção legal garantida por 50 anos a partir de 1º de janeiro do ano subsequente à criação.", bullet))
    story.append(Paragraph("• <b>Abrangência Internacional:</b> Válido automaticamente nos <b>181 países</b> signatários da Convenção de Berna.", bullet))
    story.append(Paragraph("• <b>Sigilo Absoluto do Código-Fonte:</b> O código-fonte não fica público; envia-se apenas o resumo criptográfico (Hash SHA-512) gerado a partir do pacote lacrado do código.", bullet))
    story.append(Spacer(1, 4))

    story.append(Paragraph("4. FICHA TÉCNICA PRONTA PARA PREENCHIMENTO NO PORTAL E-SOFTWARE (INPI)", sec_title))
    story.append(Paragraph(
        "O pacote oficial do código-fonte (<b>REGULA_ON_CODIGO_FONTE_INPI.zip</b>, contendo toda a arquitetura em <i>src/, supabase/, scripts/ e configurações</i>) "
        "já foi gerado e lacrado. Utilize exatamente os dados abaixo ao preencher o formulário eletrônico no portal do INPI:",
        body
    ))
    story.append(Spacer(1, 3))

    inpi_rows = [
        [
            Paragraph("CAMPO DO FORMULÁRIO E-SOFTWARE (INPI)", th_style),
            Paragraph("DADO OFICIAL PARA PREENCHIMENTO (COPIAR E COLAR)", th_style),
        ],
        [
            Paragraph("<b>Título do Programa</b>", td_style),
            Paragraph("<b>REGULA-ON — SISTEMA DE GESTÃO DA QUALIDADE REGULATÓRIA E ASSISTÊNCIA TÉCNICA HOSPITALAR</b>", td_style),
        ],
        [
            Paragraph("<b>Data de Criação / Publicação</b>", td_style),
            Paragraph("Outubro de 2026 (ex: 23/10/2026)", td_style),
        ],
        [
            Paragraph("<b>Autor / Criador Intelectual</b>", td_style),
            Paragraph("<b>Gedeon Kalala Kashomona</b> (Engenheiro de Software Full Stack)", td_style),
        ],
        [
            Paragraph("<b>Titularidade dos Direitos Patrimoniais</b>", td_style),
            Paragraph(
                "• <b>Opção A (Individual):</b> 100% Gedeon Kalala Kashomona (licenciando o uso para a LinkMed).<br/>"
                "• <b>Opção B (Cotitularidade / Parceria):</b> Gedeon Kalala Kashomona + Filipe Gerson Farias (LinkMed Soluções Médicas) conforme percentual societário acordado em contrato.",
                td_style
            ),
        ],
        [
            Paragraph("<b>Linguagens de Programação</b>", td_style),
            Paragraph("<b>TypeScript, JavaScript, SQL, HTML, CSS</b>", td_style),
        ],
        [
            Paragraph("<b>Campo de Aplicação (Tabela INPI)</b>", td_style),
            Paragraph("<b>SD-01</b> (Saúde) / <b>AD-01</b> (Administração e Gestão da Qualidade) / <b>MT-04</b> (Manutenção)", td_style),
        ],
        [
            Paragraph("<b>Tipo de Programa (Tabela INPI)</b>", td_style),
            Paragraph("<b>AP-01</b> (Aplicativo) / <b>GI-01</b> (Gerência de Informações — Banco de Dados)", td_style),
        ],
        [
            Paragraph("<b>Algoritmo de Hash Selecionado</b>", td_style),
            Paragraph("<b>SHA-512</b> (128 caracteres hexadecimais)", td_bold),
        ],
        [
            Paragraph("<b>Resumo Digital Hash (SHA-512)<br/>do Arquivo REGULA_ON_CODIGO_FONTE_INPI.zip</b>", td_bold),
            Paragraph(f"{sha512_hash[:64]}<br/>{sha512_hash[64:]}", hash_style),
        ],
    ]

    t_inpi = Table(inpi_rows, colWidths=[165, 354])
    t_inpi.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), NAVY),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('ROWBACKGROUNDS', (0,1), (-1,-2), [colors.white, BG_LIGHT]),
        ('BACKGROUND', (0,-1), (-1,-1), BLUE_BG),
    ]))
    story.append(t_inpi)
    story.append(Spacer(1, 5))

    story.append(Paragraph("5. PASSO A PASSO PARA PROTOCOLAR E EMITIR O CERTIFICADO NO INPI", sec_title))

    steps_rows = [
        [
            Paragraph("ETAPA", th_center),
            Paragraph("PROCEDIMENTO NO PORTAL GOV.BR / INPI", th_style),
            Paragraph("CUSTO / PRAZO", th_center),
        ],
        [
            Paragraph("<b>Passo 1</b>", td_center),
            Paragraph("Acessar <b>gov.br/inpi</b>, criar/acessar seu login no sistema <b>e-INPI</b> e emitir a <b>GRU (Guia de Recolhimento da União) — Código 730</b> (Pedido de Registro de Programa de Computador).", td_style),
            Paragraph("<b>R$ 185,00</b><br/>(Taxa única federal)", td_center),
        ],
        [
            Paragraph("<b>Passo 2</b>", td_center),
            Paragraph("Baixar a <b>Declaração de Veracidade (DV)</b> gerada pelo sistema e assiná-la digitalmente (gratuitamente pelo portal de Assinatura Eletrônica do <b>Gov.br</b> nível Prata ou Ouro).", td_style),
            Paragraph("Gratuito<br/>(Assinatura Gov.br)", td_center),
        ],
        [
            Paragraph("<b>Passo 3</b>", td_center),
            Paragraph("Acessar o formulário <b>e-Software</b> com o número da GRU paga, colar os dados da Ficha Técnica acima (incluindo o Hash SHA-512 de 128 caracteres) e anexar a Declaração de Veracidade assinada.", td_style),
            Paragraph("Preenchimento em<br/>~10 minutos", td_center),
        ],
        [
            Paragraph("<b>Passo 4</b>", td_center),
            Paragraph("Guardar uma cópia intacta do arquivo <b>REGULA_ON_CODIGO_FONTE_INPI.zip</b> em nuvem pessoal segura e baixar o <b>Certificado Oficial de Registro</b> publicado na Revista da Propriedade Industrial (RPI).", td_style),
            Paragraph("Certificado sai em<br/><b>7 a 10 dias úteis</b>", td_center),
        ],
    ]

    t_steps = Table(steps_rows, colWidths=[55, 364, 100])
    t_steps.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), NAVY),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, GREEN_BG]),
    ]))
    story.append(t_steps)
    story.append(Spacer(1, 10))

    # Assinaturas
    sig_data = [
        [
            Paragraph("____________________________________________<br/><b>GEDEON KALALA KASHOMONA</b><br/>Autor & Responsável Técnico de Software<br/><i>Arquitetura, Segurança & Propriedade Intelectual</i>", ParagraphStyle('Sig1', parent=body, alignment=1)),
            Paragraph("____________________________________________<br/><b>FILIPE GERSON FARIAS</b><br/>LinkMed Soluções Médicas<br/><i>Diretoria & Controladora de Dados (LGPD)</i>", ParagraphStyle('Sig2', parent=body, alignment=1)),
        ]
    ]
    sig_table = Table(sig_data, colWidths=[259, 260])
    sig_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(sig_table)

    doc.build(story, canvasmaker=SecurityNumberedCanvas)
    print(f"[OK] PDF de Segurança, LGPD e INPI gerado com sucesso em: {output_path}")


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "SEGURANCA_LGPD_E_REGISTRO_INPI_LINKMED.pdf"
    logo = sys.argv[2] if len(sys.argv) > 2 else "public/logo-linkmed.jpg"
    sha = "a8cbe761a1dd11b8e47adff28cc59b4ec08dbb627cb033731804ea7776a44e0851460d003cc2eb780b6cce66f82863254ad466e8bd4e34073eb53f09040ccc7e"
    build_lgpd_inpi_pdf(out, logo, sha)

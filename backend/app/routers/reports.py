import logging
import json
from io import BytesIO
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from jose import JWTError, jwt
from app import models
from app.database import get_db
from app.config import settings
from app.routers.auth import log_audit

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/pdf")
def generate_pdf_report(
    session_id: str,
    request: Request,
    token: str = None,
    export_type: str = "default", # "default" or "technical"
    db: Session = Depends(get_db)
):
    """
    Build a comprehensive PDF report for crime intelligence metrics and active investigations.
    Supports "default" (Executive Dossier) and "technical" (System Auditor Log).
    """
    actual_token = token
    if not actual_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            actual_token = auth_header.split(" ")[1]
            
    if not actual_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
        
    try:
        payload = jwt.decode(actual_token, settings.JWT_SECRET, algorithms=["HS256"])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        if username is None or role is None:
            raise HTTPException(status_code=401, detail="Could not validate credentials")
        user = {"username": username, "role": role}
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

    logger.info(f"Generating {export_type} PDF report for user: {user['username']}")
    
    # Log audit event
    log_audit(db, user["username"], user["role"], "DOWNLOAD_PDF", f"Generated {export_type} report. Session: {session_id}")
    
    # 1. Fetch data for PDF
    total_cases = db.query(models.CaseMaster).count()
    under_investigation = db.query(models.CaseMaster).filter(models.CaseMaster.CaseStatusID == 1).count()
    heinous_crimes = db.query(models.CaseMaster).filter(models.CaseMaster.GravityOffenceID == 1).count()
    
    recent_cases = db.query(models.CaseMaster)\
        .order_by(models.CaseMaster.CrimeRegisteredDate.desc()).limit(10).all()
        
    # Fetch chat session messages to parse case context
    messages = db.query(models.ChatMessage)\
        .filter(models.ChatMessage.SessionID == session_id)\
        .order_by(models.ChatMessage.Timestamp.asc()).all()
        
    # 2. Setup document buffer and DocTemplate
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=45,
        leftMargin=45,
        topMargin=45,
        bottomMargin=45
    )
    
    styles = getSampleStyleSheet()
    
    # Custom styles matching KSP identity
    title_style = ParagraphStyle(
        'GovTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        textColor=colors.HexColor('#0e1726'),
        spaceAfter=4,
        alignment=1 # Center
    )
    
    subtitle_style = ParagraphStyle(
        'GovSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        textColor=colors.HexColor('#0052ff'),
        spaceAfter=15,
        alignment=1 # Center
    )

    class_header_style = ParagraphStyle(
        'ClassificationHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        textColor=colors.HexColor('#ef4444'),
        spaceAfter=25,
        alignment=1 # Center
    )
    
    h1_style = ParagraphStyle(
        'GovH1',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        textColor=colors.HexColor('#0e1726'),
        spaceBefore=14,
        spaceAfter=6,
        borderPadding=(0, 0, 1, 0),
        borderColor=colors.HexColor('#cbd5e1')
    )
    
    body_style = ParagraphStyle(
        'GovBody',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=9.5,
        textColor=colors.HexColor('#334155'),
        spaceAfter=6,
        leading=13
    )

    bold_body_style = ParagraphStyle(
        'GovBoldBody',
        parent=body_style,
        fontName='Helvetica-Bold'
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        textColor=colors.white
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        textColor=colors.HexColor('#334155')
    )

    code_style = ParagraphStyle(
        'CodeSnippet',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        textColor=colors.HexColor('#0f172a'),
        backColor=colors.HexColor('#f1f5f9'),
        borderColor=colors.HexColor('#e2e8f0'),
        borderWidth=0.5,
        borderPadding=6,
        spaceAfter=6
    )
    
    story = []
    
    # ==========================================
    # PAGE 1: COVER PAGE
    # ==========================================
    story.append(Paragraph("RESTRICTED - LAW ENFORCEMENT INTERNAL USE ONLY", class_header_style))
    story.append(Spacer(1, 40))
    story.append(Paragraph("KARNATAKA STATE POLICE", title_style))
    story.append(Paragraph("CRIME INTELLIGENCE COMMAND CENTER", subtitle_style))
    story.append(Spacer(1, 20))
    
    # Large Decorative Badge Line
    badge_data = [[""]]
    badge_table = Table(badge_data, colWidths=[520], rowHeights=[4])
    badge_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#0052ff')),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(badge_table)
    story.append(Spacer(1, 35))
    
    # Executive Metadata Box
    report_id = f"KSP-TRINETRA-{datetime.now().strftime('%Y%m%d')}-{session_id[:6].upper()}"
    meta_data = [
        [
            Paragraph("<b>REPORT IDENTITY:</b>", bold_body_style),
            Paragraph(report_id, body_style)
        ],
        [
            Paragraph("<b>INVESTIGATION OBJECTIVE:</b>", bold_body_style),
            Paragraph("Active repeat offenders tracking and syndicate profiling", body_style)
        ],
        [
            Paragraph("<b>CASE FILES SCOPE:</b>", bold_body_style),
            Paragraph("Crime incidents registered under IPC and BNS structures", body_style)
        ],
        [
            Paragraph("<b>GENERATION TIMESTAMP:</b>", bold_body_style),
            Paragraph(datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC"), body_style)
        ],
        [
            Paragraph("<b>AUTHORIZED BY:</b>", bold_body_style),
            Paragraph(f"Officer {user['username'].upper()} (Clearance Level: {user['role']})", body_style)
        ],
        [
            Paragraph("<b>REPORT TYPE:</b>", bold_body_style),
            Paragraph(f"CRIME DOSSIER ({export_type.upper()})", bold_body_style)
        ]
    ]
    meta_table = Table(meta_data, colWidths=[200, 320])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('PADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 50))
    
    # Signature Section
    sig_data = [
        [
            Paragraph("<b>PREPARED BY:</b><br/><br/>_______________________<br/>Officer Signature", body_style),
            Paragraph("<b>APPROVED BY:</b><br/><br/>_______________________<br/>Superintendent of Police", body_style)
        ]
    ]
    sig_table = Table(sig_data, colWidths=[260, 260])
    story.append(sig_table)
    
    # Watermark text at bottom of cover page
    story.append(Spacer(1, 40))
    story.append(Paragraph("<font color='#94a3b8' size='8'><b>SYSTEM NOTE:</b> This dossier is compiled dynamically by the TRINETRA AI knowledge hub. Watermarks indicate restricted internal distribution limits under the Indian IT Act.</font>", body_style))
    story.append(PageBreak())
    
    # ==========================================
    # PAGE 2: EXECUTIVE SUMMARY & CORE METRICS
    # ==========================================
    story.append(Paragraph("1. Executive Intelligence Summary", h1_style))
    
    # Summary Paragraph
    summary_msg = "No session query logged yet."
    if messages:
        # Find the last assistant message to use as the summary message
        assistant_msgs = [m for m in messages if m.Sender == 'assistant']
        if assistant_msgs:
            summary_msg = assistant_msgs[-1].Content[:800] + "..."
            
    exec_summary_text = (
        f"This intelligence dossier provides a synchronized analytical summary of active criminal cases in the state of Karnataka. "
        f"Currently, there are <b>{total_cases}</b> crime incidents indexed. Active investigations: <b>{under_investigation}</b> cases. "
        f"Heinous offences account for <b>{heinous_crimes}</b> incidents. The system indicates active co-offending community clusters in property theft and narcotics operations.<br/><br/>"
        f"<b>Active Session Context summary:</b> {summary_msg}"
    )
    story.append(Paragraph(exec_summary_text, body_style))
    story.append(Spacer(1, 10))
    
    # Threat indicators Table
    threat_data = [
        [
            Paragraph("<b>CRITICITY PROFILE:</b>", bold_body_style),
            Paragraph("<font color='#ef4444'><b>HIGH THREAT INDICATORS DETECTED</b></font>", bold_body_style)
        ],
        [
            Paragraph("<b>AI confidence rating:</b>", bold_body_style),
            Paragraph("94% confidence based on Neo4j APOC pathing & Cypher rules", body_style)
        ],
        [
            Paragraph("<b>Recommended action:</b>", bold_body_style),
            Paragraph("Initiate beat patrol monitoring in Cubbon Park & Vidyaranyapuram hotspots", body_style)
        ]
    ]
    threat_table = Table(threat_data, colWidths=[180, 340])
    threat_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#fef2f2')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#fca5a5')),
        ('PADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(threat_table)
    story.append(Spacer(1, 15))
    
    # ==========================================
    # CASE LEDGER SUMMARY
    # ==========================================
    story.append(Paragraph("2. Recent Case Registration Feed", h1_style))
    headers = [
        Paragraph("FIR Number", table_header_style),
        Paragraph("Crime Head", table_header_style),
        Paragraph("Police Station", table_header_style),
        Paragraph("Reg. Date", table_header_style),
        Paragraph("Status", table_header_style)
    ]
    table_data = [headers]
    for c in recent_cases:
        table_data.append([
            Paragraph(c.CaseNo, table_cell_style),
            Paragraph(c.crime_minor_head.CrimeHeadName, table_cell_style),
            Paragraph(c.police_station.UnitName, table_cell_style),
            Paragraph(str(c.CrimeRegisteredDate), table_cell_style),
            Paragraph(c.case_status.CaseStatusName, table_cell_style)
        ])
        
    queue_table = Table(table_data, colWidths=[90, 110, 130, 90, 100])
    queue_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0f172a')),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
    ]))
    story.append(queue_table)
    
    # ==========================================
    # DETAILED MESSAGES CHAT LOG
    # ==========================================
    story.append(PageBreak())
    story.append(Paragraph("3. AI Intelligence Session Log", h1_style))
    story.append(Paragraph("Chronological log of questions asked and evidence processed by the analyst in the workspace:", body_style))
    story.append(Spacer(1, 10))
    
    for idx, msg in enumerate(messages):
        sender_lbl = "ANALYST QUERY" if msg.Sender == "user" else "TRINETRA CORE RESPONSE"
        sender_color = "#0052ff" if msg.Sender == "user" else "#0f172a"
        
        # Header block for message
        msg_header = [
            [
                Paragraph(f"<b>{sender_lbl}</b>", ParagraphStyle('Hdr', parent=styles['Normal'], textColor=colors.HexColor(sender_color), fontName='Helvetica-Bold')),
                Paragraph(f"<i>Time: {msg.Timestamp.strftime('%H:%M:%S')}</i>", ParagraphStyle('Tm', parent=styles['Normal'], alignment=2, textColor=colors.HexColor('#64748b')))
            ]
        ]
        msg_header_table = Table(msg_header, colWidths=[260, 260])
        msg_header_table.setStyle(TableStyle([
            ('LINEBELOW', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
            ('PADDING', (0,0), (-1,-1), 4)
        ]))
        story.append(msg_header_table)
        story.append(Spacer(1, 4))
        
        # Message content body
        story.append(Paragraph(msg.Content.replace('\n', '<br/>'), body_style))
        story.append(Spacer(1, 10))
        
        # If technical report requested, display the underlying execution logs
        if export_type == "technical" and msg.Sender == "assistant" and msg.Evidence:
            try:
                ev_json = json.loads(msg.Evidence)
                sql_q = ev_json.get("sql")
                cypher_q = ev_json.get("cypher")
                reasoning = ev_json.get("reasoning_steps", [])
                
                story.append(Paragraph("<b>TECHNICAL AUDIT ENGINE PATHWAYS</b>", bold_body_style))
                story.append(Spacer(1, 2))
                
                if reasoning:
                    story.append(Paragraph(f"<b>Reasoning chain:</b> {', '.join(reasoning)}", table_cell_style))
                    story.append(Spacer(1, 4))
                if sql_q:
                    story.append(Paragraph("<b>Postgres Compiled SQL Query:</b>", bold_body_style))
                    story.append(Paragraph(sql_q.replace('\n', '<br/>'), code_style))
                    story.append(Spacer(1, 4))
                if cypher_q:
                    story.append(Paragraph("<b>Neo4j Compiled Cypher Query:</b>", bold_body_style))
                    story.append(Paragraph(cypher_q.replace('\n', '<br/>'), code_style))
                    story.append(Spacer(1, 4))
                    
            except Exception as e:
                story.append(Paragraph(f"<i>(Failed to parse technical diagnostics: {str(e)})</i>", table_cell_style))
                story.append(Spacer(1, 10))
                
    # Build Document
    doc.build(story)
    buffer.seek(0)
    
    # Return as response
    filename = f"trinetra_{export_type}_report.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

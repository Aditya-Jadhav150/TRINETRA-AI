import logging
from datetime import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from app import models
from app.database import get_db
from app.services.graph_service import GraphService
from app.services.vector_service import VectorService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/overview")
def get_overview_metrics(db: Session = Depends(get_db)):
    """
    Get the top level stats for the main dashboard
    """
    total_cases = db.query(models.CaseMaster).count()
    under_investigation = db.query(models.CaseMaster).filter(models.CaseMaster.CaseStatusID == 1).count()
    chargesheeted = db.query(models.CaseMaster).filter(models.CaseMaster.CaseStatusID == 2).count()
    heinous_crimes = db.query(models.CaseMaster).filter(models.CaseMaster.GravityOffenceID == 1).count()
    
    # Calculate repeat offender count (accused appearing in > 1 case)
    subquery = db.query(
        models.Accused.AccusedName,
        func.count(models.Accused.CaseMasterID).label("case_count")
    ).group_by(models.Accused.AccusedName).subquery()
    
    repeat_offenders_count = db.query(subquery).filter(subquery.c.case_count > 1).count()
    
    # Recent cases feed (last 5)
    recent_cases = db.query(models.CaseMaster).order_by(models.CaseMaster.CrimeRegisteredDate.desc()).limit(5).all()
    recent_feed = []
    for c in recent_cases:
        recent_feed.append({
            "case_id": c.CaseMasterID,
            "crime_no": c.CrimeNo,
            "category": c.crime_minor_head.CrimeHeadName,
            "station": c.police_station.UnitName,
            "date": str(c.CrimeRegisteredDate),
            "status": c.case_status.CaseStatusName,
            "gravity": c.gravity_offence.LookupValue
        })
        
    return {
        "total_cases": total_cases,
        "under_investigation": under_investigation,
        "chargesheeted": chargesheeted,
        "heinous_crimes": heinous_crimes,
        "repeat_offenders_count": repeat_offenders_count,
        "recent_cases": recent_feed
    }

@router.get("/trends/monthly")
def get_monthly_trends(db: Session = Depends(get_db)):
    """
    Extract crime occurrences grouped by month
    """
    cases = db.query(models.CaseMaster).all()
    # Group in Python for standard SQL compatibility (sqlite/postgres)
    monthly_data = {}
    for c in cases:
        # Format month as 'YYYY-MM'
        m = c.CrimeRegisteredDate.strftime('%Y-%b')
        monthly_data[m] = monthly_data.get(m, 0) + 1
        
    # Sort chronologically
    sorted_months = sorted(monthly_data.items(), key=lambda x: datetime_from_month_str(x[0]))
    return [{"month": m, "crimes": count} for m, count in sorted_months]

@router.get("/categories")
def get_categories_breakdown(db: Session = Depends(get_db)):
    """
    Crimes count grouped by crime head
    """
    results = db.query(
        models.CrimeHead.CrimeGroupName,
        func.count(models.CaseMaster.CaseMasterID).label("count")
    ).join(models.CaseMaster, models.CaseMaster.CrimeMajorHeadID == models.CrimeHead.CrimeHeadID)\
     .group_by(models.CrimeHead.CrimeGroupName).all()
     
    return [{"category": r[0], "count": r[1]} for r in results]

@router.get("/districts")
def get_district_rankings(db: Session = Depends(get_db)):
    """
    District rankings by crime count
    """
    results = db.query(
        models.District.DistrictName,
        func.count(models.CaseMaster.CaseMasterID).label("count")
    ).join(models.Unit, models.Unit.DistrictID == models.District.DistrictID)\
     .join(models.CaseMaster, models.CaseMaster.PoliceStationID == models.Unit.UnitID)\
     .group_by(models.District.DistrictName)\
     .order_by(func.count(models.CaseMaster.CaseMasterID).desc()).all()
     
    return [{"district": r[0], "count": r[1]} for r in results]

@router.get("/heatmap")
def get_heatmap_coordinates(db: Session = Depends(get_db)):
    """
    Return all cases coordinates, category and severity for mapping
    """
    cases = db.query(models.CaseMaster).all()
    points = []
    for c in cases:
        if c.latitude and c.longitude:
            points.append({
                "id": c.CaseMasterID,
                "crime_no": c.CrimeNo,
                "lat": float(c.latitude),
                "lng": float(c.longitude),
                "category": c.crime_minor_head.CrimeHeadName,
                "severity": c.gravity_offence.LookupValue,
                "date": str(c.CrimeRegisteredDate),
                "station": c.police_station.UnitName
            })
    return points

@router.get("/repeat-offenders")
def get_repeat_offenders(db: Session = Depends(get_db)):
    """
    Lists repeat offenders and count of cases
    """
    results = db.query(
        models.Accused.AccusedName,
        func.count(models.Accused.CaseMasterID).label("cases_count"),
        func.avg(models.Accused.AgeYear).label("avg_age")
    ).filter(models.Accused.AccusedName != "Unknown")\
     .group_by(models.Accused.AccusedName)\
     .having(func.count(models.Accused.CaseMasterID) > 1)\
     .order_by(func.count(models.Accused.CaseMasterID).desc()).all()
     
    offenders = []
    for r in results:
        # Find crime history categories
        history = db.query(models.CrimeSubHead.CrimeHeadName)\
            .join(models.CaseMaster, models.CaseMaster.CrimeMinorHeadID == models.CrimeSubHead.CrimeSubHeadID)\
            .join(models.Accused, models.Accused.CaseMasterID == models.CaseMaster.CaseMasterID)\
            .filter(models.Accused.AccusedName == r[0]).distinct().all()
        categories = [h[0] for h in history]
        
        # Calculate risk score (cases * 2.5, max 10)
        risk_score = min(r[1] * 2.5, 10.0)
        risk_level = "CRITICAL" if risk_score >= 7.5 else "HIGH" if risk_score >= 5.0 else "MEDIUM"
        
        offenders.append({
            "name": r[0],
            "cases_count": r[1],
            "age": int(r[2]) if r[2] else 32,
            "categories": categories,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "gender": "Male" # seeded lookup demo
        })
    return offenders

@router.get("/officer-performance")
def get_officer_performance(db: Session = Depends(get_db)):
    """
    Return statistics on officers: cases handled, chargesheets filed, resolution rate
    """
    employees = db.query(models.Employee).all()
    perf = []
    for e in employees:
        cases_count = db.query(models.CaseMaster).filter(models.CaseMaster.PolicePersonID == e.EmployeeID).count()
        chargesheets_count = db.query(models.ChargesheetDetails).filter(models.ChargesheetDetails.PolicePersonID == e.EmployeeID).count()
        
        if cases_count == 0:
            continue
            
        rate = round((chargesheets_count / cases_count) * 100, 1)
        perf.append({
            "name": e.FirstName,
            "rank": e.rank.RankName,
            "station": e.unit.UnitName,
            "cases_handled": cases_count,
            "resolved": chargesheets_count,
            "resolution_rate": rate
        })
        
    perf.sort(key=lambda x: x["cases_handled"], reverse=True)
    return perf

# ==========================================
# Graph endpoints for Knowledge Graph Panel
# ==========================================

@router.get("/graph")
def get_graph_data(limit: int = Query(100, ge=10, le=300)):
    return GraphService.get_graph_data(limit)

@router.get("/graph/shortest-path")
def find_shortest_path(start: str, end: str):
    return GraphService.find_shortest_path(start, end)

@router.get("/graph/centrality")
def get_graph_centrality():
    return GraphService.get_centrality_metrics()

@router.get("/graph/communities")
def get_graph_communities():
    return GraphService.detect_communities()

# ==========================================
# Vector Search similarity endpoints
# ==========================================

@router.get("/similarity")
def get_similar_cases(query_text: str, db: Session = Depends(get_db)):
    return VectorService.search_similar_cases(db, query_text, limit=5)

# Helper to sort months
def datetime_from_month_str(m_str: str) -> datetime:
    try:
        return datetime.strptime(m_str, '%Y-%b')
    except Exception:
        return datetime.min

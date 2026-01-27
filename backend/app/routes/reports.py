from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional

from app.db import get_db
from app.schemas.reports import ComprehensiveReport, ReportFilters
from app.crud.reports import generate_comprehensive_report
from app.routes.auth import get_current_user, require_role
from app.schemas.user import UserOut

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/comprehensive", response_model=ComprehensiveReport)
async def get_comprehensive_report(
    start_date: Optional[datetime] = Query(None, description="Start date for report"),
    end_date: Optional[datetime] = Query(None, description="End date for report"),
    country: Optional[str] = Query(None, description="Filter by country"),
    current_user: UserOut = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate comprehensive fraud detection report
    
    Includes:
    - Transaction metrics (count, amounts, averages)
    - Risk analysis (distribution, averages)
    - Case metrics (status breakdown, resolution times)
    - Model performance (accuracy, precision, recall)
    - Time series analysis
    - Geographic analysis
    - Merchant analysis
    - Channel analysis
    - Top transactions by risk and amount
    """
    return generate_comprehensive_report(db, start_date, end_date, country)


@router.get("/quick-stats")
async def get_quick_stats(
    current_user: UserOut = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get quick stats for dashboard"""
    from app.crud.reports import (
        get_transaction_metrics,
        get_risk_metrics,
        get_case_metrics
    )
    
    # Get stats for different periods
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = now - timedelta(days=7)
    month_start = now - timedelta(days=30)
    
    return {
        "today": {
            "transactions": get_transaction_metrics(db, today_start, now),
            "risk": get_risk_metrics(db, today_start, now),
            "cases": get_case_metrics(db, today_start, now)
        },
        "last_7_days": {
            "transactions": get_transaction_metrics(db, week_start, now),
            "risk": get_risk_metrics(db, week_start, now),
            "cases": get_case_metrics(db, week_start, now)
        },
        "last_30_days": {
            "transactions": get_transaction_metrics(db, month_start, now),
            "risk": get_risk_metrics(db, month_start, now),
            "cases": get_case_metrics(db, month_start, now)
        },
        "all_time": {
            "transactions": get_transaction_metrics(db),
            "risk": get_risk_metrics(db),
            "cases": get_case_metrics(db)
        }
    }


@router.get("/export/csv")
async def export_report_csv(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user: UserOut = Depends(require_role(["admin", "superadmin"])),
    db: Session = Depends(get_db)
):
    """Export report data as CSV (admin only)"""
    from fastapi.responses import StreamingResponse
    import io
    import csv
    
    report = generate_comprehensive_report(db, start_date, end_date)
    
    # Create CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write headers and data
    writer.writerow(['Report Generated', report.report_generated_at])
    writer.writerow(['Period', report.report_period])
    writer.writerow([])
    
    writer.writerow(['TRANSACTION METRICS'])
    writer.writerow(['Total Transactions', report.transaction_metrics.total_transactions])
    writer.writerow(['Total Amount', report.transaction_metrics.total_amount])
    writer.writerow(['Average Amount', report.transaction_metrics.average_amount])
    writer.writerow([])
    
    writer.writerow(['RISK METRICS'])
    writer.writerow(['High Risk', report.risk_metrics.total_high_risk])
    writer.writerow(['Medium Risk', report.risk_metrics.total_medium_risk])
    writer.writerow(['Low Risk', report.risk_metrics.total_low_risk])
    writer.writerow(['Average Risk Score', report.risk_metrics.average_risk_score])
    writer.writerow([])
    
    writer.writerow(['CASE METRICS'])
    writer.writerow(['Total Cases', report.case_metrics.total_cases])
    writer.writerow(['New Cases', report.case_metrics.new_cases])
    writer.writerow(['Resolved Cases', report.case_metrics.resolved_cases])
    writer.writerow([])
    
    writer.writerow(['COUNTRY ANALYSIS'])
    writer.writerow(['Country', 'Transactions', 'Total Amount', 'Avg Risk', 'High Risk Count'])
    for c in report.country_analysis:
        writer.writerow([c.country, c.transaction_count, c.total_amount, c.average_risk, c.high_risk_count])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=fraud_report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"}
    )

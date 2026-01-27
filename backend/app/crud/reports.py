from sqlalchemy.orm import Session
from sqlalchemy import select, func, and_, case as sql_case
from datetime import datetime, timedelta
from typing import Optional

from app.models.transaction import Transaction
from app.models.case import Case
from app.schemas.reports import *


def get_transaction_metrics(
    db: Session,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    country: Optional[str] = None
) -> TransactionMetrics:
    """Get transaction metrics"""
    query = select(
        func.count(Transaction.id).label('total'),
        func.sum(Transaction.amount).label('total_amount'),
        func.avg(Transaction.amount).label('avg_amount'),
        func.min(Transaction.amount).label('min_amount'),
        func.max(Transaction.amount).label('max_amount')
    )
    
    # Apply filters
    conditions = []
    if start_date:
        conditions.append(Transaction.created_at >= start_date)
    if end_date:
        conditions.append(Transaction.created_at <= end_date)
    if country:
        conditions.append(Transaction.country == country)
    
    if conditions:
        query = query.where(and_(*conditions))
    
    result = db.execute(query).first()
    
    return TransactionMetrics(
        total_transactions=result.total or 0,
        total_amount=float(result.total_amount or 0),
        average_amount=float(result.avg_amount or 0),
        min_amount=float(result.min_amount or 0),
        max_amount=float(result.max_amount or 0)
    )


def get_risk_metrics(
    db: Session,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> RiskMetrics:
    """Get risk distribution metrics"""
    conditions = []
    if start_date:
        conditions.append(Transaction.created_at >= start_date)
    if end_date:
        conditions.append(Transaction.created_at <= end_date)
    
    base_query = select(Transaction)
    if conditions:
        base_query = base_query.where(and_(*conditions))
    
    transactions = db.execute(base_query).scalars().all()
    
    total = len(transactions)
    if total == 0:
        return RiskMetrics(
            total_high_risk=0,
            total_medium_risk=0,
            total_low_risk=0,
            average_risk_score=0,
            high_risk_percentage=0
        )
    
    high_risk = sum(1 for t in transactions if t.risk and t.risk >= 70)
    medium_risk = sum(1 for t in transactions if t.risk and 40 <= t.risk < 70)
    low_risk = sum(1 for t in transactions if t.risk and t.risk < 40)
    avg_risk = sum(t.risk or 0 for t in transactions) / total
    
    return RiskMetrics(
        total_high_risk=high_risk,
        total_medium_risk=medium_risk,
        total_low_risk=low_risk,
        average_risk_score=round(avg_risk, 2),
        high_risk_percentage=round((high_risk / total) * 100, 2)
    )


def get_case_metrics(
    db: Session,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> CaseMetrics:
    """Get case metrics"""
    conditions = []
    if start_date:
        conditions.append(Case.created_at >= start_date)
    if end_date:
        conditions.append(Case.created_at <= end_date)
    
    base_query = select(Case)
    if conditions:
        base_query = base_query.where(and_(*conditions))
    
    cases = db.execute(base_query).scalars().all()
    
    total = len(cases)
    new = sum(1 for c in cases if c.status == 'NEW')
    in_progress = sum(1 for c in cases if c.status == 'IN_PROGRESS')
    resolved = sum(1 for c in cases if c.status == 'RESOLVED')
    closed = sum(1 for c in cases if c.status == 'CLOSED')
    
    # Calculate average resolution time
    resolved_cases = [c for c in cases if c.status in ['RESOLVED', 'CLOSED'] and c.updated_at]
    avg_resolution = None
    if resolved_cases:
        total_hours = sum((c.updated_at - c.created_at).total_seconds() / 3600 for c in resolved_cases)
        avg_resolution = round(total_hours / len(resolved_cases), 2)
    
    return CaseMetrics(
        total_cases=total,
        new_cases=new,
        in_progress_cases=in_progress,
        resolved_cases=resolved,
        closed_cases=closed,
        avg_resolution_time_hours=avg_resolution
    )


def get_model_performance(
    db: Session,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> ModelPerformance:
    """Calculate model performance metrics"""
    conditions = []
    if start_date:
        conditions.append(Transaction.created_at >= start_date)
    if end_date:
        conditions.append(Transaction.created_at <= end_date)
    
    base_query = select(Transaction)
    if conditions:
        base_query = base_query.where(and_(*conditions))
    
    transactions = db.execute(base_query).scalars().all()
    
    total = len(transactions)
    if total == 0:
        return ModelPerformance(
            total_predictions=0,
            high_risk_accuracy=0,
            false_positive_rate=0,
            false_negative_rate=0,
            precision=0,
            recall=0
        )
    
    # For demonstration, calculate based on cases created
    high_risk_tx = [t for t in transactions if t.risk and t.risk >= 70]
    cases_created = len(db.execute(
        select(Case).join(Transaction).where(Transaction.id.in_([t.id for t in high_risk_tx]))
    ).scalars().all())
    
    # Metrics (simplified for MVP)
    true_positives = cases_created
    false_positives = len(high_risk_tx) - cases_created
    false_negatives = 0  # Would need labeled data
    true_negatives = total - len(high_risk_tx)
    
    precision = true_positives / (true_positives + false_positives) if (true_positives + false_positives) > 0 else 0
    recall = true_positives / (true_positives + false_negatives) if (true_positives + false_negatives) > 0 else 1.0
    accuracy = (true_positives + true_negatives) / total if total > 0 else 0
    fpr = false_positives / (false_positives + true_negatives) if (false_positives + true_negatives) > 0 else 0
    fnr = false_negatives / (false_negatives + true_positives) if (false_negatives + true_positives) > 0 else 0
    
    return ModelPerformance(
        total_predictions=total,
        high_risk_accuracy=round(accuracy * 100, 2),
        false_positive_rate=round(fpr * 100, 2),
        false_negative_rate=round(fnr * 100, 2),
        precision=round(precision * 100, 2),
        recall=round(recall * 100, 2)
    )


def get_time_series_data(
    db: Session,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    granularity: str = "day"
) -> list[TimeSeriesData]:
    """Get time series data"""
    # Group by day
    query = select(
        func.date(Transaction.created_at).label('date'),
        func.count(Transaction.id).label('count'),
        func.sum(Transaction.amount).label('total_amount'),
        func.sum(sql_case((Transaction.risk >= 70, 1), else_=0)).label('high_risk_count'),
        func.avg(Transaction.risk).label('avg_risk')
    ).group_by(func.date(Transaction.created_at)).order_by(func.date(Transaction.created_at))
    
    conditions = []
    if start_date:
        conditions.append(Transaction.created_at >= start_date)
    if end_date:
        conditions.append(Transaction.created_at <= end_date)
    
    if conditions:
        query = query.where(and_(*conditions))
    
    results = db.execute(query).all()
    
    return [
        TimeSeriesData(
            date=str(r.date),
            transaction_count=r.count,
            total_amount=float(r.total_amount or 0),
            high_risk_count=r.high_risk_count or 0,
            average_risk=round(float(r.avg_risk or 0), 2)
        )
        for r in results
    ]


def get_country_analysis(
    db: Session,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = 10
) -> list[CountryAnalysis]:
    """Analyze transactions by country"""
    query = select(
        Transaction.country,
        func.count(Transaction.id).label('count'),
        func.sum(Transaction.amount).label('total_amount'),
        func.avg(Transaction.risk).label('avg_risk'),
        func.sum(sql_case((Transaction.risk >= 70, 1), else_=0)).label('high_risk_count')
    ).group_by(Transaction.country).order_by(func.count(Transaction.id).desc()).limit(limit)
    
    conditions = []
    if start_date:
        conditions.append(Transaction.created_at >= start_date)
    if end_date:
        conditions.append(Transaction.created_at <= end_date)
    
    if conditions:
        query = query.where(and_(*conditions))
    
    results = db.execute(query).all()
    
    return [
        CountryAnalysis(
            country=r.country or "Unknown",
            transaction_count=r.count,
            total_amount=float(r.total_amount or 0),
            average_risk=round(float(r.avg_risk or 0), 2),
            high_risk_count=r.high_risk_count or 0
        )
        for r in results
    ]


def get_merchant_analysis(
    db: Session,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = 10
) -> list[MerchantAnalysis]:
    """Analyze transactions by merchant"""
    query = select(
        Transaction.merchant,
        func.count(Transaction.id).label('count'),
        func.sum(Transaction.amount).label('total_amount'),
        func.avg(Transaction.risk).label('avg_risk'),
        func.sum(sql_case((Transaction.risk >= 70, 1), else_=0)).label('high_risk_count')
    ).group_by(Transaction.merchant).order_by(func.sum(Transaction.amount).desc()).limit(limit)
    
    conditions = []
    if start_date:
        conditions.append(Transaction.created_at >= start_date)
    if end_date:
        conditions.append(Transaction.created_at <= end_date)
    
    if conditions:
        query = query.where(and_(*conditions))
    
    results = db.execute(query).all()
    
    return [
        MerchantAnalysis(
            merchant=r.merchant or "Unknown",
            transaction_count=r.count,
            total_amount=float(r.total_amount or 0),
            average_risk=round(float(r.avg_risk or 0), 2),
            high_risk_percentage=round((r.high_risk_count / r.count) * 100, 2) if r.count > 0 else 0
        )
        for r in results
    ]


def get_channel_analysis(
    db: Session,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> list[ChannelAnalysis]:
    """Analyze transactions by channel"""
    query = select(
        Transaction.channel,
        func.count(Transaction.id).label('count'),
        func.avg(Transaction.amount).label('avg_amount'),
        func.sum(sql_case((Transaction.risk >= 70, 1), else_=0)).label('high_risk_count')
    ).group_by(Transaction.channel).order_by(func.count(Transaction.id).desc())
    
    conditions = []
    if start_date:
        conditions.append(Transaction.created_at >= start_date)
    if end_date:
        conditions.append(Transaction.created_at <= end_date)
    
    if conditions:
        query = query.where(and_(*conditions))
    
    results = db.execute(query).all()
    
    return [
        ChannelAnalysis(
            channel=r.channel or "Unknown",
            transaction_count=r.count,
            average_amount=round(float(r.avg_amount or 0), 2),
            high_risk_percentage=round((r.high_risk_count / r.count) * 100, 2) if r.count > 0 else 0
        )
        for r in results
    ]


def generate_comprehensive_report(
    db: Session,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    country: Optional[str] = None
) -> ComprehensiveReport:
    """Generate comprehensive fraud detection report"""
    
    # Get all metrics
    tx_metrics = get_transaction_metrics(db, start_date, end_date, country)
    risk_metrics = get_risk_metrics(db, start_date, end_date)
    case_metrics = get_case_metrics(db, start_date, end_date)
    model_perf = get_model_performance(db, start_date, end_date)
    
    # Get analyses
    time_series = get_time_series_data(db, start_date, end_date)
    country_analysis = get_country_analysis(db, start_date, end_date)
    merchant_analysis = get_merchant_analysis(db, start_date, end_date)
    channel_analysis = get_channel_analysis(db, start_date, end_date)
    
    # Get top transactions
    top_risk_query = select(Transaction).order_by(Transaction.risk.desc()).limit(5)
    top_amount_query = select(Transaction).order_by(Transaction.amount.desc()).limit(5)
    
    conditions = []
    if start_date:
        conditions.append(Transaction.created_at >= start_date)
    if end_date:
        conditions.append(Transaction.created_at <= end_date)
    
    if conditions:
        top_risk_query = top_risk_query.where(and_(*conditions))
        top_amount_query = top_amount_query.where(and_(*conditions))
    
    top_risk_tx = db.execute(top_risk_query).scalars().all()
    top_amount_tx = db.execute(top_amount_query).scalars().all()
    
    # Build report
    period = f"{start_date.strftime('%Y-%m-%d') if start_date else 'Beginning'} to {end_date.strftime('%Y-%m-%d') if end_date else 'Present'}"
    
    return ComprehensiveReport(
        report_generated_at=datetime.utcnow(),
        report_period=period,
        filters_applied={
            "start_date": start_date.isoformat() if start_date else None,
            "end_date": end_date.isoformat() if end_date else None,
            "country": country
        },
        transaction_metrics=tx_metrics,
        risk_metrics=risk_metrics,
        case_metrics=case_metrics,
        model_performance=model_perf,
        time_series=time_series,
        country_analysis=country_analysis,
        merchant_analysis=merchant_analysis,
        channel_analysis=channel_analysis,
        top_risk_transactions=[
            {
                "tx_id": t.tx_id,
                "amount": t.amount,
                "risk": t.risk,
                "country": t.country,
                "merchant": t.merchant
            }
            for t in top_risk_tx
        ],
        top_amount_transactions=[
            {
                "tx_id": t.tx_id,
                "amount": t.amount,
                "risk": t.risk,
                "country": t.country,
                "merchant": t.merchant
            }
            for t in top_amount_tx
        ]
    )

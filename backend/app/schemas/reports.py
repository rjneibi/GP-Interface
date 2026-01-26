from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel


class ReportFilters(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    country: Optional[str] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None


class TransactionMetrics(BaseModel):
    total_transactions: int
    total_amount: float
    average_amount: float
    min_amount: float
    max_amount: float


class RiskMetrics(BaseModel):
    total_high_risk: int
    total_medium_risk: int
    total_low_risk: int
    average_risk_score: float
    high_risk_percentage: float


class CaseMetrics(BaseModel):
    total_cases: int
    new_cases: int
    in_progress_cases: int
    resolved_cases: int
    closed_cases: int
    avg_resolution_time_hours: Optional[float]


class ModelPerformance(BaseModel):
    total_predictions: int
    high_risk_accuracy: float
    false_positive_rate: float
    false_negative_rate: float
    precision: float
    recall: float


class TimeSeriesData(BaseModel):
    date: str
    transaction_count: int
    total_amount: float
    high_risk_count: int
    average_risk: float


class CountryAnalysis(BaseModel):
    country: str
    transaction_count: int
    total_amount: float
    average_risk: float
    high_risk_count: int


class MerchantAnalysis(BaseModel):
    merchant: str
    transaction_count: int
    total_amount: float
    average_risk: float
    high_risk_percentage: float


class ChannelAnalysis(BaseModel):
    channel: str
    transaction_count: int
    average_amount: float
    high_risk_percentage: float


class ComprehensiveReport(BaseModel):
    report_generated_at: datetime
    report_period: str
    filters_applied: Dict[str, Any]
    
    # Core metrics
    transaction_metrics: TransactionMetrics
    risk_metrics: RiskMetrics
    case_metrics: CaseMetrics
    model_performance: ModelPerformance
    
    # Analysis
    time_series: list[TimeSeriesData]
    country_analysis: list[CountryAnalysis]
    merchant_analysis: list[MerchantAnalysis]
    channel_analysis: list[ChannelAnalysis]
    
    # Top findings
    top_risk_transactions: list[Dict[str, Any]]
    top_amount_transactions: list[Dict[str, Any]]


class ExecutiveSummary(BaseModel):
    total_transactions_processed: int
    total_value_processed: float
    total_cases_created: int
    fraud_detection_rate: float
    average_risk_score: float
    high_risk_percentage: float
    system_efficiency: float
    period: str
    key_insights: list[str]

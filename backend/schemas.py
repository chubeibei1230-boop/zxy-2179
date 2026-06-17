from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from models import ApplicationStatus


class ConsumableBase(BaseModel):
    name: str = Field(..., max_length=100)
    specification: Optional[str] = Field(None, max_length=200)
    unit: str = Field(..., max_length=20)
    category: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None


class ConsumableCreate(ConsumableBase):
    pass


class ConsumableUpdate(ConsumableBase):
    pass


class Consumable(ConsumableBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ConsumableWithInventory(Consumable):
    total_quantity: float = 0.0
    threshold_status: Optional[str] = None


class BatchBase(BaseModel):
    batch_no: str = Field(..., max_length=50)
    consumable_id: int
    production_date: Optional[date] = None
    expiry_date: Optional[date] = None
    quantity: float = Field(..., ge=0)
    unit_price: Optional[float] = None
    supplier: Optional[str] = Field(None, max_length=100)
    remark: Optional[str] = None


class BatchCreate(BatchBase):
    pass


class BatchUpdate(BatchBase):
    pass


class Batch(BatchBase):
    id: int
    is_expiring_soon: Optional[bool] = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BatchWithConsumable(Batch):
    consumable: Optional[Consumable] = None


class CourseBase(BaseModel):
    course_code: str = Field(..., max_length=50)
    course_name: str = Field(..., max_length=100)
    teacher: str = Field(..., max_length=50)
    student_count: Optional[int] = 0
    course_date: date
    start_time: Optional[str] = Field(None, max_length=20)
    end_time: Optional[str] = Field(None, max_length=20)
    lab_room: Optional[str] = Field(None, max_length=50)
    remark: Optional[str] = None
    template_id: Optional[int] = None


class CourseCreate(CourseBase):
    pass


class CourseUpdate(CourseBase):
    pass


class Course(CourseBase):
    id: int
    created_at: datetime
    updated_at: datetime
    template: Optional["ConsumableTemplate"] = None

    class Config:
        from_attributes = True


class InventoryThresholdBase(BaseModel):
    consumable_id: int
    min_threshold: float = Field(..., ge=0)
    warning_threshold: float = Field(..., ge=0)


class InventoryThresholdCreate(InventoryThresholdBase):
    pass


class InventoryThresholdUpdate(InventoryThresholdBase):
    pass


class InventoryThreshold(InventoryThresholdBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class InventoryThresholdWithConsumable(InventoryThreshold):
    consumable: Optional[Consumable] = None


class ApplicationItemBase(BaseModel):
    consumable_id: int
    batch_id: Optional[int] = None
    requested_quantity: float = Field(..., gt=0)
    approved_quantity: Optional[float] = None
    actual_quantity: Optional[float] = None
    remaining_quantity: Optional[float] = None
    check_remark: Optional[str] = None
    has_exception: Optional[bool] = False
    exception_remark: Optional[str] = None


class ApplicationItemCreate(ApplicationItemBase):
    pass


class ApplicationItemUpdate(BaseModel):
    batch_id: Optional[int] = None
    requested_quantity: Optional[float] = Field(None, gt=0)
    approved_quantity: Optional[float] = None
    actual_quantity: Optional[float] = None
    remaining_quantity: Optional[float] = None
    check_remark: Optional[str] = None
    has_exception: Optional[bool] = False
    exception_remark: Optional[str] = None


class ApplicationItem(ApplicationItemBase):
    id: int
    application_id: int
    consumable: Optional[Consumable] = None
    batch: Optional[Batch] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FeedbackBase(BaseModel):
    application_id: int
    application_item_id: int
    usage_quantity: float = Field(..., ge=0)
    remaining_quantity: float = Field(..., ge=0)
    usage_situation: Optional[str] = None
    quality_issue: Optional[bool] = False
    quality_issue_desc: Optional[str] = None
    submitted_by: Optional[str] = Field(None, max_length=50)


class FeedbackCreate(FeedbackBase):
    pass


class FeedbackUpdate(BaseModel):
    usage_quantity: Optional[float] = Field(None, ge=0)
    remaining_quantity: Optional[float] = Field(None, ge=0)
    usage_situation: Optional[str] = None
    quality_issue: Optional[bool] = False
    quality_issue_desc: Optional[str] = None
    submitted_by: Optional[str] = Field(None, max_length=50)


class Feedback(FeedbackBase):
    id: int
    application_item: Optional[ApplicationItem] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ApplicationBase(BaseModel):
    course_id: int
    applicant: str = Field(..., max_length=50)
    purpose: Optional[str] = None


class ApplicationCreate(ApplicationBase):
    items: List[ApplicationItemCreate]


class ApplicationUpdate(BaseModel):
    course_id: Optional[int] = None
    applicant: Optional[str] = Field(None, max_length=50)
    purpose: Optional[str] = None
    status: Optional[str] = None
    review_comment: Optional[str] = None
    reviewer: Optional[str] = None
    items: Optional[List[ApplicationItemUpdate]] = None


class ApplicationSubmit(BaseModel):
    pass


class ApplicationReview(BaseModel):
    approved: bool
    review_comment: Optional[str] = None
    reviewer: str = Field(..., max_length=50)


class ApplicationPrepare(BaseModel):
    prepared_by: str = Field(..., max_length=50)
    items: List[ApplicationItemUpdate]


class ApplicationDistribute(BaseModel):
    distributed_by: str = Field(..., max_length=50)


class ApplicationCheck(BaseModel):
    items: List[ApplicationItemUpdate]


class ApplicationClose(BaseModel):
    closed_by: str = Field(..., max_length=50)


class Application(ApplicationBase):
    id: int
    application_no: str
    status: str
    review_comment: Optional[str] = None
    reviewer: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    prepared_by: Optional[str] = None
    prepared_at: Optional[datetime] = None
    distributed_by: Optional[str] = None
    distributed_at: Optional[datetime] = None
    closed_by: Optional[str] = None
    closed_at: Optional[datetime] = None
    items: List[ApplicationItem] = []
    feedbacks: List[Feedback] = []
    course: Optional[Course] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ApplicationFilter(BaseModel):
    course_id: Optional[int] = None
    consumable_id: Optional[int] = None
    batch_id: Optional[int] = None
    applicant: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class DashboardStats(BaseModel):
    low_inventory_count: int
    expiring_batches_count: int
    missing_feedback_count: int
    feedback_completion_rate: float
    application_flow: dict
    abnormal_consumption_count: int


class LowInventoryItem(BaseModel):
    consumable_id: int
    consumable_name: str
    total_quantity: float
    min_threshold: float
    warning_threshold: float
    status: str


class ExpiringBatchItem(BaseModel):
    batch_id: int
    batch_no: str
    consumable_name: str
    expiry_date: date
    remaining_quantity: float
    days_to_expiry: int


class AbnormalConsumptionItem(BaseModel):
    application_id: int
    application_no: str
    course_name: str
    consumable_name: str
    requested_quantity: float
    actual_quantity: float
    usage_quantity: float
    deviation_rate: float
    has_exception: bool


class InventoryItem(BaseModel):
    consumable_id: int
    consumable_name: str
    specification: Optional[str]
    unit: str
    category: Optional[str]
    total_quantity: float
    min_threshold: float
    warning_threshold: float
    threshold_status: Optional[str]
    batches: List[BatchWithConsumable] = []


class ApplicationFlowItem(BaseModel):
    status: str
    count: int


class MissingFeedbackItem(BaseModel):
    application_id: int
    application_no: str
    course_name: str
    applicant: str
    distributed_at: Optional[datetime]
    pending_items: int


class BatchWithInventory(Batch):
    consumable_name: Optional[str] = None
    remaining_quantity: float = 0.0
    days_to_expiry: int = 0
    expiry_status: Optional[str] = None


class TemplateItemBase(BaseModel):
    consumable_id: int
    quantity_per_student: float = Field(..., gt=0)
    remark: Optional[str] = None


class TemplateItemCreate(TemplateItemBase):
    pass


class TemplateItemUpdate(BaseModel):
    consumable_id: Optional[int] = None
    quantity_per_student: Optional[float] = Field(None, gt=0)
    remark: Optional[str] = None


class TemplateItem(TemplateItemBase):
    id: int
    template_id: int
    consumable: Optional[Consumable] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TemplateItemWithInventory(TemplateItem):
    total_quantity: float = 0.0
    threshold_status: Optional[str] = None
    available_quantity: float = 0.0
    expiring_batches: List[BatchWithInventory] = []
    is_duplicate: bool = False
    duplicate_warning: Optional[str] = None
    gap_quantity: float = 0.0
    historical_avg_deviation: Optional[float] = None


class ConsumableTemplateBase(BaseModel):
    name: str = Field(..., max_length=100)
    description: Optional[str] = None
    applicable_courses: Optional[str] = None
    created_by: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = True


class ConsumableTemplateCreate(ConsumableTemplateBase):
    items: List[TemplateItemCreate]


class ConsumableTemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    applicable_courses: Optional[str] = None
    is_active: Optional[bool] = None
    items: Optional[List[TemplateItemCreate]] = None


class ConsumableTemplate(ConsumableTemplateBase):
    id: int
    items: List[TemplateItem] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ConsumableTemplateWithStats(ConsumableTemplate):
    usage_count: int = 0
    total_consumables: int = 0
    last_used_at: Optional[date] = None
    avg_deviation_rate: Optional[float] = None


class GenerateApplicationRequest(BaseModel):
    course_id: int
    template_id: int
    student_count: int = Field(..., gt=0)
    exclude_application_id: Optional[int] = None


class GeneratedApplicationItem(BaseModel):
    consumable_id: int
    consumable_name: str
    specification: Optional[str] = None
    unit: str
    quantity_per_student: float
    student_count: int
    suggested_quantity: float
    total_quantity: float
    available_quantity: float
    threshold_status: Optional[str] = None
    expiring_batches: List[BatchWithInventory] = []
    is_duplicate: bool = False
    duplicate_warning: Optional[str] = None
    gap_quantity: float = 0.0
    historical_avg_deviation: Optional[float] = None
    remark: Optional[str] = None


class GenerateApplicationResponse(BaseModel):
    course_id: int
    course_name: str
    template_id: int
    template_name: str
    student_count: int
    total_suggested_amount: float = 0.0
    total_available_rate: float = 0.0
    items: List[GeneratedApplicationItem] = []
    has_duplicates: bool = False
    has_gaps: bool = False
    has_expiring: bool = False
    gap_items_count: int = 0
    expiring_items_count: int = 0


class SubmitGeneratedApplicationRequest(BaseModel):
    course_id: int
    template_id: int
    student_count: int
    applicant: str
    purpose: Optional[str] = None
    items: List[ApplicationItemCreate]


class TemplateUsageHistoryBase(BaseModel):
    template_id: int
    course_id: int
    application_id: int
    consumable_id: int
    student_count: int
    requested_quantity: float
    actual_quantity: Optional[float] = None
    usage_quantity: Optional[float] = None
    deviation_rate: Optional[float] = None
    used_at: date


class TemplateUsageHistory(TemplateUsageHistoryBase):
    id: int
    course: Optional[Course] = None
    application: Optional[Application] = None
    consumable: Optional[Consumable] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TemplateHistoricalReference(BaseModel):
    consumable_id: int
    consumable_name: str
    usage_count: int
    avg_quantity_per_student: float
    avg_deviation_rate: Optional[float]
    last_used_at: Optional[date] = None

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


class CourseCreate(CourseBase):
    pass


class CourseUpdate(CourseBase):
    pass


class Course(CourseBase):
    id: int
    created_at: datetime
    updated_at: datetime

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

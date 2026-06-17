from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Date, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, date
from database import Base


class ApplicationStatus:
    PENDING_SUBMIT = "待提交"
    PENDING_REVIEW = "待审核"
    APPROVED = "已通过"
    PREPARING = "备货中"
    DISTRIBUTED = "已发放"
    PENDING_FEEDBACK = "待反馈"
    CLOSED = "已关闭"


class Consumable(Base):
    __tablename__ = "consumables"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    specification = Column(String(200))
    unit = Column(String(20), nullable=False)
    category = Column(String(50), index=True)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    batches = relationship("Batch", back_populates="consumable")
    thresholds = relationship("InventoryThreshold", back_populates="consumable")
    application_items = relationship("ApplicationItem", back_populates="consumable")


class Batch(Base):
    __tablename__ = "batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_no = Column(String(50), nullable=False, unique=True, index=True)
    consumable_id = Column(Integer, ForeignKey("consumables.id"), nullable=False)
    production_date = Column(Date)
    expiry_date = Column(Date, index=True)
    quantity = Column(Float, nullable=False, default=0)
    unit_price = Column(Float)
    supplier = Column(String(100))
    remark = Column(Text)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    consumable = relationship("Consumable", back_populates="batches")
    application_items = relationship("ApplicationItem", back_populates="batch")

    @property
    def is_expiring_soon(self):
        if not self.expiry_date:
            return False
        return (self.expiry_date - date.today()).days <= 30


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    course_code = Column(String(50), nullable=False, unique=True, index=True)
    course_name = Column(String(100), nullable=False, index=True)
    teacher = Column(String(50), nullable=False, index=True)
    student_count = Column(Integer, default=0)
    course_date = Column(Date, index=True)
    start_time = Column(String(20))
    end_time = Column(String(20))
    lab_room = Column(String(50))
    remark = Column(Text)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    applications = relationship("Application", back_populates="course")


class InventoryThreshold(Base):
    __tablename__ = "inventory_thresholds"

    id = Column(Integer, primary_key=True, index=True)
    consumable_id = Column(Integer, ForeignKey("consumables.id"), nullable=False, unique=True)
    min_threshold = Column(Float, nullable=False, default=0)
    warning_threshold = Column(Float, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    consumable = relationship("Consumable", back_populates="thresholds")


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    application_no = Column(String(50), nullable=False, unique=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    applicant = Column(String(50), nullable=False, index=True)
    status = Column(String(20), nullable=False, default=ApplicationStatus.PENDING_SUBMIT, index=True)
    purpose = Column(Text)
    review_comment = Column(Text)
    reviewer = Column(String(50))
    reviewed_at = Column(DateTime)
    prepared_by = Column(String(50))
    prepared_at = Column(DateTime)
    distributed_by = Column(String(50))
    distributed_at = Column(DateTime)
    closed_by = Column(String(50))
    closed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.now, index=True)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    course = relationship("Course", back_populates="applications")
    items = relationship("ApplicationItem", back_populates="application", cascade="all, delete-orphan")
    feedbacks = relationship("Feedback", back_populates="application", cascade="all, delete-orphan")


class ApplicationItem(Base):
    __tablename__ = "application_items"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    consumable_id = Column(Integer, ForeignKey("consumables.id"), nullable=False)
    batch_id = Column(Integer, ForeignKey("batches.id"))
    requested_quantity = Column(Float, nullable=False)
    approved_quantity = Column(Float)
    actual_quantity = Column(Float)
    remaining_quantity = Column(Float)
    check_remark = Column(Text)
    has_exception = Column(Boolean, default=False)
    exception_remark = Column(Text)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    application = relationship("Application", back_populates="items")
    consumable = relationship("Consumable", back_populates="application_items")
    batch = relationship("Batch", back_populates="application_items")


class Feedback(Base):
    __tablename__ = "feedbacks"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    application_item_id = Column(Integer, ForeignKey("application_items.id"), nullable=False)
    usage_quantity = Column(Float, nullable=False)
    remaining_quantity = Column(Float, nullable=False)
    usage_situation = Column(Text)
    quality_issue = Column(Boolean, default=False)
    quality_issue_desc = Column(Text)
    submitted_by = Column(String(50))
    created_at = Column(DateTime, default=datetime.now, index=True)

    application = relationship("Application", back_populates="feedbacks")
    application_item = relationship("ApplicationItem")

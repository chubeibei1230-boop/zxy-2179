from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func
from typing import List, Optional, Tuple
from datetime import datetime, date, timedelta
import models
import schemas
from models import ApplicationStatus


def generate_application_no(db: Session) -> str:
    today = date.today().strftime("%Y%m%d")
    prefix = f"APP{today}"
    count = db.query(models.Application).filter(
        models.Application.application_no.like(f"{prefix}%")
    ).count()
    return f"{prefix}{count + 1:04d}"


def get_consumable(db: Session, consumable_id: int):
    return db.query(models.Consumable).filter(models.Consumable.id == consumable_id).first()


def get_consumables(db: Session, skip: int = 0, limit: int = 100, name: Optional[str] = None, category: Optional[str] = None):
    query = db.query(models.Consumable)
    if name:
        query = query.filter(models.Consumable.name.like(f"%{name}%"))
    if category:
        query = query.filter(models.Consumable.category == category)
    return query.offset(skip).limit(limit).all()


def create_consumable(db: Session, consumable: schemas.ConsumableCreate):
    db_consumable = models.Consumable(**consumable.model_dump())
    db.add(db_consumable)
    db.flush()
    default_threshold = models.InventoryThreshold(
        consumable_id=db_consumable.id,
        min_threshold=10,
        warning_threshold=20
    )
    db.add(default_threshold)
    db.commit()
    db.refresh(db_consumable)
    return db_consumable


def update_consumable(db: Session, consumable_id: int, consumable: schemas.ConsumableUpdate):
    db_consumable = get_consumable(db, consumable_id)
    if db_consumable:
        for key, value in consumable.model_dump(exclude_unset=True).items():
            setattr(db_consumable, key, value)
        db.commit()
        db.refresh(db_consumable)
    return db_consumable


def delete_consumable(db: Session, consumable_id: int):
    db_consumable = get_consumable(db, consumable_id)
    if db_consumable:
        db.delete(db_consumable)
        db.commit()
    return db_consumable


def get_consumable_total_quantity(db: Session, consumable_id: int) -> float:
    total = db.query(func.sum(models.Batch.quantity)).filter(
        models.Batch.consumable_id == consumable_id
    ).scalar()
    return total or 0.0


def get_consumable_available_quantity(db: Session, consumable_id: int) -> float:
    today = date.today()
    total = db.query(func.sum(models.Batch.quantity)).filter(
        and_(
            models.Batch.consumable_id == consumable_id,
            models.Batch.quantity > 0,
            or_(
                models.Batch.expiry_date == None,
                models.Batch.expiry_date >= today
            )
        )
    ).scalar()
    return total or 0.0


def get_consumable_with_inventory(db: Session, consumable_id: int):
    consumable = get_consumable(db, consumable_id)
    if not consumable:
        return None
    total_qty = get_consumable_total_quantity(db, consumable_id)
    threshold = db.query(models.InventoryThreshold).filter(
        models.InventoryThreshold.consumable_id == consumable_id
    ).first()

    status = None
    if threshold:
        if total_qty <= threshold.min_threshold:
            status = "严重不足"
        elif total_qty <= threshold.warning_threshold:
            status = "库存预警"

    result = schemas.ConsumableWithInventory(
        id=consumable.id,
        name=consumable.name,
        specification=consumable.specification,
        unit=consumable.unit,
        category=consumable.category,
        description=consumable.description,
        created_at=consumable.created_at,
        updated_at=consumable.updated_at,
        total_quantity=total_qty,
        threshold_status=status
    )
    return result


def get_all_consumables_with_inventory(db: Session):
    consumables = get_consumables(db)
    results = []
    for c in consumables:
        result = get_consumable_with_inventory(db, c.id)
        if result:
            results.append(result)
    return results


def get_batch(db: Session, batch_id: int):
    return db.query(models.Batch).filter(models.Batch.id == batch_id).first()


def get_batches(db: Session, skip: int = 0, limit: int = 100, batch_no: Optional[str] = None, consumable_id: Optional[int] = None):
    query = db.query(models.Batch).options(joinedload(models.Batch.consumable))
    if batch_no:
        query = query.filter(models.Batch.batch_no.like(f"%{batch_no}%"))
    if consumable_id:
        query = query.filter(models.Batch.consumable_id == consumable_id)
    return query.offset(skip).limit(limit).all()


def create_batch(db: Session, batch: schemas.BatchCreate):
    db_batch = models.Batch(**batch.model_dump())
    db.add(db_batch)
    db.commit()
    db.refresh(db_batch)
    return db_batch


def update_batch(db: Session, batch_id: int, batch: schemas.BatchUpdate):
    db_batch = get_batch(db, batch_id)
    if db_batch:
        for key, value in batch.model_dump(exclude_unset=True).items():
            setattr(db_batch, key, value)
        db.commit()
        db.refresh(db_batch)
    return db_batch


def delete_batch(db: Session, batch_id: int):
    db_batch = get_batch(db, batch_id)
    if db_batch:
        db.delete(db_batch)
        db.commit()
    return db_batch


def is_batch_expiring_soon(batch: models.Batch, days: int = 30) -> bool:
    if not batch.expiry_date:
        return False
    return (batch.expiry_date - date.today()).days <= days


def get_expiring_batches(db: Session, days: int = 30) -> List[schemas.ExpiringBatchItem]:
    today = date.today()
    expiry_cutoff = today + timedelta(days=days)
    batches = db.query(models.Batch).options(joinedload(models.Batch.consumable)).filter(
        and_(
            models.Batch.expiry_date <= expiry_cutoff,
            models.Batch.expiry_date >= today,
            models.Batch.quantity > 0
        )
    ).all()

    results = []
    for batch in batches:
        days_to_expiry = (batch.expiry_date - today).days
        results.append(schemas.ExpiringBatchItem(
            batch_id=batch.id,
            batch_no=batch.batch_no,
            consumable_name=batch.consumable.name if batch.consumable else "",
            expiry_date=batch.expiry_date,
            remaining_quantity=batch.quantity,
            days_to_expiry=days_to_expiry
        ))
    return results


def get_course(db: Session, course_id: int):
    return db.query(models.Course).filter(models.Course.id == course_id).first()


def get_courses(db: Session, skip: int = 0, limit: int = 100, course_name: Optional[str] = None, teacher: Optional[str] = None):
    query = db.query(models.Course)
    if course_name:
        query = query.filter(models.Course.course_name.like(f"%{course_name}%"))
    if teacher:
        query = query.filter(models.Course.teacher.like(f"%{teacher}%"))
    return query.order_by(models.Course.course_date.desc()).offset(skip).limit(limit).all()


def create_course(db: Session, course: schemas.CourseCreate):
    db_course = models.Course(**course.model_dump())
    db.add(db_course)
    db.commit()
    db.refresh(db_course)
    return db_course


def update_course(db: Session, course_id: int, course: schemas.CourseUpdate):
    db_course = get_course(db, course_id)
    if db_course:
        for key, value in course.model_dump(exclude_unset=True).items():
            setattr(db_course, key, value)
        db.commit()
        db.refresh(db_course)
    return db_course


def delete_course(db: Session, course_id: int):
    db_course = get_course(db, course_id)
    if db_course:
        db.delete(db_course)
        db.commit()
    return db_course


def get_threshold(db: Session, threshold_id: int):
    return db.query(models.InventoryThreshold).filter(models.InventoryThreshold.id == threshold_id).first()


def get_threshold_by_consumable(db: Session, consumable_id: int):
    return db.query(models.InventoryThreshold).filter(
        models.InventoryThreshold.consumable_id == consumable_id
    ).first()


def get_thresholds(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.InventoryThreshold).options(joinedload(models.InventoryThreshold.consumable)).offset(skip).limit(limit).all()


def create_threshold(db: Session, threshold: schemas.InventoryThresholdCreate):
    existing = get_threshold_by_consumable(db, threshold.consumable_id)
    if existing:
        return update_threshold(db, existing.id, schemas.InventoryThresholdUpdate(**threshold.model_dump()))
    db_threshold = models.InventoryThreshold(**threshold.model_dump())
    db.add(db_threshold)
    db.commit()
    db.refresh(db_threshold)
    return db_threshold


def update_threshold(db: Session, threshold_id: int, threshold: schemas.InventoryThresholdUpdate):
    db_threshold = get_threshold(db, threshold_id)
    if db_threshold:
        for key, value in threshold.model_dump(exclude_unset=True).items():
            setattr(db_threshold, key, value)
        db.commit()
        db.refresh(db_threshold)
    return db_threshold


def delete_threshold(db: Session, threshold_id: int):
    db_threshold = get_threshold(db, threshold_id)
    if db_threshold:
        db.delete(db_threshold)
        db.commit()
    return db_threshold


def get_low_inventory_items(db: Session) -> List[schemas.LowInventoryItem]:
    thresholds = db.query(models.InventoryThreshold).options(joinedload(models.InventoryThreshold.consumable)).all()
    results = []
    for t in thresholds:
        total_qty = get_consumable_total_quantity(db, t.consumable_id)
        if total_qty <= t.warning_threshold:
            status = "严重不足" if total_qty <= t.min_threshold else "库存预警"
            results.append(schemas.LowInventoryItem(
                consumable_id=t.consumable_id,
                consumable_name=t.consumable.name if t.consumable else "",
                total_quantity=total_qty,
                min_threshold=t.min_threshold,
                warning_threshold=t.warning_threshold,
                status=status
            ))
    return sorted(results, key=lambda x: x.total_quantity)


def check_duplicate_application(db: Session, course_id: int, consumable_id: int, exclude_application_id: Optional[int] = None) -> bool:
    valid_statuses = [
        ApplicationStatus.PENDING_SUBMIT,
        ApplicationStatus.PENDING_REVIEW,
        ApplicationStatus.APPROVED,
        ApplicationStatus.PREPARING,
        ApplicationStatus.DISTRIBUTED,
        ApplicationStatus.PENDING_FEEDBACK
    ]
    query = db.query(models.Application).join(models.ApplicationItem).filter(
        and_(
            models.Application.course_id == course_id,
            models.ApplicationItem.consumable_id == consumable_id,
            models.Application.status.in_(valid_statuses)
        )
    )
    if exclude_application_id:
        query = query.filter(models.Application.id != exclude_application_id)
    return query.first() is not None


def get_application(db: Session, application_id: int):
    return db.query(models.Application).options(
        joinedload(models.Application.course),
        joinedload(models.Application.items).joinedload(models.ApplicationItem.consumable),
        joinedload(models.Application.items).joinedload(models.ApplicationItem.batch),
        joinedload(models.Application.feedbacks)
    ).filter(models.Application.id == application_id).first()


def get_applications(db: Session, skip: int = 0, limit: int = 100, filters: Optional[schemas.ApplicationFilter] = None):
    query = db.query(models.Application).options(
        joinedload(models.Application.course),
        joinedload(models.Application.items).joinedload(models.ApplicationItem.consumable),
        joinedload(models.Application.items).joinedload(models.ApplicationItem.batch),
        joinedload(models.Application.feedbacks)
    )

    if filters:
        if filters.course_id:
            query = query.filter(models.Application.course_id == filters.course_id)
        if filters.applicant:
            query = query.filter(models.Application.applicant.like(f"%{filters.applicant}%"))
        if filters.status:
            query = query.filter(models.Application.status == filters.status)
        if filters.start_date:
            query = query.filter(func.date(models.Application.created_at) >= filters.start_date)
        if filters.end_date:
            query = query.filter(func.date(models.Application.created_at) <= filters.end_date)
        if filters.consumable_id:
            query = query.join(models.ApplicationItem).filter(
                models.ApplicationItem.consumable_id == filters.consumable_id
            )
        if filters.batch_id:
            query = query.join(models.ApplicationItem).filter(
                models.ApplicationItem.batch_id == filters.batch_id
            )

    return query.order_by(models.Application.created_at.desc()).offset(skip).limit(limit).all()


def create_application(db: Session, application: schemas.ApplicationCreate):
    consumable_ids = [item.consumable_id for item in application.items]
    if len(consumable_ids) != len(set(consumable_ids)):
        seen = set()
        duplicate_id = None
        for cid in consumable_ids:
            if cid in seen:
                duplicate_id = cid
                break
            seen.add(cid)
        if duplicate_id:
            consumable = get_consumable(db, duplicate_id)
            raise ValueError(
                f"同一张申领单内不能重复添加耗材 '{consumable.name if consumable else duplicate_id}'"
            )

    for item in application.items:
        if check_duplicate_application(db, application.course_id, item.consumable_id):
            consumable = get_consumable(db, item.consumable_id)
            course = get_course(db, application.course_id)
            raise ValueError(
                f"同一课次 '{course.course_name if course else application.course_id}' 下 "
                f"耗材 '{consumable.name if consumable else item.consumable_id}' 已有有效申请"
            )

    app_no = generate_application_no(db)
    db_application = models.Application(
        application_no=app_no,
        course_id=application.course_id,
        applicant=application.applicant,
        purpose=application.purpose,
        status=ApplicationStatus.PENDING_SUBMIT
    )
    db.add(db_application)
    db.flush()

    for item in application.items:
        db_item = models.ApplicationItem(
            application_id=db_application.id,
            consumable_id=item.consumable_id,
            batch_id=item.batch_id,
            requested_quantity=item.requested_quantity
        )
        db.add(db_item)

    db.commit()
    db.refresh(db_application)
    return get_application(db, db_application.id)


def update_application(db: Session, application_id: int, application: schemas.ApplicationUpdate):
    db_app = get_application(db, application_id)
    if not db_app:
        return None

    if db_app.status != ApplicationStatus.PENDING_SUBMIT:
        raise ValueError("只有待提交状态的申请可以修改")

    for key, value in application.model_dump(exclude_unset=True, exclude={"items"}).items():
        setattr(db_app, key, value)

    if application.items:
        consumable_ids = [item.consumable_id for item in application.items if item.consumable_id]
        if len(consumable_ids) != len(set(consumable_ids)):
            seen = set()
            duplicate_id = None
            for cid in consumable_ids:
                if cid in seen:
                    duplicate_id = cid
                    break
                seen.add(cid)
            if duplicate_id:
                consumable = get_consumable(db, duplicate_id)
                raise ValueError(
                    f"同一张申领单内不能重复添加耗材 '{consumable.name if consumable else duplicate_id}'"
                )

        for existing_item in db_app.items:
            db.delete(existing_item)

        for item in application.items:
            if item.consumable_id and check_duplicate_application(db, db_app.course_id, item.consumable_id, application_id):
                consumable = get_consumable(db, item.consumable_id)
                raise ValueError(f"耗材 '{consumable.name if consumable else item.consumable_id}' 已有有效申请")

            db_item = models.ApplicationItem(
                application_id=db_app.id,
                consumable_id=item.consumable_id,
                batch_id=item.batch_id,
                requested_quantity=item.requested_quantity
            )
            db.add(db_item)

    db.commit()
    db.refresh(db_app)
    return get_application(db, db_app.id)


def submit_application(db: Session, application_id: int):
    db_app = get_application(db, application_id)
    if not db_app:
        return None
    if db_app.status != ApplicationStatus.PENDING_SUBMIT:
        raise ValueError("只有待提交状态的申请可以提交审核")
    if not db_app.items:
        raise ValueError("申请没有明细项，无法提交")

    db_app.status = ApplicationStatus.PENDING_REVIEW
    db.commit()
    db.refresh(db_app)
    return db_app


def review_application(db: Session, application_id: int, review: schemas.ApplicationReview):
    db_app = get_application(db, application_id)
    if not db_app:
        return None
    if db_app.status != ApplicationStatus.PENDING_REVIEW:
        raise ValueError("只有待审核状态的申请可以审核")

    if review.approved:
        db_app.status = ApplicationStatus.APPROVED
        for item in db_app.items:
            item.approved_quantity = item.approved_quantity or item.requested_quantity
    else:
        db_app.status = ApplicationStatus.PENDING_SUBMIT

    db_app.review_comment = review.review_comment
    db_app.reviewer = review.reviewer
    db_app.reviewed_at = datetime.now()

    db.commit()
    db.refresh(db_app)
    return db_app


def prepare_application(db: Session, application_id: int, prepare_data: schemas.ApplicationPrepare):
    db_app = get_application(db, application_id)
    if not db_app:
        return None
    if db_app.status != ApplicationStatus.APPROVED:
        raise ValueError("只有已通过状态的申请可以备货")

    for item_update in prepare_data.items:
        for db_item in db_app.items:
            if db_item.consumable_id == item_update.consumable_id:
                if item_update.batch_id:
                    batch = get_batch(db, item_update.batch_id)
                    if not batch:
                        raise ValueError(f"批次不存在")
                    if batch.quantity < (item_update.approved_quantity or db_item.approved_quantity):
                        raise ValueError(f"批次 {batch.batch_no} 库存不足")

                db_item.batch_id = item_update.batch_id
                if item_update.approved_quantity is not None:
                    db_item.approved_quantity = item_update.approved_quantity
                break

    db_app.status = ApplicationStatus.PREPARING
    db_app.prepared_by = prepare_data.prepared_by
    db_app.prepared_at = datetime.now()

    db.commit()
    db.refresh(db_app)
    return db_app


def distribute_application(db: Session, application_id: int, distribute_data: schemas.ApplicationDistribute):
    db_app = get_application(db, application_id)
    if not db_app:
        return None
    if db_app.status != ApplicationStatus.PREPARING:
        raise ValueError("只有备货中状态的申请可以发放")

    for item in db_app.items:
        if item.batch_id and item.approved_quantity:
            batch = get_batch(db, item.batch_id)
            if batch:
                if batch.quantity < item.approved_quantity:
                    raise ValueError(f"批次 {batch.batch_no} 库存不足")
                batch.quantity -= item.approved_quantity
                item.actual_quantity = item.approved_quantity

    db_app.status = ApplicationStatus.DISTRIBUTED
    db_app.distributed_by = distribute_data.distributed_by
    db_app.distributed_at = datetime.now()

    db.commit()
    db.refresh(db_app)
    return db_app


def check_application(db: Session, application_id: int, check_data: schemas.ApplicationCheck):
    db_app = get_application(db, application_id)
    if not db_app:
        return None
    if db_app.status != ApplicationStatus.DISTRIBUTED:
        raise ValueError("只有已发放状态的申请可以核对")

    for item_update in check_data.items:
        for db_item in db_app.items:
            if db_item.id == item_update.id or db_item.consumable_id == item_update.consumable_id:
                if item_update.actual_quantity is not None:
                    db_item.actual_quantity = item_update.actual_quantity
                if item_update.remaining_quantity is not None:
                    db_item.remaining_quantity = item_update.remaining_quantity
                db_item.check_remark = item_update.check_remark
                db_item.has_exception = item_update.has_exception or False
                db_item.exception_remark = item_update.exception_remark
                break

    db_app.status = ApplicationStatus.PENDING_FEEDBACK
    db.commit()
    db.refresh(db_app)
    return db_app


def close_application(db: Session, application_id: int, close_data: schemas.ApplicationClose):
    db_app = get_application(db, application_id)
    if not db_app:
        return None
    if db_app.status not in [ApplicationStatus.PENDING_FEEDBACK, ApplicationStatus.DISTRIBUTED]:
        raise ValueError("只有待反馈或已发放状态的申请可以关闭")

    feedback_ids = {f.application_item_id for f in db_app.feedbacks}
    pending_items = [item for item in db_app.items if item.id not in feedback_ids]
    if pending_items:
        raise ValueError("还有未反馈的明细项，请先完成所有反馈")

    db_app.status = ApplicationStatus.CLOSED
    db_app.closed_by = close_data.closed_by
    db_app.closed_at = datetime.now()

    db.commit()
    db.refresh(db_app)

    update_template_usage_history_from_feedback(db, db_app.id)

    return get_application(db, db_app.id)


def delete_application(db: Session, application_id: int):
    db_app = get_application(db, application_id)
    if db_app and db_app.status == ApplicationStatus.PENDING_SUBMIT:
        db.delete(db_app)
        db.commit()
        return True
    return False


def get_feedback(db: Session, feedback_id: int):
    return db.query(models.Feedback).filter(models.Feedback.id == feedback_id).first()


def get_feedbacks(db: Session, skip: int = 0, limit: int = 100, application_id: Optional[int] = None):
    query = db.query(models.Feedback).options(
        joinedload(models.Feedback.application),
        joinedload(models.Feedback.application_item)
    )
    if application_id:
        query = query.filter(models.Feedback.application_id == application_id)
    return query.order_by(models.Feedback.created_at.desc()).offset(skip).limit(limit).all()


def create_feedback(db: Session, feedback: schemas.FeedbackCreate):
    app = get_application(db, feedback.application_id)
    if not app:
        raise ValueError("申请不存在")
    if app.status not in [ApplicationStatus.DISTRIBUTED, ApplicationStatus.PENDING_FEEDBACK]:
        raise ValueError("只有已发放或待反馈状态的申请可以提交反馈")

    item = next((i for i in app.items if i.id == feedback.application_item_id), None)
    if not item:
        raise ValueError("申请明细不存在")

    if abs(feedback.usage_quantity + feedback.remaining_quantity - (item.actual_quantity or 0)) > 0.001:
        raise ValueError("使用量与剩余量之和必须等于实际发放量")

    existing = db.query(models.Feedback).filter(
        models.Feedback.application_item_id == feedback.application_item_id
    ).first()
    if existing:
        raise ValueError("该明细项已提交过反馈")

    if feedback.remaining_quantity > 0 and item.batch_id:
        batch = get_batch(db, item.batch_id)
        if batch:
            batch.quantity += feedback.remaining_quantity

    db_feedback = models.Feedback(**feedback.model_dump())
    db.add(db_feedback)
    db.commit()
    db.refresh(db_feedback)
    return db_feedback


def update_feedback(db: Session, feedback_id: int, feedback: schemas.FeedbackUpdate):
    db_feedback = get_feedback(db, feedback_id)
    if db_feedback:
        for key, value in feedback.model_dump(exclude_unset=True).items():
            setattr(db_feedback, key, value)
        db.commit()
        db.refresh(db_feedback)
    return db_feedback


def delete_feedback(db: Session, feedback_id: int):
    db_feedback = get_feedback(db, feedback_id)
    if db_feedback:
        db.delete(db_feedback)
        db.commit()
    return db_feedback


def get_missing_feedbacks(db: Session) -> List[schemas.MissingFeedbackItem]:
    apps = db.query(models.Application).options(
        joinedload(models.Application.course),
        joinedload(models.Application.items),
        joinedload(models.Application.feedbacks)
    ).filter(
        models.Application.status.in_([ApplicationStatus.DISTRIBUTED, ApplicationStatus.PENDING_FEEDBACK])
    ).all()

    results = []
    for app in apps:
        feedback_ids = {f.application_item_id for f in app.feedbacks}
        pending_items = [item for item in app.items if item.id not in feedback_ids]
        if pending_items:
            results.append(schemas.MissingFeedbackItem(
                application_id=app.id,
                application_no=app.application_no,
                course_name=app.course.course_name if app.course else "",
                applicant=app.applicant,
                distributed_at=app.distributed_at,
                pending_items=len(pending_items)
            ))
    return results


def get_application_flow_stats(db: Session) -> dict:
    statuses = [
        ApplicationStatus.PENDING_SUBMIT,
        ApplicationStatus.PENDING_REVIEW,
        ApplicationStatus.APPROVED,
        ApplicationStatus.PREPARING,
        ApplicationStatus.DISTRIBUTED,
        ApplicationStatus.PENDING_FEEDBACK,
        ApplicationStatus.CLOSED
    ]
    flow = {}
    for status in statuses:
        count = db.query(models.Application).filter(models.Application.status == status).count()
        flow[status] = count
    return flow


def get_feedback_completion_rate(db: Session) -> float:
    total_apps = db.query(models.Application).filter(
        models.Application.status.in_([
            ApplicationStatus.DISTRIBUTED,
            ApplicationStatus.PENDING_FEEDBACK,
            ApplicationStatus.CLOSED
        ])
    ).count()

    if total_apps == 0:
        return 100.0

    closed_apps = db.query(models.Application).filter(
        models.Application.status == ApplicationStatus.CLOSED
    ).count()

    return round((closed_apps / total_apps) * 100, 2)


def get_abnormal_consumptions(db: Session, threshold: float = 0.2) -> List[schemas.AbnormalConsumptionItem]:
    items = db.query(models.ApplicationItem).options(
        joinedload(models.ApplicationItem.application),
        joinedload(models.ApplicationItem.consumable)
    ).join(models.Application).join(models.Feedback).filter(
        models.ApplicationItem.actual_quantity > 0
    ).all()

    results = []
    for item in items:
        if not item.application or not item.consumable:
            continue
        feedback = db.query(models.Feedback).filter(
            models.Feedback.application_item_id == item.id
        ).first()
        if not feedback:
            continue

        actual = item.actual_quantity or 0
        usage = feedback.usage_quantity
        requested = item.requested_quantity or 0

        if actual > 0:
            quantity_deviation = abs(usage - actual) / actual
        else:
            quantity_deviation = 0

        if requested > 0:
            deviation_rate = abs(usage - requested) / requested
        else:
            deviation_rate = 0

        auto_abnormal = quantity_deviation >= threshold or deviation_rate >= threshold

        if auto_abnormal or item.has_exception:
            results.append(schemas.AbnormalConsumptionItem(
                application_id=item.application.id,
                application_no=item.application.application_no,
                course_name=item.application.course.course_name if item.application.course else "",
                consumable_name=item.consumable.name,
                requested_quantity=requested,
                actual_quantity=actual,
                usage_quantity=usage,
                deviation_rate=round(max(quantity_deviation, deviation_rate) * 100, 2),
                has_exception=item.has_exception or auto_abnormal
            ))
    return results


def get_dashboard_stats(db: Session) -> schemas.DashboardStats:
    low_inventory = get_low_inventory_items(db)
    expiring = get_expiring_batches(db)
    missing_feedback = get_missing_feedbacks(db)
    abnormal = get_abnormal_consumptions(db)

    return schemas.DashboardStats(
        low_inventory_count=len(low_inventory),
        expiring_batches_count=len(expiring),
        missing_feedback_count=len(missing_feedback),
        feedback_completion_rate=get_feedback_completion_rate(db),
        application_flow=get_application_flow_stats(db),
        abnormal_consumption_count=len(abnormal)
    )


def get_inventory_list(db: Session) -> List[schemas.InventoryItem]:
    consumables = get_consumables(db)
    results = []
    for c in consumables:
        total_qty = get_consumable_total_quantity(db, c.id)
        threshold = get_threshold_by_consumable(db, c.id)
        batches = get_batches(db, consumable_id=c.id)

        status = None
        min_th = 0
        warn_th = 0
        if threshold:
            min_th = threshold.min_threshold
            warn_th = threshold.warning_threshold
            if total_qty <= min_th:
                status = "严重不足"
            elif total_qty <= warn_th:
                status = "库存预警"

        results.append(schemas.InventoryItem(
            consumable_id=c.id,
            consumable_name=c.name,
            specification=c.specification,
            unit=c.unit,
            category=c.category,
            total_quantity=total_qty,
            min_threshold=min_th,
            warning_threshold=warn_th,
            threshold_status=status,
            batches=batches
        ))
    return results


def get_template(db: Session, template_id: int):
    return db.query(models.ConsumableTemplate).options(
        joinedload(models.ConsumableTemplate.items).joinedload(models.TemplateItem.consumable)
    ).filter(models.ConsumableTemplate.id == template_id).first()


def get_templates(db: Session, skip: int = 0, limit: int = 100, name: Optional[str] = None, is_active: Optional[bool] = None):
    query = db.query(models.ConsumableTemplate).options(
        joinedload(models.ConsumableTemplate.items).joinedload(models.TemplateItem.consumable)
    )
    if name:
        query = query.filter(models.ConsumableTemplate.name.like(f"%{name}%"))
    if is_active is not None:
        query = query.filter(models.ConsumableTemplate.is_active == is_active)
    return query.order_by(models.ConsumableTemplate.created_at.desc()).offset(skip).limit(limit).all()


def create_template(db: Session, template: schemas.ConsumableTemplateCreate):
    consumable_ids = [item.consumable_id for item in template.items]
    if len(consumable_ids) != len(set(consumable_ids)):
        raise ValueError("模板中不能包含重复的耗材")

    db_template = models.ConsumableTemplate(
        name=template.name,
        description=template.description,
        applicable_courses=template.applicable_courses,
        created_by=template.created_by,
        is_active=template.is_active
    )
    db.add(db_template)
    db.flush()

    for item in template.items:
        db_item = models.TemplateItem(
            template_id=db_template.id,
            consumable_id=item.consumable_id,
            quantity_per_student=item.quantity_per_student,
            remark=item.remark
        )
        db.add(db_item)

    db.commit()
    db.refresh(db_template)
    return get_template(db, db_template.id)


def update_template(db: Session, template_id: int, template: schemas.ConsumableTemplateUpdate):
    db_template = get_template(db, template_id)
    if not db_template:
        return None

    for key, value in template.model_dump(exclude_unset=True, exclude={"items"}).items():
        setattr(db_template, key, value)

    if template.items is not None:
        consumable_ids = [item.consumable_id for item in template.items]
        if len(consumable_ids) != len(set(consumable_ids)):
            raise ValueError("模板中不能包含重复的耗材")

        for existing_item in db_template.items:
            db.delete(existing_item)

        for item in template.items:
            db_item = models.TemplateItem(
                template_id=db_template.id,
                consumable_id=item.consumable_id,
                quantity_per_student=item.quantity_per_student,
                remark=item.remark
            )
            db.add(db_item)

    db.commit()
    db.refresh(db_template)
    return get_template(db, db_template.id)


def delete_template(db: Session, template_id: int):
    db_template = get_template(db, template_id)
    if db_template:
        db.delete(db_template)
        db.commit()
    return db_template


def get_template_historical_reference(db: Session, template_id: int, consumable_id: int) -> Optional[schemas.TemplateHistoricalReference]:
    histories = db.query(models.TemplateUsageHistory).filter(
        and_(
            models.TemplateUsageHistory.template_id == template_id,
            models.TemplateUsageHistory.consumable_id == consumable_id,
            models.TemplateUsageHistory.usage_quantity.isnot(None)
        )
    ).order_by(models.TemplateUsageHistory.used_at.desc()).all()

    if not histories:
        return None

    consumable = get_consumable(db, consumable_id)
    total_usage = sum(h.usage_quantity or 0 for h in histories)
    total_students = sum(h.student_count for h in histories)
    avg_qty_per_student = total_usage / total_students if total_students > 0 else 0
    deviations = [h.deviation_rate for h in histories if h.deviation_rate is not None]
    avg_deviation = sum(deviations) / len(deviations) if deviations else None

    return schemas.TemplateHistoricalReference(
        consumable_id=consumable_id,
        consumable_name=consumable.name if consumable else "",
        usage_count=len(histories),
        avg_quantity_per_student=round(avg_qty_per_student, 4),
        avg_deviation_rate=round(avg_deviation, 4) if avg_deviation is not None else None,
        last_used_at=histories[0].used_at
    )


def get_consumable_expiring_batches(db: Session, consumable_id: int) -> List[schemas.BatchWithInventory]:
    today = date.today()
    expiry_cutoff = today + timedelta(days=30)
    batches = db.query(models.Batch).filter(
        and_(
            models.Batch.consumable_id == consumable_id,
            models.Batch.expiry_date <= expiry_cutoff,
            models.Batch.expiry_date >= today,
            models.Batch.quantity > 0
        )
    ).order_by(models.Batch.expiry_date.asc()).all()

    results = []
    for batch in batches:
        days_to_expiry = (batch.expiry_date - today).days if batch.expiry_date else 0
        expiry_status = "临期" if days_to_expiry <= 7 else "即将到期"
        results.append(schemas.BatchWithInventory(
            id=batch.id,
            batch_no=batch.batch_no,
            consumable_id=batch.consumable_id,
            production_date=batch.production_date,
            expiry_date=batch.expiry_date,
            quantity=batch.quantity,
            unit_price=batch.unit_price,
            supplier=batch.supplier,
            remark=batch.remark,
            is_expiring_soon=batch.is_expiring_soon,
            created_at=batch.created_at,
            updated_at=batch.updated_at,
            remaining_quantity=batch.quantity,
            days_to_expiry=days_to_expiry,
            expiry_status=expiry_status
        ))
    return results


def generate_application_from_template(
    db: Session,
    course_id: int,
    template_id: int,
    student_count: int,
    exclude_application_id: Optional[int] = None
) -> schemas.GenerateApplicationResponse:
    course = get_course(db, course_id)
    if not course:
        raise ValueError("课程不存在")

    template = get_template(db, template_id)
    if not template:
        raise ValueError("模板不存在")

    if not template.is_active:
        raise ValueError("该模板已停用")

    if not template.items:
        raise ValueError("模板没有耗材明细")

    if student_count <= 0:
        raise ValueError("学生人数必须大于0")

    generated_items: List[schemas.GeneratedApplicationItem] = []
    total_suggested = 0.0
    total_available = 0.0
    has_duplicates = False
    has_gaps = False
    has_expiring = False
    gap_items_count = 0
    expiring_items_count = 0

    for item in template.items:
        consumable = get_consumable(db, item.consumable_id)
        if not consumable:
            continue

        suggested_qty = round(item.quantity_per_student * student_count, 2)
        total_qty = get_consumable_total_quantity(db, item.consumable_id)
        available_qty = get_consumable_available_quantity(db, item.consumable_id)
        threshold = get_threshold_by_consumable(db, item.consumable_id)
        expiring_batches = get_consumable_expiring_batches(db, item.consumable_id)

        is_duplicate = check_duplicate_application(db, course_id, item.consumable_id, exclude_application_id)
        duplicate_warning = None
        if is_duplicate:
            has_duplicates = True
            duplicate_warning = f"该课次下此耗材已有有效申请"

        threshold_status = None
        if threshold:
            if available_qty <= threshold.min_threshold:
                threshold_status = "严重不足"
            elif available_qty <= threshold.warning_threshold:
                threshold_status = "库存预警"

        gap_qty = max(0, suggested_qty - available_qty)
        if gap_qty > 0:
            has_gaps = True
            gap_items_count += 1

        if expiring_batches:
            has_expiring = True
            expiring_items_count += 1

        historical_ref = get_template_historical_reference(db, template_id, item.consumable_id)
        historical_avg_deviation = historical_ref.avg_deviation_rate if historical_ref else None

        generated_item = schemas.GeneratedApplicationItem(
            consumable_id=consumable.id,
            consumable_name=consumable.name,
            specification=consumable.specification,
            unit=consumable.unit,
            quantity_per_student=item.quantity_per_student,
            student_count=student_count,
            suggested_quantity=suggested_qty,
            total_quantity=total_qty,
            available_quantity=min(suggested_qty, available_qty),
            threshold_status=threshold_status,
            expiring_batches=expiring_batches,
            is_duplicate=is_duplicate,
            duplicate_warning=duplicate_warning,
            gap_quantity=gap_qty,
            historical_avg_deviation=historical_avg_deviation,
            remark=item.remark
        )

        generated_items.append(generated_item)
        total_suggested += suggested_qty
        total_available += min(suggested_qty, available_qty)

    total_available_rate = round((total_available / total_suggested) * 100, 2) if total_suggested > 0 else 100.0

    return schemas.GenerateApplicationResponse(
        course_id=course_id,
        course_name=course.course_name,
        template_id=template_id,
        template_name=template.name,
        student_count=student_count,
        total_suggested_amount=total_suggested,
        total_available_rate=total_available_rate,
        items=generated_items,
        has_duplicates=has_duplicates,
        has_gaps=has_gaps,
        has_expiring=has_expiring,
        gap_items_count=gap_items_count,
        expiring_items_count=expiring_items_count
    )


def submit_generated_application(
    db: Session,
    request: schemas.SubmitGeneratedApplicationRequest
) -> models.Application:
    application_data = schemas.ApplicationCreate(
        course_id=request.course_id,
        applicant=request.applicant,
        purpose=request.purpose,
        items=request.items
    )

    db_application = create_application(db, application_data)

    for item in request.items:
        usage_history = models.TemplateUsageHistory(
            template_id=request.template_id,
            course_id=request.course_id,
            application_id=db_application.id,
            consumable_id=item.consumable_id,
            student_count=request.student_count,
            requested_quantity=item.requested_quantity,
            used_at=date.today()
        )
        db.add(usage_history)

    db.commit()
    db.refresh(db_application)
    return get_application(db, db_application.id)


def update_template_usage_history_from_feedback(db: Session, application_id: int):
    app = get_application(db, application_id)
    if not app or app.status not in [ApplicationStatus.CLOSED]:
        return

    histories = db.query(models.TemplateUsageHistory).filter(
        models.TemplateUsageHistory.application_id == application_id
    ).all()

    for history in histories:
        item = next((i for i in app.items if i.consumable_id == history.consumable_id), None)
        if not item:
            continue

        feedback = db.query(models.Feedback).filter(
            models.Feedback.application_item_id == item.id
        ).first()

        if feedback:
            history.actual_quantity = item.actual_quantity
            history.usage_quantity = feedback.usage_quantity

            requested = history.requested_quantity
            if requested > 0 and feedback.usage_quantity is not None:
                history.deviation_rate = round(abs(feedback.usage_quantity - requested) / requested, 4)

    db.commit()


def get_template_with_stats(db: Session, template_id: int) -> Optional[schemas.ConsumableTemplateWithStats]:
    template = get_template(db, template_id)
    if not template:
        return None

    histories = db.query(models.TemplateUsageHistory).filter(
        models.TemplateUsageHistory.template_id == template_id
    ).all()

    usage_count = len(set(h.application_id for h in histories))
    last_used = max((h.used_at for h in histories), default=None) if histories else None

    deviations = [h.deviation_rate for h in histories if h.deviation_rate is not None]
    avg_deviation = sum(deviations) / len(deviations) if deviations else None

    return schemas.ConsumableTemplateWithStats(
        id=template.id,
        name=template.name,
        description=template.description,
        applicable_courses=template.applicable_courses,
        created_by=template.created_by,
        is_active=template.is_active,
        items=template.items,
        created_at=template.created_at,
        updated_at=template.updated_at,
        usage_count=usage_count,
        total_consumables=len(template.items),
        last_used_at=last_used,
        avg_deviation_rate=round(avg_deviation, 4) if avg_deviation is not None else None
    )


def get_templates_with_stats(db: Session, skip: int = 0, limit: int = 100, name: Optional[str] = None, is_active: Optional[bool] = None) -> List[schemas.ConsumableTemplateWithStats]:
    templates = get_templates(db, skip=skip, limit=limit, name=name, is_active=is_active)
    results = []
    for template in templates:
        stats = get_template_with_stats(db, template.id)
        if stats:
            results.append(stats)
    return results


def get_template_usage_histories(db: Session, template_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.TemplateUsageHistory).options(
        joinedload(models.TemplateUsageHistory.course),
        joinedload(models.TemplateUsageHistory.application),
        joinedload(models.TemplateUsageHistory.consumable)
    ).filter(
        models.TemplateUsageHistory.template_id == template_id
    ).order_by(
        models.TemplateUsageHistory.used_at.desc()
    ).offset(skip).limit(limit).all()

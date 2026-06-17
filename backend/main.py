from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
import models
import schemas
import crud
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="高校实验中心耗材管理系统", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "高校实验中心耗材管理系统 API"}


@app.get("/api/dashboard/stats", response_model=schemas.DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    return crud.get_dashboard_stats(db)


@app.get("/api/dashboard/low-inventory", response_model=List[schemas.LowInventoryItem])
def get_low_inventory(db: Session = Depends(get_db)):
    return crud.get_low_inventory_items(db)


@app.get("/api/dashboard/expiring-batches", response_model=List[schemas.ExpiringBatchItem])
def get_expiring_batches(days: int = 30, db: Session = Depends(get_db)):
    return crud.get_expiring_batches(db, days=days)


@app.get("/api/dashboard/missing-feedbacks", response_model=List[schemas.MissingFeedbackItem])
def get_missing_feedbacks(db: Session = Depends(get_db)):
    return crud.get_missing_feedbacks(db)


@app.get("/api/dashboard/abnormal-consumptions", response_model=List[schemas.AbnormalConsumptionItem])
def get_abnormal_consumptions(threshold: float = 0.2, db: Session = Depends(get_db)):
    return crud.get_abnormal_consumptions(db, threshold=threshold)


@app.get("/api/inventory", response_model=List[schemas.InventoryItem])
def get_inventory_list(db: Session = Depends(get_db)):
    return crud.get_inventory_list(db)


@app.get("/api/consumables", response_model=List[schemas.Consumable])
def list_consumables(
    skip: int = 0,
    limit: int = 100,
    name: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return crud.get_consumables(db, skip=skip, limit=limit, name=name, category=category)


@app.get("/api/consumables/with-inventory", response_model=List[schemas.ConsumableWithInventory])
def list_consumables_with_inventory(db: Session = Depends(get_db)):
    return crud.get_all_consumables_with_inventory(db)


@app.get("/api/consumables/{consumable_id}", response_model=schemas.Consumable)
def get_consumable(consumable_id: int, db: Session = Depends(get_db)):
    db_consumable = crud.get_consumable(db, consumable_id=consumable_id)
    if db_consumable is None:
        raise HTTPException(status_code=404, detail="耗材不存在")
    return db_consumable


@app.post("/api/consumables", response_model=schemas.Consumable)
def create_consumable(consumable: schemas.ConsumableCreate, db: Session = Depends(get_db)):
    return crud.create_consumable(db=db, consumable=consumable)


@app.put("/api/consumables/{consumable_id}", response_model=schemas.Consumable)
def update_consumable(consumable_id: int, consumable: schemas.ConsumableUpdate, db: Session = Depends(get_db)):
    db_consumable = crud.update_consumable(db, consumable_id=consumable_id, consumable=consumable)
    if db_consumable is None:
        raise HTTPException(status_code=404, detail="耗材不存在")
    return db_consumable


@app.delete("/api/consumables/{consumable_id}")
def delete_consumable(consumable_id: int, db: Session = Depends(get_db)):
    db_consumable = crud.delete_consumable(db, consumable_id=consumable_id)
    if db_consumable is None:
        raise HTTPException(status_code=404, detail="耗材不存在")
    return {"message": "删除成功"}


@app.get("/api/batches", response_model=List[schemas.BatchWithConsumable])
def list_batches(
    skip: int = 0,
    limit: int = 100,
    batch_no: Optional[str] = None,
    consumable_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    return crud.get_batches(db, skip=skip, limit=limit, batch_no=batch_no, consumable_id=consumable_id)


@app.get("/api/batches/{batch_id}", response_model=schemas.BatchWithConsumable)
def get_batch(batch_id: int, db: Session = Depends(get_db)):
    db_batch = crud.get_batch(db, batch_id=batch_id)
    if db_batch is None:
        raise HTTPException(status_code=404, detail="批次不存在")
    return db_batch


@app.post("/api/batches", response_model=schemas.Batch)
def create_batch(batch: schemas.BatchCreate, db: Session = Depends(get_db)):
    return crud.create_batch(db=db, batch=batch)


@app.put("/api/batches/{batch_id}", response_model=schemas.Batch)
def update_batch(batch_id: int, batch: schemas.BatchUpdate, db: Session = Depends(get_db)):
    db_batch = crud.update_batch(db, batch_id=batch_id, batch=batch)
    if db_batch is None:
        raise HTTPException(status_code=404, detail="批次不存在")
    return db_batch


@app.delete("/api/batches/{batch_id}")
def delete_batch(batch_id: int, db: Session = Depends(get_db)):
    db_batch = crud.delete_batch(db, batch_id=batch_id)
    if db_batch is None:
        raise HTTPException(status_code=404, detail="批次不存在")
    return {"message": "删除成功"}


@app.get("/api/courses", response_model=List[schemas.Course])
def list_courses(
    skip: int = 0,
    limit: int = 100,
    course_name: Optional[str] = None,
    teacher: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return crud.get_courses(db, skip=skip, limit=limit, course_name=course_name, teacher=teacher)


@app.get("/api/courses/{course_id}", response_model=schemas.Course)
def get_course(course_id: int, db: Session = Depends(get_db)):
    db_course = crud.get_course(db, course_id=course_id)
    if db_course is None:
        raise HTTPException(status_code=404, detail="课程不存在")
    return db_course


@app.post("/api/courses", response_model=schemas.Course)
def create_course(course: schemas.CourseCreate, db: Session = Depends(get_db)):
    return crud.create_course(db=db, course=course)


@app.put("/api/courses/{course_id}", response_model=schemas.Course)
def update_course(course_id: int, course: schemas.CourseUpdate, db: Session = Depends(get_db)):
    db_course = crud.update_course(db, course_id=course_id, course=course)
    if db_course is None:
        raise HTTPException(status_code=404, detail="课程不存在")
    return db_course


@app.delete("/api/courses/{course_id}")
def delete_course(course_id: int, db: Session = Depends(get_db)):
    db_course = crud.delete_course(db, course_id=course_id)
    if db_course is None:
        raise HTTPException(status_code=404, detail="课程不存在")
    return {"message": "删除成功"}


@app.get("/api/thresholds", response_model=List[schemas.InventoryThresholdWithConsumable])
def list_thresholds(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_thresholds(db, skip=skip, limit=limit)


@app.post("/api/thresholds", response_model=schemas.InventoryThreshold)
def create_threshold(threshold: schemas.InventoryThresholdCreate, db: Session = Depends(get_db)):
    return crud.create_threshold(db=db, threshold=threshold)


@app.put("/api/thresholds/{threshold_id}", response_model=schemas.InventoryThreshold)
def update_threshold(threshold_id: int, threshold: schemas.InventoryThresholdUpdate, db: Session = Depends(get_db)):
    db_threshold = crud.update_threshold(db, threshold_id=threshold_id, threshold=threshold)
    if db_threshold is None:
        raise HTTPException(status_code=404, detail="阈值不存在")
    return db_threshold


@app.get("/api/applications", response_model=List[schemas.Application])
def list_applications(
    skip: int = 0,
    limit: int = 100,
    course_id: Optional[int] = None,
    consumable_id: Optional[int] = None,
    batch_id: Optional[int] = None,
    applicant: Optional[str] = None,
    status: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    filters = schemas.ApplicationFilter(
        course_id=course_id,
        consumable_id=consumable_id,
        batch_id=batch_id,
        applicant=applicant,
        status=status,
        start_date=start_date,
        end_date=end_date
    )
    return crud.get_applications(db, skip=skip, limit=limit, filters=filters)


@app.get("/api/applications/{application_id}", response_model=schemas.Application)
def get_application(application_id: int, db: Session = Depends(get_db)):
    db_application = crud.get_application(db, application_id=application_id)
    if db_application is None:
        raise HTTPException(status_code=404, detail="申请不存在")
    return db_application


@app.post("/api/applications", response_model=schemas.Application)
def create_application(application: schemas.ApplicationCreate, db: Session = Depends(get_db)):
    try:
        return crud.create_application(db=db, application=application)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.put("/api/applications/{application_id}", response_model=schemas.Application)
def update_application(application_id: int, application: schemas.ApplicationUpdate, db: Session = Depends(get_db)):
    try:
        db_application = crud.update_application(db, application_id=application_id, application=application)
        if db_application is None:
            raise HTTPException(status_code=404, detail="申请不存在")
        return db_application
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.delete("/api/applications/{application_id}")
def delete_application(application_id: int, db: Session = Depends(get_db)):
    success = crud.delete_application(db, application_id=application_id)
    if not success:
        raise HTTPException(status_code=400, detail="只有待提交状态的申请可以删除")
    return {"message": "删除成功"}


@app.post("/api/applications/{application_id}/submit", response_model=schemas.Application)
def submit_application(application_id: int, db: Session = Depends(get_db)):
    try:
        db_application = crud.submit_application(db, application_id=application_id)
        if db_application is None:
            raise HTTPException(status_code=404, detail="申请不存在")
        return db_application
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/applications/{application_id}/review", response_model=schemas.Application)
def review_application(application_id: int, review: schemas.ApplicationReview, db: Session = Depends(get_db)):
    try:
        db_application = crud.review_application(db, application_id=application_id, review=review)
        if db_application is None:
            raise HTTPException(status_code=404, detail="申请不存在")
        return db_application
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/applications/{application_id}/prepare", response_model=schemas.Application)
def prepare_application(application_id: int, prepare_data: schemas.ApplicationPrepare, db: Session = Depends(get_db)):
    try:
        db_application = crud.prepare_application(db, application_id=application_id, prepare_data=prepare_data)
        if db_application is None:
            raise HTTPException(status_code=404, detail="申请不存在")
        return db_application
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/applications/{application_id}/distribute", response_model=schemas.Application)
def distribute_application(application_id: int, distribute_data: schemas.ApplicationDistribute, db: Session = Depends(get_db)):
    try:
        db_application = crud.distribute_application(db, application_id=application_id, distribute_data=distribute_data)
        if db_application is None:
            raise HTTPException(status_code=404, detail="申请不存在")
        return db_application
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/applications/{application_id}/check", response_model=schemas.Application)
def check_application(application_id: int, check_data: schemas.ApplicationCheck, db: Session = Depends(get_db)):
    try:
        db_application = crud.check_application(db, application_id=application_id, check_data=check_data)
        if db_application is None:
            raise HTTPException(status_code=404, detail="申请不存在")
        return db_application
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/applications/{application_id}/close", response_model=schemas.Application)
def close_application(application_id: int, close_data: schemas.ApplicationClose, db: Session = Depends(get_db)):
    try:
        db_application = crud.close_application(db, application_id=application_id, close_data=close_data)
        if db_application is None:
            raise HTTPException(status_code=404, detail="申请不存在")
        return db_application
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/feedbacks", response_model=List[schemas.Feedback])
def list_feedbacks(
    skip: int = 0,
    limit: int = 100,
    application_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    return crud.get_feedbacks(db, skip=skip, limit=limit, application_id=application_id)


@app.post("/api/feedbacks", response_model=schemas.Feedback)
def create_feedback(feedback: schemas.FeedbackCreate, db: Session = Depends(get_db)):
    try:
        return crud.create_feedback(db=db, feedback=feedback)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.put("/api/feedbacks/{feedback_id}", response_model=schemas.Feedback)
def update_feedback(feedback_id: int, feedback: schemas.FeedbackUpdate, db: Session = Depends(get_db)):
    db_feedback = crud.update_feedback(db, feedback_id=feedback_id, feedback=feedback)
    if db_feedback is None:
        raise HTTPException(status_code=404, detail="反馈不存在")
    return db_feedback


@app.delete("/api/feedbacks/{feedback_id}")
def delete_feedback(feedback_id: int, db: Session = Depends(get_db)):
    db_feedback = crud.delete_feedback(db, feedback_id=feedback_id)
    if db_feedback is None:
        raise HTTPException(status_code=404, detail="反馈不存在")
    return {"message": "删除成功"}


@app.get("/api/application-flow", response_model=dict)
def get_application_flow(db: Session = Depends(get_db)):
    return crud.get_application_flow_stats(db)


@app.get("/api/feedback-completion-rate", response_model=float)
def get_feedback_completion_rate(db: Session = Depends(get_db)):
    return crud.get_feedback_completion_rate(db)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8132)

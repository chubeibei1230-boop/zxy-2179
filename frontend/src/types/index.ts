export interface Consumable {
  id: number;
  name: string;
  specification: string | null;
  unit: string;
  category: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConsumableWithInventory extends Consumable {
  total_quantity: number;
  threshold_status: string | null;
}

export interface Batch {
  id: number;
  batch_no: string;
  consumable_id: number;
  production_date: string | null;
  expiry_date: string | null;
  quantity: number;
  unit_price: number | null;
  supplier: string | null;
  remark: string | null;
  is_expiring_soon: boolean;
  created_at: string;
  updated_at: string;
}

export interface BatchWithConsumable extends Batch {
  consumable: Consumable | null;
}

export interface Course {
  id: number;
  course_code: string;
  course_name: string;
  teacher: string;
  student_count: number;
  course_date: string;
  start_time: string | null;
  end_time: string | null;
  lab_room: string | null;
  remark: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryThreshold {
  id: number;
  consumable_id: number;
  min_threshold: number;
  warning_threshold: number;
  created_at: string;
  updated_at: string;
}

export interface ApplicationItem {
  id: number;
  application_id: number;
  consumable_id: number;
  batch_id: number | null;
  requested_quantity: number;
  approved_quantity: number | null;
  actual_quantity: number | null;
  remaining_quantity: number | null;
  check_remark: string | null;
  has_exception: boolean;
  exception_remark: string | null;
  consumable: Consumable | null;
  batch: Batch | null;
  created_at: string;
  updated_at: string;
}

export interface Feedback {
  id: number;
  application_id: number;
  application_item_id: number;
  usage_quantity: number;
  remaining_quantity: number;
  usage_situation: string | null;
  quality_issue: boolean;
  quality_issue_desc: string | null;
  submitted_by: string | null;
  application_item: ApplicationItem | null;
  created_at: string;
}

export interface Application {
  id: number;
  application_no: string;
  course_id: number;
  applicant: string;
  status: string;
  purpose: string | null;
  review_comment: string | null;
  reviewer: string | null;
  reviewed_at: string | null;
  prepared_by: string | null;
  prepared_at: string | null;
  distributed_by: string | null;
  distributed_at: string | null;
  closed_by: string | null;
  closed_at: string | null;
  items: ApplicationItem[];
  feedbacks: Feedback[];
  course: Course | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  low_inventory_count: number;
  expiring_batches_count: number;
  missing_feedback_count: number;
  feedback_completion_rate: number;
  application_flow: Record<string, number>;
  abnormal_consumption_count: number;
}

export interface LowInventoryItem {
  consumable_id: number;
  consumable_name: string;
  total_quantity: number;
  min_threshold: number;
  warning_threshold: number;
  status: string;
}

export interface ExpiringBatchItem {
  batch_id: number;
  batch_no: string;
  consumable_name: string;
  expiry_date: string;
  remaining_quantity: number;
  days_to_expiry: number;
}

export interface AbnormalConsumptionItem {
  application_id: number;
  application_no: string;
  course_name: string;
  consumable_name: string;
  requested_quantity: number;
  actual_quantity: number;
  usage_quantity: number;
  deviation_rate: number;
  has_exception: boolean;
}

export interface MissingFeedbackItem {
  application_id: number;
  application_no: string;
  course_name: string;
  applicant: string;
  distributed_at: string | null;
  pending_items: number;
}

export interface InventoryItem {
  consumable_id: number;
  consumable_name: string;
  specification: string | null;
  unit: string;
  category: string | null;
  total_quantity: number;
  min_threshold: number;
  warning_threshold: number;
  threshold_status: string | null;
  batches: BatchWithConsumable[];
}

export interface ApplicationFilter {
  course_id?: number;
  consumable_id?: number;
  batch_id?: number;
  applicant?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
}

export type PageType = 'dashboard' | 'consumables' | 'batches' | 'courses' | 'applications' | 'inventory';

export const ApplicationStatus = {
  PENDING_SUBMIT: '待提交',
  PENDING_REVIEW: '待审核',
  APPROVED: '已通过',
  PREPARING: '备货中',
  DISTRIBUTED: '已发放',
  PENDING_FEEDBACK: '待反馈',
  CLOSED: '已关闭'
} as const;

export const StatusColors: Record<string, string> = {
  '待提交': '#6c757d',
  '待审核': '#ffc107',
  '已通过': '#28a745',
  '备货中': '#17a2b8',
  '已发放': '#007bff',
  '待反馈': '#fd7e14',
  '已关闭': '#6c757d'
};

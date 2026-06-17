import { api } from '../api';
import {
  showToast, showModal, hideModal, createInput, createTextarea,
  getFormData, formatDate, formatDateTime
} from '../utils';
import type { Course, ConsumableTemplateWithStats, GenerateApplicationResponse, GeneratedApplicationItem } from '../types';

let courses: Course[] = [];
let templates: ConsumableTemplateWithStats[] = [];
let selectedCourse: Course | null = null;
let generatedApplication: GenerateApplicationResponse | null = null;
let adjustedItems: { consumable_id: number; requested_quantity: number }[] = [];
let currentApplicant: string = '';
let currentPurpose: string = '';

export async function renderCourses(container: HTMLElement) {
  container.innerHTML = `
    <div class="page-header">
      <h2>课次管理</h2>
      <button class="btn btn-primary" id="add-course-btn">+ 新增课次</button>
    </div>
    <div class="filter-bar">
      <div class="form-group">
        <label>课程名称</label>
        <input type="text" class="form-control" id="search-name" placeholder="输入课程名称">
      </div>
      <div class="form-group">
        <label>授课教师</label>
        <input type="text" class="form-control" id="search-teacher" placeholder="输入教师姓名">
      </div>
      <div class="form-group">
        <label>上课日期</label>
        <input type="date" class="form-control" id="filter-date">
      </div>
      <button class="btn btn-secondary" id="refresh-btn">刷新</button>
    </div>
    <div class="section">
      <div class="table-container">
        <table id="courses-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>课程代码</th>
              <th>课程名称</th>
              <th>授课教师</th>
              <th>学生人数</th>
              <th>上课日期</th>
              <th>时间段</th>
              <th>实验室</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody id="courses-tbody">
            <tr><td colspan="10" style="text-align: center; padding: 2rem;">加载中...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  await loadData();
  bindEvents();
}

async function loadData() {
  try {
    [courses, templates] = await Promise.all([
      api.courses.list(),
      api.templates.list({ is_active: true })
    ]);
    renderTable();
  } catch (error) {
    showToast(`加载失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
  }
}

function renderTable() {
  const tbody = document.getElementById('courses-tbody');
  if (!tbody) return;

  const searchName = (document.getElementById('search-name') as HTMLInputElement)?.value || '';
  const searchTeacher = (document.getElementById('search-teacher') as HTMLInputElement)?.value || '';
  const filterDate = (document.getElementById('filter-date') as HTMLInputElement)?.value || '';

  const filtered = courses.filter(c => {
    const matchName = c.course_name.toLowerCase().includes(searchName.toLowerCase());
    const matchTeacher = c.teacher.toLowerCase().includes(searchTeacher.toLowerCase());
    const matchDate = !filterDate || c.course_date === filterDate;
    return matchName && matchTeacher && matchDate;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" class="empty-state">暂无数据</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(c => `
    <tr>
      <td>${c.id}</td>
      <td>${c.course_code}</td>
      <td>${c.course_name}</td>
      <td>${c.teacher}</td>
      <td>${c.student_count || 0}</td>
      <td>${formatDate(c.course_date)}</td>
      <td>${c.start_time || '-'} - ${c.end_time || '-'}</td>
      <td>${c.lab_room || '-'}</td>
      <td>${formatDateTime(c.created_at)}</td>
      <td>
        <div class="btn-group">
          <button class="btn btn-sm btn-success" data-action="apply" data-id="${c.id}">一键申领</button>
          <button class="btn btn-sm btn-info" data-action="edit" data-id="${c.id}">编辑</button>
          <button class="btn btn-sm btn-danger" data-action="delete" data-id="${c.id}">删除</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function bindEvents() {
  document.getElementById('add-course-btn')?.addEventListener('click', () => showCourseModal());

  document.getElementById('search-name')?.addEventListener('input', renderTable);
  document.getElementById('search-teacher')?.addEventListener('input', renderTable);
  document.getElementById('filter-date')?.addEventListener('change', renderTable);
  document.getElementById('refresh-btn')?.addEventListener('click', loadData);

  document.getElementById('courses-tbody')?.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    const action = target.dataset.action;
    const id = parseInt(target.dataset.id || '0');

    if (action === 'apply') {
      const course = courses.find(c => c.id === id);
      if (course) showApplyWizard(course);
    } else if (action === 'edit') {
      const course = courses.find(c => c.id === id);
      if (course) showCourseModal(course);
    } else if (action === 'delete') {
      if (confirm('确定要删除这个课次吗？')) {
        try {
          await api.courses.delete(id);
          showToast('删除成功', 'success');
          loadData();
        } catch (error) {
          showToast(`删除失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
        }
      }
    }
  });

  document.querySelector('.close-btn')?.addEventListener('click', hideModal);
  document.getElementById('modal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal')) hideModal();
  });
}

function showCourseModal(course?: Course) {
  const isEdit = !!course;
  const form = document.createElement('form');

  form.innerHTML = `
    <h3 class="form-title">${isEdit ? '编辑' : '新增'}课次</h3>
    <div class="form-group">
      <label>课程代码<span class="required"> *</span></label>
      <input type="text" class="form-control" name="course_code" value="${course?.course_code || ''}" required>
    </div>
    <div class="form-group">
      <label>课程名称<span class="required"> *</span></label>
      <input type="text" class="form-control" name="course_name" value="${course?.course_name || ''}" required>
    </div>
    <div class="form-group">
      <label>授课教师<span class="required"> *</span></label>
      <input type="text" class="form-control" name="teacher" value="${course?.teacher || ''}" required>
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
      <div class="form-group">
        <label>学生人数</label>
        <input type="number" class="form-control" name="student_count" value="${course?.student_count || 0}" min="0">
      </div>
      <div class="form-group">
        <label>上课日期<span class="required"> *</span></label>
        <input type="date" class="form-control" name="course_date" value="${course?.course_date || ''}" required>
      </div>
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
      <div class="form-group">
        <label>开始时间</label>
        <input type="time" class="form-control" name="start_time" value="${course?.start_time || ''}">
      </div>
      <div class="form-group">
        <label>结束时间</label>
        <input type="time" class="form-control" name="end_time" value="${course?.end_time || ''}">
      </div>
    </div>
    <div class="form-group">
      <label>实验室</label>
      <input type="text" class="form-control" name="lab_room" value="${course?.lab_room || ''}">
    </div>
    <div class="form-group">
      <label>耗材模板</label>
      <select class="form-control" name="template_id">
        <option value="">不选择模板</option>
        ${templates.map(t => `
          <option value="${t.id}" ${course?.template_id === t.id ? 'selected' : ''}>${t.name} (${t.total_consumables}种耗材)</option>
        `).join('')}
      </select>
      <small class="form-text text-muted">选择模板后，可在课次列表点击"一键申领"快速生成耗材申领单</small>
    </div>
    ${createTextarea('备注', course?.remark || '').innerHTML}
    <div class="form-actions">
      <button type="button" class="btn btn-secondary" id="cancel-btn">取消</button>
      <button type="submit" class="btn btn-primary">${isEdit ? '保存' : '创建'}</button>
    </div>
  `;

  const textarea = form.querySelector('textarea');
  if (textarea) textarea.name = 'remark';

  form.querySelector('#cancel-btn')?.addEventListener('click', hideModal);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = getFormData(form);
    data.student_count = parseInt(data.student_count) || 0;
    if (data.template_id === '' || data.template_id === null || data.template_id === undefined) {
      data.template_id = null;
    } else {
      data.template_id = parseInt(data.template_id);
    }

    try {
      if (isEdit && course) {
        await api.courses.update(course.id, data);
        showToast('更新成功', 'success');
      } else {
        await api.courses.create(data);
        showToast('创建成功', 'success');
      }
      hideModal();
      loadData();
    } catch (error) {
      showToast(`操作失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
    }
  });

  showModal(form);
}

function showApplyWizard(course: Course) {
  selectedCourse = course;
  generatedApplication = null;
  adjustedItems = [];

  const wizardContent = document.createElement('div');
  wizardContent.style.minWidth = '900px';
  wizardContent.style.maxHeight = '85vh';
  wizardContent.style.overflowY = 'auto';

  renderWizardStep1(wizardContent);
  showModal(wizardContent);
}

function renderWizardStep1(container: HTMLElement) {
  container.innerHTML = `
    <h3 class="form-title">一键申领 - 选择模板 (${selectedCourse?.course_name})</h3>
    
    <div class="wizard-info">
      <div class="info-row">
        <span><strong>课次：</strong>${selectedCourse?.course_name} (${selectedCourse?.course_code})</span>
        <span><strong>授课教师：</strong>${selectedCourse?.teacher}</span>
        <span><strong>学生人数：</strong>${selectedCourse?.student_count || 0} 人</span>
        <span><strong>上课日期：</strong>${formatDate(selectedCourse?.course_date || '')}</span>
      </div>
    </div>

    <div class="form-group">
      <label>选择耗材模板<span class="required"> *</span></label>
      <select class="form-control" id="template-select" required>
        <option value="">请选择模板</option>
        ${templates.map(t => `
          <option value="${t.id}">${t.name} (${t.total_consumables}种耗材，已使用${t.usage_count || 0}次)</option>
        `).join('')}
      </select>
    </div>

    <div class="form-group">
      <label>申领人<span class="required"> *</span></label>
      <input type="text" class="form-control" id="applicant-input" value="${selectedCourse?.teacher || ''}" required placeholder="输入申领人姓名">
    </div>

    <div class="form-group">
      <label>申领用途</label>
      <textarea class="form-control" id="purpose-input" rows="2" placeholder="选填，默认为课程实验">${selectedCourse?.course_name} 实验耗材</textarea>
    </div>

    ${templates.length === 0 ? `
      <div class="alert alert-warning">
        <strong>提示：</strong>暂无可用模板，请先在<a href="#" onclick="navigateTo('templates')">模板管理</a>中创建模板。
      </div>
    ` : ''}

    <div class="form-actions">
      <button type="button" class="btn btn-secondary" id="cancel-wizard-btn">取消</button>
      <button type="button" class="btn btn-primary" id="next-step-btn" ${templates.length === 0 ? 'disabled' : ''}>下一步：生成申领</button>
    </div>
  `;

  container.querySelector('#cancel-wizard-btn')?.addEventListener('click', hideModal);
  container.querySelector('#next-step-btn')?.addEventListener('click', async () => {
    const templateId = parseInt((document.getElementById('template-select') as HTMLSelectElement).value);
    const applicant = (document.getElementById('applicant-input') as HTMLInputElement).value.trim();
    const purpose = (document.getElementById('purpose-input') as HTMLTextAreaElement).value.trim();

    if (!templateId) {
      showToast('请选择模板', 'error');
      return;
    }
    if (!applicant) {
      showToast('请输入申领人', 'error');
      return;
    }

    currentApplicant = applicant;
    currentPurpose = purpose;

    try {
      generatedApplication = await api.applications.generateFromTemplate({
        course_id: selectedCourse!.id,
        template_id: templateId,
        student_count: selectedCourse!.student_count || 0
      });
      adjustedItems = generatedApplication.items.map(item => ({
        consumable_id: item.consumable_id,
        requested_quantity: item.suggested_quantity
      }));
      renderWizardStep2(container);
    } catch (error) {
      showToast(`生成失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
    }
  });
}

function renderWizardStep2(container: HTMLElement) {
  if (!generatedApplication || !selectedCourse) return;

  const alertMessages: string[] = [];
  if (generatedApplication.has_duplicates) {
    alertMessages.push(`<span class="text-danger"><strong>警告：</strong>${generatedApplication.items.filter(i => i.is_duplicate).length} 种耗材已有有效申请，将无法重复申领</span>`);
  }
  if (generatedApplication.has_gaps) {
    alertMessages.push(`<span class="text-warning"><strong>注意：</strong>${generatedApplication.gap_items_count} 种耗材库存不足，存在缺口</span>`);
  }
  if (generatedApplication.has_expiring) {
    alertMessages.push(`<span class="text-info"><strong>提示：</strong>${generatedApplication.expiring_items_count} 种耗材有临期批次，建议优先使用</span>`);
  }

  container.innerHTML = `
    <h3 class="form-title">申领清单确认 - ${generatedApplication.template_name}</h3>
    
    <div class="wizard-summary">
      <div class="summary-row">
        <div class="summary-item">
          <div class="summary-label">课次</div>
          <div class="summary-value">${generatedApplication.course_name}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">学生人数</div>
          <div class="summary-value">${generatedApplication.student_count} 人</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">耗材种类</div>
          <div class="summary-value">${generatedApplication.items.length} 种</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">申领总量</div>
          <div class="summary-value">${generatedApplication.total_suggested_amount.toFixed(2)}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">库存满足率</div>
          <div class="summary-value ${generatedApplication.total_available_rate < 80 ? 'text-danger' : generatedApplication.total_available_rate < 100 ? 'text-warning' : 'text-success'}">
            ${generatedApplication.total_available_rate}%
          </div>
        </div>
      </div>
    </div>

    ${alertMessages.length > 0 ? `
      <div class="alert-container">
        ${alertMessages.map(msg => `<div class="alert-item">${msg}</div>`).join('')}
      </div>
    ` : ''}

    <div class="apply-table-container">
      <table class="apply-table">
        <thead>
          <tr>
            <th>耗材名称</th>
            <th>规格</th>
            <th>单位</th>
            <th>人均用量</th>
            <th>建议申领<br/>(人均×人数)</th>
            <th>当前库存</th>
            <th>可领数量</th>
            <th>库存状态</th>
            <th>临期批次</th>
            <th>历史偏差</th>
            <th>调整后数量</th>
          </tr>
        </thead>
        <tbody>
          ${generatedApplication.items.map((item, index) => renderApplyItemRow(item, index)).join('')}
        </tbody>
      </table>
    </div>

    <div class="form-actions">
      <button type="button" class="btn btn-secondary" id="prev-step-btn">上一步</button>
      <button type="button" class="btn btn-primary" id="submit-apply-btn">提交申领</button>
    </div>
  `;

  container.querySelector('#prev-step-btn')?.addEventListener('click', () => renderWizardStep1(container));
  
  container.querySelector('#submit-apply-btn')?.addEventListener('click', async () => {
    if (!generatedApplication || !selectedCourse) return;

    const validItems = adjustedItems.filter(item => {
      const genItem = generatedApplication!.items.find(i => i.consumable_id === item.consumable_id);
      return !genItem?.is_duplicate && item.requested_quantity > 0;
    });

    if (validItems.length === 0) {
      showToast('没有可提交的申领项（可能全部为重复申请或数量为0）', 'error');
      return;
    }

    if (!confirm(`确认提交 ${validItems.length} 种耗材的申领？`)) return;

    try {
      const templateId = generatedApplication.template_id;
      const applicant = currentApplicant || selectedCourse.teacher;
      const purpose = currentPurpose || `${selectedCourse.course_name} 实验耗材`;

      const result = await api.applications.submitGenerated({
        course_id: selectedCourse.id,
        template_id: templateId,
        student_count: selectedCourse.student_count || 0,
        applicant: applicant,
        purpose: purpose,
        items: validItems.map(item => ({
          consumable_id: item.consumable_id,
          requested_quantity: item.requested_quantity
        }))
      });

      showToast(`申领提交成功！申领单号：${result.application_no}`, 'success');
      hideModal();
    } catch (error) {
      showToast(`提交失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
    }
  });

  bindApplyItemEvents(container);
}

function renderApplyItemRow(item: GeneratedApplicationItem, index: number): string {
  const adjustedQty = adjustedItems.find(i => i.consumable_id === item.consumable_id)?.requested_quantity || item.suggested_quantity;
  
  let statusClass = '';
  let statusBadge = '';
  
  if (item.is_duplicate) {
    statusClass = 'row-duplicate';
    statusBadge = '<span class="badge badge-danger">重复申请</span>';
  } else if (item.threshold_status === '严重不足') {
    statusClass = 'row-danger';
    statusBadge = '<span class="badge badge-danger">严重不足</span>';
  } else if (item.threshold_status === '库存预警') {
    statusClass = 'row-warning';
    statusBadge = '<span class="badge badge-warning">库存预警</span>';
  }

  const expiringInfo = item.expiring_batches.length > 0 
    ? `<div class="expiring-info">
        ${item.expiring_batches.map(b => `
          <span class="expiring-badge" title="剩余${b.remaining_quantity}，${b.days_to_expiry}天后过期">
            ${b.batch_no} (${b.remaining_quantity}${item.unit})
          </span>
        `).join('')}
      </div>`
    : '<span class="text-muted">-</span>';

  const deviationInfo = item.historical_avg_deviation !== null
    ? `<span class="${item.historical_avg_deviation > 0.2 ? 'text-danger' : item.historical_avg_deviation > 0.1 ? 'text-warning' : 'text-success'}">
        ${(item.historical_avg_deviation * 100).toFixed(1)}%
      </span>`
    : '<span class="text-muted">-</span>';

  return `
    <tr class="${statusClass}">
      <td>
        ${item.consumable_name}
        ${statusBadge}
        ${item.duplicate_warning ? `<div class="text-danger small">${item.duplicate_warning}</div>` : ''}
        ${item.remark ? `<div class="text-muted small">${item.remark}</div>` : ''}
      </td>
      <td>${item.specification || '-'}</td>
      <td>${item.unit}</td>
      <td>${item.quantity_per_student}</td>
      <td><strong>${item.suggested_quantity}</strong></td>
      <td>${item.total_quantity}</td>
      <td>${item.available_quantity}</td>
      <td>
        ${item.gap_quantity > 0 
          ? `<span class="text-danger">缺口 ${item.gap_quantity.toFixed(2)}${item.unit}</span>`
          : '<span class="text-success">充足</span>'
        }
      </td>
      <td>${expiringInfo}</td>
      <td>${deviationInfo}</td>
      <td>
        <input type="number" 
               class="form-control form-control-sm qty-input"
               data-consumable-id="${item.consumable_id}"
               data-index="${index}"
               value="${adjustedQty}"
               min="0"
               step="0.01"
               ${item.is_duplicate ? 'disabled' : ''}>
      </td>
    </tr>
  `;
}

function bindApplyItemEvents(container: HTMLElement) {
  container.querySelectorAll('.qty-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const consumableId = parseInt(target.dataset.consumableId || '0');
      const newQty = parseFloat(target.value) || 0;

      const itemIndex = adjustedItems.findIndex(i => i.consumable_id === consumableId);
      if (itemIndex >= 0) {
        adjustedItems[itemIndex].requested_quantity = newQty;
      }
    });
  });
}

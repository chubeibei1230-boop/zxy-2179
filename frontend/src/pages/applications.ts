import { api } from '../api';
import {
  showToast, showModal, hideModal, createInput, createTextarea,
  createSelect, getFormData, formatDate, formatDateTime
} from '../utils';
import { ApplicationStatus, StatusColors } from '../types';
import type { Application, Course, Consumable, BatchWithConsumable, Feedback, ApplicationItem } from '../types';

let applications: Application[] = [];
let courses: Course[] = [];
let consumables: Consumable[] = [];
let batches: BatchWithConsumable[] = [];

export async function renderApplications(container: HTMLElement) {
  container.innerHTML = `
    <div class="page-header">
      <h2>申领管理</h2>
      <button class="btn btn-primary" id="add-application-btn">+ 新增申领</button>
    </div>
    <div class="filter-bar">
      <div class="form-group">
        <label>课次</label>
        <select class="form-control" id="filter-course">
          <option value="">全部课次</option>
        </select>
      </div>
      <div class="form-group">
        <label>耗材</label>
        <select class="form-control" id="filter-consumable">
          <option value="">全部耗材</option>
        </select>
      </div>
      <div class="form-group">
        <label>批次</label>
        <select class="form-control" id="filter-batch">
          <option value="">全部批次</option>
        </select>
      </div>
      <div class="form-group">
        <label>申请人</label>
        <input type="text" class="form-control" id="filter-applicant" placeholder="输入申请人">
      </div>
      <div class="form-group">
        <label>状态</label>
        <select class="form-control" id="filter-status">
          <option value="">全部状态</option>
          <option value="${ApplicationStatus.PENDING_SUBMIT}">${ApplicationStatus.PENDING_SUBMIT}</option>
          <option value="${ApplicationStatus.PENDING_REVIEW}">${ApplicationStatus.PENDING_REVIEW}</option>
          <option value="${ApplicationStatus.APPROVED}">${ApplicationStatus.APPROVED}</option>
          <option value="${ApplicationStatus.PREPARING}">${ApplicationStatus.PREPARING}</option>
          <option value="${ApplicationStatus.DISTRIBUTED}">${ApplicationStatus.DISTRIBUTED}</option>
          <option value="${ApplicationStatus.PENDING_FEEDBACK}">${ApplicationStatus.PENDING_FEEDBACK}</option>
          <option value="${ApplicationStatus.CLOSED}">${ApplicationStatus.CLOSED}</option>
        </select>
      </div>
      <div class="form-group">
        <label>开始日期</label>
        <input type="date" class="form-control" id="filter-start-date">
      </div>
      <div class="form-group">
        <label>结束日期</label>
        <input type="date" class="form-control" id="filter-end-date">
      </div>
      <button class="btn btn-secondary" id="refresh-btn">刷新</button>
    </div>
    <div class="section">
      <div class="table-container">
        <table id="applications-table">
          <thead>
            <tr>
              <th>申请单号</th>
              <th>课程名称</th>
              <th>申请人</th>
              <th>状态</th>
              <th>耗材项</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody id="applications-tbody">
            <tr><td colspan="7" style="text-align: center; padding: 2rem;">加载中...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  await loadAllData();
  bindEvents();
}

async function loadAllData() {
  try {
    [applications, courses, consumables, batches] = await Promise.all([
      api.applications.list(),
      api.courses.list(),
      api.consumables.list(),
      api.batches.list()
    ]);
    renderTable();
    updateFilters();
  } catch (error) {
    showToast(`加载失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
  }
}

function updateFilters() {
  const courseSelect = document.getElementById('filter-course') as HTMLSelectElement;
  const consumableSelect = document.getElementById('filter-consumable') as HTMLSelectElement;
  const batchSelect = document.getElementById('filter-batch') as HTMLSelectElement;

  if (courseSelect) {
    const val = courseSelect.value;
    courseSelect.innerHTML = '<option value="">全部课次</option>' +
      courses.map(c => `<option value="${c.id}">${c.course_name} - ${c.teacher}</option>`).join('');
    courseSelect.value = val;
  }

  if (consumableSelect) {
    const val = consumableSelect.value;
    consumableSelect.innerHTML = '<option value="">全部耗材</option>' +
      consumables.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    consumableSelect.value = val;
  }

  if (batchSelect) {
    const val = batchSelect.value;
    batchSelect.innerHTML = '<option value="">全部批次</option>' +
      batches.map(b => `<option value="${b.id}">${b.batch_no} (${b.consumable?.name || ''})</option>`).join('');
    batchSelect.value = val;
  }
}

function renderTable() {
  const tbody = document.getElementById('applications-tbody');
  if (!tbody) return;

  const courseId = (document.getElementById('filter-course') as HTMLSelectElement)?.value;
  const consumableId = (document.getElementById('filter-consumable') as HTMLSelectElement)?.value;
  const batchId = (document.getElementById('filter-batch') as HTMLSelectElement)?.value;
  const applicant = (document.getElementById('filter-applicant') as HTMLInputElement)?.value || '';
  const status = (document.getElementById('filter-status') as HTMLSelectElement)?.value;
  const startDate = (document.getElementById('filter-start-date') as HTMLInputElement)?.value;
  const endDate = (document.getElementById('filter-end-date') as HTMLInputElement)?.value;

  const filtered = applications.filter(app => {
    const matchCourse = !courseId || String(app.course_id) === courseId;
    const matchApplicant = !applicant || app.applicant.toLowerCase().includes(applicant.toLowerCase());
    const matchStatus = !status || app.status === status;
    const matchStart = !startDate || app.created_at >= startDate;
    const matchEnd = !endDate || app.created_at <= endDate + 'T23:59:59';

    let matchConsumable = !consumableId;
    let matchBatch = !batchId;

    if (consumableId) {
      matchConsumable = app.items.some(item => String(item.consumable_id) === consumableId);
    }
    if (batchId) {
      matchBatch = app.items.some(item => String(item.batch_id) === batchId);
    }

    return matchCourse && matchApplicant && matchStatus && matchStart && matchEnd && matchConsumable && matchBatch;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">暂无数据</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(app => `
    <tr>
      <td><strong>${app.application_no}</strong></td>
      <td>${app.course?.course_name || '-'}</td>
      <td>${app.applicant}</td>
      <td><span class="status-badge" style="background: ${StatusColors[app.status] || '#6c757d'}">${app.status}</span></td>
      <td>${app.items.length}项</td>
      <td>${formatDateTime(app.created_at)}</td>
      <td>
        <div class="btn-group">
          <button class="btn btn-sm btn-info" data-action="view" data-id="${app.id}">查看</button>
          ${getActionButtons(app)}
        </div>
      </td>
    </tr>
  `).join('');
}

function getActionButtons(app: Application): string {
  const buttons: string[] = [];

  if (app.status === ApplicationStatus.PENDING_SUBMIT) {
    buttons.push(`<button class="btn btn-sm btn-success" data-action="submit" data-id="${app.id}">提交</button>`);
    buttons.push(`<button class="btn btn-sm btn-danger" data-action="delete" data-id="${app.id}">删除</button>`);
  }
  if (app.status === ApplicationStatus.PENDING_REVIEW) {
    buttons.push(`<button class="btn btn-sm btn-success" data-action="review" data-id="${app.id}">审核</button>`);
  }
  if (app.status === ApplicationStatus.APPROVED) {
    buttons.push(`<button class="btn btn-sm btn-warning" data-action="prepare" data-id="${app.id}">备货</button>`);
  }
  if (app.status === ApplicationStatus.PREPARING) {
    buttons.push(`<button class="btn btn-sm btn-primary" data-action="distribute" data-id="${app.id}">发放</button>`);
  }
  if (app.status === ApplicationStatus.DISTRIBUTED) {
    buttons.push(`<button class="btn btn-sm btn-info" data-action="check" data-id="${app.id}">核对</button>`);
    buttons.push(`<button class="btn btn-sm btn-warning" data-action="feedback" data-id="${app.id}">反馈</button>`);
  }
  if (app.status === ApplicationStatus.PENDING_FEEDBACK) {
    buttons.push(`<button class="btn btn-sm btn-warning" data-action="feedback" data-id="${app.id}">反馈</button>`);
    const feedbackIds = new Set(app.feedbacks.map(f => f.application_item_id));
    const allFeedbackDone = app.items.every(item => feedbackIds.has(item.id));
    if (allFeedbackDone) {
      buttons.push(`<button class="btn btn-sm btn-secondary" data-action="close" data-id="${app.id}">关闭</button>`);
    }
  }

  return buttons.join('');
}

function bindEvents() {
  document.getElementById('add-application-btn')?.addEventListener('click', () => showApplicationModal());

  ['filter-course', 'filter-consumable', 'filter-batch', 'filter-status', 'filter-start-date', 'filter-end-date'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', renderTable);
  });
  document.getElementById('filter-applicant')?.addEventListener('input', renderTable);
  document.getElementById('refresh-btn')?.addEventListener('click', loadAllData);

  document.getElementById('applications-tbody')?.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    const action = target.dataset.action;
    const id = parseInt(target.dataset.id || '0');
    const app = applications.find(a => a.id === id);
    if (!app) return;

    if (action === 'view') {
      showApplicationDetail(app);
    } else if (action === 'submit') {
      if (confirm('确定要提交此申请吗？')) {
        try {
          await api.applications.submit(id);
          showToast('提交成功', 'success');
          loadAllData();
        } catch (error) {
          showToast(`操作失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
        }
      }
    } else if (action === 'review') {
      showReviewModal(app);
    } else if (action === 'prepare') {
      showPrepareModal(app);
    } else if (action === 'distribute') {
      if (confirm('确定要发放此申请的耗材吗？发放后将扣减库存。')) {
        try {
          await api.applications.distribute(id, { distributed_by: '管理员' });
          showToast('发放成功', 'success');
          loadAllData();
        } catch (error) {
          showToast(`操作失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
        }
      }
    } else if (action === 'check') {
      showCheckModal(app);
    } else if (action === 'feedback') {
      showFeedbackModal(app);
    } else if (action === 'close') {
      if (confirm('确定要关闭此申请吗？')) {
        try {
          await api.applications.close(id, { closed_by: '管理员' });
          showToast('关闭成功', 'success');
          loadAllData();
        } catch (error) {
          showToast(`操作失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
        }
      }
    } else if (action === 'delete') {
      if (confirm('确定要删除此申请吗？')) {
        try {
          await api.applications.delete(id);
          showToast('删除成功', 'success');
          loadAllData();
        } catch (error) {
          showToast(`操作失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
        }
      }
    }
  });

  document.querySelector('.close-btn')?.addEventListener('click', hideModal);
  document.getElementById('modal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal')) hideModal();
  });
}

function showApplicationDetail(app: Application) {
  const feedbackMap = new Map(app.feedbacks.map(f => [f.application_item_id, f]));

  const content = `
    <h3 class="form-title">申请详情 - ${app.application_no}</h3>
    <div class="detail-section">
      <h3>基本信息</h3>
      <div class="detail-grid">
        <div class="detail-item"><span class="label">申请单号</span><span class="value">${app.application_no}</span></div>
        <div class="detail-item"><span class="label">状态</span><span class="value"><span class="status-badge" style="background: ${StatusColors[app.status]}">${app.status}</span></span></div>
        <div class="detail-item"><span class="label">课程名称</span><span class="value">${app.course?.course_name || '-'}</span></div>
        <div class="detail-item"><span class="label">上课教师</span><span class="value">${app.course?.teacher || '-'}</span></div>
        <div class="detail-item"><span class="label">上课日期</span><span class="value">${formatDate(app.course?.course_date || null)}</span></div>
        <div class="detail-item"><span class="label">申请人</span><span class="value">${app.applicant}</span></div>
        <div class="detail-item"><span class="label">创建时间</span><span class="value">${formatDateTime(app.created_at)}</span></div>
        <div class="detail-item"><span class="label">审核人</span><span class="value">${app.reviewer || '-'}</span></div>
      </div>
    </div>
    ${app.purpose ? `
    <div class="detail-section">
      <h3>申请用途</h3>
      <p>${app.purpose}</p>
    </div>` : ''}
    <div class="detail-section">
      <h3>耗材明细</h3>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>耗材名称</th>
              <th>规格</th>
              <th>单位</th>
              <th>批次号</th>
              <th>申请数量</th>
              <th>批准数量</th>
              <th>实际发放</th>
              <th>剩余数量</th>
              <th>异常</th>
              <th>反馈状态</th>
            </tr>
          </thead>
          <tbody>
            ${app.items.map(item => {
              const feedback = feedbackMap.get(item.id);
              return `
              <tr>
                <td>${item.consumable?.name || '-'}</td>
                <td>${item.consumable?.specification || '-'}</td>
                <td>${item.consumable?.unit || '-'}</td>
                <td>${item.batch?.batch_no || '-'}</td>
                <td>${item.requested_quantity}</td>
                <td>${item.approved_quantity ?? '-'}</td>
                <td>${item.actual_quantity ?? '-'}</td>
                <td>${item.remaining_quantity ?? '-'}</td>
                <td>${item.has_exception ? `<span class="status-badge" style="background: #e74c3c">是</span><br><small>${item.exception_remark || ''}</small>` : '-'}</td>
                <td>${feedback ? `<span class="status-badge" style="background: #27ae60">已反馈</span>` : '<span class="status-badge" style="background: #f39c12">待反馈</span>'}</td>
              </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
    ${app.feedbacks.length > 0 ? `
    <div class="detail-section">
      <h3>反馈记录</h3>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>耗材名称</th>
              <th>使用数量</th>
              <th>剩余数量</th>
              <th>使用情况</th>
              <th>质量问题</th>
              <th>反馈人</th>
              <th>反馈时间</th>
            </tr>
          </thead>
          <tbody>
            ${app.feedbacks.map(f => `
              <tr>
                <td>${f.application_item?.consumable?.name || '-'}</td>
                <td>${f.usage_quantity}</td>
                <td>${f.remaining_quantity}</td>
                <td>${f.usage_situation || '-'}</td>
                <td>${f.quality_issue ? `<span class="status-badge" style="background: #e74c3c">是</span><br><small>${f.quality_issue_desc || ''}</small>` : '否'}</td>
                <td>${f.submitted_by || '-'}</td>
                <td>${formatDateTime(f.created_at)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>` : ''}
    <div class="form-actions">
      <button type="button" class="btn btn-secondary" id="close-detail">关闭</button>
    </div>
  `;

  showModal(content);
  document.getElementById('close-detail')?.addEventListener('click', hideModal);
}

function showApplicationModal() {
  const form = document.createElement('form');

  const courseOptions = [
    { value: '', label: '请选择课次' },
    ...courses.map(c => ({ value: String(c.id), label: `${c.course_name} - ${c.teacher} (${formatDate(c.course_date)})` }))
  ];

  form.innerHTML = `
    <h3 class="form-title">新增申领</h3>
    ${createSelect('选择课次', courseOptions, '', true).innerHTML}
    ${createInput('申请人', 'text', '', true).innerHTML}
    ${createTextarea('用途说明', '').innerHTML}
    <div class="detail-section">
      <h3>耗材明细</h3>
      <div id="item-list" class="item-list"></div>
      <button type="button" class="add-item-btn" id="add-item">+ 添加耗材</button>
    </div>
    <div class="form-actions">
      <button type="button" class="btn btn-secondary" id="cancel-btn">取消</button>
      <button type="submit" class="btn btn-primary">创建</button>
    </div>
  `;

  const selects = form.querySelectorAll('select');
  const inputs = form.querySelectorAll('input');
  const textareas = form.querySelectorAll('textarea');
  selects[0].name = 'course_id';
  inputs[0].name = 'applicant';
  textareas[0].name = 'purpose';

  let itemCount = 0;
  const addItemRow = () => {
    const itemRow = document.createElement('div');
    itemRow.className = 'item-row';
    itemRow.dataset.index = String(itemCount);

    const consumableOptions = [
      { value: '', label: '选择耗材' },
      ...consumables.map(c => ({ value: String(c.id), label: `${c.name} (${c.unit})` }))
    ];

    itemRow.innerHTML = `
      <select class="form-control" name="consumable_id_${itemCount}" required>
        ${consumableOptions.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
      </select>
      <input type="number" class="form-control" name="quantity_${itemCount}" placeholder="数量" min="1" step="0.01" required>
      <button type="button" class="remove-btn" data-index="${itemCount}">×</button>
    `;

    itemRow.querySelector('.remove-btn')?.addEventListener('click', () => {
      itemRow.remove();
    });

    form.querySelector('#item-list')?.appendChild(itemRow);
    itemCount++;
  };

  addItemRow();
  form.querySelector('#add-item')?.addEventListener('click', addItemRow);
  form.querySelector('#cancel-btn')?.addEventListener('click', hideModal);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = getFormData(form);

    const items: { consumable_id: number; requested_quantity: number }[] = [];
    for (let i = 0; i < itemCount; i++) {
      const consumableId = data[`consumable_id_${i}`];
      const quantity = data[`quantity_${i}`];
      if (consumableId && quantity) {
        items.push({
          consumable_id: parseInt(consumableId),
          requested_quantity: parseFloat(quantity)
        });
      }
    }

    if (items.length === 0) {
      showToast('请至少添加一项耗材', 'error');
      return;
    }

    try {
      await api.applications.create({
        course_id: parseInt(data.course_id),
        applicant: data.applicant,
        purpose: data.purpose,
        items
      });
      showToast('创建成功', 'success');
      hideModal();
      loadAllData();
    } catch (error) {
      showToast(`操作失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
    }
  });

  showModal(form);
}

function showReviewModal(app: Application) {
  const form = document.createElement('form');
  form.innerHTML = `
    <h3 class="form-title">审核申请 - ${app.application_no}</h3>
    <div class="alert alert-info">
      <p>申请单号: <strong>${app.application_no}</strong></p>
      <p>课程: ${app.course?.course_name || '-'}</p>
      <p>申请人: ${app.applicant}</p>
      <p>耗材项: ${app.items.length}项</p>
    </div>
    <div class="form-group">
      <label>审核结果<span class="required"> *</span></label>
      <select class="form-control" name="approved" required>
        <option value="true">通过</option>
        <option value="false">驳回</option>
      </select>
    </div>
    ${createInput('审核人', 'text', '', true).innerHTML}
    ${createTextarea('审核意见', '').innerHTML}
    <div class="form-actions">
      <button type="button" class="btn btn-secondary" id="cancel-btn">取消</button>
      <button type="submit" class="btn btn-primary">提交审核</button>
    </div>
  `;

  const inputs = form.querySelectorAll('input');
  const textareas = form.querySelectorAll('textarea');
  inputs[0].name = 'reviewer';
  textareas[0].name = 'review_comment';

  form.querySelector('#cancel-btn')?.addEventListener('click', hideModal);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = getFormData(form);
    try {
      await api.applications.review(app.id, {
        approved: data.approved === 'true',
        reviewer: data.reviewer,
        review_comment: data.review_comment
      });
      showToast('审核成功', 'success');
      hideModal();
      loadAllData();
    } catch (error) {
      showToast(`操作失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
    }
  });

  showModal(form);
}

function showPrepareModal(app: Application) {
  const form = document.createElement('form');

  const itemsHtml = app.items.map((item, index) => {
    const availableBatches = batches.filter(b => b.consumable_id === item.consumable_id && b.quantity > 0);
    const batchOptions = [
      { value: '', label: '请选择批次' },
      ...availableBatches.map(b => ({ value: String(b.id), label: `${b.batch_no} (库存: ${b.quantity}${b.consumable?.unit || ''}, 过期: ${formatDate(b.expiry_date)})` }))
    ];

    return `
      <div class="item-row" data-item-id="${item.id}">
        <div class="form-group">
          <label>耗材</label>
          <input type="text" class="form-control" value="${item.consumable?.name || ''}" readonly>
        </div>
        <div class="form-group">
          <label>申请数量</label>
          <input type="number" class="form-control" value="${item.requested_quantity}" readonly>
        </div>
        <div class="form-group">
          <label>批次<span class="required"> *</span></label>
          <select class="form-control" name="batch_${index}" required>
            ${batchOptions.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>批准数量<span class="required"> *</span></label>
          <input type="number" class="form-control" name="approved_${index}" value="${item.approved_quantity || item.requested_quantity}" min="0" step="0.01" required>
        </div>
      </div>
    `;
  }).join('');

  form.innerHTML = `
    <h3 class="form-title">备货 - ${app.application_no}</h3>
    ${createInput('备货人', 'text', '', true).innerHTML}
    <div class="detail-section">
      <h3>备货明细</h3>
      ${itemsHtml}
    </div>
    <div class="form-actions">
      <button type="button" class="btn btn-secondary" id="cancel-btn">取消</button>
      <button type="submit" class="btn btn-primary">确认备货</button>
    </div>
  `;

  const input = form.querySelector('input');
  if (input) input.name = 'prepared_by';

  form.querySelector('#cancel-btn')?.addEventListener('click', hideModal);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = getFormData(form);

    const items = app.items.map((item, index) => ({
      consumable_id: item.consumable_id,
      batch_id: parseInt(data[`batch_${index}`]),
      approved_quantity: parseFloat(data[`approved_${index}`])
    }));

    try {
      await api.applications.prepare(app.id, {
        prepared_by: data.prepared_by,
        items
      });
      showToast('备货成功', 'success');
      hideModal();
      loadAllData();
    } catch (error) {
      showToast(`操作失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
    }
  });

  showModal(form);
}

function showCheckModal(app: Application) {
  const form = document.createElement('form');

  const itemsHtml = app.items.map((item, index) => `
    <div class="item-row" data-item-id="${item.id}">
      <div class="form-group">
        <label>耗材</label>
        <input type="text" class="form-control" value="${item.consumable?.name || ''}" readonly>
      </div>
      <div class="form-group">
        <label>批准数量</label>
        <input type="number" class="form-control" value="${item.approved_quantity || 0}" readonly>
      </div>
      <div class="form-group">
        <label>实际数量<span class="required"> *</span></label>
        <input type="number" class="form-control" name="actual_${index}" value="${item.actual_quantity ?? item.approved_quantity ?? 0}" min="0" step="0.01" required>
      </div>
      <div class="form-group">
        <label>剩余数量</label>
        <input type="number" class="form-control" name="remaining_${index}" value="${item.remaining_quantity ?? 0}" min="0" step="0.01">
      </div>
      <div class="form-group">
        <label>是否异常</label>
        <select class="form-control" name="exception_${index}">
          <option value="false">否</option>
          <option value="true">是</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label>核对备注</label>
      <textarea class="form-control" name="remark_${index}" rows="2" placeholder="如有异常请说明"></textarea>
    </div>
  `).join('');

  form.innerHTML = `
    <h3 class="form-title">数量核对 - ${app.application_no}</h3>
    <div class="detail-section">
      <h3>核对明细</h3>
      ${itemsHtml}
    </div>
    <div class="form-actions">
      <button type="button" class="btn btn-secondary" id="cancel-btn">取消</button>
      <button type="submit" class="btn btn-primary">确认核对</button>
    </div>
  `;

  form.querySelector('#cancel-btn')?.addEventListener('click', hideModal);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = getFormData(form);

    const items = app.items.map((item, index) => ({
      id: item.id,
      consumable_id: item.consumable_id,
      actual_quantity: parseFloat(data[`actual_${index}`]),
      remaining_quantity: parseFloat(data[`remaining_${index}`] || '0'),
      has_exception: data[`exception_${index}`] === 'true',
      check_remark: data[`remark_${index}`] || '',
      exception_remark: data[`exception_${index}`] === 'true' ? data[`remark_${index}`] || '' : ''
    }));

    try {
      await api.applications.check(app.id, { items });
      showToast('核对完成', 'success');
      hideModal();
      loadAllData();
    } catch (error) {
      showToast(`操作失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
    }
  });

  showModal(form);
}

function showFeedbackModal(app: Application) {
  const content = document.createElement('div');
  const feedbackMap = new Map(app.feedbacks.map(f => [f.application_item_id, f]));
  const pendingItems = app.items.filter(item => !feedbackMap.has(item.id));

  if (pendingItems.length === 0) {
    content.innerHTML = `
      <h3 class="form-title">用后反馈 - ${app.application_no}</h3>
      <div class="alert alert-info">所有明细项已完成反馈</div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" id="close-btn">关闭</button>
      </div>
    `;
    content.querySelector('#close-btn')?.addEventListener('click', hideModal);
    showModal(content);
    return;
  }

  content.innerHTML = `
    <h3 class="form-title">用后反馈 - ${app.application_no}</h3>
    <div id="feedback-forms"></div>
  `;

  const formsContainer = content.querySelector('#feedback-forms');
  if (!formsContainer) return;

  pendingItems.forEach((item, idx) => {
    const form = document.createElement('form');
    form.className = 'section';
    form.dataset.itemId = String(item.id);
    form.innerHTML = `
      <h4>反馈 - ${item.consumable?.name || ''}</h4>
      <div class="alert alert-info">
        实际发放: ${item.actual_quantity ?? item.approved_quantity ?? 0} ${item.consumable?.unit || ''}
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
        <div class="form-group">
          <label>使用数量<span class="required"> *</span></label>
          <input type="number" class="form-control" name="usage_quantity" min="0" step="0.01" required>
        </div>
        <div class="form-group">
          <label>剩余数量<span class="required"> *</span></label>
          <input type="number" class="form-control" name="remaining_quantity" min="0" step="0.01" required>
        </div>
      </div>
      ${createTextarea('使用情况', '').innerHTML}
      <div class="form-group">
        <label>是否有质量问题</label>
        <select class="form-control" name="quality_issue">
          <option value="false">否</option>
          <option value="true">是</option>
        </select>
      </div>
      <div class="form-group" id="quality-desc-${idx}" style="display: none;">
        <label>问题描述</label>
        <textarea class="form-control" name="quality_issue_desc" rows="2"></textarea>
      </div>
      ${createInput('反馈人', 'text', '', true).innerHTML}
      <div class="form-actions">
        <button type="submit" class="btn btn-primary btn-sm">提交反馈</button>
      </div>
    `;

    const textareas = form.querySelectorAll('textarea');
    const inputs = form.querySelectorAll('input');
    textareas[0].name = 'usage_situation';
    textareas[1].name = 'quality_issue_desc';
    inputs[2].name = 'submitted_by';

    form.querySelector('[name="quality_issue"]')?.addEventListener('change', (e) => {
      const descDiv = document.getElementById(`quality-desc-${idx}`);
      if (descDiv) {
        descDiv.style.display = (e.target as HTMLSelectElement).value === 'true' ? 'block' : 'none';
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = getFormData(form);

      const usage = parseFloat(data.usage_quantity);
      const remaining = parseFloat(data.remaining_quantity);
      const actual = item.actual_quantity ?? item.approved_quantity ?? 0;

      if (Math.abs(usage + remaining - actual) > 0.001) {
        showToast(`使用量 + 剩余量 必须等于实际发放量 (${actual})`, 'error');
        return;
      }

      try {
        await api.feedbacks.create({
          application_id: app.id,
          application_item_id: item.id,
          usage_quantity: usage,
          remaining_quantity: remaining,
          usage_situation: data.usage_situation,
          quality_issue: data.quality_issue === 'true',
          quality_issue_desc: data.quality_issue === 'true' ? data.quality_issue_desc : '',
          submitted_by: data.submitted_by
        });
        showToast('反馈提交成功', 'success');
        hideModal();
        loadAllData();
      } catch (error) {
        showToast(`操作失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
      }
    });

    formsContainer.appendChild(form);
  });

  showModal(content);
}

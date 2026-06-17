import { api } from '../api';
import {
  showToast, showModal, hideModal, createInput, createTextarea,
  getFormData, formatDate, formatDateTime
} from '../utils';
import type { ConsumableTemplateWithStats, Consumable, TemplateUsageHistory } from '../types';

let templates: ConsumableTemplateWithStats[] = [];
let consumables: Consumable[] = [];
let templateItems: { consumable_id: number; quantity_per_student: number; remark?: string }[] = [];

export async function renderTemplates(container: HTMLElement) {
  container.innerHTML = `
    <div class="page-header">
      <h2>耗材模板管理</h2>
      <button class="btn btn-primary" id="add-template-btn">+ 新增模板</button>
    </div>
    <div class="filter-bar">
      <div class="form-group">
        <label>模板名称</label>
        <input type="text" class="form-control" id="search-name" placeholder="输入模板名称">
      </div>
      <div class="form-group">
        <label>状态</label>
        <select class="form-control" id="filter-status">
          <option value="">全部</option>
          <option value="true">启用</option>
          <option value="false">停用</option>
        </select>
      </div>
      <button class="btn btn-secondary" id="refresh-btn">刷新</button>
    </div>
    <div class="section">
      <div class="table-container">
        <table id="templates-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>模板名称</th>
              <th>适用课程</th>
              <th>耗材种类</th>
              <th>使用次数</th>
              <th>平均偏差率</th>
              <th>最近使用</th>
              <th>状态</th>
              <th>创建人</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody id="templates-tbody">
            <tr><td colspan="11" style="text-align: center; padding: 2rem;">加载中...</td></tr>
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
    [templates, consumables] = await Promise.all([
      api.templates.list(),
      api.consumables.list()
    ]);
    renderTable();
  } catch (error) {
    showToast(`加载失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
  }
}

function renderTable() {
  const tbody = document.getElementById('templates-tbody');
  if (!tbody) return;

  const searchName = (document.getElementById('search-name') as HTMLInputElement)?.value || '';
  const filterStatus = (document.getElementById('filter-status') as HTMLSelectElement)?.value;

  const filtered = templates.filter(t => {
    const matchName = t.name.toLowerCase().includes(searchName.toLowerCase());
    const matchStatus = filterStatus === '' || String(t.is_active) === filterStatus;
    return matchName && matchStatus;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11" class="empty-state">暂无数据</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(t => {
    const deviationColor = t.avg_deviation_rate !== null && t.avg_deviation_rate > 0.2 ? '#dc3545' : 
                          t.avg_deviation_rate !== null && t.avg_deviation_rate > 0.1 ? '#fd7e14' : '#28a745';
    return `
    <tr>
      <td>${t.id}</td>
      <td>${t.name}</td>
      <td>${t.applicable_courses || '-'}</td>
      <td><span class="badge badge-info">${t.total_consumables} 种</span></td>
      <td>${t.usage_count || 0}</td>
      <td style="color: ${deviationColor}">${t.avg_deviation_rate !== null ? (t.avg_deviation_rate * 100).toFixed(2) + '%' : '-'}</td>
      <td>${t.last_used_at ? formatDate(t.last_used_at) : '-'}</td>
      <td><span class="badge ${t.is_active ? 'badge-success' : 'badge-secondary'}">${t.is_active ? '启用' : '停用'}</span></td>
      <td>${t.created_by || '-'}</td>
      <td>${formatDateTime(t.created_at)}</td>
      <td>
        <div class="btn-group">
          <button class="btn btn-sm btn-info" data-action="view" data-id="${t.id}">查看</button>
          <button class="btn btn-sm btn-primary" data-action="edit" data-id="${t.id}">编辑</button>
          <button class="btn btn-sm btn-danger" data-action="delete" data-id="${t.id}">删除</button>
        </div>
      </td>
    </tr>
  `}).join('');
}

function bindEvents() {
  document.getElementById('add-template-btn')?.addEventListener('click', () => showTemplateModal());

  document.getElementById('search-name')?.addEventListener('input', renderTable);
  document.getElementById('filter-status')?.addEventListener('change', renderTable);
  document.getElementById('refresh-btn')?.addEventListener('click', loadData);

  document.getElementById('templates-tbody')?.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    const action = target.dataset.action;
    const id = parseInt(target.dataset.id || '0');

    if (action === 'view') {
      const template = templates.find(t => t.id === id);
      if (template) showTemplateDetail(template);
    } else if (action === 'edit') {
      const template = templates.find(t => t.id === id);
      if (template) showTemplateModal(template);
    } else if (action === 'delete') {
      if (confirm('确定要删除这个模板吗？删除后将无法恢复。')) {
        try {
          await api.templates.delete(id);
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

function showTemplateModal(template?: ConsumableTemplateWithStats) {
  const isEdit = !!template;
  templateItems = template ? template.items.map(item => ({
    consumable_id: item.consumable_id,
    quantity_per_student: item.quantity_per_student,
    remark: item.remark || undefined
  })) : [];

  const form = document.createElement('form');
  form.className = 'template-form';
  form.style.minWidth = '700px';
  form.dataset.isEdit = String(isEdit);
  if (template) {
    form.dataset.templateId = String(template.id);
  }

  form.innerHTML = `
    <h3 class="form-title">${isEdit ? '编辑' : '新增'}耗材模板</h3>
    <div class="form-group">
      <label>模板名称<span class="required"> *</span></label>
      <input type="text" class="form-control" name="name" value="${template?.name || ''}" required>
    </div>
    <div class="form-group">
      <label>适用课程</label>
      <input type="text" class="form-control" name="applicable_courses" value="${template?.applicable_courses || ''}" placeholder="如：有机化学实验、分析化学实验">
    </div>
    <div class="form-group">
      <label>模板描述</label>
      <textarea class="form-control" name="description" rows="2">${template?.description || ''}</textarea>
    </div>
    <div class="form-group">
      <label>创建人</label>
      <input type="text" class="form-control" name="created_by" value="${template?.created_by || ''}" placeholder="输入创建人姓名">
    </div>
    <div class="form-group">
      <label>
        <input type="checkbox" name="is_active" ${template?.is_active !== false ? 'checked' : ''}>
        启用此模板
      </label>
    </div>
    
    <div class="form-group">
      <label>耗材明细<span class="required"> *</span></label>
      <div class="template-items-header">
        <div style="flex: 2;">耗材名称</div>
        <div style="flex: 1;">人均用量</div>
        <div style="flex: 2;">规格</div>
        <div style="flex: 2;">单位</div>
        <div style="flex: 2;">备注</div>
        <div style="width: 60px;">操作</div>
      </div>
      <div id="template-items-container"></div>
      <button type="button" class="btn btn-secondary btn-sm mt-2" id="add-item-btn">+ 添加耗材</button>
    </div>
    
    <div class="form-actions">
      <button type="button" class="btn btn-secondary" id="cancel-btn">取消</button>
      <button type="submit" class="btn btn-primary">${isEdit ? '保存' : '创建'}</button>
    </div>
  `;

  showModal(form);
  renderTemplateItems();

  form.querySelector('#add-item-btn')?.addEventListener('click', () => {
    showAddItemModal();
  });

  form.querySelector('#cancel-btn')?.addEventListener('click', hideModal);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (templateItems.length === 0) {
      showToast('请至少添加一个耗材明细', 'error');
      return;
    }

    const data = getFormData(form);
    const templateData = {
      name: data.name,
      description: data.description || undefined,
      applicable_courses: data.applicable_courses || undefined,
      created_by: data.created_by || undefined,
      is_active: data.is_active === 'on' || data.is_active === true,
      items: templateItems
    };

    try {
      if (isEdit && template) {
        await api.templates.update(template.id, templateData);
        showToast('更新成功', 'success');
      } else {
        await api.templates.create(templateData);
        showToast('创建成功', 'success');
      }
      hideModal();
      loadData();
    } catch (error) {
      showToast(`操作失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
    }
  });
}

function renderTemplateItems() {
  const container = document.getElementById('template-items-container');
  if (!container) return;

  if (templateItems.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding: 1rem; text-align: center;">暂无耗材明细，点击下方按钮添加</div>';
    return;
  }

  container.innerHTML = templateItems.map((item, index) => {
    const consumable = consumables.find(c => c.id === item.consumable_id);
    return `
      <div class="template-item-row" data-index="${index}">
        <div style="flex: 2;">${consumable?.name || '-'}</div>
        <div style="flex: 1;">${item.quantity_per_student}</div>
        <div style="flex: 2;">${consumable?.specification || '-'}</div>
        <div style="flex: 2;">${consumable?.unit || '-'}</div>
        <div style="flex: 2;">${item.remark || '-'}</div>
        <div style="width: 60px;">
          <button type="button" class="btn btn-sm btn-danger" data-action="remove-item" data-index="${index}">删除</button>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('[data-action="remove-item"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const index = parseInt(target.dataset.index || '0');
      templateItems.splice(index, 1);
      renderTemplateItems();
    });
  });
}

function showAddItemModal() {
  const itemForm = document.createElement('form');
  itemForm.style.minWidth = '400px';

  const availableConsumables = consumables.filter(c => 
    !templateItems.find(item => item.consumable_id === c.id)
  );

  itemForm.innerHTML = `
    <h3 class="form-title">添加耗材</h3>
    <div class="form-group">
      <label>选择耗材<span class="required"> *</span></label>
      <select class="form-control" name="consumable_id" required>
        <option value="">请选择耗材</option>
        ${availableConsumables.map(c => 
          `<option value="${c.id}">${c.name} (${c.specification || '无规格'}, ${c.unit})</option>`
        ).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>人均用量<span class="required"> *</span></label>
      <input type="number" step="0.01" min="0.01" class="form-control" name="quantity_per_student" required placeholder="输入每人用量">
    </div>
    <div class="form-group">
      <label>备注</label>
      <input type="text" class="form-control" name="remark" placeholder="选填">
    </div>
    <div class="form-actions">
      <button type="button" class="btn btn-secondary" id="cancel-item-btn">取消</button>
      <button type="submit" class="btn btn-primary">添加</button>
    </div>
  `;

  const modalBody = document.getElementById('modal-body');
  const templateForm = modalBody?.querySelector('form');
  
  const savedValues: Record<string, string> = {};
  if (templateForm) {
    templateForm.querySelectorAll('input, select, textarea').forEach(el => {
      const input = el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      if (input.name) {
        if (input.type === 'checkbox') {
          savedValues[input.name] = (input as HTMLInputElement).checked ? 'on' : '';
        } else {
          savedValues[input.name] = input.value;
        }
      }
    });
  }
  
  const currentContent = modalBody?.innerHTML;
  const currentFormDataset = templateForm ? { ...templateForm.dataset } : null;
  
  showModal(itemForm);

  function restoreTemplateForm() {
    if (!currentContent || !modalBody) return;
    
    const container = document.getElementById('modal');
    if (!container) return;
    
    container.classList.remove('hidden');
    modalBody.innerHTML = currentContent;
    
    const form = modalBody.querySelector('form');
    if (form) {
      if (currentFormDataset) {
        Object.entries(currentFormDataset).forEach(([key, value]) => {
          if (value !== undefined) {
            form.dataset[key] = value;
          }
        });
      }
      
      form.querySelectorAll('input, select, textarea').forEach(el => {
        const input = el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        if (input.name && savedValues[input.name] !== undefined) {
          if (input.type === 'checkbox') {
            (input as HTMLInputElement).checked = savedValues[input.name] === 'on';
          } else {
            input.value = savedValues[input.name];
          }
        }
      });
      
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (templateItems.length === 0) {
          showToast('请至少添加一个耗材明细', 'error');
          return;
        }

        const data = getFormData(form);
        const templateData = {
          name: data.name,
          description: data.description || undefined,
          applicable_courses: data.applicable_courses || undefined,
          created_by: data.created_by || undefined,
          is_active: data.is_active === 'on' || data.is_active === true,
          items: templateItems
        };

        try {
          if (form.dataset.isEdit === 'true' && form.dataset.templateId) {
            await api.templates.update(parseInt(form.dataset.templateId), templateData);
            showToast('更新成功', 'success');
          } else {
            await api.templates.create(templateData);
            showToast('创建成功', 'success');
          }
          hideModal();
          loadData();
        } catch (error) {
          showToast(`操作失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
        }
      });
    }
    
    const addItemBtn = modalBody.querySelector('#add-item-btn');
    const cancelBtn = modalBody.querySelector('#cancel-btn');
    
    addItemBtn?.addEventListener('click', () => {
      showAddItemModal();
    });
    
    cancelBtn?.addEventListener('click', hideModal);
    
    renderTemplateItems();
  }

  itemForm.querySelector('#cancel-item-btn')?.addEventListener('click', () => {
    hideModal();
    restoreTemplateForm();
  });

  itemForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = getFormData(itemForm);
    
    templateItems.push({
      consumable_id: parseInt(data.consumable_id),
      quantity_per_student: parseFloat(data.quantity_per_student),
      remark: data.remark || undefined
    });
    
    hideModal();
    restoreTemplateForm();
  });
}

async function showTemplateDetail(template: ConsumableTemplateWithStats) {
  let histories: TemplateUsageHistory[] = [];
  try {
    histories = await api.templates.getHistories(template.id);
  } catch (error) {
    console.error('加载历史记录失败', error);
  }

  const detailContent = document.createElement('div');
  detailContent.style.minWidth = '800px';
  detailContent.style.maxHeight = '80vh';
  detailContent.style.overflowY = 'auto';

  detailContent.innerHTML = `
    <h3 class="form-title">模板详情 - ${template.name}</h3>
    
    <div class="detail-section">
      <h4>基本信息</h4>
      <div class="detail-grid">
        <div><strong>模板名称：</strong>${template.name}</div>
        <div><strong>状态：</strong><span class="badge ${template.is_active ? 'badge-success' : 'badge-secondary'}">${template.is_active ? '启用' : '停用'}</span></div>
        <div><strong>适用课程：</strong>${template.applicable_courses || '-'}</div>
        <div><strong>创建人：</strong>${template.created_by || '-'}</div>
        <div><strong>使用次数：</strong>${template.usage_count || 0} 次</div>
        <div><strong>最近使用：</strong>${template.last_used_at ? formatDate(template.last_used_at) : '-'}</div>
        <div><strong>平均偏差率：</strong>${template.avg_deviation_rate !== null ? (template.avg_deviation_rate * 100).toFixed(2) + '%' : '-'}</div>
        <div><strong>创建时间：</strong>${formatDateTime(template.created_at)}</div>
        <div style="grid-column: span 2;"><strong>模板描述：</strong>${template.description || '-'}</div>
      </div>
    </div>

    <div class="detail-section">
      <h4>耗材明细 (${template.items.length} 种)</h4>
      <table class="detail-table">
        <thead>
          <tr>
            <th>耗材名称</th>
            <th>规格</th>
            <th>单位</th>
            <th>人均用量</th>
            <th>备注</th>
          </tr>
        </thead>
        <tbody>
          ${template.items.map(item => `
            <tr>
              <td>${item.consumable?.name || '-'}</td>
              <td>${item.consumable?.specification || '-'}</td>
              <td>${item.consumable?.unit || '-'}</td>
              <td>${item.quantity_per_student}</td>
              <td>${item.remark || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="detail-section">
      <h4>使用历史记录</h4>
      ${histories.length === 0 ? 
        '<div class="empty-state">暂无使用记录</div>' :
        `<table class="detail-table">
          <thead>
            <tr>
              <th>使用日期</th>
              <th>课程名称</th>
              <th>耗材名称</th>
              <th>学生人数</th>
              <th>申请数量</th>
              <th>实际用量</th>
              <th>偏差率</th>
            </tr>
          </thead>
          <tbody>
            ${histories.map(h => `
              <tr>
                <td>${formatDate(h.used_at)}</td>
                <td>${h.course?.course_name || '-'}</td>
                <td>${h.consumable?.name || '-'}</td>
                <td>${h.student_count}</td>
                <td>${h.requested_quantity}</td>
                <td>${h.usage_quantity !== null ? h.usage_quantity : '-'}</td>
                <td style="color: ${h.deviation_rate !== null && h.deviation_rate > 0.2 ? '#dc3545' : h.deviation_rate !== null && h.deviation_rate > 0.1 ? '#fd7e14' : '#28a745'}">
                  ${h.deviation_rate !== null ? (h.deviation_rate * 100).toFixed(2) + '%' : '-'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>`
      }
    </div>

    <div class="form-actions">
      <button type="button" class="btn btn-secondary" id="close-detail-btn">关闭</button>
    </div>
  `;

  showModal(detailContent);

  detailContent.querySelector('#close-detail-btn')?.addEventListener('click', hideModal);
}

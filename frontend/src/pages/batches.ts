import { api } from '../api';
import {
  showToast, showModal, hideModal, createInput, createTextarea,
  createSelect, getFormData, formatDate, formatDateTime
} from '../utils';
import type { BatchWithConsumable, Consumable } from '../types';

let batches: BatchWithConsumable[] = [];
let consumables: Consumable[] = [];

export async function renderBatches(container: HTMLElement) {
  container.innerHTML = `
    <div class="page-header">
      <h2>批次管理</h2>
      <button class="btn btn-primary" id="add-batch-btn">+ 新增批次</button>
    </div>
    <div class="filter-bar">
      <div class="form-group">
        <label>批次号</label>
        <input type="text" class="form-control" id="search-batch-no" placeholder="输入批次号">
      </div>
      <div class="form-group">
        <label>耗材</label>
        <select class="form-control" id="filter-consumable">
          <option value="">全部耗材</option>
        </select>
      </div>
      <div class="form-group">
        <label>临期状态</label>
        <select class="form-control" id="filter-expiry">
          <option value="">全部</option>
          <option value="expiring">30天内临期</option>
          <option value="expired">已过期</option>
          <option value="normal">正常</option>
        </select>
      </div>
      <button class="btn btn-secondary" id="refresh-btn">刷新</button>
    </div>
    <div class="section">
      <div class="table-container">
        <table id="batches-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>批次号</th>
              <th>耗材名称</th>
              <th>数量</th>
              <th>单位</th>
              <th>单价</th>
              <th>供应商</th>
              <th>生产日期</th>
              <th>过期日期</th>
              <th>状态</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody id="batches-tbody">
            <tr><td colspan="12" style="text-align: center; padding: 2rem;">加载中...</td></tr>
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
    [batches, consumables] = await Promise.all([
      api.batches.list(),
      api.consumables.list()
    ]);
    renderTable();
    updateConsumableFilter();
  } catch (error) {
    showToast(`加载失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
  }
}

function updateConsumableFilter() {
  const select = document.getElementById('filter-consumable') as HTMLSelectElement;
  if (select) {
    const currentValue = select.value;
    select.innerHTML = '<option value="">全部耗材</option>' +
      consumables.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    select.value = currentValue;
  }
}

function getExpiryStatus(batch: BatchWithConsumable): { text: string; class: string } {
  if (!batch.expiry_date) {
    return { text: '无期限', class: '#6c757d' };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(batch.expiry_date);
  expiry.setHours(0, 0, 0, 0);
  const daysToExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysToExpiry < 0) {
    return { text: '已过期', class: '#e74c3c' };
  } else if (daysToExpiry <= 7) {
    return { text: `临期${daysToExpiry}天`, class: '#e74c3c' };
  } else if (daysToExpiry <= 30) {
    return { text: `临期${daysToExpiry}天`, class: '#f39c12' };
  }
  return { text: '正常', class: '#27ae60' };
}

function renderTable() {
  const tbody = document.getElementById('batches-tbody');
  if (!tbody) return;

  const searchBatchNo = (document.getElementById('search-batch-no') as HTMLInputElement)?.value || '';
  const filterConsumable = (document.getElementById('filter-consumable') as HTMLSelectElement)?.value || '';
  const filterExpiry = (document.getElementById('filter-expiry') as HTMLSelectElement)?.value || '';

  const filtered = batches.filter(b => {
    const matchBatchNo = b.batch_no.toLowerCase().includes(searchBatchNo.toLowerCase());
    const matchConsumable = !filterConsumable || String(b.consumable_id) === filterConsumable;
    const status = getExpiryStatus(b);
    let matchExpiry = true;
    if (filterExpiry === 'expiring') {
      matchExpiry = status.text.includes('临期');
    } else if (filterExpiry === 'expired') {
      matchExpiry = status.text === '已过期';
    } else if (filterExpiry === 'normal') {
      matchExpiry = status.text === '正常' || status.text === '无期限';
    }
    return matchBatchNo && matchConsumable && matchExpiry;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="12" class="empty-state">暂无数据</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(b => {
    const status = getExpiryStatus(b);
    return `
      <tr>
        <td>${b.id}</td>
        <td>${b.batch_no}</td>
        <td>${b.consumable?.name || '-'}</td>
        <td><strong>${b.quantity}</strong></td>
        <td>${b.consumable?.unit || '-'}</td>
        <td>${b.unit_price ? '¥' + b.unit_price : '-'}</td>
        <td>${b.supplier || '-'}</td>
        <td>${formatDate(b.production_date)}</td>
        <td>${formatDate(b.expiry_date)}</td>
        <td><span class="status-badge" style="background: ${status.class}">${status.text}</span></td>
        <td>${formatDateTime(b.created_at)}</td>
        <td>
          <div class="btn-group">
            <button class="btn btn-sm btn-info" data-action="edit" data-id="${b.id}">编辑</button>
            <button class="btn btn-sm btn-danger" data-action="delete" data-id="${b.id}">删除</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function bindEvents() {
  document.getElementById('add-batch-btn')?.addEventListener('click', () => showBatchModal());

  document.getElementById('search-batch-no')?.addEventListener('input', renderTable);
  document.getElementById('filter-consumable')?.addEventListener('change', renderTable);
  document.getElementById('filter-expiry')?.addEventListener('change', renderTable);
  document.getElementById('refresh-btn')?.addEventListener('click', loadData);

  document.getElementById('batches-tbody')?.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    const action = target.dataset.action;
    const id = parseInt(target.dataset.id || '0');

    if (action === 'edit') {
      const batch = batches.find(b => b.id === id);
      if (batch) showBatchModal(batch);
    } else if (action === 'delete') {
      if (confirm('确定要删除这个批次吗？')) {
        try {
          await api.batches.delete(id);
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

function showBatchModal(batch?: BatchWithConsumable) {
  const isEdit = !!batch;
  const form = document.createElement('form');

  const consumableOptions = [
    { value: '', label: '请选择耗材' },
    ...consumables.map(c => ({ value: String(c.id), label: c.name }))
  ];

  form.innerHTML = `
    <h3 class="form-title">${isEdit ? '编辑' : '新增'}批次</h3>
    ${createInput('批次号', 'text', batch?.batch_no || '', true).innerHTML}
    ${createSelect('耗材', consumableOptions, String(batch?.consumable_id || ''), true).innerHTML}
    ${createInput('数量', 'number', String(batch?.quantity || 0), true).innerHTML}
    ${createInput('单价', 'number', String(batch?.unit_price || '')).innerHTML}
    ${createInput('供应商', 'text', batch?.supplier || '').innerHTML}
    ${createInput('生产日期', 'date', batch?.production_date || '').innerHTML}
    ${createInput('过期日期', 'date', batch?.expiry_date || '').innerHTML}
    ${createTextarea('备注', batch?.remark || '').innerHTML}
    <div class="form-actions">
      <button type="button" class="btn btn-secondary" id="cancel-btn">取消</button>
      <button type="submit" class="btn btn-primary">${isEdit ? '保存' : '创建'}</button>
    </div>
  `;

  const inputs = form.querySelectorAll('input, select, textarea') as NodeListOf<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;
  inputs[0].name = 'batch_no';
  inputs[1].name = 'consumable_id';
  inputs[2].name = 'quantity';
  inputs[3].name = 'unit_price';
  inputs[4].name = 'supplier';
  inputs[5].name = 'production_date';
  inputs[6].name = 'expiry_date';
  inputs[7].name = 'remark';

  form.querySelector('#cancel-btn')?.addEventListener('click', hideModal);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = getFormData(form);
    data.consumable_id = parseInt(data.consumable_id);
    data.quantity = parseFloat(data.quantity);
    if (data.unit_price) data.unit_price = parseFloat(data.unit_price);

    try {
      if (isEdit && batch) {
        await api.batches.update(batch.id, data);
        showToast('更新成功', 'success');
      } else {
        await api.batches.create(data);
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

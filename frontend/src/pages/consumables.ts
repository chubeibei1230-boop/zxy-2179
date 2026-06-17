import { api } from '../api';
import {
  showToast, showModal, hideModal, createInput, createTextarea,
  createButton, getFormData, formatDateTime
} from '../utils';
import type { Consumable, ConsumableWithInventory, InventoryThreshold } from '../types';

let consumables: ConsumableWithInventory[] = [];
let thresholds: InventoryThreshold[] = [];

export async function renderConsumables(container: HTMLElement) {
  container.innerHTML = `
    <div class="page-header">
      <h2>耗材管理</h2>
      <button class="btn btn-primary" id="add-consumable-btn">+ 新增耗材</button>
    </div>
    <div class="filter-bar">
      <div class="form-group">
        <label>名称搜索</label>
        <input type="text" class="form-control" id="search-name" placeholder="输入耗材名称">
      </div>
      <div class="form-group">
        <label>分类</label>
        <select class="form-control" id="filter-category">
          <option value="">全部分类</option>
        </select>
      </div>
      <div class="form-group">
        <label>库存状态</label>
        <select class="form-control" id="filter-status">
          <option value="">全部状态</option>
          <option value="正常">正常</option>
          <option value="库存预警">库存预警</option>
          <option value="严重不足">严重不足</option>
        </select>
      </div>
      <button class="btn btn-secondary" id="refresh-btn">刷新</button>
    </div>
    <div class="section">
      <div class="table-container">
        <table id="consumables-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>名称</th>
              <th>规格</th>
              <th>单位</th>
              <th>分类</th>
              <th>当前库存</th>
              <th>最低阈值</th>
              <th>预警阈值</th>
              <th>状态</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody id="consumables-tbody">
            <tr><td colspan="11" style="text-align: center; padding: 2rem;">加载中...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  await loadData();
  bindEvents(container);
}

async function loadData() {
  try {
    [consumables, thresholds] = await Promise.all([
      api.consumables.listWithInventory(),
      api.thresholds.list()
    ]);
    renderTable();
    updateCategoryFilter();
  } catch (error) {
    showToast(`加载失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
  }
}

function updateCategoryFilter() {
  const categories = [...new Set(consumables.map(c => c.category).filter(Boolean))] as string[];
  const select = document.getElementById('filter-category') as HTMLSelectElement;
  if (select) {
    const currentValue = select.value;
    select.innerHTML = '<option value="">全部分类</option>' +
      categories.map(c => `<option value="${c}">${c}</option>`).join('');
    select.value = currentValue;
  }
}

function renderTable() {
  const tbody = document.getElementById('consumables-tbody');
  if (!tbody) return;

  const searchName = (document.getElementById('search-name') as HTMLInputElement)?.value || '';
  const filterCategory = (document.getElementById('filter-category') as HTMLSelectElement)?.value || '';
  const filterStatus = (document.getElementById('filter-status') as HTMLSelectElement)?.value || '';

  const filtered = consumables.filter(c => {
    const matchName = c.name.toLowerCase().includes(searchName.toLowerCase());
    const matchCategory = !filterCategory || c.category === filterCategory;
    const matchStatus = !filterStatus ||
      (filterStatus === '正常' && !c.threshold_status) ||
      c.threshold_status === filterStatus;
    return matchName && matchCategory && matchStatus;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11" class="empty-state">暂无数据</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(c => {
    const threshold = thresholds.find(t => t.consumable_id === c.id);
    const statusClass = c.threshold_status === '严重不足' ? '#e74c3c' :
                       c.threshold_status === '库存预警' ? '#f39c12' : '#27ae60';
    const statusText = c.threshold_status || '正常';

    return `
      <tr>
        <td>${c.id}</td>
        <td>${c.name}</td>
        <td>${c.specification || '-'}</td>
        <td>${c.unit}</td>
        <td>${c.category || '-'}</td>
        <td><strong>${c.total_quantity}</strong></td>
        <td>${threshold?.min_threshold || 0}</td>
        <td>${threshold?.warning_threshold || 0}</td>
        <td><span class="status-badge" style="background: ${statusClass}">${statusText}</span></td>
        <td>${formatDateTime(c.created_at)}</td>
        <td>
          <div class="btn-group">
            <button class="btn btn-sm btn-info" data-action="edit" data-id="${c.id}">编辑</button>
            <button class="btn btn-sm btn-warning" data-action="threshold" data-id="${c.id}">阈值</button>
            <button class="btn btn-sm btn-danger" data-action="delete" data-id="${c.id}">删除</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function bindEvents(container: HTMLElement) {
  document.getElementById('add-consumable-btn')?.addEventListener('click', () => showConsumableModal());

  document.getElementById('search-name')?.addEventListener('input', renderTable);
  document.getElementById('filter-category')?.addEventListener('change', renderTable);
  document.getElementById('filter-status')?.addEventListener('change', renderTable);
  document.getElementById('refresh-btn')?.addEventListener('click', loadData);

  document.getElementById('consumables-tbody')?.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    const action = target.dataset.action;
    const id = parseInt(target.dataset.id || '0');

    if (action === 'edit') {
      const consumable = consumables.find(c => c.id === id);
      if (consumable) showConsumableModal(consumable);
    } else if (action === 'threshold') {
      const consumable = consumables.find(c => c.id === id);
      const threshold = thresholds.find(t => t.consumable_id === id);
      if (consumable) showThresholdModal(consumable, threshold);
    } else if (action === 'delete') {
      if (confirm('确定要删除这个耗材吗？')) {
        try {
          await api.consumables.delete(id);
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

function showConsumableModal(consumable?: Consumable) {
  const isEdit = !!consumable;
  const form = document.createElement('form');
  form.innerHTML = `
    <h3 class="form-title">${isEdit ? '编辑' : '新增'}耗材</h3>
    ${createInput('名称', 'text', consumable?.name || '', true).innerHTML}
    ${createInput('规格', 'text', consumable?.specification || '').innerHTML}
    ${createInput('单位', 'text', consumable?.unit || '', true).innerHTML}
    ${createInput('分类', 'text', consumable?.category || '').innerHTML}
    ${createTextarea('描述', consumable?.description || '').innerHTML}
    <div class="form-actions">
      <button type="button" class="btn btn-secondary" id="cancel-btn">取消</button>
      <button type="submit" class="btn btn-primary">${isEdit ? '保存' : '创建'}</button>
    </div>
  `;

  const inputs = form.querySelectorAll('input, textarea');
  inputs[0].name = 'name';
  inputs[1].name = 'specification';
  inputs[2].name = 'unit';
  inputs[3].name = 'category';
  inputs[4].name = 'description';

  form.querySelector('#cancel-btn')?.addEventListener('click', hideModal);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = getFormData(form);

    try {
      if (isEdit && consumable) {
        await api.consumables.update(consumable.id, data);
        showToast('更新成功', 'success');
      } else {
        await api.consumables.create(data);
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

function showThresholdModal(consumable: Consumable, threshold?: InventoryThreshold) {
  const form = document.createElement('form');
  form.innerHTML = `
    <h3 class="form-title">设置库存阈值 - ${consumable.name}</h3>
    ${createInput('最低阈值', 'number', String(threshold?.min_threshold || 10), true).innerHTML}
    ${createInput('预警阈值', 'number', String(threshold?.warning_threshold || 20), true).innerHTML}
    <div class="form-actions">
      <button type="button" class="btn btn-secondary" id="cancel-btn">取消</button>
      <button type="submit" class="btn btn-primary">保存</button>
    </div>
  `;

  const inputs = form.querySelectorAll('input');
  inputs[0].name = 'min_threshold';
  inputs[1].name = 'warning_threshold';

  form.querySelector('#cancel-btn')?.addEventListener('click', hideModal);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = getFormData(form);
    data.consumable_id = consumable.id;
    data.min_threshold = parseFloat(data.min_threshold);
    data.warning_threshold = parseFloat(data.warning_threshold);

    try {
      if (threshold) {
        await api.thresholds.update(threshold.id, data);
      } else {
        await api.thresholds.create(data);
      }
      showToast('阈值设置成功', 'success');
      hideModal();
      loadData();
    } catch (error) {
      showToast(`操作失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
    }
  });

  showModal(form);
}

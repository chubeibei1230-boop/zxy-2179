import { api } from '../api';
import { showToast, createInput, formatDate } from '../utils';
import type { InventoryItem } from '../types';

let inventory: InventoryItem[] = [];
let expandedItems: Set<number> = new Set();

export async function renderInventory(container: HTMLElement) {
  container.innerHTML = `
    <div class="page-header">
      <h2>库存查询</h2>
      <button class="btn btn-secondary" id="refresh-btn">刷新</button>
    </div>
    <div class="filter-bar">
      <div class="form-group">
        <label>耗材名称</label>
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
      <div class="form-group">
        <label>批次临期</label>
        <select class="form-control" id="filter-expiring">
          <option value="">全部</option>
          <option value="yes">有临期批次</option>
          <option value="no">无临期批次</option>
        </select>
      </div>
    </div>
    <div class="section">
      <div class="table-container">
        <table id="inventory-table">
          <thead>
            <tr>
              <th style="width: 40px;"></th>
              <th>耗材名称</th>
              <th>规格</th>
              <th>单位</th>
              <th>分类</th>
              <th>当前库存</th>
              <th>最低阈值</th>
              <th>预警阈值</th>
              <th>状态</th>
              <th>批次数量</th>
            </tr>
          </thead>
          <tbody id="inventory-tbody">
            <tr><td colspan="10" style="text-align: center; padding: 2rem;">加载中...</td></tr>
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
    inventory = await api.inventory.getList();
    renderTable();
    updateCategoryFilter();
  } catch (error) {
    showToast(`加载失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
  }
}

function updateCategoryFilter() {
  const categories = [...new Set(inventory.map(c => c.category).filter(Boolean))] as string[];
  const select = document.getElementById('filter-category') as HTMLSelectElement;
  if (select) {
    const currentValue = select.value;
    select.innerHTML = '<option value="">全部分类</option>' +
      categories.map(c => `<option value="${c}">${c}</option>`).join('');
    select.value = currentValue;
  }
}

function renderTable() {
  const tbody = document.getElementById('inventory-tbody');
  if (!tbody) return;

  const searchName = (document.getElementById('search-name') as HTMLInputElement)?.value || '';
  const filterCategory = (document.getElementById('filter-category') as HTMLSelectElement)?.value || '';
  const filterStatus = (document.getElementById('filter-status') as HTMLSelectElement)?.value || '';
  const filterExpiring = (document.getElementById('filter-expiring') as HTMLSelectElement)?.value || '';

  const filtered = inventory.filter(item => {
    const matchName = item.consumable_name.toLowerCase().includes(searchName.toLowerCase());
    const matchCategory = !filterCategory || item.category === filterCategory;
    const matchStatus = !filterStatus ||
      (filterStatus === '正常' && !item.threshold_status) ||
      item.threshold_status === filterStatus;
    const hasExpiring = item.batches.some(b => b.is_expiring_soon);
    const matchExpiring = !filterExpiring ||
      (filterExpiring === 'yes' && hasExpiring) ||
      (filterExpiring === 'no' && !hasExpiring);
    return matchName && matchCategory && matchStatus && matchExpiring;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" class="empty-state">暂无数据</td></tr>';
    return;
  }

  let html = '';
  filtered.forEach(item => {
    const isExpanded = expandedItems.has(item.consumable_id);
    const statusClass = item.threshold_status === '严重不足' ? '#e74c3c' :
                       item.threshold_status === '库存预警' ? '#f39c12' : '#27ae60';
    const statusText = item.threshold_status || '正常';
    const hasExpiringBatch = item.batches.some(b => b.is_expiring_soon);

    html += `
      <tr class="clickable" data-id="${item.consumable_id}">
        <td><span class="expand-icon">${isExpanded ? '▼' : '▶'}</span></td>
        <td><strong>${item.consumable_name}</strong></td>
        <td>${item.specification || '-'}</td>
        <td>${item.unit}</td>
        <td>${item.category || '-'}</td>
        <td><strong>${item.total_quantity}</strong></td>
        <td>${item.min_threshold}</td>
        <td>${item.warning_threshold}</td>
        <td><span class="status-badge" style="background: ${statusClass}">${statusText}</span></td>
        <td>
          ${item.batches.length}个批次
          ${hasExpiringBatch ? '<span class="status-badge" style="background: #f39c12; margin-left: 4px;">临期</span>' : ''}
        </td>
      </tr>
    `;

    if (isExpanded) {
      html += `
        <tr class="expanded-row" data-parent-id="${item.consumable_id}">
          <td colspan="10">
            <div class="expanded-content">
              <h4 style="margin: 0 0 0.5rem 0;">批次明细</h4>
              <table class="inner-table">
                <thead>
                  <tr>
                    <th>批次号</th>
                    <th>生产日期</th>
                    <th>过期日期</th>
                    <th>剩余数量</th>
                    <th>单价</th>
                    <th>供应商</th>
                    <th>状态</th>
                    <th>备注</th>
                  </tr>
                </thead>
                <tbody>
                  ${item.batches.map(batch => {
                    const expiringClass = batch.is_expiring_soon ? '#f39c12' : '#27ae60';
                    const expiringText = batch.is_expiring_soon ? '临期' : '正常';
                    return `
                      <tr>
                        <td><code>${batch.batch_no}</code></td>
                        <td>${formatDate(batch.production_date)}</td>
                        <td>${formatDate(batch.expiry_date)}</td>
                        <td><strong>${batch.quantity}</strong></td>
                        <td>${batch.unit_price ? '¥' + batch.unit_price.toFixed(2) : '-'}</td>
                        <td>${batch.supplier || '-'}</td>
                        <td><span class="status-badge" style="background: ${expiringClass}">${expiringText}</span></td>
                        <td>${batch.remark || '-'}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      `;
    }
  });

  tbody.innerHTML = html;
}

function bindEvents(container: HTMLElement) {
  document.getElementById('refresh-btn')?.addEventListener('click', loadData);

  document.getElementById('search-name')?.addEventListener('input', renderTable);
  document.getElementById('filter-category')?.addEventListener('change', renderTable);
  document.getElementById('filter-status')?.addEventListener('change', renderTable);
  document.getElementById('filter-expiring')?.addEventListener('change', renderTable);

  document.getElementById('inventory-tbody')?.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const row = target.closest('tr[data-id]') as HTMLTableRowElement;
    if (row) {
      const id = parseInt(row.dataset.id || '0');
      if (expandedItems.has(id)) {
        expandedItems.delete(id);
      } else {
        expandedItems.add(id);
      }
      renderTable();
    }
  });
}

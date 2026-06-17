import { api } from '../api';
import { formatDate } from '../utils';
import { StatusColors } from '../types';
import type { DashboardStats, LowInventoryItem, ExpiringBatchItem, MissingFeedbackItem, AbnormalConsumptionItem } from '../types';

export async function renderDashboard(container: HTMLElement) {
  container.innerHTML = `
    <div class="page-header">
      <h2>系统概览</h2>
    </div>
    <div id="dashboard-content">
      <div style="text-align: center; padding: 2rem;">加载中...</div>
    </div>
  `;

  try {
    const [stats, lowInventory, expiringBatches, missingFeedbacks, abnormalConsumptions] = await Promise.all([
      api.dashboard.getStats(),
      api.dashboard.getLowInventory(),
      api.dashboard.getExpiringBatches(30),
      api.dashboard.getMissingFeedbacks(),
      api.dashboard.getAbnormalConsumptions(0.2)
    ]);

    renderDashboardContent(container, stats, lowInventory, expiringBatches, missingFeedbacks, abnormalConsumptions);
  } catch (error) {
    container.innerHTML = `<div class="alert alert-danger">加载数据失败: ${error instanceof Error ? error.message : '未知错误'}</div>`;
  }
}

function renderDashboardContent(
  container: HTMLElement,
  stats: DashboardStats,
  lowInventory: LowInventoryItem[],
  expiringBatches: ExpiringBatchItem[],
  missingFeedbacks: MissingFeedbackItem[],
  abnormalConsumptions: AbnormalConsumptionItem[]
) {
  const content = container.querySelector('#dashboard-content');
  if (!content) return;

  content.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card ${stats.low_inventory_count > 0 ? 'danger' : ''}">
        <div class="stat-value">${stats.low_inventory_count}</div>
        <div class="stat-label">库存预警</div>
      </div>
      <div class="stat-card ${stats.expiring_batches_count > 0 ? 'warning' : ''}">
        <div class="stat-value">${stats.expiring_batches_count}</div>
        <div class="stat-label">批次临期</div>
      </div>
      <div class="stat-card ${stats.missing_feedback_count > 0 ? 'warning' : ''}">
        <div class="stat-value">${stats.missing_feedback_count}</div>
        <div class="stat-label">反馈缺失</div>
      </div>
      <div class="stat-card success">
        <div class="stat-value">${stats.feedback_completion_rate}%</div>
        <div class="stat-label">反馈完成率</div>
      </div>
      <div class="stat-card ${stats.abnormal_consumption_count > 0 ? 'danger' : ''}">
        <div class="stat-value">${stats.abnormal_consumption_count}</div>
        <div class="stat-label">异常消耗</div>
      </div>
    </div>

    <div class="section">
      <h3 class="section-title">申请流转状态</h3>
      <div class="flow-chart">
        ${Object.entries(stats.application_flow).map(([status, count]) => `
          <div class="flow-item ${count > 0 ? 'active' : ''}">
            <div class="count" style="color: ${StatusColors[status] || '#333'}">${count}</div>
            <div class="label">${status}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 1.5rem;">
      <div class="section">
        <h3 class="section-title">低库存预警</h3>
        ${lowInventory.length > 0 ? `
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>耗材名称</th>
                  <th>当前库存</th>
                  <th>预警阈值</th>
                  <th>最低阈值</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                ${lowInventory.map(item => `
                  <tr>
                    <td>${item.consumable_name}</td>
                    <td>${item.total_quantity}</td>
                    <td>${item.warning_threshold}</td>
                    <td>${item.min_threshold}</td>
                    <td><span class="status-badge" style="background: ${item.status === '严重不足' ? '#e74c3c' : '#f39c12'}">${item.status}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : '<div class="empty-state">暂无低库存预警</div>'}
      </div>

      <div class="section">
        <h3 class="section-title">临期批次 (30天内)</h3>
        ${expiringBatches.length > 0 ? `
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>批次号</th>
                  <th>耗材名称</th>
                  <th>过期日期</th>
                  <th>剩余数量</th>
                  <th>剩余天数</th>
                </tr>
              </thead>
              <tbody>
                ${expiringBatches.map(item => `
                  <tr>
                    <td>${item.batch_no}</td>
                    <td>${item.consumable_name}</td>
                    <td>${formatDate(item.expiry_date)}</td>
                    <td>${item.remaining_quantity}</td>
                    <td style="color: ${item.days_to_expiry <= 7 ? '#e74c3c' : '#f39c12'}">${item.days_to_expiry}天</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : '<div class="empty-state">暂无临期批次</div>'}
      </div>

      <div class="section">
        <h3 class="section-title">待反馈申请</h3>
        ${missingFeedbacks.length > 0 ? `
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>申请单号</th>
                  <th>课程名称</th>
                  <th>申请人</th>
                  <th>发放时间</th>
                  <th>待反馈项</th>
                </tr>
              </thead>
              <tbody>
                ${missingFeedbacks.map(item => `
                  <tr>
                    <td>${item.application_no}</td>
                    <td>${item.course_name}</td>
                    <td>${item.applicant}</td>
                    <td>${formatDate(item.distributed_at)}</td>
                    <td>${item.pending_items}项</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : '<div class="empty-state">暂无待反馈申请</div>'}
      </div>

      <div class="section">
        <h3 class="section-title">异常消耗记录</h3>
        ${abnormalConsumptions.length > 0 ? `
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>申请单号</th>
                  <th>课程名称</th>
                  <th>耗材名称</th>
                  <th>申请量</th>
                  <th>使用量</th>
                  <th>偏差率</th>
                  <th>异常</th>
                </tr>
              </thead>
              <tbody>
                ${abnormalConsumptions.map(item => `
                  <tr>
                    <td>${item.application_no}</td>
                    <td>${item.course_name}</td>
                    <td>${item.consumable_name}</td>
                    <td>${item.requested_quantity}</td>
                    <td>${item.usage_quantity}</td>
                    <td style="color: ${item.deviation_rate > 50 ? '#e74c3c' : '#f39c12'}">${item.deviation_rate}%</td>
                    <td>${item.has_exception ? '<span class="status-badge" style="background: #e74c3c">是</span>' : '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : '<div class="empty-state">暂无异常消耗记录</div>'}
      </div>
    </div>
  `;
}

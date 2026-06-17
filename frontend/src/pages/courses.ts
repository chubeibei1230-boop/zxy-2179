import { api } from '../api';
import {
  showToast, showModal, hideModal, createInput, createTextarea,
  getFormData, formatDate, formatDateTime
} from '../utils';
import type { Course } from '../types';

let courses: Course[] = [];

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
    courses = await api.courses.list();
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

    if (action === 'edit') {
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

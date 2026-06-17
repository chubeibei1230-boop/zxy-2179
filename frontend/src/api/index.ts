import type {
  Consumable, ConsumableWithInventory, Batch, BatchWithConsumable, Course,
  Application, ApplicationFilter, DashboardStats, LowInventoryItem,
  ExpiringBatchItem, AbnormalConsumptionItem, MissingFeedbackItem,
  InventoryItem, Feedback, InventoryThreshold
} from '../types';

const API_BASE = '/api';

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: '请求失败' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  dashboard: {
    getStats: () => request<DashboardStats>('/dashboard/stats'),
    getLowInventory: () => request<LowInventoryItem[]>('/dashboard/low-inventory'),
    getExpiringBatches: (days = 30) => request<ExpiringBatchItem[]>(`/dashboard/expiring-batches?days=${days}`),
    getMissingFeedbacks: () => request<MissingFeedbackItem[]>('/dashboard/missing-feedbacks'),
    getAbnormalConsumptions: (threshold = 0.2) => request<AbnormalConsumptionItem[]>(`/dashboard/abnormal-consumptions?threshold=${threshold}`)
  },

  inventory: {
    getList: () => request<InventoryItem[]>('/inventory')
  },

  consumables: {
    list: (params?: { name?: string; category?: string; skip?: number; limit?: number }) => {
      const query = new URLSearchParams();
      if (params?.name) query.append('name', params.name);
      if (params?.category) query.append('category', params.category);
      if (params?.skip) query.append('skip', String(params.skip));
      if (params?.limit) query.append('limit', String(params.limit));
      return request<Consumable[]>(`/consumables?${query.toString()}`);
    },
    listWithInventory: () => request<ConsumableWithInventory[]>('/consumables/with-inventory'),
    get: (id: number) => request<Consumable>(`/consumables/${id}`),
    create: (data: Partial<Consumable>) => request<Consumable>('/consumables', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    update: (id: number, data: Partial<Consumable>) => request<Consumable>(`/consumables/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    delete: (id: number) => request(`/consumables/${id}`, { method: 'DELETE' })
  },

  batches: {
    list: (params?: { batch_no?: string; consumable_id?: number; skip?: number; limit?: number }) => {
      const query = new URLSearchParams();
      if (params?.batch_no) query.append('batch_no', params.batch_no);
      if (params?.consumable_id) query.append('consumable_id', String(params.consumable_id));
      if (params?.skip) query.append('skip', String(params.skip));
      if (params?.limit) query.append('limit', String(params.limit));
      return request<BatchWithConsumable[]>(`/batches?${query.toString()}`);
    },
    get: (id: number) => request<BatchWithConsumable>(`/batches/${id}`),
    create: (data: Partial<Batch>) => request<Batch>('/batches', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    update: (id: number, data: Partial<Batch>) => request<Batch>(`/batches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    delete: (id: number) => request(`/batches/${id}`, { method: 'DELETE' })
  },

  courses: {
    list: (params?: { course_name?: string; teacher?: string; skip?: number; limit?: number }) => {
      const query = new URLSearchParams();
      if (params?.course_name) query.append('course_name', params.course_name);
      if (params?.teacher) query.append('teacher', params.teacher);
      if (params?.skip) query.append('skip', String(params.skip));
      if (params?.limit) query.append('limit', String(params.limit));
      return request<Course[]>(`/courses?${query.toString()}`);
    },
    get: (id: number) => request<Course>(`/courses/${id}`),
    create: (data: Partial<Course>) => request<Course>('/courses', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    update: (id: number, data: Partial<Course>) => request<Course>(`/courses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    delete: (id: number) => request(`/courses/${id}`, { method: 'DELETE' })
  },

  thresholds: {
    list: () => request<InventoryThreshold[]>('/thresholds'),
    create: (data: Partial<InventoryThreshold>) => request<InventoryThreshold>('/thresholds', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    update: (id: number, data: Partial<InventoryThreshold>) => request<InventoryThreshold>(`/thresholds/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  },

  applications: {
    list: (filters?: ApplicationFilter & { skip?: number; limit?: number }) => {
      const query = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            query.append(key, String(value));
          }
        });
      }
      return request<Application[]>(`/applications?${query.toString()}`);
    },
    get: (id: number) => request<Application>(`/applications/${id}`),
    create: (data: { course_id: number; applicant: string; purpose?: string; items: any[] }) => request<Application>('/applications', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    update: (id: number, data: any) => request<Application>(`/applications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    delete: (id: number) => request(`/applications/${id}`, { method: 'DELETE' }),
    submit: (id: number) => request<Application>(`/applications/${id}/submit`, { method: 'POST' }),
    review: (id: number, data: { approved: boolean; review_comment?: string; reviewer: string }) => request<Application>(`/applications/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    prepare: (id: number, data: { prepared_by: string; items: any[] }) => request<Application>(`/applications/${id}/prepare`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    distribute: (id: number, data: { distributed_by: string }) => request<Application>(`/applications/${id}/distribute`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    check: (id: number, data: { items: any[] }) => request<Application>(`/applications/${id}/check`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    close: (id: number, data: { closed_by: string }) => request<Application>(`/applications/${id}/close`, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },

  feedbacks: {
    list: (params?: { application_id?: number; skip?: number; limit?: number }) => {
      const query = new URLSearchParams();
      if (params?.application_id) query.append('application_id', String(params.application_id));
      if (params?.skip) query.append('skip', String(params.skip));
      if (params?.limit) query.append('limit', String(params.limit));
      return request<Feedback[]>(`/feedbacks?${query.toString()}`);
    },
    create: (data: Partial<Feedback>) => request<Feedback>('/feedbacks', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    update: (id: number, data: Partial<Feedback>) => request<Feedback>(`/feedbacks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    delete: (id: number) => request(`/feedbacks/${id}`, { method: 'DELETE' })
  }
};

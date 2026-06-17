export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
}

export function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.className = `toast toast-${type}`;
  toast.classList.remove('hidden');

  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}

export function showModal(content: string | HTMLElement) {
  const modal = document.getElementById('modal');
  const modalBody = document.getElementById('modal-body');
  if (!modal || !modalBody) return;

  modalBody.innerHTML = '';
  if (typeof content === 'string') {
    modalBody.innerHTML = content;
  } else {
    modalBody.appendChild(content);
  }
  modal.classList.remove('hidden');
}

export function hideModal() {
  const modal = document.getElementById('modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

export function createInput(label: string, type: string = 'text', value: string = '', required: boolean = false): HTMLDivElement {
  const div = document.createElement('div');
  div.className = 'form-group';

  const labelEl = document.createElement('label');
  labelEl.textContent = label;
  if (required) {
    const span = document.createElement('span');
    span.className = 'required';
    span.textContent = ' *';
    labelEl.appendChild(span);
  }

  const input = document.createElement('input');
  input.type = type;
  input.className = 'form-control';
  input.value = value;
  if (required) {
    input.required = true;
  }

  div.appendChild(labelEl);
  div.appendChild(input);
  return div;
}

export function createSelect(label: string, options: { value: string; label: string }[], value: string = '', required: boolean = false): HTMLDivElement {
  const div = document.createElement('div');
  div.className = 'form-group';

  const labelEl = document.createElement('label');
  labelEl.textContent = label;
  if (required) {
    const span = document.createElement('span');
    span.className = 'required';
    span.textContent = ' *';
    labelEl.appendChild(span);
  }

  const select = document.createElement('select');
  select.className = 'form-control';
  if (required) {
    select.required = true;
  }

  options.forEach(opt => {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = opt.label;
    if (opt.value === value) {
      option.selected = true;
    }
    select.appendChild(option);
  });

  div.appendChild(labelEl);
  div.appendChild(select);
  return div;
}

export function createTextarea(label: string, value: string = '', required: boolean = false): HTMLDivElement {
  const div = document.createElement('div');
  div.className = 'form-group';

  const labelEl = document.createElement('label');
  labelEl.textContent = label;
  if (required) {
    const span = document.createElement('span');
    span.className = 'required';
    span.textContent = ' *';
    labelEl.appendChild(span);
  }

  const textarea = document.createElement('textarea');
  textarea.className = 'form-control';
  textarea.rows = 3;
  textarea.value = value;
  if (required) {
    textarea.required = true;
  }

  div.appendChild(labelEl);
  div.appendChild(textarea);
  return div;
}

export function createButton(text: string, className: string = '', onClick?: () => void): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = `btn ${className}`;
  btn.textContent = text;
  if (onClick) {
    btn.addEventListener('click', onClick);
  }
  return btn;
}

export function getFormData(form: HTMLFormElement): Record<string, any> {
  const data: Record<string, any> = {};
  const formData = new FormData(form);
  formData.forEach((value, key) => {
    data[key] = value;
  });
  return data;
}

export function getFormElements(form: HTMLFormElement): Record<string, HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> {
  const elements: Record<string, any> = {};
  Array.from(form.elements).forEach(el => {
    if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
      if (el.name) {
        elements[el.name] = el;
      }
    }
  });
  return elements;
}

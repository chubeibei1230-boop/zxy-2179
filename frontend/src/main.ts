import { renderDashboard } from './pages/dashboard';
import { renderConsumables } from './pages/consumables';
import { renderBatches } from './pages/batches';
import { renderCourses } from './pages/courses';
import { renderTemplates } from './pages/templates';
import { renderApplications } from './pages/applications';
import { renderInventory } from './pages/inventory';
import type { PageType } from './types';

const content = document.getElementById('content') as HTMLElement;
const navButtons = document.querySelectorAll('.nav-btn');

async function navigateTo(page: PageType) {
  navButtons.forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('data-page') === page) {
      btn.classList.add('active');
    }
  });

  switch (page) {
    case 'dashboard':
      await renderDashboard(content);
      break;
    case 'consumables':
      await renderConsumables(content);
      break;
    case 'batches':
      await renderBatches(content);
      break;
    case 'courses':
      await renderCourses(content);
      break;
    case 'templates':
      await renderTemplates(content);
      break;
    case 'applications':
      await renderApplications(content);
      break;
    case 'inventory':
      await renderInventory(content);
      break;
    default:
      await renderDashboard(content);
  }
}

(window as any).navigateTo = navigateTo;

navButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const page = btn.getAttribute('data-page') as PageType;
    if (page) {
      navigateTo(page);
    }
  });
});

navigateTo('dashboard');

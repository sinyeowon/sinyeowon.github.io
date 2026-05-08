const ATTR_DISPLAY = 'sidebar-display';
const $sidebar = document.getElementById('sidebar');
const $trigger = document.getElementById('sidebar-trigger');
const $mask = document.getElementById('mask');
const $viewStats = document.querySelector('[data-goatcounter-site]');
const $totalViews = document.querySelector('[data-view-total]');
const $todayViews = document.querySelector('[data-view-today]');

class SidebarUtil {
  static #isExpanded = false;

  static toggle() {
    this.#isExpanded = !this.#isExpanded;
    document.body.toggleAttribute(ATTR_DISPLAY, this.#isExpanded);
    $sidebar.classList.toggle('z-2', this.#isExpanded);
    $mask.classList.toggle('d-none', !this.#isExpanded);
  }
}

export function initSidebar() {
  $trigger.onclick = $mask.onclick = () => SidebarUtil.toggle();
  initViewStats();
}

function getKoreaDateString() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const parts = formatter
    .formatToParts(new Date())
    .reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {});

  return `${parts.year}-${parts.month}-${parts.day}`;
}

function normalizeCount(data) {
  const rawCount = data.count ?? data.count_unique ?? 0;
  return Number(String(rawCount).replace(/\D/g, '')) || 0;
}

async function fetchCounter(siteCode, query = '') {
  const url = `https://${siteCode}.goatcounter.com/counter/.json${query}`;
  const response = await fetch(url, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error('Failed to fetch GoatCounter stats');
  }

  return normalizeCount(await response.json());
}

function displayCount(element, count) {
  element.textContent = new Intl.NumberFormat('ko-KR').format(count);
}

async function initViewStats() {
  if (!$viewStats || !$totalViews || !$todayViews) {
    return;
  }

  const siteCode = $viewStats.getAttribute('data-goatcounter-site');

  if (!siteCode) {
    return;
  }

  try {
    const today = getKoreaDateString();
    const [totalCount, todayCount] = await Promise.all([
      fetchCounter(siteCode),
      fetchCounter(siteCode, `?start=${today}`)
    ]);

    displayCount($totalViews, totalCount);
    displayCount($todayViews, todayCount);
  } catch {
    displayCount($totalViews, 0);
    displayCount($todayViews, 0);
  }
}

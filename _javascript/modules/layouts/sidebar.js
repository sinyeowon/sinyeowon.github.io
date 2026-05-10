const ATTR_DISPLAY = 'sidebar-display';
const $sidebar = document.getElementById('sidebar');
const $trigger = document.getElementById('sidebar-trigger');
const $mask = document.getElementById('mask');
const $viewStats = document.querySelector('[data-goatcounter-site]');
const $totalViews = document.querySelector('[data-view-total]');
const $todayViews = document.querySelector('[data-view-today]');
const VIEW_STATS_CACHE_KEY = 'sinyeowon:view-stats';

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

function displayUnavailable(element) {
  element.textContent = '-';
}

function getCachedViewStats(today) {
  try {
    const cache = JSON.parse(localStorage.getItem(VIEW_STATS_CACHE_KEY) || '{}');

    return {
      total: Number.isFinite(cache.total) ? cache.total : null,
      today: cache.todayDate === today && Number.isFinite(cache.today) ? cache.today : null
    };
  } catch {
    return { total: null, today: null };
  }
}

function setCachedViewStats(stats) {
  try {
    localStorage.setItem(VIEW_STATS_CACHE_KEY, JSON.stringify(stats));
  } catch {
    // Ignore private-mode or storage permission failures.
  }
}

async function initViewStats() {
  if (!$viewStats || !$totalViews || !$todayViews) {
    return;
  }

  const siteCode = $viewStats.getAttribute('data-goatcounter-site');

  if (!siteCode) {
    return;
  }

  const today = getKoreaDateString();
  const cachedStats = getCachedViewStats(today);

  if (cachedStats.total !== null) {
    displayCount($totalViews, cachedStats.total);
  }

  if (cachedStats.today !== null) {
    displayCount($todayViews, cachedStats.today);
  }

  try {
    const [totalResult, todayResult] = await Promise.allSettled([
      fetchCounter(siteCode),
      fetchCounter(siteCode, `?start=${today}`)
    ]);

    const nextStats = {
      total: cachedStats.total,
      today: cachedStats.today,
      todayDate: today
    };

    if (totalResult.status === 'fulfilled') {
      nextStats.total = totalResult.value;
      displayCount($totalViews, nextStats.total);
    } else if (cachedStats.total === null) {
      displayUnavailable($totalViews);
    }

    if (todayResult.status === 'fulfilled') {
      nextStats.today = todayResult.value;
      displayCount($todayViews, nextStats.today);
    } else if (cachedStats.today === null) {
      displayUnavailable($todayViews);
    }

    if (nextStats.total !== null || nextStats.today !== null) {
      setCachedViewStats(nextStats);
    }
  } catch {
    if (cachedStats.total !== null || cachedStats.today !== null) {
      return;
    }

    displayUnavailable($totalViews);
    displayUnavailable($todayViews);
  }
}

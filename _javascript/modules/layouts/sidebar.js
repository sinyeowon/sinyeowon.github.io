const ATTR_DISPLAY = 'sidebar-display';
const $sidebar = document.getElementById('sidebar');
const $trigger = document.getElementById('sidebar-trigger');
const $mask = document.getElementById('mask');
const $viewStats = document.querySelector('[data-view-stats-endpoint]');
const $totalViews = document.querySelector('[data-view-total]');
const $todayViews = document.querySelector('[data-view-today]');
const VIEW_STATS_CACHE_KEY = 'sinyeowon:view-stats';
const LOCAL_HOSTS = new Set(['', 'localhost', '127.0.0.1', '0.0.0.0']);

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

function normalizeCount(value) {
  const rawCount = value ?? 0;
  return Number(String(rawCount).replace(/\D/g, '')) || 0;
}

async function requestViewStats(endpoint, shouldIncrement) {
  const requestUrl = new URL(endpoint, window.location.origin);
  const postUrl = window.location.pathname;
  const options = {
    cache: 'no-store',
    headers: {
      Accept: 'application/json'
    }
  };

  if (shouldIncrement) {
    options.method = 'POST';
    options.keepalive = true;
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify({ url: postUrl });
  } else {
    requestUrl.searchParams.set('url', postUrl);
  }

  const response = await fetch(requestUrl.toString(), options);

  if (!response.ok) {
    throw new Error('Failed to fetch view stats');
  }

  const data = await response.json();

  return {
    total: normalizeCount(data.total),
    today: normalizeCount(data.today)
  };
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

  const endpoint = $viewStats.getAttribute('data-view-stats-endpoint');

  if (!endpoint) {
    return;
  }

  const today = getKoreaDateString();
  const cachedStats = getCachedViewStats(today);
  const shouldIncrement = !LOCAL_HOSTS.has(window.location.hostname);

  if (cachedStats.total !== null) {
    displayCount($totalViews, cachedStats.total);
  }

  if (cachedStats.today !== null) {
    displayCount($todayViews, cachedStats.today);
  }

  try {
    const viewStats = await requestViewStats(endpoint, shouldIncrement);
    const nextStats = { ...viewStats, todayDate: today };

    displayCount($totalViews, nextStats.total);
    displayCount($todayViews, nextStats.today);
    setCachedViewStats(nextStats);
  } catch {
    if (cachedStats.total !== null || cachedStats.today !== null) {
      return;
    }

    displayUnavailable($totalViews);
    displayUnavailable($todayViews);
  }
}

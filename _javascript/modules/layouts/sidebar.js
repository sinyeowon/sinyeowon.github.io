const ATTR_DISPLAY = 'sidebar-display';
const $sidebar = document.getElementById('sidebar');
const $trigger = document.getElementById('sidebar-trigger');
const $mask = document.getElementById('mask');
const $visitorStats = document.querySelector('[data-visitor-stats-endpoint]');
const $totalViews = document.querySelector('[data-view-total]');
const $todayViews = document.querySelector('[data-view-today]');
const VISITOR_STATS_CACHE_KEY = 'sinyeowon:visitor-stats';
const VISITOR_ID_KEY = 'sinyeowon:visitor-id';
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
  initVisitorStats();
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

function storageGet(key) {
  try {
    return localStorage.getItem(key) || sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return;
  } catch {
    // Fall through to session storage.
  }

  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Ignore browsers that block all storage.
  }
}

function createVisitorId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }

  const randomPart = Math.random().toString(36).slice(2);
  return `${Date.now().toString(36)}-${randomPart}`;
}

function getVisitorId() {
  const saved = storageGet(VISITOR_ID_KEY);

  if (saved) {
    return saved;
  }

  const next = createVisitorId();
  storageSet(VISITOR_ID_KEY, next);
  return next;
}

async function requestVisitorStats(endpoint, shouldRecordVisit) {
  const requestUrl = new URL(endpoint, window.location.origin);
  const postUrl = window.location.pathname;
  const options = {
    cache: 'no-store',
    headers: {
      Accept: 'application/json'
    }
  };

  if (shouldRecordVisit) {
    options.method = 'POST';
    options.keepalive = true;
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify({
      url: postUrl,
      visitor_id: getVisitorId()
    });
  } else {
    requestUrl.searchParams.set('url', postUrl);
  }

  const response = await fetch(requestUrl.toString(), options);

  if (!response.ok) {
    throw new Error('Failed to fetch visitor stats');
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
    const cache = JSON.parse(
      localStorage.getItem(VISITOR_STATS_CACHE_KEY) || '{}'
    );

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
    localStorage.setItem(VISITOR_STATS_CACHE_KEY, JSON.stringify(stats));
  } catch {
    // Ignore private-mode or storage permission failures.
  }
}

async function initVisitorStats() {
  if (!$visitorStats || !$totalViews || !$todayViews) {
    return;
  }

  const endpoint = $visitorStats.getAttribute('data-visitor-stats-endpoint');

  if (!endpoint) {
    return;
  }

  const today = getKoreaDateString();
  const cachedStats = getCachedViewStats(today);
  const shouldRecordVisit = !LOCAL_HOSTS.has(window.location.hostname);

  if (cachedStats.total !== null) {
    displayCount($totalViews, cachedStats.total);
  }

  if (cachedStats.today !== null) {
    displayCount($todayViews, cachedStats.today);
  }

  try {
    const visitorStats = await requestVisitorStats(endpoint, shouldRecordVisit);
    const nextStats = { ...visitorStats, todayDate: today };

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

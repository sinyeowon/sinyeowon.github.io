const LIKE_SELECTOR = '[data-post-like]';
const STORAGE_PREFIX = 'sinyeowon:post-likes';

function normalizeCount(value) {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? count : 0;
}

function formatCount(count) {
  return new Intl.NumberFormat('ko-KR').format(normalizeCount(count));
}

function getStorageKey(postUrl) {
  return `${STORAGE_PREFIX}:${postUrl}:liked`;
}

function getLiked(postUrl) {
  try {
    return localStorage.getItem(getStorageKey(postUrl)) === 'true';
  } catch {
    return false;
  }
}

function setLiked(postUrl, liked) {
  try {
    localStorage.setItem(getStorageKey(postUrl), liked ? 'true' : 'false');
  } catch {
    return;
  }
}

function setStatus($status, message) {
  if (!$status) {
    return;
  }

  $status.textContent = message;
}

function render({ $button, $count, $icon, liked, count }) {
  $button.setAttribute('aria-pressed', liked ? 'true' : 'false');
  $button.classList.toggle('is-liked', liked);
  $count.textContent = formatCount(count);

  if ($icon) {
    $icon.classList.toggle('far', !liked);
    $icon.classList.toggle('fas', liked);
  }
}

async function requestLike(endpoint, postUrl, method, body) {
  const options = {
    method,
    headers: {
      Accept: 'application/json'
    },
    cache: 'no-store'
  };

  let url = endpoint;

  if (method === 'GET') {
    url = `${endpoint}?url=${encodeURIComponent(postUrl)}`;
  } else {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`Like API failed with ${response.status}`);
  }

  return response.json();
}

function initSinglePostLike($root) {
  const endpoint = $root.dataset.likeEndpoint;
  const postUrl = $root.dataset.postUrl;
  const $button = $root.querySelector('[data-post-like-button]');
  const $count = $root.querySelector('[data-post-like-count]');
  const $icon = $root.querySelector('[data-post-like-icon]');
  const $status = $root.querySelector('[data-post-like-status]');

  if (!endpoint || !postUrl || !$button || !$count) {
    return;
  }

  let liked = getLiked(postUrl);
  let count = normalizeCount($count.textContent);
  let pending = false;

  render({ $button, $count, $icon, liked, count });

  requestLike(endpoint, postUrl, 'GET')
    .then((data) => {
      count = normalizeCount(data.count);
      render({ $button, $count, $icon, liked, count });
    })
    .catch(() => {
      setStatus($status, '좋아요 수를 불러오지 못했습니다.');
    });

  $button.addEventListener('click', async () => {
    if (pending) {
      return;
    }

    const nextLiked = !liked;
    pending = true;
    $button.disabled = true;
    setStatus($status, '');

    try {
      const data = await requestLike(endpoint, postUrl, 'POST', {
        url: postUrl,
        action: nextLiked ? 'like' : 'unlike'
      });

      liked = nextLiked;
      count = normalizeCount(data.count);
      setLiked(postUrl, liked);
      render({ $button, $count, $icon, liked, count });
    } catch {
      setStatus($status, '잠시 후 다시 시도해 주세요.');
    } finally {
      pending = false;
      $button.disabled = false;
    }
  });
}

export function initPostLike() {
  document.querySelectorAll(LIKE_SELECTOR).forEach(initSinglePostLike);
}

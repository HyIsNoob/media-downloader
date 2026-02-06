// queue-manager.js - Download queue with pause, resume, cancel

let queue = [];
let queuePaused = false;

document.addEventListener('DOMContentLoaded', () => {
  setupQueuePage();
  refreshQueue();
  if (window.electron && window.electron.onQueueUpdate) {
    window.electron.onQueueUpdate((q) => {
      queue = Array.isArray(q) ? q : [];
      queuePaused = !!queue.find(j => j.status === 'paused') || !queue.some(j => j.status === 'downloading');
      renderQueue();
      updateQueueBadge();
    });
  }
  if (window.electron && window.electron.onQueueItemProgress) {
    window.electron.onQueueItemProgress(({ jobId, progress }) => {
      const job = queue.find(j => j.id === jobId);
      if (job) {
        job.progress = progress;
        updateJobProgressInDOM(jobId, progress);
      }
    });
  }
  window.addToQueue = addToQueue;
});

function setupQueuePage() {
  const pauseBtn = document.getElementById('queuePauseBtn');
  const resumeBtn = document.getElementById('queueResumeBtn');
  if (pauseBtn) pauseBtn.addEventListener('click', () => window.electron.queuePause());
  if (resumeBtn) resumeBtn.addEventListener('click', () => window.electron.queueResume());
  document.querySelectorAll('.nav-link[data-page="queue"]').forEach(link => {
    link.addEventListener('click', () => refreshQueue());
  });
}

async function refreshQueue() {
  try {
    queue = await window.electron.queueGet() || [];
  } catch (e) {
    queue = [];
  }
  renderQueue();
  updateQueueBadge();
}

function updateQueueBadge() {
  const pending = queue.filter(j => j.status === 'pending' || j.status === 'downloading').length;
  const badge = document.getElementById('queue-badge');
  if (!badge) return;
  if (pending > 0) {
    badge.textContent = pending;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

function updateJobProgressInDOM(jobId, progress) {
  const bar = document.querySelector(`[data-queue-id="${jobId}"] .queue-item-progress-bar`);
  const pct = progress && typeof progress.percent === 'number' ? progress.percent : 0;
  if (bar) bar.style.width = pct + '%';
  const speedEl = document.querySelector(`[data-queue-id="${jobId}"] .queue-item-speed`);
  if (speedEl && progress && progress.speedBytes) speedEl.textContent = formatSpeed(progress.speedBytes);
}

function renderQueue() {
  const container = document.getElementById('queueItems');
  const empty = document.getElementById('queueEmpty');
  const summary = document.getElementById('queueSummary');
  if (!container || !empty) return;

  const pending = queue.filter(j => j.status === 'pending').length;
  const downloading = queue.filter(j => j.status === 'downloading').length;
  const completed = queue.filter(j => j.status === 'completed').length;
  const failed = queue.filter(j => j.status === 'failed').length;
  if (summary) summary.textContent = `${pending} pending · ${downloading} downloading${completed ? ` · ${completed} done` : ''}${failed ? ` · ${failed} failed` : ''}`;

  if (queue.length === 0) {
    container.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  container.innerHTML = queue.map(job => renderQueueItem(job)).join('');

  queue.forEach(job => {
    const wrap = container.querySelector(`[data-queue-id="${job.id}"]`);
    if (!wrap) return;
    const cancelBtn = wrap.querySelector('.queue-cancel');
    const removeBtn = wrap.querySelector('.queue-remove');
    if (cancelBtn) cancelBtn.addEventListener('click', () => window.electron.queueCancelItem(job.id));
    if (removeBtn) removeBtn.addEventListener('click', () => window.electron.queueRemoveItem(job.id));
  });
}

function renderQueueItem(job) {
  const status = job.status;
  const statusLabel = { pending: 'Pending', downloading: 'Downloading', paused: 'Paused', completed: 'Done', failed: 'Failed', cancelled: 'Cancelled' }[status] || status;
  const pct = (job.progress && job.progress.percent) || 0;
  const showProgress = status === 'downloading';
  const canCancel = status === 'pending' || status === 'downloading';
  const canRemove = true;
  const title = (job.title || 'Unknown').replace(/</g, '&lt;');
  const error = (job.error || '').replace(/</g, '&lt;');
  return `
    <div data-queue-id="${job.id}" class="border border-secondary-200 dark:border-secondary-700 rounded-xl p-4">
      <div class="flex items-start justify-between gap-3">
        <div class="flex-1 min-w-0">
          <p class="font-medium text-secondary-900 dark:text-secondary-100 truncate" title="${title}">${title}</p>
          <div class="flex items-center gap-2 mt-1.5 text-sm flex-wrap">
            <span class="queue-status-badge" data-status="${status}">${statusLabel}</span>
            ${showProgress ? `<span class="queue-item-speed text-secondary-500 dark:text-secondary-400">${(job.progress && job.progress.speedBytes) ? formatSpeed(job.progress.speedBytes) : ''}</span>` : ''}
            ${error ? `<span class="text-error text-xs max-w-full truncate">${error}</span>` : ''}
          </div>
          ${showProgress ? `
            <div class="mt-2 h-2 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
              <div class="queue-item-progress-bar h-full bg-primary-500 rounded-full transition-all duration-300" style="width:${pct}%"></div>
            </div>
          ` : ''}
        </div>
        <div class="flex gap-2 flex-shrink-0">
          ${canCancel ? `<button type="button" class="queue-cancel px-3 py-1.5 text-sm border border-secondary-300 dark:border-secondary-600 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors btn-animate">Cancel</button>` : ''}
          ${canRemove ? `<button type="button" class="queue-remove px-3 py-1.5 text-sm border border-secondary-300 dark:border-secondary-600 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors btn-animate">Remove</button>` : ''}
        </div>
      </div>
    </div>
  `;
}

function formatSpeed(bytesPerSecond) {
  if (!bytesPerSecond) return '';
  if (bytesPerSecond >= 1048576) return (bytesPerSecond / 1048576).toFixed(1) + ' MB/s';
  return (bytesPerSecond / 1024).toFixed(1) + ' KB/s';
}

/**
 * Add a single job to the queue. Call from Home or Playlist.
 * @param {Object} item - { url, title, format, isAudio, outputPath, thumbnail?, qualityLabel? }
 * @returns {string} job id
 */
async function addToQueue(item) {
  if (!window.electron || !window.electron.queueAdd) {
    if (window.NotificationManager) window.NotificationManager.error('Queue not available');
    return null;
  }
  const id = await window.electron.queueAdd(item);
  if (window.NotificationManager) window.NotificationManager.success('Added to queue');
  return id;
}

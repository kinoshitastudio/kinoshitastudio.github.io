const DEFAULT_MESSAGE = '数字は、あなたじゃない。';
const DEFAULT_DURATION = 1;

const messageEl = document.getElementById('message');
const durationEl = document.getElementById('duration');
const hideMetricsEl = document.getElementById('hideMetrics');
const saveBtn = document.getElementById('save');
const statusEl = document.getElementById('status');

chrome.storage.sync.get(
  { message: '', duration: DEFAULT_DURATION, hideMetrics: true },
  (data) => {
    messageEl.value = data.message;
    durationEl.value = data.duration;
    hideMetricsEl.checked = data.hideMetrics;
  }
);

saveBtn.addEventListener('click', () => {
  const message = messageEl.value.trim();
  const duration = Math.min(30, Math.max(1, parseInt(durationEl.value) || DEFAULT_DURATION));
  const hideMetrics = hideMetricsEl.checked;

  chrome.storage.sync.set({ message, duration, hideMetrics }, () => {
    durationEl.value = duration;
    statusEl.textContent = '保存しました';
    setTimeout(() => { statusEl.textContent = ''; }, 2000);
  });
});

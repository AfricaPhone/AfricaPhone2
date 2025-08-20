// js/ui.js
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

export const fmtXOF = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' });
export const fmtDate = (d) => new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(d);

export function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
}

export function escapeAttr(s = '') {
  return escapeHtml(s).replace(/`/g, '&#96;');
}

export function setButtonLoading(button, isLoading) {
  if (!button) return;
  if (isLoading) {
    button.disabled = true;
    button.dataset.originalText = button.innerHTML;
    button.innerHTML = '<span class="loader"></span>';
  } else {
    button.disabled = false;
    if (button.dataset.originalText) {
      button.innerHTML = button.dataset.originalText;
    }
  }
}

export function toast(title, msg = '', type = 'success', timeout = 3500) {
  const host = $('#toasts');
  const el = document.createElement('div');
  const icons = { success: 'check-circle-2', error: 'alert-circle', info: 'info' };
  el.className = 'toast ' + type;
  el.innerHTML = `
    <i data-lucide="${icons[type] || 'info'}" class="icon"></i>
    <div class="grow">
      <div class="title">${escapeHtml(title)}</div>
      ${msg ? `<div class="msg">${escapeHtml(msg)}</div>` : ''}
    </div>
    <button class="btn btn-icon btn-small" aria-label="Fermer">
      <i data-lucide="x" class="icon"></i>
    </button>`;
  host.appendChild(el);
  lucide.createIcons();
  const remove = () => { el.style.transform = 'translateX(8px)'; el.style.opacity = '0'; setTimeout(() => el.remove(), 180); };
  el.querySelector('button').addEventListener('click', remove);
  if (timeout) setTimeout(remove, timeout);
}

export function openModal(opts) {
  const { title = 'Confirmation', body = '', okText = 'Confirmer', cancelText = 'Annuler', danger = false } = (opts || {});
  return new Promise(resolve => {
    const modal = $('#modal');
    const foot = $('#modal-foot');
    const bodyEl = $('#modal-body');
    $('#modal-title').textContent = title;
    bodyEl.innerHTML = body;
    foot.innerHTML = '';
    const btnCancel = document.createElement('button');
    btnCancel.className = 'btn';
    btnCancel.textContent = cancelText;
    const btnOk = document.createElement('button');
    btnOk.className = 'btn ' + (danger ? 'btn-danger' : 'btn-primary');
    btnOk.textContent = okText;
    foot.appendChild(btnCancel);
    foot.appendChild(btnOk);

    const close = (res) => { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; resolve(res); };
    $('#modal-close').onclick = () => close(false);
    btnCancel.onclick = () => close(false);
    btnOk.onclick = () => close(true);
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    modal.addEventListener('click', e => { if (e.target === modal) close(false); }, { once: true });
    setTimeout(() => btnOk.focus(), 0);
    const escHandler = e => { if (e.key === 'Escape') { close(false); document.removeEventListener('keydown', escHandler); } };
    document.addEventListener('keydown', escHandler);
  });
}

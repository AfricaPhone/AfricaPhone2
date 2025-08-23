// others/admin-panel/assets/js/ui.js
/* ============================ Helpers ============================ */
export const $ = sel => document.querySelector(sel);
export const $$ = sel => document.querySelectorAll(sel);
export const fmtXOF = new Intl.NumberFormat('fr-FR',{style:'currency', currency:'XOF'});
export const fmtDate = (d) => new Intl.DateTimeFormat('fr-FR',{dateStyle:'medium', timeStyle:'short'}).format(d);

export function escapeHtml(s=''){
  return String(s).replace(/[&<>"']/g, function(m){
    return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m];
  });
}
export function escapeAttr(s=''){
  return escapeHtml(s).replace(/`/g,'&#96;');
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

export function toast(title, msg='', type='success', timeout=3500){
  const host = $('#toasts');
  const el = document.createElement('div');
  const icons = { success: 'check-circle-2', error: 'alert-circle', info: 'info' };
  el.className = 'toast ' + type;
  el.innerHTML = `
    <i data-lucide="${icons[type] || 'info'}" class="icon"></i>
    <div class="grow">
      <div class="title">${escapeHtml(title)}</div>
      ${msg ? '<div class="msg">'+escapeHtml(msg)+'</div>' : ''}
    </div>
    <button class="btn btn-icon btn-small" aria-label="Fermer">
      <i data-lucide="x" class="icon"></i>
    </button>`;
  host.appendChild(el);
  lucide.createIcons();
  const remove=()=>{ el.style.transform='translateX(8px)'; el.style.opacity='0'; setTimeout(()=>el.remove(),180); };
  el.querySelector('button').addEventListener('click', remove);
  if(timeout) setTimeout(remove, timeout);
}

export function openModal(opts){
  const {
    title='Confirmation', body='', okText='Confirmer', cancelText='Annuler', danger=false
  } = (opts || {});
  return new Promise(function(resolve){
    const modal = $('#modal');
    const foot = $('#modal-foot');
    const bodyEl = $('#modal-body');
    $('#modal-title').textContent = title;
    bodyEl.innerHTML = body;
    foot.innerHTML = '';
    const btnCancel = document.createElement('button'); btnCancel.className='btn'; btnCancel.textContent = cancelText;
    const btnOk = document.createElement('button'); btnOk.className='btn '+(danger?'btn-danger':'btn-primary'); btnOk.textContent = okText;
    foot.appendChild(btnCancel); foot.appendChild(btnOk);

    const close = function(res){ modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); document.body.style.overflow=''; resolve(res); };
    $('#modal-close').onclick = function(){ close(false); };
    btnCancel.onclick = function(){ close(false); };
    btnOk.onclick = function(){ close(true); };
    modal.classList.add('open'); modal.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden';
    modal.addEventListener('click', function(e){ if(e.target===modal){ close(false); } }, {once:true});
    setTimeout(function(){ btnOk.focus(); },0);
    function esc(e){ if(e.key==='Escape'){ close(false); document.removeEventListener('keydown', esc);} }
    document.addEventListener('keydown', esc);
  });
}

export function setCrumb(name){ $('#crumb-current').textContent = name; }
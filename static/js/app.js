/* ============================================================
   5S Audit — Confection Textile
   Front-end connecté au backend Flask (API REST).
   ============================================================ */

const LINES = Array.from({ length: 8 }, (_, i) => 'Line ' + String(i + 1).padStart(2, '0'));

async function api(path, options) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Erreur serveur'), { data });
  return data;
}

/* ============================================================
   NAVIGATION HORIZONTALE — bascule entre "Résultats" et "Nouvel Audit"
   ============================================================ */
const navItems = document.querySelectorAll('.nav-item');
const views = document.querySelectorAll('.view');
navItems.forEach(item => {
  item.addEventListener('click', () => {
    navItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    const target = item.dataset.view;
    views.forEach(v => v.classList.toggle('active', v.id === 'view-' + target));
    if (target === 'results') renderResults();
  });
});

/* ============================================================
   ICONES SVG DECORATIVES (aucune donnée réelle, purement visuel)
   ============================================================ */
function tile(seed, warm) {
  const c1 = warm ? '#941d2d' : '#2d6672';
  const c2 = warm ? '#c9232f' : '#55a936';
  return `<svg viewBox="0 0 300 220" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g${seed}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}" stop-opacity="0.55"/>
      <stop offset="1" stop-color="${c2}" stop-opacity="0.15"/>
    </linearGradient></defs>
    <rect width="300" height="220" fill="url(#g${seed})"/>
    <g stroke="#fffdf5" stroke-opacity="0.4" fill="none" stroke-width="2">
      <path d="M40 150 q40 -70 90 -70 q60 0 90 60 q20 40 -10 60 h-160 q-25 -20 -10 -50 z"/>
      <path d="M100 90 q10 -25 40 -25 q35 0 40 30" />
    </g>
    <circle cx="240" cy="55" r="16" fill="#f4d34f" fill-opacity="0.28"/>
  </svg>`;
}
function portrait(seed) {
  return `<svg viewBox="0 0 300 260" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="p${seed}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#55a936" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#101820" stop-opacity="0.7"/>
    </linearGradient></defs>
    <rect width="300" height="260" fill="url(#p${seed})"/>
    <circle cx="150" cy="100" r="46" fill="#f4d34f" fill-opacity="0.32"/>
    <path d="M70 250 q80 -70 160 0 z" fill="#2d6672" fill-opacity="0.4"/>
  </svg>`;
}
function starIcon(filled) {
  return `<svg viewBox="0 0 24 24" fill="${filled ? '#f4d34f' : 'none'}" stroke="#f4d34f" stroke-width="1.4">
    <path d="M12 2.5l2.9 6.2 6.8.7-5.1 4.6 1.5 6.7L12 17.3l-6.1 3.4 1.5-6.7-5.1-4.6 6.8-.7z" stroke-linejoin="round"/>
  </svg>`;
}

/* ============================================================
   VUE 1 — RÉSULTATS (écran TV), données via GET /api/results
   ============================================================ */
const sectionSel = document.getElementById('section');
const lineSel = document.getElementById('line');
const lineField = document.getElementById('lineField');

function refreshLineOptions() {
  const sec = sectionSel.value;
  if (sec === 'sewing') {
    lineField.style.display = '';
    lineSel.innerHTML = LINES.map(l => `<option value="${l}">${l}</option>`).join('');
  } else {
    lineField.style.display = 'none';
  }
}

async function renderResults() {
  const section = sectionSel.value;
  const line = section === 'sewing' ? lineSel.value : '';
  let payload;
  try {
    payload = await api(`/api/results?section=${encodeURIComponent(section)}&line=${encodeURIComponent(line)}`);
  } catch (e) {
    document.getElementById('badgeValue').textContent = "Aucun audit disponible pour cette section";
    return;
  }
  const { record, records = [], champion, label } = payload;
  const seedLabel = 'Section : ' + label;

  document.getElementById('badgeValue').textContent = seedLabel;
  if (!records.length && !record) {
    if (resultAuditTimer) clearInterval(resultAuditTimer);
    if (resultPhotoPairTimer) clearInterval(resultPhotoPairTimer);
    document.getElementById('photoBefore').innerHTML = '';
    document.getElementById('photoAfter').innerHTML = '';
    document.getElementById('photoBeforeCount').textContent = '';
    document.getElementById('photoAfterCount').textContent = '';
    document.getElementById('commentBefore').textContent = '';
    document.getElementById('commentAfter').textContent = '';
    document.getElementById('championPhoto').innerHTML = '';
    document.getElementById('championName').textContent = '';
    document.getElementById('points').textContent = '';
    document.getElementById('improvement').textContent = '';
    document.getElementById('stars').innerHTML = '';
    return;
  }
  if (resultAuditTimer) clearInterval(resultAuditTimer);
  const showAudit = audit => {
    renderResultPhotoPair(audit.photoBefore, audit.photoAfter, audit.before, audit.after, seedLabel);
    document.getElementById('championPhoto').innerHTML = champion.photo
      ? `<img src="${champion.photo}" style="width:100%;height:100%;object-fit:cover;">`
      : portrait(seedLabel);
    document.getElementById('championName').textContent = champion.name;
    document.getElementById('points').textContent = audit.points;
    document.getElementById('improvement').textContent = audit.improvement || '';
    const starsEl = document.getElementById('stars');
    starsEl.innerHTML = '';
    for (let i = 1; i <= 5; i++) starsEl.innerHTML += starIcon(i <= audit.rating);
  };
  let auditIndex = 0;
  showAudit(records[0] || record);
  if (records.length > 1) {
    resultAuditTimer = setInterval(() => {
      auditIndex = (auditIndex + 1) % records.length;
      showAudit(records[auditIndex]);
    }, 7000);
  }
}
let resultPhotoPairTimer = null;
let resultAuditTimer = null;
function renderResultPhotoPair(beforePhotos, afterPhotos, beforeComments, afterComments, seedLabel) {
  const before = Array.isArray(beforePhotos) ? beforePhotos : (beforePhotos ? [beforePhotos] : []);
  const after = Array.isArray(afterPhotos) ? afterPhotos : (afterPhotos ? [afterPhotos] : []);
  const beforeText = Array.isArray(beforeComments) ? beforeComments : (beforeComments ? [beforeComments] : []);
  const afterText = Array.isArray(afterComments) ? afterComments : (afterComments ? [afterComments] : []);
  const beforeEl = document.getElementById('photoBefore');
  const afterEl = document.getElementById('photoAfter');
  if (resultPhotoPairTimer) clearInterval(resultPhotoPairTimer);

  const pairCount = Math.max(before.length, after.length);
  const renderSide = (element, photos, seed, warm) => {
    element.innerHTML = photos.length
      ? `<div class="photo-gallery"><div class="photo-track">${Array.from({ length: pairCount }, (_, index) => photos[index]
        ? `<img src="${photos[index]}" alt="Photo d'audit">`
        : `<div class="photo-placeholder">Aucune photo pour cette paire</div>`).join('')}</div></div>`
      : pairCount > 1
        ? `<div class="photo-gallery"><div class="photo-track">${Array.from({ length: pairCount }, () => '<div class="photo-placeholder">Aucune photo pour cette paire</div>').join('')}</div></div>`
        : tile(seed, warm);
  };
  renderSide(beforeEl, before, 'b' + seedLabel, true);
  renderSide(afterEl, after, 'a' + seedLabel, false);
  const showComments = pairIndex => {
    document.getElementById('commentBefore').textContent = beforeText[pairIndex] || '';
    document.getElementById('commentAfter').textContent = afterText[pairIndex] || '';
  };
  showComments(0);
  document.getElementById('photoBeforeCount').textContent = before.length
    ? `${before.length} photo${before.length > 1 ? 's' : ''}` : '';
  document.getElementById('photoAfterCount').textContent = after.length
    ? `${after.length} photo${after.length > 1 ? 's' : ''}` : '';

  if (pairCount > 1) {
    let index = 0;
    const showPair = pairIndex => {
      [beforeEl, afterEl].forEach(element => {
        const track = element.querySelector('.photo-track');
        if (!track) return;
        track.style.transform = `translateX(-${pairIndex * 100}%)`;
      });
      showComments(pairIndex);
    };
    resultPhotoPairTimer = setInterval(() => {
      index = (index + 1) % pairCount;
      showPair(index);
    }, 3500);
  }
}
sectionSel.addEventListener('change', () => { refreshLineOptions(); renderResults(); });
lineSel.addEventListener('change', renderResults);
refreshLineOptions();
renderResults();

/* ============================================================
   VUE 2 — LOGIN, authentification via POST /api/login
   ============================================================ */
const loginScreen = document.getElementById('loginScreen');
const auditApp = document.getElementById('auditApp');
const loginId = document.getElementById('loginId');
const loginPin = document.getElementById('loginPin');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');
const auditorLabel = document.getElementById('auditorLabel');
const logoutBtn = document.getElementById('logoutBtn');

let currentAuditor = null;

async function attemptLogin() {
  const id = loginId.value.trim().toUpperCase();
  const pin = loginPin.value.trim();
  try {
    const { auditor } = await api('/api/login', {
      method: 'POST',
      body: JSON.stringify({ id, pin }),
    });
    currentAuditor = auditor;
    loginError.classList.remove('show');
    auditorLabel.textContent = `${auditor.name} — ${auditor.role} (${auditor.id})`;
    loginScreen.classList.add('hidden');
    auditApp.classList.add('unlocked');
  } catch (e) {
    loginError.textContent = e.data?.error || 'Identifiant ou code PIN incorrect.';
    loginError.classList.add('show');
    loginPin.value = '';
    loginPin.focus();
  }
}
loginBtn.addEventListener('click', attemptLogin);
loginPin.addEventListener('keydown', e => { if (e.key === 'Enter') attemptLogin(); });
loginId.addEventListener('keydown', e => { if (e.key === 'Enter') loginPin.focus(); });
logoutBtn.addEventListener('click', () => {
  currentAuditor = null;
  auditApp.classList.remove('unlocked');
  loginScreen.classList.remove('hidden');
  loginId.value = ''; loginPin.value = '';
  navItems.forEach(i => i.classList.toggle('active', i.dataset.view === 'results'));
  views.forEach(v => v.classList.toggle('active', v.id === 'view-results'));
  refreshLineOptions();
  renderResults();
});

/* ============================================================
   VUE 2 — FORMULAIRE D'AUDIT (soumission via POST /api/audits)
   ============================================================ */
const sectionChips = document.getElementById('sectionChips');
const lineChips = document.getElementById('lineChips');
const lineWrap = document.getElementById('lineWrap');

let formState = {
  section: 'sewing', line: 'Line 01', photoBefore: [], photoAfter: [],
  commentsBefore: [], commentsAfter: [], rating: 0,
};

function buildLineChips() {
  lineChips.innerHTML = LINES.map(l => `<div class="chip" data-value="${l}">${l.replace('Line ', 'L')}</div>`).join('');
  Array.from(lineChips.children).forEach(chip => {
    if (chip.dataset.value === formState.line) chip.classList.add('active');
    chip.addEventListener('click', () => {
      Array.from(lineChips.children).forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      formState.line = chip.dataset.value;
    });
  });
}
buildLineChips();

Array.from(sectionChips.children).forEach(chip => {
  chip.addEventListener('click', () => {
    Array.from(sectionChips.children).forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    formState.section = chip.dataset.value;
    lineWrap.style.display = formState.section === 'sewing' ? '' : 'none';
  });
});
lineWrap.style.display = formState.section === 'sewing' ? '' : 'none';

function renderCapture(key, tileId, galleryId, inputId) {
  const photos = formState[key];
  const comments = key === 'photoBefore' ? formState.commentsBefore : formState.commentsAfter;
  const tileEl = document.getElementById(tileId);
  tileEl.classList.toggle('filled', photos.length > 0);
  tileEl.innerHTML = photos.length
    ? `<input type="file" accept="image/*" capture="environment" id="${inputId}"><img src="${photos[0]}" alt=""><span class="capture-current-comment">${comments[0] || 'Commentaire en attente pour ce couple'}</span><button type="button" class="capture-primary-remove" aria-label="Supprimer cette photo">&times;</button><span class="retake">Ajouter</span>`
    : `<input type="file" accept="image/*" capture="environment" id="${inputId}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg><span class="lbl">Prendre la photo</span>`;
  const gallery = document.getElementById(galleryId);
  const primaryRemove = tileEl.querySelector('.capture-primary-remove');
  if (primaryRemove) {
    primaryRemove.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      formState[key].splice(0, 1);
      formState.commentsBefore.splice(0, 1);
      formState.commentsAfter.splice(0, 1);
      renderCapture(key, tileId, galleryId, inputId);
      updateSubmitState();
    });
  }
  gallery.innerHTML = photos.slice(1).map((photo, index) => `
    <div class="capture-thumb">
      <img src="${photo}" alt="Photo ajoutée">
      <div class="capture-thumb-comment">${comments[index + 1] || 'Commentaire en attente pour ce couple'}</div>
      <button type="button" class="capture-thumb-remove" data-photo-index="${index + 1}" aria-label="Supprimer cette photo">&times;</button>
    </div>`).join('');
  gallery.querySelectorAll('.capture-thumb-remove').forEach(button => {
    button.addEventListener('click', () => {
      const index = Number(button.dataset.photoIndex);
      formState[key].splice(index, 1);
      formState.commentsBefore.splice(index, 1);
      formState.commentsAfter.splice(index, 1);
      renderCapture(key, tileId, galleryId, inputId);
      updateSubmitState();
    });
  });
  wirePhoto(inputId, tileId, galleryId, key);
}
function commitPhotoCommentPair() {
  const beforeInput = document.getElementById('commentBeforeInput');
  const afterInput = document.getElementById('commentAfterInput');
  const beforeComment = beforeInput.value.trim();
  const afterComment = afterInput.value.trim();
  if (!beforeComment || !afterComment) return false;
  const pairIndex = Math.max(formState.photoBefore.length, formState.photoAfter.length) - 1;
  const safePairIndex = Math.max(0, pairIndex);
  formState.commentsBefore[safePairIndex] = beforeComment;
  formState.commentsAfter[safePairIndex] = afterComment;
  beforeInput.value = '';
  afterInput.value = '';
  renderCapture('photoBefore', 'tileBefore', 'galleryBefore', 'fileBefore');
  renderCapture('photoAfter', 'tileAfter', 'galleryAfter', 'fileAfter');
  return true;
}
function wireCommentInput() {
  ['commentBeforeInput', 'commentAfterInput'].forEach(inputId => {
    document.getElementById(inputId).addEventListener('keydown', event => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      if (commitPhotoCommentPair()) return;
      const beforeInput = document.getElementById('commentBeforeInput');
      const afterInput = document.getElementById('commentAfterInput');
      const missingInput = !beforeInput.value.trim() ? beforeInput : afterInput;
      missingInput.focus();
      missingInput.setCustomValidity('Les commentaires Before et After sont requis pour ce couple.');
      missingInput.reportValidity();
      missingInput.setCustomValidity('');
    });
  });
}
function wirePhoto(inputId, tileId, galleryId, key) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      commitPhotoCommentPair();
      formState[key].push(e.target.result);
      renderCapture(key, tileId, galleryId, inputId);
      updateSubmitState();
    };
    reader.readAsDataURL(file);
  });
}
wirePhoto('fileBefore', 'tileBefore', 'galleryBefore', 'photoBefore');
wirePhoto('fileAfter', 'tileAfter', 'galleryAfter', 'photoAfter');
wireCommentInput();
function wireAdditionalPhoto(inputId, key, tileId, galleryId) {
  document.getElementById(inputId).addEventListener('change', event => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      commitPhotoCommentPair();
      formState[key].push(e.target.result);
      renderCapture(key, tileId, galleryId, key === 'photoBefore' ? 'fileBefore' : 'fileAfter');
      event.target.value = '';
      updateSubmitState();
    };
    reader.readAsDataURL(file);
  });
}
wireAdditionalPhoto('fileBeforeMore', 'photoBefore', 'tileBefore', 'galleryBefore');
wireAdditionalPhoto('fileAfterMore', 'photoAfter', 'tileAfter', 'galleryAfter');

const starsRow = document.getElementById('starsRow');
const ratingHint = document.getElementById('ratingHint');
const RATING_LABELS = ['', 'Insuffisant', 'À améliorer', 'Correct', 'Bien', 'Excellent'];
function renderStars() {
  starsRow.innerHTML = '';
  for (let i = 1; i <= 5; i++) {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'star-btn';
    btn.innerHTML = starIcon(i <= formState.rating);
    btn.addEventListener('click', () => { formState.rating = i; renderStars(); });
    starsRow.appendChild(btn);
  }
  ratingHint.textContent = formState.rating ? `${formState.rating} / 5 — ${RATING_LABELS[formState.rating]}` : 'Aucune note sélectionnée';
}
renderStars();

const ptsInput = document.getElementById('pointsInput');
document.getElementById('ptsMinus').addEventListener('click', () => { ptsInput.value = Math.max(0, (parseInt(ptsInput.value) || 0) - 10); });
document.getElementById('ptsPlus').addEventListener('click', () => { ptsInput.value = (parseInt(ptsInput.value) || 0) + 10; });

const submitBtn = document.getElementById('submitBtn');
const statusNote = document.getElementById('statusNote');
function updateSubmitState() {
  const beforeComment = document.getElementById('commentBeforeInput').value.trim();
  const afterComment = document.getElementById('commentAfterInput').value.trim();
  const savedBefore = formState.commentsBefore.some(comment => comment && comment.trim());
  const savedAfter = formState.commentsAfter.some(comment => comment && comment.trim());
  const ready = (beforeComment && afterComment) || (savedBefore && savedAfter);
  submitBtn.disabled = !ready;
  statusNote.textContent = ready ? "Prêt à publier sur l'écran de la ligne" : "Les commentaires Before et After sont requis";
}
document.getElementById('commentBeforeInput').addEventListener('input', updateSubmitState);
document.getElementById('commentAfterInput').addEventListener('input', updateSubmitState);
updateSubmitState();

const overlay = document.getElementById('overlay');
const confirmText = document.getElementById('confirmText');
submitBtn.addEventListener('click', async () => {
  submitBtn.disabled = true;
  statusNote.textContent = 'Publication en cours…';
  try {
    commitPhotoCommentPair();
    const payload = {
      auditorId: currentAuditor ? currentAuditor.id : null,
      section: formState.section,
      line: formState.line,
      photoBefore: formState.photoBefore,
      photoAfter: formState.photoAfter,
      commentBefore: formState.commentsBefore,
      commentAfter: formState.commentsAfter,
      rating: formState.rating,
      points: parseInt(ptsInput.value) || 0,
      improvement: document.getElementById('improvementInput').value,
    };
    const res = await api('/api/audits', { method: 'POST', body: JSON.stringify(payload) });
    confirmText.textContent = res.message;
    overlay.classList.add('show');
    // Rafraîchir l'écran Résultats pour refléter le nouvel audit publié
    sectionSel.value = formState.section;
    refreshLineOptions();
    if (formState.section === 'sewing') lineSel.value = formState.line;
    renderResults();
  } catch (e) {
    statusNote.textContent = e.data?.error || "Erreur lors de la publication.";
  } finally {
    updateSubmitState();
  }
});
document.getElementById('newAuditBtn').addEventListener('click', () => {
  overlay.classList.remove('show');
  navItems.forEach(i => i.classList.remove('active'));
  document.querySelector('.nav-item[data-view="results"]').classList.add('active');
  views.forEach(v => v.classList.toggle('active', v.id === 'view-results'));
});

/* ============================================================
   SOUS-NAVIGATION DE L'ESPACE AUDITEUR — "Nouvel audit" / "Champions 5S"
   ============================================================ */
const subnavItems = document.querySelectorAll('.subnav-item');
const auditSubviews = document.querySelectorAll('.audit-subview');
const submitBar = document.getElementById('submitBar');
subnavItems.forEach(item => {
  item.addEventListener('click', () => {
    subnavItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    const target = item.dataset.target;
    auditSubviews.forEach(v => v.classList.toggle('active', v.id === (target === 'form' ? 'auditFormSection' : target === 'history' ? 'historySection' : 'championsSection')));
    submitBar.style.display = target === 'form' ? '' : 'none';
    if (target === 'champions') loadChampionIntoEditor();
    if (target === 'history') renderAuditHistory();
  });
});

const auditHistory = document.getElementById('auditHistory');
const auditHistoryCard = auditHistory.closest('.card');
document.getElementById('exportExcelBtn').addEventListener('click', () => {
  window.location.href = '/api/audits/export';
});
function auditLocation(audit) {
  return audit.section === 'sewing' ? `Sewing — ${audit.line}` : audit.section === 'cutting' ? 'Cutting' : 'Finishing';
}
function renderAuditPhotoPairs(audit) {
  const pairCount = Math.max(audit.photoBefore.length, audit.photoAfter.length, 1);
  return Array.from({ length: pairCount }, (_, index) => `
    <div class="audit-history-pair">
      <div class="audit-history-photo">
        <h4>Before ${pairCount > 1 ? index + 1 : ''}</h4>
        ${audit.photoBefore[index] ? `<div class="audit-history-photo-frame"><img src="${audit.photoBefore[index]}" alt="Photo Before ${index + 1}"></div>` : ''}
        <div class="audit-history-comment">${audit.commentBefore[index] || 'Aucun commentaire'}</div>
      </div>
      <div class="audit-history-photo">
        <h4>After ${pairCount > 1 ? index + 1 : ''}</h4>
        ${audit.photoAfter[index] ? `<div class="audit-history-photo-frame"><img src="${audit.photoAfter[index]}" alt="Photo After ${index + 1}"></div>` : ''}
        <div class="audit-history-comment">${audit.commentAfter[index] || 'Aucun commentaire'}</div>
      </div>
      <div class="audit-pair-actions">
        <button type="button" data-edit-pair="${audit.id}" data-pair-index="${index}">MODIFIER</button>
        <button type="button" class="delete" data-delete-pair="${audit.id}" data-pair-index="${index}">SUPPRIMER</button>
      </div>
    </div>`).join('');
}
async function renderAuditHistory() {
  try {
    const { audits } = await api('/api/audits');
    auditHistoryCard.style.display = audits.length ? '' : 'none';
    auditHistory.innerHTML = audits.length ? audits.map(audit => `
      <div class="audit-history-card">
        <div class="audit-history-meta">
          <strong>Publication #${audit.id} · ${auditLocation(audit)} · ${audit.points} points</strong>
          <span>${audit.createdAt} · ${audit.auditorName} — ${audit.auditorRole} (${audit.auditorId}) · ${audit.photoBefore.length + audit.photoAfter.length} photos</span>
        </div>
        ${renderAuditPhotoPairs(audit)}
      </div>`).join('') : '<div class="history-empty">Aucun audit publié.</div>';
    auditHistory.querySelectorAll('[data-edit-pair]').forEach(button => button.addEventListener('click', () => {
      const audit = audits.find(item => item.id === Number(button.dataset.editPair));
      editAuditPair(audit, Number(button.dataset.pairIndex)).catch(error => {
        window.alert(error.data?.error || error.message || 'La modification n’a pas pu être enregistrée.');
      });
    }));
    auditHistory.querySelectorAll('[data-delete-pair]').forEach(button => button.addEventListener('click', () => {
      const audit = audits.find(item => item.id === Number(button.dataset.deletePair));
      deleteAuditPair(audit, Number(button.dataset.pairIndex)).catch(error => {
        window.alert(error.data?.error || error.message || 'La suppression n’a pas pu être enregistrée.');
      });
    }));
  } catch (e) {
    auditHistoryCard.style.display = 'none';
    auditHistory.innerHTML = `<div class="history-empty">${e.data?.error || 'Impossible de charger les audits.'}</div>`;
  }
}
function choosePhoto() {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.addEventListener('change', () => {
      const file = input.files[0];
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = event => resolve(event.target.result);
      reader.readAsDataURL(file);
    });
    input.click();
  });
}
async function saveAuditPair(audit, index, changes) {
  const beforePhotos = [...audit.photoBefore];
  const afterPhotos = [...audit.photoAfter];
  const beforeComments = Array.isArray(audit.commentBefore) ? [...audit.commentBefore] : [audit.commentBefore || ''];
  const afterComments = Array.isArray(audit.commentAfter) ? [...audit.commentAfter] : [audit.commentAfter || ''];
  if (changes.beforePhoto) beforePhotos[index] = changes.beforePhoto;
  if (changes.afterPhoto) afterPhotos[index] = changes.afterPhoto;
  beforeComments[index] = changes.beforeComment;
  afterComments[index] = changes.afterComment;
  await api(`/api/audits/${audit.id}`, {
    method: 'PUT',
    body: JSON.stringify({ photoBefore: beforePhotos, photoAfter: afterPhotos, commentBefore: beforeComments, commentAfter: afterComments, improvement: audit.improvement, points: audit.points, rating: audit.rating }),
  });
  await renderAuditHistory();
  renderResults();
}
async function editAuditPair(audit, index) {
  const beforeComments = Array.isArray(audit.commentBefore) ? audit.commentBefore : [audit.commentBefore || ''];
  const afterComments = Array.isArray(audit.commentAfter) ? audit.commentAfter : [audit.commentAfter || ''];
  const beforeComment = window.prompt('Commentaire Before', beforeComments[index] || '');
  if (beforeComment === null) return;
  const afterComment = window.prompt('Commentaire After', afterComments[index] || '');
  if (afterComment === null) return;
  const changeBefore = confirm('Remplacer la photo Before de cette paire ?');
  const beforePhoto = changeBefore ? await choosePhoto() : null;
  const changeAfter = confirm('Remplacer la photo After de cette paire ?');
  const afterPhoto = changeAfter ? await choosePhoto() : null;
  await saveAuditPair(audit, index, { beforeComment, afterComment, beforePhoto, afterPhoto });
}
async function deleteAuditPair(audit, index) {
  if (!confirm('Supprimer cette paire Before / After ?')) return;
  const pairCount = Math.max(audit.photoBefore.length, audit.photoAfter.length, audit.commentBefore.length, audit.commentAfter.length);
  if (pairCount <= 1) {
    await api(`/api/audits/${audit.id}`, { method: 'DELETE' });
    await renderAuditHistory();
    renderResults();
    return;
  }
  const beforePhotos = audit.photoBefore.filter((_, photoIndex) => photoIndex !== index);
  const afterPhotos = audit.photoAfter.filter((_, photoIndex) => photoIndex !== index);
  const beforeComments = audit.commentBefore.filter((_, commentIndex) => commentIndex !== index);
  const afterComments = audit.commentAfter.filter((_, commentIndex) => commentIndex !== index);
  await api(`/api/audits/${audit.id}`, {
    method: 'PUT',
    body: JSON.stringify({ photoBefore: beforePhotos, photoAfter: afterPhotos, commentBefore: beforeComments, commentAfter: afterComments, improvement: audit.improvement, points: audit.points, rating: audit.rating }),
  });
  await renderAuditHistory();
  renderResults();
}
async function editAudit(audit) {
  const commentBefore = prompt('Commentaire Before', audit.commentBefore);
  if (commentBefore === null) return;
  const commentAfter = prompt('Commentaire After', audit.commentAfter);
  if (commentAfter === null) return;
  const improvement = prompt('Point à améliorer', audit.improvement);
  if (improvement === null) return;
  const points = prompt('Points', audit.points);
  if (points === null) return;
  await api(`/api/audits/${audit.id}`, {
    method: 'PUT',
    body: JSON.stringify({ commentBefore, commentAfter, improvement, points, rating: audit.rating }),
  });
  await renderAuditHistory();
  renderResults();
}
async function deleteAudit(auditId) {
  if (!confirm('Supprimer définitivement cette publication ?')) return;
  await api(`/api/audits/${auditId}`, { method: 'DELETE' });
  await renderAuditHistory();
  renderResults();
}

/* ============================================================
   GESTION DES CHAMPIONS 5S PAR SECTION (via /api/champions)
   ============================================================ */
const champSectionChips = document.getElementById('champSectionChips');
const champLineWrap = document.getElementById('champLineWrap');
const champLineChips = document.getElementById('champLineChips');
const champPhotoTile = document.getElementById('champPhotoTile');
const champNameInput = document.getElementById('champNameInput');
const champSaveBtn = document.getElementById('champSaveBtn');
const champSavedNote = document.getElementById('champSavedNote');
const champList = document.getElementById('champList');

let champEditState = { section: 'sewing', line: 'Line 01', pendingPhoto: null };
let championsCache = []; // rempli par loadAllChampions()

async function loadAllChampions() {
  const { champions } = await api('/api/champions');
  championsCache = champions;
  return champions;
}
function findChampion(section, line) {
  const key = section === 'sewing' ? line : '';
  return championsCache.find(c => c.section === section && c.line === key)
    || { section, line: key, name: 'Sans nom', photo: null };
}

function buildChampLineChips() {
  champLineChips.innerHTML = LINES.map(l => `<div class="chip" data-value="${l}">${l.replace('Line ', 'L')}</div>`).join('');
  Array.from(champLineChips.children).forEach(chip => {
    if (chip.dataset.value === champEditState.line) chip.classList.add('active');
    chip.addEventListener('click', () => {
      Array.from(champLineChips.children).forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      champEditState.line = chip.dataset.value;
      loadChampionIntoEditor();
    });
  });
}
buildChampLineChips();

Array.from(champSectionChips.children).forEach(chip => {
  chip.addEventListener('click', () => {
    Array.from(champSectionChips.children).forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    champEditState.section = chip.dataset.value;
    champLineWrap.style.display = champEditState.section === 'sewing' ? '' : 'none';
    loadChampionIntoEditor();
  });
});
champLineWrap.style.display = champEditState.section === 'sewing' ? '' : 'none';

function champPhotoTileMarkup(photoUrl) {
  return photoUrl
    ? `<input type="file" accept="image/*" capture="environment" id="champFileInput"><img src="${photoUrl}" alt=""><span class="retake">Changer</span>`
    : `<input type="file" accept="image/*" capture="environment" id="champFileInput">
       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>
       <span class="lbl">Photo du champion</span>`;
}
function wireChampFileInput() {
  const input = document.getElementById('champFileInput');
  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      champEditState.pendingPhoto = e.target.result;
      champPhotoTile.classList.add('filled');
      champPhotoTile.innerHTML = champPhotoTileMarkup(e.target.result);
      wireChampFileInput();
    };
    reader.readAsDataURL(file);
  });
}
async function loadChampionIntoEditor() {
  if (!championsCache.length) await loadAllChampions();
  const champ = findChampion(champEditState.section, champEditState.line);
  champEditState.pendingPhoto = null;
  champNameInput.value = champ.name;
  champPhotoTile.classList.toggle('filled', !!champ.photo);
  champPhotoTile.innerHTML = champPhotoTileMarkup(champ.photo);
  wireChampFileInput();
  champSavedNote.classList.remove('show');
}
wireChampFileInput();

function locationLabel(section, line) {
  if (section === 'sewing') return `Sewing — ${line}`;
  return section === 'cutting' ? 'Cutting' : 'Finishing';
}

async function renderChampList() {
  await loadAllChampions();
  const rows = [];
  ['cutting', 'finishing'].forEach(sec => rows.push({ section: sec, line: '', champ: findChampion(sec, '') }));
  LINES.forEach(l => rows.push({ section: 'sewing', line: l, champ: findChampion('sewing', l) }));

  champList.innerHTML = rows.map(r => `
    <div class="champ-row" data-section="${r.section}" data-line="${r.line || ''}">
      <div class="thumb">${r.champ.photo ? `<img src="${r.champ.photo}">` : portrait(r.section + (r.line || ''))}</div>
      <div class="meta">
        <div class="nm">${r.champ.name}</div>
        <div class="loc">${locationLabel(r.section, r.line)}</div>
      </div>
      <div class="edit-hint">Modifier</div>
    </div>
  `).join('');

  Array.from(champList.children).forEach(row => {
    row.addEventListener('click', () => {
      const sec = row.dataset.section;
      const line = row.dataset.line || 'Line 01';
      champEditState.section = sec;
      champEditState.line = line;
      Array.from(champSectionChips.children).forEach(c => c.classList.toggle('active', c.dataset.value === sec));
      champLineWrap.style.display = sec === 'sewing' ? '' : 'none';
      if (sec === 'sewing') {
        Array.from(champLineChips.children).forEach(c => c.classList.toggle('active', c.dataset.value === line));
      }
      loadChampionIntoEditor();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}
renderChampList();

champSaveBtn.addEventListener('click', async () => {
  const name = champNameInput.value.trim();
  try {
    await api('/api/champions', {
      method: 'POST',
      body: JSON.stringify({
        section: champEditState.section,
        line: champEditState.line,
        name,
        photo: champEditState.pendingPhoto, // null => backend garde la photo existante
      }),
    });
    champSavedNote.classList.add('show');
    await renderChampList();
    renderResults(); // reflète immédiatement le changement sur l'écran Résultats si affiché
  } catch (e) {
    champSavedNote.textContent = e.data?.error || 'Erreur lors de la sauvegarde.';
    champSavedNote.classList.add('show');
  }
});

/* =========================================
   TaskExtractEngine – app.js
   ========================================= */

'use strict';

/* ── State ── */
let allTasks   = [];
let doneTasks  = new Set();
let activeFilter = 'all';
let searchQuery  = '';
let sortMode     = 'priority';

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

/* ── DOM refs ── */
const dropZone      = document.getElementById('dropZone');
const fileInput     = document.getElementById('fileInput');
const statusBar     = document.getElementById('statusBar');
const previewSection = document.getElementById('previewSection');
const statsSection  = document.getElementById('statsSection');
const taskSection   = document.getElementById('taskSection');
const apiKeyBox     = document.getElementById('apiKeyBox');
const apiKeyInput   = document.getElementById('apiKeyInput');

/* ── API Key management ── */
function saveApiKey() {
  const key = apiKeyInput.value.trim();
  if (!key.startsWith('sk-')) {
    alert('Please enter a valid OpenAI API key (starts with sk-)');
    return;
  }
  localStorage.setItem('tee_api_key', key);
  apiKeyInput.value = key;
  apiKeyBox.style.border = '0.5px solid #3B6D11';
  showStatus('success', 'API key saved. Now upload your Excel file.');
}

function getApiKey() {
  return localStorage.getItem('tee_api_key') || '';
}

/* Load saved key on startup */
window.addEventListener('DOMContentLoaded', () => {
  const saved = getApiKey();
  if (saved) {
    apiKeyInput.value = saved;
    apiKeyBox.style.border = '0.5px solid #3B6D11';
  }
});

/* ── Drag & Drop ── */
dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});
fileInput.addEventListener('change', e => {
  if (e.target.files[0]) handleFile(e.target.files[0]);
});

/* ── Status bar ── */
function showStatus(type, msg) {
  statusBar.style.display = 'flex';
  statusBar.className = 'status-bar ' + type;
  const icon = type === 'loading'
    ? '<div class="spinner"></div>'
    : type === 'success' ? '✓' : '✗';
  statusBar.innerHTML = icon + ' <span>' + escHtml(msg) + '</span>';
}

/* ── File handling ── */
function handleFile(file) {
  const apiKey = getApiKey();
  if (!apiKey) {
    showStatus('error', 'Please enter and save your OpenAI API key first.');
    apiKeyInput.focus();
    return;
  }

  showStatus('loading', 'Reading file: ' + file.name);
  previewSection.style.display  = 'none';
  statsSection.style.display    = 'none';
  taskSection.style.display     = 'none';
  allTasks  = [];
  doneTasks = new Set();

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data      = new Uint8Array(e.target.result);
      const workbook  = XLSX.read(data, { type: 'array', cellDates: true });
      const allSheets = [];

      workbook.SheetNames.forEach(name => {
        const ws   = workbook.Sheets[name];
        const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (json.length > 0) allSheets.push({ sheet: name, rows: json });
      });

      showPreview(allSheets, file.name);
      extractTasks(allSheets, file.name);
    } catch (err) {
      showStatus('error', 'Could not read file. Try saving as .xlsx and retry.');
      console.error(err);
    }
  };
  reader.readAsArrayBuffer(file);
}

/* ── Preview table ── */
function showPreview(sheetData, fname) {
  let html = '<div class="preview-box">'
           + '<div class="preview-header">'
           + '<h3>Raw data preview — ' + escHtml(fname)
           + ' (' + sheetData.length + ' sheet' + (sheetData.length > 1 ? 's' : '') + ')'
           + '</h3></div>';

  sheetData.slice(0, 2).forEach(s => {
    const rows = s.rows.filter(r => r.some(c => c !== '')).slice(0, 8);
    if (!rows.length) return;
    const cols = Math.min(Math.max(...rows.map(r => r.length)), 10);

    html += '<div class="preview-scroll"><table class="preview-table"><thead><tr>';
    for (let i = 0; i < cols; i++) {
      html += '<th>' + escHtml(String(rows[0][i] || '').substring(0, 30)) + '</th>';
    }
    html += '</tr></thead><tbody>';
    rows.slice(1).forEach(r => {
      html += '<tr>';
      for (let i = 0; i < cols; i++) {
        html += '<td>' + escHtml(String(r[i] || '').substring(0, 60)) + '</td>';
      }
      html += '</tr>';
    });
    html += '</tbody></table></div>';
  });

  html += '</div>';
  previewSection.innerHTML = html;
  previewSection.style.display = 'block';
}

/* ── AI task extraction ── */
async function extractTasks(sheetData, fname) {
  showStatus('loading', 'AI is analysing your data and extracting all tasks...');

  const serialized = sheetData.map(s => {
    const rows = s.rows.filter(r => r.some(c => c !== ''));
    return 'Sheet: ' + s.sheet + '\n' + rows.map(r => r.join(' | ')).join('\n');
  }).join('\n\n---\n\n');

  const prompt = `You are an expert task extraction engine. Analyze the following spreadsheet data carefully and extract EVERY possible task, reminder, deadline, event, or action item. Do NOT skip any row that could represent a task.

Rules:
- Study/academic/placement tasks are ALWAYS high or critical priority
- Emergency, urgent, deadline-today tasks are ALWAYS critical priority
- Meetings, calls, appointments = medium-high
- Regular work = medium
- Optional/someday = low
- Extract date, time, duration from any column that could represent them
- If no date/time found, mark as "TBD"
- Generate a smart reminder suggestion (e.g. "Remind 1 hour before", "Remind 1 day before exam")
- Infer categories/tags from context

Return ONLY a valid JSON array (no markdown, no explanation, no preamble). Each object must have:
{
  "id": number,
  "title": "clear action-oriented task title",
  "priority": "critical" | "high" | "medium" | "low",
  "date": "YYYY-MM-DD or TBD",
  "time": "HH:MM or TBD",
  "duration": "e.g. 2 hours, 30 mins, or TBD",
  "reminder": "smart reminder suggestion",
  "category": "Study | Work | Personal | Meeting | Exam | Placement | Emergency | Health | Finance | Other",
  "notes": "any extra context from the data",
  "tags": ["tag1","tag2"]
}

SPREADSHEET DATA:
${serialized.substring(0, 12000)}`;

  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + getApiKey()
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!resp.ok) {
      const errBody = await resp.json().catch(() => ({}));
      const errMsg = errBody.error?.message || '';

      /* ── Specific, user-friendly error messages ── */
      if (resp.status === 401) {
        throw new Error('Invalid API key. Please check your key and save it again.');
      }
      if (resp.status === 429) {
        /* Distinguish between rate-limit and quota exhaustion */
        if (errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('billing') || errMsg.toLowerCase().includes('exceeded your current')) {
          throw new Error('Your OpenAI account has no remaining quota. Please check your billing at https://platform.openai.com/account/billing');
        }
        throw new Error('Rate limited by OpenAI. Please wait a moment and try again.');
      }
      if (resp.status === 404) {
        throw new Error('Model not found. Your API key may not have access to gpt-4o. Try upgrading your OpenAI plan.');
      }
      if (resp.status === 500 || resp.status === 503) {
        throw new Error('OpenAI servers are temporarily unavailable. Please try again in a few seconds.');
      }
      throw new Error(errMsg || 'API error ' + resp.status);
    }

    const result = await resp.json();
    if (!result.choices || !result.choices[0]) throw new Error('Empty response from API');

    let raw = result.choices[0].message.content || '';

    raw = raw.replace(/```json|```/g, '').trim();
    const start = raw.indexOf('[');
    const end   = raw.lastIndexOf(']');
    if (start === -1 || end === -1) throw new Error('No JSON array found in response');

    allTasks = JSON.parse(raw.substring(start, end + 1));
    if (!Array.isArray(allTasks) || allTasks.length === 0) throw new Error('No tasks were extracted');

    showStatus('success', allTasks.length + ' tasks extracted successfully from ' + fname);
    renderStats();
    renderTasks();

  } catch (err) {
    showStatus('error', 'Extraction failed: ' + err.message);
    console.error(err);
  }
}

/* ── Stats ── */
function renderStats() {
  const counts   = { critical: 0, high: 0, medium: 0, low: 0 };
  allTasks.forEach(t => { counts[t.priority] = (counts[t.priority] || 0) + 1; });
  const withDate = allTasks.filter(t => t.date && t.date !== 'TBD').length;

  statsSection.innerHTML = `
    <div class="stats-row">
      <div class="stat-card">
        <div class="num">${allTasks.length}</div>
        <div class="lbl">Total tasks</div>
      </div>
      <div class="stat-card">
        <div class="num" style="color:var(--dan)">${(counts.critical || 0) + (counts.high || 0)}</div>
        <div class="lbl">High priority</div>
      </div>
      <div class="stat-card">
        <div class="num" style="color:var(--warn)">${counts.medium || 0}</div>
        <div class="lbl">Medium priority</div>
      </div>
      <div class="stat-card">
        <div class="num" style="color:var(--pri)">${withDate}</div>
        <div class="lbl">With dates</div>
      </div>
    </div>`;
  statsSection.style.display = 'block';
}

/* ── Task list ── */
function renderTasks() {
  let tasks = allTasks.filter(t => {
    const matchFilter = activeFilter === 'all'
      || t.priority === activeFilter
      || t.category === activeFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q
      || (t.title || '').toLowerCase().includes(q)
      || (t.notes || '').toLowerCase().includes(q)
      || (t.tags  || []).some(g => g.toLowerCase().includes(q));
    return matchFilter && matchSearch;
  });

  if (sortMode === 'priority') {
    tasks.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2));
  } else if (sortMode === 'date') {
    tasks.sort((a, b) => {
      if (a.date === 'TBD' && b.date === 'TBD') return 0;
      if (a.date === 'TBD') return 1;
      if (b.date === 'TBD') return -1;
      return a.date.localeCompare(b.date);
    });
  }

  taskSection.innerHTML = `
    <div class="filter-row">
      <button class="filter-btn ${activeFilter === 'all'      ? 'active' : ''}" onclick="setFilter('all')">All (${allTasks.length})</button>
      <button class="filter-btn high   ${activeFilter === 'critical' ? 'active' : ''}" onclick="setFilter('critical')">Critical</button>
      <button class="filter-btn high   ${activeFilter === 'high'     ? 'active' : ''}" onclick="setFilter('high')">High</button>
      <button class="filter-btn medium ${activeFilter === 'medium'   ? 'active' : ''}" onclick="setFilter('medium')">Medium</button>
      <button class="filter-btn low    ${activeFilter === 'low'      ? 'active' : ''}" onclick="setFilter('low')">Low</button>
      <select class="sort-select" onchange="setSort(this.value)">
        <option value="priority" ${sortMode === 'priority' ? 'selected' : ''}>Sort: Priority</option>
        <option value="date"     ${sortMode === 'date'     ? 'selected' : ''}>Sort: Date</option>
      </select>
      <input class="search-box" placeholder="Search tasks…"
             value="${escHtml(searchQuery)}"
             oninput="setSearch(this.value)" />
    </div>
    <div class="task-list" id="taskList">
      ${tasks.length === 0
        ? '<div class="empty">No tasks match your filter.</div>'
        : tasks.map(renderTask).join('')}
    </div>`;
  taskSection.style.display = 'block';
}

function renderTask(t) {
  const isDone        = doneTasks.has(t.id);
  const priorityClass = 'priority-' + (t.priority || 'medium');
  const badgeClass    = 'badge-'    + (t.priority || 'medium');
  const labelMap      = { critical: '🔴 Critical', high: 'High', medium: 'Medium', low: 'Low' };
  const label         = labelMap[t.priority] || 'Medium';

  const calIcon  = `<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
  const timeIcon = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
  const durIcon  = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`;
  const tagIcon  = `<svg viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`;
  const bellIcon = `<svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>`;
  const checkIcon = `<svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg>`;

  return `<div class="task-card ${priorityClass} ${isDone ? 'done' : ''}" id="task-${t.id}">
    <div class="task-top">
      <div class="done-check ${isDone ? 'checked' : ''}" onclick="toggleDone(${t.id})" title="Mark done">${checkIcon}</div>
      <div class="task-title">${escHtml(t.title)}</div>
      <span class="badge ${badgeClass}">${label}</span>
    </div>
    <div class="task-meta">
      ${t.date && t.date !== 'TBD'     ? `<span>${calIcon}${escHtml(t.date)}</span>` : ''}
      ${t.time && t.time !== 'TBD'     ? `<span>${timeIcon}${escHtml(t.time)}</span>` : ''}
      ${t.duration && t.duration !== 'TBD' ? `<span>${durIcon}${escHtml(t.duration)}</span>` : ''}
      ${t.category                     ? `<span>${tagIcon}${escHtml(t.category)}</span>` : ''}
    </div>
    ${t.notes   ? `<div class="task-note">${escHtml(t.notes)}</div>` : ''}
    ${t.reminder && t.reminder !== 'TBD'
      ? `<div class="reminder-badge">${bellIcon}${escHtml(t.reminder)}</div>` : ''}
    ${t.tags && t.tags.length
      ? `<div class="task-tags">${t.tags.map(g => `<span class="tag">${escHtml(g)}</span>`).join('')}</div>` : ''}
  </div>`;
}

/* ── Interactions ── */
function toggleDone(id) {
  if (doneTasks.has(id)) doneTasks.delete(id);
  else doneTasks.add(id);
  renderTasks();
}

function setFilter(f) { activeFilter = f; renderTasks(); }
function setSort(v)   { sortMode     = v; renderTasks(); }
function setSearch(v) { searchQuery  = v; renderTasks(); }

/* ── Helpers ── */
function escHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

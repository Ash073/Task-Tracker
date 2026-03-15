/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                  TaskEngine — Backend                        ║
 * ║  Stack : Node.js + Express                                   ║
 * ║  APIs  : Cloudmersive (Excel→JSON)                           ║
 * ║          + OpenAI GPT-4o mini (AI priority — ultra-cheap)    ║
 * ║  Route : POST /api/extract-tasks                             ║
 * ║  Input : multipart/form-data  field name → "file"            ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

'use strict';

require('dotenv').config();

const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const XLSX = require('xlsx');

const router = express.Router();

const OPENAI_MODEL = 'gpt-4o-mini';   
const OPENAI_BATCH = 60;              
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const CM_URL_XLSX = 'https://api.cloudmersive.com/convert/xlsx/to/json';
const CM_URL_XLS = 'https://api.cloudmersive.com/convert/xls/to/json';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /\.(xlsx|xls|csv)$/i.test(file.originalname);
    cb(ok ? null : new Error('Only .xlsx, .xls, .csv files are supported.'), ok);
  },
});

/* ═══════════════════════════════════════════════════════════
   CORE LOGIC — with professional logging and live progress
═══════════════════════════════════════════════════════════ */
async function processBuffer(buffer, originalname, onProgress) {
  const isCsv = /\.csv$/i.test(originalname);
  const isExcel = /\.(xlsx|xls)$/i.test(originalname);

  const report = (step, status, details) => {
    console.log(`[TaskEngine] [${step.toUpperCase()}] ${status === 'done' ? '✅' : status === 'error' ? '❌' : '⏳'} ${details}`);
    if (onProgress) onProgress({ step, status, details });
  };

  report('init', 'done', `Initializing extraction for: ${originalname}`);
  
  const cKey = process.env.CLOUDMERSIVE_API_KEY || '';
  const oKey = process.env.OPENAI_API_KEY || process.env.DEV_OPENAI_API_KEY || '';

  let worksheets;
  let parseSource = '';

  /* ── STEP 1: Extraction ── */
  report('parsing', 'pending', isExcel ? 'Connecting to Cloudmersive extraction node...' : 'Parsing CSV data stream...');
  
  if (isExcel) {
    if (cKey) {
      try {
        worksheets = await cloudmersiveParse(buffer, originalname, cKey);
        parseSource = 'cloudmersive';
        report('parsing', 'done', 'Professional Cloud extraction completed.');
      } catch (err) {
        report('parsing', 'warning', `Cloud parsing hit a snag: ${err.message}. Reverting to local engine.`);
        worksheets = parseExcelLocal(buffer, originalname);
        parseSource = 'local-xlsx-fallback';
        report('parsing', 'done', 'Data recovered via local extraction engine.');
      }
    } else {
      worksheets = parseExcelLocal(buffer, originalname);
      parseSource = 'local-xlsx';
      report('parsing', 'done', 'Extracted via local high-performance engine.');
    }
  } else if (isCsv) {
    worksheets = parseCsvFallback(buffer, originalname);
    parseSource = 'local-csv';
    report('parsing', 'done', 'CSV stream processed successfully.');
  }

  if (!worksheets || worksheets.length === 0) {
    report('extraction', 'error', 'No readable data found in source.');
    throw new Error('Mission failed: No readable data found.');
  }

  /* ── STEP 2: Raw Extraction ── */
  report('extraction', 'pending', 'Searching for task patterns in document structure...');
  let tasks = extractTasksFromWorksheets(worksheets);
  report('extraction', 'done', `Discovery complete. Found ${tasks.length} task candidates.`);

  /* ── STEP 3: Filtering ── */
  report('optimization', 'pending', 'Optimizing results: Removing incomplete entries...');
  const preFilterCount = tasks.length;
  tasks = tasks.filter(t => (t.time !== 'TBD' || t.duration !== 'TBD'));
  const filteredOut = preFilterCount - tasks.length;
  report('optimization', 'done', `Optimization complete. ${tasks.length} high-quality tasks retained.`);

  if (tasks.length === 0) {
    report('optimization', 'error', 'No valid tasks with time/duration found.');
    throw new Error('Extraction halt: No valid tasks found.');
  }

  /* ── STEP 4: AI Enrichment ── */
  let aiSource = 'local-heuristic';
  if (oKey) {
    report('ai', 'pending', `Analyzing ${tasks.length} tasks with GPT-4o mini intelligence...`);
    try {
      tasks = await openaiEnrich(tasks, oKey, (msg) => report('ai', 'pending', msg));
      aiSource = 'openai-gpt4o-mini';
      report('ai', 'done', 'AI analysis and enrichment accomplished.');
    } catch (err) {
      report('ai', 'warning', `AI analysis experienced a timeout. Falling back to core logic.`);
      aiSource = 'local-heuristic';
    }
  } else {
    report('ai', 'skip', 'AI enrichment bypassed (Key missing). Using standard heuristics.');
  }

  /* ── STEP 5: Final Sorting & ISO Normalization ── */
  report('finalize', 'pending', 'Standardizing and finalizing inventory...');
  tasks = finalSort(tasks);

  // Normalize to ISO timestamps for frontend/database consistency
  tasks = tasks.map(t => {
    let startTime = null;
    let endTime = null;

    if (t.date !== 'TBD' && t.time !== 'TBD') {
      try {
        const timeParts = t.time.split(/[-–]|to/i);
        const pmHint = t.time.toLowerCase().includes('pm');
        const startMins = parseTimeToMins(timeParts[0].trim(), pmHint);
        const startT = minsToTimeStr(startMins);
        
        startTime = `${t.date}T${startT}`;
        const sd = new Date(startTime);
        
        if (!isNaN(sd.getTime())) {
          startTime = sd.toISOString(); // Use full ISO
          if (timeParts[1]) {
            const endMins = parseTimeToMins(timeParts[1].trim(), pmHint);
            endTime = `${t.date}T${minsToTimeStr(endMins)}`;
            const ed = new Date(endTime);
            if (!isNaN(ed.getTime())) endTime = ed.toISOString();
            else endTime = null;
          } else if (t.duration) {
            endTime = new Date(sd.getTime() + t.duration * 60000).toISOString();
          }
        } else {
          startTime = null;
        }
      } catch (e) {
        startTime = null;
      }
    }

    return {
      ...t,
      name: t.title,
      startTime,
      endTime,
      xpReward: t.priority === 'critical' ? 100 : t.priority === 'high' ? 50 : 25
    };
  });
  
  report('finalize', 'done', 'Task inventory normalized and ready for deployment.');

  return { tasks, source: `${parseSource}+${aiSource}` };
}

/* ═══════════════════════════════════════════════════════════
   API ROUTE - Supported Live Progress via SSE
═══════════════════════════════════════════════════════════ */
router.post('/api/extract-tasks', upload.single('file'), async (req, res) => {
  const isLive = req.query.live === 'true';

  if (isLive) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
  }

  const sendProgress = (data) => {
    if (isLive) {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  };

  try {
    if (!req.file) {
      sendProgress({ error: 'No file received.' });
      return isLive ? res.end() : res.status(400).json({ success: false, error: 'No file received.' });
    }

    const { tasks, source } = await processBuffer(req.file.buffer, req.file.originalname, sendProgress);
    
    if (isLive) {
      res.write(`data: ${JSON.stringify({ success: true, totalTasks: tasks.length, source, tasks })}\n\n`);
      res.end();
    } else {
      return res.status(200).json({ success: true, totalTasks: tasks.length, source, tasks });
    }

  } catch (err) {
    console.error('[TaskEngine] ❌ Error:', err.message);
    if (isLive) {
      res.write(`data: ${JSON.stringify({ success: false, error: err.message })}\n\n`);
      res.end();
    } else {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
});

/* ═══════════════════════════════════════════════════════════
   CLOUDMERSIVE  Excel → JSON
═══════════════════════════════════════════════════════════ */
async function cloudmersiveParse(buffer, filename, key) {
  const isXlsx = /\.xlsx$/i.test(filename);
  const endpoint = isXlsx ? CM_URL_XLSX : CM_URL_XLS;

  const form = new FormData();
  form.append('inputFile', buffer, { filename, contentType: 'application/octet-stream' });

  const resp = await axios.post(endpoint, form, {
    headers: { ...form.getHeaders(), 'Apikey': key },
    maxBodyLength: Infinity,
    timeout: 45000, 
  });

  const json = resp.data;
  if (json && (json.Successful === false || json.Error || json.Message)) {
    throw new Error(json.Message || json.Error || 'Cloudmersive rejected document.');
  }

  // Handle standard Worksheets wrapper
  if (json && Array.isArray(json.Worksheets)) {
    return json.Worksheets.map(ws => ({
      sheet: ws.WorksheetName || 'Sheet',
      source: 'cloudmersive-structured',
      rows: (ws.Rows || []).map(row => (row.Cells || []).map(cell => String(cell.CellValue ?? '').trim()))
    }));
  }

  // Handle direct array of objects (Flat row set)
  if (Array.isArray(json)) {
    if (json.length > 0) {
      const headers = Object.keys(json[0]);
      const rows = [headers];
      json.forEach(obj => {
        rows.push(headers.map(h => String(obj[h] ?? '').trim()));
      });
      return [{
        sheet: 'Cloud-Import',
        source: 'cloudmersive-flat',
        rows
      }];
    }
  }

  throw new Error('Protocol Error: Unexpected Cloudmersive API footprint.');
}

/* ═══════════════════════════════════════════════════════════
   LOCAL XLSX PARSER
═══════════════════════════════════════════════════════════ */
function parseExcelLocal(buffer, filename) {
  try {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    return wb.SheetNames.map(name => {
      const ws = wb.Sheets[name];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
      return {
        sheet: name,
        source: 'local-xlsx',
        rows: rows.map(r => (Array.isArray(r) ? r.map(c => String(c ?? '').trim()) : []))
      };
    });
  } catch (err) {
    return [];
  }
}

/* ═══════════════════════════════════════════════════════════
   CSV PARSER
═══════════════════════════════════════════════════════════ */
function parseCsvFallback(buffer, filename) {
  const text = buffer.toString('utf8');
  const rows = text.split(/\r?\n/).map(line => {
    const cells = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ;
      } else if (ch === ',' && !inQ) {
        cells.push(cur.trim()); cur = '';
      } else { cur += ch; }
    }
    cells.push(cur.trim());
    return cells;
  }).filter(r => r.some(c => c.length > 0));

  return [{ sheet: filename.replace(/\.csv$/i, ''), source: 'local-csv', rows }];
}

/* ═══════════════════════════════════════════════════════════
   TASK EXTRACTION ENGINE
═══════════════════════════════════════════════════════════ */

const LINK_RX = /https?:\/\/[^\s"'<>]+/g;
const DURATION_RX = /\b(\d+\.?\d*\s*(?:hour|hr|minute|min|day|week|month)s?)\b/i;
const TIME_RXS = [
  /\b(\d{1,2}(?::\d{2})?\s*(?:[-–]|to)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i, // Range: 7-8 PM, 7 to 8 PM
  /\b(\d{1,2}:\d{2}\s*(?:am|pm)?)\b/i,                                 // Standard: 7:00 PM
  /\b(\d{1,2}\s*(?:am|pm))\b/i,                                        // Simple: 7 PM
  /\b(morning|afternoon|evening|night|midnight|noon)\b/i,              // Keywords
  /\b(\d{1,2}(?::\d{2})?\s*(?:am|pm|hrs|hours))\b/i                    // Hours
];

const DATE_RXS = [
  /\b(\d{4}[-/]\d{1,2}[-/]\d{1,2})\b/, 
  /\b(\d{1,2}[-/]\d{1,2}[-/]\d{4})\b/, 
  /\b(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{2,4})\b/i, 
  /\b((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}[,\s]+\d{2,4})\b/i,
  /\b(\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*)\b/i // 15th March
];

function extractTasksFromWorksheets(worksheets) {
  const tasks = [];
  let globalId = 1;

  for (const { sheet, rows, source } of worksheets) {
    if (!rows || rows.length < 1) continue;
    
    // Identify header and date column
    const schema = detectSchema(rows);
    const dataRows = rows.slice(schema.headerIdx + 1);

    for (const row of dataRows) {
      if (!row || row.length === 0) continue;
      const allText = row.join(' ').replace(/\s+/g, ' ').trim();
      if (allText.length < 2) continue;

      // 1. Identify valid date for this row
      let rowDate = null;
      if (schema.date >= 0) rowDate = parseDate(row[schema.date]);
      if (!rowDate) {
        for (const cell of row) {
          rowDate = parseDate(cell);
          if (rowDate) break;
        }
      }

      // 2. Schema-Agnostic Horizontal Extraction
      // We will look for clusters of data across the entire row
      const rowTasks = [];
      const usedIndices = new Set();
      if (schema.date >= 0) usedIndices.add(schema.date);

      for (let i = 0; i < row.length; i++) {
        if (usedIndices.has(i)) continue;
        const cell = String(row[i] || '').trim();
        if (!cell || cell.length < 1) continue;

        const timeInCell = extractTime(cell);

        if (timeInCell) {
          // Case A: Cell contains both time and info (e.g. "10:00 AM Meeting")
          const title = cell.replace(timeInCell, '').replace(/[()]/g, '').trim();
          if (title.length > 2) {
            rowTasks.push({ title, time: timeInCell });
            usedIndices.add(i);
            continue;
          }

          // Case B: Cell is just time, look for task in adjacent cells
          // Check i+1 (Time -> Task)
          if (i + 1 < row.length && !usedIndices.has(i + 1)) {
            const nextCell = String(row[i + 1] || '').trim();
            if (nextCell.length > 1 && !extractTime(nextCell) && !parseDate(nextCell)) {
              rowTasks.push({ title: nextCell, time: timeInCell });
              usedIndices.add(i);
              usedIndices.add(i + 1);
              continue;
            }
          }
          // Check i-1 (Task -> Time)
          if (i - 1 >= 0 && !usedIndices.has(i - 1)) {
            const prevCell = String(row[i - 1] || '').trim();
            if (prevCell.length > 1 && !extractTime(prevCell) && !parseDate(prevCell)) {
              rowTasks.push({ title: prevCell, time: timeInCell });
              usedIndices.add(i);
              usedIndices.add(i - 1);
              continue;
            }
          }
          
          // Fallback: If no adjacent text, treat as task with its own text if any
          if (timeInCell.length > 1) {
             rowTasks.push({ title: cell, time: timeInCell });
             usedIndices.add(i);
          }
        }
      }

      // 3. Last Resort: If a row has a date and some text but no time was extracted, 
      // check if the user just wants the whole row as one task
      if (rowTasks.length === 0 && rowDate) {
         const remainingText = row
           .filter((_, idx) => !usedIndices.has(idx))
           .join(' ')
           .trim();
         if (remainingText.length > 3 && !/^\d+$/.test(remainingText)) {
            rowTasks.push({ title: remainingText, time: 'TBD' });
         }
      }

      // 4. Transform and append
      for (const t of rowTasks) {
        if (/^(task|title|name|description|activity|date|time|#|no\.|sno|time\d+|task\d+)$/i.test(t.title.trim())) continue;
        
        let durationMins = 60; // Default
        if (t.time && t.time.includes('-')) {
          durationMins = calculateDurationFromRange(t.time) || 60;
        }

        // Local Priority Heuristic (Immediate feedback)
        let priority = 'low';
        const lowerTitle = t.title.toLowerCase();
        if (/\b(placement|interview|salary|career|job|dsa|sql|python|coding|study|exam|quiz|homework|learning|revision)\b/.test(lowerTitle)) {
          priority = 'high';
        }
        if (/\b(emergency|urgent|critical|immediate|asap|friend|going out|call|meeting)\b/.test(lowerTitle)) {
          priority = 'critical';
        }

        tasks.push({
          id: globalId++,
          title: t.title.substring(0, 220),
          priority, 
          category: priority === 'high' ? 'Study' : priority === 'critical' ? 'Emergency' : 'Work',
          date: rowDate || 'TBD',
          time: t.time || 'TBD',
          duration: durationMins,
          reminder: priority === 'high' ? '5min_before_after' : '',
          notes: '',
          links: [...new Set(allText.match(LINK_RX) || [])],
          tags: [rowDate || sheet],
          sheet,
          source: source + '-agnostic',
          aiEnriched: false,
          _rawText: allText.substring(0, 350),
        });
      }
    }
  }
  return tasks;
}

function calculateDurationFromRange(range) {
  try {
    const parts = range.split(/[-–]|to/i);
    if (parts.length !== 2) return null;
    const start = parseTimeToMins(parts[0], range.toLowerCase().includes('pm'));
    let end = parseTimeToMins(parts[1], range.toLowerCase().includes('pm'));
    if (end < start) end += 720; // Handle cross-noon/midnight if simple
    return end - start;
  } catch (e) { return null; }
}

function parseTimeToMins(timeStr, isPMHint) {
  if (!timeStr) return 0;
  // Handle keywords
  const kw = timeStr.toLowerCase().trim();
  if (kw === 'morning') return 9 * 60;
  if (kw === 'noon') return 12 * 60;
  if (kw === 'afternoon') return 14 * 60;
  if (kw === 'evening') return 18 * 60;
  if (kw === 'night') return 21 * 60;
  if (kw === 'midnight') return 0;

  let [hStr, mStr] = timeStr.replace(/[^\d:apm\s]/gi, '').split(':');
  let h = parseInt(hStr);
  if (isNaN(h)) return 0;
  let m = mStr ? parseInt(mStr) : 0;
  if (isNaN(m)) m = 0;
  
  const isPM = timeStr.toLowerCase().includes('pm') || (isPMHint && !timeStr.toLowerCase().includes('am'));
  if (isPM && h < 12) h += 12;
  if (!isPM && h === 12) h = 0;
  return h * 60 + m;
}

function minsToTimeStr(totalMins) {
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

function detectSchema(rows) {
  let headerIdx = 0;
  for (let i = 0; i < Math.min(6, rows.length); i++) {
    const strCount = rows[i].filter(c => c.trim().length > 0 && isNaN(c)).length;
    if (strCount >= 2) { headerIdx = i; break; }
  }
  const H = rows[headerIdx].map(h => h.toLowerCase().trim());
  const find = (...kws) => {
    for (let i = 0; i < H.length; i++) { if (kws.some(k => H[i].includes(k))) return i; }
    return -1;
  };
  const schema = {
    headerIdx,
    title: find('task', 'title', 'name', 'description', 'activity', 'item', 'event', 'what', 'subject', 'work', 'todo', 'to-do'),
    date: find('date', 'day', 'deadline', 'due', 'when', 'schedule', 'start', 'on'),
    time: find('time', 'at', 'slot', 'from', 'timing', 'hour'),
    dur: find('duration', 'length', 'hours', 'mins', 'period', 'how long'),
    notes: find('note', 'remark', 'comment', 'detail', 'info', 'additional'),
    link: find('link', 'url', 'meet', 'zoom', 'teams', 'ref', 'location', 'venue'),
  };
  if (schema.title === -1) { for (let i = 0; i < H.length; i++) { if (i !== schema.date && i !== schema.time) { schema.title = i; break; } } }
  if (schema.date === -1) {
    const sample = rows.slice(headerIdx + 1, headerIdx + 6);
    for (let col = 0; col < (rows[headerIdx]?.length || 0); col++) { if (sample.some(r => parseDate(r[col]) !== null)) { schema.date = col; break; } }
  }
  return schema;
}

function parseDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s || s.length < 3) return null;
  if (/^\d{5}$/.test(s)) {
    const n = parseInt(s, 10);
    if (n > 40000 && n < 60000) {
      const d = new Date(Date.UTC(1899, 11, 30) + n * 864e5);
      if (!isNaN(d)) return d.toISOString().slice(0, 10);
    }
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const attempts = [s, s.replace(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/, '$3-$2-$1'), s.replace(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/, '$3-$1-$2')];
  for (const a of attempts) { const d = new Date(a); if (!isNaN(d) && d.getFullYear() > 1999 && d.getFullYear() < 2100) return d.toISOString().slice(0, 10); }
  return null;
}

function extractTime(text) {
  for (const rx of TIME_RXS) { const m = rx.exec(String(text)); if (m) return m[1].trim(); }
  return null;
}

async function openaiEnrich(tasks, key, onUpdate) {
  const enriched = [...tasks];
  for (let start = 0; start < tasks.length; start += OPENAI_BATCH) {
    const batch = tasks.slice(start, start + OPENAI_BATCH);
    if (onUpdate) onUpdate(`Analyzing batch ${Math.floor(start/OPENAI_BATCH) + 1} of ${Math.ceil(tasks.length/OPENAI_BATCH)}...`);
    
    const payload = batch.map(t => ({ id: t.id, title: t.title, rawText: t._rawText || '', date: t.date, time: t.time }));
    const systemPrompt = `Analyze tasks for a productivity suite.
Follow STRICT PRIORITY RULES for the "priority" field:
- Placement, Interview, Salary, Career, Job, Placement prep, DSA, SQL, Python, Coding: high
- Study, Exam, Quiz, Homework, MS Prep, Learning, Revision, Course: high
- Emergency, Urgent, Critical, Immediate, ASAP: critical
- Meeting a friend, Going out, Having a call, Family emergency, Critical situation: critical
- Others: medium or low based on context.

Follow CATEGORY RULES:
- If high priority due to studies: category "Study"
- If high priority due to placement: category "Placement"
- If critical priority: category "Emergency"
- Others: Finance, Health, Personal, Meeting, Work

ADD REMINDER LOGIC:
- For high/critical tasks, set reminder field to "5min_before_after" to trigger dual notifications.
- For others, keep it empty or "standard".

If you see a time range in the task title (e.g. "Meeting 5-6 PM"), try to extract that into the output title.

Output raw JSON: {"results":[{"id":<id>,"priority":"critical|high|medium|low","category":"<cat>","title":"<title>","reminder":"<msg>"}]}`;

    const userPrompt = `Tasks:\n${JSON.stringify(payload)}`;
    let attempt = 0;
    while (attempt < 2) {
      try {
        const resp = await axios.post(OPENAI_URL, { 
          model: OPENAI_MODEL, 
          temperature: 0, 
          response_format: { type: 'json_object' }, 
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }] 
        }, { headers: { 'Authorization': `Bearer ${key}` }, timeout: 80000 });
        
        const results = JSON.parse(resp.data.choices[0].message.content).results || [];
        results.forEach(e => {
          const t = enriched.find(x => x.id === e.id);
          if (t) {
            t.title = e.title || t.title;
            t.priority = e.priority || 'low';
            t.category = e.category || 'Work';
            t.reminder = e.reminder || '';
            t.aiEnriched = true;
          }
        });
        break;
      } catch (err) {
        if (err.response?.status === 429 && attempt === 0) {
          await new Promise(r => setTimeout(r, 15000)); attempt++;
        } else break;
      }
    }
  }
  enriched.forEach(t => delete t._rawText);
  return enriched;
}

function finalSort(tasks) {
  const PO = { critical: 0, high: 1, medium: 2, low: 3 };
  return tasks.sort((a, b) => {
    const da = a.date === 'TBD' ? '9999-12-31' : a.date;
    const db = b.date === 'TBD' ? '9999-12-31' : b.date;
    if (da !== db) return da.localeCompare(db);
    return (PO[a.priority] ?? 3) - (PO[b.priority] ?? 3);
  });
}

/* ═══════════════════════════════════════════════════════════
   MODULE EXPORTS
═══════════════════════════════════════════════════════════ */
router.parseExcelTasks = async (buffer, filename = 'batch.xlsx') => {
  const result = await processBuffer(buffer, filename);
  return result.tasks; // Now already mapped in processBuffer
};

module.exports = router;

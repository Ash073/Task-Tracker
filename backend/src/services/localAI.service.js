/**
 * REBUILT SCHEDULER ENGINE
 * Strict priority-based overlap resolution.
 */

const GOAL_KEYWORDS = {
  placement: ['interview', 'resume', 'placement', 'job', 'career', 'internship', 'company', 'coding', 'leetcode', 'dsa', 'aptitude'],
  fitness: ['workout', 'gym', 'exercise', 'run', 'jog', 'diet', 'calories', 'protein', 'fitness', 'yoga', 'strength'],
  study: ['study', 'exam', 'lecture', 'notes', 'assignment', 'homework', 'revision', 'test', 'chapter', 'subject'],
  project: ['project', 'feature', 'bug', 'deploy', 'build', 'develop', 'code', 'sprint', 'milestone', 'release'],
  health: ['doctor', 'medicine', 'sleep', 'water', 'meditate', 'therapy', 'mental', 'health', 'appointment'],
  finance: ['budget', 'invest', 'savings', 'expense', 'payment', 'bill', 'loan', 'finance', 'money', 'salary'],
};

const LOCAL_QUOTES = {
  Critical: [
    "This is critical. Stop everything else and do this NOW.",
    "Your most important task is waiting. Execute immediately.",
    "Critical alert: This task defines your success today.",
    "No excuses. This is the task that matters most right now.",
    "The window is closing. Act on this critical task immediately.",
  ],
  High: [
    "High priority task — your future self will thank you for doing this now.",
    "This task is directly connected to your main goal. Don't delay.",
    "Strong focus required. This is a high-value task.",
    "Every minute you delay this, you lose ground. Move now.",
    "Do it now. High priority tasks define achievers.",
  ],
  Medium: [
    "Stay consistent. Every task completed builds momentum.",
    "Medium priority — but skipping it is how goals fall apart.",
    "Your streak depends on completing this. Don't break it.",
    "Small actions compound into massive results. Do this now.",
    "You're building a system. This task is part of it.",
  ],
  Low: [
    "Small task, big discipline. Complete it and move on.",
    "Even low priority tasks matter when done consistently.",
    "Clear your list. Finish this and stay in flow.",
    "Done is better than perfect. Knock this out.",
    "Building habits means doing the small things too.",
  ],
  study: [
    "Your exams won't wait. Your competitors are studying right now.",
    "Every page you study is an advantage others don't have.",
    "Knowledge compounds. Study now, lead later.",
    "Education is the most powerful weapon which you can use to change the world.",
  ],
  placement: [
    "Your dream company is watching people who prepare. Be one of them.",
    "The offer letter goes to those who prepared when others didn't.",
    "One more problem solved today = one step closer to placement.",
  ],
  fitness: [
    "Your body is built in the moments you don't want to show up.",
    "Skip today, regret tomorrow. Show up.",
    "Every rep is a vote for the person you want to become.",
  ],
  project: [
    "Ship it. Progress beats perfection.",
    "Every feature you build is proof you can build.",
    "Your project won't finish itself. One task at a time.",
  ],
};

function getLocalQuote(priority, goal = '') {
  const goalQuotes = LOCAL_QUOTES[goal] || [];
  const priorityQuotes = LOCAL_QUOTES[priority] || LOCAL_QUOTES['Medium'];
  const pool = [...goalQuotes, ...priorityQuotes];
  return pool[Math.floor(Math.random() * pool.length)];
}

function detectGoal(tasks) {
  const scores = {};
  for (const [goal, keywords] of Object.entries(GOAL_KEYWORDS)) {
    scores[goal] = 0;
    for (const task of tasks) {
      const text = `${task.name || task.task} ${task.notes || ''} ${task.category || ''} ${task.goalTag || ''}`.toLowerCase();
      for (const kw of keywords) {
        if (text.includes(kw)) scores[goal]++;
      }
    }
  }
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return sorted[0][1] > 0 ? sorted[0][0] : 'general';
}

function adjustSchedule(tasks) {
  const PRIORITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  
  // 1. Sort by Start DateTime
  const sortedByTime = [...tasks].sort((a, b) => {
    if (!a.startTime) return 1;
    if (!b.startTime) return -1;
    return new Date(a.startTime) - new Date(b.startTime);
  });

  const timeSlots = [];
  const conflicts = [];
  const unscheduled = [];

  // 2. Sort by Priority for processing
  const processingQueue = [...sortedByTime].sort((a, b) => {
    const p1 = PRIORITY_ORDER[a.priority] ?? 3;
    const p2 = PRIORITY_ORDER[b.priority] ?? 3;
    if (p1 !== p2) return p1 - p2;
    return new Date(a.startTime) - new Date(b.startTime);
  });

  for (const task of processingQueue) {
    if (!task.startTime) {
      unscheduled.push(task);
      continue;
    }

    let start = new Date(task.startTime);
    if (isNaN(start.getTime())) {
      unscheduled.push(task);
      continue;
    }
    
    let dur = (task.duration || 0) * 60 * 1000;
    let end = new Date(start.getTime() + dur);

    let hasConflict = true;
    let iterations = 0;

    while (hasConflict && iterations < 500) {
      hasConflict = false;
      for (const slot of timeSlots) {
        // Strict Overlap: start < slot.end AND end > slot.start
        if (start < slot.end && end > slot.start) {
          hasConflict = true;
          start = new Date(slot.end); // Move forward
          end = new Date(start.getTime() + dur);
          break;
        }
      }
      iterations++;
    }

    if (iterations > 1 && iterations < 500) {
      conflicts.push(task.task || task.name);
    }

    task.startTime = start;
    task.endTime = end;
    timeSlots.push({ start, end, task });
  }

  const finalTasks = [...timeSlots.map(s => s.task), ...unscheduled].sort((a, b) => {
    if (!a.startTime) return 1;
    if (!b.startTime) return -1;
    return new Date(a.startTime) - new Date(b.startTime);
  });

  console.log(`[Scheduler Debug] Scheduled tasks: ${timeSlots.length}`);
  return { tasks: finalTasks, conflicts };
}

function analyzeWeakAreas(allTasks) {
  const stats = {};
  for (const t of allTasks) {
    const cat = t.category || 'General';
    if (!stats[cat]) stats[cat] = { total: 0, completed: 0 };
    stats[cat].total++;
    if (t.status === 'completed') stats[cat].completed++;
  }
  return Object.entries(stats)
    .filter(([_, s]) => s.total >= 2 && (s.completed / s.total) < 0.5)
    .map(([cat]) => cat);
}

function getReminderStrength(priority, minutesToDeadline) {
  if (priority === 'Critical' || minutesToDeadline <= 15) return 'critical';
  if (priority === 'High' || minutesToDeadline <= 60) return 'high';
  return 'normal';
}

function parseOCRToItems(text) {
  if (!text) return [];
  const lines = text.split('\n').filter(l => l.trim().length > 1);
  const items = [];

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Heuristic: Skip likely header/footer noise unless it contains numbers (potential items)
    if (/invoice|receipt|date|total|subtotal|tax|balance|amount|cash|change|payment|visa|mastercard|shipped|billed/i.test(trimmed) && trimmed.length < 30) {
       // Only skip if no numerical quantity pattern is found
       if (!/\d+(\s*(kg|g|pcs|nos|x))/i.test(trimmed)) continue;
    }

    // Extraction: Qty + Item Name
    // Pattern 1: "2 kg Apples" or "5 Apples"
    // Pattern 2: "Apples 2 kg"
    // Pattern 3: "Apples x 5"
    
    let quantity = null;
    let unit = '';
    let itemName = trimmed;

    // Try to find quantity pattern: number optionally followed by units
    const qtyRegex = /\b(\d+(\.\d+)?)\s*(kg|g|pcs|nos|count|x|units|lb|pk|pack|ml|l|ltr)\b/i;
    const match = trimmed.match(qtyRegex);

    if (match) {
      quantity = parseFloat(match[1]);
      unit = match[3] || '';
      // Remove quantity part from name
      itemName = trimmed.replace(match[0], '').trim();
    } else {
      // Look for plain number at start or end that might be quantity
      const plainNumMatch = trimmed.match(/^\d+\b/) || trimmed.match(/\b\d+$/);
      if (plainNumMatch && !trimmed.match(/\d+:\d+/)) { // avoid times
        quantity = parseFloat(plainNumMatch[0]);
        itemName = trimmed.replace(plainNumMatch[0], '').trim();
      }
    }

    // Final cleanup of item name
    itemName = itemName.replace(/^[-*•]\s*/, '').replace(/[:;,]$/, '').trim();

    if (itemName.length > 2) {
      items.push({
        name: itemName,
        quantity, // null signals missing quantity
        unit: unit || 'pcs',
        cost: 0,
        notes: ''
      });
    }
  }

  // Final filter: usually shopping items aren't 100% digits or symbols
  return items.filter(it => /[a-zA-Z]/.test(it.name));
}

module.exports = {
  detectGoal,
  adjustSchedule,
  analyzeWeakAreas,
  getReminderStrength,
  parseOCRToItems,
  getLocalQuote
};

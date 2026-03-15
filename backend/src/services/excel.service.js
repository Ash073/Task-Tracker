const { parseExcelTasks: extractTasks } = require('../../taskEngine');
const ExcelJS = require('exceljs');

async function parseExcelTasks(buffer) {
  try {
    console.log('[Excel Service] Using taskEngine.js for extraction');
    const tasks = await extractTasks(buffer);
    console.log(`[Excel Service] extracted ${tasks.length} tasks`);
    return tasks;
  } catch (err) {
    console.error('[Excel Service] taskEngine failed, falling back to basic parser', err);
    // Fallback if needed, but taskEngine should be the primary now
    throw err;
  }
}

async function parseExcelShopping(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.getWorksheet(1);
  if (!sheet) return [];

  const items = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const name = row.getCell(1).value;
    if (!name) return;
    items.push({
      name: String(name).trim(),
      quantity: parseFloat(row.getCell(2).value) || 1,
      unit: String(row.getCell(3).value || '').trim(),
      cost: parseFloat(row.getCell(4).value) || 0,
      notes: String(row.getCell(5).value || '').trim(),
    });
  });
  return items;
}

module.exports = { parseExcelTasks, parseExcelShopping };

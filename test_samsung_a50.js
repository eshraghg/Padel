import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runTest() {
  console.log('Launching browser with Samsung Galaxy A50 viewport (412 x 892)...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // Set exact viewport for Samsung Galaxy A50
  await page.setViewport({
    width: 412,
    height: 892,
    deviceScaleFactor: 2.625,
    isMobile: true,
    hasTouch: true
  });

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });

  // 1. Screenshot Record Tab
  await page.screenshot({ path: path.join(__dirname, 'a50_1_record.png') });
  console.log('Saved a50_1_record.png');

  // Load demo match
  await page.evaluate(() => {
    // Click demo button in header
    window.confirm = () => true;
    document.getElementById('btn-demo-load').click();
  });
  await new Promise(r => setTimeout(r, 600));

  // 2. Go to Sheet Tab
  await page.evaluate(() => {
    const navItems = document.querySelectorAll('.nav-item');
    navItems[1].click(); // Sheet
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(__dirname, 'a50_2_sheet.png') });
  console.log('Saved a50_2_sheet.png');

  // 3. Click Edit on Row #2
  console.log('Clicking edit on row #2...');
  await page.evaluate(() => {
    const editBtns = document.querySelectorAll('.btn-edit-pt');
    if (editBtns.length >= 2) {
      editBtns[1].click(); // Row 2
    }
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(__dirname, 'a50_3_edit_modal.png') });
  console.log('Saved a50_3_edit_modal.png');

  // 4. Change shot to 'Smash' and edit note in modal, then save
  console.log('Editing row #2 values and saving...');
  await page.evaluate(() => {
    const shotSelect = document.getElementById('edit-shot-select');
    shotSelect.value = 'Smash';
    shotSelect.dispatchEvent(new Event('change'));

    const noteInput = document.getElementById('edit-note-input');
    noteInput.value = 'Super smash winner (Edited)';

    document.getElementById('btn-save-edit').click();
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(__dirname, 'a50_4_sheet_after_edit.png') });
  console.log('Saved a50_4_sheet_after_edit.png');

  // 5. Go to Summary Tab
  await page.evaluate(() => {
    const navItems = document.querySelectorAll('.nav-item');
    navItems[2].click(); // Summary
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(__dirname, 'a50_5_summary.png') });
  console.log('Saved a50_5_summary.png');

  // 6. Go to Analytics Tab
  await page.evaluate(() => {
    const navItems = document.querySelectorAll('.nav-item');
    navItems[3].click(); // Analytics
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(__dirname, 'a50_6_analytics.png') });
  console.log('Saved a50_6_analytics.png');

  await browser.close();
  console.log('All Samsung Galaxy A50 tests completed successfully!');
}

runTest().catch(console.error);

const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = 'http://127.0.0.1:5501/admin/index.html';
const ARTIFACT_DIR = '/Users/ffh/.gemini/antigravity-ide/brain/dc115c9b-f408-4e3b-ad9a-ea2f4aac9e79';

const VIEWPORTS = [
  { name: 'iphone_se_320', width: 320, height: 568 },
  { name: 'iphone_se_375', width: 375, height: 667 },
  { name: 'iphone_14_390', width: 390, height: 844 },
  { name: 'iphone_max_430', width: 430, height: 932 },
  { name: 'tablet_768', width: 768, height: 1024 }
];

async function checkHorizontalOverflow(page) {
  return await page.evaluate(() => {
    const docWidth = document.documentElement.clientWidth;
    const scrollWidth = document.documentElement.scrollWidth;
    const bodyScrollWidth = document.body.scrollWidth;
    
    // Find any elements exceeding clientWidth
    const overflowing = [];
    const all = document.querySelectorAll('*');
    for (const el of all) {
      const rect = el.getBoundingClientRect();
      if (rect.right > docWidth + 1 && el.offsetParent !== null) {
        overflowing.push({
          tag: el.tagName,
          id: el.id,
          className: el.className,
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          limit: docWidth
        });
      }
    }
    return {
      docWidth,
      scrollWidth,
      bodyScrollWidth,
      hasOverflow: scrollWidth > docWidth || bodyScrollWidth > docWidth,
      overflowingElements: overflowing.slice(0, 10)
    };
  });
}

async function run() {
  console.log('Launching Chrome via puppeteer-core...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const results = {};

  for (const vp of VIEWPORTS) {
    console.log(`\n========================================`);
    console.log(`Testing Viewport: ${vp.name} (${vp.width}x${vp.height})`);
    console.log(`========================================`);

    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({ width: vp.width, height: vp.height, isMobile: true, hasTouch: true });

    // Navigate to admin
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });

    // 1. Test Login View
    const loginOverflow = await checkHorizontalOverflow(page);
    console.log(`[${vp.name}] Login Screen Overflow:`, loginOverflow.hasOverflow ? 'FAIL' : 'PASS', 
                `(${loginOverflow.scrollWidth}/${loginOverflow.docWidth})`);
    if (loginOverflow.hasOverflow) {
      console.log('Overflow elements:', loginOverflow.overflowingElements);
    }
    await page.screenshot({ path: path.join(ARTIFACT_DIR, `screen_${vp.name}_login.png`) });

    // Auto-fill and submit login
    await page.click('#btnDemoSuperAdmin');
    await page.evaluate(() => {
      const form = document.getElementById('adminLoginForm');
      if (form) form.requestSubmit();
    });

    // Wait for dashboard view to become visible
    await page.waitForFunction(() => {
      const el = document.getElementById('adminDashboardView');
      return el && el.style.display !== 'none';
    }, { timeout: 8000 });

    console.log(`[${vp.name}] Successfully logged in to Dashboard!`);

    // 2. Test Overview Tab
    await new Promise(r => setTimeout(r, 400));
    const overviewOverflow = await checkHorizontalOverflow(page);
    console.log(`[${vp.name}] Overview Tab Overflow:`, overviewOverflow.hasOverflow ? 'FAIL' : 'PASS',
                `(${overviewOverflow.scrollWidth}/${overviewOverflow.docWidth})`);
    if (overviewOverflow.hasOverflow) {
      console.log('Overflow elements in Overview:', overviewOverflow.overflowingElements);
    }
    await page.screenshot({ path: path.join(ARTIFACT_DIR, `screen_${vp.name}_overview.png`) });

    // 3. Test Drawer Toggle
    await page.click('#btnSidebarToggle');
    await new Promise(r => setTimeout(r, 350));
    const sidebarOpen = await page.evaluate(() => {
      const sb = document.getElementById('adminSidebar');
      return sb && sb.classList.contains('open');
    });
    console.log(`[${vp.name}] Sidebar Drawer Opened:`, sidebarOpen ? 'PASS' : 'FAIL');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, `screen_${vp.name}_sidebar_open.png`) });

    // Close drawer via close button
    await page.click('#btnSidebarClose');
    await new Promise(r => setTimeout(r, 350));

    // 4. Test Members Tab
    await page.evaluate(() => {
      const link = document.querySelector('[data-admin-tab="members"]');
      if (link) link.click();
    });
    await new Promise(r => setTimeout(r, 400));
    const membersOverflow = await checkHorizontalOverflow(page);
    console.log(`[${vp.name}] Members Tab Overflow:`, membersOverflow.hasOverflow ? 'FAIL' : 'PASS',
                `(${membersOverflow.scrollWidth}/${membersOverflow.docWidth})`);
    if (membersOverflow.hasOverflow) {
      console.log('Overflow elements in Members:', membersOverflow.overflowingElements);
    }
    await page.screenshot({ path: path.join(ARTIFACT_DIR, `screen_${vp.name}_members.png`) });

    // 5. Test Member Dossier Modal
    await page.evaluate(() => {
      if (window.viewMemberDossier) window.viewMemberDossier('MEM-2026-001');
    });
    await new Promise(r => setTimeout(r, 400));
    const modalDossierOverflow = await checkHorizontalOverflow(page);
    console.log(`[${vp.name}] Dossier Modal Overflow:`, modalDossierOverflow.hasOverflow ? 'FAIL' : 'PASS');
    if (modalDossierOverflow.hasOverflow) {
      console.log('Overflow elements in Dossier Modal:', modalDossierOverflow.overflowingElements);
    }
    await page.screenshot({ path: path.join(ARTIFACT_DIR, `screen_${vp.name}_dossier_modal.png`) });

    // Close Modal
    await page.evaluate(() => {
      if (window.closeAllModals) window.closeAllModals();
    });
    await new Promise(r => setTimeout(r, 300));

    // 6. Test Disapproval Modal
    await page.evaluate(() => {
      if (window.openDisapproveModal) window.openDisapproveModal('MEM-2026-002');
    });
    await new Promise(r => setTimeout(r, 400));
    const modalDisapproveOverflow = await checkHorizontalOverflow(page);
    console.log(`[${vp.name}] Disapprove Modal Overflow:`, modalDisapproveOverflow.hasOverflow ? 'FAIL' : 'PASS');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, `screen_${vp.name}_disapprove_modal.png`) });

    await page.evaluate(() => {
      if (window.closeAllModals) window.closeAllModals();
    });
    await new Promise(r => setTimeout(r, 300));

    // 7. Test Projects Tab
    await page.evaluate(() => {
      const link = document.querySelector('[data-admin-tab="projects"]');
      if (link) link.click();
    });
    await new Promise(r => setTimeout(r, 400));
    const projectsOverflow = await checkHorizontalOverflow(page);
    console.log(`[${vp.name}] Projects Tab Overflow:`, projectsOverflow.hasOverflow ? 'FAIL' : 'PASS');
    if (projectsOverflow.hasOverflow) {
      console.log('Overflow elements in Projects:', projectsOverflow.overflowingElements);
    }
    await page.screenshot({ path: path.join(ARTIFACT_DIR, `screen_${vp.name}_projects.png`) });

    // 8. Test Resources Tab
    await page.evaluate(() => {
      const link = document.querySelector('[data-admin-tab="resources"]');
      if (link) link.click();
    });
    await new Promise(r => setTimeout(r, 400));
    const resourcesOverflow = await checkHorizontalOverflow(page);
    console.log(`[${vp.name}] Resources Tab Overflow:`, resourcesOverflow.hasOverflow ? 'FAIL' : 'PASS');
    if (resourcesOverflow.hasOverflow) {
      console.log('Overflow elements in Resources:', resourcesOverflow.overflowingElements);
    }
    await page.screenshot({ path: path.join(ARTIFACT_DIR, `screen_${vp.name}_resources.png`) });

    // 9. Test New Resource Upload Modal (with dropzone)
    await page.evaluate(() => {
      if (window.openModal) window.openModal('newResourceModal');
    });
    await new Promise(r => setTimeout(r, 400));
    const resourceModalOverflow = await checkHorizontalOverflow(page);
    console.log(`[${vp.name}] Resource Upload Modal Overflow:`, resourceModalOverflow.hasOverflow ? 'FAIL' : 'PASS');
    if (resourceModalOverflow.hasOverflow) {
      console.log('Overflow elements in Resource Modal:', resourceModalOverflow.overflowingElements);
    }
    await page.screenshot({ path: path.join(ARTIFACT_DIR, `screen_${vp.name}_resource_modal.png`) });

    await page.evaluate(() => {
      if (window.closeAllModals) window.closeAllModals();
    });
    await new Promise(r => setTimeout(r, 300));

    // 10. Test Settings Tab
    await page.evaluate(() => {
      const link = document.querySelector('[data-admin-tab="settings"]');
      if (link) link.click();
    });
    await new Promise(r => setTimeout(r, 400));
    const settingsOverflow = await checkHorizontalOverflow(page);
    console.log(`[${vp.name}] Settings Tab Overflow:`, settingsOverflow.hasOverflow ? 'FAIL' : 'PASS');
    if (settingsOverflow.hasOverflow) {
      console.log('Overflow elements in Settings:', settingsOverflow.overflowingElements);
    }
    await page.screenshot({ path: path.join(ARTIFACT_DIR, `screen_${vp.name}_settings.png`) });

    results[vp.name] = {
      login: !loginOverflow.hasOverflow,
      overview: !overviewOverflow.hasOverflow,
      sidebar: sidebarOpen,
      members: !membersOverflow.hasOverflow,
      dossierModal: !modalDossierOverflow.hasOverflow,
      disapproveModal: !modalDisapproveOverflow.hasOverflow,
      projects: !projectsOverflow.hasOverflow,
      resources: !resourcesOverflow.hasOverflow,
      resourceModal: !resourceModalOverflow.hasOverflow,
      settings: !settingsOverflow.hasOverflow
    };

    await context.close();
  }

  await browser.close();
  console.log('\n========================================');
  console.log('FINAL RESPONSIVE AUDIT SUMMARY:');
  console.log('========================================');
  console.log(JSON.stringify(results, null, 2));
}

run().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});

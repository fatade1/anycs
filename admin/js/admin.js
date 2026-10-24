// ==========================================================================
// NCSYF ADMIN PORTAL LOGIC & CONTROLLER
// Nigeria Civil Service Youths' Forum Management Console
// ==========================================================================

const STORAGE_KEYS = {
  AUTH: 'ncsyf_admin_auth',
  ADMIN_USERS: 'ncsyf_admin_users',
  MEMBERS: 'ncsyf_registered_members',
  PROJECTS: 'ncsyf_admin_projects',
  RESOURCES: 'ncsyf_admin_resources',
  GALLERY: 'ncsyf_admin_gallery',
  API_CONFIG: 'ncsyf_admin_api_config'
};

// HTML Output Encoding Helper to neutralize XSS vectors
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Cryptographic Password Hashing Utility (Web Crypto API)
async function hashAdminPassword(password, salt) {
  if (!window.crypto || !window.crypto.subtle) {
    return 'hash_' + salt + '_' + btoa(password);
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(`${salt}:${password}`);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Login Rate Limiting & Brute-Force Lockout for Administration Console
const ADMIN_FAILED_LOGIN_KEY = 'ncsyf_admin_failed_attempts';
const ADMIN_MAX_FAILED_ATTEMPTS = 5;
const ADMIN_LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes

function checkAdminLoginRateLimit() {
  try {
    const raw = sessionStorage.getItem(ADMIN_FAILED_LOGIN_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.lockUntil && Date.now() < parsed.lockUntil) {
        const remSecs = Math.ceil((parsed.lockUntil - Date.now()) / 1000);
        throw new Error(`Too many failed login attempts. Workstation temporarily locked. Please try again in ${remSecs} seconds.`);
      }
    }
  } catch (e) {
    if (e.message && e.message.includes('Too many failed')) throw e;
  }
}

function recordAdminFailedLogin() {
  try {
    const raw = sessionStorage.getItem(ADMIN_FAILED_LOGIN_KEY);
    const state = raw ? JSON.parse(raw) : { count: 0, lockUntil: 0 };
    state.count = (state.count || 0) + 1;
    if (state.count >= ADMIN_MAX_FAILED_ATTEMPTS) {
      state.lockUntil = Date.now() + ADMIN_LOCKOUT_MS;
      state.count = 0;
    }
    sessionStorage.setItem(ADMIN_FAILED_LOGIN_KEY, JSON.stringify(state));
  } catch (e) {}
}

function resetAdminFailedLogin() {
  try {
    sessionStorage.removeItem(ADMIN_FAILED_LOGIN_KEY);
  } catch (e) {}
}

// ---- Administrator Accounts Seed Data (Hashed - No Plaintext Credentials) ----
const SEED_ADMIN_USERS = [
  {
    id: 'ADM-001',
    name: 'National Secretariat Super Admin',
    email: 'admin@ncsyf.com.ng',
    passwordHash: '46940140b4a15dc9d9ac3474834d86cfd8dd2a37f06055519995c811b6ce2cb8',
    salt: 'ncsyf_sec_2026_salt',
    role: 'super_admin',
    roleLabel: 'Super Administrator',
    createdAt: '2026-09-01',
    status: 'active'
  }
];

// ---- Realistic Initial Seed Data (Cleared to start fresh with 0 members) ----
const SEED_MEMBERS = [];

const SEED_PROJECTS = [
  {
    id: 'PRJ-001',
    title: 'Civil Service AI & Digital Paperless Workflow Pilot',
    sector: 'Technology & Innovation',
    leadMda: 'Federal Ministry of Communications, Innovation & Digital Economy / NITDA',
    status: 'active',
    statusLabel: 'Active Implementation',
    targetBeneficiaries: '15,000+ Young Public Servants',
    budget: '₦85,000,000',
    description: 'A nationwide transformation program training serving youths in MDAs on digital records management, workflow automation, and collaborative paperless administration.',
    images: [
      'images/project_digital_office.jpg',
      'images/african-youth-civil-servants.jpg'
    ],
    dateAdded: '2026-09-15'
  },
  {
    id: 'PRJ-002',
    title: 'Youth Agri-Tech Public Service Cluster (FMAFS)',
    sector: 'Agriculture & Food Security',
    leadMda: 'Federal Ministry of Agriculture & Food Security',
    status: 'active',
    statusLabel: 'Active Implementation',
    targetBeneficiaries: '36 State Chapters & FCT',
    budget: '₦120,000,000',
    description: 'Empowering young desk officers and agricultural extension public servants with satellite-guided crop monitoring and grain reserve logistics tracking systems.',
    images: [
      'images/project_agritech.jpg'
    ],
    dateAdded: '2026-09-20'
  },
  {
    id: 'PRJ-003',
    title: 'Primary Healthcare Electronic Registry & Service Delivery Track',
    sector: 'Healthcare & Social Welfare',
    leadMda: 'National Primary Health Care Development Agency (NPHCDA)',
    status: 'planning',
    statusLabel: 'Planning & Review',
    targetBeneficiaries: '774 LGAs Nationwide',
    budget: '₦95,000,000',
    description: 'Modernizing vaccine cold-chain reporting and primary healthcare center tracking by mobilizing LGA youth health officers.',
    images: [
      'images/project_healthcare.jpg'
    ],
    dateAdded: '2026-09-28'
  },
  {
    id: 'PRJ-004',
    title: 'Public Service Transparency & Procurement Integrity Dashboard',
    sector: 'Governance & Economy',
    leadMda: 'Bureau of Public Procurement (BPP)',
    status: 'active',
    statusLabel: 'Active Implementation',
    targetBeneficiaries: 'All Federal MDAs',
    budget: '₦40,000,000',
    description: 'An open-source procurement analytics dashboard managed by young procurement and finance officers to track contract delivery benchmarks.',
    images: [
      'images/project_governance.jpg'
    ],
    dateAdded: '2026-10-01'
  }
];

const SEED_RESOURCES = [
  {
    id: 'RES-001',
    title: 'Federal Public Service Rules (PSR) 2026 Youth Operational Handbook',
    category: 'Legal Framework & Bye-laws',
    publishingMda: 'Office of the Head of Civil Service of the Federation (OHCSF)',
    fileType: 'PDF',
    fileSize: '4.2 MB',
    downloads: 1420,
    description: 'Complete annotated guide to public service ethics, promotion guidelines, discipline, and career progression for young civil servants.',
    dateAdded: '2026-09-10'
  },
  {
    id: 'RES-002',
    title: 'NCSYF Constitution & National Bye-laws (Adopted 2026)',
    category: 'Constitution & Charter',
    publishingMda: 'Nigeria Civil Service Youths\' Forum Secretariat',
    fileType: 'PDF',
    fileSize: '2.8 MB',
    downloads: 2890,
    description: 'The foundational legal charter defining membership rights, NEC governance, State Chapter structures, and election guidelines.',
    dateAdded: '2026-09-12'
  },
  {
    id: 'RES-003',
    title: 'Civil Service AI Literacy & Data Protection (NDPA 2023) Guidelines',
    category: 'Policy Brief & Circular',
    publishingMda: 'Nigeria Data Protection Commission (NDPC) & NITDA',
    fileType: 'PDF',
    fileSize: '1.9 MB',
    downloads: 980,
    description: 'Standards and technical guidance for processing government records in compliance with the Nigeria Data Protection Act 2023.',
    dateAdded: '2026-09-25'
  },
  {
    id: 'RES-004',
    title: 'Monitoring & Evaluation (M&E) Framework for Youth Civil Service Projects',
    category: 'Training Manual & Toolkit',
    publishingMda: 'National Planning Commission / FMF',
    fileType: 'DOCX',
    fileSize: '1.1 MB',
    downloads: 650,
    description: 'Step-by-step toolkit with KPI scorecards, reporting templates, and audit benchmarks for MDA project coordinators.',
    dateAdded: '2026-10-02'
  }
];

const SEED_GALLERY_ALBUMS = [
  {
    id: 'GAL-001',
    title: 'National Public Service Innovation Summit 2026',
    category: 'Summits & Conferences',
    location: 'International Conference Centre, Abuja FCT',
    date: '2026-09-18',
    description: 'High-level federal assembly gathering 1,500+ young civil servants from all 36 States and FCT to formulate digital service delivery roadmaps and paperless workflows.',
    images: [
      'images/gallery_national_summit.jpg',
      'images/african-youth-civil-servants.jpg',
      'images/project_digital_office.jpg'
    ],
    dateAdded: '2026-09-18'
  },
  {
    id: 'GAL-002',
    title: 'State Chapter Official Leadership Inauguration & Induction',
    category: 'State Chapter Invocations',
    location: 'Public Service Staff Hall, Lagos & FCT Secretariat',
    date: '2026-09-22',
    description: 'Formal swearing-in ceremony for newly appointed State Chapter Executive Committees and zonal youth coordinators driving Track B public service modernization.',
    images: [
      'images/gallery_state_inauguration.jpg',
      'images/project_governance.jpg'
    ],
    dateAdded: '2026-09-22'
  },
  {
    id: 'GAL-003',
    title: 'Civil Service E-Governance & Artificial Intelligence Workshop',
    category: 'Training & Workshops',
    location: 'Digital Transformation Academy, Area 1, Garki, Abuja',
    date: '2026-09-29',
    description: 'Hands-on practical training equipping desk officers with AI productivity tools, secure data pipelines, and electronic document routing techniques.',
    images: [
      'images/gallery_digital_training.jpg',
      'images/project_agritech.jpg'
    ],
    dateAdded: '2026-09-29'
  },
  {
    id: 'GAL-004',
    title: 'Primary Healthcare Community Outreach & Health Mission',
    category: 'Community Outreach',
    location: 'Kano State Chapter & FCT Area Councils',
    date: '2026-10-04',
    description: 'Youth civil servants in public health cadres conducting grassroots health assessments, immunization logistic verification, and medical supply audits.',
    images: [
      'images/project_healthcare.jpg',
      'images/african-youth-civil-servants.jpg'
    ],
    dateAdded: '2026-10-04'
  }
];

// ---- Store Helpers ----
function getStoredAdminUsers() {
  const data = localStorage.getItem(STORAGE_KEYS.ADMIN_USERS);
  let admins = SEED_ADMIN_USERS;
  if (data) {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length) admins = parsed;
    } catch (e) {}
  }

  // Ensure only authorized admins exist, superadmin is admin@ncsyf.com.ng, and old demo accounts are purged
  let modified = false;
  const initialLen = admins.length;
  // Remove old seed / demo accounts that shouldn't exist
  admins = admins.filter(a => a.email !== 'officer@anycs.org.ng' && a.email !== 'admin@anycs.org.ng');
  if (admins.length !== initialLen) modified = true;

  // Ensure admin@ncsyf.com.ng exists as the primary superadmin
  const hasSuper = admins.some(a => a.email.toLowerCase() === 'admin@ncsyf.com.ng');
  if (!hasSuper) {
    const adm001 = admins.find(a => a.id === 'ADM-001');
    if (adm001) {
      adm001.email = 'admin@ncsyf.com.ng';
      adm001.name = 'National Secretariat Super Admin';
      adm001.role = 'super_admin';
      adm001.roleLabel = 'Super Administrator';
      adm001.passwordHash = '46940140b4a15dc9d9ac3474834d86cfd8dd2a37f06055519995c811b6ce2cb8';
      adm001.salt = 'ncsyf_sec_2026_salt';
      delete adm001.password;
      adm001.status = 'active';
      modified = true;
    } else {
      admins.unshift({
        id: 'ADM-001',
        name: 'National Secretariat Super Admin',
        email: 'admin@ncsyf.com.ng',
        passwordHash: '46940140b4a15dc9d9ac3474834d86cfd8dd2a37f06055519995c811b6ce2cb8',
        salt: 'ncsyf_sec_2026_salt',
        role: 'super_admin',
        roleLabel: 'Super Administrator',
        createdAt: '2026-09-01',
        status: 'active'
      });
      modified = true;
    }
  }

  if (modified || !data) {
    localStorage.setItem(STORAGE_KEYS.ADMIN_USERS, JSON.stringify(admins));
  }

  return admins;
}

function saveAdminUsers(users) {
  localStorage.setItem(STORAGE_KEYS.ADMIN_USERS, JSON.stringify(users));
}

function getStoredMembers() {
  const data = localStorage.getItem(STORAGE_KEYS.MEMBERS);
  let members = [];
  if (data) {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) members = parsed;
    } catch (e) {}
  }

  // Ensure every member has a valid Member ID: NCSYF-YYYY-XXXX (distinct from Staff ID)
  let modified = false;
  const yearCounters = {};

  members.forEach(m => {
    let year = '2026';
    if (m.dob && m.dob.includes('-')) {
      const parts = m.dob.split('-');
      if (parts[0] && parts[0].length === 4) year = parts[0];
    } else if (m.age) {
      year = String(new Date().getFullYear() - m.age);
    }

    if (!m.memberId || !m.memberId.startsWith('NCSYF-')) {
      yearCounters[year] = (yearCounters[year] || 0) + 1;
      m.memberId = `NCSYF-${year}-${String(yearCounters[year]).padStart(4, '0')}`;
      modified = true;
    } else {
      const match = m.memberId.match(/NCSYF-(\d{4})-(\d+)/);
      if (match) {
        const y = match[1];
        const num = parseInt(match[2], 10);
        if (!yearCounters[y] || num > yearCounters[y]) {
          yearCounters[y] = num;
        }
      }
    }
  });

  if (modified) {
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
  }
  return members;
}

function saveMembers(members) {
  localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
}

function getStoredProjects() {
  const data = localStorage.getItem(STORAGE_KEYS.PROJECTS);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(SEED_PROJECTS));
    return SEED_PROJECTS;
  }
  try {
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed) && parsed.length) {
      const defaultSectorFallback = {
        'Technology & Innovation': ['images/project_digital_office.jpg'],
        'Agriculture & Food Security': ['images/project_agritech.jpg'],
        'Healthcare & Social Welfare': ['images/project_healthcare.jpg'],
        'Governance & Economy': ['images/project_governance.jpg'],
        'Education & Leadership': ['images/african-youth-civil-servants.jpg'],
        'Education & Youth Development': ['images/african-youth-civil-servants.jpg']
      };
      // Ensure all projects have valid images populated if previously empty
      let updated = false;
      parsed.forEach(p => {
        const seed = SEED_PROJECTS.find(s => s.id === p.id);
        if (seed && (!p.images || !p.images.length) && seed.images) {
          p.images = seed.images;
          updated = true;
        } else if (!p.images || !Array.isArray(p.images) || !p.images.length) {
          p.images = defaultSectorFallback[p.sector] || ['images/project_digital_office.jpg'];
          updated = true;
        }
      });
      if (updated) localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(parsed));
      return parsed;
    }
    return SEED_PROJECTS;
  } catch (e) {
    return SEED_PROJECTS;
  }
}

function saveProjects(projects) {
  localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
}

function getStoredResources() {
  const data = localStorage.getItem(STORAGE_KEYS.RESOURCES);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.RESOURCES, JSON.stringify(SEED_RESOURCES));
    return SEED_RESOURCES;
  }
  try {
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) && parsed.length ? parsed : SEED_RESOURCES;
  } catch (e) {
    return SEED_RESOURCES;
  }
}

function saveResources(resources) {
  localStorage.setItem(STORAGE_KEYS.RESOURCES, JSON.stringify(resources));
}

function getStoredGallery() {
  const data = localStorage.getItem(STORAGE_KEYS.GALLERY);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.GALLERY, JSON.stringify(SEED_GALLERY_ALBUMS));
    return SEED_GALLERY_ALBUMS;
  }
  try {
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed) && parsed.length) return parsed;
    return SEED_GALLERY_ALBUMS;
  } catch (e) {
    return SEED_GALLERY_ALBUMS;
  }
}

function saveGallery(gallery) {
  localStorage.setItem(STORAGE_KEYS.GALLERY, JSON.stringify(gallery));
}

function getAuthSession() {
  const session = sessionStorage.getItem(STORAGE_KEYS.AUTH) || localStorage.getItem(STORAGE_KEYS.AUTH);
  if (!session) return null;
  try {
    return JSON.parse(session);
  } catch (e) {
    return null;
  }
}

function isSuperAdmin() {
  const session = getAuthSession();
  if (!session) return false;
  return session.role === 'super_admin' || session.role === 'Super Administrator' || session.role === 'Super Admin';
}

function setAuthSession(user, remember = false) {
  const sessionData = JSON.stringify(user);
  sessionStorage.setItem(STORAGE_KEYS.AUTH, sessionData);
  if (remember) {
    localStorage.setItem(STORAGE_KEYS.AUTH, sessionData);
  } else {
    localStorage.removeItem(STORAGE_KEYS.AUTH);
  }
}

function clearAuthSession() {
  sessionStorage.removeItem(STORAGE_KEYS.AUTH);
  localStorage.removeItem(STORAGE_KEYS.AUTH);
}

// ==========================================================================
// INITIALIZATION
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  // Ensure seed stores exist
  getStoredMembers();
  getStoredProjects();
  getStoredResources();

  checkAuthAndRender();
  setupEventListeners();

  // Automatically synchronize all stores with Supabase Cloud
  autoSyncFromSupabaseCloud();
}

async function autoSyncFromSupabaseCloud() {
  if (window.NCSYF_DB && typeof window.NCSYF_DB.pullFromSupabase === 'function') {
    try {
      console.log('🔄 Synchronizing admin console with Supabase Cloud...');
      const res = await window.NCSYF_DB.pullFromSupabase();
      console.log('✅ Supabase cloud data synchronized into admin console:', res?.stats);
      renderDashboard();
      renderMembersTable();
      renderProjectsList();
      renderResourcesList();
      renderGalleryList();
      renderAdminsTable();
    } catch (err) {
      console.warn('Auto cloud sync notice:', err);
    }
  }
}

function checkAuthAndRender() {
  const session = getAuthSession();
  const loginView = document.getElementById('adminLoginView');
  const dashboardView = document.getElementById('adminDashboardView');

  if (session && session.loggedIn) {
    if (loginView) loginView.style.display = 'none';
    if (dashboardView) {
      dashboardView.style.display = 'flex';

      // Update User Card in Sidebar & Header
      const userNameEl = document.getElementById('adminUserName');
      const userRoleBadge = document.getElementById('adminUserRoleBadge');
      const userAvatarEl = document.getElementById('adminUserAvatar');
      const headerRoleText = document.getElementById('headerRoleText');
      const headerRoleBadge = document.getElementById('headerRoleBadge');
      const linkAdmins = document.getElementById('sidebarLinkAdmins');
      const linkSettings = document.getElementById('sidebarLinkSettings');
      const headingAdminManage = document.getElementById('sidebarHeadingAdminManage');

      const isSuper = isSuperAdmin();

      if (userNameEl) userNameEl.textContent = session.name || 'Admin Official';
      if (userAvatarEl) userAvatarEl.textContent = (session.name || 'AD').substring(0, 2).toUpperCase();
      if (userRoleBadge) {
        userRoleBadge.innerHTML = isSuper 
          ? `<span class="badge-role super">Super Administrator</span>` 
          : `<span class="badge-role regular">Regular Administrator</span>`;
      }
      if (headerRoleText) {
        headerRoleText.textContent = isSuper ? 'Super Admin' : 'Regular Admin';
      }
      if (headerRoleBadge) {
        headerRoleBadge.innerHTML = `<i data-lucide="${isSuper ? 'shield-alert' : 'shield'}"></i> <span id="headerRoleText">${isSuper ? 'Super Admin' : 'Regular Admin'}</span>`;
        if (window.lucide && typeof lucide.createIcons === 'function') {
          lucide.createIcons({ root: headerRoleBadge });
        }
      }

      // Role permission restrictions in Sidebar
      if (linkAdmins) linkAdmins.style.display = isSuper ? 'flex' : 'none';
      if (linkSettings) linkSettings.style.display = isSuper ? 'flex' : 'none';
      if (headingAdminManage) headingAdminManage.style.display = isSuper ? 'block' : 'none';

      renderDashboard();
    }
  } else {
    if (loginView) loginView.style.display = 'flex';
    if (dashboardView) dashboardView.style.display = 'none';
  }
}

// ==========================================================================
// IMAGE RESIZING & MULTI-PICTURE DROPZONE HELPERS
// ==========================================================================
let uploadedProjectImages = [];
let uploadedResourceImages = [];
let uploadedGalleryImages = [];

function resolveAdminMediaUrl(url) {
  if (!url) return 'images/african-youth-civil-servants.jpg';
  if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) {
    return url;
  }
  return url.replace(/^\.\.\//, '');
}

function compressImageFile(file, maxDimension = 1280, quality = 0.82) {
  return new Promise((resolve) => {
    if (!file) return resolve(null);
    const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const ALLOWED_IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    const ext = (file.name ? file.name.split('.').pop() || '' : '').toLowerCase();
    if (!ALLOWED_IMAGE_EXTS.includes(ext) || (file.type && !ALLOWED_IMAGE_TYPES.includes(file.type))) {
      showAdminToast('Disallowed image format. Only JPG, PNG, WEBP, and GIF images are permitted.', 'error');
      return resolve(null);
    }
    if (file.size > 15 * 1024 * 1024) {
      showAdminToast('Image exceeds maximum allowed size (15 MB).', 'error');
      return resolve(null);
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(null);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

function renderProjectImagePreviews() {
  const grid = document.getElementById('projectImagesPreviewGrid');
  const countBadge = document.getElementById('projectImagesCountBadge');
  if (!grid) return;

  if (countBadge) {
    countBadge.textContent = `${uploadedProjectImages.length} picture${uploadedProjectImages.length === 1 ? '' : 's'} selected`;
  }

  if (!uploadedProjectImages.length) {
    grid.innerHTML = '';
    return;
  }

  grid.innerHTML = uploadedProjectImages.map((imgSrc, index) => {
    return `
      <div class="image-thumb-card">
        <img src="${resolveAdminMediaUrl(imgSrc)}" alt="Project picture ${index + 1}">
        <button type="button" class="image-thumb-remove" onclick="removeProjectImage(${index})" title="Remove picture">
          ${getIconSvg('x', { size: 12 })}
        </button>
      </div>
    `;
  }).join('');
}

window.removeProjectImage = function(index) {
  uploadedProjectImages.splice(index, 1);
  renderProjectImagePreviews();
};

function setupProjectImagesUpload() {
  const fileInput = document.getElementById('newProjectImagesInput');
  const browseBtn = document.getElementById('btnBrowseProjectImages');
  const dropzone = document.getElementById('projectImageDropzone');

  if (browseBtn && fileInput) {
    browseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      fileInput.click();
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', async () => {
      if (fileInput.files && fileInput.files.length) {
        for (let i = 0; i < fileInput.files.length; i++) {
          const res = await compressImageFile(fileInput.files[i]);
          if (res) uploadedProjectImages.push(res);
        }
        renderProjectImagePreviews();
        fileInput.value = '';
      }
    });
  }

  if (dropzone) {
    ['dragenter', 'dragover'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
    });
    ['dragleave', 'drop'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
      });
    });
    dropzone.addEventListener('drop', async (e) => {
      const files = e.dataTransfer ? e.dataTransfer.files : null;
      if (files && files.length) {
        for (let i = 0; i < files.length; i++) {
          if (files[i].type.startsWith('image/')) {
            const res = await compressImageFile(files[i]);
            if (res) uploadedProjectImages.push(res);
          }
        }
        renderProjectImagePreviews();
      }
    });
  }
}

function renderResourceImagePreviews() {
  const grid = document.getElementById('resourceImagesPreviewGrid');
  const countBadge = document.getElementById('resourceImagesCountBadge');
  if (!grid) return;

  if (countBadge) {
    countBadge.textContent = `${uploadedResourceImages.length} picture${uploadedResourceImages.length === 1 ? '' : 's'} selected`;
  }

  if (!uploadedResourceImages.length) {
    grid.innerHTML = '';
    return;
  }

  grid.innerHTML = uploadedResourceImages.map((imgSrc, index) => {
    return `
      <div class="image-thumb-card">
        <img src="${resolveAdminMediaUrl(imgSrc)}" alt="Resource picture ${index + 1}">
        <button type="button" class="image-thumb-remove" onclick="removeResourceImage(${index})" title="Remove picture">
          ${getIconSvg('x', { size: 12 })}
        </button>
      </div>
    `;
  }).join('');
}

window.removeResourceImage = function(index) {
  uploadedResourceImages.splice(index, 1);
  renderResourceImagePreviews();
};

function setupResourceImagesUpload() {
  const fileInput = document.getElementById('newResourceImagesInput');
  const browseBtn = document.getElementById('btnBrowseResourceImages');
  const dropzone = document.getElementById('resourceImageDropzone');

  if (browseBtn && fileInput) {
    browseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      fileInput.click();
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', async () => {
      if (fileInput.files && fileInput.files.length) {
        for (let i = 0; i < fileInput.files.length; i++) {
          const res = await compressImageFile(fileInput.files[i]);
          if (res) uploadedResourceImages.push(res);
        }
        renderResourceImagePreviews();
        fileInput.value = '';
      }
    });
  }

  if (dropzone) {
    ['dragenter', 'dragover'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
    });
    ['dragleave', 'drop'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
      });
    });
    dropzone.addEventListener('drop', async (e) => {
      const files = e.dataTransfer ? e.dataTransfer.files : null;
      if (files && files.length) {
        for (let i = 0; i < files.length; i++) {
          if (files[i].type.startsWith('image/')) {
            const res = await compressImageFile(files[i]);
            if (res) uploadedResourceImages.push(res);
          }
        }
        renderResourceImagePreviews();
      }
    });
  }
}

// ---- Media Gallery Multi-Image Upload Manager ----
function renderGalleryImagePreviews() {
  const grid = document.getElementById('galleryImagesPreviewGrid');
  const countBadge = document.getElementById('galleryImagesCountBadge');
  if (!grid) return;

  if (countBadge) {
    countBadge.textContent = `${uploadedGalleryImages.length} picture${uploadedGalleryImages.length === 1 ? '' : 's'} selected`;
  }

  if (!uploadedGalleryImages.length) {
    grid.innerHTML = '';
    return;
  }

  grid.innerHTML = uploadedGalleryImages.map((imgSrc, index) => {
    return `
      <div class="image-thumb-card">
        <img src="${resolveAdminMediaUrl(imgSrc)}" alt="Gallery picture ${index + 1}">
        <button type="button" class="image-thumb-remove" onclick="removeGalleryImage(${index})" title="Remove picture">
          ${getIconSvg('x', { size: 12 })}
        </button>
      </div>
    `;
  }).join('');
}

window.removeGalleryImage = function(index) {
  uploadedGalleryImages.splice(index, 1);
  renderGalleryImagePreviews();
};

function setupGalleryImagesUpload() {
  const fileInput = document.getElementById('newGalleryImagesInput');
  const browseBtn = document.getElementById('btnBrowseGalleryImages');
  const dropzone = document.getElementById('galleryImageDropzone');

  if (browseBtn && fileInput) {
    browseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      fileInput.click();
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', async () => {
      if (fileInput.files && fileInput.files.length) {
        for (let i = 0; i < fileInput.files.length; i++) {
          const res = await compressImageFile(fileInput.files[i]);
          if (res) uploadedGalleryImages.push(res);
        }
        renderGalleryImagePreviews();
        fileInput.value = '';
      }
    });
  }

  if (dropzone) {
    ['dragenter', 'dragover'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
    });
    ['dragleave', 'drop'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
      });
    });
    dropzone.addEventListener('drop', async (e) => {
      e.preventDefault();
      const files = e.dataTransfer ? e.dataTransfer.files : null;
      if (files && files.length) {
        for (let i = 0; i < files.length; i++) {
          if (files[i].type.startsWith('image/')) {
            const res = await compressImageFile(files[i]);
            if (res) uploadedGalleryImages.push(res);
          }
        }
        renderGalleryImagePreviews();
      }
    });
  }
}

// ==========================================================================
// DOCUMENT UPLOAD DROPZONE LOGIC
// ==========================================================================
let uploadedResourceFileData = null;
let uploadedProjectFileData = null;

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 KB';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getFileExtension(filename) {
  if (!filename || !filename.includes('.')) return '';
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2).toUpperCase();
}

function setupResourceDropzone() {
  const dropzone = document.getElementById('resourceDropzone');
  const fileInput = document.getElementById('newResourceFileInput');
  const promptEl = document.getElementById('resourceDropzonePrompt');
  const previewEl = document.getElementById('resourceFilePreview');
  const badgeEl = document.getElementById('filePreviewBadge');
  const nameEl = document.getElementById('filePreviewName');
  const sizeEl = document.getElementById('filePreviewSize');
  const removeBtn = document.getElementById('btnRemoveResourceFile');
  const browseBtn = document.getElementById('btnResourceBrowse');
  const formatSelect = document.getElementById('newResourceFormat');
  const titleInput = document.getElementById('newResourceTitle');

  if (!dropzone || !fileInput) return;

  function handleFile(file) {
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      showAdminToast('File exceeds the 25 MB size limit.', 'error');
      return;
    }

    const ext = (getFileExtension(file.name) || '').toUpperCase();
    const ALLOWED_DOC_EXTENSIONS = ['PDF', 'DOC', 'DOCX', 'XLS', 'XLSX', 'PPT', 'PPTX', 'TXT', 'RTF', 'CSV'];
    if (!ALLOWED_DOC_EXTENSIONS.includes(ext)) {
      showAdminToast(`Disallowed file format (.${ext}). Only approved office documents (PDF, DOCX, XLSX, PPTX, TXT) are permitted.`, 'error');
      return;
    }

    const ALLOWED_MIME_TYPES = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'application/rtf'
    ];
    if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
      showAdminToast(`File type "${file.type}" is not supported. Please upload an official PDF, Word, Excel, or PowerPoint circular.`, 'error');
      return;
    }

    dropzone.classList.remove('has-error');
    const formattedSize = formatFileSize(file.size);

    if (formatSelect) {
      if (['PDF'].includes(ext)) formatSelect.value = 'PDF';
      else if (['DOC', 'DOCX'].includes(ext)) formatSelect.value = 'DOCX';
      else if (['XLS', 'XLSX'].includes(ext)) formatSelect.value = 'XLSX';
      else if (['PPT', 'PPTX'].includes(ext)) formatSelect.value = 'PPTX';
      else if (['TXT'].includes(ext)) formatSelect.value = 'TXT';
    }

    if (titleInput && !titleInput.value.trim()) {
      const cleanName = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[_-]+/g, ' ')
        .trim();
      if (cleanName) {
        titleInput.value = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
      }
    }

    if (nameEl) nameEl.textContent = file.name;
    if (sizeEl) sizeEl.textContent = formattedSize;
    if (badgeEl) {
      badgeEl.textContent = ext.slice(0, 4);
      badgeEl.className = 'file-preview-icon ' + ext.toLowerCase();
    }

    if (promptEl) promptEl.style.display = 'none';
    if (previewEl) previewEl.style.display = 'block';

    const reader = new FileReader();
    reader.onload = function(e) {
      uploadedResourceFileData = {
        name: file.name,
        size: formattedSize,
        bytes: file.size,
        type: ext,
        mime: file.type,
        dataUrl: e.target.result
      };
    };
    reader.readAsDataURL(file);
  }

  dropzone.addEventListener('click', (e) => {
    if (e.target.closest('#btnRemoveResourceFile')) return;
    fileInput.click();
  });

  if (browseBtn) {
    browseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });
  }

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files[0]) {
      handleFile(fileInput.files[0]);
    }
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('dragover');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files[0]) {
      fileInput.files = dt.files;
      handleFile(dt.files[0]);
    }
  });

  if (removeBtn) {
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      resetResourceDropzone();
    });
  }
}

function resetResourceDropzone() {
  const fileInput = document.getElementById('newResourceFileInput');
  const promptEl = document.getElementById('resourceDropzonePrompt');
  const previewEl = document.getElementById('resourceFilePreview');
  const dropzone = document.getElementById('resourceDropzone');

  if (fileInput) fileInput.value = '';
  uploadedResourceFileData = null;
  uploadedResourceImages = [];
  renderResourceImagePreviews();
  if (promptEl) promptEl.style.display = 'flex';
  if (previewEl) previewEl.style.display = 'none';
  if (dropzone) dropzone.classList.remove('has-error');
}

function setupProjectDropzone() {
  const dropzone = document.getElementById('projectDropzone');
  const fileInput = document.getElementById('newProjectFileInput');
  const promptEl = document.getElementById('projectDropzonePrompt');
  const previewEl = document.getElementById('projectFilePreview');
  const badgeEl = document.getElementById('projectFileBadge');
  const nameEl = document.getElementById('projectFileName');
  const sizeEl = document.getElementById('projectFileSize');
  const removeBtn = document.getElementById('btnRemoveProjectFile');

  if (!dropzone || !fileInput) return;

  function handleFile(file) {
    if (!file) return;
    const ext = getFileExtension(file.name) || 'PDF';
    const formattedSize = formatFileSize(file.size);

    if (nameEl) nameEl.textContent = file.name;
    if (sizeEl) sizeEl.textContent = formattedSize;
    if (badgeEl) {
      badgeEl.textContent = ext.slice(0, 4);
      badgeEl.className = 'file-preview-icon compact ' + ext.toLowerCase();
    }

    if (promptEl) promptEl.style.display = 'none';
    if (previewEl) previewEl.style.display = 'block';

    const reader = new FileReader();
    reader.onload = function(e) {
      uploadedProjectFileData = {
        name: file.name,
        size: formattedSize,
        bytes: file.size,
        type: ext,
        dataUrl: e.target.result
      };
    };
    reader.readAsDataURL(file);
  }

  dropzone.addEventListener('click', (e) => {
    if (e.target.closest('#btnRemoveProjectFile')) return;
    fileInput.click();
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files[0]) {
      handleFile(fileInput.files[0]);
    }
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('dragover');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files[0]) {
      fileInput.files = dt.files;
      handleFile(dt.files[0]);
    }
  });

  if (removeBtn) {
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      resetProjectDropzone();
    });
  }
}

function resetProjectDropzone() {
  const fileInput = document.getElementById('newProjectFileInput');
  const promptEl = document.getElementById('projectDropzonePrompt');
  const previewEl = document.getElementById('projectFilePreview');

  if (fileInput) fileInput.value = '';
  uploadedProjectFileData = null;
  uploadedProjectImages = [];
  renderProjectImagePreviews();
  if (promptEl) promptEl.style.display = 'flex';
  if (previewEl) previewEl.style.display = 'none';
}

// ==========================================================================
// EVENT LISTENERS & NAVIGATION
// ==========================================================================
function setupEventListeners() {
  // Initialize dropzones
  setupResourceDropzone();
  setupProjectDropzone();
  setupProjectImagesUpload();
  setupResourceImagesUpload();
  setupGalleryImagesUpload();

  // Login Form
  const loginForm = document.getElementById('adminLoginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  // Password Visibility Toggles
  setupAdminPasswordToggles();

  // Supabase Settings & Cloud Storage Panel
  setupSupabaseSettingsPanel();

  // Logout buttons
  document.querySelectorAll('[data-admin-logout]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      clearAuthSession();
      showAdminToast('Logged out successfully.');
      checkAuthAndRender();
    });
  });

  // Sidebar navigation tab triggers
  document.querySelectorAll('[data-admin-tab]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetTab = link.getAttribute('data-admin-tab');
      switchTab(targetTab);

      // Close mobile sidebar if open
      const sidebar = document.getElementById('adminSidebar');
      const backdrop = document.getElementById('sidebarBackdrop');
      if (window.innerWidth < 992) {
        if (sidebar) sidebar.classList.remove('open');
        if (backdrop) backdrop.classList.remove('active');
        document.body.classList.remove('sidebar-open');
      }
    });
  });

  // Mobile sidebar toggle & close
  const toggleBtn = document.getElementById('btnSidebarToggle');
  const closeBtn = document.getElementById('btnSidebarClose');
  const sidebar = document.getElementById('adminSidebar');
  const backdrop = document.getElementById('sidebarBackdrop');

  function closeMobileSidebar() {
    if (sidebar) sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('active');
    document.body.classList.remove('sidebar-open');
  }

  function openMobileSidebar() {
    if (sidebar) sidebar.classList.add('open');
    if (backdrop) backdrop.classList.add('active');
    document.body.classList.add('sidebar-open');
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      if (sidebar && sidebar.classList.contains('open')) {
        closeMobileSidebar();
      } else {
        openMobileSidebar();
      }
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', closeMobileSidebar);
  }

  if (backdrop) {
    backdrop.addEventListener('click', closeMobileSidebar);
  }

  // Members filters & search
  const memberSearch = document.getElementById('memberSearchInput');
  const memberCategoryFilter = document.getElementById('memberCategoryFilter');
  const memberStatusFilter = document.getElementById('memberStatusFilter');

  if (memberSearch) memberSearch.addEventListener('input', renderMembersTable);
  if (memberCategoryFilter) memberCategoryFilter.addEventListener('change', renderMembersTable);
  if (memberStatusFilter) memberStatusFilter.addEventListener('change', renderMembersTable);

  // Export CSV
  const btnExportMembersCsv = document.getElementById('btnExportMembersCsv');
  if (btnExportMembersCsv) {
    btnExportMembersCsv.addEventListener('click', exportMembersCsv);
  }

  // Projects filter & search
  const projectSearch = document.getElementById('projectSearchInput');
  const projectSectorFilter = document.getElementById('projectSectorFilter');
  if (projectSearch) projectSearch.addEventListener('input', renderProjectsList);
  if (projectSectorFilter) projectSectorFilter.addEventListener('change', renderProjectsList);

  // New Project Form Modal
  const newProjectForm = document.getElementById('newProjectForm');
  if (newProjectForm) {
    newProjectForm.addEventListener('submit', handleAddProject);
  }

  // Track A / Track B Switcher in New Project Form
  const newProjectTrack = document.getElementById('newProjectTrack');
  if (newProjectTrack) {
    newProjectTrack.addEventListener('change', (e) => {
      const val = e.target.value;
      const groupA = document.getElementById('projectTrackAGroup');
      const groupB = document.getElementById('projectTrackBGroup');
      if (val === 'Track B') {
        if (groupA) groupA.style.display = 'none';
        if (groupB) groupB.style.display = 'block';
      } else {
        if (groupA) groupA.style.display = 'block';
        if (groupB) groupB.style.display = 'none';
      }
    });
  }

  // Toggle All States in Track B
  const btnToggleAllStates = document.getElementById('btnToggleAllStates');
  if (btnToggleAllStates) {
    btnToggleAllStates.addEventListener('click', () => {
      const statesSelect = document.getElementById('newProjectStatesTrackB');
      if (!statesSelect) return;
      const options = Array.from(statesSelect.options);
      const allSelected = options.every(opt => opt.selected);
      options.forEach(opt => opt.selected = !allSelected);
      btnToggleAllStates.textContent = allSelected ? 'Select All 36 States + FCT' : 'Deselect All';
    });
  }

  // Governance subnav switcher buttons
  document.querySelectorAll('.gov-subnav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.gov-subnav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const subtab = btn.getAttribute('data-gov-subtab');
      const panePatrons = document.getElementById('govSubtabPatronsMatrons');
      const paneNec = document.getElementById('govSubtabNec');
      const paneStates = document.getElementById('govSubtabStates');
      if (panePatrons) panePatrons.style.display = subtab === 'patrons-matrons' ? 'block' : 'none';
      if (paneNec) paneNec.style.display = subtab === 'nec' ? 'block' : 'none';
      if (paneStates) paneStates.style.display = subtab === 'states' ? 'block' : 'none';
    });
  });

  // Governance state search input
  const adminGovStateSearch = document.getElementById('adminGovStateSearch');
  if (adminGovStateSearch) {
    adminGovStateSearch.addEventListener('input', (e) => {
      renderAdminStateChapters(e.target.value);
    });
  }

  // Resources filter & search
  const resourceSearch = document.getElementById('resourceSearchInput');
  const resourceCategoryFilter = document.getElementById('resourceCategoryFilter');
  if (resourceSearch) resourceSearch.addEventListener('input', renderResourcesList);
  if (resourceCategoryFilter) resourceCategoryFilter.addEventListener('change', renderResourcesList);

  // New Resource Form Modal
  const newResourceForm = document.getElementById('newResourceForm');
  if (newResourceForm) {
    newResourceForm.addEventListener('submit', handleAddResource);
  }

  // Media Gallery filter & search
  const gallerySearch = document.getElementById('gallerySearchInput');
  const galleryCategoryFilter = document.getElementById('galleryCategoryFilter');
  if (gallerySearch) gallerySearch.addEventListener('input', renderGalleryList);
  if (galleryCategoryFilter) galleryCategoryFilter.addEventListener('change', renderGalleryList);

  // New Media Gallery Form Modal
  const newGalleryForm = document.getElementById('newGalleryForm');
  if (newGalleryForm) {
    newGalleryForm.addEventListener('submit', handleSaveGallery);
  }

  // New Admin Form Modal (Super Admin only)
  const newAdminForm = document.getElementById('newAdminForm');
  if (newAdminForm) {
    newAdminForm.addEventListener('submit', handleAddAdmin);
  }

  // Disapprove Member Verification Form Modal
  const disapproveMemberForm = document.getElementById('disapproveMemberForm');
  if (disapproveMemberForm) {
    disapproveMemberForm.addEventListener('submit', handleDisapproveMember);
  }

  // Generic modal close triggers
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      closeAllModals();
    });
  });

  // Close modals on outside click
  document.querySelectorAll('.admin-modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeAllModals();
    });
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllModals();
  });
}

// ==========================================================================
// PASSWORD PREVIEW TOGGLE CONTROLLER
// ==========================================================================
function setupAdminPasswordToggles() {
  document.querySelectorAll('.admin-password-toggle-btn').forEach(btn => {
    if (btn.dataset.toggleBound) return;
    btn.dataset.toggleBound = 'true';

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const wrapper = btn.closest('.admin-password-wrapper');
      if (!wrapper) return;
      const input = wrapper.querySelector('input');
      if (!input) return;

      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      const label = isPassword ? 'Hide password' : 'Show password';
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);

      const iconName = isPassword ? 'eye-off' : 'eye';
      if (typeof getIconSvg === 'function') {
        btn.innerHTML = getIconSvg(iconName, { size: 18 });
      } else {
        btn.innerHTML = `<i data-lucide="${iconName}"></i>`;
        if (window.lucide && typeof lucide.createIcons === 'function') {
          lucide.createIcons({ root: btn });
        }
      }
    });
  });
}

// ==========================================================================
// AUTHENTICATION LOGIC (Super Admin vs Regular Admin)
// ==========================================================================
async function handleLogin(e) {
  e.preventDefault();
  const form = e.target;
  const emailInput = form.querySelector('#adminLoginEmail');
  const passwordInput = form.querySelector('#adminLoginPassword');
  const rememberCheckbox = form.querySelector('#adminRememberMe');

  const email = emailInput ? emailInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value.trim() : '';
  const remember = rememberCheckbox ? rememberCheckbox.checked : false;

  try {
    checkAdminLoginRateLimit();
  } catch (limitErr) {
    showAdminToast(limitErr.message, 'error');
    return;
  }

  if (!email || !password) {
    showAdminToast('Please provide your admin email and password.', 'error');
    return;
  }

  const genericError = 'Invalid administrator credentials or access denied.';
  let role = 'regular_admin';
  let displayName = 'Admin Official';
  let authenticated = false;

  // 1. Supabase Cloud Auth if connected
  const client = (window.NCSYF_CONFIG_MANAGER && typeof window.NCSYF_CONFIG_MANAGER.getClient === 'function')
    ? window.NCSYF_CONFIG_MANAGER.getClient()
    : null;

  if (client) {
    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: email.toLowerCase(),
        password: password
      });

      if (!error && data && data.user) {
        // Verify active administrator role in admin_users database table
        const { data: adminRecord } = await client
          .from('admin_users')
          .select('*')
          .ilike('email', email.toLowerCase())
          .maybeSingle();

        if (adminRecord && adminRecord.status === 'active') {
          role = adminRecord.role || 'regular_admin';
          displayName = adminRecord.name || 'Secretariat Administrator';
          authenticated = true;
        } else {
          await client.auth.signOut().catch(() => {});
          recordAdminFailedLogin();
          showAdminToast('Access Denied: This account does not possess active administrative authorization.', 'error');
          return;
        }
      }
    } catch (sbErr) {
      console.warn('Supabase admin login attempt notice:', sbErr);
    }
  }

  // 2. Offline / Local fallback cryptographic verification
  if (!authenticated) {
    const adminUsers = getStoredAdminUsers();
    const matched = adminUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (matched && matched.status !== 'revoked') {
      let isMatch = false;
      if (matched.passwordHash && matched.salt) {
        const hash = await hashAdminPassword(password, matched.salt);
        isMatch = (hash === matched.passwordHash);
      } else if (matched.password) {
        // Upgrade legacy plaintext password to secure hash
        isMatch = (matched.password === password);
        if (isMatch) {
          const salt = 'ncsyf_adm_' + Math.random().toString(36).substring(2, 10);
          matched.passwordHash = await hashAdminPassword(password, salt);
          matched.salt = salt;
          delete matched.password;
          saveAdminUsers(adminUsers);
        }
      }

      if (isMatch) {
        role = matched.role;
        displayName = matched.name;
        authenticated = true;
      }
    }
  }

  if (!authenticated) {
    recordAdminFailedLogin();
    showAdminToast(genericError, 'error');
    return;
  }

  resetAdminFailedLogin();

  const session = {
    email: email,
    name: displayName,
    role: role,
    loggedIn: true,
    loginTimestamp: new Date().toISOString()
  };

  setAuthSession(session, remember);
  showAdminToast(`Welcome, ${displayName}! Signed in as ${role === 'super_admin' ? 'Super Admin' : 'Regular Admin'}.`);

  setTimeout(() => {
    checkAuthAndRender();
  }, 400);
}

// ==========================================================================
// TAB CONTROLLER
// ==========================================================================
function switchTab(tabId) {
  // Permission Guard: Restrict Admins and Settings to Super Admin only
  if ((tabId === 'admins' || tabId === 'settings') && !isSuperAdmin()) {
    showAdminToast('Access Denied: Super Administrator privileges required.', 'error');
    switchTab('overview');
    return;
  }

  // Update sidebar active classes
  document.querySelectorAll('.sidebar-link').forEach(link => {
    if (link.getAttribute('data-admin-tab') === tabId) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Update tab panel visibility
  document.querySelectorAll('.admin-tab-pane').forEach(pane => {
    if (pane.id === `tab-${tabId}`) {
      pane.style.display = 'block';
    } else {
      pane.style.display = 'none';
    }
  });

  // Update page header title
  const pageTitle = document.getElementById('adminPageTitle');
  const pageSubtitle = document.getElementById('adminPageSubtitle');

  const titles = {
    overview: { title: 'Dashboard Overview', subtitle: 'National Forum metrics, registration stats and activity overview' },
    members: { title: 'Registered Members', subtitle: 'Full and Associate member enrollment database and verification' },
    projects: { title: 'National Projects', subtitle: 'Priority initiatives across Federal, State and LGA public services' },
    resources: { title: 'Publications & Resources', subtitle: 'Policy briefs, constitution, bye-laws and public service toolkits' },
    gallery: { title: 'Media Gallery & Photo Stream', subtitle: 'Upload and administer official photographs, summits and event albums' },
    governance: { title: 'Governance Directory & State Chapters', subtitle: 'Upload leadership photographs, credentials and manage 37 State Chapters' },
    admins: { title: 'Admin Team & Roles', subtitle: 'Manage administrator accounts, assign permissions and revoke access' },
    settings: { title: 'System & Backend Settings', subtitle: 'Configure future backend API endpoints and manage data' }
  };

  if (titles[tabId]) {
    if (pageTitle) pageTitle.textContent = titles[tabId].title;
    if (pageSubtitle) pageSubtitle.textContent = titles[tabId].subtitle;
  }

  // Refresh relevant view
  if (tabId === 'overview') {
    renderDashboard();
    if (window.NCSYF_DB && window.NCSYF_DB.members) {
      window.NCSYF_DB.members.getAll().then(() => renderDashboard()).catch(() => {});
    }
  }
  if (tabId === 'members') {
    renderMembersTable();
    if (window.NCSYF_DB && window.NCSYF_DB.members) {
      window.NCSYF_DB.members.getAll().then(() => renderMembersTable()).catch(() => {});
    }
  }
  if (tabId === 'projects') renderProjectsList();
  if (tabId === 'resources') renderResourcesList();
  if (tabId === 'gallery') renderGalleryList();
  if (tabId === 'governance') renderGovernanceAdmin();
  if (tabId === 'admins') renderAdminsTable();
}

// ==========================================================================
// RENDER DASHBOARD & STATS
// ==========================================================================
function renderDashboard() {
  const members = getStoredMembers();
  const projects = getStoredProjects();
  const resources = getStoredResources();
  const gallery = getStoredGallery();

  const totalMembers = members.length;
  const fullMembers = members.filter(m => m.category === 'full').length;
  const associateMembers = members.filter(m => m.category === 'associate').length;

  // Count distinct MDAs
  const distinctMdas = new Set(members.map(m => (m.mda || '').trim().toLowerCase())).size;

  // Update stats counters
  const elTotal = document.getElementById('statTotalMembers');
  const elFull = document.getElementById('statFullMembers');
  const elAssociate = document.getElementById('statAssociateMembers');
  const elMdas = document.getElementById('statDistinctMdas');
  const elProjects = document.getElementById('statActiveProjects');
  const elResources = document.getElementById('statPublishedResources');
  const elGallery = document.getElementById('statGalleryAlbums');

  if (elTotal) elTotal.textContent = totalMembers;
  if (elFull) elFull.textContent = fullMembers;
  if (elAssociate) elAssociate.textContent = associateMembers;
  if (elMdas) elMdas.textContent = distinctMdas;
  if (elProjects) elProjects.textContent = projects.length;
  if (elResources) elResources.textContent = resources.length;
  if (elGallery) elGallery.textContent = gallery.length;

  // Update sidebar counter badges
  const badgeMembers = document.getElementById('sidebarBadgeMembers');
  const badgeProjects = document.getElementById('sidebarBadgeProjects');
  const badgeResources = document.getElementById('sidebarBadgeResources');
  const badgeGallery = document.getElementById('sidebarBadgeGallery');

  if (badgeMembers) badgeMembers.textContent = totalMembers;
  if (badgeProjects) badgeProjects.textContent = projects.length;
  if (badgeResources) badgeResources.textContent = resources.length;
  if (badgeGallery) badgeGallery.textContent = gallery.length;

  // Render recent registrations on Overview
  renderRecentMembersOverview(members.slice(0, 5));
}

function renderRecentMembersOverview(recentMembers) {
  const tbody = document.getElementById('recentMembersTableBody');
  if (!tbody) return;

  if (!recentMembers.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="table-empty-cell" style="text-align: center; padding: 24px; color: var(--admin-text-muted);">No member registrations recorded yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = recentMembers.map(m => {
    const isFull = m.category === 'full';
    const catBadge = isFull 
      ? `<span class="badge-category full">Full (18–35)</span>` 
      : `<span class="badge-category associate">Associate (35+)</span>`;
    
    let statusClass = 'pending';
    let statusLabel = 'PENDING';
    if (m.status === 'verified') {
      statusClass = 'verified';
      statusLabel = 'VERIFIED';
    } else if (m.status === 'disapproved') {
      statusClass = 'disapproved';
      statusLabel = 'DISAPPROVED';
    }
    const statusBadge = `<span class="badge-status ${statusClass}">● ${statusLabel}</span>`;

    return `
      <tr>
        <td data-label="Full Name"><strong>${escapeHtml(m.firstName || '')} ${escapeHtml(m.lastName || '')}</strong></td>
        <td data-label="Category">${catBadge}</td>
        <td data-label="Member ID"><span class="member-id-tag">${escapeHtml(m.memberId || m.id)}</span></td>
        <td data-label="Staff ID"><code>${escapeHtml(m.staffId || 'N/A')}</code></td>
        <td data-label="Ministry / MDA" style="max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(m.mda || 'Not specified')}">${escapeHtml(m.mda || 'N/A')}</td>
        <td data-label="Status">${statusBadge}</td>
        <td data-label="Action" class="cell-actions">
          <button class="btn-admin btn-admin-outline btn-admin-sm btn-action-block" onclick="viewMemberDossier('${escapeHtml(m.id)}')">
            View Details
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// ==========================================================================
// MEMBERS MANAGEMENT TABLE
// ==========================================================================
function renderMembersTable() {
  const members = getStoredMembers();
  const searchInput = document.getElementById('memberSearchInput');
  const categoryFilter = document.getElementById('memberCategoryFilter');
  const statusFilter = document.getElementById('memberStatusFilter');
  const tbody = document.getElementById('membersTableBody');
  const countEl = document.getElementById('membersShowingCount');

  if (!tbody) return;

  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const selectedCat = categoryFilter ? categoryFilter.value : 'all';
  const selectedStatus = statusFilter ? statusFilter.value : 'all';

  const filtered = members.filter(m => {
    const matchesCat = selectedCat === 'all' || m.category === selectedCat;
    const matchesStatus = selectedStatus === 'all' || m.status === selectedStatus;
    
    const fullName = `${m.firstName || ''} ${m.lastName || ''}`.toLowerCase();
    const memberId = (m.memberId || '').toLowerCase();
    const staffId = (m.staffId || '').toLowerCase();
    const mda = (m.mda || '').toLowerCase();
    const email = (m.email || '').toLowerCase();
    const state = (m.stateChapter || '').toLowerCase();

    const matchesQuery = !query || 
      fullName.includes(query) || 
      memberId.includes(query) ||
      staffId.includes(query) || 
      mda.includes(query) || 
      email.includes(query) || 
      state.includes(query);

    return matchesCat && matchesStatus && matchesQuery;
  });

  if (countEl) {
    countEl.textContent = `Showing ${filtered.length} of ${members.length} registered members`;
  }

  if (!filtered.length) {
    const isTotalEmpty = members.length === 0;
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="table-empty-cell" style="text-align: center; padding: 48px 24px; color: var(--admin-text-muted);">
          <div style="margin-bottom: 12px; color: var(--admin-text-muted);">${getIconSvg('users', { size: 36 })}</div>
          <strong style="font-size: 1rem; color: var(--admin-text-primary);">${isTotalEmpty ? 'No Registered Members Yet' : 'No matching member applications found'}</strong>
          <p style="font-size: 0.85rem; margin-top: 6px; max-width: 440px; margin-left: auto; margin-right: auto; line-height: 1.5;">
            ${isTotalEmpty 
              ? 'The membership directory is currently empty and ready for fresh registrations. When civil servants submit their application on the membership portal, their dossiers will appear here.' 
              : 'Try adjusting your search criteria or category filters to find member records.'}
          </p>
        </td>
      </tr>
    `;
    return;
  }

  const isSuper = isSuperAdmin();

  tbody.innerHTML = filtered.map(m => {
    const isFull = m.category === 'full';
    const catBadge = isFull 
      ? `<span class="badge-category full">Full (18–35)</span>` 
      : `<span class="badge-category associate">Associate (35+)</span>`;
    
    let statusClass = 'pending';
    let statusLabel = 'PENDING REVIEW';
    if (m.status === 'verified') {
      statusClass = 'verified';
      statusLabel = 'VERIFIED';
    } else if (m.status === 'disapproved') {
      statusClass = 'disapproved';
      statusLabel = 'DISAPPROVED (REAPPLY)';
    }

    const statusBadge = `<span class="badge-status ${statusClass}">● ${statusLabel}</span>`;

    return `
      <tr>
        <td data-label="Member">
          <div class="member-name-block">
            <div style="font-weight: 700; color: var(--admin-primary);">${escapeHtml(m.firstName || '')} ${escapeHtml(m.lastName || '')}</div>
            <div style="font-size: 0.76rem; color: var(--admin-text-muted); margin-top: 2px;">${escapeHtml(m.email || 'No email provided')}</div>
          </div>
        </td>
        <td data-label="Category">${catBadge}</td>
        <td data-label="Member ID"><span class="member-id-tag">${escapeHtml(m.memberId || m.id)}</span></td>
        <td data-label="Staff ID / File No."><code>${escapeHtml(m.staffId || 'N/A')}</code></td>
        <td data-label="MDA & Tier">
          <div class="member-mda-block">
            <div style="font-weight: 600; font-size: 0.85rem;">${escapeHtml(m.mda || 'N/A')}</div>
            <div style="font-size: 0.74rem; color: var(--admin-text-muted); margin-top: 2px;">${escapeHtml(m.tierLabel || m.tier || 'Public Service')}</div>
          </div>
        </td>
        <td data-label="Chapter">${escapeHtml(m.stateChapter || 'FCT Abuja')}</td>
        <td data-label="Status">${statusBadge}</td>
        <td data-label="Date" style="font-size: 0.78rem; color: var(--admin-text-muted); white-space: nowrap;">${escapeHtml(m.registeredAt ? m.registeredAt.split(' ')[0] : 'Recent')}</td>
        <td data-label="Actions" class="cell-actions">
          <div class="table-actions">
            <button class="btn-icon-sm" title="View Full Application Dossier" onclick="viewMemberDossier('${escapeHtml(m.id)}')">
              ${getIconSvg('eye', { size: 15 })}
            </button>
            ${m.status !== 'verified' ? `
              <button class="btn-icon-sm" style="color: #15803D;" title="Approve & Verify Application" onclick="updateMemberStatus('${escapeHtml(m.id)}', 'verified')">
                ${getIconSvg('check', { size: 15 })}
              </button>
            ` : ''}
            ${m.status !== 'disapproved' ? `
              <button class="btn-icon-sm disapprove" title="Disapprove Verification (Allow Reapply)" onclick="openDisapproveModal('${escapeHtml(m.id)}')">
                ${getIconSvg('ban', { size: 15 })}
              </button>
            ` : `
              <button class="btn-icon-sm" style="color: #D97706;" title="Reset to Pending Review" onclick="updateMemberStatus('${escapeHtml(m.id)}', 'pending')">
                ${getIconSvg('rotate-ccw', { size: 15 })}
              </button>
            `}
            ${isSuper ? `
              <button class="btn-icon-sm delete" title="Permanently Delete Member (Super Admin Only)" onclick="deleteMember('${escapeHtml(m.id)}')">
                ${getIconSvg('trash-2', { size: 15 })}
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ==========================================================================
// MEMBER DOSSIER DETAILS MODAL
// ==========================================================================
window.viewMemberDossier = function(memberId) {
  const members = getStoredMembers();
  const m = members.find(item => item.id === memberId);
  if (!m) return;

  const modal = document.getElementById('memberDossierModal');
  const content = document.getElementById('memberDossierContent');
  if (!modal || !content) return;

  const isFull = m.category === 'full';
  const catBadge = isFull 
    ? `<span class="badge-category full">Full Member (Serving, 18–35 yrs)</span>` 
    : `<span class="badge-category associate">Associate Member (After 35 yrs / Alumni)</span>`;

  const isDisapproved = m.status === 'disapproved';
  const statusClass = m.status === 'verified' ? 'verified' : (isDisapproved ? 'disapproved' : 'pending');
  const statusLabel = m.status === 'verified' ? 'VERIFIED' : (isDisapproved ? 'DISAPPROVED (CAN REAPPLY)' : 'PENDING REVIEW');
  const statusBadge = `<span class="badge-status ${statusClass}">● ${statusLabel}</span>`;
  const isSuper = isSuperAdmin();

  content.innerHTML = `
    <div class="dossier-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; padding-bottom: 14px; border-bottom: 1px solid var(--admin-border); flex-wrap: wrap; gap: 10px;">
      <div>
        <h4 style="font-size: 1.25rem; font-weight: 800; color: var(--admin-primary);">${escapeHtml(m.firstName || '')} ${escapeHtml(m.lastName || '')}</h4>
        <div style="font-size: 0.8rem; color: var(--admin-text-muted); margin-top: 2px;">Application Reference ID: <code>${escapeHtml(m.id)}</code></div>
      </div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        ${catBadge}
        ${statusBadge}
      </div>
    </div>

    ${isDisapproved ? `
      <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: var(--radius-md); padding: 14px 18px; margin-bottom: 20px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; flex-wrap: wrap; gap: 6px;">
          <span style="font-weight: 800; color: #991B1B; font-size: 0.92rem; display: flex; align-items: center; gap: 6px;">
            ${getIconSvg('alert-triangle', { size: 16 })} Verification Disapproved — Reapplication Permitted
          </span>
          <span style="background: #FEE2E2; color: #991B1B; font-size: 0.72rem; font-weight: 800; padding: 2px 8px; border-radius: 12px; border: 1px solid rgba(220, 38, 38, 0.25);">CAN REAPPLY</span>
        </div>
        <div style="font-size: 0.85rem; color: #7F1D1D; margin-bottom: 4px;">
          <strong>Disapproval Reason:</strong> ${escapeHtml(m.disapprovedReason || 'Official credentials could not be authenticated with MDA nominal roll.')}
        </div>
        ${m.disapprovedNotes ? `
          <div style="font-size: 0.8rem; color: #991B1B; background: rgba(255,255,255,0.7); padding: 8px 10px; border-radius: 4px; margin-top: 6px;">
            <strong>Secretariat Guidance:</strong> ${escapeHtml(m.disapprovedNotes)}
          </div>
        ` : ''}
        <div style="font-size: 0.74rem; color: #B91C1C; margin-top: 6px;">
          Decision recorded on: ${escapeHtml(m.disapprovedAt || 'Recent')} • Applicant is permitted to submit a corrected application anytime.
        </div>
      </div>
    ` : ''}

    <div class="dossier-grid">
      <div class="dossier-item">
        <label>Permanent Member ID</label>
        <span><span class="member-id-tag">${escapeHtml(m.memberId || m.id)}</span></span>
      </div>
      <div class="dossier-item">
        <label>MDA Staff ID / File No.</label>
        <span><code>${escapeHtml(m.staffId || 'Not provided')}</code></span>
      </div>
      <div class="dossier-item">
        <label>Membership Category</label>
        <span>${escapeHtml(m.memberTypeLabel || (isFull ? 'Full Member (18–35 yrs)' : 'Associate Member (After 35 yrs)'))}</span>
      </div>
      <div class="dossier-item">
        <label>Tier of Public Service</label>
        <span>${escapeHtml(m.tierLabel || m.tier || 'Civil Service')}</span>
      </div>
      <div class="dossier-item full-width">
        <label>Ministry, Department or Agency (MDA)</label>
        <span>${escapeHtml(m.mda || 'Not specified / Alumni transition')}</span>
      </div>
      <div class="dossier-item">
        <label>State Chapter</label>
        <span>${escapeHtml(m.stateChapter || 'FCT Abuja')}</span>
      </div>
      <div class="dossier-item">
        <label>Official / Personal Email</label>
        <span><a href="mailto:${escapeHtml(m.email || '')}" style="color: var(--admin-primary); font-weight: 700;">${escapeHtml(m.email || 'N/A')}</a></span>
      </div>
      <div class="dossier-item">
        <label>Contact Phone Number</label>
        <span>${escapeHtml(m.phone || 'N/A')}</span>
      </div>
      <div class="dossier-item">
        <label>Date of Birth / Age</label>
        <span>${escapeHtml(m.dob || 'N/A')} ${m.age ? `(${escapeHtml(m.age)} years old)` : ''}</span>
      </div>
      <div class="dossier-item">
        <label>Gender</label>
        <span>${escapeHtml(m.gender ? (m.gender.charAt(0).toUpperCase() + m.gender.slice(1)) : 'N/A')}</span>
      </div>
      ${m.docTypeLabel || m.docType ? `
      <div class="dossier-item full-width">
        <label>Verification Document Type</label>
        <span>${escapeHtml(m.docTypeLabel || m.docType)}</span>
      </div>
      ` : ''}
      <div class="dossier-item full-width">
        <label>Registration Date &amp; Legal Consent</label>
        <span>Submitted on ${escapeHtml(m.registeredAt || 'Recent')} • NDPA 2023 Consent Confirmed (Verified) ${m.reappliedAt ? `• Reapplied: ${escapeHtml(m.reappliedAt)}` : ''}</span>
      </div>
    </div>

    <div class="dossier-actions" style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; flex-wrap: wrap;">
      ${isDisapproved ? `
        <button type="button" class="btn-admin btn-admin-primary btn-admin-sm" onclick="updateMemberStatus('${escapeHtml(m.id)}', 'verified'); closeAllModals();">
          ${getIconSvg('check', { size: 14 })} Override &amp; Approve Verification
        </button>
        <button type="button" class="btn-admin btn-admin-outline btn-admin-sm" onclick="updateMemberStatus('${escapeHtml(m.id)}', 'pending'); closeAllModals();">
          ${getIconSvg('rotate-ccw', { size: 14 })} Reset to Pending Review
        </button>
      ` : `
        ${m.status !== 'verified' ? `
          <button type="button" class="btn-admin btn-admin-primary btn-admin-sm" onclick="updateMemberStatus('${escapeHtml(m.id)}', 'verified'); closeAllModals();">
            ${getIconSvg('check', { size: 14 })} Approve &amp; Verify Application
          </button>
        ` : `
          <button type="button" class="btn-admin btn-admin-outline btn-admin-sm" onclick="updateMemberStatus('${escapeHtml(m.id)}', 'pending'); closeAllModals();">
            Mark as Pending Review
          </button>
        `}
        <button type="button" class="btn-admin btn-admin-danger btn-admin-sm" style="background: #DC2626;" onclick="closeAllModals(); openDisapproveModal('${escapeHtml(m.id)}');">
          ${getIconSvg('ban', { size: 14 })} Disapprove Verification (Allow Reapply)
        </button>
      `}
      ${isSuper ? `
        <button type="button" class="btn-admin btn-admin-outline btn-admin-sm" style="color: #DC2626; border-color: #FECACA;" onclick="closeAllModals(); deleteMember('${escapeHtml(m.id)}');">
          ${getIconSvg('trash-2', { size: 14 })} Delete Record
        </button>
      ` : ''}
    </div>
  `;

  modal.classList.add('active');
};

window.openDisapproveModal = function(memberId) {
  const members = getStoredMembers();
  const m = members.find(item => item.id === memberId);
  if (!m) return;

  const modal = document.getElementById('disapproveMemberModal');
  const idInput = document.getElementById('disapproveMemberId');
  const nameEl = document.getElementById('disapproveMemberName');
  const detailsEl = document.getElementById('disapproveMemberDetails');
  const notesInput = document.getElementById('disapproveNotes');

  if (idInput) idInput.value = m.id;
  if (nameEl) nameEl.textContent = `${m.firstName || ''} ${m.lastName || ''} — ${m.memberTypeLabel || m.category}`;
  if (detailsEl) detailsEl.textContent = `Member ID: ${m.memberId || m.id} • Staff ID: ${m.staffId || 'N/A'} • ${m.mda || 'MDA not specified'}`;
  if (notesInput) notesInput.value = '';

  if (modal) modal.classList.add('active');
};

function handleDisapproveMember(e) {
  e.preventDefault();
  const form = e.target;
  const memberId = form.querySelector('#disapproveMemberId').value;
  const reason = form.querySelector('#disapproveReasonSelect').value;
  const notes = form.querySelector('#disapproveNotes').value.trim();

  const members = getStoredMembers();
  const index = members.findIndex(m => m.id === memberId);
  if (index === -1) return;

  const now = new Date();
  const dateStr = now.toISOString().replace('T', ' ').substring(0, 19);

  members[index].status = 'disapproved';
  members[index].disapprovedReason = reason;
  members[index].disapprovedNotes = notes;
  members[index].disapprovedAt = dateStr;
  members[index].canReapply = true;

  saveMembers(members);
  showAdminToast(`Application for ${members[index].firstName} ${members[index].lastName} disapproved. Member may reapply with corrected credentials.`, 'error');
  closeAllModals();
  renderDashboard();
  renderMembersTable();
}

window.updateMemberStatus = function(memberId, newStatus) {
  const members = getStoredMembers();
  const index = members.findIndex(m => m.id === memberId);
  if (index === -1) return;

  members[index].status = newStatus;
  if (newStatus === 'verified') {
    members[index].verifiedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
  }
  saveMembers(members);

  // Sync to Supabase if connected
  if (window.NCSYF_DB && window.NCSYF_DB.members) {
    window.NCSYF_DB.members.updateStatus(members[index].memberId || members[index].id, newStatus).catch(() => {});
  }

  showAdminToast(`Member application status updated to: ${newStatus.toUpperCase()}`);
  renderDashboard();
  renderMembersTable();
};

window.deleteMember = function(memberId) {
  if (!isSuperAdmin()) {
    showAdminToast('Access Denied: Only Super Administrators can permanently delete member records.', 'error');
    return;
  }
  if (!confirm('Are you sure you want to permanently delete this member record?')) return;
  let members = getStoredMembers();
  members = members.filter(m => m.id !== memberId && m.memberId !== memberId);
  saveMembers(members);

  if (window.NCSYF_DB && window.NCSYF_DB.members) {
    window.NCSYF_DB.members.delete(memberId).catch(() => {});
  }

  showAdminToast('Member record removed from system.');
  renderDashboard();
  renderMembersTable();
};

// ==========================================================================
// EXPORT TO CSV
// ==========================================================================
function exportMembersCsv() {
  const members = getStoredMembers();
  if (!members.length) {
    showAdminToast('No member data available to export.', 'error');
    return;
  }

  const headers = ['Record_ID', 'First_Name', 'Last_Name', 'Category', 'Staff_or_Member_ID', 'MDA', 'Tier', 'State_Chapter', 'Email', 'Phone', 'Gender', 'DOB', 'Document_Type', 'Status', 'Disapproval_Reason', 'Can_Reapply', 'Registered_At'];
  
  const csvRows = [];
  csvRows.push(headers.join(','));

  members.forEach(m => {
    const row = [
      m.id || '',
      `"${(m.firstName || '').replace(/"/g, '""')}"`,
      `"${(m.lastName || '').replace(/"/g, '""')}"`,
      m.category || '',
      `"${(m.staffId || '').replace(/"/g, '""')}"`,
      `"${(m.mda || '').replace(/"/g, '""')}"`,
      m.tier || '',
      `"${(m.stateChapter || '').replace(/"/g, '""')}"`,
      m.email || '',
      `"${(m.phone || '').replace(/"/g, '""')}"`,
      m.gender || '',
      m.dob || '',
      `"${(m.docType || '').replace(/"/g, '""')}"`,
      m.status || '',
      `"${(m.disapprovedReason || '').replace(/"/g, '""')}"`,
      m.status === 'disapproved' || m.canReapply ? 'YES' : 'NO',
      m.registeredAt || ''
    ];
    csvRows.push(row.join(','));
  });

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `NCSYF_Members_Export_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showAdminToast('Members database exported to CSV successfully.');
}

// ==========================================================================
// PROJECTS MANAGEMENT
// ==========================================================================
function renderProjectsList() {
  const projects = getStoredProjects();
  const searchInput = document.getElementById('projectSearchInput');
  const sectorFilter = document.getElementById('projectSectorFilter');
  const grid = document.getElementById('projectsGrid');
  const countEl = document.getElementById('projectsShowingCount');

  if (!grid) return;

  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const selectedSector = sectorFilter ? sectorFilter.value : 'all';

  const filtered = projects.filter(p => {
    const matchesSector = selectedSector === 'all' || p.sector.toLowerCase().includes(selectedSector.toLowerCase());
    const matchesQuery = !query || 
      p.title.toLowerCase().includes(query) || 
      p.leadMda.toLowerCase().includes(query) || 
      p.description.toLowerCase().includes(query);
    return matchesSector && matchesQuery;
  });

  if (countEl) {
    countEl.textContent = `Showing ${filtered.length} of ${projects.length} national priority initiatives`;
  }

  if (!filtered.length) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 48px; color: var(--admin-text-muted);">
        <div style="margin-bottom: 8px; color: var(--admin-text-muted);">${getIconSvg('lightbulb', { size: 36 })}</div>
        <strong>No initiatives found matching your filter</strong>
        <p style="font-size: 0.85rem; margin-top: 4px;">Click "+ New Project" to initiate a new priority track.</p>
      </div>
    `;
    return;
  }

  const isSuper = isSuperAdmin();

  grid.innerHTML = filtered.map(p => {
    const isCompleted = p.status === 'completed';
    const isActive = p.status === 'active';
    const statusBadge = isActive 
      ? `<span class="badge-status verified">● ACTIVE</span>` 
      : (isCompleted ? `<span class="badge-status" style="background: #E0E7FF; color: #3730A3;">● COMPLETED</span>` : `<span class="badge-status pending">● PLANNING</span>`);

    const hasImages = p.images && Array.isArray(p.images) && p.images.length > 0;

    return `
      <div class="item-card">
        ${hasImages ? `
          <div style="position: relative; height: 160px; border-radius: var(--radius-sm); overflow: hidden; margin-bottom: 12px; background: #0F172A;">
            <img src="${resolveAdminMediaUrl(p.images[0])}" alt="${p.title}" style="width: 100%; height: 100%; object-fit: cover;">
            <span style="position: absolute; bottom: 8px; right: 8px; background: rgba(15,23,42,0.85); color: #fff; font-size: 0.72rem; font-weight: 700; padding: 3px 8px; border-radius: 12px; backdrop-filter: blur(4px); display: inline-flex; align-items: center; gap: 4px;">
              ${getIconSvg('image', { size: 12 })} ${p.images.length} photo${p.images.length === 1 ? '' : 's'}
            </span>
          </div>
        ` : ''}

        <div class="item-card-header">
          <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
            <span class="item-badge-track" style="background: var(--admin-primary); color: #fff; font-size: 0.7rem; font-weight: 700; padding: 2px 7px; border-radius: 4px;">${p.track || 'Track A'}</span>
            <span class="item-badge-sector">${p.sector || 'Public Service'}</span>
          </div>
          ${statusBadge}
        </div>
        <h4 class="item-title">${p.title}</h4>
        <div class="item-agency" style="display: flex; align-items: center; gap: 6px;">
          ${getIconSvg('landmark', { size: 14 })} <span>${p.stakeholders || p.leadMda || 'Public Sector Stakeholders'}</span>
        </div>
        <p class="item-desc">${p.description}</p>
        
        <div style="background: var(--admin-bg); padding: 8px 12px; border-radius: 6px; font-size: 0.78rem; margin-bottom: 14px; border: 1px solid var(--admin-border);">
          <div><strong>Target:</strong> ${p.targetBeneficiaries || 'Young Public Servants'}</div>
          <div><strong>Budget:</strong> ${p.budget || 'Government Subvention'}</div>
        </div>

        <div class="item-meta">
          <span>Added: ${p.dateAdded || '2026-10-01'}</span>
          <div class="item-actions">
            <button class="btn-icon-sm edit" title="Edit Project Details & Gallery" onclick="openEditProjectModal('${p.id}')">
              ${getIconSvg('edit', { size: 15 })}
            </button>
            ${isSuper ? `
              <button class="btn-icon-sm delete" title="Remove Initiative (Super Admin Only)" onclick="deleteProject('${p.id}')">
                ${getIconSvg('trash-2', { size: 15 })}
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

window.openCreateProjectModal = function() {
  const form = document.getElementById('newProjectForm');
  if (form) form.reset();
  const idInput = document.getElementById('editingProjectId');
  const titleEl = document.getElementById('projectModalTitle');
  const submitBtn = document.getElementById('btnSubmitProject');
  if (idInput) idInput.value = '';
  if (titleEl) titleEl.textContent = 'Upload / Initiate National Project';
  if (submitBtn) submitBtn.textContent = 'Publish Project Track';

  const trackSelect = document.getElementById('newProjectTrack');
  const groupA = document.getElementById('projectTrackAGroup');
  const groupB = document.getElementById('projectTrackBGroup');
  if (trackSelect) trackSelect.value = 'Track A';
  if (groupA) groupA.style.display = 'block';
  if (groupB) groupB.style.display = 'none';

  const statesSelect = document.getElementById('newProjectStatesTrackB');
  if (statesSelect) {
    Array.from(statesSelect.options).forEach(opt => opt.selected = false);
  }

  uploadedProjectImages = [];
  renderProjectImagePreviews();
  resetProjectDropzone();
  openModal('newProjectModal');
};

window.openEditProjectModal = function(projectId) {
  const projects = getStoredProjects();
  const p = projects.find(item => item.id === projectId);
  if (!p) return;

  const idInput = document.getElementById('editingProjectId');
  const titleEl = document.getElementById('projectModalTitle');
  const submitBtn = document.getElementById('btnSubmitProject');

  if (idInput) idInput.value = p.id;
  if (titleEl) titleEl.textContent = 'Edit National Priority Project';
  if (submitBtn) submitBtn.textContent = 'Save Changes';

  const titleInput = document.getElementById('newProjectTitle');
  const trackSelect = document.getElementById('newProjectTrack');
  const sectorTrackA = document.getElementById('newProjectSectorTrackA');
  const statesTrackB = document.getElementById('newProjectStatesTrackB');
  const groupA = document.getElementById('projectTrackAGroup');
  const groupB = document.getElementById('projectTrackBGroup');
  const statusSelect = document.getElementById('newProjectStatus');
  const stakeholdersInput = document.getElementById('newProjectStakeholders');
  const benInput = document.getElementById('newProjectBeneficiaries');
  const budgetInput = document.getElementById('newProjectBudget');
  const descInput = document.getElementById('newProjectDesc');

  if (titleInput) titleInput.value = p.title || '';
  
  const currentTrack = p.track || (p.targetStates && p.targetStates.length ? 'Track B' : 'Track A');
  if (trackSelect) trackSelect.value = currentTrack;

  if (currentTrack === 'Track B') {
    if (groupA) groupA.style.display = 'none';
    if (groupB) groupB.style.display = 'block';
    if (statesTrackB && p.targetStates) {
      Array.from(statesTrackB.options).forEach(opt => {
        opt.selected = p.targetStates.includes(opt.value);
      });
    }
  } else {
    if (groupA) groupA.style.display = 'block';
    if (groupB) groupB.style.display = 'none';
    if (sectorTrackA) sectorTrackA.value = p.sector || 'Education and Youth Capacity Development';
  }

  if (statusSelect) statusSelect.value = p.status || 'active';
  if (stakeholdersInput) stakeholdersInput.value = p.stakeholders || p.leadMda || '';
  if (benInput) benInput.value = p.targetBeneficiaries || '';
  if (budgetInput) budgetInput.value = p.budget || '';
  if (descInput) descInput.value = p.description || '';

  uploadedProjectImages = (p.images && Array.isArray(p.images)) ? [...p.images] : [];
  renderProjectImagePreviews();

  if (p.attachedDocName) {
    const nameEl = document.getElementById('projectFileName');
    const promptEl = document.getElementById('projectDropzonePrompt');
    const previewEl = document.getElementById('projectFilePreview');
    if (nameEl) nameEl.textContent = p.attachedDocName;
    if (promptEl) promptEl.style.display = 'none';
    if (previewEl) previewEl.style.display = 'block';
  } else {
    resetProjectDropzone();
  }

  openModal('newProjectModal');
};

function handleAddProject(e) {
  e.preventDefault();
  const form = e.target;
  const editingIdInput = form.querySelector('#editingProjectId');
  const editingId = editingIdInput ? editingIdInput.value.trim() : '';

  const title = form.querySelector('#newProjectTitle').value.trim();
  const track = form.querySelector('#newProjectTrack') ? form.querySelector('#newProjectTrack').value : 'Track A';
  
  let sector = '';
  let targetStates = [];

  if (track === 'Track B') {
    const statesSelect = form.querySelector('#newProjectStatesTrackB');
    if (statesSelect) {
      targetStates = Array.from(statesSelect.selectedOptions).map(opt => opt.value);
    }
    if (targetStates.length === 0) {
      showAdminToast('Please select at least one state or FCT for Track B.', 'error');
      return;
    }
    sector = targetStates.length <= 2 ? `Track B: ${targetStates.join(', ')}` : `Track B: ${targetStates.length} States & FCT`;
  } else {
    const sectorTrackA = form.querySelector('#newProjectSectorTrackA');
    sector = sectorTrackA ? sectorTrackA.value : 'Education and Youth Capacity Development';
  }

  const stakeholders = form.querySelector('#newProjectStakeholders').value.trim();
  const beneficiaries = form.querySelector('#newProjectBeneficiaries').value.trim();
  const budget = form.querySelector('#newProjectBudget').value.trim();
  const status = form.querySelector('#newProjectStatus').value;
  const description = form.querySelector('#newProjectDesc').value.trim();

  if (!title || !stakeholders || !description) {
    showAdminToast('Please fill in all required project fields.', 'error');
    return;
  }

  const projects = getStoredProjects();
  const sectorFallback = {
    'Technology & Innovation': ['images/project_digital_office.jpg'],
    'Agriculture & Food Security': ['images/project_agritech.jpg'],
    'Healthcare & Social Welfare': ['images/project_healthcare.jpg'],
    'Governance & Economy': ['images/project_governance.jpg'],
    'Education & Leadership': ['images/african-youth-civil-servants.jpg'],
    'Education and Youth Capacity Development': ['images/african-youth-civil-servants.jpg'],
    'Health and Public Wellbeing': ['images/project_healthcare.jpg'],
    'Agriculture and Food Security': ['images/project_agritech.jpg'],
    'ICT, Innovation and Digital Skills': ['images/project_digital_office.jpg'],
    'Governance and Civic Engagement': ['images/project_governance.jpg'],
    'Energy, Environment and Climate Resilience': ['images/project_agritech.jpg'],
    'Industry, Entrepreneurship and Economic Empowerment': ['images/project_digital_office.jpg']
  };

  if (editingId) {
    // Edit existing project
    const index = projects.findIndex(p => p.id === editingId);
    if (index === -1) {
      showAdminToast('Project record not found.', 'error');
      return;
    }

    projects[index].title = title;
    projects[index].track = track;
    projects[index].sector = sector;
    projects[index].targetStates = targetStates;
    projects[index].stakeholders = stakeholders;
    projects[index].leadMda = stakeholders;
    projects[index].targetBeneficiaries = beneficiaries || 'National Public Service Youths';
    projects[index].budget = budget || 'Government Subvention';
    projects[index].status = status;
    projects[index].statusLabel = status === 'active' ? 'Active Implementation' : (status === 'completed' ? 'Completed' : 'Planning & Review');
    projects[index].description = description;

    if (uploadedProjectImages && uploadedProjectImages.length > 0) {
      projects[index].images = [...uploadedProjectImages];
    } else if (!projects[index].images || !projects[index].images.length) {
      projects[index].images = sectorFallback[sector] || ['images/project_digital_office.jpg'];
    }

    if (uploadedProjectFileData) {
      projects[index].attachedDocName = uploadedProjectFileData.name;
      projects[index].attachedDocSize = uploadedProjectFileData.size;
      projects[index].attachedDocData = uploadedProjectFileData.dataUrl;
    }

    saveProjects(projects);
    showAdminToast(`Project "${title}" updated successfully!`);
  } else {
    // Add new project
    const projectImages = (uploadedProjectImages && uploadedProjectImages.length > 0)
      ? [...uploadedProjectImages]
      : (sectorFallback[sector] || ['images/project_digital_office.jpg']);

    const newProject = {
      id: `PRJ-${String(projects.length + 1).padStart(3, '0')}`,
      title,
      track,
      sector,
      targetStates,
      stakeholders,
      leadMda: stakeholders,
      targetBeneficiaries: beneficiaries || 'National Public Service Youths',
      budget: budget || 'N/A',
      status,
      statusLabel: status === 'active' ? 'Active Implementation' : (status === 'completed' ? 'Completed' : 'Planning & Review'),
      description,
      images: projectImages,
      dateAdded: new Date().toISOString().split('T')[0]
    };

    if (uploadedProjectFileData) {
      newProject.attachedDocName = uploadedProjectFileData.name;
      newProject.attachedDocSize = uploadedProjectFileData.size;
      newProject.attachedDocData = uploadedProjectFileData.dataUrl;
    }

    projects.unshift(newProject);
    saveProjects(projects);

    if (window.NCSYF_DB && window.NCSYF_DB.projects) {
      window.NCSYF_DB.projects.save(newProject).catch(() => {});
    }

    showAdminToast('New national priority project published to website & portal!');
  }

  form.reset();
  resetProjectDropzone();
  closeAllModals();
  renderDashboard();
  renderProjectsList();
}

window.deleteProject = function(projectId) {
  if (!isSuperAdmin()) {
    showAdminToast('Access Denied: Only Super Administrators can delete projects.', 'error');
    return;
  }
  if (!confirm('Are you sure you want to remove this project?')) return;
  let projects = getStoredProjects();
  projects = projects.filter(p => p.id !== projectId);
  saveProjects(projects);

  if (window.NCSYF_DB && window.NCSYF_DB.projects) {
    window.NCSYF_DB.projects.delete(projectId).catch(() => {});
  }

  showAdminToast('Project removed successfully.');
  renderDashboard();
  renderProjectsList();
};

// ==========================================================================
// RESOURCES MANAGEMENT
// ==========================================================================
function renderResourcesList() {
  const resources = getStoredResources();
  const searchInput = document.getElementById('resourceSearchInput');
  const categoryFilter = document.getElementById('resourceCategoryFilter');
  const tbody = document.getElementById('resourcesTableBody');
  const countEl = document.getElementById('resourcesShowingCount');

  if (!tbody) return;

  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const selectedCat = categoryFilter ? categoryFilter.value : 'all';

  const filtered = resources.filter(r => {
    const matchesCat = selectedCat === 'all' || r.category.toLowerCase().includes(selectedCat.toLowerCase());
    const matchesQuery = !query || 
      r.title.toLowerCase().includes(query) || 
      r.publishingMda.toLowerCase().includes(query) || 
      r.description.toLowerCase().includes(query);
    return matchesCat && matchesQuery;
  });

  if (countEl) {
    countEl.textContent = `Showing ${filtered.length} of ${resources.length} official documents & policy briefs`;
  }

  if (!filtered.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="table-empty-cell" style="text-align: center; padding: 36px; color: var(--admin-text-muted);">
          <div style="margin-bottom: 8px; color: var(--admin-text-muted);">${getIconSvg('folder', { size: 36 })}</div>
          <strong>No publications or resources found</strong>
          <p style="font-size: 0.82rem; margin-top: 4px;">Upload official bye-laws, guides, or circulars using "+ Upload Resource".</p>
        </td>
      </tr>
    `;
    return;
  }

  const isSuper = isSuperAdmin();

  tbody.innerHTML = filtered.map(r => {
    const hasImages = r.images && Array.isArray(r.images) && r.images.length > 0;

    return `
      <tr>
        <td data-label="Title & Summary">
          <div class="resource-title-block">
            <div style="font-weight: 700; color: var(--admin-primary); display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
              <span>${r.title}</span>
              ${hasImages ? `<span style="font-size: 0.72rem; color: var(--admin-accent-dark); font-weight: 700;">📷 ${r.images.length} photo${r.images.length === 1 ? '' : 's'}</span>` : ''}
            </div>
            <div style="font-size: 0.78rem; color: var(--admin-text-muted); margin-top: 2px;">${r.description || ''}</div>
          </div>
        </td>
        <td data-label="Category">
          <span class="badge-category full" style="font-size: 0.72rem;">${r.category}</span>
        </td>
        <td data-label="Authority" style="font-size: 0.84rem;">${r.publishingMda}</td>
        <td data-label="Format">
          <span style="display: inline-flex; align-items: center; gap: 4px; background: #EEF2F6; color: #1E293B; font-weight: 800; font-size: 0.72rem; padding: 2px 7px; border-radius: 4px;">
            ${getIconSvg('file-text', { size: 13 })} <span>${r.fileType || 'PDF'} • ${r.fileSize || '2 MB'}</span>
          </span>
          ${r.fileName ? `<div style="font-size: 0.72rem; color: var(--admin-text-muted); margin-top: 3px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: flex; align-items: center; gap: 4px;" title="${r.fileName}">${getIconSvg('paperclip', { size: 12 })} <span>${r.fileName}</span></div>` : ''}
        </td>
        <td data-label="Downloads" style="font-size: 0.82rem; color: var(--admin-text-muted);">${r.downloads || 0}</td>
        <td data-label="Actions" class="cell-actions">
          <div class="table-actions">
            <button class="btn-icon-sm" title="Download Document" onclick="downloadResource('${r.id}')">
              ${getIconSvg('download', { size: 15 })}
            </button>
            <button class="btn-icon-sm edit" title="Edit Publication & Pictures" onclick="openEditResourceModal('${r.id}')">
              ${getIconSvg('edit', { size: 15 })}
            </button>
            ${isSuper ? `
              <button class="btn-icon-sm delete" title="Delete Resource (Super Admin Only)" onclick="deleteResource('${r.id}')">
                ${getIconSvg('trash-2', { size: 15 })}
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.openCreateResourceModal = function() {
  const form = document.getElementById('newResourceForm');
  if (form) form.reset();
  const idInput = document.getElementById('editingResourceId');
  const titleEl = document.getElementById('resourceModalTitle');
  const submitBtn = document.getElementById('btnSubmitResource');
  if (idInput) idInput.value = '';
  if (titleEl) titleEl.textContent = 'Upload Publication / Resource';
  if (submitBtn) submitBtn.textContent = 'Upload & Publish';
  uploadedResourceImages = [];
  renderResourceImagePreviews();
  resetResourceDropzone();
  openModal('newResourceModal');
};

window.openEditResourceModal = function(resourceId) {
  const resources = getStoredResources();
  const r = resources.find(item => item.id === resourceId);
  if (!r) return;

  const idInput = document.getElementById('editingResourceId');
  const titleEl = document.getElementById('resourceModalTitle');
  const submitBtn = document.getElementById('btnSubmitResource');

  if (idInput) idInput.value = r.id;
  if (titleEl) titleEl.textContent = 'Edit Publication / Resource';
  if (submitBtn) submitBtn.textContent = 'Save Changes';

  const titleInput = document.getElementById('newResourceTitle');
  const catSelect = document.getElementById('newResourceCategory');
  const formatSelect = document.getElementById('newResourceFormat');
  const mdaInput = document.getElementById('newResourceMda');
  const descInput = document.getElementById('newResourceDesc');

  if (titleInput) titleInput.value = r.title || '';
  if (catSelect) catSelect.value = r.category || 'Policy Brief & Circular';
  if (formatSelect) formatSelect.value = r.fileType || 'PDF';
  if (mdaInput) mdaInput.value = r.publishingMda || '';
  if (descInput) descInput.value = r.description || '';

  uploadedResourceImages = (r.images && Array.isArray(r.images)) ? [...r.images] : [];
  renderResourceImagePreviews();

  if (r.fileName) {
    uploadedResourceFileData = {
      name: r.fileName,
      size: r.fileSize || '2.4 MB',
      type: r.fileType || 'PDF',
      dataUrl: r.fileData || null
    };
    const nameEl = document.getElementById('filePreviewName');
    const sizeEl = document.getElementById('filePreviewSize');
    const badgeEl = document.getElementById('filePreviewBadge');
    const promptEl = document.getElementById('resourceDropzonePrompt');
    const previewEl = document.getElementById('resourceFilePreview');
    if (nameEl) nameEl.textContent = r.fileName;
    if (sizeEl) sizeEl.textContent = r.fileSize || '2.4 MB';
    if (badgeEl) badgeEl.textContent = r.fileType || 'PDF';
    if (promptEl) promptEl.style.display = 'none';
    if (previewEl) previewEl.style.display = 'block';
  } else {
    resetResourceDropzone();
  }

  openModal('newResourceModal');
};

function handleAddResource(e) {
  e.preventDefault();
  const form = e.target;
  const editingIdInput = form.querySelector('#editingResourceId');
  const editingId = editingIdInput ? editingIdInput.value.trim() : '';

  const title = form.querySelector('#newResourceTitle').value.trim();
  const category = form.querySelector('#newResourceCategory').value;
  const mda = form.querySelector('#newResourceMda').value.trim();
  const fileType = form.querySelector('#newResourceFormat').value;
  const desc = form.querySelector('#newResourceDesc').value.trim();
  const dropzone = document.getElementById('resourceDropzone');

  if (!title || !mda) {
    showAdminToast('Please fill in the document title and publishing authority.', 'error');
    return;
  }

  const resources = getStoredResources();

  if (editingId) {
    // Edit existing resource
    const index = resources.findIndex(r => r.id === editingId);
    if (index === -1) {
      showAdminToast('Resource not found.', 'error');
      return;
    }

    resources[index].title = title;
    resources[index].category = category;
    resources[index].publishingMda = mda;
    resources[index].fileType = fileType;
    resources[index].description = desc;
    resources[index].images = [...uploadedResourceImages];

    if (uploadedResourceFileData) {
      resources[index].fileType = uploadedResourceFileData.type || fileType;
      resources[index].fileName = uploadedResourceFileData.name;
      resources[index].fileSize = uploadedResourceFileData.size || '2.4 MB';
      if (uploadedResourceFileData.dataUrl) {
        resources[index].fileData = uploadedResourceFileData.dataUrl;
      }
    }

    saveResources(resources);
    showAdminToast(`Resource "${title}" updated successfully!`);
  } else {
    // Add new resource
    if (!uploadedResourceFileData) {
      if (dropzone) dropzone.classList.add('has-error');
      showAdminToast('Please attach or choose a document file to upload.', 'error');
      return;
    }

    const newResource = {
      id: `RES-${String(resources.length + 1).padStart(3, '0')}`,
      title,
      category,
      publishingMda: mda,
      fileType: uploadedResourceFileData.type || fileType,
      fileName: uploadedResourceFileData.name,
      fileSize: uploadedResourceFileData.size || '2.4 MB',
      fileData: uploadedResourceFileData.dataUrl,
      images: [...uploadedResourceImages],
      downloads: 0,
      description: desc || 'Official publication issued for the Nigeria Civil Service Youths\' Forum.',
      dateAdded: new Date().toISOString().split('T')[0]
    };

    resources.unshift(newResource);
    saveResources(resources);

    if (window.NCSYF_DB && window.NCSYF_DB.resources) {
      window.NCSYF_DB.resources.save(editingId ? resources[index] : newResource).catch(() => {});
    }

    showAdminToast(`Document "${uploadedResourceFileData.name}" uploaded successfully!`);
  }

  form.reset();
  resetResourceDropzone();
  closeAllModals();
  renderDashboard();
  renderResourcesList();
}

window.downloadResource = function(resourceId) {
  const resources = getStoredResources();
  const r = resources.find(item => item.id === resourceId);
  if (!r) return;

  r.downloads = (r.downloads || 0) + 1;
  saveResources(resources);

  if (window.NCSYF_DB && window.NCSYF_DB.resources) {
    window.NCSYF_DB.resources.incrementDownloads(resourceId).catch(() => {});
  }

  renderResourcesList();

  // If this resource has an actual uploaded file (dataUrl), download that exact file!
  if (r.fileData) {
    const a = document.createElement('a');
    a.href = r.fileData;
    a.download = r.fileName || `${r.title.replace(/[^a-zA-Z0-9]/g, '_')}.${(r.fileType || 'pdf').toLowerCase()}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showAdminToast(`Downloading: ${r.fileName || r.title}`);
    return;
  }

  // Simulated download for pre-seeded documents
  const textContent = `=====================================================\nNIGERIA CIVIL SERVICE YOUTHS' FORUM (NCSYF)\nOfficial Document: ${r.title}\nCategory: ${r.category}\nIssuing Authority: ${r.publishingMda}\nFile Format: ${r.fileType || 'PDF'}\n=====================================================\n\nSummary:\n${r.description}\n\nDocument verified pursuant to civil service guidelines.`;
  const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${r.title.replace(/[^a-zA-Z0-9]/g, '_')}.${(r.fileType || 'pdf').toLowerCase()}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showAdminToast(`Downloading: ${r.title}`);
};

window.deleteResource = function(resourceId) {
  if (!isSuperAdmin()) {
    showAdminToast('Access Denied: Only Super Administrators can delete resources.', 'error');
    return;
  }
  if (!confirm('Are you sure you want to remove this publication?')) return;
  let resources = getStoredResources();
  resources = resources.filter(r => r.id !== resourceId);
  saveResources(resources);

  if (window.NCSYF_DB && window.NCSYF_DB.resources) {
    window.NCSYF_DB.resources.delete(resourceId).catch(() => {});
  }

  showAdminToast('Resource deleted.');
  renderDashboard();
  renderResourcesList();
};

// ==========================================================================
// ADMIN TEAM & ROLE-BASED ACCESS CONTROL (Super Admin Only)
// ==========================================================================
function renderAdminsTable() {
  const tbody = document.getElementById('adminsTableBody');
  const countEl = document.getElementById('adminsShowingCount');
  if (!tbody) return;

  const admins = getStoredAdminUsers();
  const currentSession = getAuthSession();

  if (countEl) {
    countEl.textContent = `Showing ${admins.length} authorized administrators`;
  }

  tbody.innerHTML = admins.map(a => {
    const isSuper = a.role === 'super_admin';
    const isPrimary = a.id === 'ADM-001' || a.email.toLowerCase() === 'admin@ncsyf.com.ng';
    const isSelf = currentSession && currentSession.email && currentSession.email.toLowerCase() === a.email.toLowerCase();
    const isRevoked = a.status === 'revoked';

    const roleBadge = isSuper 
      ? `<span class="badge-role super">Super Administrator</span>` 
      : `<span class="badge-role regular">Regular Administrator</span>`;

    const statusBadge = isRevoked 
      ? `<span class="badge-status disapproved">● REVOKED</span>` 
      : `<span class="badge-status verified">● ACTIVE</span>`;

    const initials = (a.name || 'AD').split(' ').map(n => n.charAt(0)).slice(0, 2).join('').toUpperCase();

    return `
      <tr>
        <td data-label="Administrator">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 34px; height: 34px; border-radius: 50%; background: ${isSuper ? '#0F4530' : '#1E293B'}; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 0.76rem; font-weight: 700; flex-shrink: 0;">
              ${initials}
            </div>
            <div>
              <div style="font-weight: 700; color: var(--admin-primary);">${escapeHtml(a.name)}</div>
              <div style="font-size: 0.74rem; color: var(--admin-text-muted);">${escapeHtml(a.id)}</div>
            </div>
          </div>
        </td>
        <td data-label="Role & Permissions">${roleBadge}</td>
        <td data-label="Email Address"><code>${escapeHtml(a.email)}</code></td>
        <td data-label="Created Date" style="font-size: 0.8rem; color: var(--admin-text-muted);">${escapeHtml(a.createdAt || '2026-09-01')}</td>
        <td data-label="Status">${statusBadge}</td>
        <td data-label="Actions" class="cell-actions">
          <div class="table-actions">
            ${(isPrimary || isSelf) ? `
              <span style="font-size: 0.74rem; color: var(--admin-text-muted); font-weight: 700;">${isPrimary ? 'Primary Account' : 'Current Session'}</span>
            ` : `
              <button class="btn-icon-sm ${isRevoked ? '' : 'disapprove'}" title="${isRevoked ? 'Restore Access' : 'Revoke Access'}" onclick="toggleAdminStatus('${escapeHtml(a.id)}')">
                ${getIconSvg(isRevoked ? 'check-circle' : 'ban', { size: 15 })}
              </button>
              <button class="btn-icon-sm delete" title="Permanently Delete Admin" onclick="deleteAdmin('${escapeHtml(a.id)}')">
                ${getIconSvg('trash-2', { size: 15 })}
              </button>
            `}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function handleAddAdmin(e) {
  e.preventDefault();
  if (!isSuperAdmin()) {
    showAdminToast('Access Denied: Only Super Administrators can provision new admin accounts.', 'error');
    return;
  }

  const form = e.target;
  const name = form.querySelector('#newAdminName').value.trim();
  const email = form.querySelector('#newAdminEmail').value.trim().toLowerCase();
  const password = form.querySelector('#newAdminPassword').value.trim();
  const role = form.querySelector('#newAdminRole').value;

  if (!name || !email || !password) {
    showAdminToast('Please complete all admin account fields.', 'error');
    return;
  }

  if (password.length < 8) {
    showAdminToast('Admin password must be at least 8 characters long.', 'error');
    return;
  }

  const admins = getStoredAdminUsers();
  if (admins.some(a => a.email.toLowerCase() === email)) {
    showAdminToast('An administrator with this email already exists.', 'error');
    return;
  }

  const salt = 'ncsyf_adm_' + Math.random().toString(36).substring(2, 10);
  const passwordHash = await hashAdminPassword(password, salt);

  const newAdmin = {
    id: `ADM-${String(admins.length + 1).padStart(3, '0')}`,
    name,
    email,
    passwordHash,
    salt,
    role,
    roleLabel: role === 'super_admin' ? 'Super Administrator' : 'Regular Administrator',
    createdAt: new Date().toISOString().split('T')[0],
    status: 'active'
  };

  admins.push(newAdmin);
  saveAdminUsers(admins);

  const client = (window.NCSYF_CONFIG_MANAGER && typeof window.NCSYF_CONFIG_MANAGER.getClient === 'function')
    ? window.NCSYF_CONFIG_MANAGER.getClient()
    : null;

  if (client) {
    try {
      await client.auth.signUp({ email, password });
    } catch (err) {}
  }

  if (window.NCSYF_DB && window.NCSYF_DB.admins) {
    window.NCSYF_DB.admins.save(newAdmin).catch(() => {});
  }

  showAdminToast(`Administrator account created for ${name} (${role === 'super_admin' ? 'Super Admin' : 'Regular Admin'})!`);
  form.reset();
  closeAllModals();
  renderAdminsTable();
}

window.toggleAdminStatus = function(adminId) {
  if (!isSuperAdmin()) {
    showAdminToast('Access Denied: Super Admin privileges required.', 'error');
    return;
  }

  const admins = getStoredAdminUsers();
  const admin = admins.find(a => a.id === adminId);
  if (!admin) return;

  if (admin.id === 'ADM-001' || admin.email.toLowerCase() === 'admin@ncsyf.com.ng') {
    showAdminToast('Cannot revoke the primary Super Administrator account.', 'error');
    return;
  }

  const newStatus = admin.status === 'revoked' ? 'active' : 'revoked';
  admin.status = newStatus;
  saveAdminUsers(admins);

  showAdminToast(`Access for ${admin.name} has been ${newStatus === 'active' ? 'restored' : 'revoked'}.`);
  renderAdminsTable();
};

window.deleteAdmin = function(adminId) {
  if (!isSuperAdmin()) {
    showAdminToast('Access Denied: Super Admin privileges required.', 'error');
    return;
  }

  const admins = getStoredAdminUsers();
  const admin = admins.find(a => a.id === adminId);
  if (!admin) return;

  if (admin.id === 'ADM-001' || admin.email.toLowerCase() === 'admin@ncsyf.com.ng') {
    showAdminToast('Cannot delete the primary Super Administrator account.', 'error');
    return;
  }

  if (!confirm(`Are you sure you want to permanently remove admin account: ${admin.name}?`)) return;

  const filtered = admins.filter(a => a.id !== adminId);
  saveAdminUsers(filtered);

  if (window.NCSYF_DB && window.NCSYF_DB.admins) {
    window.NCSYF_DB.admins.delete(adminId).catch(() => {});
  }

  showAdminToast(`Administrator account for ${admin.name} deleted.`);
  renderAdminsTable();
};

// ==========================================================================
// SYSTEM SETTINGS & DATA TOOLS
// ==========================================================================
window.exportDatabaseJson = function() {
  if (!isSuperAdmin()) {
    showAdminToast('Access Denied: Super Admin privileges required to backup database.', 'error');
    return;
  }

  const backup = {
    exportDate: new Date().toISOString(),
    system: 'Nigeria Civil Service Youths\' Forum (NCSYF) Portal',
    members: getStoredMembers(),
    projects: getStoredProjects(),
    resources: getStoredResources(),
    adminUsers: getStoredAdminUsers()
  };

  const jsonStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `NCSYF_Full_Database_Backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showAdminToast('Full system database exported to JSON successfully.');
};

window.clearAllMembers = async function() {
  if (!isSuperAdmin()) {
    showAdminToast('Access Denied: Super Admin privileges required.', 'error');
    return;
  }

  const existingCount = getStoredMembers().length;
  const msg = existingCount > 0 
    ? `Are you sure you want to delete all ${existingCount} registered members and start completely fresh? This will permanently remove all member profiles, credentials, and verification dossiers.` 
    : 'Are you sure you want to wipe all member profiles and credentials to start fresh?';

  if (!confirm(msg)) return;

  // 1. Clear local member rosters & auth sessions
  localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify([]));
  localStorage.setItem('ncsyf_auth_identities', JSON.stringify([]));
  localStorage.removeItem('ncsyf_member_auth_session');

  // 2. Clear Supabase cloud table if connected
  if (window.NCSYF_DB && window.NCSYF_DB.members && typeof window.NCSYF_DB.members.clearAll === 'function') {
    try {
      await window.NCSYF_DB.members.clearAll();
    } catch (err) {
      console.warn('Supabase member clear error:', err);
    }
  }

  // 3. Re-render UI views immediately
  renderDashboard();
  renderMembersTable();
  if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();

  showAdminToast('All members deleted successfully. Member directory is now fresh and empty.');
};

window.resetFactoryData = function() {
  if (!isSuperAdmin()) {
    showAdminToast('Access Denied: Super Admin privileges required.', 'error');
    return;
  }

  if (!confirm('Are you sure you want to restore factory demo data? This will reset local mock changes.')) return;

  localStorage.removeItem(STORAGE_KEYS.MEMBERS);
  localStorage.removeItem(STORAGE_KEYS.PROJECTS);
  localStorage.removeItem(STORAGE_KEYS.RESOURCES);
  localStorage.removeItem(STORAGE_KEYS.ADMIN_USERS);

  showAdminToast('Demo databases reset to official defaults.');
  setTimeout(() => {
    location.reload();
  }, 500);
};

// ==========================================================================
// SUPABASE INTEGRATION & CLOUD STORAGE CONTROLLER
// ==========================================================================
function setupSupabaseSettingsPanel() {
  const urlInput = document.getElementById('supabaseProjectUrl');
  const keyInput = document.getElementById('supabaseAnonKey');
  const toggleKeyBtn = document.getElementById('btnToggleSupabaseKey');
  const badge = document.getElementById('supabaseStatusBadge');
  const alertBox = document.getElementById('supabaseFeedbackAlert');
  const testBtn = document.getElementById('btnTestSupabase');
  const saveBtn = document.getElementById('btnSaveSupabase');
  const syncBtn = document.getElementById('btnSyncToSupabase');
  const pullBtn = document.getElementById('btnPullFromSupabase');
  const disconnectBtn = document.getElementById('btnDisconnectSupabase');

  if (!urlInput || !keyInput) return;

  function updateStatusUI() {
    const isConn = window.NCSYF_CONFIG_MANAGER ? window.NCSYF_CONFIG_MANAGER.isConnected() : false;
    const creds = window.NCSYF_CONFIG_MANAGER ? window.NCSYF_CONFIG_MANAGER.getCredentials() : { url: '', key: '' };

    if (urlInput && !urlInput.value && creds.url) urlInput.value = creds.url;
    if (keyInput && !keyInput.value && creds.key) keyInput.value = creds.key;

    if (badge) {
      if (isConn) {
        badge.className = 'badge-status verified';
        badge.innerHTML = `<i data-lucide="check-circle-2" style="width: 14px; height: 14px;"></i> Supabase Cloud Active`;
      } else {
        badge.className = 'badge-status pending';
        badge.innerHTML = `<i data-lucide="cloud-off" style="width: 14px; height: 14px;"></i> Local / Offline Mode`;
      }
      if (window.lucide && typeof lucide.createIcons === 'function') {
        lucide.createIcons({ root: badge });
      }
    }

    if (syncBtn) syncBtn.style.display = isConn ? 'inline-flex' : 'none';
    if (pullBtn) pullBtn.style.display = isConn ? 'inline-flex' : 'none';
    if (disconnectBtn) disconnectBtn.style.display = isConn ? 'inline-flex' : 'none';
  }

  updateStatusUI();

  // Toggle API Key visibility
  if (toggleKeyBtn) {
    toggleKeyBtn.addEventListener('click', () => {
      const isPass = keyInput.type === 'password';
      keyInput.type = isPass ? 'text' : 'password';
      toggleKeyBtn.setAttribute('aria-label', isPass ? 'Hide API key' : 'Show API key');
      toggleKeyBtn.innerHTML = isPass 
        ? `<i data-lucide="eye-off" style="width: 18px; height: 18px;"></i>` 
        : `<i data-lucide="eye" style="width: 18px; height: 18px;"></i>`;
      if (window.lucide && typeof lucide.createIcons === 'function') {
        lucide.createIcons({ root: toggleKeyBtn });
      }
    });
  }

  // Test Connection Button
  if (testBtn) {
    testBtn.addEventListener('click', async () => {
      const url = urlInput.value.trim();
      const key = keyInput.value.trim();
      if (!url || !key) {
        showAdminToast('Please provide both Project URL and Anon API Key.', 'error');
        if (alertBox) {
          alertBox.style.display = 'block';
          alertBox.style.background = 'rgba(220, 38, 38, 0.1)';
          alertBox.style.border = '1px solid rgba(220, 38, 38, 0.3)';
          alertBox.style.color = '#B91C1C';
          alertBox.innerHTML = '<strong>Missing Credentials:</strong> Please enter both your Supabase Project URL and Public Anon Key.';
        }
        return;
      }

      const origText = testBtn.innerHTML;
      testBtn.innerHTML = `Testing...`;
      testBtn.disabled = true;

      try {
        const result = await window.NCSYF_CONFIG_MANAGER.testConnection(url, key);
        if (result.ok) {
          if (result.schemaPending) {
            showAdminToast('Supabase connected! Tables pending creation.', 'warning');
            if (alertBox) {
              alertBox.style.display = 'block';
              alertBox.style.background = 'rgba(217, 119, 6, 0.1)';
              alertBox.style.border = '1px solid rgba(217, 119, 6, 0.3)';
              alertBox.style.color = '#B45309';
              alertBox.innerHTML = `<strong>Connected to Supabase!</strong><br>${result.message}`;
            }
          } else {
            showAdminToast('Supabase connection verified successfully!');
            if (alertBox) {
              alertBox.style.display = 'block';
              alertBox.style.background = 'rgba(15, 69, 48, 0.1)';
              alertBox.style.border = '1px solid rgba(15, 69, 48, 0.3)';
              alertBox.style.color = 'var(--admin-primary)';
              alertBox.innerHTML = `<strong>Connection Successful!</strong><br>${result.message}`;
            }
          }
        } else {
          showAdminToast(`Connection failed: ${result.message}`, 'error');
          if (alertBox) {
            alertBox.style.display = 'block';
            alertBox.style.background = 'rgba(220, 38, 38, 0.1)';
            alertBox.style.border = '1px solid rgba(220, 38, 38, 0.3)';
            alertBox.style.color = '#B91C1C';
            alertBox.innerHTML = `<strong>Connection Failed:</strong><br>${result.message}`;
          }
        }
      } catch (err) {
        showAdminToast('Test connection failed: ' + err.message, 'error');
      } finally {
        testBtn.innerHTML = origText;
        testBtn.disabled = false;
        if (window.lucide && typeof lucide.createIcons === 'function') {
          lucide.createIcons({ root: testBtn });
        }
      }
    });
  }

  // Save Credentials Button
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const url = urlInput.value.trim();
      const key = keyInput.value.trim();
      if (!url || !key) {
        showAdminToast('Please fill in both Supabase URL and Anon Key.', 'error');
        return;
      }

      window.NCSYF_CONFIG_MANAGER.setCredentials(url, key);
      updateStatusUI();
      showAdminToast('Supabase credentials saved! Live connection active.');
      if (alertBox) {
        alertBox.style.display = 'block';
        alertBox.style.background = 'rgba(15, 69, 48, 0.1)';
        alertBox.style.border = '1px solid rgba(15, 69, 48, 0.3)';
        alertBox.style.color = 'var(--admin-primary)';
        alertBox.innerHTML = '<strong>Connected to Supabase:</strong> Portal is now configured to persist data directly to your Supabase PostgreSQL database.';
      }
    });
  }

  // Push Local Data to Supabase
  if (syncBtn) {
    syncBtn.addEventListener('click', async () => {
      if (!confirm('Push all local members, projects, resources, gallery albums, and admin accounts into your Supabase database?')) return;
      const origText = syncBtn.innerHTML;
      syncBtn.innerHTML = `Pushing data...`;
      syncBtn.disabled = true;

      try {
        const res = await window.NCSYF_DB.syncAllToSupabase();
        if (res.ok) {
          const s = res.stats;
          showAdminToast(`Synced to Supabase: ${s.members} members, ${s.projects} projects, ${s.resources} resources, ${s.gallery} albums, ${s.admins} admins!`);
        } else {
          showAdminToast('Sync completed with warnings: ' + (res.stats.errors ? res.stats.errors.join('; ') : 'Check console'), 'warning');
        }
      } catch (e) {
        showAdminToast('Sync failed: ' + e.message, 'error');
      } finally {
        syncBtn.innerHTML = origText;
        syncBtn.disabled = false;
        if (window.lucide && typeof lucide.createIcons === 'function') {
          lucide.createIcons({ root: syncBtn });
        }
      }
    });
  }

  // Pull Remote Data from Supabase
  if (pullBtn) {
    pullBtn.addEventListener('click', async () => {
      const origText = pullBtn.innerHTML;
      pullBtn.innerHTML = `Pulling...`;
      pullBtn.disabled = true;

      try {
        const res = await window.NCSYF_DB.pullFromSupabase();
        showAdminToast(`Pulled ${res.stats.members} members, ${res.stats.projects} projects, ${res.stats.resources} resources from Supabase!`);
        renderDashboard();
        renderMembersTable();
        renderProjectsList();
        renderResourcesList();
        renderGalleryList();
      } catch (e) {
        showAdminToast('Pull failed: ' + e.message, 'error');
      } finally {
        pullBtn.innerHTML = origText;
        pullBtn.disabled = false;
        if (window.lucide && typeof lucide.createIcons === 'function') {
          lucide.createIcons({ root: pullBtn });
        }
      }
    });
  }

  // Disconnect Button
  if (disconnectBtn) {
    disconnectBtn.addEventListener('click', () => {
      if (!confirm('Disconnect from Supabase? Portal will return to local offline storage mode.')) return;
      window.NCSYF_CONFIG_MANAGER.clearCredentials();
      if (urlInput) urlInput.value = '';
      if (keyInput) keyInput.value = '';
      if (alertBox) alertBox.style.display = 'none';
      updateStatusUI();
      showAdminToast('Disconnected from Supabase. Reverted to local storage mode.');
    });
  }

  window.addEventListener('ncsyf:supabase-changed', updateStatusUI);
}

window.copySupabaseSetupSql = async function() {
  try {
    const res = await fetch('../supabase/complete_setup.sql');
    if (!res.ok) throw new Error('File not found');
    const sql = await res.text();
    await navigator.clipboard.writeText(sql);
    showAdminToast('complete_setup.sql copied to clipboard! Paste into Supabase SQL Editor.');
  } catch (err) {
    prompt('Copy path to SQL script:', 'supabase/complete_setup.sql');
  }
};

// ==========================================================================
// MODAL CONTROLS & UTILITIES
// ==========================================================================
window.openModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    // If opening project or resource modal fresh without editing ID set, ensure clean state
    if (modalId === 'newProjectModal') {
      const editInput = document.getElementById('editingProjectId');
      if (!editInput || !editInput.value) {
        const titleEl = document.getElementById('projectModalTitle');
        const submitBtn = document.getElementById('btnSubmitProject');
        if (titleEl) titleEl.textContent = 'Upload / Initiate National Project';
        if (submitBtn) submitBtn.textContent = 'Publish Project Track';
      }
    } else if (modalId === 'newResourceModal') {
      const editInput = document.getElementById('editingResourceId');
      if (!editInput || !editInput.value) {
        const titleEl = document.getElementById('resourceModalTitle');
        const submitBtn = document.getElementById('btnSubmitResource');
        if (titleEl) titleEl.textContent = 'Upload Publication / Resource';
        if (submitBtn) submitBtn.textContent = 'Upload & Publish';
      }
    }

    modal.classList.add('active');
  }
};

window.closeAllModals = function() {
  document.querySelectorAll('.admin-modal-overlay').forEach(modal => {
    modal.classList.remove('active');
  });
  const projectEditId = document.getElementById('editingProjectId');
  const resourceEditId = document.getElementById('editingResourceId');
  const galleryEditId = document.getElementById('editingGalleryId');
  if (projectEditId) projectEditId.value = '';
  if (resourceEditId) resourceEditId.value = '';
  if (galleryEditId) galleryEditId.value = '';
  resetResourceDropzone();
  resetProjectDropzone();
};

// ==========================================================================
// MEDIA GALLERY CONTROLLER & ALBUM CRUD
// ==========================================================================
function renderGalleryList() {
  const grid = document.getElementById('galleryGrid');
  const countEl = document.getElementById('galleryShowingCount');
  if (!grid) return;

  const albums = getStoredGallery();
  const search = (document.getElementById('gallerySearchInput')?.value || '').toLowerCase().trim();
  const categoryFilter = document.getElementById('galleryCategoryFilter')?.value || 'all';

  const filtered = albums.filter(a => {
    const matchesSearch = !search ||
      a.title.toLowerCase().includes(search) ||
      (a.location && a.location.toLowerCase().includes(search)) ||
      (a.description && a.description.toLowerCase().includes(search));
    const matchesCat = categoryFilter === 'all' || a.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  if (countEl) {
    countEl.textContent = `Showing ${filtered.length} of ${albums.length} media albums and photo streams`;
  }

  if (!filtered.length) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 48px 20px; background: var(--admin-card-bg); border-radius: var(--radius-md); border: 1px dashed var(--admin-border);">
        <div style="color: var(--admin-text-muted); margin-bottom: 8px;">${getIconSvg('camera', { size: 36 })}</div>
        <h4 style="font-size: 1rem; color: var(--admin-text); margin-bottom: 4px;">No Media Albums Found</h4>
        <p style="font-size: 0.82rem; color: var(--admin-text-muted); margin-bottom: 16px;">Upload high-resolution event photographs to publish to the public Media Gallery.</p>
        <button type="button" class="btn-admin btn-primary-green btn-admin-sm" onclick="openCreateGalleryModal()">
          ${getIconSvg('image-plus', { size: 14 })} <span>Upload First Album</span>
        </button>
      </div>
    `;
    return;
  }

  const isSuper = isSuperAdmin();

  grid.innerHTML = filtered.map(a => {
    const hasImages = a.images && Array.isArray(a.images) && a.images.length > 0;
    const cover = hasImages ? a.images[0] : 'images/african-youth-civil-servants.jpg';
    const imgCount = hasImages ? a.images.length : 0;

    return `
      <div class="item-card">
        <div style="position: relative; height: 180px; border-radius: var(--radius-sm); overflow: hidden; margin-bottom: 12px; background: #0F172A;">
          <img src="${resolveAdminMediaUrl(cover)}" alt="${a.title}" style="width: 100%; height: 100%; object-fit: cover;">
          <span style="position: absolute; bottom: 8px; right: 8px; background: rgba(15,23,42,0.85); color: #fff; font-size: 0.72rem; font-weight: 700; padding: 3px 8px; border-radius: 12px; backdrop-filter: blur(4px); display: inline-flex; align-items: center; gap: 4px;">
            ${getIconSvg('camera', { size: 12 })} ${imgCount} photo${imgCount === 1 ? '' : 's'}
          </span>
          <span style="position: absolute; top: 8px; left: 8px; background: rgba(15, 69, 48, 0.9); color: #E9CE74; font-size: 0.70rem; font-weight: 800; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">
            ${a.category || 'Event'}
          </span>
        </div>

        <h4 class="item-title" style="margin-bottom: 6px;">${a.title}</h4>
        
        <div style="display: flex; flex-direction: column; gap: 3px; font-size: 0.78rem; color: var(--admin-text-muted); margin-bottom: 10px;">
          <div style="display: flex; align-items: center; gap: 5px;">
            ${getIconSvg('map-pin', { size: 13 })} <span>${a.location || 'National Secretariat'}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 5px;">
            ${getIconSvg('calendar', { size: 13 })} <span>${a.date || 'September 2026'}</span>
          </div>
        </div>

        <p class="item-desc" style="margin-bottom: 14px;">${a.description}</p>

        <div class="item-meta">
          <span style="font-size: 0.75rem; color: var(--admin-text-muted);">Published: ${a.dateAdded || a.date}</span>
          <div class="item-actions">
            <button class="btn-icon-sm edit" title="Edit Album & Photos" onclick="openEditGalleryModal('${a.id}')">
              ${getIconSvg('edit', { size: 15 })}
            </button>
            ${isSuper ? `
              <button class="btn-icon-sm delete" title="Delete Album (Super Admin Only)" onclick="deleteGallery('${a.id}')">
                ${getIconSvg('trash-2', { size: 15 })}
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

window.openCreateGalleryModal = function() {
  const form = document.getElementById('newGalleryForm');
  if (form) form.reset();
  const idInput = document.getElementById('editingGalleryId');
  const titleEl = document.getElementById('galleryModalTitle');
  const submitBtn = document.getElementById('btnSubmitGallery');
  if (idInput) idInput.value = '';
  if (titleEl) titleEl.textContent = 'Upload / Add Media Gallery Album';
  if (submitBtn) submitBtn.textContent = 'Publish to Media Gallery';
  
  const dateInput = document.getElementById('newGalleryDate');
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

  uploadedGalleryImages = [];
  renderGalleryImagePreviews();
  openModal('newGalleryModal');
};

window.openEditGalleryModal = function(galleryId) {
  const albums = getStoredGallery();
  const a = albums.find(item => item.id === galleryId);
  if (!a) return;

  const idInput = document.getElementById('editingGalleryId');
  const titleEl = document.getElementById('galleryModalTitle');
  const submitBtn = document.getElementById('btnSubmitGallery');

  if (idInput) idInput.value = a.id;
  if (titleEl) titleEl.textContent = 'Edit Media Gallery Album';
  if (submitBtn) submitBtn.textContent = 'Save Album Changes';

  const titleInput = document.getElementById('newGalleryTitle');
  const categorySelect = document.getElementById('newGalleryCategory');
  const dateInput = document.getElementById('newGalleryDate');
  const locationInput = document.getElementById('newGalleryLocation');
  const descInput = document.getElementById('newGalleryDesc');

  if (titleInput) titleInput.value = a.title || '';
  if (categorySelect) categorySelect.value = a.category || 'Summits & Conferences';
  if (dateInput) dateInput.value = a.date || '';
  if (locationInput) locationInput.value = a.location || '';
  if (descInput) descInput.value = a.description || '';

  uploadedGalleryImages = (a.images && Array.isArray(a.images)) ? [...a.images] : [];
  renderGalleryImagePreviews();

  openModal('newGalleryModal');
};

function handleSaveGallery(e) {
  e.preventDefault();
  const form = e.target;
  const editingId = document.getElementById('editingGalleryId')?.value.trim() || '';

  const title = document.getElementById('newGalleryTitle')?.value.trim();
  const category = document.getElementById('newGalleryCategory')?.value;
  const date = document.getElementById('newGalleryDate')?.value;
  const location = document.getElementById('newGalleryLocation')?.value.trim();
  const description = document.getElementById('newGalleryDesc')?.value.trim();

  if (!title || !location || !description) {
    showAdminToast('Please fill in all required album fields.', 'error');
    return;
  }

  if (!uploadedGalleryImages.length) {
    showAdminToast('Please select at least one picture for the gallery album.', 'error');
    return;
  }

  const albums = getStoredGallery();

  if (editingId) {
    const index = albums.findIndex(item => item.id === editingId);
    if (index === -1) {
      showAdminToast('Album record not found.', 'error');
      return;
    }

    albums[index].title = title;
    albums[index].category = category;
    albums[index].date = date;
    albums[index].location = location;
    albums[index].description = description;
    albums[index].images = [...uploadedGalleryImages];

    saveGallery(albums);
    showAdminToast(`Media Album "${title}" updated successfully!`);
  } else {
    const newAlbum = {
      id: `GAL-${String(albums.length + 1).padStart(3, '0')}`,
      title,
      category,
      date,
      location,
      description,
      images: [...uploadedGalleryImages],
      dateAdded: new Date().toISOString().split('T')[0]
    };
    albums.unshift(newAlbum);
    saveGallery(albums);

    if (window.NCSYF_DB && window.NCSYF_DB.gallery) {
      window.NCSYF_DB.gallery.save(editingId ? albums[index] : newAlbum).catch(() => {});
    }

    showAdminToast('New Media Gallery album published to public website!');
  }

  form.reset();
  uploadedGalleryImages = [];
  renderGalleryImagePreviews();
  closeAllModals();
  renderDashboard();
  renderGalleryList();
}

window.deleteGallery = function(galleryId) {
  if (!isSuperAdmin()) {
    showAdminToast('Access Denied: Only Super Administrators can delete gallery albums.', 'error');
    return;
  }
  if (!confirm('Are you sure you want to permanently delete this media album and its photos?')) return;

  const albums = getStoredGallery();
  const filtered = albums.filter(a => a.id !== galleryId);
  saveGallery(filtered);

  if (window.NCSYF_DB && window.NCSYF_DB.gallery) {
    window.NCSYF_DB.gallery.delete(galleryId).catch(() => {});
  }

  showAdminToast('Media album removed successfully.');
  renderDashboard();
  renderGalleryList();
};

function showAdminToast(message, type = 'success') {
  let container = document.getElementById('adminToastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'adminToastContainer';
    container.className = 'admin-toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `admin-toast ${type === 'error' ? 'error' : ''}`;
  toast.innerHTML = `<span class="admin-toast-icon">${type === 'error' ? getIconSvg('alert-triangle', { size: 18 }) : getIconSvg('check', { size: 18 })}</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 4000);
}

// ==========================================================================
// GOVERNANCE DIRECTORY & STATE CHAPTERS CONTROLLER
// ==========================================================================
let activeAdminGovernanceData = null;

function renderGovernanceAdmin() {
  if (typeof window.getNcsyfGovernanceData === 'function') {
    activeAdminGovernanceData = JSON.parse(JSON.stringify(window.getNcsyfGovernanceData()));
  } else if (window.NCSYF_DEFAULT_GOVERNANCE) {
    activeAdminGovernanceData = JSON.parse(JSON.stringify(window.NCSYF_DEFAULT_GOVERNANCE));
  } else {
    activeAdminGovernanceData = {
      patrons: [],
      matrons: [],
      nec: [],
      states: []
    };
  }

  // 1. Render Patrons (3)
  const patronsGrid = document.getElementById('govPatronsGrid');
  if (patronsGrid && activeAdminGovernanceData.patrons) {
    patronsGrid.innerHTML = activeAdminGovernanceData.patrons.map((p, idx) => {
      const initial = idx === 0 ? 'GP' : 'P';
      return `
        <div class="gov-member-card" id="govCardAdminPatron_${idx}" data-idx="${idx}" data-photo="${escapeHtml(p.photo || '')}">
          <div class="gov-photo-picker-row">
            <div class="gov-photo-preview" id="govPreviewPatron_${idx}">
              ${p.photo ? `<img src="${escapeHtml(p.photo)}" alt="${escapeHtml(p.title)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` : `<span>${initial}</span>`}
            </div>
            <div style="flex: 1;">
              <label class="admin-label" style="margin-bottom: 4px; font-size: 0.76rem; font-weight: 700;">Upload Photo</label>
              <input type="file" accept="image/*" class="admin-input" style="padding: 5px 8px; font-size: 0.76rem;" onchange="handleGovPhotoUpload(event, 'govPreviewPatron_${idx}', 'govCardAdminPatron_${idx}')">
            </div>
          </div>
          <div class="admin-form-group" style="margin-bottom: 0;">
            <label class="admin-label">Official Title</label>
            <input type="text" class="admin-input gov-title-input" value="${escapeHtml(p.title)}" ${idx === 0 ? 'readonly style="background:var(--admin-bg-page);"' : ''}>
          </div>
          <div class="admin-form-group" style="margin-bottom: 0;">
            <label class="admin-label">Full Name</label>
            <input type="text" class="admin-input gov-name-input" placeholder="e.g. Chief / Dr. / Alhaji ..." value="${escapeHtml(p.name && p.name !== p.title ? p.name : '')}">
          </div>
          <div class="admin-form-group" style="margin-bottom: 0;">
            <label class="admin-label">About / Background</label>
            <textarea class="admin-textarea gov-about-input" rows="2" placeholder="Brief summary of public service record...">${escapeHtml(p.about || '')}</textarea>
          </div>
        </div>
      `;
    }).join('');
  }

  // 2. Render Matrons (3)
  const matronsGrid = document.getElementById('govMatronsGrid');
  if (matronsGrid && activeAdminGovernanceData.matrons) {
    matronsGrid.innerHTML = activeAdminGovernanceData.matrons.map((m, idx) => {
      const initial = idx === 0 ? 'GM' : 'M';
      return `
        <div class="gov-member-card" id="govCardAdminMatron_${idx}" data-idx="${idx}" data-photo="${escapeHtml(m.photo || '')}">
          <div class="gov-photo-picker-row">
            <div class="gov-photo-preview" id="govPreviewMatron_${idx}">
              ${m.photo ? `<img src="${escapeHtml(m.photo)}" alt="${escapeHtml(m.title)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` : `<span>${initial}</span>`}
            </div>
            <div style="flex: 1;">
              <label class="admin-label" style="margin-bottom: 4px; font-size: 0.76rem; font-weight: 700;">Upload Photo</label>
              <input type="file" accept="image/*" class="admin-input" style="padding: 5px 8px; font-size: 0.76rem;" onchange="handleGovPhotoUpload(event, 'govPreviewMatron_${idx}', 'govCardAdminMatron_${idx}')">
            </div>
          </div>
          <div class="admin-form-group" style="margin-bottom: 0;">
            <label class="admin-label">Official Title</label>
            <input type="text" class="admin-input gov-title-input" value="${escapeHtml(m.title)}" ${idx === 0 ? 'readonly style="background:var(--admin-bg-page);"' : ''}>
          </div>
          <div class="admin-form-group" style="margin-bottom: 0;">
            <label class="admin-label">Full Name</label>
            <input type="text" class="admin-input gov-name-input" placeholder="e.g. Hajia / Dame / Dr. ..." value="${escapeHtml(m.name && m.name !== m.title ? m.name : '')}">
          </div>
          <div class="admin-form-group" style="margin-bottom: 0;">
            <label class="admin-label">About / Background</label>
            <textarea class="admin-textarea gov-about-input" rows="2" placeholder="Distinguished public policy & mentorship record...">${escapeHtml(m.about || '')}</textarea>
          </div>
        </div>
      `;
    }).join('');
  }

  // 3. Render NEC (8)
  const necGrid = document.getElementById('govNecGrid');
  if (necGrid && activeAdminGovernanceData.nec) {
    necGrid.innerHTML = activeAdminGovernanceData.nec.map((item, idx) => {
      return `
        <div class="gov-member-card" id="govCardAdminNec_${idx}" data-idx="${idx}" data-photo="${escapeHtml(item.photo || '')}">
          <div class="gov-photo-picker-row">
            <div class="gov-photo-preview" id="govPreviewNec_${idx}">
              ${item.photo ? `<img src="${escapeHtml(item.photo)}" alt="${escapeHtml(item.title)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` : `<span>${idx + 1}</span>`}
            </div>
            <div style="flex: 1;">
              <label class="admin-label" style="margin-bottom: 4px; font-size: 0.76rem; font-weight: 700;">Upload Photo</label>
              <input type="file" accept="image/*" class="admin-input" style="padding: 5px 8px; font-size: 0.76rem;" onchange="handleGovPhotoUpload(event, 'govPreviewNec_${idx}', 'govCardAdminNec_${idx}')">
            </div>
          </div>
          <div class="admin-form-group" style="margin-bottom: 0;">
            <label class="admin-label">Statutory Position</label>
            <input type="text" class="admin-input gov-title-input" value="${escapeHtml(item.title)}">
          </div>
          <div class="admin-form-group" style="margin-bottom: 0;">
            <label class="admin-label">Executive Role / Portfolio</label>
            <input type="text" class="admin-input gov-role-input" value="${escapeHtml(item.role || '')}" placeholder="Executive Portfolio">
          </div>
          <div class="admin-form-group" style="margin-bottom: 0;">
            <label class="admin-label">Full Name of Officer</label>
            <input type="text" class="admin-input gov-name-input" placeholder="Official Name" value="${escapeHtml(item.name && item.name !== item.title ? item.name : '')}">
          </div>
          <div class="admin-form-group" style="margin-bottom: 0;">
            <label class="admin-label">About / Responsibilities</label>
            <textarea class="admin-textarea gov-about-input" rows="2" placeholder="Portfolio scope and statutory duties...">${escapeHtml(item.about || '')}</textarea>
          </div>
        </div>
      `;
    }).join('');
  }

  // 4. Render State Chapters (37)
  renderAdminStateChapters('');
}

function syncCurrentStateInputsToActiveData() {
  if (!activeAdminGovernanceData || !activeAdminGovernanceData.states) return;
  document.querySelectorAll('.gov-state-card').forEach(card => {
    const stateName = card.getAttribute('data-state');
    const stateObj = activeAdminGovernanceData.states.find(s => s.state === stateName);
    if (!stateObj) return;

    const coordName = card.querySelector('.gov-coord-name')?.value.trim();
    const secName = card.querySelector('.gov-sec-name')?.value.trim();
    const projects = card.querySelector('.gov-state-projects')?.value.trim();

    stateObj.coordinator = coordName || 'State Coordinator';
    stateObj.secretary = secName || 'State Secretary';
    stateObj.projects = projects || '';
    if (card.dataset.coordPhoto !== undefined) stateObj.coordPhoto = card.dataset.coordPhoto;
    if (card.dataset.secPhoto !== undefined) stateObj.secPhoto = card.dataset.secPhoto;
  });
}

function renderAdminStateChapters(filterText = '') {
  const container = document.getElementById('govStatesGrid');
  if (!container || !activeAdminGovernanceData || !activeAdminGovernanceData.states) return;

  syncCurrentStateInputsToActiveData();

  const query = (filterText || '').toLowerCase().trim();
  const filtered = activeAdminGovernanceData.states.filter(s => {
    return !query || s.state.toLowerCase().includes(query) || s.zone.toLowerCase().includes(query);
  });

  if (!filtered.length) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 36px 20px; color: var(--admin-text-muted);">
        No matching states found for "${escapeHtml(filterText)}".
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map((s, idx) => {
    const coordAvatar = s.coordPhoto
      ? `<img src="${escapeHtml(s.coordPhoto)}" alt="${escapeHtml(s.coordinator)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
      : `<span>SC</span>`;

    const secAvatar = s.secPhoto
      ? `<img src="${escapeHtml(s.secPhoto)}" alt="${escapeHtml(s.secretary)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
      : `<span>SS</span>`;

    return `
      <div class="gov-state-card" id="govCardAdminState_${idx}" data-state="${escapeHtml(s.state)}" data-zone="${escapeHtml(s.zone)}" data-coord-photo="${escapeHtml(s.coordPhoto || '')}" data-sec-photo="${escapeHtml(s.secPhoto || '')}">
        <div class="gov-state-header">
          <span class="gov-state-title">${escapeHtml(s.state)} State Chapter</span>
          <span class="gov-state-zone-badge">${escapeHtml(s.zone)}</span>
        </div>
        <div class="gov-state-exec-grid">
          <!-- Coordinator -->
          <div class="gov-exec-box">
            <strong style="font-size: 0.8rem; color: var(--admin-primary); display: flex; align-items: center; gap: 6px;">
              ${getIconSvg('user-check', { size: 14 })} State Coordinator
            </strong>
            <div style="display: flex; align-items: center; gap: 10px;">
              <div class="gov-photo-preview" id="govCoordPreview_${idx}" style="width: 44px; height: 44px; font-size: 0.85rem;">
                ${coordAvatar}
              </div>
              <div style="flex: 1;">
                <input type="file" accept="image/*" class="admin-input" style="padding: 4px; font-size: 0.72rem;" onchange="handleStatePhotoUpload(event, 'govCoordPreview_${idx}', 'govCardAdminState_${idx}', 'coord')">
              </div>
            </div>
            <input type="text" class="admin-input gov-coord-name" placeholder="Coordinator Name" value="${escapeHtml(s.coordinator !== 'State Coordinator' ? s.coordinator : '')}">
          </div>

          <!-- Secretary -->
          <div class="gov-exec-box">
            <strong style="font-size: 0.8rem; color: var(--admin-primary); display: flex; align-items: center; gap: 6px;">
              ${getIconSvg('file-text', { size: 14 })} State Secretary
            </strong>
            <div style="display: flex; align-items: center; gap: 10px;">
              <div class="gov-photo-preview" id="govSecPreview_${idx}" style="width: 44px; height: 44px; font-size: 0.85rem;">
                ${secAvatar}
              </div>
              <div style="flex: 1;">
                <input type="file" accept="image/*" class="admin-input" style="padding: 4px; font-size: 0.72rem;" onchange="handleStatePhotoUpload(event, 'govSecPreview_${idx}', 'govCardAdminState_${idx}', 'sec')">
              </div>
            </div>
            <input type="text" class="admin-input gov-sec-name" placeholder="Secretary Name" value="${escapeHtml(s.secretary !== 'State Secretary' ? s.secretary : '')}">
          </div>
        </div>

        <!-- Projects -->
        <div class="admin-form-group" style="margin-bottom: 0;">
          <label class="admin-label" style="font-size: 0.76rem; display: flex; align-items: center; gap: 6px;">
            ${getIconSvg('folder-git-2', { size: 13 })} State Projects (Track B Grassroots Initiatives)
          </label>
          <textarea class="admin-textarea gov-state-projects" rows="2" placeholder="Key initiatives and grassroots empowerment projects in this state...">${escapeHtml(s.projects || '')}</textarea>
        </div>
      </div>
    `;
  }).join('');
}

window.handleGovPhotoUpload = function(event, previewId, cardId) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showAdminToast('Please select a valid image file (PNG, JPG, WebP).', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = function(e) {
    const dataUrl = e.target.result;
    const previewEl = document.getElementById(previewId);
    if (previewEl) {
      previewEl.innerHTML = `<img src="${dataUrl}" alt="Preview" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
    }
    const cardEl = document.getElementById(cardId);
    if (cardEl) {
      cardEl.dataset.photo = dataUrl;
    }
    showAdminToast('Photo loaded. Click "Save Governance Changes" to publish.', 'info');
  };
  reader.readAsDataURL(file);
};

window.handleStatePhotoUpload = function(event, previewId, cardId, role) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showAdminToast('Please select a valid image file.', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = function(e) {
    const dataUrl = e.target.result;
    const previewEl = document.getElementById(previewId);
    if (previewEl) {
      previewEl.innerHTML = `<img src="${dataUrl}" alt="Preview" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
    }
    const cardEl = document.getElementById(cardId);
    if (cardEl) {
      if (role === 'coord') cardEl.dataset.coordPhoto = dataUrl;
      if (role === 'sec') cardEl.dataset.secPhoto = dataUrl;
    }
    syncCurrentStateInputsToActiveData();
    showAdminToast('State official photo loaded. Click "Save Governance Changes" to publish.', 'info');
  };
  reader.readAsDataURL(file);
};

window.saveGovernanceChanges = function() {
  if (!activeAdminGovernanceData) return;

  // 1. Read Patrons
  const patronCards = document.querySelectorAll('#govPatronsGrid .gov-member-card');
  const patrons = [];
  patronCards.forEach(card => {
    const idx = parseInt(card.getAttribute('data-idx'), 10);
    const title = card.querySelector('.gov-title-input')?.value.trim() || `Patron`;
    const name = card.querySelector('.gov-name-input')?.value.trim() || title;
    const about = card.querySelector('.gov-about-input')?.value.trim() || '';
    const photo = card.dataset.photo || '';
    patrons.push({ id: `patron_${idx}`, title, name, photo, about });
  });

  // 2. Read Matrons
  const matronCards = document.querySelectorAll('#govMatronsGrid .gov-member-card');
  const matrons = [];
  matronCards.forEach(card => {
    const idx = parseInt(card.getAttribute('data-idx'), 10);
    const title = card.querySelector('.gov-title-input')?.value.trim() || `Matron`;
    const name = card.querySelector('.gov-name-input')?.value.trim() || title;
    const about = card.querySelector('.gov-about-input')?.value.trim() || '';
    const photo = card.dataset.photo || '';
    matrons.push({ id: `matron_${idx}`, title, name, photo, about });
  });

  // 3. Read NEC
  const necCards = document.querySelectorAll('#govNecGrid .gov-member-card');
  const nec = [];
  necCards.forEach(card => {
    const idx = parseInt(card.getAttribute('data-idx'), 10);
    const title = card.querySelector('.gov-title-input')?.value.trim() || `National Officer`;
    const role = card.querySelector('.gov-role-input')?.value.trim() || '';
    const name = card.querySelector('.gov-name-input')?.value.trim() || title;
    const about = card.querySelector('.gov-about-input')?.value.trim() || '';
    const photo = card.dataset.photo || '';
    nec.push({ id: `nec_${idx}`, title, role, name, photo, about });
  });

  // 4. Sync State Chapters
  syncCurrentStateInputsToActiveData();

  const finalData = {
    patrons: patrons.length === 3 ? patrons : activeAdminGovernanceData.patrons,
    matrons: matrons.length === 3 ? matrons : activeAdminGovernanceData.matrons,
    nec: nec.length === 8 ? nec : activeAdminGovernanceData.nec,
    states: activeAdminGovernanceData.states
  };

  localStorage.setItem('ncsyf_admin_governance', JSON.stringify(finalData));
  activeAdminGovernanceData = finalData;

  showAdminToast('Governance Directory & 37 State Chapters saved! All updates are live on the public website.');
};

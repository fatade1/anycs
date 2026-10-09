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
  API_CONFIG: 'ncsyf_admin_api_config'
};

// ---- Administrator Accounts Seed Data ----
const SEED_ADMIN_USERS = [
  {
    id: 'ADM-001',
    name: 'National Secretariat Super Admin',
    email: 'admin@anycs.org.ng',
    password: 'Secretariat@2026',
    role: 'super_admin',
    roleLabel: 'Super Administrator',
    createdAt: '2026-09-01',
    status: 'active'
  },
  {
    id: 'ADM-002',
    name: 'Desk Operations Regular Admin',
    email: 'officer@anycs.org.ng',
    password: 'Officer@2026',
    role: 'regular_admin',
    roleLabel: 'Regular Administrator',
    createdAt: '2026-09-15',
    status: 'active'
  }
];

// ---- Realistic Initial Seed Data ----
const SEED_MEMBERS = [
  {
    id: 'NCSYF-1995-0001',
    memberId: 'NCSYF-1995-0001',
    firstName: 'Amina',
    lastName: 'Ibrahim',
    category: 'full',
    memberTypeLabel: 'Full Member (18–35 yrs)',
    dob: '1995-04-12',
    age: 31,
    gender: 'female',
    phone: '+234 803 219 4012',
    email: 'amina.ibrahim@health.gov.ng',
    tier: 'federal',
    tierLabel: 'Federal Government MDA',
    mda: 'Federal Ministry of Health & Social Welfare, Abuja',
    stateChapter: 'FCT Abuja',
    staffId: 'FMoH/2019/0842',
    docType: 'staff_id_card',
    docTypeLabel: 'Official Staff Identification Card',
    status: 'verified',
    registeredAt: '2026-09-28 14:22:10'
  },
  {
    id: 'NCSYF-1998-0001',
    memberId: 'NCSYF-1998-0001',
    firstName: 'Chidiebere',
    lastName: 'Okonkwo',
    category: 'full',
    memberTypeLabel: 'Full Member (18–35 yrs)',
    dob: '1998-11-05',
    age: 27,
    gender: 'male',
    phone: '+234 812 873 9921',
    email: 'chidi.okonkwo@nitda.gov.ng',
    tier: 'federal',
    tierLabel: 'Federal Government MDA',
    mda: 'National Information Technology Development Agency (NITDA)',
    stateChapter: 'FCT Abuja',
    staffId: 'NITDA/TS/2021/319',
    docType: 'appointment_letter',
    docTypeLabel: 'Valid Letter of Employment / Appointment',
    status: 'verified',
    registeredAt: '2026-09-29 09:14:05'
  },
  {
    id: 'NCSYF-1987-0001',
    memberId: 'NCSYF-1987-0001',
    firstName: 'Babatunde',
    lastName: 'Adeleke',
    category: 'associate',
    memberTypeLabel: 'Associate Member (After 35 yrs / Alumni)',
    dob: '1987-03-18',
    age: 39,
    gender: 'male',
    phone: '+234 802 334 1180',
    email: 'badeleke@lagosstate.gov.ng',
    tier: 'state',
    tierLabel: 'State Government MDA',
    mda: 'Lagos State Ministry of Science & Technology',
    stateChapter: 'Lagos',
    staffId: 'LASG/ST/04118',
    docType: 'gazette',
    docTypeLabel: 'Official Civil Service Gazette Notice',
    status: 'verified',
    registeredAt: '2026-09-29 16:45:30'
  },
  {
    id: 'NCSYF-1996-0001',
    memberId: 'NCSYF-1996-0001',
    firstName: 'Fatima',
    lastName: 'Bello',
    category: 'full',
    memberTypeLabel: 'Full Member (18–35 yrs)',
    dob: '1996-08-22',
    age: 30,
    gender: 'female',
    phone: '+234 806 771 2004',
    email: 'fbello@kano.gov.ng',
    tier: 'state',
    tierLabel: 'State Government MDA',
    mda: 'Kano State Civil Service Commission',
    stateChapter: 'Kano',
    staffId: 'KNS/CSC/2020/094',
    docType: 'staff_id_card',
    docTypeLabel: 'Official Staff Identification Card',
    status: 'pending',
    registeredAt: '2026-09-30 11:08:44'
  },
  {
    id: 'NCSYF-1984-0001',
    memberId: 'NCSYF-1984-0001',
    firstName: 'Emeka',
    lastName: 'Nwosu',
    category: 'associate',
    memberTypeLabel: 'Associate Member (After 35 yrs / Alumni)',
    dob: '1984-06-12',
    age: 42,
    gender: 'male',
    phone: '+234 803 551 0928',
    email: 'emeka.nwosu@npa.gov.ng',
    tier: 'federal',
    tierLabel: 'Federal Government MDA',
    mda: 'Nigerian Ports Authority (NPA)',
    stateChapter: 'Rivers',
    staffId: 'NPA/ENG/2012/044',
    docType: 'appointment_letter',
    docTypeLabel: 'Valid Letter of Employment / Appointment',
    status: 'verified',
    registeredAt: '2026-10-01 10:30:19'
  },
  {
    id: 'NCSYF-2000-0001',
    memberId: 'NCSYF-2000-0001',
    firstName: 'Zainab',
    lastName: 'Mustapha',
    category: 'full',
    memberTypeLabel: 'Full Member (18–35 yrs)',
    dob: '2000-01-14',
    age: 26,
    gender: 'female',
    phone: '+234 818 902 4432',
    email: 'z.mustapha@kaduna.gov.ng',
    tier: 'lga',
    tierLabel: 'Local Government Council',
    mda: 'Zaria Local Government Council Administration',
    stateChapter: 'Kaduna',
    staffId: 'ZLG/ADM/2022/112',
    docType: 'staff_id_card',
    docTypeLabel: 'Official Staff Identification Card',
    status: 'pending',
    registeredAt: '2026-10-02 08:40:22'
  },
  {
    id: 'NCSYF-1997-0001',
    memberId: 'NCSYF-1997-0001',
    firstName: 'Oluwaseun',
    lastName: 'Ajayi',
    category: 'full',
    memberTypeLabel: 'Full Member (18–35 yrs)',
    dob: '1997-07-09',
    age: 29,
    gender: 'male',
    phone: '+234 814 620 5511',
    email: 'o.ajayi@fmf.gov.ng',
    tier: 'federal',
    tierLabel: 'Federal Government MDA',
    mda: 'Federal Ministry of Finance, Budget & National Planning',
    stateChapter: 'FCT Abuja',
    staffId: 'FMF/BNP/2020/718',
    docType: 'gazette',
    docTypeLabel: 'Official Civil Service Gazette Notice',
    status: 'verified',
    registeredAt: '2026-10-03 15:19:00'
  },
  {
    id: 'NCSYF-1986-0001',
    memberId: 'NCSYF-1986-0001',
    firstName: 'Halima',
    lastName: 'Danjuma',
    category: 'associate',
    memberTypeLabel: 'Associate Member (After 35 yrs / Alumni)',
    dob: '1986-12-04',
    age: 39,
    gender: 'female',
    phone: '+234 809 332 1980',
    email: 'h.danjuma@education.gov.ng',
    tier: 'federal',
    tierLabel: 'Federal Government MDA',
    mda: 'Federal Ministry of Education / UBEC',
    stateChapter: 'Plateau',
    staffId: 'UBEC/PL/2015/882',
    docType: 'appointment_letter',
    docTypeLabel: 'Valid Letter of Employment / Appointment',
    status: 'verified',
    registeredAt: '2026-10-04 12:05:41'
  },
  {
    id: 'NCSYF-1999-0001',
    memberId: 'NCSYF-1999-0001',
    firstName: 'Tari',
    lastName: 'Ebiware',
    category: 'full',
    memberTypeLabel: 'Full Member (18–35 yrs)',
    dob: '1999-05-18',
    age: 27,
    gender: 'male',
    phone: '+234 805 119 7720',
    email: 'tari.ebiware@bayelsa.gov.ng',
    tier: 'state',
    tierLabel: 'State Government MDA',
    mda: 'Bayelsa State Ministry of Environment',
    stateChapter: 'Bayelsa',
    staffId: 'BY/ENV/2023/502',
    docType: 'staff_id_card',
    docTypeLabel: 'Official Staff Identification Card',
    status: 'disapproved',
    disapprovedReason: 'Official Staff ID / File number could not be authenticated with MDA records',
    disapprovedNotes: 'The staff file number provided could not be matched against the official State Ministry nominal roll. Please reapply uploading your formal Letter of Appointment.',
    disapprovedAt: '2026-10-06 14:10:00',
    canReapply: true,
    registeredAt: '2026-10-05 11:32:15'
  }
];

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

// ---- Store Helpers ----
function getStoredAdminUsers() {
  const data = localStorage.getItem(STORAGE_KEYS.ADMIN_USERS);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.ADMIN_USERS, JSON.stringify(SEED_ADMIN_USERS));
    return SEED_ADMIN_USERS;
  }
  try {
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) && parsed.length ? parsed : SEED_ADMIN_USERS;
  } catch (e) {
    return SEED_ADMIN_USERS;
  }
}

function saveAdminUsers(users) {
  localStorage.setItem(STORAGE_KEYS.ADMIN_USERS, JSON.stringify(users));
}

function getStoredMembers() {
  const data = localStorage.getItem(STORAGE_KEYS.MEMBERS);
  let members = SEED_MEMBERS;
  if (data) {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length) members = parsed;
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

  if (modified || !data) {
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
      // Ensure seed projects have images populated if previously empty
      let updated = false;
      parsed.forEach(p => {
        const seed = SEED_PROJECTS.find(s => s.id === p.id);
        if (seed && (!p.images || !p.images.length) && seed.images) {
          p.images = seed.images;
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

function compressImageFile(file, maxDimension = 1280, quality = 0.82) {
  return new Promise((resolve) => {
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
      img.onerror = () => resolve(e.target.result);
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
        <img src="${imgSrc}" alt="Project picture ${index + 1}">
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
        <img src="${imgSrc}" alt="Resource picture ${index + 1}">
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

    dropzone.classList.remove('has-error');
    const ext = getFileExtension(file.name) || 'PDF';
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

  // Login Form
  const loginForm = document.getElementById('adminLoginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  // 1-Click Demo Fill: Super Admin
  const btnDemoSuperAdmin = document.getElementById('btnDemoSuperAdmin');
  if (btnDemoSuperAdmin) {
    btnDemoSuperAdmin.addEventListener('click', () => {
      const emailInput = document.getElementById('adminLoginEmail');
      const passInput = document.getElementById('adminLoginPassword');
      if (emailInput) emailInput.value = 'admin@anycs.org.ng';
      if (passInput) passInput.value = 'Secretariat@2026';
      showAdminToast('Super Admin demo credentials auto-filled. Click "Sign In" to proceed.');
    });
  }

  // 1-Click Demo Fill: Regular Admin
  const btnDemoRegularAdmin = document.getElementById('btnDemoRegularAdmin');
  if (btnDemoRegularAdmin) {
    btnDemoRegularAdmin.addEventListener('click', () => {
      const emailInput = document.getElementById('adminLoginEmail');
      const passInput = document.getElementById('adminLoginPassword');
      if (emailInput) emailInput.value = 'officer@anycs.org.ng';
      if (passInput) passInput.value = 'Officer@2026';
      showAdminToast('Regular Admin demo credentials auto-filled. Click "Sign In" to proceed.');
    });
  }

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
// AUTHENTICATION LOGIC (Super Admin vs Regular Admin)
// ==========================================================================
function handleLogin(e) {
  e.preventDefault();
  const form = e.target;
  const emailInput = form.querySelector('#adminLoginEmail');
  const passwordInput = form.querySelector('#adminLoginPassword');
  const rememberCheckbox = form.querySelector('#adminRememberMe');

  const email = emailInput ? emailInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value.trim() : '';
  const remember = rememberCheckbox ? rememberCheckbox.checked : false;

  if (!email || !password) {
    showAdminToast('Please provide your admin email and password.', 'error');
    return;
  }

  // Look up credentials in the Admin accounts registry
  const adminUsers = getStoredAdminUsers();
  const matched = adminUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

  let role = 'regular_admin';
  let displayName = 'Admin Official';

  if (matched) {
    if (matched.status === 'revoked') {
      showAdminToast('Access Denied: This administrator account has been revoked by Super Admin.', 'error');
      return;
    }
    role = matched.role;
    displayName = matched.name;
  } else if (
    email.toLowerCase() === 'admin@anycs.org.ng' || 
    email.toLowerCase().includes('super') || 
    email.toLowerCase().includes('secretariat') || 
    password === 'Secretariat@2026'
  ) {
    role = 'super_admin';
    displayName = 'National Secretariat Super Admin';
  } else {
    role = 'regular_admin';
    const prefix = email.split('@')[0];
    displayName = prefix.charAt(0).toUpperCase() + prefix.slice(1).replace('.', ' ');
  }

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
    admins: { title: 'Admin Team & Roles', subtitle: 'Manage administrator accounts, assign permissions and revoke access' },
    settings: { title: 'System & Backend Settings', subtitle: 'Configure future backend API endpoints and manage data' }
  };

  if (titles[tabId]) {
    if (pageTitle) pageTitle.textContent = titles[tabId].title;
    if (pageSubtitle) pageSubtitle.textContent = titles[tabId].subtitle;
  }

  // Refresh relevant view
  if (tabId === 'overview') renderDashboard();
  if (tabId === 'members') renderMembersTable();
  if (tabId === 'projects') renderProjectsList();
  if (tabId === 'resources') renderResourcesList();
  if (tabId === 'admins') renderAdminsTable();
}

// ==========================================================================
// RENDER DASHBOARD & STATS
// ==========================================================================
function renderDashboard() {
  const members = getStoredMembers();
  const projects = getStoredProjects();
  const resources = getStoredResources();

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

  if (elTotal) elTotal.textContent = totalMembers;
  if (elFull) elFull.textContent = fullMembers;
  if (elAssociate) elAssociate.textContent = associateMembers;
  if (elMdas) elMdas.textContent = distinctMdas;
  if (elProjects) elProjects.textContent = projects.length;
  if (elResources) elResources.textContent = resources.length;

  // Update sidebar counter badges
  const badgeMembers = document.getElementById('sidebarBadgeMembers');
  const badgeProjects = document.getElementById('sidebarBadgeProjects');
  const badgeResources = document.getElementById('sidebarBadgeResources');

  if (badgeMembers) badgeMembers.textContent = totalMembers;
  if (badgeProjects) badgeProjects.textContent = projects.length;
  if (badgeResources) badgeResources.textContent = resources.length;

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
        <td data-label="Full Name"><strong>${m.firstName || ''} ${m.lastName || ''}</strong></td>
        <td data-label="Category">${catBadge}</td>
        <td data-label="Member ID"><span class="member-id-tag">${m.memberId || m.id}</span></td>
        <td data-label="Staff ID"><code>${m.staffId || 'N/A'}</code></td>
        <td data-label="Ministry / MDA" style="max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${m.mda || 'Not specified'}">${m.mda || 'N/A'}</td>
        <td data-label="Status">${statusBadge}</td>
        <td data-label="Action" class="cell-actions">
          <button class="btn-admin btn-admin-outline btn-admin-sm btn-action-block" onclick="viewMemberDossier('${m.id}')">
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
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="table-empty-cell" style="text-align: center; padding: 36px; color: var(--admin-text-muted);">
          <div style="margin-bottom: 8px; color: var(--admin-text-muted);">${getIconSvg('search', { size: 32 })}</div>
          <strong>No matching member applications found</strong>
          <p style="font-size: 0.82rem; margin-top: 4px;">Try adjusting your search criteria or category filters.</p>
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
            <div style="font-weight: 700; color: var(--admin-primary);">${m.firstName || ''} ${m.lastName || ''}</div>
            <div style="font-size: 0.76rem; color: var(--admin-text-muted); margin-top: 2px;">${m.email || 'No email provided'}</div>
          </div>
        </td>
        <td data-label="Category">${catBadge}</td>
        <td data-label="Member ID"><span class="member-id-tag">${m.memberId || m.id}</span></td>
        <td data-label="Staff ID / File No."><code>${m.staffId || 'N/A'}</code></td>
        <td data-label="MDA & Tier">
          <div class="member-mda-block">
            <div style="font-weight: 600; font-size: 0.85rem;">${m.mda || 'N/A'}</div>
            <div style="font-size: 0.74rem; color: var(--admin-text-muted); margin-top: 2px;">${m.tierLabel || m.tier || 'Public Service'}</div>
          </div>
        </td>
        <td data-label="Chapter">${m.stateChapter || 'FCT Abuja'}</td>
        <td data-label="Status">${statusBadge}</td>
        <td data-label="Date" style="font-size: 0.78rem; color: var(--admin-text-muted); white-space: nowrap;">${m.registeredAt ? m.registeredAt.split(' ')[0] : 'Recent'}</td>
        <td data-label="Actions" class="cell-actions">
          <div class="table-actions">
            <button class="btn-icon-sm" title="View Full Application Dossier" onclick="viewMemberDossier('${m.id}')">
              ${getIconSvg('eye', { size: 15 })}
            </button>
            ${m.status !== 'verified' ? `
              <button class="btn-icon-sm" style="color: #15803D;" title="Approve & Verify Application" onclick="updateMemberStatus('${m.id}', 'verified')">
                ${getIconSvg('check', { size: 15 })}
              </button>
            ` : ''}
            ${m.status !== 'disapproved' ? `
              <button class="btn-icon-sm disapprove" title="Disapprove Verification (Allow Reapply)" onclick="openDisapproveModal('${m.id}')">
                ${getIconSvg('ban', { size: 15 })}
              </button>
            ` : `
              <button class="btn-icon-sm" style="color: #D97706;" title="Reset to Pending Review" onclick="updateMemberStatus('${m.id}', 'pending')">
                ${getIconSvg('rotate-ccw', { size: 15 })}
              </button>
            `}
            ${isSuper ? `
              <button class="btn-icon-sm delete" title="Permanently Delete Member (Super Admin Only)" onclick="deleteMember('${m.id}')">
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
        <h4 style="font-size: 1.25rem; font-weight: 800; color: var(--admin-primary);">${m.firstName || ''} ${m.lastName || ''}</h4>
        <div style="font-size: 0.8rem; color: var(--admin-text-muted); margin-top: 2px;">Application Reference ID: <code>${m.id}</code></div>
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
          <strong>Disapproval Reason:</strong> ${m.disapprovedReason || 'Official credentials could not be authenticated with MDA nominal roll.'}
        </div>
        ${m.disapprovedNotes ? `
          <div style="font-size: 0.8rem; color: #991B1B; background: rgba(255,255,255,0.7); padding: 8px 10px; border-radius: 4px; margin-top: 6px;">
            <strong>Secretariat Guidance:</strong> ${m.disapprovedNotes}
          </div>
        ` : ''}
        <div style="font-size: 0.74rem; color: #B91C1C; margin-top: 6px;">
          Decision recorded on: ${m.disapprovedAt || 'Recent'} • Applicant is permitted to submit a corrected application anytime.
        </div>
      </div>
    ` : ''}

    <div class="dossier-grid">
      <div class="dossier-item">
        <label>Permanent Member ID</label>
        <span><span class="member-id-tag">${m.memberId || m.id}</span></span>
      </div>
      <div class="dossier-item">
        <label>MDA Staff ID / File No.</label>
        <span><code>${m.staffId || 'Not provided'}</code></span>
      </div>
      <div class="dossier-item">
        <label>Membership Category</label>
        <span>${m.memberTypeLabel || (isFull ? 'Full Member (18–35 yrs)' : 'Associate Member (After 35 yrs)')}</span>
      </div>
      <div class="dossier-item">
        <label>Tier of Public Service</label>
        <span>${m.tierLabel || m.tier || 'Civil Service'}</span>
      </div>
      <div class="dossier-item full-width">
        <label>Ministry, Department or Agency (MDA)</label>
        <span>${m.mda || 'Not specified / Alumni transition'}</span>
      </div>
      <div class="dossier-item">
        <label>State Chapter</label>
        <span>${m.stateChapter || 'FCT Abuja'}</span>
      </div>
      <div class="dossier-item">
        <label>Official / Personal Email</label>
        <span><a href="mailto:${m.email || ''}" style="color: var(--admin-primary); font-weight: 700;">${m.email || 'N/A'}</a></span>
      </div>
      <div class="dossier-item">
        <label>Contact Phone Number</label>
        <span>${m.phone || 'N/A'}</span>
      </div>
      <div class="dossier-item">
        <label>Date of Birth / Age</label>
        <span>${m.dob || 'N/A'} ${m.age ? `(${m.age} years old)` : ''}</span>
      </div>
      <div class="dossier-item">
        <label>Gender</label>
        <span>${m.gender ? (m.gender.charAt(0).toUpperCase() + m.gender.slice(1)) : 'N/A'}</span>
      </div>
      ${m.docTypeLabel || m.docType ? `
      <div class="dossier-item full-width">
        <label>Verification Document Type</label>
        <span>${m.docTypeLabel || m.docType}</span>
      </div>
      ` : ''}
      <div class="dossier-item full-width">
        <label>Registration Date &amp; Legal Consent</label>
        <span>Submitted on ${m.registeredAt || 'Recent'} • NDPA 2023 Consent Confirmed (Verified) ${m.reappliedAt ? `• Reapplied: ${m.reappliedAt}` : ''}</span>
      </div>
    </div>

    <div class="dossier-actions" style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; flex-wrap: wrap;">
      ${isDisapproved ? `
        <button type="button" class="btn-admin btn-admin-primary btn-admin-sm" onclick="updateMemberStatus('${m.id}', 'verified'); closeAllModals();">
          ${getIconSvg('check', { size: 14 })} Override &amp; Approve Verification
        </button>
        <button type="button" class="btn-admin btn-admin-outline btn-admin-sm" onclick="updateMemberStatus('${m.id}', 'pending'); closeAllModals();">
          ${getIconSvg('rotate-ccw', { size: 14 })} Reset to Pending Review
        </button>
      ` : `
        ${m.status !== 'verified' ? `
          <button type="button" class="btn-admin btn-admin-primary btn-admin-sm" onclick="updateMemberStatus('${m.id}', 'verified'); closeAllModals();">
            ${getIconSvg('check', { size: 14 })} Approve &amp; Verify Application
          </button>
        ` : `
          <button type="button" class="btn-admin btn-admin-outline btn-admin-sm" onclick="updateMemberStatus('${m.id}', 'pending'); closeAllModals();">
            Mark as Pending Review
          </button>
        `}
        <button type="button" class="btn-admin btn-admin-danger btn-admin-sm" style="background: #DC2626;" onclick="closeAllModals(); openDisapproveModal('${m.id}');">
          ${getIconSvg('ban', { size: 14 })} Disapprove Verification (Allow Reapply)
        </button>
      `}
      ${isSuper ? `
        <button type="button" class="btn-admin btn-admin-outline btn-admin-sm" style="color: #DC2626; border-color: #FECACA;" onclick="closeAllModals(); deleteMember('${m.id}');">
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
  members = members.filter(m => m.id !== memberId);
  saveMembers(members);
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
            <img src="${p.images[0]}" alt="${p.title}" style="width: 100%; height: 100%; object-fit: cover;">
            <span style="position: absolute; bottom: 8px; right: 8px; background: rgba(15,23,42,0.85); color: #fff; font-size: 0.72rem; font-weight: 700; padding: 3px 8px; border-radius: 12px; backdrop-filter: blur(4px); display: inline-flex; align-items: center; gap: 4px;">
              ${getIconSvg('image', { size: 12 })} ${p.images.length} photo${p.images.length === 1 ? '' : 's'}
            </span>
          </div>
        ` : ''}

        <div class="item-card-header">
          <span class="item-badge-sector">${p.sector || 'Public Service'}</span>
          ${statusBadge}
        </div>
        <h4 class="item-title">${p.title}</h4>
        <div class="item-agency" style="display: flex; align-items: center; gap: 6px;">
          ${getIconSvg('landmark', { size: 14 })} <span>${p.leadMda}</span>
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
  const sectorSelect = document.getElementById('newProjectSector');
  const statusSelect = document.getElementById('newProjectStatus');
  const mdaInput = document.getElementById('newProjectMda');
  const benInput = document.getElementById('newProjectBeneficiaries');
  const budgetInput = document.getElementById('newProjectBudget');
  const descInput = document.getElementById('newProjectDesc');

  if (titleInput) titleInput.value = p.title || '';
  if (sectorSelect) sectorSelect.value = p.sector || 'Technology & Innovation';
  if (statusSelect) statusSelect.value = p.status || 'active';
  if (mdaInput) mdaInput.value = p.leadMda || '';
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
  const sector = form.querySelector('#newProjectSector').value;
  const leadMda = form.querySelector('#newProjectMda').value.trim();
  const beneficiaries = form.querySelector('#newProjectBeneficiaries').value.trim();
  const budget = form.querySelector('#newProjectBudget').value.trim();
  const status = form.querySelector('#newProjectStatus').value;
  const description = form.querySelector('#newProjectDesc').value.trim();

  if (!title || !leadMda || !description) {
    showAdminToast('Please fill in all required project fields.', 'error');
    return;
  }

  const projects = getStoredProjects();

  if (editingId) {
    // Edit existing project
    const index = projects.findIndex(p => p.id === editingId);
    if (index === -1) {
      showAdminToast('Project record not found.', 'error');
      return;
    }

    projects[index].title = title;
    projects[index].sector = sector;
    projects[index].leadMda = leadMda;
    projects[index].targetBeneficiaries = beneficiaries || 'National Public Service Youths';
    projects[index].budget = budget || 'Government Subvention';
    projects[index].status = status;
    projects[index].statusLabel = status === 'active' ? 'Active Implementation' : (status === 'completed' ? 'Completed' : 'Planning & Review');
    projects[index].description = description;
    projects[index].images = [...uploadedProjectImages];

    if (uploadedProjectFileData) {
      projects[index].attachedDocName = uploadedProjectFileData.name;
      projects[index].attachedDocSize = uploadedProjectFileData.size;
      projects[index].attachedDocData = uploadedProjectFileData.dataUrl;
    }

    saveProjects(projects);
    showAdminToast(`Project "${title}" updated successfully!`);
  } else {
    // Add new project
    const newProject = {
      id: `PRJ-${String(projects.length + 1).padStart(3, '0')}`,
      title,
      sector,
      leadMda,
      targetBeneficiaries: beneficiaries || 'National Public Service Youths',
      budget: budget || 'N/A',
      status,
      statusLabel: status === 'active' ? 'Active Implementation' : (status === 'completed' ? 'Completed' : 'Planning & Review'),
      description,
      images: [...uploadedProjectImages],
      dateAdded: new Date().toISOString().split('T')[0]
    };

    if (uploadedProjectFileData) {
      newProject.attachedDocName = uploadedProjectFileData.name;
      newProject.attachedDocSize = uploadedProjectFileData.size;
      newProject.attachedDocData = uploadedProjectFileData.dataUrl;
    }

    projects.unshift(newProject);
    saveProjects(projects);
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
    const isPrimary = a.id === 'ADM-001' || a.email === 'admin@anycs.org.ng';
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
              <div style="font-weight: 700; color: var(--admin-primary);">${a.name}</div>
              <div style="font-size: 0.74rem; color: var(--admin-text-muted);">${a.id}</div>
            </div>
          </div>
        </td>
        <td data-label="Role & Permissions">${roleBadge}</td>
        <td data-label="Email Address"><code>${a.email}</code></td>
        <td data-label="Created Date" style="font-size: 0.8rem; color: var(--admin-text-muted);">${a.createdAt || '2026-09-01'}</td>
        <td data-label="Status">${statusBadge}</td>
        <td data-label="Actions" class="cell-actions">
          <div class="table-actions">
            ${(isPrimary || isSelf) ? `
              <span style="font-size: 0.74rem; color: var(--admin-text-muted); font-weight: 700;">${isPrimary ? 'Primary Account' : 'Current Session'}</span>
            ` : `
              <button class="btn-icon-sm ${isRevoked ? '' : 'disapprove'}" title="${isRevoked ? 'Restore Access' : 'Revoke Access'}" onclick="toggleAdminStatus('${a.id}')">
                ${getIconSvg(isRevoked ? 'check-circle' : 'ban', { size: 15 })}
              </button>
              <button class="btn-icon-sm delete" title="Permanently Delete Admin" onclick="deleteAdmin('${a.id}')">
                ${getIconSvg('trash-2', { size: 15 })}
              </button>
            `}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function handleAddAdmin(e) {
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

  const admins = getStoredAdminUsers();
  if (admins.some(a => a.email.toLowerCase() === email)) {
    showAdminToast('An administrator with this email already exists.', 'error');
    return;
  }

  const newAdmin = {
    id: `ADM-${String(admins.length + 1).padStart(3, '0')}`,
    name,
    email,
    password,
    role,
    roleLabel: role === 'super_admin' ? 'Super Administrator' : 'Regular Administrator',
    createdAt: new Date().toISOString().split('T')[0],
    status: 'active'
  };

  admins.push(newAdmin);
  saveAdminUsers(admins);

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

  if (admin.id === 'ADM-001') {
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

  if (admin.id === 'ADM-001') {
    showAdminToast('Cannot delete the primary Super Administrator account.', 'error');
    return;
  }

  if (!confirm(`Are you sure you want to permanently remove admin account: ${admin.name}?`)) return;

  const filtered = admins.filter(a => a.id !== adminId);
  saveAdminUsers(filtered);

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
  if (projectEditId) projectEditId.value = '';
  if (resourceEditId) resourceEditId.value = '';
  resetResourceDropzone();
  resetProjectDropzone();
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

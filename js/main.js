// ========================================
// Nigeria Civil Service Youths Forum (ANYCS)
// Main JavaScript & Interactive Controllers
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initDropdowns();
  initMobileMenu();
  initScrollAnimations();
  initVisualSwitcher();
  initInteractiveNigeriaMap();
  initAuthModal();
  initPrivacyModal();
  initFaqAccordion();
  initProjectFilters();
  initTabs();
  initCategorySwitch();
  initForms();
  populateStateDropdowns();
  initDynamicProjects();
  initProjectGalleryModal();
  initDynamicResources();
});

// ---- Navbar scroll effect & active page highlighting ----
function initNavbar() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  const handleScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  // Active link highlighting
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  
  document.querySelectorAll('.navbar__link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  // Highlight parent dropdown if child is active
  document.querySelectorAll('.navbar__dropdown').forEach(dropdown => {
    const subLinks = dropdown.querySelectorAll('.dropdown-link');
    subLinks.forEach(sub => {
      const href = sub.getAttribute('href') || '';
      const page = href.split('#')[0];
      if (page && (page === currentPath || (currentPath === '' && page === 'index.html'))) {
        const toggle = dropdown.querySelector('.navbar__dropdown-toggle');
        if (toggle) toggle.classList.add('active');
      }
    });
  });
}

// ---- Accessible Dropdown Menus ----
function initDropdowns() {
  const dropdowns = document.querySelectorAll('.navbar__dropdown');

  dropdowns.forEach(dropdown => {
    const toggle = dropdown.querySelector('.navbar__dropdown-toggle');
    const menu = dropdown.querySelector('.navbar__dropdown-menu');
    if (!toggle || !menu) return;

    // Mobile / click toggle
    toggle.addEventListener('click', (e) => {
      // In mobile view, toggle accordion
      if (window.innerWidth <= 991) {
        e.preventDefault();
        const isOpen = dropdown.classList.contains('open');
        // close other open dropdowns in mobile nav
        dropdowns.forEach(d => {
          if (d !== dropdown) {
            d.classList.remove('open');
            const otherToggle = d.querySelector('.navbar__dropdown-toggle');
            if (otherToggle) otherToggle.setAttribute('aria-expanded', 'false');
          }
        });
        dropdown.classList.toggle('open', !isOpen);
        toggle.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
      }
    });

    // Keyboard support: Escape closes menu
    dropdown.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        dropdown.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  });

  // Click outside to close dropdowns
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.navbar__dropdown')) {
      dropdowns.forEach(d => {
        d.classList.remove('open');
        const toggle = d.querySelector('.navbar__dropdown-toggle');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
      });
    }
  });
}

// ---- Mobile Menu Drawer ----
function initMobileMenu() {
  const toggle = document.querySelector('.navbar__toggle');
  const links = document.querySelector('.navbar__links');
  const overlay = document.querySelector('.mobile-overlay');
  if (!toggle || !links) return;

  const closeMenu = () => {
    toggle.classList.remove('active');
    links.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
  };

  toggle.addEventListener('click', () => {
    const isOpen = links.classList.contains('open');
    if (isOpen) {
      closeMenu();
    } else {
      toggle.classList.add('active');
      links.classList.add('open');
      if (overlay) overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  });

  if (overlay) {
    overlay.addEventListener('click', closeMenu);
  }

  // Close when clicking simple direct links (not dropdown toggles)
  links.querySelectorAll('.navbar__link:not(.navbar__dropdown-toggle), .dropdown-link').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 991) {
        closeMenu();
      }
    });
  });
}

// ---- Scroll Animations ----
function initScrollAnimations() {
  const elements = document.querySelectorAll('.fade-in');
  if (!elements.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

  elements.forEach(el => observer.observe(el));
}

// ---- Visual Switcher (Nigeria Network Map vs African Youths Photo) ----
function initVisualSwitcher() {
  const buttons = document.querySelectorAll('.visual-switcher__btn');
  if (!buttons.length) return;

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetPaneId = btn.getAttribute('data-target');
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      document.querySelectorAll('.visual-pane').forEach(pane => {
        pane.classList.remove('active');
      });

      const targetPane = document.getElementById(targetPaneId);
      if (targetPane) {
        targetPane.classList.add('active');
      }
    });
  });
}

// ---- Interactive Nigeria Map Nodes Data & Tooltips ----
const stateData = {
  fct: { name: 'Abuja (FCT)', tier: 'Federal Secretariat', members: '1,450+ Youths', track: 'Central Policy Secretariat & Track A Host', status: 'National HQ' },
  lagos: { name: 'Lagos State', tier: 'State & Federal MDAs', members: '890+ Youths', track: 'ICT, Digital Skills & Commerce (Track A)', status: 'Active Chapter' },
  kano: { name: 'Kano State', tier: 'State & LGA Services', members: '640+ Youths', track: 'Public Administration & Capacity Development', status: 'Active Chapter' },
  rivers: { name: 'Rivers State', tier: 'State & Federal MDAs', members: '580+ Youths', track: 'Energy, Environment & Climate Resilience', status: 'Active Chapter' },
  kaduna: { name: 'Kaduna State', tier: 'State & Federal MDAs', members: '520+ Youths', track: 'Civil Service Innovation & Governance', status: 'Active Chapter' },
  enugu: { name: 'Enugu State', tier: 'State & LGA Services', members: '460+ Youths', track: 'Health, Wellbeing & Civic Engagement', status: 'Active Chapter' },
  oyo: { name: 'Oyo State', tier: 'State & Federal MDAs', members: '530+ Youths', track: 'Agriculture & Food Security Initiatives', status: 'Active Chapter' },
  borno: { name: 'Borno State', tier: 'State & LGA Services', members: '320+ Youths', track: 'Education & Community Recovery Programs', status: 'Active Chapter' },
  plateau: { name: 'Plateau State', tier: 'State Services', members: '380+ Youths', track: 'Agro-Allied & Youth Leadership Hub', status: 'Active Chapter' },
  sokoto: { name: 'Sokoto State', tier: 'State & LGA Services', members: '310+ Youths', track: 'Public Welfare & Structured Seminars', status: 'Active Chapter' },
  delta: { name: 'Delta State', tier: 'State & LGA Services', members: '440+ Youths', track: 'Skills Acquisition & ICT Training', status: 'Active Chapter' },
  crossriver: { name: 'Cross River State', tier: 'State & Federal Agencies', members: '360+ Youths', track: 'Eco-Tourism & Environmental Policy', status: 'Active Chapter' }
};

function initInteractiveNigeriaMap() {
  const mapNodes = document.querySelectorAll('.state-node');
  const infoToast = document.getElementById('mapInfoToast');
  if (!mapNodes.length || !infoToast) return;

  mapNodes.forEach(node => {
    node.addEventListener('mouseenter', () => {
      const key = node.getAttribute('data-state');
      const data = stateData[key];
      if (data) {
        infoToast.innerHTML = `<span><strong>${data.name}</strong> • ${data.members} (${data.tier})</span> <span style="color: var(--color-accent); font-weight:700;">${data.status}</span>`;
      }
    });

    node.addEventListener('click', () => {
      const key = node.getAttribute('data-state');
      const data = stateData[key];
      if (data) {
        showToast(`${data.name}: ${data.members} engaged in ${data.track}`);
      }
    });
  });
}

// ---- Sign In Modal & Auth Controls ----
function initAuthModal() {
  const modal = document.getElementById('signInModal');
  if (!modal) return;

  const openModal = (e) => {
    if (e) e.preventDefault();
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    const firstInput = modal.querySelector('input');
    if (firstInput) setTimeout(() => firstInput.focus(), 100);
  };

  const closeModal = () => {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  };

  // Triggers
  document.querySelectorAll('[data-open-signin]').forEach(btn => {
    btn.addEventListener('click', openModal);
  });

  const closeBtn = modal.querySelector('.modal-close-btn');
  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) {
      closeModal();
    }
  });

  // Password toggle
  const toggleBtn = modal.querySelector('.password-toggle-btn');
  const passInput = modal.querySelector('#modalPassword');
  if (toggleBtn && passInput) {
    toggleBtn.addEventListener('click', () => {
      const isPassword = passInput.getAttribute('type') === 'password';
      passInput.setAttribute('type', isPassword ? 'text' : 'password');
      toggleBtn.innerHTML = isPassword
        ? (typeof getIconSvg === 'function' ? getIconSvg('eye-off', { size: 18 }) : '<i data-lucide="eye-off"></i>')
        : (typeof getIconSvg === 'function' ? getIconSvg('eye', { size: 18 }) : '<i data-lucide="eye"></i>');
    });
  }

  // Sign In Form Submission
  const authForm = modal.querySelector('#modalAuthForm');
  if (authForm) {
    authForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const idInput = authForm.querySelector('#modalMemberId');
      const passVal = passInput ? passInput.value : '';

      if (!idInput.value.trim() || !passVal.trim()) {
        showToast('Please enter both your Membership ID and Password.', 'error');
        return;
      }

      showToast(`Welcome back! Verifying credentials for ${idInput.value.trim()}...`, 'success');
      setTimeout(() => {
        closeModal();
        showToast('Verification successful. Member session initialized.', 'success');
      }, 1000);
    });
  }

  // Forgot password flow inside modal
  const forgotBtn = modal.querySelector('#forgotPasswordLink');
  const forgotSection = modal.querySelector('#forgotPasswordSection');
  const authMainSection = modal.querySelector('#authMainSection');
  const backToSignIn = modal.querySelector('#backToSignInBtn');

  if (forgotBtn && forgotSection && authMainSection) {
    forgotBtn.addEventListener('click', (e) => {
      e.preventDefault();
      authMainSection.style.display = 'none';
      forgotSection.style.display = 'block';
    });
  }

  if (backToSignIn && forgotSection && authMainSection) {
    backToSignIn.addEventListener('click', (e) => {
      e.preventDefault();
      forgotSection.style.display = 'none';
      authMainSection.style.display = 'block';
    });
  }

  const forgotForm = modal.querySelector('#forgotPasswordForm');
  if (forgotForm) {
    forgotForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const emailField = forgotForm.querySelector('#resetEmail');
      if (emailField && emailField.value.trim()) {
        showToast(`Password reset link sent to ${emailField.value.trim()}`, 'success');
        forgotSection.style.display = 'none';
        authMainSection.style.display = 'block';
      }
    });
  }
}

// ---- Privacy Notice Modal Controller ----
function initPrivacyModal() {
  const modal = document.getElementById('privacyModal');
  if (!modal) return;

  const openModal = (e) => {
    if (e) e.preventDefault();
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  const closeModal = (e) => {
    if (e) e.preventDefault();
    modal.classList.remove('open');
    document.body.style.overflow = '';
  };

  document.querySelectorAll('[data-open-privacy], .privacy-modal-trigger').forEach(trigger => {
    trigger.addEventListener('click', openModal);
  });

  const closeBtns = modal.querySelectorAll('.modal-close-btn, [data-close-privacy]');
  closeBtns.forEach(btn => {
    btn.addEventListener('click', closeModal);
  });

  const consentAgreeBtn = modal.querySelector('#privacyModalAgreeBtn');
  if (consentAgreeBtn) {
    consentAgreeBtn.addEventListener('click', () => {
      const checkbox = document.getElementById('consentPrivacy');
      if (checkbox) {
        checkbox.checked = true;
      }
      closeModal();
      showToast('Privacy Notice acknowledged and consent marked.', 'success');
    });
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) {
      closeModal();
    }
  });
}

// ---- FAQs Accordion ----
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');
  if (!faqItems.length) return;

  faqItems.forEach(item => {
    const questionBtn = item.querySelector('.faq-question');
    if (!questionBtn) return;

    questionBtn.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      faqItems.forEach(i => i.classList.remove('open'));
      if (!isOpen) {
        item.classList.add('open');
      }
    });
  });
}

// ---- Project Sector Filters ----
function initProjectFilters() {
  const filterBtns = document.querySelectorAll('.sector-filter-btn');
  const cards = document.querySelectorAll('.sector-card');
  if (!filterBtns.length || !cards.length) return;

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.getAttribute('data-filter');
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      cards.forEach(card => {
        if (filter === 'all' || card.getAttribute('data-sector') === filter) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
}

// ---- Generic Tab Controller ----
function initTabs() {
  const tabButtons = document.querySelectorAll('.tab');
  if (!tabButtons.length) return;

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });

      const targetContent = document.getElementById(target);
      if (targetContent) targetContent.classList.add('active');
    });
  });
}

// ---- Form Validations ----
function initForms() {
  const memberForm = document.getElementById('membershipForm');
  if (memberForm) {
    memberForm.addEventListener('submit', handleMembershipSubmit);
  }

  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', handleContactSubmit);
  }

  const consentBoxes = document.querySelectorAll('.consent-box input[type="checkbox"]');
  consentBoxes.forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) {
        const box = cb.closest('.consent-box');
        if (box) box.classList.remove('error');
      }
    });
  });
}

// ---- Membership Category Dynamic Switcher ----
function initCategorySwitch() {
  const memberForm = document.getElementById('membershipForm');
  if (!memberForm) return;

  const radios = memberForm.querySelectorAll('input[name="memberType"]');
  const fullFields = document.getElementById('fullMemberFields');
  const associateFields = document.getElementById('associateMemberFields');
  const stepNum = document.getElementById('portalSecurityStepNum');
  const criteriaText = document.getElementById('criteriaCheckboxLabel');
  const submitBtn = document.getElementById('submitRegBtn');
  const cardFull = document.getElementById('cardMemberFull');
  const cardAssociate = document.getElementById('cardMemberAssociate');

  function updateCategory(type) {
    const isAssociate = type === 'associate';

    if (isAssociate) {
      if (fullFields) {
        fullFields.style.display = 'none';
        fullFields.querySelectorAll('input, select').forEach(el => {
          el.disabled = true;
          el.classList.remove('error');
        });
      }
      if (associateFields) {
        associateFields.style.display = 'block';
        associateFields.querySelectorAll('input, select').forEach(el => {
          el.disabled = false;
        });
        const assocInput = document.getElementById('associateMemberId');
        if (assocInput) assocInput.required = true;
      }

      if (stepNum) stepNum.textContent = '3';
      if (criteriaText) {
        criteriaText.textContent = 'I confirm that I am enrolling under the Associate / Alumni Member category (after 35 years of age), and that my provided Membership ID or civil service record is authentic.';
      }
      if (submitBtn) submitBtn.textContent = 'Submit Application';

      if (cardFull) {
        cardFull.style.borderColor = 'rgba(15, 69, 48, 0.15)';
        cardFull.style.background = 'var(--color-bg-page)';
      }
      if (cardAssociate) {
        cardAssociate.style.borderColor = 'var(--color-primary)';
        cardAssociate.style.background = 'rgba(15, 69, 48, 0.05)';
      }
    } else {
      if (fullFields) {
        fullFields.style.display = 'block';
        fullFields.querySelectorAll('input, select').forEach(el => {
          el.disabled = false;
        });
      }
      if (associateFields) {
        associateFields.style.display = 'none';
        associateFields.querySelectorAll('input, select').forEach(el => {
          el.disabled = true;
          el.classList.remove('error');
        });
        const assocInput = document.getElementById('associateMemberId');
        if (assocInput) assocInput.required = false;
      }

      if (stepNum) stepNum.textContent = '4';
      if (criteriaText) {
        criteriaText.textContent = 'I confirm that I meet the age and serving civil servant criteria, and that all information provided is accurate and verifiable by my MDA.';
      }
      if (submitBtn) submitBtn.textContent = 'Submit Registration';

      if (cardFull) {
        cardFull.style.borderColor = 'var(--color-primary)';
        cardFull.style.background = 'rgba(15, 69, 48, 0.05)';
      }
      if (cardAssociate) {
        cardAssociate.style.borderColor = 'rgba(15, 69, 48, 0.15)';
        cardAssociate.style.background = 'var(--color-bg-page)';
      }
    }
  }

  radios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      updateCategory(e.target.value);
    });
  });

  // Handle external links targeting a specific category (e.g., from classes cards)
  document.querySelectorAll('[data-select-category]').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.getAttribute('data-select-category');
      const targetRadio = memberForm.querySelector(`input[name="memberType"][value="${cat}"]`);
      if (targetRadio) {
        targetRadio.checked = true;
        updateCategory(cat);
      }
    });
  });

  // Initialize on load
  const checked = memberForm.querySelector('input[name="memberType"]:checked');
  if (checked) {
    updateCategory(checked.value);
  }
}

function handleMembershipSubmit(e) {
  e.preventDefault();
  const form = e.target;

  form.querySelectorAll('.form-input, .form-select').forEach(input => {
    input.classList.remove('error');
  });
  form.querySelectorAll('.consent-box').forEach(box => {
    box.classList.remove('error');
  });

  let isValid = true;
  const memberType = form.querySelector('input[name="memberType"]:checked')?.value || 'full';

  // Validate active non-disabled required inputs
  form.querySelectorAll('[required]:not(:disabled)').forEach(input => {
    if (input.type === 'checkbox') {
      if (!input.checked) {
        const box = input.closest('.consent-box');
        if (box) box.classList.add('error');
        isValid = false;
      }
    } else if (!input.value.trim()) {
      input.classList.add('error');
      isValid = false;
    }
  });

  // Category specific checks
  if (memberType === 'full') {
    // Verify age between 18 and 35 per Forum criteria
    const dobInput = form.querySelector('input[type="date"]');
    if (dobInput && dobInput.value) {
      const dob = new Date(dobInput.value);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      if (age < 18 || age > 35) {
        showToast('Full Membership requires serving civil servants aged 18 to 35 years. Please select the Associate Member category if over 35.', 'error');
        dobInput.classList.add('error');
        isValid = false;
      }
    }

    // Email validation
    const emailField = form.querySelector('input[type="email"]');
    if (emailField && emailField.value.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailField.value.trim())) {
        emailField.classList.add('error');
        isValid = false;
      }
    }
  } else if (memberType === 'associate') {
    const assocInput = form.querySelector('#associateMemberId');
    if (assocInput && !assocInput.value.trim()) {
      assocInput.classList.add('error');
      isValid = false;
    }
  }

  // Password confirmation check
  const pwd = form.querySelector('#password');
  const confirmPwd = form.querySelector('#confirmPassword');
  if (pwd && confirmPwd) {
    if (pwd.value.length < 8) {
      pwd.classList.add('error');
      showToast('Password must be at least 8 characters long.', 'error');
      isValid = false;
    } else if (pwd.value !== confirmPwd.value) {
      confirmPwd.classList.add('error');
      showToast('Passwords do not match. Please re-enter your password.', 'error');
      isValid = false;
    }
  }

  if (!isValid) {
    showToast('Please check the required fields and verify your credentials.', 'error');
    return;
  }

  // Helper to generate unique Member ID format: NCSYF-[Year of Birth]-[Unique 4-digit number]
  function generateUniqueMemberId(dob, age, existingMembers = []) {
    let birthYear = '1998';
    if (dob && typeof dob === 'string' && dob.includes('-')) {
      const parts = dob.split('-');
      if (parts[0] && parts[0].length === 4) {
        birthYear = parts[0];
      }
    } else if (age) {
      birthYear = String(new Date().getFullYear() - parseInt(age, 10));
    }

    let maxNum = 0;
    existingMembers.forEach(m => {
      const mId = m.memberId || m.id || '';
      const match = mId.match(new RegExp(`^NCSYF-${birthYear}-(\\d+)$`));
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });

    const nextSeq = String(maxNum + 1).padStart(4, '0');
    return `NCSYF-${birthYear}-${nextSeq}`;
  }

  // Synchronize new registration to localStorage so it instantly appears in the Admin Portal (/admin)
  try {
    const now = new Date();
    const dateStr = now.toISOString().replace('T', ' ').substring(0, 19);
    const randomSuffix = Math.floor(100 + Math.random() * 900);

    const STORAGE_KEY_MEMBERS = 'ncsyf_registered_members';
    const existing = localStorage.getItem(STORAGE_KEY_MEMBERS);
    let membersList = [];
    if (existing) {
      try {
        membersList = JSON.parse(existing);
        if (!Array.isArray(membersList)) membersList = [];
      } catch (err) {
        membersList = [];
      }
    }

    let newMemberRecord;

    if (memberType === 'associate') {
      const assocStaffId = form.querySelector('#associateMemberId')?.value.trim() || `ANYCS-ASC-${randomSuffix}`;
      const assignedMemberId = generateUniqueMemberId(null, 38, membersList);

      newMemberRecord = {
        id: assignedMemberId,
        memberId: assignedMemberId,
        firstName: 'Associate',
        lastName: `Member (${assocStaffId})`,
        category: 'associate',
        memberTypeLabel: 'Associate Member (After 35 yrs / Alumni)',
        dob: 'Over 35 yrs',
        age: 38,
        gender: 'Serving / Senior Officer',
        phone: 'Portal Access Requested',
        email: assocStaffId.toLowerCase().replace(/[^a-z0-9]/g, '') + '@civilservice.gov.ng',
        tier: 'associate',
        tierLabel: 'Associate / Alumni Roster',
        mda: 'Civil Service Alumni / Senior Service Officer',
        stateChapter: 'National Secretariat',
        staffId: assocStaffId,
        docType: 'alumni_id',
        docTypeLabel: 'Associate / Alumni Membership Credential',
        status: 'pending',
        registeredAt: dateStr
      };
    } else {
      const fName = form.querySelector('#firstName')?.value.trim() || 'Serving';
      const lName = form.querySelector('#lastName')?.value.trim() || 'Officer';
      const dobVal = form.querySelector('#dob')?.value || '';
      let calcAge = 28;
      if (dobVal) {
        const birth = new Date(dobVal);
        calcAge = now.getFullYear() - birth.getFullYear();
      }
      const genderVal = form.querySelector('#gender')?.value || 'N/A';
      const phoneVal = form.querySelector('#phone')?.value.trim() || 'N/A';
      const emailVal = form.querySelector('#email')?.value.trim() || 'N/A';
      const tierVal = form.querySelector('#tierOfGovernment')?.value || 'federal';
      const tierLabels = {
        federal: 'Federal Government MDA',
        state: 'State Government MDA',
        lga: 'Local Government Council'
      };
      const mdaVal = form.querySelector('#mdaName')?.value.trim() || 'Federal MDA';
      const stateVal = form.querySelector('#stateChapter')?.value || 'FCT Abuja';
      const staffIdVal = form.querySelector('#staffId')?.value.trim() || `CIV-${randomSuffix}`;

      const assignedMemberId = generateUniqueMemberId(dobVal, calcAge, membersList);

      newMemberRecord = {
        id: assignedMemberId,
        memberId: assignedMemberId,
        firstName: fName,
        lastName: lName,
        category: 'full',
        memberTypeLabel: 'Full Member (18–35 yrs)',
        dob: dobVal,
        age: calcAge,
        gender: genderVal,
        phone: phoneVal,
        email: emailVal,
        tier: tierVal,
        tierLabel: tierLabels[tierVal] || 'Public Service',
        mda: mdaVal,
        stateChapter: stateVal,
        staffId: staffIdVal,
        status: 'pending',
        registeredAt: dateStr
      };
    }

    // Check if applicant previously had an application (matching email or staffId)
    const prevIndex = membersList.findIndex(m => 
      (m.email && newMemberRecord.email && m.email.toLowerCase() === newMemberRecord.email.toLowerCase()) ||
      (m.staffId && newMemberRecord.staffId && m.staffId.toLowerCase() === newMemberRecord.staffId.toLowerCase())
    );

    let isReapplication = false;
    if (prevIndex !== -1 && membersList[prevIndex].status === 'disapproved') {
      isReapplication = true;
      newMemberRecord.id = membersList[prevIndex].id; // Retain original ID
      newMemberRecord.memberId = membersList[prevIndex].memberId || membersList[prevIndex].id;
      newMemberRecord.reappliedAt = dateStr;
      newMemberRecord.previousDisapproval = membersList[prevIndex].disapprovedReason || 'Previous verification issue';
      membersList[prevIndex] = newMemberRecord;
    } else {
      membersList.unshift(newMemberRecord);
    }

    localStorage.setItem(STORAGE_KEY_MEMBERS, JSON.stringify(membersList));

    const finalMemberId = newMemberRecord.memberId;
    if (isReapplication) {
      showToast(`Corrected reapplication submitted for Member ID: ${finalMemberId}. Your updated credentials are being reviewed by the Secretariat.`, 'success');
    } else if (memberType === 'associate') {
      showToast(`Associate Application submitted! Your Member ID is: ${finalMemberId} (distinct from Staff ID: ${newMemberRecord.staffId}).`, 'success');
    } else {
      showToast(`Full Membership application submitted! Your unique Member ID is: ${finalMemberId} (MDA Staff ID: ${newMemberRecord.staffId}). Keep this safe!`, 'success');
    }
  } catch (storageErr) {
    console.warn('Could not sync registration to local store:', storageErr);
    showToast('Application submitted successfully! Your credentials are being reviewed by the Secretariat.', 'success');
  }

  form.reset();

  // Reset to default Full Member state
  const defaultRadio = form.querySelector('input[name="memberType"][value="full"]');
  if (defaultRadio) {
    defaultRadio.checked = true;
    defaultRadio.dispatchEvent(new Event('change'));
  }
}

function handleContactSubmit(e) {
  e.preventDefault();
  const form = e.target;

  form.querySelectorAll('.form-input, .form-textarea').forEach(input => {
    input.classList.remove('error');
  });

  let isValid = true;
  form.querySelectorAll('[required]').forEach(input => {
    if (!input.value.trim()) {
      input.classList.add('error');
      isValid = false;
    }
  });

  if (!isValid) {
    showToast('Please fill in all required fields.', 'error');
    return;
  }

  showToast('Message sent successfully to the Secretariat. We will respond promptly.', 'success');
  form.reset();
}

// ---- Toast Alert Notification ----
function showToast(message, type = 'success') {
  const existingToast = document.querySelector('.toast');
  if (existingToast) existingToast.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.background = type === 'error' ? '#DC2626' : '#0F4530';
  toast.style.border = '1px solid ' + (type === 'error' ? '#EF4444' : '#E9CE74');
  toast.style.color = '#FFFFFF';
  
  const iconHtml = typeof getIconSvg === 'function'
    ? getIconSvg(type === 'error' ? 'alert-triangle' : 'check', { size: 18 })
    : '';

  toast.innerHTML = `<span class="toast__icon">${iconHtml}</span><span>${message}</span>`;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

// ---- 36 States + FCT Array ----
const nigeriaStates = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT Abuja', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
  'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau',
  'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
];

function populateStateDropdowns() {
  document.querySelectorAll('.state-select').forEach(select => {
    if (select.children.length <= 1) {
      nigeriaStates.forEach(state => {
        const option = document.createElement('option');
        option.value = state;
        option.textContent = state;
        select.appendChild(option);
      });
    }
  });
}

// ==========================================================================
// DYNAMIC PROJECTS & PHOTO GALLERY LIGHTBOX CONTROLLER
// ==========================================================================
const DEFAULT_SITE_PROJECTS = [
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

let activeGalleryImages = [];
let activeGalleryIndex = 0;

function getSiteProjects() {
  const data = localStorage.getItem('ncsyf_admin_projects');
  if (data) {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch (e) {}
  }
  return DEFAULT_SITE_PROJECTS;
}

function initDynamicProjects() {
  const grid = document.getElementById('dynamicProjectsGrid');
  if (!grid) return;

  const projects = getSiteProjects();

  grid.innerHTML = projects.map(p => {
    const hasImages = p.images && Array.isArray(p.images) && p.images.length > 0;
    const coverImg = hasImages ? p.images[0] : 'images/project_digital_office.jpg';
    const imgCount = hasImages ? p.images.length : 1;
    const isActive = p.status === 'active';
    const statusClass = isActive ? 'active' : (p.status === 'completed' ? 'completed' : 'planning');
    const statusText = isActive ? '● Active' : (p.status === 'completed' ? '● Completed' : '● Planning');

    return `
      <div class="project-card-interactive fade-in" data-project-id="${p.id}" tabindex="0" role="button" aria-label="View project ${p.title}">
        <div class="project-card-interactive__media">
          <img src="${coverImg}" alt="${p.title}">
          <div class="project-card-interactive__badge-count">
            ${typeof getIconSvg === 'function' ? getIconSvg('image', { size: 13 }) : '📷'}
            <span>${imgCount} photo${imgCount === 1 ? '' : 's'}</span>
          </div>
        </div>
        <div class="project-card-interactive__body">
          <div class="project-card-interactive__header">
            <span class="project-card-interactive__sector">${p.sector || 'Public Service'}</span>
            <span class="project-card-interactive__status ${statusClass}">${statusText}</span>
          </div>
          <h3 class="project-card-interactive__title">${p.title}</h3>
          <div class="project-card-interactive__agency">
            ${typeof getIconSvg === 'function' ? getIconSvg('landmark', { size: 14 }) : '🏛️'}
            <span>${p.leadMda || 'National Secretariat'}</span>
          </div>
          <p class="project-card-interactive__desc">${p.description}</p>
          <div class="project-card-interactive__footer">
            <span style="font-size: var(--fs-xs); color: var(--color-gray); font-weight: 600;">
              ${p.targetBeneficiaries || 'Young Public Servants'}
            </span>
            <button type="button" class="btn btn--outline btn--sm" style="pointer-events: none;">
              <span>View Gallery &amp; Details →</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Wire click to open gallery modal
  grid.querySelectorAll('.project-card-interactive').forEach(card => {
    card.addEventListener('click', () => {
      const pid = card.getAttribute('data-project-id');
      openProjectDetailModal(pid);
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const pid = card.getAttribute('data-project-id');
        openProjectDetailModal(pid);
      }
    });
  });

  if (typeof refreshIcons === 'function') {
    refreshIcons(grid);
  }
}

function openProjectDetailModal(projectId) {
  const modal = document.getElementById('projectDetailModal');
  if (!modal) return;

  const projects = getSiteProjects();
  let p = projects.find(item => item.id === projectId);

  // If not found in dynamic projects (e.g. from static sector cards), create a fallback representation
  if (!p) {
    p = {
      id: projectId,
      title: 'National Civil Service Track Initiative',
      sector: 'Public Sector Modernization',
      leadMda: 'National Secretariat & Participating State Chapters',
      status: 'active',
      statusLabel: 'Active Implementation',
      targetBeneficiaries: 'Young Civil Servants Nationwide',
      budget: 'Federal / State Counterpart Funding',
      dateAdded: '2026',
      description: 'Nationwide collaborative initiative mobilizing young public servants across federal, state and LGA agencies to implement key structural reforms.',
      images: [
        'images/project_digital_office.jpg',
        'images/project_agritech.jpg',
        'images/project_healthcare.jpg',
        'images/project_governance.jpg'
      ]
    };
  }

  // Set text fields
  const elHeading = document.getElementById('projectModalHeading');
  const elSector = document.getElementById('modalProjectSector');
  const elStatus = document.getElementById('modalProjectStatus');
  const elMda = document.getElementById('modalProjectMda');
  const elBeneficiaries = document.getElementById('modalProjectBeneficiaries');
  const elBudget = document.getElementById('modalProjectBudget');
  const elDate = document.getElementById('modalProjectDate');
  const elDesc = document.getElementById('modalProjectDesc');

  if (elHeading) elHeading.textContent = p.title;
  if (elSector) elSector.textContent = p.sector || 'Public Service';
  if (elStatus) {
    const isActive = p.status === 'active';
    elStatus.textContent = isActive ? '● Active Implementation' : (p.status === 'completed' ? '● Completed' : '● Planning & Review');
    elStatus.className = `project-card-interactive__status ${isActive ? 'active' : (p.status === 'completed' ? 'completed' : 'planning')}`;
  }
  if (elMda) elMda.textContent = p.leadMda || 'National Secretariat';
  if (elBeneficiaries) elBeneficiaries.textContent = p.targetBeneficiaries || 'Young Public Servants';
  if (elBudget) elBudget.textContent = p.budget || 'Government Allocation';
  if (elDate) elDate.textContent = p.dateAdded || 'September 2026';
  if (elDesc) elDesc.textContent = p.description || '';

  // Setup attached doc
  const attachedBox = document.getElementById('modalProjectAttachedBox');
  const docName = document.getElementById('modalProjectDocName');
  const docSize = document.getElementById('modalProjectDocSize');
  const btnDownloadDoc = document.getElementById('btnDownloadProjectCharter');

  if (attachedBox && btnDownloadDoc) {
    if (p.attachedDocName) {
      if (docName) docName.textContent = p.attachedDocName;
      if (docSize) docSize.textContent = `Official Project Charter • ${p.attachedDocSize || 'PDF'}`;
    } else {
      if (docName) docName.textContent = `Official ${p.title} Charter & Concept Note`;
      if (docSize) docSize.textContent = `National Secretariat Verified Document • PDF (2.8 MB)`;
    }

    btnDownloadDoc.onclick = () => {
      if (p.attachedDocData) {
        const a = document.createElement('a');
        a.href = p.attachedDocData;
        a.download = p.attachedDocName || 'project_charter.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        const text = `=====================================================\nNIGERIA CIVIL SERVICE YOUTHS' FORUM (NCSYF)\nProject Charter: ${p.title}\nSector: ${p.sector}\nLead MDA: ${p.leadMda}\nTarget: ${p.targetBeneficiaries}\nBudget: ${p.budget}\n=====================================================\n\n${p.description}\n\nOfficially chartered for nationwide implementation.`;
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${p.title.replace(/[^a-zA-Z0-9]/g, '_')}_Charter.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      showToast(`Downloading: ${p.title} Charter`);
    };
  }

  // Setup Gallery
  activeGalleryImages = (p.images && Array.isArray(p.images) && p.images.length > 0)
    ? p.images
    : ['images/project_digital_office.jpg'];
  activeGalleryIndex = 0;

  renderGalleryView();

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function renderGalleryView() {
  const mainImg = document.getElementById('projectGalleryMainImg');
  const counter = document.getElementById('projectGalleryCounter');
  const thumbsContainer = document.getElementById('projectGalleryThumbs');
  const prevBtn = document.getElementById('btnGalleryPrev');
  const nextBtn = document.getElementById('btnGalleryNext');

  if (!activeGalleryImages.length) return;

  if (activeGalleryIndex < 0) activeGalleryIndex = activeGalleryImages.length - 1;
  if (activeGalleryIndex >= activeGalleryImages.length) activeGalleryIndex = 0;

  if (mainImg) {
    mainImg.style.opacity = '0.5';
    mainImg.src = activeGalleryImages[activeGalleryIndex];
    setTimeout(() => { mainImg.style.opacity = '1'; }, 100);
  }

  if (counter) {
    counter.textContent = `Photo ${activeGalleryIndex + 1} of ${activeGalleryImages.length}`;
  }

  if (prevBtn && nextBtn) {
    const showNav = activeGalleryImages.length > 1;
    prevBtn.style.display = showNav ? 'flex' : 'none';
    nextBtn.style.display = showNav ? 'flex' : 'none';
  }

  if (thumbsContainer) {
    if (activeGalleryImages.length <= 1) {
      thumbsContainer.style.display = 'none';
      thumbsContainer.innerHTML = '';
    } else {
      thumbsContainer.style.display = 'flex';
      thumbsContainer.innerHTML = activeGalleryImages.map((src, idx) => `
        <div class="project-thumb-item ${idx === activeGalleryIndex ? 'active' : ''}" data-thumb-index="${idx}">
          <img src="${src}" alt="Thumbnail ${idx + 1}">
        </div>
      `).join('');

      thumbsContainer.querySelectorAll('.project-thumb-item').forEach(thumb => {
        thumb.addEventListener('click', () => {
          activeGalleryIndex = parseInt(thumb.getAttribute('data-thumb-index'), 10);
          renderGalleryView();
        });
      });
    }
  }
}

function initProjectGalleryModal() {
  const modal = document.getElementById('projectDetailModal');
  const closeBtn = document.getElementById('btnCloseProjectModal');
  const prevBtn = document.getElementById('btnGalleryPrev');
  const nextBtn = document.getElementById('btnGalleryNext');

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    });
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      activeGalleryIndex--;
      renderGalleryView();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      activeGalleryIndex++;
      renderGalleryView();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (!modal || !modal.classList.contains('active')) return;
    if (e.key === 'Escape') {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    } else if (e.key === 'ArrowLeft') {
      activeGalleryIndex--;
      renderGalleryView();
    } else if (e.key === 'ArrowRight') {
      activeGalleryIndex++;
      renderGalleryView();
    }
  });

  // Also bind to static state project cards on projects.html
  document.querySelectorAll('#track-b .card').forEach((card, idx) => {
    card.style.cursor = 'pointer';
    card.title = 'Click to view full project details & photo gallery';
    card.addEventListener('click', () => {
      openProjectDetailModal('STATE-' + (idx + 1));
    });
  });
}

// ==========================================================================
// DYNAMIC RESOURCES SYNCHRONIZATION ON PUBLIC E-LIBRARY
// ==========================================================================
const DEFAULT_SITE_RESOURCES = [
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

function getSiteResources() {
  const data = localStorage.getItem('ncsyf_admin_resources');
  if (data) {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch (e) {}
  }
  return DEFAULT_SITE_RESOURCES;
}

function initDynamicResources() {
  const grid = document.getElementById('dynamicResourcesGrid');
  if (!grid) return;

  try {
    const resources = getSiteResources();
    if (!Array.isArray(resources) || !resources.length) return;

    grid.innerHTML = resources.map(r => {
      const hasImages = r.images && Array.isArray(r.images) && r.images.length > 0;
      const fileType = (r.fileType || 'PDF').toUpperCase();
      const fileSize = r.fileSize || '2 MB';

      let iconColor = '#DC2626';
      if (['XLS', 'XLSX'].includes(fileType)) iconColor = '#15803D';
      else if (['DOC', 'DOCX'].includes(fileType)) iconColor = '#2563EB';
      else if (['PPT', 'PPTX'].includes(fileType)) iconColor = '#D97706';

      return `
        <div class="card card--bordered resource-card-modern fade-in" style="background: var(--color-white);">
          <div style="display: flex; gap: var(--space-lg); align-items: flex-start;">
            <div style="color: ${iconColor}; flex-shrink: 0;">
              ${typeof getIconSvg === 'function' ? getIconSvg('file-text', { size: 32 }) : '📄'}
            </div>
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
                <span style="font-size: var(--fs-xs); font-weight: 800; color: var(--color-primary); text-transform: uppercase;">
                  ${r.category || 'Publication'} • ${fileType}
                </span>
                ${hasImages ? `
                  <span style="font-size: var(--fs-xs); color: var(--color-accent-dark); font-weight: 700;">
                    📷 ${r.images.length} photo${r.images.length === 1 ? '' : 's'}
                  </span>
                ` : ''}
              </div>
              <h3 style="font-size: var(--fs-lg); color: var(--color-dark); margin: 4px 0 var(--space-sm);">
                ${r.title}
              </h3>
              <p style="font-size: var(--fs-sm); color: var(--color-dark-gray); line-height: 1.7; margin-bottom: var(--space-xs);">
                ${r.description || 'Official publication issued by the Nigeria Civil Service Youths\' Forum.'}
              </p>
              <div style="font-size: var(--fs-xs); color: var(--color-gray); margin-bottom: var(--space-sm);">
                Authority: <strong>${r.publishingMda || 'National Secretariat'}</strong> • Downloads: ${r.downloads || 0}
              </div>
              <button type="button" class="btn btn--primary btn--sm" onclick="downloadPublicResource('${r.id}')">
                ${typeof getIconSvg === 'function' ? getIconSvg('download', { size: 14 }) : '⬇️'}
                <span>Download ${fileType} (${fileSize})</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    if (typeof refreshIcons === 'function') {
      refreshIcons(grid);
    }
  } catch (e) {
    console.warn('Error rendering dynamic resources:', e);
  }
}

window.downloadPublicResource = function(resourceId) {
  const data = localStorage.getItem('ncsyf_admin_resources');
  if (!data) {
    showToast('Downloading document...');
    return;
  }
  try {
    const resources = JSON.parse(data);
    const r = resources.find(item => item.id === resourceId);
    if (!r) {
      showToast('Downloading document...');
      return;
    }

    r.downloads = (r.downloads || 0) + 1;
    localStorage.setItem('ncsyf_admin_resources', JSON.stringify(resources));

    if (r.fileData) {
      const a = document.createElement('a');
      a.href = r.fileData;
      a.download = r.fileName || `${r.title.replace(/[^a-zA-Z0-9]/g, '_')}.${(r.fileType || 'pdf').toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      const text = `=====================================================\nNIGERIA CIVIL SERVICE YOUTHS' FORUM (NCSYF)\nOfficial Document: ${r.title}\nCategory: ${r.category}\nAuthority: ${r.publishingMda}\nFormat: ${r.fileType || 'PDF'}\n=====================================================\n\n${r.description}\n\nDocument verified pursuant to official Civil Service guidelines.`;
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${r.title.replace(/[^a-zA-Z0-9]/g, '_')}.${(r.fileType || 'pdf').toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    showToast(`Downloading: ${r.title}`);
  } catch (e) {
    showToast('Downloading document...');
  }
};

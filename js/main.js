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
  initForms();
  populateStateDropdowns();
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
        showToast(`📍 ${data.name}: ${data.members} engaged in ${data.track}`);
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
      toggleBtn.textContent = isPassword ? '🙈' : '👁️';
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
        showToast('✅ Verification successful. Member session initialized.', 'success');
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

  // Validate required inputs
  form.querySelectorAll('[required]').forEach(input => {
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
    const memberType = form.querySelector('#memberType') ? form.querySelector('#memberType').value : '';
    if (memberType === 'full' && (age < 18 || age > 35)) {
      showToast('⚠️ Full Membership requires serving civil servants aged 18 to 35 years. Consider Associate/Alumni membership.', 'error');
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

  if (!isValid) {
    showToast('Please check the required fields and verify your eligibility criteria.', 'error');
    return;
  }

  showToast('🎉 Application submitted successfully! Your credentials and MDA verification are being reviewed by the Secretariat.', 'success');
  form.reset();
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

  showToast('✉️ Message sent successfully to the Secretariat. We will respond promptly.', 'success');
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
  toast.textContent = message;
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

/**
 * NCSYF Governance Synchronization & Rendering Module
 * Powers public governance.html and synchronizes with Admin Dashboard uploads.
 */
(function() {
  'use strict';

  const DEFAULT_GOVERNANCE_DATA = {
    patrons: [
      { id: 'patron_0', title: 'Grand Patron', name: 'Grand Patron', photo: '', about: 'Distinguished elder statesman guiding national public sector vision.' },
      { id: 'patron_1', title: 'Patron', name: 'Patron', photo: '', about: 'Seasoned public administrator advancing institutional excellence.' },
      { id: 'patron_2', title: 'Patron', name: 'Patron', photo: '', about: 'Senior governance mentor committed to civil service modernization.' }
    ],
    matrons: [
      { id: 'matron_0', title: 'Grand Matron', name: 'Grand Matron', photo: '', about: 'Accomplished female public leader championing youth mentorship.' },
      { id: 'matron_1', title: 'Matron', name: 'Matron', photo: '', about: 'Distinguished legal and administrative authority.' },
      { id: 'matron_2', title: 'Matron', name: 'Matron', photo: '', about: 'Inspiring policy mentor fostering career growth for serving officers.' }
    ],
    nec: [
      { id: 'nec_0', title: 'National President', name: 'National President', role: 'Chief Executive & Strategic Lead', photo: '', about: 'Executive leadership across the 3 tiers of civil service.' },
      { id: 'nec_1', title: 'Deputy National President', name: 'Deputy National President', role: 'Inter-Tier Relations', photo: '', about: 'Coordination between Federal, State, and LGA bodies.' },
      { id: 'nec_2', title: 'National Secretary', name: 'National Secretary', role: 'Executive Secretariat & Records', photo: '', about: 'Secretariat records, statutory correspondences, and registry.' },
      { id: 'nec_3', title: 'Financial Secretary', name: 'Financial Secretary', role: 'Audit & Accounts', photo: '', about: 'Financial governance, audits, and program subventions.' },
      { id: 'nec_4', title: 'Legal Adviser', name: 'Legal Adviser', role: 'Statutory Compliance', photo: '', about: 'Constitutional compliance and public service regulations.' },
      { id: 'nec_5', title: 'Public Relations Officer', name: 'Public Relations Officer', role: 'National Media & Communications', photo: '', about: 'Strategic media briefings and civil service publications.' },
      { id: 'nec_6', title: 'Director of Digital Innovation', name: 'Director of Digital Innovation', role: 'ICT & Portal Infrastructure', photo: '', about: 'Digital portals, membership verification, and civic technology.' },
      { id: 'nec_7', title: 'National Welfare Officer', name: 'National Welfare Officer', role: 'Member Services & Health', photo: '', about: 'Civil servant welfare, career advancement, and wellness programs.' }
    ],
    states: [
      { state: 'Abia', zone: 'South East', coordinator: 'State Coordinator', coordPhoto: '', secretary: 'State Secretary', secPhoto: '', projects: 'Civil Service Digital Records Archive & LGA Youth Desks' },
      { state: 'Adamawa', zone: 'North East', coordinator: 'State Coordinator', coordPhoto: '', secretary: 'State Secretary', secPhoto: '', projects: 'Youth In Public Governance Apprenticeship & Agri-Reform Desk' },
      { state: 'Akwa Ibom', zone: 'South South', coordinator: 'State Coordinator', coordPhoto: '', secretary: 'State Secretary', secPhoto: '', projects: 'Green Public Service & Coastal Environmental Resilience' },
      { state: 'Anambra', zone: 'South East', coordinator: 'State Coordinator', coordPhoto: '', secretary: 'State Secretary', secPhoto: '', projects: 'Commerce & Civic Technology Modernization Taskforce' },
      { state: 'Bauchi', zone: 'North East', coordinator: 'State Coordinator', coordPhoto: '', secretary: 'State Secretary', secPhoto: '', projects: 'Primary Healthcare Civil Administration Support Unit' },
      { state: 'Bayelsa', zone: 'South South', coordinator: 'State Coordinator', coordPhoto: '', secretary: 'State Secretary', secPhoto: '', projects: 'Maritime Civil Officers Training & Waterways Safety Initiative' },
      { state: 'Benue', zone: 'North Central', coordinator: 'State Coordinator', coordPhoto: '', secretary: 'State Secretary', secPhoto: '', projects: 'Agritech Supply Logistics & Rural Civil Servants Exchange' },
      { state: 'Borno', zone: 'North East', coordinator: 'State Coordinator', coordPhoto: '', secretary: 'State Secretary', secPhoto: '', projects: 'Post-Recovery Public Administration Capacity Building' },
      { state: 'Cross River', zone: 'South South', coordinator: 'State Coordinator', coordPhoto: '', secretary: 'State Secretary', secPhoto: '', projects: 'Eco-Tourism Public Facilities Stewardship & Digital Registry' },
      { state: 'Delta', zone: 'South South', coordinator: 'State Coordinator', coordPhoto: '', secretary: 'State Secretary', secPhoto: '', projects: 'Delta Youth In MDAs Civic Innovation Fellowship' },
      { state: 'Ebonyi', zone: 'South East', coordinator: 'State Coordinator', coordPhoto: '', secretary: 'State Secretary', secPhoto: '', projects: 'Agricultural Value Chain & Rural Local Council Governance' },
      { state: 'Edo', zone: 'South South', coordinator: 'State Coordinator', coordPhoto: '', secretary: 'State Secretary', secPhoto: '', projects: 'E-Governance Transformation & Paperless Secretariat Trial' },
      { state: 'Ekiti', zone: 'South West', coordinator: 'State Coordinator', coordPhoto: '', secretary: 'State Secretary', secPhoto: '', projects: 'Knowledge Economy & Public Policy Research Consortium' },
      { state: 'Enugu', zone: 'South East', coordinator: 'State Coordinator', coordPhoto: '', secretary: 'State Secretary', secPhoto: '', projects: 'Coal City Young Administrators Forum & Urban Service Desk' },
      { state: 'FCT (Abuja)', zone: 'North Central', coordinator: 'State Coordinator', coordPhoto: '', secretary: 'State Secretary', secPhoto: '', projects: 'National Secretariat Liaison & Federal Inter-MDA Youth Network' },
      { state: 'Gombe', zone: 'North East', coordinator: 'State Coordinator', coordPhoto: '', secretary: 'State Secretary', secPhoto: '', projects: 'Jewel Public Officers Digital Literacy & Micro-Credentialing' },
      { state: 'Imo', zone: 'South East', coordinator: 'State Coordinator', coordPhoto: '', secretary: 'State Secretary', secPhoto: '', projects: 'Public Sector Productivity Assessment & Young Officers Mentorship' },
      { state: 'Jigawa', zone: 'North West', coordinator: 'State Coordinator', coordPhoto: '', secretary: 'State Secretary', secPhoto: '', projects: 'Solarized LGA Administrative Offices Support Scheme' },
      { state: 'Kaduna', zone: 'North West', coordinator: 'State Coordinator', coordPhoto: '', secretary: 'State Secretary', secPhoto: '', projects: 'Civil Service E-Skills Accelerator & Inter-Agency Coordination' },
      { state: 'Kano', zone: 'North West', coordinator: 'State Coordinator', coordPhoto: '', secretary: 'State Secretary', secPhoto: '', projects: 'Commercial Revenue System Digitization & Youth Workforce Support' },
      { state: 'Katsina', zone: 'North West', coordinator: 'State Coordinator', coordPhoto: '', secretary: 'State Secretary', secPhoto: '', projects: 'Young Civil Servants Agricultural Cooperative Desk' },
      { state: 'Kebbi', zone: 'North West', coordinator: 'State Coordinator', coordPhoto: '', secretary: 'State Secretary', secPhoto: '', projects: 'Border Communities Service Outreach & Agro-Logistics Unit' },
      { state: 'Kogi', zone: 'North Central', coordinator: 'State Coordinator', coordPhoto: '', secretary: 'State Secretary', secPhoto: '', projects: 'Confluence Youth Public Service Leadership Academy' },
      { state: 'Kwara', zone: 'North Central', coordinator: 'State Coordinator', coordPhoto: '', secretary: 'State Secretary', secPhoto: '', projects: 'Harmony State Young Administrators Digital Clinic' },
      { state: 'Lagos', zone: 'South West', coordinator: 'State Coordinator', coordPhoto: '', secretary: 'State Secretary', secPhoto: '', projects: 'Megacity Public Transportation Reform & Smart MDA Workstations' },
      { state: 'Nasarawa', zone: 'North Central', coordinator: 'State Coordinator', coordPhoto: '', secretary: 'State Secretary', secPhoto: '', projects: 'Solid Minerals Public Oversight & LGA Environmental Compliance' },
      { state: 'Niger', zone: 'North Central', coordinator: 'State Coordinator', coordPhoto: '', secretary: 'State Secretary', secPhoto: '', projects: 'Hydro-Power Communities Youth Service Volunteer Brigade' },
      { state: 'Ogun', zone: 'South West', coordinator: 'State Coordinator', coordPhoto: '', secretary: 'State Secretary', secPhoto: '', projects: 'Industrial Corridor Civil Administration Excellence Desk' },
      { state: 'Ondo', zone: 'South West', coordinator: 'State Coordinator', coordPhoto: '', secretary: 'State Secretary', secPhoto: '', projects: 'Sunshine State Blue Economy & Forestry Protection Initiative' },
      { state: 'Osun', zone: 'South West', coordinator: 'State Coordinator', coordPhoto: '', secretary: 'State Secretary', secPhoto: '', projects: 'Heritage & Cultural Tourism Public Asset Preservation Unit' },
      { state: 'Oyo', zone: 'South West', coordinator: 'State Coordinator', coordPhoto: '', secretary: 'State Secretary', secPhoto: '', projects: 'Pacesetter Young Bureaucrats Innovation Incubator' },
      { state: 'Plateau', zone: 'North Central', coordinator: 'State Coordinator', coordPhoto: '', secretary: 'State Secretary', secPhoto: '', projects: 'Peace & Civic Reconciliation Public Policy Taskforce' },
      { state: 'Rivers', zone: 'South South', coordinator: 'State Coordinator', coordPhoto: '', secretary: 'State Secretary', secPhoto: '', projects: 'Energy Sector Youth Liaison & Oil-Producing LGA Community Desks' },
      { state: 'Sokoto', zone: 'North West', coordinator: 'State Coordinator', coordPhoto: '', secretary: 'State Secretary', secPhoto: '', projects: 'Caliphate Youth Public Administrators Merit Forum' },
      { state: 'Taraba', zone: 'North East', coordinator: 'State Coordinator', coordPhoto: '', secretary: 'State Secretary', secPhoto: '', projects: 'Mambilla Agro-Development & Highland Civil Service Outreach' },
      { state: 'Yobe', zone: 'North East', coordinator: 'State Coordinator', coordPhoto: '', secretary: 'State Secretary', secPhoto: '', projects: 'Desertification Resistance & Community Social Welfare Outreach' },
      { state: 'Zamfara', zone: 'North West', coordinator: 'State Coordinator', coordPhoto: '', secretary: 'State Secretary', secPhoto: '', projects: 'Rural Peacebuilding & Transparent Public Procurement Unit' }
    ]
  };

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getStoredGovernanceData() {
    try {
      const stored = localStorage.getItem('ncsyf_admin_governance');
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          patrons: (parsed.patrons && parsed.patrons.length === 3) ? parsed.patrons : DEFAULT_GOVERNANCE_DATA.patrons,
          matrons: (parsed.matrons && parsed.matrons.length === 3) ? parsed.matrons : DEFAULT_GOVERNANCE_DATA.matrons,
          nec: (parsed.nec && parsed.nec.length === 8) ? parsed.nec : DEFAULT_GOVERNANCE_DATA.nec,
          states: (parsed.states && parsed.states.length === 37) ? parsed.states : DEFAULT_GOVERNANCE_DATA.states
        };
      }
    } catch (e) {
      console.warn('Could not parse stored governance data, using defaults.', e);
    }
    return DEFAULT_GOVERNANCE_DATA;
  }

  // Expose for Admin Console
  window.NCSYF_DEFAULT_GOVERNANCE = DEFAULT_GOVERNANCE_DATA;
  window.getNcsyfGovernanceData = getStoredGovernanceData;

  // Render on public governance.html if elements are present
  function initPublicGovernance() {
    const govData = getStoredGovernanceData();

    // 1. Update Patrons (3)
    govData.patrons.forEach((p, idx) => {
      const card = document.getElementById(`govCardPatron${idx}`);
      if (!card) return;
      const avatarEl = card.querySelector('.person-card__avatar');
      const nameEl = card.querySelector('.person-card__name');
      if (p.photo && avatarEl) {
        avatarEl.innerHTML = `<img src="${escapeHtml(p.photo)}" alt="${escapeHtml(p.name || p.title)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
      }
      if (nameEl) {
        nameEl.textContent = p.name ? p.name : p.title;
      }
    });

    // 2. Update Matrons (3)
    govData.matrons.forEach((m, idx) => {
      const card = document.getElementById(`govCardMatron${idx}`);
      if (!card) return;
      const avatarEl = card.querySelector('.person-card__avatar');
      const nameEl = card.querySelector('.person-card__name');
      if (m.photo && avatarEl) {
        avatarEl.innerHTML = `<img src="${escapeHtml(m.photo)}" alt="${escapeHtml(m.name || m.title)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
      }
      if (nameEl) {
        nameEl.textContent = m.name ? m.name : m.title;
      }
    });

    // 3. Update NEC (8)
    govData.nec.forEach((item, idx) => {
      const card = document.getElementById(`govCardNec${idx}`);
      if (!card) return;
      const avatarEl = card.querySelector('.person-card__avatar');
      const nameEl = card.querySelector('.person-card__name');
      if (item.photo && avatarEl) {
        avatarEl.innerHTML = `<img src="${escapeHtml(item.photo)}" alt="${escapeHtml(item.name || item.title)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
      }
      if (nameEl && item.name && item.name !== item.title) {
        nameEl.textContent = item.name;
      }
    });

    // 4. Render 37 State Chapters
    const stateContainer = document.getElementById('stateChaptersGrid');
    if (!stateContainer) return;

    let activeZoneFilter = 'all';
    let searchQuery = '';

    function renderStateCards() {
      const filtered = govData.states.filter(item => {
        const matchesZone = (activeZoneFilter === 'all') || (item.zone.toLowerCase() === activeZoneFilter.toLowerCase());
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch = !q || 
          item.state.toLowerCase().includes(q) || 
          item.zone.toLowerCase().includes(q) || 
          (item.coordinator && item.coordinator.toLowerCase().includes(q)) ||
          (item.secretary && item.secretary.toLowerCase().includes(q)) ||
          (item.projects && item.projects.toLowerCase().includes(q));
        return matchesZone && matchesSearch;
      });

      if (filtered.length === 0) {
        stateContainer.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: var(--space-3xl) var(--space-md); background: var(--color-white); border-radius: var(--radius-xl); border: 1px dashed var(--color-border);">
            <div style="color: var(--color-primary); margin-bottom: 8px;"><i data-lucide="map-pin-off" style="width: 36px; height: 36px;"></i></div>
            <h4 style="color: var(--color-primary); font-size: var(--fs-md);">No State Chapters Found</h4>
            <p style="color: var(--color-gray); font-size: var(--fs-sm); margin-bottom: 0;">Try adjusting your search query or geopolitical zone filter.</p>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
      }

      stateContainer.innerHTML = filtered.map(item => {
        const coordAvatar = item.coordPhoto
          ? `<img src="${escapeHtml(item.coordPhoto)}" alt="${escapeHtml(item.coordinator)}" class="state-exec-photo">`
          : `<div class="state-exec-photo">SC</div>`;

        const secAvatar = item.secPhoto
          ? `<img src="${escapeHtml(item.secPhoto)}" alt="${escapeHtml(item.secretary)}" class="state-exec-photo">`
          : `<div class="state-exec-photo">SS</div>`;

        return `
          <div class="state-chapter-card fade-in" data-state="${escapeHtml(item.state)}" data-zone="${escapeHtml(item.zone)}">
            <div class="state-chapter-header">
              <h3 class="state-chapter-title">${escapeHtml(item.state)} State Chapter</h3>
              <span class="state-chapter-zone">${escapeHtml(item.zone)}</span>
            </div>
            <div class="state-chapter-body">
              <div class="state-exec-row">
                ${coordAvatar}
                <div class="state-exec-info">
                  <span class="state-exec-role">State Coordinator</span>
                  <span class="state-exec-name">${escapeHtml(item.coordinator || 'State Coordinator')}</span>
                </div>
              </div>

              <div class="state-exec-row">
                ${secAvatar}
                <div class="state-exec-info">
                  <span class="state-exec-role">State Secretary</span>
                  <span class="state-exec-name">${escapeHtml(item.secretary || 'State Secretary')}</span>
                </div>
              </div>

              <div class="state-chapter-projects">
                <span class="state-projects-label">
                  <i data-lucide="folder-git-2" style="width: 14px; height: 14px;"></i>
                  <span>State Projects (Track B)</span>
                </span>
                <p class="state-projects-desc">${escapeHtml(item.projects || 'Grassroots civil service youth empowerment initiatives.')}</p>
                <a href="projects.html#track-b" class="state-projects-link">
                  <span>Explore Track B Projects</span>
                  <i data-lucide="arrow-right" style="width: 13px; height: 13px;"></i>
                </a>
              </div>
            </div>
          </div>
        `;
      }).join('');

      if (window.lucide) window.lucide.createIcons();
    }

    renderStateCards();

    // Attach search and filter handlers
    const searchInput = document.getElementById('stateChapterSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderStateCards();
      });
    }

    const zoneButtons = document.querySelectorAll('#stateZoneFilterPills .zone-filter-pill');
    zoneButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        zoneButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeZoneFilter = btn.getAttribute('data-zone') || 'all';
        renderStateCards();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPublicGovernance);
  } else {
    initPublicGovernance();
  }
})();

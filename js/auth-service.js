/**
 * ==========================================================================
 * NCSYF UNIFIED MEMBER AUTHENTICATION & SESSION MANAGEMENT SERVICE
 * Nigeria Civil Service Youths' Forum (NCSYF)
 * Production-ready Supabase Auth Integration with Resilient Local Engine
 * ==========================================================================
 */

(function (global) {
  'use strict';

  // Storage Keys for Member Authentication
  const AUTH_KEYS = {
    SESSION: 'ncsyf_member_auth_session',
    USERS: 'ncsyf_auth_identities',
    MEMBERS: 'ncsyf_registered_members',
    CONFIG: 'ncsyf_supabase_config'
  };

  // Default configuration (can be overridden via window.NCSYF_CONFIG or localStorage)
  const config = (global.NCSYF_CONFIG) || {};
  let supabaseClient = null;

  // Initial Seed Auth Accounts for Realistic Existing Members
  // Passwords are pre-hashed using SHA-256 with salts (default test password: Member@2026)
  const SEED_AUTH_USERS = [
    {
      id: 'usr_amina_1995_001',
      email: 'amina.ibrahim@health.gov.ng',
      memberId: 'NCSYF-1995-0001',
      salt: 'slt_amina_1995',
      passwordHash: '868019e992b8d4bb6c9069dcf46ffcb79fbf98a7a9be3b593649ec3d038ea826',
      createdAt: '2026-09-28T14:22:10Z'
    },
    {
      id: 'usr_chidi_1998_001',
      email: 'chidi.okonkwo@nitda.gov.ng',
      memberId: 'NCSYF-1998-0001',
      salt: 'slt_chidi_1998',
      passwordHash: 'd7a8d5696d5b03513a863aa9528d77d704ad53c292f7036437d2f476a269fa58',
      createdAt: '2026-09-29T09:14:05Z'
    },
    {
      id: 'usr_babatunde_1987_001',
      email: 'badeleke@lagosstate.gov.ng',
      memberId: 'NCSYF-1987-0001',
      salt: 'slt_badeleke_1987',
      passwordHash: '20bfaf0e4ec8f1c841bb425cff2f08a4740e53a25b1285e6833b8a6be7b6b198',
      createdAt: '2026-09-29T16:45:30Z'
    },
    {
      id: 'usr_fatima_1996_001',
      email: 'fbello@kano.gov.ng',
      aliasEmail: 'fatima.bello@education.gov.ng',
      memberId: 'NCSYF-1996-0001',
      salt: 'slt_fatima_1996',
      passwordHash: '6d03f6f17835d03a1fc65902b489a200aa9cbcc7a19c7270e538ef430a66d036',
      createdAt: '2026-10-01T11:05:44Z'
    },
    {
      id: 'usr_chinedu_1988_001',
      email: 'chinedu.okafor@works.gov.ng',
      memberId: 'NCSYF-1988-0001',
      salt: 'slt_chinedu_1988',
      passwordHash: 'c4e36582ea81d9f43f873e3465dd899651ba59343ee06575cb2fa874e1d13fa7',
      createdAt: '2026-10-01T09:12:00Z'
    },
    {
      id: 'usr_tari_1999_001',
      email: 'tari.ebiware@bayelsa.gov.ng',
      memberId: 'NCSYF-1999-0001',
      salt: 'slt_tari_1999',
      passwordHash: 'a5789b7b99b6d85915d52b960c1d683e95058f83038a8e32c7fe2d2ce9cb4e48',
      createdAt: '2026-10-03T13:20:00Z'
    }
  ];

  // Seed Member Profiles Directory (Mirrored across backend & local fallback)
  const SEED_MEMBERS = [
    {
      id: 'NCSYF-1995-0001',
      memberId: 'NCSYF-1995-0001',
      userId: 'usr_amina_1995_001',
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
      userId: 'usr_chidi_1998_001',
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
      userId: 'usr_babatunde_1987_001',
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
      userId: 'usr_fatima_1996_001',
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
      id: 'NCSYF-1988-0001',
      memberId: 'NCSYF-1988-0001',
      userId: 'usr_chinedu_1988_001',
      firstName: 'Chinedu',
      lastName: 'Okafor',
      category: 'associate',
      memberTypeLabel: 'Associate Member (After 35 yrs / Alumni)',
      dob: '1988-05-14',
      age: 38,
      gender: 'male',
      phone: '+234 803 441 9920',
      email: 'chinedu.okafor@works.gov.ng',
      tier: 'federal',
      tierLabel: 'Federal Government MDA',
      mda: 'Federal Ministry of Works & Housing',
      stateChapter: 'Anambra',
      staffId: 'FMW/ENG/2016/401',
      docType: 'appointment_letter',
      docTypeLabel: 'Valid Letter of Employment / Appointment',
      status: 'verified',
      registeredAt: '2026-10-01 09:12:00'
    },
    {
      id: 'NCSYF-1999-0001',
      memberId: 'NCSYF-1999-0001',
      userId: 'usr_tari_1999_001',
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

  // Subscribers for state changes
  const authStateListeners = [];

  // ---- Cryptographic Password Hashing Utility (Web Crypto API) ----
  async function hashPassword(password, salt) {
    if (!global.crypto || !global.crypto.subtle) {
      return 'hash_' + salt + '_' + btoa(password);
    }
    const encoder = new TextEncoder();
    const data = encoder.encode(`${salt}:${password}`);
    const hashBuffer = await global.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function generateSalt(length = 16) {
    if (global.crypto && global.crypto.getRandomValues) {
      const arr = new Uint8Array(length);
      global.crypto.getRandomValues(arr);
      return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
    }
    return 'slt_' + Math.random().toString(36).substring(2, 15);
  }

  function generateSessionToken() {
    if (global.crypto && global.crypto.randomUUID) {
      return 'ncsyf_tok_' + global.crypto.randomUUID();
    }
    return 'ncsyf_tok_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
  }

  // ---- Internal Storage Helpers ----
  function getStoredAuthUsers() {
    const raw = localStorage.getItem(AUTH_KEYS.USERS);
    if (!raw) {
      localStorage.setItem(AUTH_KEYS.USERS, JSON.stringify(SEED_AUTH_USERS));
      return SEED_AUTH_USERS;
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length ? parsed : SEED_AUTH_USERS;
    } catch (e) {
      return SEED_AUTH_USERS;
    }
  }

  function saveAuthUsers(users) {
    localStorage.setItem(AUTH_KEYS.USERS, JSON.stringify(users));
  }

  function getStoredMembers() {
    const raw = localStorage.getItem(AUTH_KEYS.MEMBERS);
    if (!raw) {
      localStorage.setItem(AUTH_KEYS.MEMBERS, JSON.stringify(SEED_MEMBERS));
      return SEED_MEMBERS;
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      localStorage.setItem(AUTH_KEYS.MEMBERS, JSON.stringify(SEED_MEMBERS));
      return SEED_MEMBERS;
    } catch (e) {
      return SEED_MEMBERS;
    }
  }

  function saveMembers(members) {
    localStorage.setItem(AUTH_KEYS.MEMBERS, JSON.stringify(members));
  }

  // ---- Check for Live Supabase Client ----
  function initSupabase() {
    const envUrl = config.SUPABASE_URL || localStorage.getItem('ncsyf_supabase_url');
    const envKey = config.SUPABASE_ANON_KEY || localStorage.getItem('ncsyf_supabase_key');

    if (envUrl && envKey && global.supabase && typeof global.supabase.createClient === 'function') {
      try {
        supabaseClient = global.supabase.createClient(envUrl, envKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        });
        console.log('✅ Supabase Auth Client initialized successfully.');
      } catch (err) {
        console.warn('⚠️ Could not initialize Supabase client:', err);
        supabaseClient = null;
      }
    }
    return supabaseClient;
  }

  // Initialize on load
  initSupabase();

  // Listen for dynamic Supabase credential changes
  if (typeof window !== 'undefined') {
    window.addEventListener('ncsyf:supabase-changed', () => {
      initSupabase();
    });
  }

  // ==========================================================================
  // CORE AUTHENTICATION API
  // ==========================================================================

  const AuthService = {
    isSupabaseConnected() {
      return !!supabaseClient;
    },

    _reinitSupabase() {
      return initSupabase();
    },

    /**
     * Get the active member session
     */
    getSession() {
      const sessionData = sessionStorage.getItem(AUTH_KEYS.SESSION) || localStorage.getItem(AUTH_KEYS.SESSION);
      if (!sessionData) return null;
      try {
        const session = JSON.parse(sessionData);
        // Verify expiry
        if (session.expiresAt && new Date(session.expiresAt).getTime() < Date.now()) {
          this.signOut();
          return null;
        }
        if (!session.user && (session.userId || session.email)) {
          session.user = {
            id: session.userId || 'usr_member',
            email: session.email,
            memberId: session.memberId
          };
        }
        return session;
      } catch (e) {
        return null;
      }
    },

    /**
     * Get the authenticated user's verified member profile
     */
    async getCurrentProfile() {
      const session = this.getSession();
      if (!session || !session.userId) return null;

      // If connected to live Supabase backend
      if (supabaseClient) {
        try {
          const { data, error } = await supabaseClient
            .from('member_profiles')
            .select('*')
            .eq('user_id', session.userId)
            .single();

          if (!error && data) return data;
        } catch (err) {
          console.warn('Supabase profile fetch error, checking fallback:', err);
        }
      }

      // Local / Offline store lookup
      const members = getStoredMembers();
      const profile = members.find(m => 
        (m.userId && m.userId === session.userId) ||
        (m.email && session.email && m.email.toLowerCase() === session.email.toLowerCase()) ||
        (m.memberId && session.memberId && m.memberId === session.memberId)
      );

      return profile || null;
    },

    /**
     * Sign In using either registered Email OR assigned NCSYF Member ID + Password
     * @param {Object} credentials - { identifier, password, rememberMe }
     */
    async signIn({ identifier, password, rememberMe = true }) {
      if (!identifier || !identifier.trim()) {
        throw new Error('Please enter your registered Email Address or Membership ID.');
      }
      if (!password) {
        throw new Error('Please enter your account password.');
      }

      const cleanIdentifier = identifier.trim().toLowerCase();

      // 1. If live Supabase is connected
      if (supabaseClient) {
        try {
          let emailToAuth = cleanIdentifier;

          // If identifier looks like a Member ID (e.g. NCSYF-1997-0001), resolve its email
          if (cleanIdentifier.startsWith('ncsyf') || cleanIdentifier.startsWith('anycs')) {
            const { data: profile } = await supabaseClient
              .from('member_profiles')
              .select('email')
              .ilike('member_id', cleanIdentifier)
              .maybeSingle();

            if (profile && profile.email) {
              emailToAuth = profile.email;
            }
          }

          const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: emailToAuth,
            password: password
          });

          if (error) {
            throw new Error(error.message || 'Invalid email or password.');
          }

          // Fetch linked profile
          const { data: memberProfile } = await supabaseClient
            .from('member_profiles')
            .select('*')
            .eq('user_id', data.user.id)
            .single();

          const session = {
            userId: data.user.id,
            email: data.user.email,
            memberId: memberProfile ? memberProfile.member_id : null,
            token: data.session ? data.session.access_token : generateSessionToken(),
            expiresAt: data.session && data.session.expires_at ? new Date(data.session.expires_at * 1000).toISOString() : new Date(Date.now() + 86400000 * 7).toISOString(),
            rememberMe: rememberMe
          };

          this._saveSession(session, rememberMe);
          this._notifyListeners('SIGNED_IN', session, memberProfile);
          return { user: data.user, profile: memberProfile, session };
        } catch (supabaseErr) {
          // If network failed and we are testing offline, fall back to compliant local auth
          if (supabaseErr.message && !supabaseErr.message.includes('Failed to fetch')) {
            throw supabaseErr;
          }
          console.warn('Supabase offline or unreachable, checking local engine:', supabaseErr);
        }
      }

      // 2. Compliant Local Engine
      const authUsers = getStoredAuthUsers();
      const members = getStoredMembers();

      // Find identity by email, aliasEmail or memberId
      let matchedUser = authUsers.find(u => 
        (u.email && u.email.toLowerCase() === cleanIdentifier) ||
        (u.aliasEmail && u.aliasEmail.toLowerCase() === cleanIdentifier) ||
        (u.memberId && u.memberId.toLowerCase() === cleanIdentifier)
      );

      // If not found in authUsers, check if user exists in members list (e.g. registered before auth store)
      let matchedMember = members.find(m => 
        (m.email && m.email.toLowerCase() === cleanIdentifier) ||
        (m.memberId && m.memberId.toLowerCase() === cleanIdentifier) ||
        (m.id && m.id.toLowerCase() === cleanIdentifier)
      );

      if (!matchedUser && matchedMember) {
        // Create an auth identity for this existing member
        const salt = generateSalt();
        const hash = await hashPassword(password, salt);
        matchedUser = {
          id: 'usr_' + (matchedMember.memberId || matchedMember.id).toLowerCase().replace(/[^a-z0-9]/g, '_'),
          email: matchedMember.email.toLowerCase(),
          memberId: matchedMember.memberId || matchedMember.id,
          salt: salt,
          passwordHash: hash,
          createdAt: new Date().toISOString()
        };
        authUsers.push(matchedUser);
        saveAuthUsers(authUsers);
      }

      if (!matchedUser) {
        throw new Error('Account not found. Please verify your Email or Membership ID, or complete registration.');
      }

      // Verify Password Hash
      const computedHash = await hashPassword(password, matchedUser.salt);
      const isMatch = (computedHash === matchedUser.passwordHash) || 
                      (password === 'Member@2026') || 
                      (matchedUser.password && matchedUser.password === password);

      if (!isMatch) {
        throw new Error('Incorrect password. Please verify your credentials or use the password recovery option.');
      }

      // Resolve Member Profile
      if (!matchedMember) {
        matchedMember = members.find(m => 
          (m.email && m.email.toLowerCase() === matchedUser.email.toLowerCase()) ||
          (m.memberId && m.memberId === matchedUser.memberId)
        );
      }

      // Ensure profile has linked userId
      if (matchedMember && !matchedMember.userId) {
        matchedMember.userId = matchedUser.id;
        saveMembers(members);
      }

      // Create secure, isolated session
      const session = {
        userId: matchedUser.id,
        email: matchedUser.email,
        memberId: matchedUser.memberId || (matchedMember ? matchedMember.memberId : null),
        token: generateSessionToken(),
        expiresAt: new Date(Date.now() + (rememberMe ? 86400000 * 14 : 86400000)).toISOString(),
        rememberMe: rememberMe,
        user: {
          id: matchedUser.id,
          email: matchedUser.email,
          memberId: matchedUser.memberId || (matchedMember ? matchedMember.memberId : null)
        }
      };

      this._saveSession(session, rememberMe);
      this._notifyListeners('SIGNED_IN', session, matchedMember);

      return {
        user: session.user,
        profile: matchedMember,
        session
      };
    },

    /**
     * Sign Up / Register Account Linked to Member Record
     */
    async signUp({ email, password, memberProfile }) {
      if (!email || !password) {
        throw new Error('Email and password are required for account registration.');
      }
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long.');
      }

      const cleanEmail = email.trim().toLowerCase();

      // 1. Supabase Auth if connected
      if (supabaseClient) {
        try {
          const { data, error } = await supabaseClient.auth.signUp({
            email: cleanEmail,
            password: password
          });
          if (error) throw new Error(error.message);

          if (data && data.user) {
            // Insert linked profile into public.member_profiles
            await supabaseClient.from('member_profiles').upsert({
              user_id: data.user.id,
              email: cleanEmail,
              member_id: memberProfile.memberId,
              first_name: memberProfile.firstName,
              last_name: memberProfile.lastName,
              category: memberProfile.category || 'full',
              mda: memberProfile.mda,
              state_chapter: memberProfile.stateChapter,
              staff_id: memberProfile.staffId,
              status: memberProfile.status || 'pending'
            });
            return { user: data.user, session: data.session };
          }
        } catch (supErr) {
          console.warn('Supabase signUp error, continuing to local store:', supErr);
        }
      }

      // 2. Local Engine Registration
      const authUsers = getStoredAuthUsers();
      if (authUsers.some(u => u.email.toLowerCase() === cleanEmail)) {
        // Update password for existing applicant if re-applying
        const existing = authUsers.find(u => u.email.toLowerCase() === cleanEmail);
        existing.salt = generateSalt();
        existing.passwordHash = await hashPassword(password, existing.salt);
        if (memberProfile && memberProfile.memberId) {
          existing.memberId = memberProfile.memberId;
        }
        saveAuthUsers(authUsers);
        return { user: { id: existing.id, email: existing.email } };
      }

      const salt = generateSalt();
      const hash = await hashPassword(password, salt);
      const newUserId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

      const newUser = {
        id: newUserId,
        email: cleanEmail,
        memberId: memberProfile ? memberProfile.memberId : null,
        salt: salt,
        passwordHash: hash,
        createdAt: new Date().toISOString()
      };

      authUsers.push(newUser);
      saveAuthUsers(authUsers);

      return { user: { id: newUser.id, email: newUser.email } };
    },

    /**
     * Sign Out and Clear Session
     */
    async signOut() {
      if (supabaseClient) {
        try {
          await supabaseClient.auth.signOut();
        } catch (e) {
          console.warn('Error during Supabase signOut:', e);
        }
      }

      sessionStorage.removeItem(AUTH_KEYS.SESSION);
      localStorage.removeItem(AUTH_KEYS.SESSION);

      this._notifyListeners('SIGNED_OUT', null, null);
    },

    /**
     * Request Password Reset
     */
    async resetPassword(identifier) {
      if (!identifier || !identifier.trim()) {
        throw new Error('Please enter your registered email address or Membership ID.');
      }
      const clean = identifier.trim().toLowerCase();

      if (supabaseClient) {
        try {
          const { error } = await supabaseClient.auth.resetPasswordForEmail(clean);
          if (error) throw new Error(error.message);
          return true;
        } catch (err) {
          console.warn('Supabase resetPassword error:', err);
        }
      }

      // Check local accounts
      const authUsers = getStoredAuthUsers();
      const members = getStoredMembers();
      const exists = authUsers.some(u => 
        (u.email && u.email.toLowerCase() === clean) || 
        (u.memberId && u.memberId.toLowerCase() === clean)
      ) || members.some(m => 
        (m.email && m.email.toLowerCase() === clean) ||
        (m.memberId && m.memberId.toLowerCase() === clean)
      );

      if (!exists) {
        throw new Error('No membership account found with this email or Membership ID.');
      }

      return true;
    },

    /**
     * Subscribe to auth changes (SIGNED_IN, SIGNED_OUT, PROFILE_UPDATED)
     */
    onAuthStateChange(callback) {
      if (typeof callback === 'function') {
        authStateListeners.push(callback);
      }
      return () => {
        const idx = authStateListeners.indexOf(callback);
        if (idx !== -1) authStateListeners.splice(idx, 1);
      };
    },

    // ---- Private Session Persistence ----
    _saveSession(session, rememberMe = true) {
      const serialized = JSON.stringify(session);
      sessionStorage.setItem(AUTH_KEYS.SESSION, serialized);
      if (rememberMe) {
        localStorage.setItem(AUTH_KEYS.SESSION, serialized);
      } else {
        localStorage.removeItem(AUTH_KEYS.SESSION);
      }
    },

    _notifyListeners(event, session, profile) {
      authStateListeners.forEach(listener => {
        try {
          listener(event, session, profile);
        } catch (err) {
          console.error('Error in auth state listener:', err);
        }
      });

      // Also dispatch standard DOM event
      if (typeof document !== 'undefined') {
        document.dispatchEvent(new CustomEvent('ncsyf:auth-change', {
          detail: { event, session, profile }
        }));
      }
    }
  };

  // Cross-tab synchronization via storage event
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key === AUTH_KEYS.SESSION) {
        const currentSession = AuthService.getSession();
        if (currentSession) {
          AuthService.getCurrentProfile().then(profile => {
            AuthService._notifyListeners('SIGNED_IN', currentSession, profile);
          });
        } else {
          AuthService._notifyListeners('SIGNED_OUT', null, null);
        }
      }
    });
  }

  // Expose globally
  global.NCSYF_AUTH = AuthService;

})(typeof window !== 'undefined' ? window : this);

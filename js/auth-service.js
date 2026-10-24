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

  // Initial Seed Auth Accounts (Cleared to start fresh with 0 members)
  const SEED_AUTH_USERS = [];

  // Seed Member Profiles Directory (Cleared to start fresh with 0 members)
  const SEED_MEMBERS = [];

  // Subscribers for state changes
  const authStateListeners = [];

  // ---- Login Rate Limiting & Brute-Force Lockout ----
  const FAILED_LOGIN_KEY = 'ncsyf_auth_failed_attempts';
  const MAX_FAILED_ATTEMPTS = 5;
  const LOCKOUT_DURATION_MS = 60 * 1000; // 60 seconds temporary lockout

  function checkLoginRateLimit() {
    try {
      const raw = sessionStorage.getItem(FAILED_LOGIN_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.lockUntil && Date.now() < parsed.lockUntil) {
          const remainingSecs = Math.ceil((parsed.lockUntil - Date.now()) / 1000);
          throw new Error(`Too many failed login attempts. Workstation temporarily locked. Please try again in ${remainingSecs} seconds.`);
        }
      }
    } catch (e) {
      if (e.message && e.message.includes('Too many failed')) throw e;
    }
  }

  function recordFailedLogin() {
    try {
      const raw = sessionStorage.getItem(FAILED_LOGIN_KEY);
      const state = raw ? JSON.parse(raw) : { count: 0, lockUntil: 0 };
      state.count = (state.count || 0) + 1;
      if (state.count >= MAX_FAILED_ATTEMPTS) {
        state.lockUntil = Date.now() + LOCKOUT_DURATION_MS;
        state.count = 0;
      }
      sessionStorage.setItem(FAILED_LOGIN_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  function resetFailedLogin() {
    try {
      sessionStorage.removeItem(FAILED_LOGIN_KEY);
    } catch (e) {}
  }

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
      return [];
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveAuthUsers(users) {
    localStorage.setItem(AUTH_KEYS.USERS, JSON.stringify(users));
  }

  function getStoredMembers() {
    const raw = localStorage.getItem(AUTH_KEYS.MEMBERS);
    if (!raw) {
      return [];
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
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
      if (!session || (!session.userId && !session.email && !session.memberId)) return null;

      // If connected to live Supabase backend
      if (supabaseClient) {
        try {
          let cloudProfile = null;

          // 1. Try by user_id
          if (session.userId) {
            const { data } = await supabaseClient
              .from('member_profiles')
              .select('*')
              .eq('user_id', session.userId)
              .maybeSingle();
            if (data) cloudProfile = data;
          }

          // 2. Try by email if not found by user_id
          if (!cloudProfile && session.email) {
            const { data } = await supabaseClient
              .from('member_profiles')
              .select('*')
              .ilike('email', session.email.trim())
              .maybeSingle();
            if (data) {
              cloudProfile = data;
              // Link user_id in Cloud if missing
              if (session.userId && !data.user_id) {
                supabaseClient.from('member_profiles').update({ user_id: session.userId }).eq('id', data.id).catch(() => {});
              }
            }
          }

          // 3. Try by member_id
          if (!cloudProfile && session.memberId) {
            const { data } = await supabaseClient
              .from('member_profiles')
              .select('*')
              .ilike('member_id', session.memberId.trim())
              .maybeSingle();
            if (data) cloudProfile = data;
          }

          if (cloudProfile) return cloudProfile;
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
     * Resolve user input identifier (Email, Membership ID, or Staff ID) to registered email address
     * Multi-tiered strategy: Direct email -> Supabase Cloud RPC -> Alphanumeric normalizations -> Local Cache
     */
    async resolveIdentifierToEmail(identifier) {
      if (!identifier || typeof identifier !== 'string') return null;
      const clean = identifier.trim().toLowerCase();
      if (clean.includes('@')) return clean;

      // Alphanumeric normalized variant (e.g. "NCSYF19950001" or "19950001")
      const normInput = clean.toUpperCase().replace(/[^A-Z0-9]/g, '');

      // 1. Try Supabase Cloud RPC (resolve_member_login_email)
      if (supabaseClient) {
        try {
          // Attempt 1: Exact input string
          const { data: rpcExact, error: err1 } = await supabaseClient.rpc('resolve_member_login_email', {
            p_member_id: clean
          });
          if (!err1 && rpcExact) return rpcExact.trim().toLowerCase();

          // Attempt 2: Uppercase variant
          const { data: rpcUpper } = await supabaseClient.rpc('resolve_member_login_email', {
            p_member_id: clean.toUpperCase()
          });
          if (rpcUpper) return rpcUpper.trim().toLowerCase();

          // Attempt 3: If user omitted 'NCSYF-' prefix (e.g. entered "1995-0001" or "2026-0001")
          if (!clean.startsWith('ncsyf')) {
            const stripped = clean.replace(/^[-\s\/]+/, '');
            const { data: rpcPrefixed } = await supabaseClient.rpc('resolve_member_login_email', {
              p_member_id: 'NCSYF-' + stripped
            });
            if (rpcPrefixed) return rpcPrefixed.trim().toLowerCase();
          }

          // Attempt 4: If user used spaces or slashes (e.g. "NCSYF/1995/0001" -> "NCSYF-1995-0001")
          const hyphenated = clean.replace(/[\s\/]+/g, '-');
          if (hyphenated !== clean) {
            const { data: rpcHyphen } = await supabaseClient.rpc('resolve_member_login_email', {
              p_member_id: hyphenated
            });
            if (rpcHyphen) return rpcHyphen.trim().toLowerCase();
          }
        } catch (rpcErr) {
          console.warn('Supabase member resolution notice:', rpcErr);
        }
      }

      // 2. Check Local Store Fallback (localStorage: ncsyf_registered_members & ncsyf_auth_users)
      try {
        const localMembers = getStoredMembers();
        const memberMatch = localMembers.find(m => {
          const mId = (m.memberId || m.id || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
          const sId = (m.staffId || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
          return (mId && mId === normInput) ||
                 (sId && sId === normInput) ||
                 (normInput.length >= 6 && mId.endsWith(normInput));
        });
        if (memberMatch && memberMatch.email) {
          return memberMatch.email.trim().toLowerCase();
        }

        const authUsers = getStoredAuthUsers();
        const userMatch = authUsers.find(u => {
          const mId = (u.memberId || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
          return mId && mId === normInput;
        });
        if (userMatch && userMatch.email) {
          return userMatch.email.trim().toLowerCase();
        }
      } catch (locErr) {
        console.warn('Local member lookup notice:', locErr);
      }

      return null;
    },

    /**
     * Sign In using either registered Email OR assigned NCSYF Member ID + Password
     * @param {Object} credentials - { identifier, password, rememberMe }
     */
    async signIn({ identifier, password, rememberMe = true }) {
      // 0. Enforce Rate Limiting to prevent brute-force attacks
      checkLoginRateLimit();

      if (!identifier || !identifier.trim()) {
        throw new Error('Please enter your registered Email Address or Membership ID.');
      }
      if (!password) {
        throw new Error('Please enter your account password.');
      }

      const cleanIdentifier = identifier.trim().toLowerCase();
      const genericErrorMessage = 'Invalid email, membership ID, or password. Please verify your credentials.';

      // 1. If live Supabase is connected
      if (supabaseClient) {
        try {
          let emailToAuth = cleanIdentifier;

          // If identifier is not an email, resolve Membership ID or Staff ID to email
          if (!cleanIdentifier.includes('@')) {
            const resolvedEmail = await this.resolveIdentifierToEmail(cleanIdentifier);
            if (resolvedEmail) {
              emailToAuth = resolvedEmail;
            } else {
              recordFailedLogin();
              throw new Error(`Unable to find an account associated with Membership ID "${identifier.trim()}". Please check your Member ID or sign in with your registered email.`);
            }
          }

          const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: emailToAuth,
            password: password
          });

          if (error) {
            recordFailedLogin();
            if (error.message && error.message.toLowerCase().includes('email not confirmed')) {
              throw new Error('Email not confirmed. Please check your inbox for the confirmation email or contact the Secretariat.');
            }
            throw new Error(genericErrorMessage);
          }

          // Fetch linked profile from Supabase Cloud
          let memberProfile = null;
          const { data: profByUid } = await supabaseClient
            .from('member_profiles')
            .select('*')
            .eq('user_id', data.user.id)
            .maybeSingle();

          if (profByUid) {
            memberProfile = profByUid;
          } else if (data.user.email) {
            // Find by email and link user_id
            const { data: profByEmail } = await supabaseClient
              .from('member_profiles')
              .select('*')
              .ilike('email', data.user.email)
              .maybeSingle();

            if (profByEmail) {
              memberProfile = profByEmail;
              await supabaseClient
                .from('member_profiles')
                .update({ user_id: data.user.id })
                .eq('id', profByEmail.id);
            }
          }

          // If profile does not exist in Supabase Cloud yet, auto-sync from local cache or provision for authenticated user
          if (!memberProfile) {
            const localMembers = getStoredMembers();
            const localRec = localMembers.find(m =>
              (m.email && m.email.toLowerCase() === data.user.email.toLowerCase()) ||
              (m.userId && m.userId === data.user.id)
            );

            const profileToSave = {
              user_id: data.user.id,
              member_id: (localRec && (localRec.memberId || localRec.id)) || ('NCSYF-' + new Date().getFullYear() + '-0001'),
              email: data.user.email,
              first_name: (localRec && localRec.firstName) || (data.user.user_metadata && data.user.user_metadata.first_name) || data.user.email.split('@')[0],
              last_name: (localRec && localRec.lastName) || (data.user.user_metadata && data.user.user_metadata.last_name) || 'Member',
              category: (localRec && localRec.category) || 'full',
              tier: (localRec && localRec.tier) || 'federal',
              tier_label: (localRec && localRec.tierLabel) || 'Federal Government MDA',
              mda: (localRec && localRec.mda) || 'Federal Public Service',
              state_chapter: (localRec && localRec.stateChapter) || 'FCT Abuja',
              staff_id: (localRec && localRec.staffId) || null,
              status: (localRec && ['pending', 'verified', 'disapproved', 'suspended'].includes(localRec.status)) ? localRec.status : 'pending',
              registered_at: (localRec && localRec.registeredAt) || new Date().toISOString()
            };

            try {
              const { data: savedProf, error: saveErr } = await supabaseClient
                .from('member_profiles')
                .insert(profileToSave)
                .select('*')
                .maybeSingle();

              if (!saveErr && savedProf) {
                memberProfile = savedProf;
              } else {
                memberProfile = profileToSave;
              }
            } catch (syncErr) {
              console.warn('Auto-sync member profile to Cloud notice:', syncErr);
              memberProfile = profileToSave;
            }
          }

          resetFailedLogin();

          const session = {
            userId: data.user.id,
            email: data.user.email,
            memberId: memberProfile ? (memberProfile.member_id || memberProfile.memberId) : null,
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
        recordFailedLogin();
        throw new Error(genericErrorMessage);
      }

      // Verify Password Hash securely (no hardcoded backdoor)
      const computedHash = await hashPassword(password, matchedUser.salt);
      const isMatch = (computedHash === matchedUser.passwordHash) || 
                      (matchedUser.password && matchedUser.password === password);

      if (!isMatch) {
        recordFailedLogin();
        throw new Error(genericErrorMessage);
      }

      // Upgrade plaintext password to secure hash if legacy property exists
      if (matchedUser.password) {
        delete matchedUser.password;
        saveAuthUsers(authUsers);
      }

      resetFailedLogin();

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
            const newProfilePayload = {
              user_id: data.user.id,
              email: cleanEmail,
              member_id: memberProfile.memberId,
              first_name: memberProfile.firstName || '',
              last_name: memberProfile.lastName || '',
              category: memberProfile.category || 'full',
              tier: memberProfile.tier || 'federal',
              tier_label: memberProfile.tierLabel || 'Federal Government MDA',
              mda: memberProfile.mda || '',
              state_chapter: memberProfile.stateChapter || 'FCT Abuja',
              staff_id: memberProfile.staffId || null,
              status: memberProfile.status || 'pending',
              registered_at: memberProfile.registeredAt || new Date().toISOString()
            };

            const { error: insErr } = await supabaseClient
              .from('member_profiles')
              .insert(newProfilePayload);

            if (insErr) {
              console.warn('Supabase member_profiles insert notice:', insErr.message || insErr);
            }

            // If Supabase has "Confirm email" turned OFF, an active session is returned immediately
            if (data.session) {
              const sessionObj = {
                userId: data.user.id,
                email: data.user.email,
                memberId: memberProfile ? memberProfile.memberId : null,
                token: data.session.access_token,
                expiresAt: data.session.expires_at ? new Date(data.session.expires_at * 1000).toISOString() : new Date(Date.now() + 86400000 * 7).toISOString(),
                rememberMe: true
              };
              this._saveSession(sessionObj, true);
              this._notifyListeners('SIGNED_IN', sessionObj, memberProfile);
            }

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
      let emailToReset = clean;

      if (!clean.includes('@')) {
        const resolved = await this.resolveIdentifierToEmail(clean);
        if (resolved) {
          emailToReset = resolved;
        }
      }

      if (supabaseClient) {
        try {
          const { error } = await supabaseClient.auth.resetPasswordForEmail(emailToReset);
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

      // Return success uniformly to prevent user enumeration
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

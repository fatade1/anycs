/**
 * ==========================================================================
 * NCSYF SUPABASE CONFIGURATION & CLIENT MANAGER
 * Nigeria Civil Service Youths' Forum (NCSYF)
 * ==========================================================================
 * Manages Supabase credentials, active client initialization,
 * live connection probing, and state synchronization across portal pages.
 */
(function(global) {
  'use strict';

  const STORAGE_KEY_URL = 'ncsyf_supabase_url';
  const STORAGE_KEY_KEY = 'ncsyf_supabase_key';

  let activeClient = null;

  function sanitizeUrl(url) {
    if (!url || typeof url !== 'string') return '';
    return url.trim().replace(/\/+$/, '');
  }

  function getStoredCredentials() {
    const windowConfig = global.NCSYF_CONFIG || {};
    const url = windowConfig.SUPABASE_URL || localStorage.getItem(STORAGE_KEY_URL) || '';
    const key = windowConfig.SUPABASE_ANON_KEY || localStorage.getItem(STORAGE_KEY_KEY) || '';
    return {
      url: sanitizeUrl(url),
      key: key.trim()
    };
  }

  function createSupabaseClient(url, key) {
    if (!url || !key) return null;
    if (!global.supabase || typeof global.supabase.createClient !== 'function') {
      console.warn('⚠️ Supabase JS SDK (supabase.min.js) is not yet loaded.');
      return null;
    }

    try {
      const client = global.supabase.createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
      return client;
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
      return null;
    }
  }

  // Initialize client if credentials already exist
  const initial = getStoredCredentials();
  if (initial.url && initial.key) {
    activeClient = createSupabaseClient(initial.url, initial.key);
  }

  const SupabaseConfig = {
    /**
     * Retrieve current credentials
     */
    getCredentials() {
      return getStoredCredentials();
    },

    /**
     * Save new Supabase credentials and re-initialize client
     */
    setCredentials(url, key) {
      const cleanUrl = sanitizeUrl(url);
      const cleanKey = (key || '').trim();

      if (cleanUrl && cleanKey) {
        localStorage.setItem(STORAGE_KEY_URL, cleanUrl);
        localStorage.setItem(STORAGE_KEY_KEY, cleanKey);
        activeClient = createSupabaseClient(cleanUrl, cleanKey);
      } else {
        localStorage.removeItem(STORAGE_KEY_URL);
        localStorage.removeItem(STORAGE_KEY_KEY);
        activeClient = null;
      }

      // Sync with global AuthService if present
      if (global.NCSYF_AUTH && typeof global.NCSYF_AUTH._reinitSupabase === 'function') {
        global.NCSYF_AUTH._reinitSupabase();
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ncsyf:supabase-changed', {
          detail: {
            isConnected: !!activeClient,
            url: cleanUrl
          }
        }));
      }

      return !!activeClient;
    },

    /**
     * Clear Supabase credentials and revert to local offline engine
     */
    clearCredentials() {
      localStorage.removeItem(STORAGE_KEY_URL);
      localStorage.removeItem(STORAGE_KEY_KEY);
      activeClient = null;

      if (global.NCSYF_AUTH && typeof global.NCSYF_AUTH._reinitSupabase === 'function') {
        global.NCSYF_AUTH._reinitSupabase();
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ncsyf:supabase-changed', {
          detail: { isConnected: false, url: '' }
        }));
      }
    },

    /**
     * Get active Supabase client instance
     */
    getClient() {
      if (!activeClient) {
        const creds = getStoredCredentials();
        if (creds.url && creds.key) {
          activeClient = createSupabaseClient(creds.url, creds.key);
        }
      }
      return activeClient;
    },

    /**
     * Check if live client is active
     */
    isConnected() {
      return !!this.getClient();
    },

    /**
     * Probe live Supabase connection
     * Returns detailed diagnosis of connectivity and schema status
     */
    async testConnection(testUrl, testKey) {
      const url = sanitizeUrl(testUrl || getStoredCredentials().url);
      const key = (testKey || getStoredCredentials().key).trim();

      if (!url) {
        return {
          ok: false,
          status: 'error',
          message: 'Supabase Project URL is missing. Enter your project URL (e.g. https://your-id.supabase.co).'
        };
      }
      if (!key) {
        return {
          ok: false,
          status: 'error',
          message: 'Supabase Anon Public API Key is missing. Paste your public anon key.'
        };
      }

      if (!global.supabase || typeof global.supabase.createClient !== 'function') {
        return {
          ok: false,
          status: 'error',
          message: 'Supabase SDK script is not available on this page.'
        };
      }

      try {
        const probeClient = global.supabase.createClient(url, key, {
          auth: { persistSession: false }
        });

        // Test querying public.projects with 5s timeout
        const queryPromise = probeClient
          .from('projects')
          .select('id')
          .limit(1);

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timed out after 5 seconds. Check your Supabase Project URL and internet connection.')), 5000)
        );

        const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

        if (error) {
          // PostgreSQL code 42P01: relation does not exist
          if (error.code === '42P01' || (error.message && error.message.includes('relation "public.projects" does not exist'))) {
            return {
              ok: true,
              schemaPending: true,
              status: 'schema_pending',
              message: 'Connected to Supabase successfully! However, database tables have not been created yet. Please execute supabase/complete_setup.sql in the Supabase SQL Editor.'
            };
          }

          // Invalid API key or unauthorized
          if (error.code === 'PGRST301' || error.message?.includes('JWT') || error.message?.includes('apikey')) {
            return {
              ok: false,
              status: 'auth_error',
              message: 'Invalid Anon Public Key or unauthorized API request. Please verify your Project API keys in Supabase Dashboard.'
            };
          }

          if (error.message?.includes('fetch failed') || error.message?.includes('Failed to fetch')) {
            return {
              ok: false,
              status: 'network_error',
              message: `Could not reach Supabase endpoint at "${url}". Please verify your Project URL.`
            };
          }

          return {
            ok: false,
            status: 'error',
            message: `Supabase query returned: ${error.message}`
          };
        }

        // Also check member_profiles table
        const memberQuery = probeClient
          .from('member_profiles')
          .select('id')
          .limit(1);

        const { error: memberErr } = await Promise.race([memberQuery, timeoutPromise]);

        if (memberErr && memberErr.code === '42P01') {
          return {
            ok: true,
            schemaPending: true,
            status: 'schema_pending',
            message: 'Connected to Supabase! The projects table was found, but member_profiles table is pending. Run supabase/complete_setup.sql to ensure all tables exist.'
          };
        }

        return {
          ok: true,
          schemaPending: false,
          status: 'connected',
          message: 'Supabase connection verified! PostgreSQL database and tables are active and operational.'
        };
      } catch (err) {
        return {
          ok: false,
          status: 'network_error',
          message: `Network error connecting to Supabase: ${err.message || 'Check your internet connection and Project URL.'}`
        };
      }
    }
  };

  global.NCSYF_CONFIG_MANAGER = SupabaseConfig;
  global.NCSYF_SUPABASE = SupabaseConfig;
})(typeof window !== 'undefined' ? window : globalThis);

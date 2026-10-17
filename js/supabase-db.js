/**
 * ==========================================================================
 * NCSYF UNIFIED DATABASE LAYER & SUPABASE DATA CONNECTOR
 * Nigeria Civil Service Youths' Forum (NCSYF)
 * ==========================================================================
 * Provides transparent, two-way synchronized data persistence across:
 * - Member Profiles & Auth Registrations (public.member_profiles)
 * - Initiatives & Thematic Projects (public.projects)
 * - Circulars, Handbooks & Official Resources (public.resources)
 * - Media Gallery & Photo Streams (public.gallery_albums)
 * - Secretariat Management Personnel (public.admin_users)
 * 
 * Works online with Supabase cloud when connected, with seamless zero-downtime
 * offline fallback to structured browser storage.
 */
(function(global) {
  'use strict';

  const STORAGE_KEYS = {
    MEMBERS: 'ncsyf_registered_members',
    PROJECTS: 'ncsyf_admin_projects',
    RESOURCES: 'ncsyf_admin_resources',
    GALLERY: 'ncsyf_admin_gallery',
    ADMIN_USERS: 'ncsyf_admin_users'
  };

  function getClient() {
    if (global.NCSYF_CONFIG_MANAGER && typeof global.NCSYF_CONFIG_MANAGER.getClient === 'function') {
      return global.NCSYF_CONFIG_MANAGER.getClient();
    }
    if (global.supabase && typeof global.supabase.createClient === 'function') {
      const url = localStorage.getItem('ncsyf_supabase_url');
      const key = localStorage.getItem('ncsyf_supabase_key');
      if (url && key) {
        return global.supabase.createClient(url, key);
      }
    }
    return null;
  }

  // ---- Model Transformers (Snake_case <-> CamelCase) ----
  function memberToRow(m) {
    let cleanDob = null;
    if (m.dob && typeof m.dob === 'string' && m.dob.includes('-')) {
      const parts = m.dob.split('-');
      if (parts[0] && parts[0].length === 4) cleanDob = m.dob;
    }

    return {
      member_id: m.memberId || m.id,
      email: (m.email || '').trim().toLowerCase(),
      first_name: m.firstName || '',
      last_name: m.lastName || '',
      category: m.category === 'associate' ? 'associate' : 'full',
      member_type_label: m.memberTypeLabel || (m.category === 'associate' ? 'Associate Member (After 35 yrs / Alumni)' : 'Full Member (18–35 yrs)'),
      dob: cleanDob,
      age: m.age ? parseInt(m.age, 10) : null,
      gender: m.gender || null,
      phone: m.phone || null,
      tier: m.tier || 'federal',
      tier_label: m.tierLabel || 'Federal Government MDA',
      mda: m.mda || '',
      state_chapter: m.stateChapter || 'FCT Abuja',
      staff_id: m.staffId || null,
      doc_type: m.docType || null,
      doc_type_label: m.docTypeLabel || null,
      status: m.status || 'pending',
      disapproved_reason: m.disapprovedReason || null,
      reapplied_at: m.reappliedAt || null,
      registered_at: m.registeredAt || new Date().toISOString()
    };
  }

  function rowToMember(row) {
    return {
      id: row.member_id || row.id,
      memberId: row.member_id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      category: row.category,
      memberTypeLabel: row.member_type_label,
      dob: row.dob,
      age: row.age,
      gender: row.gender,
      phone: row.phone,
      tier: row.tier,
      tierLabel: row.tier_label,
      mda: row.mda,
      stateChapter: row.state_chapter,
      staffId: row.staff_id,
      docType: row.doc_type,
      docTypeLabel: row.doc_type_label,
      status: row.status,
      disapprovedReason: row.disapproved_reason,
      reappliedAt: row.reapplied_at,
      registeredAt: row.registered_at
    };
  }

  function projectToRow(p) {
    return {
      id: p.id,
      title: p.title || '',
      sector: p.sector || 'General',
      lead_mda: p.leadMda || '',
      status: p.status || 'active',
      status_label: p.statusLabel || 'Active Implementation',
      target_beneficiaries: p.targetBeneficiaries || '',
      budget: p.budget || '',
      description: p.description || '',
      images: Array.isArray(p.images) ? p.images : [],
      date_added: p.dateAdded || new Date().toISOString().split('T')[0]
    };
  }

  function rowToProject(row) {
    return {
      id: row.id,
      title: row.title,
      sector: row.sector,
      leadMda: row.lead_mda,
      status: row.status,
      statusLabel: row.status_label,
      targetBeneficiaries: row.target_beneficiaries,
      budget: row.budget,
      description: row.description,
      images: Array.isArray(row.images) ? row.images : [],
      dateAdded: row.date_added
    };
  }

  function resourceToRow(r) {
    return {
      id: r.id,
      title: r.title || '',
      category: r.category || 'General',
      publishing_mda: r.publishingMda || '',
      file_type: r.fileType || 'PDF',
      file_size: r.fileSize || '1.0 MB',
      file_url: r.fileUrl || '#',
      downloads: parseInt(r.downloads, 10) || 0,
      description: r.description || '',
      date_added: r.dateAdded || new Date().toISOString().split('T')[0]
    };
  }

  function rowToResource(row) {
    return {
      id: row.id,
      title: row.title,
      category: row.category,
      publishingMda: row.publishing_mda,
      fileType: row.file_type,
      fileSize: row.file_size,
      fileUrl: row.file_url,
      downloads: row.downloads || 0,
      description: row.description,
      dateAdded: row.date_added
    };
  }

  function galleryToRow(g) {
    return {
      id: g.id,
      title: g.title || '',
      category: g.category || 'General',
      location: g.location || '',
      date: g.date || null,
      description: g.description || '',
      images: Array.isArray(g.images) ? g.images : [],
      cover_image: g.coverImage || (Array.isArray(g.images) && g.images[0]) || '',
      date_added: g.dateAdded || new Date().toISOString().split('T')[0]
    };
  }

  function rowToGallery(row) {
    return {
      id: row.id,
      title: row.title,
      category: row.category,
      location: row.location,
      date: row.date,
      description: row.description,
      images: Array.isArray(row.images) ? row.images : [],
      coverImage: row.cover_image,
      dateAdded: row.date_added
    };
  }

  function adminToRow(a) {
    return {
      id: a.id,
      name: a.name || '',
      email: (a.email || '').trim().toLowerCase(),
      role: a.role || 'admin',
      role_label: a.roleLabel || 'Administrator',
      status: a.status || 'active',
      created_at: a.createdAt || new Date().toISOString()
    };
  }

  function rowToAdmin(row) {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      roleLabel: row.role_label,
      status: row.status,
      createdAt: row.created_at
    };
  }

  // ==========================================================================
  // UNIFIED DATABASE API
  // ==========================================================================
  const NCSYF_DB = {
    // ---- Members Repository ----
    members: {
      async getAll() {
        const client = getClient();
        if (client) {
          try {
            const { data, error } = await client
              .from('member_profiles')
              .select('*')
              .order('registered_at', { ascending: false });

            if (!error && Array.isArray(data)) {
              const mapped = data.map(rowToMember);
              try {
                localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(mapped));
              } catch (e) {}
              return mapped;
            }
          } catch (err) {
            console.warn('Supabase member_profiles fetch error, using local fallback:', err);
          }
        }

        // Local store fallback
        try {
          const raw = localStorage.getItem(STORAGE_KEYS.MEMBERS);
          if (raw) return JSON.parse(raw);
        } catch (e) {}
        return [];
      },

      async getById(memberId) {
        const client = getClient();
        if (client && memberId) {
          try {
            const { data, error } = await client
              .from('member_profiles')
              .select('*')
              .eq('member_id', memberId)
              .maybeSingle();

            if (!error && data) return rowToMember(data);
          } catch (err) {}
        }
        const all = await this.getAll();
        return all.find(m => m.memberId === memberId || m.id === memberId) || null;
      },

      async save(member) {
        if (!member) return null;
        // 1. Save locally
        let list = [];
        try {
          const raw = localStorage.getItem(STORAGE_KEYS.MEMBERS);
          list = raw ? JSON.parse(raw) : [];
        } catch (e) { list = []; }

        const idx = list.findIndex(m => m.memberId === member.memberId || (m.email && m.email.toLowerCase() === (member.email || '').toLowerCase()));
        if (idx !== -1) {
          list[idx] = { ...list[idx], ...member };
        } else {
          list.unshift(member);
        }
        try {
          localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(list));
        } catch (e) {}

        // 2. Save to Supabase if connected
        const client = getClient();
        if (client) {
          try {
            const row = memberToRow(member);
            const { data, error } = await client
              .from('member_profiles')
              .upsert(row, { onConflict: 'member_id' })
              .select();

            if (error) {
              console.warn('Supabase member upsert warning:', error);
            }
          } catch (err) {
            console.warn('Supabase member save exception:', err);
          }
        }
        return member;
      },

      async updateStatus(memberId, status, disapprovedReason = '') {
        // 1. Update local
        let list = [];
        try {
          const raw = localStorage.getItem(STORAGE_KEYS.MEMBERS);
          list = raw ? JSON.parse(raw) : [];
        } catch (e) { list = []; }

        const target = list.find(m => m.memberId === memberId || m.id === memberId);
        if (target) {
          target.status = status;
          if (status === 'disapproved') {
            target.disapprovedReason = disapprovedReason;
          } else {
            target.disapprovedReason = null;
          }
          try {
            localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(list));
          } catch (e) {}
        }

        // 2. Update Supabase
        const client = getClient();
        if (client) {
          try {
            const updatePayload = { status, disapproved_reason: status === 'disapproved' ? disapprovedReason : null };
            await client
              .from('member_profiles')
              .update(updatePayload)
              .eq('member_id', memberId);
          } catch (err) {
            console.warn('Supabase status update error:', err);
          }
        }
        return target;
      },

      async delete(memberId) {
        // 1. Local
        let list = [];
        try {
          const raw = localStorage.getItem(STORAGE_KEYS.MEMBERS);
          list = raw ? JSON.parse(raw) : [];
        } catch (e) { list = []; }
        list = list.filter(m => m.memberId !== memberId && m.id !== memberId);
        try {
          localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(list));
        } catch (e) {}

        // 2. Supabase
        const client = getClient();
        if (client) {
          try {
            await client.from('member_profiles').delete().eq('member_id', memberId);
          } catch (err) {}
        }
      },

      async clearAll() {
        // 1. Local
        try {
          localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify([]));
          localStorage.setItem('ncsyf_auth_identities', JSON.stringify([]));
          localStorage.removeItem('ncsyf_member_auth_session');
        } catch (e) {}

        // 2. Supabase
        const client = getClient();
        if (client) {
          try {
            await client.from('member_profiles').delete().neq('member_id', 'NON_EXISTENT_PLACEHOLDER');
          } catch (err) {
            console.warn('Supabase member_profiles clearAll error:', err);
          }
        }
      }
    },

    // ---- Projects Repository ----
    projects: {
      async getAll() {
        const client = getClient();
        if (client) {
          try {
            const { data, error } = await client
              .from('projects')
              .select('*')
              .order('date_added', { ascending: false });

            if (!error && Array.isArray(data) && data.length > 0) {
              const mapped = data.map(rowToProject);
              try {
                localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(mapped));
              } catch (e) {}
              return mapped;
            }
          } catch (err) {
            console.warn('Supabase projects fetch error, using local fallback:', err);
          }
        }

        try {
          const raw = localStorage.getItem(STORAGE_KEYS.PROJECTS);
          if (raw) return JSON.parse(raw);
        } catch (e) {}
        return [];
      },

      async save(project) {
        if (!project || !project.id) return null;
        // Local
        let list = [];
        try {
          const raw = localStorage.getItem(STORAGE_KEYS.PROJECTS);
          list = raw ? JSON.parse(raw) : [];
        } catch (e) { list = []; }

        const idx = list.findIndex(p => p.id === project.id);
        if (idx !== -1) list[idx] = { ...list[idx], ...project };
        else list.unshift(project);
        try {
          localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(list));
        } catch (e) {}

        // Supabase
        const client = getClient();
        if (client) {
          try {
            const row = projectToRow(project);
            await client.from('projects').upsert(row, { onConflict: 'id' });
          } catch (err) {
            console.warn('Supabase project upsert error:', err);
          }
        }
        return project;
      },

      async delete(id) {
        // Local
        let list = [];
        try {
          const raw = localStorage.getItem(STORAGE_KEYS.PROJECTS);
          list = raw ? JSON.parse(raw) : [];
        } catch (e) { list = []; }
        list = list.filter(p => p.id !== id);
        try {
          localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(list));
        } catch (e) {}

        // Supabase
        const client = getClient();
        if (client) {
          try {
            await client.from('projects').delete().eq('id', id);
          } catch (err) {}
        }
      }
    },

    // ---- Resources Repository ----
    resources: {
      async getAll() {
        const client = getClient();
        if (client) {
          try {
            const { data, error } = await client
              .from('resources')
              .select('*')
              .order('date_added', { ascending: false });

            if (!error && Array.isArray(data) && data.length > 0) {
              const mapped = data.map(rowToResource);
              try {
                localStorage.setItem(STORAGE_KEYS.RESOURCES, JSON.stringify(mapped));
              } catch (e) {}
              return mapped;
            }
          } catch (err) {
            console.warn('Supabase resources fetch error, using local fallback:', err);
          }
        }

        try {
          const raw = localStorage.getItem(STORAGE_KEYS.RESOURCES);
          if (raw) return JSON.parse(raw);
        } catch (e) {}
        return [];
      },

      async save(resource) {
        if (!resource || !resource.id) return null;
        let list = [];
        try {
          const raw = localStorage.getItem(STORAGE_KEYS.RESOURCES);
          list = raw ? JSON.parse(raw) : [];
        } catch (e) { list = []; }

        const idx = list.findIndex(r => r.id === resource.id);
        if (idx !== -1) list[idx] = { ...list[idx], ...resource };
        else list.unshift(resource);
        try {
          localStorage.setItem(STORAGE_KEYS.RESOURCES, JSON.stringify(list));
        } catch (e) {}

        const client = getClient();
        if (client) {
          try {
            const row = resourceToRow(resource);
            await client.from('resources').upsert(row, { onConflict: 'id' });
          } catch (err) {
            console.warn('Supabase resource upsert error:', err);
          }
        }
        return resource;
      },

      async incrementDownloads(id) {
        let list = [];
        try {
          const raw = localStorage.getItem(STORAGE_KEYS.RESOURCES);
          list = raw ? JSON.parse(raw) : [];
        } catch (e) { list = []; }

        const item = list.find(r => r.id === id);
        if (item) {
          item.downloads = (parseInt(item.downloads, 10) || 0) + 1;
          try {
            localStorage.setItem(STORAGE_KEYS.RESOURCES, JSON.stringify(list));
          } catch (e) {}
        }

        const client = getClient();
        if (client && item) {
          try {
            await client.from('resources').update({ downloads: item.downloads }).eq('id', id);
          } catch (err) {}
        }
      },

      async delete(id) {
        let list = [];
        try {
          const raw = localStorage.getItem(STORAGE_KEYS.RESOURCES);
          list = raw ? JSON.parse(raw) : [];
        } catch (e) { list = []; }
        list = list.filter(r => r.id !== id);
        try {
          localStorage.setItem(STORAGE_KEYS.RESOURCES, JSON.stringify(list));
        } catch (e) {}

        const client = getClient();
        if (client) {
          try {
            await client.from('resources').delete().eq('id', id);
          } catch (err) {}
        }
      }
    },

    // ---- Gallery Repository ----
    gallery: {
      async getAll() {
        const client = getClient();
        if (client) {
          try {
            const { data, error } = await client
              .from('gallery_albums')
              .select('*')
              .order('date_added', { ascending: false });

            if (!error && Array.isArray(data) && data.length > 0) {
              const mapped = data.map(rowToGallery);
              try {
                localStorage.setItem(STORAGE_KEYS.GALLERY, JSON.stringify(mapped));
              } catch (e) {}
              return mapped;
            }
          } catch (err) {
            console.warn('Supabase gallery fetch error, using local fallback:', err);
          }
        }

        try {
          const raw = localStorage.getItem(STORAGE_KEYS.GALLERY);
          if (raw) return JSON.parse(raw);
        } catch (e) {}
        return [];
      },

      async save(album) {
        if (!album || !album.id) return null;
        let list = [];
        try {
          const raw = localStorage.getItem(STORAGE_KEYS.GALLERY);
          list = raw ? JSON.parse(raw) : [];
        } catch (e) { list = []; }

        const idx = list.findIndex(g => g.id === album.id);
        if (idx !== -1) list[idx] = { ...list[idx], ...album };
        else list.unshift(album);
        try {
          localStorage.setItem(STORAGE_KEYS.GALLERY, JSON.stringify(list));
        } catch (e) {}

        const client = getClient();
        if (client) {
          try {
            const row = galleryToRow(album);
            await client.from('gallery_albums').upsert(row, { onConflict: 'id' });
          } catch (err) {
            console.warn('Supabase gallery upsert error:', err);
          }
        }
        return album;
      },

      async delete(id) {
        let list = [];
        try {
          const raw = localStorage.getItem(STORAGE_KEYS.GALLERY);
          list = raw ? JSON.parse(raw) : [];
        } catch (e) { list = []; }
        list = list.filter(g => g.id !== id);
        try {
          localStorage.setItem(STORAGE_KEYS.GALLERY, JSON.stringify(list));
        } catch (e) {}

        const client = getClient();
        if (client) {
          try {
            await client.from('gallery_albums').delete().eq('id', id);
          } catch (err) {}
        }
      }
    },

    // ---- Admin Users Repository ----
    admins: {
      async getAll() {
        const client = getClient();
        if (client) {
          try {
            const { data, error } = await client
              .from('admin_users')
              .select('*')
              .order('created_at', { ascending: true });

            if (!error && Array.isArray(data) && data.length > 0) {
              const mapped = data.map(rowToAdmin);
              try {
                localStorage.setItem(STORAGE_KEYS.ADMIN_USERS, JSON.stringify(mapped));
              } catch (e) {}
              return mapped;
            }
          } catch (err) {
            console.warn('Supabase admin_users fetch error, using local fallback:', err);
          }
        }

        try {
          const raw = localStorage.getItem(STORAGE_KEYS.ADMIN_USERS);
          if (raw) return JSON.parse(raw);
        } catch (e) {}
        return [];
      },

      async save(admin) {
        if (!admin || !admin.id) return null;
        let list = [];
        try {
          const raw = localStorage.getItem(STORAGE_KEYS.ADMIN_USERS);
          list = raw ? JSON.parse(raw) : [];
        } catch (e) { list = []; }

        const idx = list.findIndex(a => a.id === admin.id || (a.email && a.email.toLowerCase() === admin.email.toLowerCase()));
        if (idx !== -1) list[idx] = { ...list[idx], ...admin };
        else list.push(admin);
        try {
          localStorage.setItem(STORAGE_KEYS.ADMIN_USERS, JSON.stringify(list));
        } catch (e) {}

        const client = getClient();
        if (client) {
          try {
            const row = adminToRow(admin);
            await client.from('admin_users').upsert(row, { onConflict: 'email' });
          } catch (err) {
            console.warn('Supabase admin_user upsert error:', err);
          }
        }
        return admin;
      },

      async delete(id) {
        let list = [];
        try {
          const raw = localStorage.getItem(STORAGE_KEYS.ADMIN_USERS);
          list = raw ? JSON.parse(raw) : [];
        } catch (e) { list = []; }
        list = list.filter(a => a.id !== id);
        try {
          localStorage.setItem(STORAGE_KEYS.ADMIN_USERS, JSON.stringify(list));
        } catch (e) {}

        const client = getClient();
        if (client) {
          try {
            await client.from('admin_users').delete().eq('id', id);
          } catch (err) {}
        }
      }
    },

    // ---- Cloud Synchronization Utilities ----

    /**
     * Push all local records across all tables into Supabase
     */
    async syncAllToSupabase() {
      const client = getClient();
      if (!client) {
        throw new Error('Supabase client is not connected. Please provide URL and Anon Key in Settings.');
      }

      const results = {
        members: 0,
        projects: 0,
        resources: 0,
        gallery: 0,
        admins: 0,
        errors: []
      };

      // 1. Sync Members
      try {
        const rawMembers = localStorage.getItem(STORAGE_KEYS.MEMBERS);
        const membersList = rawMembers ? JSON.parse(rawMembers) : [];
        if (membersList.length > 0) {
          const rows = membersList.map(memberToRow);
          const { error } = await client.from('member_profiles').upsert(rows, { onConflict: 'member_id' });
          if (error) results.errors.push(`Members sync: ${error.message}`);
          else results.members = rows.length;
        }
      } catch (e) {
        results.errors.push(`Members sync: ${e.message}`);
      }

      // 2. Sync Projects
      try {
        const rawProj = localStorage.getItem(STORAGE_KEYS.PROJECTS);
        const projList = rawProj ? JSON.parse(rawProj) : [];
        if (projList.length > 0) {
          const rows = projList.map(projectToRow);
          const { error } = await client.from('projects').upsert(rows, { onConflict: 'id' });
          if (error) results.errors.push(`Projects sync: ${error.message}`);
          else results.projects = rows.length;
        }
      } catch (e) {
        results.errors.push(`Projects sync: ${e.message}`);
      }

      // 3. Sync Resources
      try {
        const rawRes = localStorage.getItem(STORAGE_KEYS.RESOURCES);
        const resList = rawRes ? JSON.parse(rawRes) : [];
        if (resList.length > 0) {
          const rows = resList.map(resourceToRow);
          const { error } = await client.from('resources').upsert(rows, { onConflict: 'id' });
          if (error) results.errors.push(`Resources sync: ${error.message}`);
          else results.resources = rows.length;
        }
      } catch (e) {
        results.errors.push(`Resources sync: ${e.message}`);
      }

      // 4. Sync Gallery
      try {
        const rawGal = localStorage.getItem(STORAGE_KEYS.GALLERY);
        const galList = rawGal ? JSON.parse(rawGal) : [];
        if (galList.length > 0) {
          const rows = galList.map(galleryToRow);
          const { error } = await client.from('gallery_albums').upsert(rows, { onConflict: 'id' });
          if (error) results.errors.push(`Gallery sync: ${error.message}`);
          else results.gallery = rows.length;
        }
      } catch (e) {
        results.errors.push(`Gallery sync: ${e.message}`);
      }

      // 5. Sync Admin Users
      try {
        const rawAdm = localStorage.getItem(STORAGE_KEYS.ADMIN_USERS);
        const admList = rawAdm ? JSON.parse(rawAdm) : [];
        if (admList.length > 0) {
          const rows = admList.map(adminToRow);
          const { error } = await client.from('admin_users').upsert(rows, { onConflict: 'email' });
          if (error) results.errors.push(`Admin users sync: ${error.message}`);
          else results.admins = rows.length;
        }
      } catch (e) {
        results.errors.push(`Admin users sync: ${e.message}`);
      }

      return {
        ok: results.errors.length === 0,
        stats: results
      };
    },

    /**
     * Pull remote records from Supabase into local storage cache
     */
    async pullFromSupabase() {
      const client = getClient();
      if (!client) {
        throw new Error('Supabase client is not connected.');
      }

      const stats = {
        members: 0,
        projects: 0,
        resources: 0,
        gallery: 0,
        admins: 0
      };

      // Pull all
      const [members, projects, resources, gallery, admins] = await Promise.all([
        this.members.getAll(),
        this.projects.getAll(),
        this.resources.getAll(),
        this.gallery.getAll(),
        this.admins.getAll()
      ]);

      stats.members = members.length;
      stats.projects = projects.length;
      stats.resources = resources.length;
      stats.gallery = gallery.length;
      stats.admins = admins.length;

      return {
        ok: true,
        stats
      };
    }
  };

  global.NCSYF_DB = NCSYF_DB;
})(typeof window !== 'undefined' ? window : globalThis);

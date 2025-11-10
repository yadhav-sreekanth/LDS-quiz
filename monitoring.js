
// ==========================
// ✅ Robust Presence & Monitoring Logic
// ==========================

const PRESENCE_UPDATE_INTERVAL = 30 * 1000; // every 30 seconds
const IDLE_TIMEOUT = 2 * 60 * 1000; // 2 minutes idle timeout

let userId = localStorage.getItem('sd_user_id'); // current user id
let lastActivity = Date.now();
let tabSwitchCount = 0;

// --------------------------
// ✅ Update user activity (online)
// --------------------------
async function updateActive() {
  if (!userId) return;
  lastActivity = Date.now();
  try {
    await supabase.from('user_activity').upsert(
      {
        user_id: userId,
        is_online: true,
        last_active_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      { onConflict: 'user_id' }
    );
  } catch (err) {
    console.error('Failed updating activity:', err);
  }
}

// --------------------------
// ✅ Mark user as offline
// --------------------------
async function setOffline() {
  if (!userId) return;
  try {
    await supabase
      .from('user_activity')
      .update({
        is_online: false,
        updated_at: new Date().toISOString(),
        tab_switch_count: tabSwitchCount
      })
      .eq('user_id', userId);
  } catch (err) {
    console.error('Failed setting offline:', err);
  }
}

// --------------------------
// ✅ Presence initializer
// --------------------------
function initPresence() {
  if (!userId) {
    console.warn('User not logged in; skipping presence tracking.');
    return;
  }

  updateActive();

  // Listen for user actions
  ['mousemove', 'keydown', 'click', 'scroll'].forEach((evt) =>
    document.addEventListener(evt, updateActive)
  );

  // Tab switch detection
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'hidden') {
      tabSwitchCount++;
      await setOffline();
    } else {
      await updateActive();
    }
  });

  // Window blur/focus
  window.addEventListener('blur', () => {
    tabSwitchCount++;
    setTimeout(setOffline, 0);
  });
  window.addEventListener('focus', () => {
    setTimeout(updateActive, 0);
  });

  // Handle tab close / reload
  window.addEventListener('beforeunload', () => {
    try {
      const payload = {
        is_online: false,
        updated_at: new Date().toISOString(),
        tab_switch_count: tabSwitchCount
      };
      const url = `${SUPABASE_URL}/rest/v1/user_activity?user_id=eq.${userId}`;
      fetch(url, {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify(payload),
        keepalive: true
      });
    } catch (e) {
      console.warn('Failed during unload:', e);
    }
  });

  // Regular heartbeat check
  setInterval(() => {
    if (Date.now() - lastActivity > IDLE_TIMEOUT) {
      setOffline();
      return;
    }
    updateActive();
  }, PRESENCE_UPDATE_INTERVAL);

  console.log('✅ Presence tracking initialized');
}

// --------------------------
// ✅ Monitoring dashboard
// --------------------------
async function loadMonitoring() {
  const tbody = document.getElementById('monTbody');
  const totalEl = document.getElementById('monTotalUsers');
  const onlineEl = document.getElementById('monOnlineUsers');
  if (!tbody || !totalEl || !onlineEl) return;

  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:1rem;">Loading...</td></tr>`;

  try {
    const { data: users, error: userErr } = await supabase
      .from('users')
      .select('id, full_name, role_badge, is_dev');
    if (userErr) throw userErr;

    const { data: activity, error: actErr } = await supabase.from('user_activity').select('*');
    if (actErr) throw actErr;

    const activityMap = {};
    (activity || []).forEach((a) => (activityMap[a.user_id] = a));

    const rows = (users || []).map((u) => {
      const a = activityMap[u.id] || {};
      const online = a.is_online;
      const lastActive = a.last_active_at ? new Date(a.last_active_at).toLocaleString() : '-';
      return `
        <tr>
          <td style="padding:.5rem;border-bottom:1px solid #eee;">${u.full_name || 'Unknown'}</td>
          <td style="padding:.5rem;border-bottom:1px solid #eee;">${
            u.role_badge || (u.is_dev ? 'developer' : 'student')
          }</td>
          <td style="color:${online ? 'green' : '#999'};font-weight:500;">
            ${online ? '🟢 Online' : '⚫ Offline'}
          </td>
          <td style="padding:.5rem;border-bottom:1px solid #eee;">${lastActive}</td>
          <td style="padding:.5rem;border-bottom:1px solid #eee;">${a.tab_switch_count || 0}</td>
          <td style="padding:.5rem;border-bottom:1px solid #eee;">${a.page_blur_count || 0}</td>
        </tr>`;
    });

    tbody.innerHTML =
      rows.join('') ||
      `<tr><td colspan="6" style="text-align:center;padding:1rem;">No users found</td></tr>`;

    totalEl.textContent = users.length;
    onlineEl.textContent = (activity || []).filter((a) => a.is_online).length;
  } catch (err) {
    console.error('Monitoring load failed:', err);
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:red;padding:1rem;">Error loading data</td></tr>`;
  }
}

// --------------------------
// ✅ Auto-refresh monitoring
// --------------------------
setInterval(() => {
  const section = document.getElementById('section-monitoring');
  if (section && section.classList.contains('active')) loadMonitoring();
}, 20000);

// --------------------------
// ✅ Start everything
// --------------------------
initPresence();
loadMonitoring();

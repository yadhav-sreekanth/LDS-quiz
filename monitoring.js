// ==========================
// ✅ Robust Presence & Monitoring Logic
// ==========================

const PRESENCE_UPDATE_INTERVAL = 30 * 1000; // 30s update
const IDLE_TIMEOUT = 2 * 60 * 1000; // 2min idle timeout

let userId = localStorage.getItem('sd_user_id'); // get current user
let lastActivity = Date.now();
let tabSwitchCount = 0;

// --------------------------
// Update last activity to Supabase
// --------------------------
async function updateActive() {
  if (!userId) return;
  lastActivity = Date.now();
  try {
    await supabase.from('user_activity')
      .upsert({
        user_id: userId,
        is_online: true,
        last_active_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
  } catch (err) {
    console.error("Failed updating activity:", err);
  }
}

// --------------------------
// Set user offline
// --------------------------
async function setOffline() {
  if (!userId) return;
  try {
    await supabase.from('user_activity')
      .update({ is_online: false, updated_at: new Date().toISOString(), tab_switch_count })
      .eq('user_id', userId);
  } catch (err) {
    console.error("Failed setting offline:", err);
  }
}

// --------------------------
// Initialize presence tracking
// --------------------------
function initPresence() {
  if (!userId) {
    console.warn("User not logged in; skipping presence tracking.");
    return;
  }

  // initial activity update
  updateActive();

  // Track mouse, keyboard, and clicks
  ['mousemove', 'keydown', 'click'].forEach(evt =>
    document.addEventListener(evt, updateActive)
  );

  // Track tab visibility
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
    setOffline();
  });
  window.addEventListener('focus', updateActive);

  // Before unload
  window.addEventListener('beforeunload', () => {
    navigator.sendBeacon(
      `${SUPABASE_URL}/rest/v1/user_activity?user_id=eq.${userId}`,
      JSON.stringify({ is_online: false, updated_at: new Date().toISOString(), tab_switch_count })
    );
  });

  // Periodically check idle users
  setInterval(() => {
    if (Date.now() - lastActivity > IDLE_TIMEOUT) {
      setOffline();
    } else {
      updateActive();
    }
  }, PRESENCE_UPDATE_INTERVAL);

  console.log("✅ Presence tracking initialized");
}

// --------------------------
// Load monitoring table
// --------------------------
async function loadMonitoring() {
  const tbody = document.getElementById('monTbody');
  const totalEl = document.getElementById('monTotalUsers');
  const onlineEl = document.getElementById('monOnlineUsers');
  if (!tbody || !totalEl || !onlineEl) return;

  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:1rem;">Loading...</td></tr>`;

  try {
    const { data: users } = await supabase.from('users').select('id, full_name, role_badge, is_dev');
    const { data: activity } = await supabase.from('user_activity').select('*');

    const activityMap = {};
    (activity || []).forEach(a => activityMap[a.user_id] = a);

    const rows = (users || []).map(u => {
      const a = activityMap[u.id] || {};
      return `
        <tr>
          <td style="padding:.5rem;border-bottom:1px solid #eee;">${u.full_name || 'Unknown'}</td>
          <td style="padding:.5rem;border-bottom:1px solid #eee;">${u.role_badge || (u.is_dev ? 'developer' : 'student')}</td>
          <td style="padding:.5rem;border-bottom:1px solid #eee;">${a.is_online ? '🟢 Online' : '⚫ Offline'}</td>
          <td style="padding:.5rem;border-bottom:1px solid #eee;">${a.last_active_at ? new Date(a.last_active_at).toLocaleString() : '-'}</td>
          <td style="padding:.5rem;border-bottom:1px solid #eee;">${a.tab_switch_count || 0}</td>
          <td style="padding:.5rem;border-bottom:1px solid #eee;">${a.page_blur_count || 0}</td>
        </tr>`;
    });

    tbody.innerHTML = rows.join('') || `<tr><td colspan="6" style="text-align:center;padding:1rem;">No users found</td></tr>`;
    totalEl.textContent = users.length;
    onlineEl.textContent = (activity || []).filter(a => a.is_online).length;

  } catch (err) {
    console.error("Monitoring load failed:", err);
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:red;padding:1rem;">Error loading data</td></tr>`;
  }
}

// --------------------------
// Auto-refresh monitoring every 20s
// --------------------------
setInterval(() => {
  const section = document.getElementById('section-monitoring');
  if (section && section.classList.contains('active')) loadMonitoring();
}, 20000);

// --------------------------
// Initialize everything
// --------------------------
initPresence();
loadMonitoring();

// ==========================
// ✅ Presence & Monitoring Logic
// ==========================

// 🔹 Initialize presence tracker for current logged-in user
async function initPresenceAndActivity() {
  if (!userId) return;

  // Create or update online record
  await supabase.from('user_activity').upsert({
    user_id: userId,
    is_online: true,
    last_active_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  const updateActive = async () => {
    await supabase.from('user_activity')
      .update({
        is_online: true,
        last_active_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);
  };

  ['mousemove', 'keydown', 'click'].forEach(evt =>
    document.addEventListener(evt, updateActive)
  );

  let tabSwitchCount = 0;
  window.addEventListener('blur', async () => {
    tabSwitchCount++;
    await supabase.from('user_activity')
      .update({
        is_online: false,
        tab_switch_count: tabSwitchCount,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);
  });

  window.addEventListener('focus', async () => {
    await updateActive();
  });

  window.addEventListener('beforeunload', async () => {
    try {
      await supabase.from('user_activity')
        .update({
          is_online: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
    } catch (_) {}
  });

  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'hidden') {
      await supabase.from('user_activity')
        .update({
          is_online: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
    } else if (document.visibilityState === 'visible') {
      await updateActive();
    }
  });

  console.log("✅ Presence tracking initialized");
}

// 🔹 Auto offline after 2 minutes of inactivity
async function markIdleUsersOffline() {
  const cutoff = Date.now() - 2 * 60 * 1000;
  const { data: active } = await supabase
    .from('user_activity')
    .select('user_id, last_active_at')
    .eq('is_online', true);

  if (!active) return;
  const offlineIds = active
    .filter(u => new Date(u.last_active_at).getTime() < cutoff)
    .map(u => u.user_id);

  if (offlineIds.length > 0) {
    await supabase.from('user_activity')
      .update({ is_online: false })
      .in('user_id', offlineIds);
  }
}
setInterval(markIdleUsersOffline, 120000);

// ==========================
// ✅ Monitoring Table Loader
// ==========================
async function loadMonitoring() {
  const tbody = document.getElementById('monTbody');
  const totalEl = document.getElementById('monTotalUsers');
  const onlineEl = document.getElementById('monOnlineUsers');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6" style="padding:1rem;text-align:center;">Loading...</td></tr>`;

  try {
    const { data: users } = await supabase
      .from('users')
      .select('id, full_name, role_badge, is_dev');
    const { data: activity } = await supabase
      .from('user_activity')
      .select('user_id, is_online, last_active_at, tab_switch_count, page_blur_count');

    const map = {};
    (activity || []).forEach(a => (map[a.user_id] = a));

    const rows = (users || []).map(u => {
      const a = map[u.id] || {};
      const active = a.is_online ? '🟢 Online' : '⚫ Offline';
      const last = a.last_active_at
        ? new Date(a.last_active_at).toLocaleString()
        : '-';
      return `
        <tr>
          <td style="padding:.5rem;border-bottom:1px solid #eee;">${u.full_name || 'Unknown'}</td>
          <td style="padding:.5rem;border-bottom:1px solid #eee;">${u.role_badge || (u.is_dev ? 'developer' : 'student')}</td>
          <td style="padding:.5rem;border-bottom:1px solid #eee;">${active}</td>
          <td style="padding:.5rem;border-bottom:1px solid #eee;">${last}</td>
          <td style="padding:.5rem;border-bottom:1px solid #eee;">${a.tab_switch_count || 0}</td>
          <td style="padding:.5rem;border-bottom:1px solid #eee;">${a.page_blur_count || 0}</td>
        </tr>`;
    });

    tbody.innerHTML = rows.join('') || `<tr><td colspan="6" style="padding:1rem;text-align:center;">No users found</td></tr>`;
    totalEl.textContent = users.length;
    onlineEl.textContent = (activity || []).filter(a => a.is_online).length;
  } catch (err) {
    console.error('Monitoring load failed:', err);
    tbody.innerHTML = `<tr><td colspan="6" style="padding:1rem;text-align:center;color:red;">Error loading data</td></tr>`;
  }
}

// Auto refresh every 20 sec
setInterval(() => {
  const section = document.getElementById('section-monitoring');
  if (section && section.classList.contains('active')) loadMonitoring();
}, 20000);

  // ============================
  // ✅ Monitoring Section Logic (Full Final Version)
  // ============================

  async function loadMonitoring() {
    const section = document.getElementById('section-monitoring');
    if (!section) return;

    // Clear existing content
    section.innerHTML = `
      <h2 class="section-title">User Monitoring</h2>
      <div id="monitoring-content">
        <p>Loading user activity...</p>
      </div>
      <div style="margin-top: 2rem;">
        <h3>Recent Admin Actions (Audit Log)</h3>
        <div id="audit-log">Loading...</div>
      </div>
    `;

    try {
      // ===== Fetch live user activity =====
      const { data: activity, error: actErr } = await supabase
        .from('user_activity')
        .select(
          'user_id, is_online, last_active_at, tab_switch_count, total_session_seconds, updated_at'
        )
        .order('updated_at', { ascending: false })
        .limit(50);

      if (actErr) throw actErr;

      // Load user details for better display
      const ids = activity.map((a) => a.user_id);
      let userMap = {};

      if (ids.length > 0) {
        const { data: users, error: userErr } = await supabase
          .from('users')
          .select(
            'id, full_name, email, role_badge, profile_photo, dob, weekly_points, total_points, followers_count, following_count'
          )
          .in('id', ids);

        if (userErr) throw userErr;

        users?.forEach((u) => (userMap[u.id] = u));
      }

      const content = document.getElementById('monitoring-content');

      if (!activity.length) {
        content.innerHTML = `<p style="color:gray;">No user activity records found.</p>`;
      } else {
        content.innerHTML = `
          <table class="monitor-table">
  <thead>
    <tr>
      <th data-sort="name">Name</th>
      <th data-sort="role">Role</th>
      <th data-sort="dob">DOB</th>
      <th data-sort="status">Status</th>
      <th data-sort="tab_switch_count">Tab Switches</th>
      <th data-sort="weekly_points">Weekly Points</th>
      <th data-sort="total_points">Total Points</th>
      <th data-sort="followers_count">Followers</th>
      <th data-sort="following_count">Following</th>
      <th data-sort="session">Session (sec)</th>
    </tr>
  </thead>

          <tbody>
    ${activity
      .map((a) => {
        const u = userMap[a.user_id] || {};
        const online = a.is_online ? '🟢 Online' : '⚪ Offline';
        const last = a.last_active_at ? new Date(a.last_active_at).toLocaleString() : '-';
        return `
        <tr>
          <td><img src="${u.profile_photo || 'https://via.placeholder.com/24'}" 
                  style="width:24px;height:24px;border-radius:50%;vertical-align:middle;margin-right:6px;">
              ${u.full_name || 'Unknown'}
          </td>
          <td>${u.role_badge || '-'}</td>
          <td>${u.dob || '-'}</td>
          <td>${online}</td>
          <td>${a.tab_switch_count ?? 0}</td>
          <td>${u.weekly_points ?? 0}</td>
          <td>${u.total_points ?? 0}</td>
          <td>${u.followers_count ?? 0}</td>
          <td>${u.following_count ?? 0}</td>
          <td>${a.total_session_seconds ?? 0}</td>
        </tr>`;
      })
      .join('')}
  </tbody>

          </table>
        `;
      }
      // === Add sorting feature with icons ===
      const table = content.querySelector('.monitor-table');
      let sortDirection = 1;
      let lastSorted = '';

      table.querySelectorAll('th[data-sort]').forEach((th) => {
        th.classList.add('sortable');
        th.addEventListener('click', () => {
          const key = th.getAttribute('data-sort');
          const tbody = table.querySelector('tbody');
          const rows = Array.from(tbody.rows);

          // toggle direction if same column
          if (lastSorted === key) sortDirection *= -1;
          else sortDirection = 1;
          lastSorted = key;

          // clear existing sort styles
          table
            .querySelectorAll('th')
            .forEach((t) => t.classList.remove('sorted-asc', 'sorted-desc'));

          // sort rows
          rows.sort((r1, r2) => {
            const t1 = r1.children[th.cellIndex].innerText.toLowerCase();
            const t2 = r2.children[th.cellIndex].innerText.toLowerCase();

            const n1 = parseFloat(t1.replace(/[^\d.-]/g, ''));
            const n2 = parseFloat(t2.replace(/[^\d.-]/g, ''));

            if (!isNaN(n1) && !isNaN(n2)) return (n1 - n2) * sortDirection;
            return t1.localeCompare(t2) * sortDirection;
          });

          // append sorted rows
          rows.forEach((r) => tbody.appendChild(r));

          // set icon direction
          th.classList.add(sortDirection === 1 ? 'sorted-asc' : 'sorted-desc');
        });
      });

      // ===== Fetch latest admin actions (audit log) =====
      const { data: audit, error: auditErr } = await supabase
        .from('admin_audit_log')
        .select('id, actor_id, target_user_id, action, details, created_at')
        .order('created_at', { ascending: false })
        .limit(20);

      if (auditErr) throw auditErr;

      const auditDiv = document.getElementById('audit-log');

      if (!audit.length) {
        auditDiv.innerHTML = `<p style="color:gray;">No admin audit records yet.</p>`;
      } else {
        const allIds = [
          ...new Set([...audit.map((a) => a.actor_id), ...audit.map((a) => a.target_user_id)])
        ];

        let uMap = {};
        if (allIds.length > 0) {
          const { data: relatedUsers, error: relErr } = await supabase
            .from('users')
            .select('id, full_name')
            .in('id', allIds);
          if (relErr) throw relErr;

          relatedUsers?.forEach((u) => (uMap[u.id] = u.full_name));
        }

        auditDiv.innerHTML = `
          <ul class="audit-list">
            ${audit
              .map(
                (a) => `
              <li>
                <strong>${uMap[a.actor_id] || 'Unknown'}</strong>
                performed <em>${a.action}</em>
                on <strong>${uMap[a.target_user_id] || 'N/A'}</strong>
                <br/>
                <small>${new Date(a.created_at).toLocaleString()}</small>
              </li>
            `
              )
              .join('')}
          </ul>
        `;
      }
    } catch (err) {
      console.error('Monitoring load failed:', err);
      document.getElementById(
        'monitoring-content'
      ).innerHTML = `<p style="color:red;">Error loading monitoring data.</p>`;
    }

    // Auto-refresh every 30 seconds
    setTimeout(loadMonitoring, 30000);
  }

  // ============================
  // ✅ Basic CSS Injection
  // ============================
  const style = document.createElement('style');
  style.textContent = `
  .monitor-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 1rem;
  }
  .monitor-table th, .monitor-table td {
    border: 1px solid #e0e0e0;
    padding: 8px;
    text-align: left;
  }
  .monitor-table th {
    background: #f8fafc;
  }
  .audit-list {
    list-style: none;
    padding-left: 0;
  }
  .audit-list li {
    border-bottom: 1px solid #eee;
    padding: 6px 0;
  }
  .section-title {
    margin-bottom: 10px;
  }
    th.sortable {
    cursor: pointer;
    position: relative;
    user-select: none;
    padding-right: 20px;
  }

  th.sortable::after {
    content: '⇅';
    position: absolute;
    right: 6px;
    color: #888;
    font-size: 0.8em;
    transition: 0.2s;
  }

  th.sorted-asc::after {
    content: '▲';
    color: #000;
  }

  th.sorted-desc::after {
    content: '▼';
    color: #000;
  }
  `;
  document.head.appendChild(style);

  // ============================
  // ✅ User Activity Tracker (Enhanced)
  // ============================
  const PRESENCE_INTERVAL = 30000; // update every 30s
  const IDLE_TIMEOUT = 120000; // 2 minutes idle
  const currentUserId = localStorage.getItem('sd_user_id');

  let lastActivity = Date.now();
  let tabSwitchCount = Number(localStorage.getItem('tabSwitchCount') || 0);
  let totalSessionSeconds = 0;
  let sessionTimer;

  async function updateUserActivity(isOnline = true) {
    if (!currentUserId) return;
    const now = new Date().toISOString();

    const { error } = await supabase.from('user_activity').upsert({
      user_id: currentUserId,
      is_online: isOnline,
      last_active_at: now,
      tab_switch_count: tabSwitchCount,
      total_session_seconds: totalSessionSeconds,
      updated_at: now
    });

    if (error) console.error('Failed to update user activity:', error);
  }

  // reset idle timer on any activity
  function resetActivity() {
    lastActivity = Date.now();
  }

  window.addEventListener('blur', () => {
    if (typeof quizInProgress !== 'undefined' && quizInProgress) {
      tabSwitchCount++;
      localStorage.setItem('tabSwitchCount', tabSwitchCount); // ✅ keep it persistent
      updateUserActivity(true);
    }
  });


  window.addEventListener('focus', resetActivity);
  window.addEventListener('mousemove', resetActivity);
  window.addEventListener('keydown', resetActivity);

  // update every 30s if not idle
  setInterval(() => {
    totalSessionSeconds += 30;
    const idle = Date.now() - lastActivity > IDLE_TIMEOUT;
    updateUserActivity(!idle);
  }, PRESENCE_INTERVAL);

  // mark offline when tab closed
  window.addEventListener('beforeunload', () => updateUserActivity(false));

  // first call immediately
  updateUserActivity(true);

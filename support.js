/* -------------------------
   🎧 Support System Logic (Enhanced)
------------------------- */

let currentThreadId = null;
let currentUser = null;

// 🧠 Initialize support UI after login
async function initSupportSection(user) {
  currentUser = user;
  
const isStaff = user.is_dev || ['staff', 'developer', 'teacher', 'principal', 'chairman',  'admin']
  .includes((user.role_badge || '').toLowerCase());

  if (isStaff) {
    document.getElementById('supportStaffPanel').style.display = 'block';
    loadAllSupportThreads();
  } else {
    document.getElementById('supportStudentPanel').style.display = 'block';
    loadOrCreateStudentThread(user);
  }
}

/* ---------------- STAFF SIDE ---------------- */
async function loadAllSupportThreads() {
  const { data: threads, error } = await supabase
    .from('support_threads')
    .select(`
      id, title, created_by(id, full_name, profile_photo, role_badge, total_points), last_message_at
    `)
    .order('last_message_at', { ascending: false });

  if (error) return console.error(error);

  const container = document.getElementById('supportThreads');
  container.innerHTML = '';

  if (!threads.length) {
    container.innerHTML = '<p style="text-align:center; padding:1rem;">No support messages yet</p>';
    return;
  }

  threads.forEach(t => {
    const div = document.createElement('div');
    div.className = 'support-thread';
    div.style.cssText = 'display:flex; align-items:center; gap:.6rem; padding:.6rem; border-bottom:1px solid #eee; cursor:pointer;';
    
    const avatar = document.createElement('img');
    avatar.src = t.created_by?.profile_photo || 'logonew.png';
    avatar.onerror = () => (avatar.src = 'logonew.png');
    avatar.style.cssText = 'width:36px; height:36px; border-radius:50%; object-fit:cover;';
    
    const info = document.createElement('div');
    info.innerHTML = `<b>${t.created_by?.full_name || 'Unknown User'}</b><br><small>${t.title}</small>`;
    
    div.appendChild(avatar);
    div.appendChild(info);
    div.onclick = () => {
      openSupportThread(t.id, t.created_by);
      showUserProfile(t.created_by);
    };
    container.appendChild(div);
  });
}

async function openSupportThread(threadId, userInfo) {
  currentThreadId = threadId;
  const { data: messages, error } = await supabase
    .from('support_messages')
    .select('*, sender:sender_id(id, full_name, profile_photo)')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  if (error) return console.error(error);

  const container = document.getElementById('supportMessages');
  container.innerHTML = '';
  messages.forEach(m => renderMessage(m, container));
}

/* ---------------- STUDENT SIDE ---------------- */
async function loadOrCreateStudentThread(user) {
  const { data: threads } = await supabase
    .from('support_threads')
    .select('id')
    .eq('created_by', user.id)
    .limit(1);

  let threadId = threads?.[0]?.id;
  if (!threadId) {
    const { data: newThread } = await supabase
      .from('support_threads')
      .insert({ created_by: user.id, title: `Support from ${user.full_name}` })
      .select()
      .single();
    threadId = newThread.id;

    await supabase.from('support_thread_participants').insert({
      thread_id: threadId,
      user_id: user.id,
      audience: 'user'
    });
  }

  currentThreadId = threadId;
  loadStudentMessages(threadId);
}

async function loadStudentMessages(threadId) {
  const { data: messages } = await supabase
    .from('support_messages')
    .select('*, sender:sender_id(id, full_name, profile_photo)')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  const container = document.getElementById('supportStudentMessages');
  container.innerHTML = '';
  messages.forEach(m => renderMessage(m, container));
}

/* ---------------- COMMON CHAT MESSAGE RENDER ---------------- */
function renderMessage(msg, container) {
  const isMine = msg.sender?.id === currentUser.id;
  const wrapper = document.createElement('div');
  wrapper.classList.add('chat-message', isMine ? 'mine' : 'theirs');

  const avatar = document.createElement('img');
  avatar.classList.add('chat-avatar');
  avatar.src = msg.sender?.profile_photo || 'logonew.png';
  avatar.onerror = () => (avatar.src = 'logonew.png');

  const body = document.createElement('div');
  body.classList.add('chat-body');

  const name = document.createElement('div');
  name.classList.add('chat-name');
  name.textContent = msg.sender?.full_name || 'User';

  const text = document.createElement('div');
  text.classList.add('chat-text');
  text.textContent = msg.body || '';

  body.appendChild(name);
  body.appendChild(text);

  // If media exists
  if (msg.media_url) {
    const link = document.createElement('a');
    link.href = msg.media_url;
    link.target = '_blank';
    link.textContent = `📎 ${msg.media_type}`;
    body.appendChild(link);
  }

  wrapper.appendChild(avatar);
  wrapper.appendChild(body);
  container.appendChild(wrapper);
  container.scrollTop = container.scrollHeight;
}

/* ---------------- SEND BUTTONS ---------------- */
document.getElementById('supportSendBtn').onclick = async () => {
  const input = document.getElementById('supportInput');
  const text = input.value.trim();
  if (!text || !currentThreadId) return;

  const { error } = await supabase.from('support_messages').insert({
    thread_id: currentThreadId,
    sender_id: currentUser.id,
    body: text
  });

  if (!error) {
    input.value = '';
    openSupportThread(currentThreadId, { full_name: currentUser.full_name });
  }
};

document.getElementById('supportStudentSend').onclick = async () => {
  const input = document.getElementById('supportStudentInput');
  const text = input.value.trim();
  if (!text || !currentThreadId) return;

  const { error } = await supabase.from('support_messages').insert({
    thread_id: currentThreadId,
    sender_id: currentUser.id,
    body: text
  });

  if (!error) {
    input.value = '';
    loadStudentMessages(currentThreadId);
  }
};

/* ---------------- PROFILE CARD ---------------- */
function showUserProfile(user) {
  const pic = document.getElementById('supportProfilePic');
  const name = document.getElementById('supportProfileName');
  const role = document.getElementById('supportProfileRole');
  const points = document.getElementById('supportProfilePoints');

  if (!user) return;

  const defaultLogo = 'logonew.png';
  pic.src = user.profile_photo && user.profile_photo.trim() !== '' ? user.profile_photo : defaultLogo;
  pic.onerror = () => (pic.src = defaultLogo);

  name.textContent = user.full_name || 'Unknown User';
  role.textContent = `Role: ${user.role_badge || 'Student'}`;
  points.textContent = `Points: ${user.total_points ?? 0}`;
}

/* ---------------- LIVE UPDATES ---------------- */
supabase.channel('support_live')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages' }, payload => {
    if (payload.new.thread_id === currentThreadId) {
      const container = document.getElementById('supportMessages') || document.getElementById('supportStudentMessages');
      renderMessage(payload.new, container);
    }
  })
  .subscribe();
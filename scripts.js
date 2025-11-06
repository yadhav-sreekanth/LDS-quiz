        // Initialize Supabase
        const SUPABASE_URL = "https://qcvbqizwmhtuinpqtbzz.supabase.co";
        const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmJxaXp3bWh0dWlucHF0Ynp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1OTgyMjIsImV4cCI6MjA3MzE3NDIyMn0.cSRjn0n1MowMMkILc-WEuotSN2Cj78jpbxJhtEqRjl4";
        const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        // Initialize user data
        let userId = null;
        let userProfile = null;

        
        // Questions are loaded from questions.json at runtime
        let questionBanks = null;

        // Utility: determine quiz type from DOB (yyyy)
        function determineQuizTypeFromDOB(dobString) {
            if (!dobString) return 'lower_primary';
            const y = new Date(dobString).getFullYear();
            if (y === 2016 || y === 2015) return 'early_years';
            if (y === 2014 || y === 2013) return 'lower_primary';
            if ([2012, 2011, 2010].includes(y)) return 'upper_primary';
            if (y <= 2009) return 'cbse';
            return 'lower_primary';
        }

        // Role gating helpers placed near top-level helpers
        function hasMonitoringPower() {
            const inferred = Array.isArray(userProfile?.leaderboard_badges) && userProfile.leaderboard_badges[0] ? String(userProfile.leaderboard_badges[0]).toLowerCase() : '';
            const role = (userProfile?.role_badge || inferred || '').toLowerCase();
            if (!role) return false;
            // Only developer, official, teacher should see Monitoring
            return ['developer','official','chairman', 'senior_principal','teacher'].includes(role) || !!userProfile?.is_dev || ((userProfile?.email||'').toLowerCase()==='yadhavvsreelakam@gmail.com');
        }

        function canStartQuizByRole() {
            const inferred = Array.isArray(userProfile?.leaderboard_badges) && userProfile.leaderboard_badges[0] ? String(userProfile.leaderboard_badges[0]).toLowerCase() : '';
            const role = (userProfile?.role_badge || inferred || '').toLowerCase();
            if (!role) return true;
            if (role === 'developer' || !!userProfile?.is_dev || ((userProfile?.email||'').toLowerCase()==='yadhavvsreelakam@gmail.com')) return true;
            if (['principal','senior_principal','chairman','official'].includes(role)) return false;
            return true;
        }

        function updateNavAndQuizVisibility() {
            try {
                const navMon = document.getElementById('nav-monitoring');
                if (navMon) navMon.style.display = hasMonitoringPower() ? '' : 'none';
                const devNav = document.getElementById('nav-developer');
                if (devNav) devNav.style.display = hasDevPowers() ? '' : 'none';
                const devSection = document.getElementById('section-developer');
                if (devSection) devSection.style.display = hasDevPowers() ? '' : 'none';
                const allowed = canStartQuizByRole();
                if (startQuizBtn) {
                    startQuizBtn.disabled = !allowed;
                    startQuizBtn.title = allowed ? '' : 'Your role cannot start quizzes';
                }
            } catch (_) {}
        }

        // Fisher–Yates shuffle (pure)
        function shuffleArray(arr) {
            const a = arr.slice();
            for (let i = a.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                const tmp = a[i];
                a[i] = a[j];
                a[j] = tmp;
            }
            return a;
        }

        function getSeenQuestionsSet(uid, quizType) {
            const raw = localStorage.getItem('seen_questions');
            let data = {};
            try { data = raw ? JSON.parse(raw) : {}; } catch (_) { data = {}; }
            const arr = ((data[uid] || {})[quizType] || []);
            return new Set(arr.map(String));
        }

        function appendSeenQuestions(uid, quizType, ids) {
            if (!Array.isArray(ids) || ids.length === 0) return;
            const raw = localStorage.getItem('seen_questions');
            let data = {};
            try { data = raw ? JSON.parse(raw) : {}; } catch (_) { data = {}; }
            if (!data[uid]) data[uid] = {};
            const existing = new Set(((data[uid][quizType]) || []).map(String));
            ids.forEach(id => existing.add(String(id)));
            const kept = Array.from(existing).slice(-1000);
            data[uid][quizType] = kept;
            localStorage.setItem('seen_questions', JSON.stringify(data));
        }
        // DOM references
        const userNameEl = document.getElementById('userName');
        const userPointsEl = document.getElementById('userPoints');
        const profilePhotoEl = document.getElementById('profilePhoto');
        const mobileUserNameEl = document.getElementById('mobileUserName');
        const mobileUserPointsEl = document.getElementById('mobileUserPoints');
        const mobileProfilePhotoEl = document.getElementById('mobileProfilePhoto');
        const settingsProfilePhotoEl = document.getElementById('settingsProfilePhoto');
        const nameInputEl = document.getElementById('nameInput');
        const emailInputEl = document.getElementById('emailInput');
        const dobInputEl = document.getElementById('dobInput');

        const quizIntroEl = document.getElementById('quizIntro');
        const quizContainerEl = document.getElementById('quizContainer');
        const quizTitleEl = document.getElementById('quizTitle');
        const quizProgressEl = document.getElementById('quizProgress');
        const questionTextEl = document.getElementById('questionText');
        const optionsListEl = document.getElementById('optionsList');
        const timerCircleEl = document.getElementById('timerCircle');
        const timerTextEl = document.getElementById('timerText');
        const nextBtn = document.getElementById('nextBtn');
        const startQuizBtn = document.getElementById('startQuizBtn');
        const quizResultEl = document.getElementById('quizResult');
        const finalScoreEl = document.getElementById('finalScore');
        const retryQuizBtn = document.getElementById('retryQuizBtn');
        const backToMenuBtn = document.getElementById('backToMenuBtn');

        let currentQuiz = null;
        let currentAttemptId = null;
        let currentQuestionIndex = 0;
        let currentScore = 0;
        let quizQuestions = [];
        let timerInterval = null;
        const QUESTION_TIME = 20;
        let timeLeft = QUESTION_TIME;
        const QUIZ_LENGTH_DEFAULT = 20; // target number of questions per quiz

        // Initialize the application
        document.addEventListener('DOMContentLoaded', async function() {
            // Check for user session
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
                alert('No user session found. Please login.');
                window.location.href = 'index.html';
                return;
            }
            
            userId = session.user.id;
            
            // Always fetch the latest profile from Supabase to avoid stale local cache
            let userData = JSON.parse(localStorage.getItem('userData') || '{}');
            try {
                const { data, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', userId)
                    .single();
                if (error || !data) {
                    // Create minimal default then upsert to ensure presence
                    const fresh = {
                        id: userId,
                        full_name: session.user.user_metadata?.name || 'Student',
                        dob: session.user.user_metadata?.dob || '2010-01-01',
                        total_points: 0,
                        profile_photo: 'logonew.png'
                    };
                    await ensureUserExists(fresh);
                    userProfile = { ...fresh, email: session.user.email };
                } else {
                    userProfile = { ...data, email: session.user.email };
                }
            } catch (e) {
                console.warn('Profile fetch failed, using local cache if present', e);
                if (userData[userId]) {
                    userProfile = { ...userData[userId], email: session.user.email };
                }
            }
            // Persist fresh profile to local cache and render
            userData[userId] = userProfile;
            localStorage.setItem('userData', JSON.stringify(userData));
            // Hydrate roles from user_roles if present and then render
            try { await hydrateRolesForCurrentUser(); } catch (_) {}
            renderUserSummary(userProfile);
            
            // Navigation functionality
            document.querySelectorAll('.nav-item').forEach(item => {
                item.addEventListener('click', function() {
                    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                    this.classList.add('active');
                    
                    const section = this.dataset.section;
                    document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
                    document.getElementById(`section-${section}`).classList.add('active');
                    
                    // Load section content if needed
                    if (section === 'leaderboard') loadLeaderboard('global');
                    if (section === 'posts') loadPosts();
                    if (section === 'announcements') loadAnnouncements();
                    if (section === 'account') loadAccount();
                    if (section === 'developer') ensureDeveloperVisibleAndInit();
                    if (section === 'monitoring') loadMonitoring();
                    if (section === 'support') initSupportSection(userProfile);

                });
            });

            // My Space header settings shortcut
            const openSettingsBtn = document.getElementById('openSettingsBtn');
            if (openSettingsBtn) {
                openSettingsBtn.onclick = () => {
                    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                    document.querySelector('.nav-item[data-section="settings"]').classList.add('active');
                    document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
                    document.getElementById('section-settings').classList.add('active');
                };
            }
            
            // Mobile nav toggle
            document.querySelector('.nav-toggle').addEventListener('click', function() {
                document.getElementById('sidebar').classList.toggle('open');
            });
            
            // Start quiz button
            startQuizBtn.addEventListener('click', startQuiz);
            
            // Next question button
            nextBtn.addEventListener('click', handleNextQuestion);
            
            // Quiz result buttons
            retryQuizBtn.addEventListener('click', startQuiz);
            backToMenuBtn.addEventListener('click', () => {
                quizResultEl.style.display = 'none';
                quizIntroEl.style.display = 'block';
            });
            
            // Leaderboard tabs
            document.querySelectorAll('.leaderboard-tab').forEach(tab => {
                tab.addEventListener('click', function() {
                    document.querySelectorAll('.leaderboard-tab').forEach(t => t.classList.remove('active'));
                    this.classList.add('active');
                    loadLeaderboard(this.dataset.category);
                });
            });
            
            // Post functionality
            document.getElementById('postBtn').addEventListener('click', createPost);
            // Announcement functionality
            const announceBtn = document.getElementById('announcePostBtn');
            if (announceBtn) announceBtn.addEventListener('click', createAnnouncement);
            
            // Settings functionality
            document.getElementById('saveProfileBtn').addEventListener('click', saveProfile);
            document.getElementById('logoutBtn').addEventListener('click', logout);
            document.getElementById('deleteAccountBtn').addEventListener('click', deleteAccount);

            // Profile photo: instant upload on select
            const photoInput = document.getElementById('photoInput');
            if (photoInput) {
                photoInput.addEventListener('change', async (e) => {
                    const file = e.target.files && e.target.files[0];
                    if (!file) return;
                    try {
                        // Show local preview fast
                        const tmpUrl = URL.createObjectURL(file);
                        settingsProfilePhotoEl.src = tmpUrl;
                        profilePhotoEl.src = tmpUrl;
                        mobileProfilePhotoEl.src = tmpUrl;

                        // Upload and persist
                        const publicUrl = await uploadToBucket('avatars', file, `${userId}`);
                        const { error } = await supabase
                            .from('users')
                            .update({ profile_photo: publicUrl })
                            .eq('id', userId);
                        if (error) throw error;

                        // Update local profile and storage
                        userProfile.profile_photo = publicUrl;
                        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
                        userData[userId] = userProfile;
                        localStorage.setItem('userData', JSON.stringify(userData));

                        renderUserSummary(userProfile);
                        alert('Profile photo updated!');
                    } catch (err) {
                        console.error('Photo update failed:', err);
                        alert(err.message || 'Photo upload failed. Please try again.');
                        // revert preview if failed
                        renderUserSummary(userProfile);
                    }
                });

                // Click image to open chooser
                const clickableImgs = [settingsProfilePhotoEl, profilePhotoEl, mobileProfilePhotoEl].filter(Boolean);
                clickableImgs.forEach(img => {
                    img.addEventListener('click', () => photoInput.click());
                });
            }
            
            // Developer nav visibility
            ensureDeveloperVisibleAndInit();
            updateNavAndQuizVisibility?.();

            // Presence and activity tracking
            initPresenceAndActivity?.();
            
            // Initialize weekly points system
            await initializeWeeklyPoints();
            
            // Load initial data
            loadPosts();
            loadLeaderboard('global');
        });

        // Fetch latest user row and refresh UI/cache (can be called after updates)
        async function refreshCurrentUserFromDB() {
            if (!userId) return;
            try {
                const { data, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', userId)
                    .single();
                if (!error && data) {
                    userProfile = { ...userProfile, ...data };
                    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
                    userData[userId] = userProfile;
                    localStorage.setItem('userData', JSON.stringify(userData));
                    renderUserSummary(userProfile);
                }
            } catch (e) {
                console.warn('refreshCurrentUserFromDB failed', e);
            }
        }

        // Ensure a users row exists for this auth user (avoids FK errors)
        async function ensureUserExists(profileLike) {
            try {
                const payload = {
                    id: profileLike.id,
                    full_name: profileLike.full_name || 'Student',
                    dob: profileLike.dob || '2010-01-01',
                    profile_photo: profileLike.profile_photo || null,
                    total_points: profileLike.total_points || 0,
                    // optional flag to mark developer account in users table
                    is_dev: !!profileLike.is_dev
                };
                const { error } = await supabase
                    .from('users')
                    .upsert([payload], { onConflict: 'id', ignoreDuplicates: false });
                if (error) console.warn('ensureUserExists upsert warning:', error.message);
            } catch (e) {
                console.warn('ensureUserExists failed', e);
            }
        }

        // Stronger check: verify the row really exists
        async function assertUserRow(userIdToCheck) {
            const { data, error } = await supabase
                .from('users')
                .select('id')
                .eq('id', userIdToCheck)
                .maybeSingle();
            if (error) {
                console.warn('assertUserRow select error:', error);
            }
            return !!(data && data.id);
        }

        function renderUserSummary(profile) {
            const displayName = profile.full_name || 'Student';
            const isDev = (profile.email || '').toLowerCase() === 'yadhavvsreelakam@gmail.com' || profile.is_dev;
            const roleBadge = profile.role_badge || (isDev ? 'developer' : '');
            
            let badgeHtml = '';
if (roleBadge && roleBadge.toLowerCase() !== 'student') {
    const badgeClass = roleBadge.toLowerCase();
    badgeHtml = `<span class="dev-badge ${badgeClass}">${roleBadge.replace('_',' ').toUpperCase()}</span>`;
}

            
            userNameEl.innerHTML = `${displayName} ${badgeHtml}`;
            // Show weekly points in header (current week)
            userPointsEl.textContent = `Points: ${profile.total_points || 0}`;
            profilePhotoEl.src = profile.profile_photo || 'https://via.placeholder.com/48';
            
            mobileUserNameEl.innerHTML = `${displayName} ${badgeHtml}`;
            mobileUserPointsEl.textContent = `Points: ${profile.total_points || 0}`;
            mobileProfilePhotoEl.src = profile.profile_photo || 'https://via.placeholder.com/48';
            
            settingsProfilePhotoEl.src = profile.profile_photo || 'https://via.placeholder.com/80';
            nameInputEl.value = profile.full_name || '';
            emailInputEl.value = profile.email || '';
            dobInputEl.value = profile.dob || '';
            
            // Set quiz type based on DOB
            const quizType = determineQuizTypeFromDOB(profile.dob);
            quizTitleEl.textContent = `Quiz — ${quizType.replace('_', ' ').toUpperCase()}`;
            // Update nav visibility and quiz gating
            if (typeof updateNavAndQuizVisibility === 'function') {
                updateNavAndQuizVisibility();
            }
        }

        function hasDevPowers() {
            const emailIsDev = (userProfile && (userProfile.email || '').toLowerCase() === 'yadhavvsreelakam@gmail.com');
            const flaggedDev = !!userProfile?.is_dev;
            const inferred = Array.isArray(userProfile?.leaderboard_badges) && userProfile.leaderboard_badges[0] ? String(userProfile.leaderboard_badges[0]).toLowerCase() : '';
            const role = (userProfile?.role_badge || inferred || '').toLowerCase();
            const elevated = ['official','developer','principal','senior_principal','chairman','teacher'].includes(role);
            return emailIsDev || flaggedDev || elevated;
        }

        function hasAdminPowers() {
            const emailIsDev = (userProfile && (userProfile.email || '').toLowerCase() === 'yadhavvsreelakam@gmail.com');
            const flaggedDev = !!userProfile?.is_dev;
            const role = (userProfile?.role_badge || '').toLowerCase();
            const adminRoles = ['official','developer','principal','senior_principal','chairman'];
            return emailIsDev || flaggedDev || adminRoles.includes(role);
        }

        function ensureDeveloperVisibleAndInit() {
            const isDevEmail = hasDevPowers() && (userProfile?.role_badge || '').toLowerCase() === 'developer';
            const nav = document.getElementById('nav-developer');
            const section = document.getElementById('section-developer');
            if (nav) nav.style.display = isDevEmail ? '' : 'none';
            if (section) section.style.display = isDevEmail ? '' : 'none';
            if (!isDevEmail) return;
            // Bind developer buttons once
            const bind = () => {
                const ed = document.getElementById('devQuestionsEditor');
                const msg = document.getElementById('devQuestionsMsg');
                const loadBtn = document.getElementById('devLoadQuestionsBtn');
                const validateBtn = document.getElementById('devValidateBtn');
                const saveBtn = document.getElementById('devSaveQuestionsBtn');
                const clearSeenBtn = document.getElementById('devClearSeenBtn');
                const ideaBtn = document.getElementById('devPostIdeaBtn');
                const addBtn = document.getElementById('devAddQuestionBtn');
                const ageSel = document.getElementById('devAgeGroup');
                const qInput = document.getElementById('devQuestionText');
                const opt1 = document.getElementById('devOpt1');
                const opt2 = document.getElementById('devOpt2');
                const opt3 = document.getElementById('devOpt3');
                const opt4 = document.getElementById('devOpt4');
                const correctSel = document.getElementById('devCorrectOption');
                const grantBtn = document.getElementById('devGrantPowerBtn');
                const revokeBtn = document.getElementById('devRevokePowerBtn');
                const grantEmail = document.getElementById('devGrantEmail');
                const roleSelect = document.getElementById('devRoleSelect');
                const powerMsg = document.getElementById('devPowerMsg');
                loadBtn.onclick = async () => {
  msg.textContent = '⏳ Loading questions.json from Supabase...';
  ed.value = ''; // clear editor first
  try {
    const content = await devLoadQuestionsFromStorage();

    if (content && content.trim().startsWith('{')) {
      ed.value = content;
      msg.textContent = '✅ Loaded successfully from Supabase Storage (config/questions.json)';
    } else if (content && content.trim().length > 0) {
      ed.value = content;
      msg.textContent = '⚠️ File loaded but not valid JSON — please fix before saving.';
    } else {
      ed.value = '{\n  "early_years": [],\n  "lower_primary": [],\n  "upper_primary": [],\n  "cbse": []\n}';
      msg.textContent = '⚠️ No valid file found. Default JSON inserted.';
    }
  } catch (e) {
    msg.textContent = `❌ Load failed: ${e.message || e}`;
    console.error('Developer Load Error:', e);
  }
};

                saveBtn.onclick = async () => {
                    try {
                        JSON.parse(ed.value || '{}');
                    } catch (e) {
                        msg.textContent = 'Fix JSON before saving: ' + (e.message || e);
                        return;
                    }
                    msg.textContent = 'Saving to Storage...';
                    const result = await devSaveQuestionsToStorage(ed.value);
                    if (result === true) {
                        msg.textContent = 'Saved to Storage successfully.';
                    } else if (typeof result === 'string') {
                        msg.textContent = 'Save failed: ' + result;
                    } else {
                        msg.textContent = 'Save failed.';
                    }
                    // refresh in-memory cache
                    sessionStorage.removeItem('questions_json');
                };
                clearSeenBtn.onclick = () => {
                    localStorage.removeItem('seen_questions');
                    msg.textContent = 'Cleared seen question cache.';
                };
                ideaBtn.onclick = async () => {
                    const title = (document.getElementById('devIdeaTitle').value || '').trim();
                    const body = (document.getElementById('devIdeaBody').value || '').trim();
                    const ideaMsg = document.getElementById('devIdeaMsg');
                    if (!title || !body) { ideaMsg.textContent = 'Title and description required.'; return; }
                    const { error } = await supabase.from('announcements').insert([{ title: `[Idea] ${title}`, body }]);
                    if (error) { ideaMsg.textContent = 'Failed: ' + error.message; return; }
                    ideaMsg.textContent = 'Idea posted!';
                    document.getElementById('devIdeaTitle').value = '';
                    document.getElementById('devIdeaBody').value = '';
                };
                addBtn.onclick = () => {
                    try {
                        const json = JSON.parse(ed.value || '{}');
                        const group = (ageSel.value || 'lower_primary');
                        if (!Array.isArray(json[group])) json[group] = [];
                        const arr = json[group];
                        const nextId = (arr.reduce((m, q) => Math.max(m, Number(q.id) || 0), 0) + 1) || 1;
                        const o1 = (opt1.value || '').trim();
                        const o2 = (opt2.value || '').trim();
                        const o3 = (opt3.value || '').trim();
                        const o4 = (opt4.value || '').trim();
                        const qt = (qInput.value || '').trim();
                        if (!qt || !o1 || !o2 || !o3 || !o4) { msg.textContent = 'Fill question and all four options.'; return; }
                        const correct = Number(correctSel.value);
                        const newQ = {
                            id: nextId,
                            question_text: qt,
                            options: [
                                { id: 1, text: o1 },
                                { id: 2, text: o2 },
                                { id: 3, text: o3 },
                                { id: 4, text: o4 }
                            ],
                            correct_option: correct
                        };
                        arr.push(newQ);
                        ed.value = JSON.stringify(json, null, 2);
                        msg.textContent = `Added to ${group} with id ${nextId}. Click Save to persist.`;
                        qInput.value = opt1.value = opt2.value = opt3.value = opt4.value = '';
                        correctSel.value = '1';
                    } catch (e) {
                        msg.textContent = 'Cannot add: fix the JSON or form. ' + (e.message || e);
                    }
                };
                grantBtn.onclick = async () => {
                    const query = (grantEmail.value || '').trim();
                    const role = (roleSelect.value || 'developer');
                    if (!query) { powerMsg.textContent = 'Enter a name or user id.'; return; }
                    powerMsg.textContent = 'Granting powers...';
                    try {
                        // Try by exact UUID first, else name search
                        let target = null;
                        const uuidRegex = /^[0-9a-fA-F-]{36}$/;
                        if (uuidRegex.test(query)) {
                            const { data } = await supabase.from('users').select('id, full_name').eq('id', query).maybeSingle();
                            if (data) target = data;
                        }
                        if (!target) {
                            const { data } = await supabase.from('users').select('id, full_name').ilike('full_name', query).limit(1);
                            if (data && data[0]) target = data[0];
                        }

if (!target) {
  powerMsg.textContent =
    '⚠️ User not found in users table. Ask the user to log in once, then try again.';
  return;
}


                        let rpcErr = null;
                        try {
                            await supabase.rpc('grant_roles_sync', { p_user_id: target.id, p_roles: ['dev','developer'].includes(role) ? ['dev'] : [role] });
                        } catch (e) { rpcErr = e; }
                        if (rpcErr) {
                            const { error } = await supabase
                                .from('users')
                                .update({ 
                                    is_dev: role === 'developer' || role === 'dev',
                                    role_badge: role,
                                    role_granted_by: userId,
                                    role_granted_at: new Date().toISOString(),
                                    leaderboard_badges: [role]
                                })
                                .eq('id', target.id);
                            if (error) { powerMsg.textContent = 'Failed to grant: ' + error.message; return; }
                        }
                        powerMsg.textContent = `Granted ${role} to ${target.full_name}.`;
                        grantEmail.value = '';
                    } catch (e) {
                        powerMsg.textContent = 'Error granting: ' + (e.message || e);
                    }
                };
                revokeBtn.onclick = async () => {
                    const query = (grantEmail.value || '').trim();
                    if (!query) { powerMsg.textContent = 'Enter a name or user id.'; return; }
                    powerMsg.textContent = 'Revoking powers...';
                    try {
                        let target = null;
                        const uuidRegex = /^[0-9a-fA-F-]{36}$/;
                        if (uuidRegex.test(query)) {
                            const { data } = await supabase.from('users').select('id, full_name').eq('id', query).maybeSingle();
                            if (data) target = data;
                        }
                        if (!target) {
                            const { data } = await supabase.from('users').select('id, full_name').ilike('full_name', query).limit(1);
                            if (data && data[0]) target = data[0];
                        }
if (!target) {
  powerMsg.textContent =
    '⚠️ User not found in users table. Ask the user to log in once, then try again.';
  return;
}

  let rpcErr = null;
                        try { await supabase.rpc('revoke_roles_sync', { p_user_id: target.id }); } catch (e) { rpcErr = e; }
                        if (rpcErr) {
                            const { error } = await supabase
                                .from('users')
                                .update({ 
                                    is_dev: false,
                                    role_badge: null,
                                    role_granted_by: null,
                                    role_granted_at: null,
                                    leaderboard_badges: null
                                })
                                .eq('id', target.id);
                            if (error) { powerMsg.textContent = 'Failed to revoke: ' + error.message; return; }
                        }
                        powerMsg.textContent = `Revoked roles from ${target.full_name}.`;
                        grantEmail.value = '';
                    } catch (e) {
                        powerMsg.textContent = 'Error revoking: ' + (e.message || e);
                    }
                };
                // Also bind Manage Users panel
                try { bindAdminManageUsers(); } catch (_) {}
            };
            bind();
        }

        async function devLoadQuestionsFromStorage() {
            try {
                const { data, error } = await supabase.storage.from('config').download('questions.json');
                if (error) throw error;
                const text = await data.text();
                return text;
            } catch (_) {
                try {
                    const res = await fetch('questions.json', { cache: 'no-cache' });
                    return await res.text();
                } catch (e) { return ''; }
            }
        }

        async function devSaveQuestionsToStorage(text) {
            try {
                const blob = new Blob([text], { type: 'application/json' });
                // upsert to storage bucket 'config'
                const { data, error } = await supabase.storage.from('config').upload('questions.json', blob, { upsert: true, contentType: 'application/json' });
                if (error) throw error;
                return true;
            } catch (e) {
                console.warn('save questions failed', e);
                // bubble up readable message so UI can show it
                return (e && (e.message || e.error || e.statusText)) ? (e.message || e.error || e.statusText) : false;
            }
        }

        async function startQuiz() {
            if (!canStartQuizByRole?.()) {
                alert('Your role cannot start quizzes.');
                return;
            }
            const quizType = determineQuizTypeFromDOB(userProfile.dob);
            
            // Check attempt limit (max 5 in the last 7 days)
            const allowed = await checkAttemptLimit(userId, quizType);
            if (!allowed) {
                alert('You have reached the limit of 5 quizzes for this type in the last 7 days. Try later.');
                return;
            }
            
            // Prepare quiz session - get questions from appropriate JSON
            let allQuestions = await fetchQuestionsForQuiz(quizType);
            if (allQuestions.length === 0) {
                alert('No questions available at the moment.');
                return;
            }
            // Remove seen questions until pool is exhausted; otherwise fall back to full pool
            const seenSet = getSeenQuestionsSet(userId, quizType);
            const unseen = allQuestions.filter(q => !seenSet.has(String(q.id)));
            const pickFrom = unseen.length > 0 ? unseen : allQuestions;
            const desiredCount = Math.min(QUIZ_LENGTH_DEFAULT, pickFrom.length);
            quizQuestions = shuffleArray(pickFrom).slice(0, desiredCount).map(q => ({
                ...q,
                options: shuffleArray((q.options || []).slice())
            }));
            
            currentQuestionIndex = 0;
            currentScore = 0;
            
            // Show quiz container and hide intro
            quizIntroEl.style.display = 'none';
            quizContainerEl.style.display = 'block';
            quizResultEl.style.display = 'none';
            
            // Load first question
            renderQuestion();
        }

        async function fetchQuestionsForQuiz(quizType) {
            try {
                if (!questionBanks) {
                    // cache in sessionStorage to avoid repeated fetches
                    const cached = sessionStorage.getItem('questions_json');
                    if (cached) {
                        questionBanks = JSON.parse(cached);
                    } else {
                        // Try Supabase Storage first
                        try {
                            const { data } = await supabase.storage.from('config').download('questions.json');
                            const text = data ? await data.text() : null;
                            if (text) questionBanks = JSON.parse(text);
                        } catch (_) {}
                        if (!questionBanks) {
                        const res = await fetch('questions.json', { cache: 'no-cache' });
                        if (!res.ok) throw new Error('Failed to load questions.json');
                        questionBanks = await res.json();
                        }
                        sessionStorage.setItem('questions_json', JSON.stringify(questionBanks));
                    }
                }
            } catch (e) {
                console.error('Failed fetching questions.json:', e);
                questionBanks = questionBanks || {};
            }
            return (questionBanks[quizType] || []).slice();
        }

        function renderQuestion() {
            const q = quizQuestions[currentQuestionIndex];
            quizProgressEl.textContent = `${currentQuestionIndex + 1} / ${quizQuestions.length}`;
            questionTextEl.textContent = q.question_text;
            optionsListEl.innerHTML = '';
            
            // Parse options
            const opts = q.options;
            
            opts.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = 'option';
                btn.dataset.optId = opt.id;
                btn.innerText = opt.text;
                btn.addEventListener('click', () => selectOption(q.id, opt.id));
                optionsListEl.appendChild(btn);
            });
            
            // Reset and start timer
            nextBtn.disabled = true;
            timeLeft = QUESTION_TIME;
            timerTextEl.textContent = timeLeft;
            updateTimerCircle();
            startTimer();
        }

        function selectOption(questionId, optionId) {
            // Mark selected option visually
            document.querySelectorAll('.option').forEach(opt => opt.classList.remove('selected'));
            const selectedOpt = document.querySelector(`.option[data-opt-id="${optionId}"]`);
            if (selectedOpt) selectedOpt.classList.add('selected');
            
            // Enable next button
            nextBtn.disabled = false;
            
            // Store selection
            nextBtn.dataset.questionId = questionId;
            nextBtn.dataset.selected = optionId;
        }

        function startTimer() {
            // Clear any existing timer
            stopTimer();
            
            // Start countdown
            timerInterval = setInterval(() => {
                timeLeft--;
                timerTextEl.textContent = timeLeft;
                updateTimerCircle();
                
                if (timeLeft <= 0) {
                    stopTimer();
                    // Time's up - submit no answer
                    const q = quizQuestions[currentQuestionIndex];
                    handleAnswer(q.id, null);
                }
            }, 1000);
        }

        function updateTimerCircle() {
            const percentage = (timeLeft / QUESTION_TIME) * 100;
            timerCircleEl.style.background = `conic-gradient(var(--secondary) ${percentage}%, #eee ${percentage}%)`;
        }

        function stopTimer() {
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
        }

        function handleNextQuestion() {
            const questionId = nextBtn.dataset.questionId;
            const selectedOptionId = nextBtn.dataset.selected;
            handleAnswer(questionId, selectedOptionId);
        }

        function handleAnswer(questionId, selectedOptionId) {
            stopTimer();
            
            const q = quizQuestions.find(x => x.id == questionId);
            const correct = (q.correct_option == selectedOptionId);
            const points = correct ? 2 : -1;
            currentScore += points;
            
            // Move to next question or finish quiz
            if (currentQuestionIndex >= quizQuestions.length - 1) {
                finalizeAttempt();
            } else {
                currentQuestionIndex++;
                renderQuestion();
            }
        }

        function finalizeAttempt() {
            // Update user's total points and weekly points
            const newTotal = (userProfile.total_points || 0) + currentScore;
            const newWeeklyTotal = (userProfile.weekly_points || 0) + currentScore;
            userProfile.total_points = newTotal;
            userProfile.weekly_points = newWeeklyTotal;
            
            // Update UI with weekly points in header (current week)
            userPointsEl.textContent = `Points: ${newWeeklyTotal}`;
            mobileUserPointsEl.textContent = `Points: ${newWeeklyTotal}`;
            
            // Save to localStorage
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            userData[userId] = userProfile;
            localStorage.setItem('userData', JSON.stringify(userData));
            
            // Update in Supabase
            supabase
                .from('users')
                .update({ 
                    total_points: newTotal,
                    weekly_points: newWeeklyTotal
                })
                .eq('id', userId)
                .then(({ error }) => {
                    if (error) console.error('Error updating points:', error);
                });
            
            // Awards: check flawless (no wrong answers) and milestones
            try {
                const totalQuestions = quizQuestions.length;
                const flawless = currentScore === totalQuestions * 2; // 2 points each
                if (flawless) {
                    awaitRecordAward({ type: 'flawless_quiz', label: 'No Wrong Answers' });
                }
                if (newTotal >= 10) awaitRecordAward({ type: 'milestone_10', label: '10 Points Milestone' });
                if (newTotal >= 30) awaitRecordAward({ type: 'milestone_30', label: '30 Points Milestone' });
                if (newTotal >= 60) awaitRecordAward({ type: 'milestone_60', label: '60 Points Milestone' });
            } catch (e) { console.warn('award check failed', e); }
            
            // Record this attempt to prevent repetition
            recordQuizAttempt(userProfile.dob);
            // Persist seen question ids for this user/type to avoid repeats on next quiz
            try {
                const quizType = determineQuizTypeFromDOB(userProfile.dob);
                const ids = quizQuestions.map(q => String(q.id));
                appendSeenQuestions(userId, quizType, ids);
            } catch (e) { console.warn('store seen questions failed', e); }
            
            // Show results and hide quiz
            quizContainerEl.style.display = 'none';
            quizResultEl.style.display = 'block';
            finalScoreEl.textContent = currentScore;
        }

        // Store award if table exists; ignore errors silently
        async function awaitRecordAward(award) {
            try {
                await supabase.from('awards').insert([{ user_id: userId, type: award.type, label: award.label }]);
            } catch (_) {}
        }

        function recordQuizAttempt(dob) {
            const quizType = determineQuizTypeFromDOB(dob);
            const attempts = JSON.parse(localStorage.getItem('quizAttempts') || '{}');
            if (!attempts[userId]) attempts[userId] = {};
            let list = attempts[userId][quizType];
            // Migration: previously stored as an object keyed by weekNumber; now use timestamp array
            if (!Array.isArray(list)) list = [];
            const nowTs = Date.now();
            const sevenDaysAgo = nowTs - 7 * 24 * 60 * 60 * 1000;
            // Push and prune to last 7 days and cap length
            list.push(nowTs);
            list = list.filter(ts => Number(ts) > sevenDaysAgo).slice(-50);
            attempts[userId][quizType] = list;
            localStorage.setItem('quizAttempts', JSON.stringify(attempts));
        }

        async function checkAttemptLimit(userId, quizType) {
            const attempts = JSON.parse(localStorage.getItem('quizAttempts') || '{}');
            const list = Array.isArray(attempts[userId]?.[quizType]) ? attempts[userId][quizType] : [];
            const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
            const recentCount = list.filter(ts => Number(ts) > sevenDaysAgo).length;
            // Allow up to 5 attempts in the last 7 days
            return recentCount < 5;
        }

        // Weekly points reset functionality
        function getCurrentWeekNumber() {
            const now = new Date();
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            const days = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000));
            return Math.ceil((days + startOfYear.getDay() + 1) / 7);
        }

        function isSunday() {
            return new Date().getDay() === 0;
        }

        function getWeekStartDate() {
            const now = new Date();
            const day = now.getDay();
            const diff = now.getDate() - day;
            return new Date(now.setDate(diff));
        }

        async function checkAndResetWeeklyPoints() {
            const currentWeek = getCurrentWeekNumber();
            const lastResetWeek = localStorage.getItem('lastPointsResetWeek');
            
            if (lastResetWeek !== currentWeek.toString()) {
                // Reset weekly points for all users
                await resetAllUsersWeeklyPoints();
                localStorage.setItem('lastPointsResetWeek', currentWeek.toString());
                console.log('Weekly points reset completed for week', currentWeek);
            }
        }

        async function resetAllUsersWeeklyPoints() {
            try {
                // Update all users to reset their weekly_points
                const { error } = await supabase
                    .from('users')
                    .update({ weekly_points: 0 })
                    .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all users
                
                if (error) {
                    console.error('Error resetting weekly points:', error);
                }
            } catch (e) {
                console.error('Failed to reset weekly points:', e);
            }
        }

        // Initialize weekly points tracking
        async function initializeWeeklyPoints() {
            await checkAndResetWeeklyPoints();
        }

        function getWeekNumber(date) {
            // kept for compatibility elsewhere; not used in limiter anymore
            const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
            const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
            return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        }

        async function loadPosts() {
            // Fetch posts with user info, ordered by pinned status first, then by date
            const { data: posts, error } = await supabase
                .from('posts')
                .select('id, user_id, content, image_path, created_at, is_pinned, users:users!posts_user_id_fkey(full_name, profile_photo, is_dev, role_badge, leaderboard_badges)')
                .order('is_pinned', { ascending: false })
                .order('created_at', { ascending: false });
            
            const container = document.getElementById('postsFeed');
            container.innerHTML = '';
            const isDevEmail = hasDevPowers();
            
            if (error) {
                console.error('Error loading posts:', error);
                container.innerHTML = '<p>Error loading posts. Please try again later.</p>';
                return;
            }
            
            if (posts.length === 0) {
                container.innerHTML = '<p>No posts yet. Be the first to share something!</p>';
                return;
            }
            
            posts.forEach(post => {
                const el = document.createElement('div');
                el.className = 'post';
                el.id = `post-${post.id}`;
                
                // Format date
                const postDate = new Date(post.created_at).toLocaleString();
                
                const displayName = (post.users && post.users.full_name) || 'User';
                const role = (post.users && (post.users.role_badge||'')) || '';
                const isDevOrRole = (post.users && (post.users.is_dev || (role.toLowerCase()==='developer')));
                const nameWithBadge = isDevOrRole
                    ? `${displayName} <span class="dev-badge developer">DEVELOPER</span>`
                    : displayName;
                el.innerHTML = `
                    <div class="post-head">
                        <img src="${(post.users && post.users.profile_photo) || 'logonew.png'}" />
                        <strong>${nameWithBadge}</strong>
                        <small>${postDate}</small>
                        ${post.is_pinned ? '<span class="pinned-badge"><i class="fas fa-thumbtack"></i> Pinned</span>' : ''}
                    </div>
                    <div class="post-body">
                        <p>${escapeHtml(post.content || '')}</p>
                        ${post.image_path ? `<img src="${post.image_path}" alt="post image" />` : ''}
                        <div class="post-actions">
                            <button class="like-btn" data-post-id="${post.id}" aria-pressed="false"><i class="fas fa-heart"></i> <span class="like-text">Like</span> <span class="like-count" aria-live="polite">0</span></button>
                            <button class="comment-btn" data-post-id="${post.id}"><i class="fas fa-comment"></i> Comment</button>
                            <button class="share-btn" data-post-id="${post.id}"><i class="fas fa-share"></i> Share</button>
                            ${isDevEmail ? `<button class="pin-btn" data-post-id="${post.id}" data-pinned="${post.is_pinned || false}"><i class="fas fa-thumbtack"></i> ${post.is_pinned ? 'Unpin' : 'Pin'}</button>` : ''}
                            ${(post.user_id === userId || isDevEmail) ? `<button class=\"delete-btn\" data-post-id=\"${post.id}\"><i class=\"fas fa-trash\"></i> Delete</button>` : ''}
                        </div>
                        <div class="comments-section" id="comments-${post.id}" style="display: none;">
                            <div class="comments-list" id="comments-list-${post.id}"></div>
                            <div class="comment-input">
                                <div class="emoji-picker">
                                    <button type="button" class="emoji-btn" data-post-id="${post.id}">😀</button>
                                    <button type="button" class="emoji-btn" data-post-id="${post.id}">😊</button>
                                    <button type="button" class="emoji-btn" data-post-id="${post.id}">👍</button>
                                    <button type="button" class="emoji-btn" data-post-id="${post.id}">❤️</button>
                                    <button type="button" class="emoji-btn" data-post-id="${post.id}">🎉</button>
                                    <button type="button" class="emoji-btn" data-post-id="${post.id}">🔥</button>
                                    <button type="button" class="emoji-btn" data-post-id="${post.id}">💯</button>
                                    <button type="button" class="emoji-btn" data-post-id="${post.id}">👏</button>
                                </div>
                                <div class="comment-form">
                                    <input type="text" class="comment-text" placeholder="Write a comment..." data-post-id="${post.id}">
                                    <button class="comment-submit" data-post-id="${post.id}">Post</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                
                container.appendChild(el);
            });

            // Attach like handlers & hydrate like counts/state
            await hydrateAndBindLikes(container);

            // Attach share handlers
            container.querySelectorAll('.share-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const postId = btn.getAttribute('data-post-id');
                    const target = btn.closest('.post');
                    const text = target.querySelector('p')?.innerText || 'Check out this post!';
                    const img = target.querySelector('img')?.src || null;
                    sharePost({ text, url: window.location.href + `#post-${postId}`, image: img });
                });
            });

            // Attach comment toggle handlers
            container.querySelectorAll('.comment-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const postId = btn.getAttribute('data-post-id');
                    const commentsSection = document.getElementById(`comments-${postId}`);
                    const commentsList = document.getElementById(`comments-list-${postId}`);
                    
                    if (commentsSection.style.display === 'none') {
                        commentsSection.style.display = 'block';
                        await loadComments(postId, commentsList);
                    } else {
                        commentsSection.style.display = 'none';
                    }
                });
            });

            // Attach emoji button handlers
            container.querySelectorAll('.emoji-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const postId = btn.getAttribute('data-post-id');
                    const emoji = btn.textContent;
                    await addComment(postId, emoji);
                });
            });

            // Attach comment submit handlers
            container.querySelectorAll('.comment-submit').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const postId = btn.getAttribute('data-post-id');
                    const textInput = container.querySelector(`.comment-text[data-post-id="${postId}"]`);
                    const commentText = textInput.value.trim();
                    
                    if (commentText) {
                        await addComment(postId, commentText);
                        textInput.value = '';
                    }
                });
            });

            // Attach enter key handler for comment input
            container.querySelectorAll('.comment-text').forEach(input => {
                input.addEventListener('keypress', async (e) => {
                    if (e.key === 'Enter') {
                        const postId = input.getAttribute('data-post-id');
                        const commentText = input.value.trim();
                        
                        if (commentText) {
                            await addComment(postId, commentText);
                            input.value = '';
                        }
                    }
                });
            });

            // Attach pin handlers (dev only)
            container.querySelectorAll('.pin-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const postId = btn.getAttribute('data-post-id');
                    const isPinned = btn.getAttribute('data-pinned') === 'true';
                    const { error } = await supabase
                        .from('posts')
                        .update({ is_pinned: !isPinned })
                        .eq('id', postId);
                    if (error) {
                        console.error('Pin toggle failed:', error);
                        alert(`Failed to ${isPinned ? 'unpin' : 'pin'} post: ${error.message}`);
                        return;
                    }
                    loadPosts();
                });
            });

            // Attach delete handlers (own posts only)
            container.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const postId = btn.getAttribute('data-post-id');
                    if (!confirm('Delete this post? This cannot be undone.')) return;
                    // Also best-effort delete likes for this post to avoid orphan counts
                    try { await supabase.from('post_likes').delete().eq('post_id', postId); } catch (_) {}
                    let q = supabase.from('posts').delete().eq('id', postId);
                    // Only restrict by user_id if not dev
                    if (!isDevEmail) {
                        q = q.eq('user_id', userId);
                    }
                    const { error } = await q;
                    if (error) {
                        console.error('Delete failed:', error);
                        alert(`Delete failed: ${error.message}`);
                        return;
                    }
                    loadPosts();
                });
            });
        }

        // Comment system functions
        async function loadComments(postId, commentsListEl) {
            try {
                const { data: comments, error } = await supabase
                    .from('post_comments')
                    .select('id, content, created_at, user_id, is_pinned, users:users!post_comments_user_id_fkey(full_name, profile_photo, is_dev, role_badge)')
                    .eq('post_id', postId)
                    .order('created_at', { ascending: true });

                if (error) {
                    console.error('Error loading comments:', error);
                    return;
                }

                commentsListEl.innerHTML = '';
                
                if (comments.length === 0) {
                    commentsListEl.innerHTML = '<p style="color: #6b7280; font-style: italic; padding: 1rem;">No comments yet. Be the first to comment!</p>';
                    return;
                }

                // Merge with local pinned state as fallback if DB column missing/blocked
                const localPinnedMap = JSON.parse(localStorage.getItem('pinned_comments') || '{}');
                const localPinnedForPost = new Set(localPinnedMap[postId] || []);

                // Sort: pinned first (db or local), then by created_at
                const sorted = comments.slice().sort((a, b) => {
                    const ap = (a.is_pinned ? 1 : 0) || (localPinnedForPost.has(a.id) ? 1 : 0);
                    const bp = (b.is_pinned ? 1 : 0) || (localPinnedForPost.has(b.id) ? 1 : 0);
                    if (ap !== bp) return bp - ap;
                    return new Date(a.created_at) - new Date(b.created_at);
                });

                sorted.forEach(comment => {
                    const commentEl = document.createElement('div');
                    commentEl.className = 'comment-item';
                    const canModerate = hasDevPowers() || comment.user_id === userId;
                    const isPinned = !!comment.is_pinned || localPinnedForPost.has(comment.id);
                    commentEl.innerHTML = `
                        <div class="comment-header">
<img 
  src="${comment.users?.profile_photo || '/logonew.png'}" 
  alt="${comment.users?.full_name || 'User'}" 
  class="comment-avatar"
  onerror="this.onerror=null;this.src='/logonew.png';"
/>
                            <strong class="comment-author">${comment.users?.full_name || 'User'} ${(comment.users?.is_dev || (String(comment.users?.role_badge||'').toLowerCase()==='developer')) ? '<span class="dev-badge developer" style="margin-left:.25rem;">DEVELOPER</span>' : ''} ${isPinned ? '<span class="pinned-badge" style="font-size:.6rem; padding:.1rem .35rem; margin-left:.25rem;">Pinned</span>' : ''}</strong>
                            <small class="comment-time">${new Date(comment.created_at).toLocaleString()}</small>
                        </div>
                        <div class="comment-content">${escapeHtml(comment.content)}</div>
                        ${canModerate ? `
                        <div class="comment-actions">
                            <button class="btn-icon comment-pin" data-post-id="${postId}" data-comment-id="${comment.id}" data-pinned="${isPinned ? 'true' : 'false'}"><i class="fas fa-thumbtack"></i> ${isPinned ? 'Unpin' : 'Pin'}</button>
                            <button class="btn-icon comment-delete" data-post-id="${postId}" data-comment-id="${comment.id}"><i class="fas fa-trash"></i> Delete</button>
                        </div>` : ''}
                    `;
                    commentsListEl.appendChild(commentEl);
                });

                // Bind actions
                commentsListEl.querySelectorAll('.comment-delete').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const cid = btn.getAttribute('data-comment-id');
                        const pid = btn.getAttribute('data-post-id');
                        if (!confirm('Delete this comment?')) return;
                        await deleteComment(pid, cid);
                        await loadComments(postId, commentsListEl);
                    });
                });
                commentsListEl.querySelectorAll('.comment-pin').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const cid = btn.getAttribute('data-comment-id');
                        const pid = btn.getAttribute('data-post-id');
                        const isPinned = btn.getAttribute('data-pinned') === 'true';
                        await togglePinComment(pid, cid, !isPinned);
                        await loadComments(postId, commentsListEl);
                    });
                });
            } catch (e) {
                console.error('Failed to load comments:', e);
            }
        }

        async function addComment(postId, content) {
            try {
                const { error } = await supabase
                    .from('post_comments')
                    .insert([{
                        post_id: postId,
                        user_id: userId,
                        content: content
                    }]);

                if (error) {
                    console.error('Error adding comment:', error);
                    alert('Failed to add comment: ' + error.message);
                    return;
                }

                // Reload comments for this post
                const commentsList = document.getElementById(`comments-list-${postId}`);
                if (commentsList) {
                    await loadComments(postId, commentsList);
                }
            } catch (e) {
                console.error('Failed to add comment:', e);
                alert('Failed to add comment. Please try again.');
            }
        }

        async function deleteComment(postId, commentId) {
            try {
                // If not dev and not owner, RLS should block on server, but double-check client-side
                if (!hasDevPowers()) {
                    // optional: fetch to verify ownership; skipping for performance
                }
                const { error } = await supabase
                    .from('post_comments')
                    .delete()
                    .eq('id', commentId);
                if (error) {
                    alert('Failed to delete comment: ' + (error.message || ''));
                }
            } catch (e) {
                alert(e.message || 'Delete failed');
            }
        }

        async function togglePinComment(postId, commentId, shouldPin) {
            // Try DB column is_pinned; if it fails, store locally as fallback
            let dbWorked = false;
            try {
                const { error } = await supabase
                    .from('post_comments')
                    .update({ is_pinned: shouldPin })
                    .eq('id', commentId);
                if (!error) dbWorked = true;
            } catch (_) {}
            if (!dbWorked) {
                const map = JSON.parse(localStorage.getItem('pinned_comments') || '{}');
                const set = new Set(map[postId] || []);
                if (shouldPin) set.add(commentId);
                else set.delete(commentId);
                map[postId] = Array.from(set);
                localStorage.setItem('pinned_comments', JSON.stringify(map));
            }
        }

        // Likes: fetch counts and user-liked state, bind toggle actions
        async function hydrateAndBindLikes(container) {
            try {
                const postIds = Array.from(container.querySelectorAll('.like-btn')).map(b => b.getAttribute('data-post-id'));
                if (postIds.length === 0) return;
                // 1) counts per post
                const { data: countsData } = await supabase
                    .from('post_likes')
                    .select('post_id, count:post_id', { count: 'exact', head: false })
                    .in('post_id', postIds);
                // countsData returns rows, but count isn't grouped. We'll fetch grouped counts via RPC alternative if needed.
            } catch (_) {}

            // Workaround: use PostgREST RPC for grouped counts via select with exact count requires group. We'll do a second call using raw SQL via REST is not available, so instead fetch all likes for posts and count on client.
            try {
                const { data: likesAll } = await supabase
                    .from('post_likes')
                    .select('post_id, user_id')
                    .in('post_id', Array.from(container.querySelectorAll('.like-btn')).map(b => b.getAttribute('data-post-id')));
                const countMap = {};
                const likedSet = new Set();
                (likesAll || []).forEach(r => {
                    countMap[r.post_id] = (countMap[r.post_id] || 0) + 1;
                    if (r.user_id === userId) likedSet.add(r.post_id);
                });
                container.querySelectorAll('.like-btn').forEach(btn => {
                    const pid = btn.getAttribute('data-post-id');
                    const liked = likedSet.has(pid);
                    btn.setAttribute('aria-pressed', liked ? 'true' : 'false');
                    btn.querySelector('.like-text').textContent = liked ? 'Liked' : 'Like';
                    const countEl = btn.querySelector('.like-count');
                    countEl.textContent = String(countMap[pid] || 0);
                    btn.onclick = () => toggleLike(pid, btn);
                });
            } catch (e) {
                console.warn('hydrate likes failed', e);
            }
        }

        async function toggleLike(postId, btn) {
            const liked = btn.getAttribute('aria-pressed') === 'true';
            try {
                if (liked) {
                    await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId);
                } else {
                    await supabase.from('post_likes').insert([{ post_id: postId, user_id: userId }]);
                }
            } catch (e) {
                alert(e.message || 'Failed to update like');
                return;
            }
            // Update UI optimistically by reloading counts for this post
            await refreshLikeForPost(postId, btn);
        }

        async function refreshLikeForPost(postId, btn) {
            try {
                const { data } = await supabase
                    .from('post_likes')
                    .select('post_id, user_id')
                    .eq('post_id', postId);
                const count = (data || []).length;
                const liked = (data || []).some(r => r.user_id === userId);
                btn.setAttribute('aria-pressed', liked ? 'true' : 'false');
                btn.querySelector('.like-text').textContent = liked ? 'Liked' : 'Like';
                btn.querySelector('.like-count').textContent = String(count);
            } catch (_) {}
        }

        async function sharePost({ text, url, image }) {
            try {
                if (navigator.share) {
                    const shareData = { text, url };
                    await navigator.share(shareData);
                    return;
                }
            } catch (e) {
                console.warn('Web Share failed, falling back', e);
            }
            try {
                await navigator.clipboard.writeText(`${text}\n${url}`);
                alert('Link copied to clipboard!');
            } catch (_) {
                prompt('Copy this link to share:', url);
            }
        }

        // Helper: upload files to Supabase Storage and return public URL
        async function uploadToBucket(bucketName, file, pathPrefix) {
            if (!file) throw new Error('No file provided');

            // Validate file size and type
            const maxBytes = 5 * 1024 * 1024; // 5MB
            const allowed = ['image/jpeg', 'image/png', 'image/webp'];
            if (!allowed.includes(file.type)) {
                throw new Error('Only JPG, PNG or WEBP images are allowed');
            }
            if (file.size > maxBytes) {
                throw new Error('File too large. Max 5MB');
            }

            const fileExt = (file.name.split('.').pop() || 'jpg').toLowerCase();
            const filePath = `${pathPrefix}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from(bucketName)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false,
                    contentType: file.type
                });

            if (uploadError) {
                console.error('Storage upload error:', uploadError);
                throw uploadError;
            }

            const { data: publicData } = supabase.storage
                .from(bucketName)
                .getPublicUrl(filePath);

            if (!publicData || !publicData.publicUrl) {
                throw new Error('Failed to get public URL. Is the bucket public?');
            }

            return publicData.publicUrl;
        }

        async function createPost() {
            const content = document.getElementById('postContent').value.trim();
            const file = document.getElementById('postImage').files[0];
            
            if (!content && !file) {
                alert('Please write something or add an image to post.');
                return;
            }
            // Extra safety: ensure user row exists now
            await ensureUserExists({
                id: userId,
                full_name: (userProfile && userProfile.full_name) || 'Student',
                dob: (userProfile && userProfile.dob) || '2010-01-01',
                profile_photo: (userProfile && userProfile.profile_photo) || null,
                total_points: (userProfile && userProfile.total_points) || 0
            });
            
            let imagePath = null;
            
            if (file) {
                try {
                    imagePath = await uploadToBucket('post-images', file, `${userId}`);
                } catch (e) {
                    console.error(e);
                    alert(e.message || 'Image upload failed. Please try again.');
                    return;
                }
            }
            
            // Final safety: verify FK target exists
            const exists = await assertUserRow(userId);
            if (!exists) {
                await ensureUserExists(userProfile || { id: userId });
            }

            // Create post in Supabase (no select to avoid RLS return errors)
            let { error } = await supabase
                .from('posts')
                .insert([
                    {
                        user_id: userId,
                        content: content,
                        image_path: imagePath
                    }
                ]);
            
            if (error) {
                // If FK violation, try creating user row and retry once
                if ((error.message || '').includes('foreign key') || (error.details || '').includes('foreign key')) {
                    await ensureUserExists(userProfile || { id: userId });
                    const retry = await supabase
                        .from('posts')
                        .insert([{ user_id: userId, content, image_path: imagePath }]);
                    if (retry.error) {
                        console.error('Retry post insert failed:', retry.error);
                        alert(`Error creating post: ${retry.error.message}`);
                        return;
                    }
                } else {
                console.error('Error creating post:', error);
                    alert(`Error creating post: ${error.message}`);
                return;
                }
            }
            
            // Clear form and reload posts
            document.getElementById('postContent').value = '';
            document.getElementById('postImage').value = '';
            loadPosts();
            
            alert('Post created successfully!');
        }

async function loadLeaderboard(category) {
  try {
    // 🧹 Clear local caches before fresh fetch
    sessionStorage.removeItem('leaderboardCache');
    localStorage.removeItem('userData');

    // 🧠 Fetch directly from Supabase, no cache
    const { data: allUsers, error } = await supabase
      .from('users')
      .select('*', { head: false, count: 'exact' })
      .order('total_points', { ascending: false })
      .throwOnError();

    if (error) {
      console.error('Error loading leaderboard:', error);
      return;
    }

    // ✅ Show only developers and normal users (exclude staff/chairman/etc.)
    const allowedRoles = ['developer', '', null, 'user', 'student'];
    let users = (allUsers || []).filter(u => {
      const role = (u.role_badge || '').toLowerCase();
      return allowedRoles.includes(role);
    });

    // Optional: filter by category (junior/senior/global)
    if (category && category !== 'global') {
      users = users.filter(u => determineQuizTypeFromDOB(u.dob) === category);
    }

    const top3El = document.getElementById('top3');
    const allEl = document.getElementById('leaderboardAll');
    if (!top3El || !allEl) {
      console.warn('Leaderboard containers not found in DOM.');
      return;
    }

    top3El.innerHTML = '';
    allEl.innerHTML = '';

    if (users.length === 0) {
      allEl.innerHTML = '<p>No eligible users found for leaderboard.</p>';
      return;
    }

    // 🥇 Top 3 section
    users.slice(0, 3).forEach((user, index) => {
      const medals = ['🥇', '🥈', '🥉'];
      const leaderEl = document.createElement('div');
      leaderEl.className = 'leader';
      leaderEl.innerHTML = `
        <div class="leader-rank">${medals[index]}</div>
<img 
  class="leader-img" 
  src="${user.profile_photo || '/logonew.png'}" 
  alt="${user.full_name}" 
  onerror="this.onerror=null;this.src='/logonew.png';"
/>
        <div class="leader-info">
          <strong>${user.full_name}${(user.is_dev || (user.role_badge || '').toLowerCase() === 'developer')
            ? ' <span class="dev-badge developer">DEV</span>' : ''}</strong>
            
          <span>${user.weekly_points || 0} pts</span>
        </div>
      `;
      top3El.appendChild(leaderEl);
    });

    // 👥 Full leaderboard
    users.forEach((user, index) => {
      const leaderRow = document.createElement('div');
      leaderRow.className = 'leader-row';
      leaderRow.innerHTML = `
        <div class="leader-row-user">
          <span>${index + 1}.</span>
        <img 
  src="${user.profile_photo || '/logonew.png'}" 
  alt="${user.full_name}" 
  onerror="this.onerror=null;this.src='/logonew.png';"
/>

          <strong>${user.full_name}${(user.is_dev || (user.role_badge || '').toLowerCase() === 'developer')
            ? ' <span class="dev-badge developer">DEV</span>' : ''}</strong>
        </div>
        
        <span>${user.weekly_points || 0} pts</span>
      `;
      allEl.appendChild(leaderRow);
    });
  } catch (err) {
    console.error('Unexpected leaderboard error:', err);
  }
}




        async function saveProfile() {
            const name = document.getElementById('nameInput').value.trim();
            const email = document.getElementById('emailInput').value.trim();
            const password = document.getElementById('passwordInput').value;
            const confirmPassword = document.getElementById('confirmPasswordInput').value;
            const file = document.getElementById('photoInput').files[0];
            
            let updates = {};
            let photoPath = null;
            
            // 1) Password via Auth
            if (password) {
                if (password !== confirmPassword) {
                    alert('Passwords do not match');
                    return;
                }
                const { error: pwErr } = await supabase.auth.updateUser({ password });
                if (pwErr) {
                    alert('Error updating password: ' + pwErr.message);
                    return;
                }
                alert('Password updated successfully!');
            }
            
            // 2) Email via Auth (NOT users table)
            if (email && email !== (userProfile.email || '')) {
                const { error: emailErr } = await supabase.auth.updateUser({ email });
                if (emailErr) {
                    alert('Error updating email: ' + emailErr.message);
                    return;
                }
                // Supabase may send a confirmation link; reflect locally for UI
                userProfile.email = email;
            }
            
            // 3) Profile photo upload (users table)
            if (file) {
                try {
                    photoPath = await uploadToBucket('avatars', file, `${userId}`);
                    updates.profile_photo = photoPath;
                } catch (e) {
                    console.error('Avatar upload failed:', e);
                    alert('Photo upload failed. Ensure the bucket exists and file < 5MB.');
                    return;
                }
            }
            
            // 4) Name in users table
            if (name && name !== (userProfile.full_name || '')) {
                updates.full_name = name;
            }
            
            // Persist users table updates
            if (Object.keys(updates).length > 0) {
                const { error } = await supabase
                    .from('users')
                    .update(updates)
                    .eq('id', userId);
                if (error) {
                    console.error('Error updating profile:', error);
                    alert('Error updating profile. Please try again.');
                    return;
                }
                Object.assign(userProfile, updates);
            }
                
            // Save to localStorage and refresh UI
                const userData = JSON.parse(localStorage.getItem('userData') || '{}');
                userData[userId] = userProfile;
                localStorage.setItem('userData', JSON.stringify(userData));
                renderUserSummary(userProfile);
                // Re-fetch from DB to ensure we mirror server state and handle RLS triggers
                refreshCurrentUserFromDB();
                
                alert('Profile updated successfully!');
        }

        async function logout() {
            // Sign out from Supabase Auth
            const { error } = await supabase.auth.signOut();
            
            if (error) {
                console.error('Error signing out:', error);
            }
            
            // Clear cached data for this user to avoid stale profile after re-login
            try {
                const userData = JSON.parse(localStorage.getItem('userData') || '{}');
                if (userId && userData[userId]) {
                    delete userData[userId];
                    localStorage.setItem('userData', JSON.stringify(userData));
                }
                const attempts = JSON.parse(localStorage.getItem('quizAttempts') || '{}');
                if (userId && attempts[userId]) {
                    delete attempts[userId];
                    localStorage.setItem('quizAttempts', JSON.stringify(attempts));
                }
                const seen = JSON.parse(localStorage.getItem('seen_questions') || '{}');
                if (userId && seen[userId]) {
                    delete seen[userId];
                    localStorage.setItem('seen_questions', JSON.stringify(seen));
                }
            } catch (_) {}
            localStorage.removeItem('sd_user_id');
            window.location.href = 'index.html';
        }

        async function deleteAccount() {
            if (!confirm('Are you sure? This will delete all your data and cannot be undone.')) {
                return;
            }
            try {
                // 0) Best-effort: delete storage files (avatars and post-images under user's folder)
                await deleteUserStorageAssets(userId);

                // 1) Clean up rows that reference the user to satisfy foreign keys
                // 1a) Post likes made by the user
                {
                    const { error } = await supabase
                        .from('post_likes')
                        .delete()
                        .eq('user_id', userId);
                    if (error) console.warn('post_likes by user delete failed:', error);
                }

                // 1b) Post likes on the user's posts, then delete the posts themselves
                let postIds = [];
                {
                    const { data, error } = await supabase
                        .from('posts')
                        .select('id')
                        .eq('user_id', userId);
                    if (!error && Array.isArray(data)) postIds = data.map(p => p.id);
                }
                if (postIds.length > 0) {
                    const { error } = await supabase
                        .from('post_likes')
                        .delete()
                        .in('post_id', postIds);
                    if (error) console.warn('post_likes on user posts delete failed:', error);
                }
                {
                    const { error } = await supabase
                        .from('posts')
                        .delete()
                        .eq('user_id', userId);
                    if (error) console.warn('posts delete failed:', error);
                }

                // 1c) Follows where the user is follower or followed
                {
                    const { error } = await supabase
                        .from('follows')
                        .delete()
                        .or(`follower_id.eq.${userId},followed_id.eq.${userId}`);
                    if (error) console.warn('follows delete failed:', error);
                }

                // 1d) Awards
                {
                    const { error } = await supabase
                        .from('awards')
                        .delete()
                        .eq('user_id', userId);
                    if (error) console.warn('awards delete failed:', error);
                }

                // 1e) Quiz attempts and their answers
                let attemptIds = [];
                {
                    const { data, error } = await supabase
                        .from('attempts')
                        .select('id')
                        .eq('user_id', userId);
                    if (!error && Array.isArray(data)) attemptIds = data.map(a => a.id);
                }
                if (attemptIds.length > 0) {
                    const { error: aaErr } = await supabase
                        .from('attempt_answers')
                        .delete()
                        .in('attempt_id', attemptIds);
                    if (aaErr) console.warn('attempt_answers delete failed:', aaErr);

                    const { error: atErr } = await supabase
                        .from('attempts')
                        .delete()
                        .in('id', attemptIds);
                    if (atErr) console.warn('attempts delete failed:', atErr);
                } else {
                    const { error } = await supabase
                        .from('attempts')
                        .delete()
                        .eq('user_id', userId);
                    if (error) console.warn('attempts delete (empty set) failed:', error);
                }

                // 1f) Quizzes created by the user and their question links
                let quizIds = [];
                {
                    const { data, error } = await supabase
                        .from('quizzes')
                        .select('id')
                        .eq('user_id', userId);
                    if (!error && Array.isArray(data)) quizIds = data.map(q => q.id);
                }
                if (quizIds.length > 0) {
                    const { error: qqErr } = await supabase
                        .from('quiz_questions')
                        .delete()
                        .in('quiz_id', quizIds);
                    if (qqErr) console.warn('quiz_questions delete failed:', qqErr);

                    const { error: qzErr } = await supabase
                        .from('quizzes')
                        .delete()
                        .in('id', quizIds);
                    if (qzErr) console.warn('quizzes delete failed:', qzErr);
                }

                // 2) Delete profile row last
                {
                    const { error: userDelErr } = await supabase
                        .from('users')
                        .delete()
                        .eq('id', userId);
                    if (userDelErr) {
                        console.error('Error deleting user row:', userDelErr);
                        alert('Error deleting account (profile row). Please try again.');
                        return;
                    }
                }
            
                // 3) Try to delete auth user via Edge Function (requires deployment with service role)
                try {
                    const { error: fnErr } = await supabase.functions.invoke('delete-user', {
                        body: { user_id: userId }
                    });
                    if (fnErr) {
                        console.warn('Edge function delete-user not available or failed:', fnErr);
                    }
                } catch (e) {
                    console.warn('Edge function delete-user invoke failed:', e);
                }

                // 4) Sign out and redirect
                await supabase.auth.signOut();
                localStorage.removeItem('sd_user_id');
                alert('Your account has been deleted successfully.');
                window.location.href = 'index.html';
            } catch (e) {
                console.error('Account deletion failed:', e);
                alert(e.message || 'Account deletion failed. Please try again.');
            }
        }

        // Helper function to escape HTML
        function escapeHtml(str) {
            return (str || '').replace(/[&<>'"]/g, c => ({ 
                '&': '&amp;', 
                '<': '&lt;', 
                '>': '&gt;', 
                '"': '&quot;', 
                "'": '&#39;' 
            })[c]);
        }
        // Helper: delete all files under a user's folder for a bucket
        async function deleteFolder(bucketName, prefix) {
            try {
                const { data, error } = await supabase.storage.from(bucketName).list(prefix, { limit: 1000, offset: 0, search: '' });
                if (error) return;
                const files = (data || []).map(f => `${prefix}/${f.name}`);
                if (files.length > 0) {
                    await supabase.storage.from(bucketName).remove(files);
                }
            } catch (e) {
                console.warn(`deleteFolder ${bucketName}/${prefix} failed`, e);
            }
        }

        async function deleteUserStorageAssets(uid) {
            await Promise.all([
                deleteFolder('avatars', `${uid}`),
                deleteFolder('post-images', `${uid}`)
            ]);
        }

        async function loadAnnouncements() {
            const listEl = document.getElementById('announcementsList');
            const formWrap = document.getElementById('announceFormWrap');
            // Show form only for developer email
            const isDevEmail = (userProfile && (userProfile.email || '').toLowerCase() === 'yadhavvsreelakam@gmail.com') || userProfile?.is_dev;
            if (formWrap) formWrap.style.display = isDevEmail ? 'block' : 'none';

            // Fetch announcements
            const { data, error } = await supabase
                .from('announcements')
                .select('id, title, body, created_at')
                .order('created_at', { ascending: false });

            listEl.innerHTML = '';
            if (error) {
                console.error('Error loading announcements:', error);
                listEl.innerHTML = '<p>Error loading announcements.</p>';
                return;
            }
            if (!data || data.length === 0) {
                listEl.innerHTML = '<p>No announcements right now.</p>';
                return;
            }

            data.forEach(a => {
                const el = document.createElement('div');
                el.className = 'post';
                const when = new Date(a.created_at).toLocaleString();
                el.innerHTML = `
                    <div class="post-head">
                        <strong>${escapeHtml(a.title || 'Announcement')}</strong>
                        <small>${when}</small>
                    </div>
                    <div class="post-body">
                        <p>${escapeHtml(a.body || '')}</p>
                        ${isDevEmail ? `<div class="post-actions"><button class="delete-btn announce-delete" data-aid="${a.id}"><i class=\"fas fa-trash\"></i> Delete</button></div>` : ''}
                    </div>
                `;
                listEl.appendChild(el);
            });

            // Attach delete handlers for dev
            if (isDevEmail) {
                listEl.querySelectorAll('.announce-delete').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const id = btn.getAttribute('data-aid');
                        if (!confirm('Delete this announcement?')) return;
                        const { error } = await supabase.from('announcements').delete().eq('id', id);
                        if (error) { alert('Delete failed: ' + error.message); return; }
                        loadAnnouncements();
                    });
                });
            }
        }

        async function createAnnouncement() {
            const title = (document.getElementById('announceTitle').value || '').trim();
            const body = (document.getElementById('announceBody').value || '').trim();
            if (!title || !body) { alert('Title and body required'); return; }
            // Restrict to developer email on client side (RLS should enforce on server)
            const isDevEmail = (userProfile.email || '').toLowerCase() === 'yadhavvsreelakam@gmail.com' || userProfile?.is_dev;
            if (!isDevEmail) {
                alert('Only developers can post announcements.');
                return;
            }
            const { error } = await supabase
                .from('announcements')
                .insert([{ title, body }]);
            if (error) { alert('Failed to publish: ' + error.message); return; }
            document.getElementById('announceTitle').value = '';
            document.getElementById('announceBody').value = '';
            loadAnnouncements();
        }

        async function loadAccount() {
            try {
                // Header summary
                document.getElementById('accountAvatar').src = userProfile.profile_photo || 'logonew.png';
                document.getElementById('accountName').innerHTML = escapeHtml(userProfile.full_name || 'Student');
                document.getElementById('accountEmail').textContent = userProfile.email || '';
                // Show total points in My Space (not weekly)
                document.getElementById('accountPoints').textContent = `Total Points: ${userProfile.total_points || 0}`;

                // Badges based on points tiers + role badges (up to 2)
                const badgesEl = document.getElementById('accountBadges');
                badgesEl.innerHTML = '';
                const pts = userProfile.total_points || 0;
                const badges = [];
                const roles = [];
                if ((userProfile.role_badge||'').toLowerCase()) roles.push(userProfile.role_badge);
                if (Array.isArray(userProfile.leaderboard_badges)) {
                    userProfile.leaderboard_badges.forEach(b => { if (b && roles.length < 2) roles.push(b); });
                }
                roles.forEach(r => badges.push({ name: String(r).replace('_',' ').toUpperCase(), color: '#eef2ff', textColor:'#1a3d7c', solid:false }));
                if (pts >= 10) badges.push({ name: 'Bronze Achiever', color: '#cd7f32' });
                if (pts >= 30) badges.push({ name: 'Silver Scholar', color: '#c0c0c0' });
                if (pts >= 60) badges.push({ name: 'Gold Genius', color: '#ffd700' });
                if (badges.length === 0) badges.push({ name: 'Getting Started', color: '#9ca3af' });
                badges.forEach(b => {
                    const tag = document.createElement('span');
                    tag.textContent = b.name;
                    tag.style.cssText = `display:inline-block;padding:.3rem .6rem;border-radius:999px;background:${b.color};color:${b.textColor||'#111'};font-weight:600;font-size:.8rem;border:1px solid rgba(0,0,0,.08)`;
                    badgesEl.appendChild(tag);
                });
                // Awards from table
                try {
                    const { data: awards } = await supabase
                        .from('awards')
                        .select('type, label, created_at')
                        .eq('user_id', userId)
                        .order('created_at', { ascending: false })
                        .limit(10);
                    if (awards && awards.length) {
                        const wrap = document.createElement('div');
                        wrap.style.marginTop = '.75rem';
                        awards.forEach(a => {
                            const chip = document.createElement('span');
                            chip.textContent = a.label || a.type;
                            chip.style.cssText = 'display:inline-block;margin:.25rem .25rem 0 0;padding:.25rem .55rem;border-radius:999px;background:#eef2ff;color:#1a3d7c;font-weight:600;font-size:.75rem;border:1px solid #dbe3ff';
                            wrap.appendChild(chip);
                        });
                        badgesEl.appendChild(wrap);
                    }
                } catch (_) {}

                // Query follows
                const [{ data: followersIds }, { data: followingIds }] = await Promise.all([
                    supabase.from('follows').select('follower_id').eq('followed_id', userId),
                    supabase.from('follows').select('followed_id').eq('follower_id', userId)
                ]);

                const followerIdList = (followersIds || []).map(r => r.follower_id);
                const followingIdList = (followingIds || []).map(r => r.followed_id);

                document.getElementById('followersCount').textContent = followerIdList.length;
                document.getElementById('followingCount').textContent = followingIdList.length;

                // Load points history
                await loadPointsHistory();

                // Fetch users for lists & discover (exclude self)
                const { data: users } = await supabase
                    .from('users')
                    .select('id, full_name, profile_photo, total_points')
                    .order('total_points', { ascending: false })
                    .limit(50);

                const usersById = Object.fromEntries((users || []).map(u => [u.id, u]));

                // Render followers list
                const followersList = document.getElementById('followersList');
                const discoverList = document.getElementById('discoverList');
                followersList.innerHTML = '';
                discoverList.innerHTML = '';

                function renderConnectionCard(u, isFollowing) {
                    const card = document.createElement('div');
                    card.className = 'connection-item';
                    card.innerHTML = `
                        <img src="${u.profile_photo || 'https://via.placeholder.com/48'}" alt="${u.full_name}" class="connection-avatar">
                        <div class="connection-info">
                            <div class="connection-name">${u.full_name}</div>
                            <div class="connection-points">${u.total_points || 0} points</div>
                        </div>
                        <div class="connection-actions">
                            <button class="follow-btn ${isFollowing ? 'unfollow' : 'follow'}" data-user-id="${u.id}" data-follow="${isFollowing ? '1' : '0'}">
                                ${isFollowing ? 'Unfollow' : 'Follow'}
                            </button>
                        </div>
                    `;
                    return card;
                }

                const followerUsers = followerIdList.map(id => usersById[id]).filter(Boolean);
                followerUsers.forEach(u => followersList.appendChild(renderConnectionCard(u, followingIdList.includes(u.id))));

                // Discover: users not self; show follow status
                (users || []).filter(u => u.id !== userId).forEach(u => {
                    discoverList.appendChild(renderConnectionCard(u, followingIdList.includes(u.id)));
                });

                // Search handlers
                const fSearch = document.getElementById('followersSearch');
                const gSearch = document.getElementById('followingSearch');
                if (fSearch) {
                    fSearch.oninput = () => {
                        const q = (fSearch.value || '').toLowerCase();
                        followersList.querySelectorAll('.connection-item').forEach(item => {
                            const name = item.querySelector('.connection-name')?.textContent.toLowerCase() || '';
                            item.style.display = name.includes(q) ? '' : 'none';
                        });
                    };
                }
                if (gSearch) {
                    gSearch.oninput = () => {
                        const q = (gSearch.value || '').toLowerCase();
                        discoverList.querySelectorAll('.connection-item').forEach(item => {
                            const name = item.querySelector('.connection-name')?.textContent.toLowerCase() || '';
                            item.style.display = name.includes(q) ? '' : 'none';
                        });
                    };
                }

                // Follow/Unfollow actions
                function attachFollowHandlers(container) {
                    container.querySelectorAll('button[data-user-id]').forEach(btn => {
                        btn.onclick = async () => {
                            const targetId = btn.getAttribute('data-user-id');
                            const following = btn.getAttribute('data-follow') === '1';
                            if (following) {
                                await supabase.from('follows').delete().eq('follower_id', userId).eq('followed_id', targetId);
                            } else {
                                await supabase.from('follows').insert([{ follower_id: userId, followed_id: targetId }]);
                            }
                            loadAccount();
                        };
                    });
                }
                attachFollowHandlers(followersList);
                attachFollowHandlers(discoverList);

                // Tab functionality
                const tabBtns = document.querySelectorAll('.tab-btn');
                const tabPanels = document.querySelectorAll('.tab-panel');
                
                tabBtns.forEach(btn => {
                    btn.addEventListener('click', () => {
                        const targetTab = btn.getAttribute('data-tab');
                        
                        // Remove active class from all tabs and panels
                        tabBtns.forEach(b => b.classList.remove('active'));
                        tabPanels.forEach(p => p.classList.remove('active'));
                        
                        // Add active class to clicked tab and corresponding panel
                        btn.classList.add('active');
                        document.getElementById(`${targetTab}-panel`).classList.add('active');
                    });
                });
            } catch (e) {
                console.warn('loadAccount failed:', e);
            }
        }

        async function loadPointsHistory() {
            try {
                // Get current week points
                const currentWeekPoints = userProfile.weekly_points || 0;
                const totalPoints = userProfile.total_points || 0;
                
                // Calculate weekly average (simplified - assuming 4 weeks of data)
                const weeklyAverage = Math.round(totalPoints / 4);
                
                // Update summary stats
                document.getElementById('currentWeekPoints').textContent = currentWeekPoints;
                document.getElementById('totalPoints').textContent = totalPoints;
                document.getElementById('averageWeekly').textContent = weeklyAverage;
                
            } catch (e) {
                console.warn('loadPointsHistory failed:', e);
            }
        }

        // Admin Manage Users: list online users by default, allow search filter
        function bindAdminManageUsers() {
            const search = document.getElementById('adminUserSearch');
            const results = document.getElementById('adminUserResults');
            const controls = document.getElementById('adminUserControls');
            const msg = document.getElementById('adminUserMsg');
            const onlineOnlyEl = document.getElementById('adminOnlineOnly');
            const refreshBtn = document.getElementById('adminRefreshUsers');
            if (!search || search._bound) return; search._bound = true;
            let selectedId = null;

            async function loadAdminUserList() {
                try {
                    const q = (search.value||'').trim().toLowerCase();
                    const onlineOnly = !!(onlineOnlyEl && onlineOnlyEl.checked);
                    const [{ data: users }, { data: act }] = await Promise.all([
                        supabase.from('users').select('id, full_name, total_points, role_badge, profile_photo').order('full_name'),
                        supabase.from('user_activity').select('user_id, is_online, last_active_at')
                    ]);
                    const map = Object.fromEntries((act||[]).map(a => [a.user_id, a]));
                    results.innerHTML = '';
                    (users||[])
                        .filter(u => !q || (u.full_name||'').toLowerCase().includes(q))
                        .filter(u => !onlineOnly || (map[u.id]?.is_online))
                        .forEach(u => {
                            const row = document.createElement('div');
                            row.style.cssText = 'padding:.35rem .5rem; border-bottom:1px solid #eee; cursor:pointer; display:flex; align-items:center; gap:.5rem;';
                            row.innerHTML = `
                                <img src="${u.profile_photo||'https://via.placeholder.com/28'}" style="width:28px;height:28px;border-radius:999px;" alt=""/>
                                <div style="flex:1;">
                                    <div>${escapeHtml(u.full_name)} <small style=\"color:#64748b\">${u.role_badge||''}</small></div>
                                    <div style=\"font-size:.75rem;color:#64748b\">${map[u.id]?.is_online ? 'Online' : 'Offline'} • ${map[u.id]?.last_active_at ? new Date(map[u.id].last_active_at).toLocaleString() : '-'}</div>
                                </div>
                                <div style=\"font-weight:600\">${u.total_points||0} pts</div>`;
                            row.onclick = () => { selectedId = u.id; controls.style.display = 'block'; msg.textContent = `Selected ${u.full_name}`; };
                            results.appendChild(row);
                        });
                } catch (e) {
                    results.innerHTML = '<p style="color:#ef4444">Failed to load users.</p>';
                }
            }

            search.oninput = loadAdminUserList;
            if (onlineOnlyEl) onlineOnlyEl.addEventListener('change', loadAdminUserList);
            if (refreshBtn) refreshBtn.addEventListener('click', loadAdminUserList);
            loadAdminUserList();

            const applyPoints = document.getElementById('adminApplyPoints');
            const deltaEl = document.getElementById('adminPointsDelta');
            if (applyPoints) applyPoints.onclick = async () => {
                if (!selectedId) { msg.textContent='Select a user'; return; }
                const delta = parseInt(deltaEl.value||'0', 10);
                if (!delta) { msg.textContent='Enter a non-zero delta'; return; }
                const { data } = await supabase.from('users').select('total_points, weekly_points').eq('id', selectedId).single();
                const newTotals = { total_points: (data?.total_points||0)+delta, weekly_points: (data?.weekly_points||0)+delta };
                const { error } = await supabase.from('users').update(newTotals).eq('id', selectedId);
                msg.textContent = error ? ('Failed: '+error.message) : 'Points updated';
            };

            const applyRolesBtn = document.getElementById('adminApplyRoles');
            if (applyRolesBtn) applyRolesBtn.onclick = async () => {
                if (!selectedId) { msg.textContent='Select a user'; return; }
                const r1 = (document.getElementById('adminRole1').value||'').toLowerCase();
                const r2 = (document.getElementById('adminRole2').value||'').toLowerCase();
                const badges = [r1,r2].filter(Boolean).slice(0,2);
                const updates = { role_badge: r1 || null, leaderboard_badges: (badges.length? badges: null), is_dev: badges.includes('developer') };
                const { error } = await supabase.from('users').update(updates).eq('id', selectedId);
                msg.textContent = error ? ('Failed: '+error.message) : 'Roles updated';
            };

            const revokeRolesBtn = document.getElementById('adminRevokeRoles');
            if (revokeRolesBtn) revokeRolesBtn.onclick = async () => {
                if (!selectedId) { msg.textContent='Select a user'; return; }
                const { error } = await supabase.from('users').update({ role_badge: null, leaderboard_badges: null, is_dev: false }).eq('id', selectedId);
                msg.textContent = error ? ('Failed: '+error.message) : 'Roles revoked';
            };

            const addFollowerBtn = document.getElementById('adminAddFollower');
            if (addFollowerBtn) addFollowerBtn.onclick = async () => {
                if (!selectedId) { msg.textContent='Select a user'; return; }
                const fid = (document.getElementById('adminFollowerUserId').value||'').trim();
                if (!fid) { msg.textContent='Enter follower user id'; return; }
                const { error } = await supabase.from('follows').insert([{ follower_id: fid, followed_id: selectedId }]);
                msg.textContent = error ? ('Failed: '+error.message) : 'Follower added';
            };

            const removeFollowerBtn = document.getElementById('adminRemoveFollower');
            if (removeFollowerBtn) removeFollowerBtn.onclick = async () => {
                if (!selectedId) { msg.textContent='Select a user'; return; }
                const fid = (document.getElementById('adminFollowerUserId').value||'').trim();
                if (!fid) { msg.textContent='Enter follower user id'; return; }
                const { error } = await supabase.from('follows').delete().eq('follower_id', fid).eq('followed_id', selectedId);
                msg.textContent = error ? ('Failed: '+error.message) : 'Follower removed';
            };

            const deleteUserBtn = document.getElementById('adminDeleteUser');
            if (deleteUserBtn) deleteUserBtn.onclick = async () => {
                if (!selectedId) { msg.textContent='Select a user'; return; }
                if (!confirm('Delete this user?')) return;
                try {
                    const targetId = selectedId;
                    await supabase.from('post_likes').delete().or(`user_id.eq.${targetId}`);
                    const { data: pids } = await supabase.from('posts').select('id').eq('user_id', targetId);
                    if (pids && pids.length) await supabase.from('post_likes').delete().in('post_id', pids.map(p=>p.id));
                    await supabase.from('posts').delete().eq('user_id', targetId);
                    await supabase.from('follows').delete().or(`follower_id.eq.${targetId},followed_id.eq.${targetId}`);
                    await supabase.from('awards').delete().eq('user_id', targetId);
                    await supabase.from('attempts').delete().eq('user_id', targetId);
                    await supabase.from('users').delete().eq('id', targetId);
                    msg.textContent = 'User deleted';
                    controls.style.display = 'none';
                    await loadAdminUserList();
                } catch (e) { msg.textContent = 'Delete failed'; }
            };
        }
        // === Global Default Image Handler ===
document.addEventListener('DOMContentLoaded', () => {
  const defaultLogo = 'logonew.png'; // your root logo file

  // Automatically replace any broken images
  document.querySelectorAll('img').forEach(img => {
    img.addEventListener('error', () => {
      img.src = defaultLogo;
    });

    // If the image has no src or is empty, apply default immediately
    if (!img.src || img.src.trim() === '' || img.src.endsWith('/')) {
      img.src = defaultLogo;
    }
  });
});
        // Initialize Supabase
        const SUPABASE_URL = "https://qcvbqizwmhtuinpqtbzz.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmJxaXp3bWh0dWlucHF0Ynp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1OTgyMjIsImV4cCI6MjA3MzE3NDIyMn0.cSRjn0n1MowMMkILc-WEuotSN2Cj78jpbxJhtEqRjl4";
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        // Initialize user data
        let userId = null;
        let userProfile = null;

        // Quiz questions by category
        const questionBanks = {
            early_years: [
                {
                    id: 1,
                    question_text: "Which animal says 'meow'?",
                    options: [
                        { id: 1, text: "Dog" },
                        { id: 2, text: "Cat" },
                        { id: 3, text: "Cow" },
                        { id: 4, text: "Duck" }
                    ],
                    correct_option: 2
                },
                {
                    id: 2,
                    question_text: "What color is a banana?",
                    options: [
                        { id: 1, text: "Red" },
                        { id: 2, text: "Yellow" },
                        { id: 3, text: "Blue" },
                        { id: 4, text: "Green" }
                    ],
                    correct_option: 2
                },
                {
                    id: 3,
                    question_text: "How many fingers do you have on one hand?",
                    options: [
                        { id: 1, text: "3" },
                        { id: 2, text: "4" },
                        { id: 3, text: "5" },
                        { id: 4, text: "6" }
                    ],
                    correct_option: 3
                }
            ],
            lower_primary: [
                {
                    id: 1,
                    question_text: "What is 5 + 7?",
                    options: [
                        { id: 1, text: "10" },
                        { id: 2, text: "11" },
                        { id: 3, text: "12" },
                        { id: 4, text: "13" }
                    ],
                    correct_option: 3
                },
                {
                    id: 2,
                    question_text: "Which planet is known as the Red Planet?",
                    options: [
                        { id: 1, text: "Earth" },
                        { id: 2, text: "Mars" },
                        { id: 3, text: "Jupiter" },
                        { id: 4, text: "Venus" }
                    ],
                    correct_option: 2
                },
                {
                    id: 3,
                    question_text: "What is the capital of India?",
                    options: [
                        { id: 1, text: "Mumbai" },
                        { id: 2, text: "Kolkata" },
                        { id: 3, text: "New Delhi" },
                        { id: 4, text: "Chennai" }
                    ],
                    correct_option: 3
                }
            ],
            upper_primary: [
                {
                    id: 1,
                    question_text: "What is the chemical symbol for gold?",
                    options: [
                        { id: 1, text: "Go" },
                        { id: 2, text: "Gd" },
                        { id: 3, text: "Au" },
                        { id: 4, text: "Ag" }
                    ],
                    correct_option: 3
                },
                {
                    id: 2,
                    question_text: "Who wrote 'Romeo and Juliet'?",
                    options: [
                        { id: 1, text: "Charles Dickens" },
                        { id: 2, text: "William Shakespeare" },
                        { id: 3, text: "Jane Austen" },
                        { id: 4, text: "Mark Twain" }
                    ],
                    correct_option: 2
                },
                {
                    id: 3,
                    question_text: "What is the largest ocean on Earth?",
                    options: [
                        { id: 1, text: "Atlantic Ocean" },
                        { id: 2, text: "Indian Ocean" },
                        { id: 3, text: "Arctic Ocean" },
                        { id: 4, text: "Pacific Ocean" }
                    ],
                    correct_option: 4
                }
            ],
            cbse: [
                {
                    id: 1,
                    question_text: "What is the formula for the area of a circle?",
                    options: [
                        { id: 1, text: "πr²" },
                        { id: 2, text: "2πr" },
                        { id: 3, text: "πd" },
                        { id: 4, text: "2πr²" }
                    ],
                    correct_option: 1
                },
                {
                    id: 2,
                    question_text: "Who discovered the law of gravity?",
                    options: [
                        { id: 1, text: "Albert Einstein" },
                        { id: 2, text: "Isaac Newton" },
                        { id: 3, text: "Galileo Galilei" },
                        { id: 4, text: "Nikola Tesla" }
                    ],
                    correct_option: 2
                },
                {
                    id: 3,
                    question_text: "What is the chemical formula for water?",
                    options: [
                        { id: 1, text: "H2O" },
                        { id: 2, text: "CO2" },
                        { id: 3, text: "O2" },
                        { id: 4, text: "NaCl" }
                    ],
                    correct_option: 1
                }
            ]
        };

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
            
            // Check if we have user data in localStorage
            let userData = JSON.parse(localStorage.getItem('userData') || '{}');
            
            if (!userData[userId]) {
                // Fetch user data from Supabase
                const { data, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', userId)
                    .single();
                    
                if (error) {
                    console.error('Error fetching user data:', error);
                    // Create default user data
                    userData[userId] = {
                        id: userId,
                        full_name: session.user.user_metadata.name || 'Student',
                        email: session.user.email,
                        dob: session.user.user_metadata.dob || '2010-01-01',
                        total_points: 0,
                        profile_photo: 'https://via.placeholder.com/48'
                    };
                    // Ensure a corresponding row exists in users table
                    await ensureUserExists(userData[userId]);
                } else {
                    userData[userId] = data;
                }
                
                localStorage.setItem('userData', JSON.stringify(userData));
            }
            
            userProfile = userData[userId];
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
                });
            });
            
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
            
            // Load initial data
            loadPosts();
            loadLeaderboard('global');
        });

        // Ensure a users row exists for this auth user (avoids FK errors)
        async function ensureUserExists(profileLike) {
            try {
                const payload = {
                    id: profileLike.id,
                    full_name: profileLike.full_name || 'Student',
                    dob: profileLike.dob || '2010-01-01',
                    profile_photo: profileLike.profile_photo || null,
                    total_points: profileLike.total_points || 0
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
            userNameEl.textContent = profile.full_name || 'Student';
            userPointsEl.textContent = `Points: ${profile.total_points || 0}`;
            profilePhotoEl.src = profile.profile_photo || 'https://via.placeholder.com/48';
            
            mobileUserNameEl.textContent = profile.full_name || 'Student';
            mobileUserPointsEl.textContent = `Points: ${profile.total_points || 0}`;
            mobileProfilePhotoEl.src = profile.profile_photo || 'https://via.placeholder.com/48';
            
            settingsProfilePhotoEl.src = profile.profile_photo || 'https://via.placeholder.com/80';
            nameInputEl.value = profile.full_name || '';
            emailInputEl.value = profile.email || '';
            dobInputEl.value = profile.dob || '';
            
            // Set quiz type based on DOB
            const quizType = determineQuizTypeFromDOB(profile.dob);
            quizTitleEl.textContent = `Quiz — ${quizType.replace('_', ' ').toUpperCase()}`;
        }

        async function startQuiz() {
            const quizType = determineQuizTypeFromDOB(userProfile.dob);
            
            // Check attempt limit
            const allowed = await checkAttemptLimit(userId, quizType);
            if (!allowed) {
                alert('You have reached the limit of 5 quizzes for this type in the last 7 days. Try later.');
                return;
            }
            
            // Prepare quiz session - get questions from appropriate JSON
            quizQuestions = await fetchQuestionsForQuiz(quizType);
            if (quizQuestions.length === 0) {
                alert('No questions available at the moment.');
                return;
            }
            
            // For demo, we'll just use 3 questions
            quizQuestions = quizQuestions.slice(0, 3);
            
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
            // In a real app, this would fetch from JSON files
            // For now, we'll use the question banks defined above
            return questionBanks[quizType] || [];
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
            // Update user's total points
            const newTotal = (userProfile.total_points || 0) + currentScore;
            userProfile.total_points = newTotal;
            
            // Update UI with new points
            userPointsEl.textContent = `Points: ${newTotal}`;
            mobileUserPointsEl.textContent = `Points: ${newTotal}`;
            
            // Save to localStorage
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            userData[userId] = userProfile;
            localStorage.setItem('userData', JSON.stringify(userData));
            
            // Update in Supabase
            supabase
                .from('users')
                .update({ total_points: newTotal })
                .eq('id', userId)
                .then(({ error }) => {
                    if (error) console.error('Error updating points:', error);
                });
            
            // Record this attempt to prevent repetition
            recordQuizAttempt(userProfile.dob);
            
            // Show results and hide quiz
            quizContainerEl.style.display = 'none';
            quizResultEl.style.display = 'block';
            finalScoreEl.textContent = currentScore;
        }

        function recordQuizAttempt(dob) {
            const quizType = determineQuizTypeFromDOB(dob);
            const now = new Date();
            const weekNumber = getWeekNumber(now);
            
            // Get existing attempts or initialize
            const attempts = JSON.parse(localStorage.getItem('quizAttempts') || '{}');
            if (!attempts[userId]) attempts[userId] = {};
            if (!attempts[userId][quizType]) attempts[userId][quizType] = {};
            
            // Record this week's attempt
            attempts[userId][quizType][weekNumber] = true;
            localStorage.setItem('quizAttempts', JSON.stringify(attempts));
        }

        async function checkAttemptLimit(userId, quizType) {
            const now = new Date();
            const weekNumber = getWeekNumber(now);
            
            // Get attempts data
            const attempts = JSON.parse(localStorage.getItem('quizAttempts') || '{}');
            
            // Check if user has already attempted this quiz type this week
            if (attempts[userId] && attempts[userId][quizType] && attempts[userId][quizType][weekNumber]) {
                return false;
            }
            
            return true;
        }

        function getWeekNumber(date) {
            const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
            const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
            return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        }

        async function loadPosts() {
            // Fetch posts with user info
            const { data: posts, error } = await supabase
                .from('posts')
                .select('id, user_id, content, image_path, created_at, users:users!posts_user_id_fkey(full_name, profile_photo)')
                .order('created_at', { ascending: false });
            
            const container = document.getElementById('postsFeed');
            container.innerHTML = '';
            
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
                
                el.innerHTML = `
                    <div class="post-head">
                        <img src="${(post.users && post.users.profile_photo) || 'https://via.placeholder.com/40'}" />
                        <strong>${(post.users && post.users.full_name) || 'User'}</strong>
                        <small>${postDate}</small>
                    </div>
                    <div class="post-body">
                        <p>${escapeHtml(post.content || '')}</p>
                        ${post.image_path ? `<img src="${post.image_path}" alt="post image" />` : ''}
                        <div class="post-actions">
                            <button class="share-btn" data-post-id="${post.id}"><i class="fas fa-share"></i> Share</button>
                            ${post.user_id === userId ? `<button class="delete-btn" data-post-id="${post.id}"><i class="fas fa-trash"></i> Delete</button>` : ''}
                        </div>
                    </div>
                `;
                
                container.appendChild(el);
            });

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

            // Attach delete handlers (own posts only)
            container.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const postId = btn.getAttribute('data-post-id');
                    if (!confirm('Delete this post? This cannot be undone.')) return;
                    const { error } = await supabase
                        .from('posts')
                        .delete()
                        .eq('id', postId)
                        .eq('user_id', userId);
                    if (error) {
                        console.error('Delete failed:', error);
                        alert(`Delete failed: ${error.message}`);
                        return;
                    }
                    loadPosts();
                });
            });
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
            // Fetch users from Supabase, ordered by points
            const { data: users, error } = await supabase
                .from('users')
                .select('*')
                .order('total_points', { ascending: false });
            
            if (error) {
                console.error('Error loading leaderboard:', error);
                return;
            }
            
            // Display top 3
            const top3El = document.getElementById('top3');
            top3El.innerHTML = '';
            
            if (users.length > 0) {
                users.slice(0, 3).forEach((user, index) => {
                    const medals = ['🥇', '🥈', '🥉'];
                    
                    const leaderEl = document.createElement('div');
                    leaderEl.className = 'leader';
                    leaderEl.innerHTML = `
                        <div class="leader-rank">${medals[index]}</div>
                        <img class="leader-img" src="${user.profile_photo || 'https://via.placeholder.com/80'}" alt="${user.full_name}">
                        <div class="leader-info">
                            <strong>${user.full_name}</strong>
                            <span>${user.total_points || 0} pts</span>
                        </div>
                    `;
                    
                    top3El.appendChild(leaderEl);
                });
                
                // Display all leaders
                const allEl = document.getElementById('leaderboardAll');
                allEl.innerHTML = '';
                
                users.forEach((user, index) => {
                    const leaderRow = document.createElement('div');
                    leaderRow.className = 'leader-row';
                    leaderRow.innerHTML = `
                        <div class="leader-row-user">
                            <span>${index + 1}.</span>
                            <img src="${user.profile_photo || 'https://via.placeholder.com/40'}" alt="${user.full_name}">
                            <strong>${user.full_name}</strong>
                        </div>
                        <span>${user.total_points || 0} pts</span>
                    `;
                    
                    allEl.appendChild(leaderRow);
                });
            } else {
                top3El.innerHTML = '<p>No leaderboard data available</p>';
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
            
            // Validate passwords if provided
            if (password) {
                if (password !== confirmPassword) {
                    alert('Passwords do not match');
                    return;
                }
                // Update password via Auth
                const { error } = await supabase.auth.updateUser({
                    password: password
                });
                
                if (error) {
                    alert('Error updating password: ' + error.message);
                    return;
                }
                
                alert('Password updated successfully!');
            }
            
            // Handle profile photo upload
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
            
            // Update name if changed
            if (name) {
                updates.full_name = name;
            }
            
            // Update email if changed
            if (email) {
                updates.email = email;
            }
            
            // Update user record if there are changes
            if (Object.keys(updates).length > 0) {
                // Update in Supabase
                const { error } = await supabase
                    .from('users')
                    .update(updates)
                    .eq('id', userId);
                
                if (error) {
                    console.error('Error updating profile:', error);
                    alert('Error updating profile. Please try again.');
                    return;
                }
                
                // Update user profile
                Object.assign(userProfile, updates);
                
                // Save to localStorage
                const userData = JSON.parse(localStorage.getItem('userData') || '{}');
                userData[userId] = userProfile;
                localStorage.setItem('userData', JSON.stringify(userData));
                
                // Refresh UI
                renderUserSummary(userProfile);
                
                alert('Profile updated successfully!');
            } else {
                alert('No changes to save');
            }
        }

        async function logout() {
            // Sign out from Supabase Auth
            const { error } = await supabase.auth.signOut();
            
            if (error) {
                console.error('Error signing out:', error);
            }
            
            // Remove user ID from localStorage
            localStorage.removeItem('sd_user_id');
            window.location.href = 'index.html';
        }

        async function deleteAccount() {
            if (!confirm('Are you sure? This will delete all your data and cannot be undone.')) {
                return;
            }
            
            // Delete user from Supabase
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', userId);
            
            if (error) {
                console.error('Error deleting account:', error);
                alert('Error deleting account. Please try again.');
                return;
            }
            
            // Also delete posts
            await supabase
                .from('posts')
                .delete()
                .eq('user_id', userId);
            
            // Sign out and redirect
            await supabase.auth.signOut();
            localStorage.removeItem('sd_user_id');
            alert('Your account has been deleted successfully.');
            window.location.href = 'index.html';
        }

        // Helper function to escape HTML
        function escapeHtml(str) {
            return (str || '').replace(/[&<>'"]/g, c => ({ 
                '&': '&amp;', 
                '<': '&lt;', 
                '>': '&gt;', 
                '"': '&quot;', 
                "'": '&#39;' 
            }[c]));
        }
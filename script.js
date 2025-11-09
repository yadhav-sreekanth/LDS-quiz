const SUPABASE_URL = "https://qcvbqizwmhtuinpqtbzz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmJxaXp3bWh0dWlucHF0Ynp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1OTgyMjIsImV4cCI6MjA3MzE3NDIyMn0.cSRjn0n1MowMMkILc-WEuotSN2Cj78jpbxJhtEqRjl4";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
//  Wait for DOM to fully load

document.addEventListener('DOMContentLoaded', function() {
  // Modal toggle elements
  const startBtn = document.getElementById("startBtn");
  const joinBtn = document.getElementById("joinBtn");
  const modal = document.getElementById("authModal");
  const closeModal = document.getElementById("closeModal");
  const mainContent = document.getElementById("mainContent");

  // Tabs and forms
  const signInTab = document.getElementById("signInTab");
  const signUpTab = document.getElementById("signUpTab");
  const signInForm = document.getElementById("signInForm");
  const signUpForm = document.getElementById("signUpForm");

  // Header for scroll effect
  const header = document.getElementById("header");

  // Open modal function
  function openModal() {
    modal.style.display = "flex";
    document.body.style.overflow = "hidden"; // Prevent scrolling when modal is open
    // Reset to sign up tab when opening
    switchTab('signUp');
  }

  // Close modal function
  function closeModalFunc() {
    modal.style.display = "none";
    document.body.style.overflow = "auto"; // Re-enable scrolling
    mainContent.style.filter = "none";
  }

  // Switch tabs function
  function switchTab(tab) {
    if (tab === 'signUp') {
      signUpTab.classList.add("active");
      signInTab.classList.remove("active");
      signUpForm.classList.add("active");
      signInForm.classList.remove("active");
    } else {
      signInTab.classList.add("active");
      signUpTab.classList.remove("active");
      signInForm.classList.add("active");
      signUpForm.classList.remove("active");
    }
  }

  // Event listeners for opening modal
  if (startBtn) {
    startBtn.addEventListener('click', openModal);
  }
  
  if (joinBtn) {
    joinBtn.addEventListener('click', openModal);
  }

  // Event listener for closing modal
  if (closeModal) {
    closeModal.addEventListener('click', closeModalFunc);
  }

  // Close modal when clicking outside
  window.addEventListener('click', function(event) {
    if (event.target === modal) {
      closeModalFunc();
    }
  });

  // Tab switching event listeners
  if (signInTab) {
    signInTab.addEventListener('click', function() {
      switchTab('signIn');
    });
  }

  if (signUpTab) {
    signUpTab.addEventListener('click', function() {
      switchTab('signUp');
    });
  }

 signUpForm.addEventListener('submit', async function (e) {
  e.preventDefault();

  const name = this.querySelector('input[type="text"]').value.trim();
  const email = this.querySelector('input[type="email"]').value.trim();
  const password = this.querySelector('input[type="password"]').value.trim();
  const classValue = this.querySelector('#classSelect').value;

  if (!name || !email || !password || !classValue) {
    alert('Please fill in all fields');
    return;
  }

  try {
    // 1️⃣ Supabase auth signup (metadata must use `cls`)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, cls: parseInt(classValue, 10) },
        emailRedirectTo: 'https://yadhav-sreekanth.github.io/LDS-quiz/auth/auth.html'
      }
    });

    if (authError) {
      alert('Sign-Up Error: ' + authError.message);
      console.error(authError);
      return;
    }

    if (!authData.user) {
      alert('Signup failed: no user returned.');
      return;
    }

    // 2️⃣ Promotion logic (optional — promote after June)
    function getCurrentClass(userClass) {
      const today = new Date();
      const currentYear = today.getFullYear();
      const juneFirst = new Date(currentYear, 5, 1); // June = 5 (0-based)
      let cls = parseInt(userClass, 10);
      if (today >= juneFirst && cls < 10) cls += 1;
      return cls;
    }

    const currentClass = getCurrentClass(classValue);

    // 3️⃣ Insert into your `users` table (use `cls`)
    const { error: tableError } = await supabase
      .from('users')
      .insert([{
        id: authData.user.id,
        full_name: name,
        cls: currentClass,
        total_points: 0
      }]);

    if (tableError) {
      console.error('Error storing data in users table:', tableError);
      // optional: continue anyway
    }

    alert('Check your email to confirm your account!');
    closeModalFunc();

  } catch (error) {
    console.error('Unexpected error:', error);
    alert('An unexpected error occurred. Please try again.');
  }
});


// Add this to your script.js file after successful sign-in
if (signInForm) {
  signInForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    const email = this.querySelector('input[type="email"]').value;
    const password = this.querySelector('input[type="password"]').value;

    if (!email || !password) {
      alert('Please fill in all fields');
      return;
    }

    // Supabase signin
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      alert("Sign In Error: " + error.message);
      console.error(error);
      return;
    }

    // Store user ID in localStorage for home.html to access
    localStorage.setItem('sd_user_id', data.user.id);
    
    // Also store user data for the home page
    const userData = {
      id: data.user.id,
      email: data.user.email,
      full_name: data.user.user_metadata.name || 'Student',
      cls: data.user.user_metadata.cls || '',
      total_points: 0,
      profile_photo: 'https://via.placeholder.com/48'
    };
    
    // Save to localStorage
    localStorage.setItem('userData', JSON.stringify({
      [data.user.id]: userData
    }));

// Show animation overlay
const animation = document.getElementById("loginAnimation");
const animationLogo = document.getElementById("animationLogo");
const animationText = document.getElementById("animationText");

// Display overlay
animation.style.display = "flex";

// Close modal
closeModalFunc();

// Trigger animations
setTimeout(() => {
  animationLogo.classList.add("animate");
  animationText.classList.add("animate");
}, 50);

// Redirect after animation
setTimeout(() => {
  animation.style.display = "none";
  window.location.href = "home.html";
}, 2500); // 2.5s animation

  });
}

// Also add this to handle the auth state change properly
supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    console.log("User is logged in:", session.user);
    // Store user ID for home.html
    localStorage.setItem('sd_user_id', session.user.id);
    
    // Make sure user data exists in localStorage
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    if (!userData[session.user.id]) {
      userData[session.user.id] = {
        id: session.user.id,
        email: session.user.email,
        full_name: session.user.user_metadata.name || 'Student',
        cls: session.user.user_metadata.cls || '',
        total_points: 0,
        profile_photo: 'https://via.placeholder.com/48'
      };
      localStorage.setItem('userData', JSON.stringify(userData));
    }
  } else {
    console.log("User is logged out");
    // Remove user ID from localStorage when logged out
    localStorage.removeItem('sd_user_id');
  }
});

  // Header scroll effect
  window.addEventListener('scroll', function() {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  // Smooth scrolling for navigation links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      
      if (targetId === '#') return;
      
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        // Calculate header height for offset
        const headerHeight = header.offsetHeight;
        const targetPosition = targetElement.offsetTop - headerHeight;
        
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });

  // Animation on scroll
  function animateOnScroll() {
    const elements = document.querySelectorAll('.fade-in, .slide-in, .slide-up');
    
    elements.forEach(element => {
      const elementPosition = element.getBoundingClientRect().top;
      const screenPosition = window.innerHeight / 1.3;
      
      if (elementPosition < screenPosition) {
        element.style.opacity = 1;
        element.style.transform = 'translate(0, 0)';
      }
    });
  }

  // Initial check for elements in view
  window.addEventListener('load', animateOnScroll);
  window.addEventListener('scroll', animateOnScroll);
});
supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    console.log("User is logged in:", session.user);
    // maybe update UI with user info
  } else {
    console.log("User is logged out");
  }
});
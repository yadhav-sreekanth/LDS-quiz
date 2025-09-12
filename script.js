// Wait for DOM to fully load
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

  // Form submission handlers
if (signUpForm) {
  signUpForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    const name = this.querySelector('input[type="text"]').value;
    const email = this.querySelector('input[type="email"]').value;
    const password = this.querySelector('input[type="password"]').value;
    const dob = this.querySelector('input[type="date"]').value;

    if (!name || !email || !password || !dob) {
      alert('Please fill in all fields');
      return;
    }

    // Supabase signup
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, dob } // stores extra info in user metadata
      }
    });

    if (error) {
      alert("Sign Up Error: " + error.message);
      console.error(error);
      return;
    }

    alert("Check your email to confirm your account!");
    console.log("User signed up:", data);
    closeModalFunc();
  });
}

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

alert("Welcome back!");
console.log("User signed in:", data);
closeModalFunc();

// Redirect to home.html
window.location.href = "home.html";

  });
}

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

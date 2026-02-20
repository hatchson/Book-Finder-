const SUPABASE_URL = 'https://ojdogqpkfjcuerwppozo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qZG9ncXBrZmpjdWVyd3Bwb3pvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NDc0MTYsImV4cCI6MjA4NzEyMzQxNn0.9-HeTy7QJ3BR1Jab8MUJhuZtJp3prJ7jEXxzCilhpi4';  // your anon/public key
const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// ← Paste your Google Books API key here
const API_KEY = 'AIzaSyBCqpaPv8pOAfdfXOiuTFAp61UYnwUKPC0';   // ← AIzaSyC...  (from Google Cloud Console)

// STATE
let currentUser = null;
let userGenres = [];
let savedBooks = [];
function updateAuthUI() { /* your code */ }

// SIGNUP/LOGIN CLICK HANDLER - this is the key part
if (elements.authAction) {
  elements.authAction.onclick = async () => {
    const email = elements.email?.value?.trim();
    const password = elements.password?.value?.trim();

    if (!email || !password) {
      if (elements.authMessage) {
        elements.authMessage.textContent = "Please enter email and password";
        elements.authMessage.className = "message error";
      }
      return;
    }

    if (elements.authMessage) {
      elements.authMessage.textContent = "Processing...";
      elements.authMessage.className = "message";
    }

    let result;
    try {
      if (isSignUp) {
        result = await supabase.auth.signUp({ email, password });
      } else {
        result = await supabase.auth.signInWithPassword({ email, password });
      }

      if (result.error) {
        if (elements.authMessage) {
          elements.authMessage.textContent = result.error.message;
          elements.authMessage.className = "message error";
        }
        return;
      }

      // Success
      if (result.data.session) {
        // Auto-login (confirmation disabled)
        currentUser = result.data.user;
        await loadUserData();
        if (elements.authMessage) {
          elements.authMessage.textContent = "Success! Redirecting...";
          elements.authMessage.className = "message success";
        }
        // Redirect after short delay
        setTimeout(() => {
          window.location.href = 'search.html';
        }, 1200);
      } else if (isSignUp) {
        // Confirmation enabled - redirect to confirm page
        if (elements.authMessage) {
          elements.authMessage.textContent = "Account created! Check your email to confirm. Redirecting...";
          elements.authMessage.className = "message success";
        }
        setTimeout(() => {
          window.location.href = 'confirm.html';
        }, 1500);
      } else {
        if (elements.authMessage) {
          elements.authMessage.textContent = "Login successful but no session - try again";
          elements.authMessage.className = "message error";
        }
      }
    } catch (err) {
      if (elements.authMessage) {
        elements.authMessage.textContent = "Network error - check console";
        elements.authMessage.className = "message error";
      }
      console.error('Auth error:', err);
    }
  };
}

// In completeLogin() or onAuthStateChange - add redirect if needed
function completeLogin() {
  // ... your code ...
  if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
    window.location.href = 'search.html';
  }
}

// On all pages - check session and redirect if not logged in
(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session && !window.location.pathname.includes('index.html')) {
    window.location.href = 'index.html';
  }
  // ... rest of init ...
})();

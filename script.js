const SUPABASE_URL = 'https://ojdogqpkfjcuerwppozo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qZG9ncXBrZmpjdWVyd3Bwb3pvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NDc0MTYsImV4cCI6MjA4NzEyMzQxNn0.9-HeTy7QJ3BR1Jab8MUJhuZtJp3prJ7jEXxzCilhpi4';  // your anon/public key
const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// ← Paste your Google Books API key here
const API_KEY = 'AIzaSyBCqpaPv8pOAfdfXOiuTFAp61UYnwUKPC0';   // ← AIzaSyC...  (from Google Cloud Console)

// ────────────────────────────────────────────────
//  CONFIG
// ────────────────────────────────────────────────
const SUPABASE_URL    = 'https://your-project-ref.supabase.co';
const SUPABASE_ANON   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-anon-key-here';

const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

const API_KEY = 'YOUR_GOOGLE_BOOKS_API_KEY_HERE';   // ← Paste your real key

const COMMON_GENRES = [
  "Fiction", "Mystery", "Thriller", "Fantasy", "Science Fiction",
  "Romance", "Horror", "Historical Fiction", "Non-Fiction",
  "Biography", "Memoir", "Self-Help", "Young Adult", "Children's",
  "Poetry", "Classics", "Literary Fiction", "Crime"
];

// ────────────────────────────────────────────────
//  STATE + DOM (unchanged from before)
// ────────────────────────────────────────────────
let currentUser = null;
let userGenres  = [];
let savedBooks  = [];

const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

const elements = {
  greeting:       $('greeting'),
  authScreen:     $('auth-screen'),
  genreScreen:    $('genre-screen'),
  mainNav:        $('main-nav'),
  authTitle:      $('auth-title'),
  authAction:     $('auth-action'),
  toggleMode:     $('toggle-mode'),
  authMessage:    $('auth-message'),
  email:          $('email'),
  password:       $('password'),
  genreList:      $('genre-list'),
  saveGenresBtn:  $('save-genres-btn'),
  searchQuery:    $('search-query'),
  searchButton:   $('search-button'),
  searchResults:  $('search-results'),
  recommendations:$('recommendations'),
  statsContent:   $('stats-content'),
  locationStatus: $('location-status'),
  locateBtn:      $('locate-btn'),
  libraryList:    $('library-list'),
  logoutBtn:      $('logout-btn')
};

let isSignUp = false;

function updateAuthUI() {
  elements.authTitle.textContent   = isSignUp ? "Create Account" : "Sign In";
  elements.authAction.textContent   = isSignUp ? "Sign Up" : "Sign In";
  elements.toggleMode.textContent   = isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up";
  elements.authMessage.textContent  = "";
}

elements.toggleMode.onclick = () => {
  isSignUp = !isSignUp;
  updateAuthUI();
};

elements.authAction.onclick = async () => {
  const email    = elements.email.value.trim();
  const password = elements.password.value.trim();

  if (!email || !password) {
    elements.authMessage.textContent = "Email and password are required";
    elements.authMessage.className = "message error";
    return;
  }

  elements.authMessage.textContent = "Processing...";
  elements.authMessage.className = "message";

  console.log(`[Auth] Attempting ${isSignUp ? 'signup' : 'login'} for ${email}`);

  let result;

  try {
    if (isSignUp) {
      result = await supabase.auth.signUp({ email, password });
    } else {
      result = await supabase.auth.signInWithPassword({ email, password });
    }

    console.log('[Auth] Raw result:', result);

    if (result.error) {
      let msg = result.error.message;
      if (msg.includes('not authorized')) {
        msg = "Signup restricted – use your dashboard email or set up custom SMTP (check Supabase Auth settings)";
      } else if (msg.includes('confirmed')) {
        msg = "Email not confirmed – check your inbox (or disable confirmation in dashboard)";
      } else if (msg.includes('already registered')) {
        msg = "Email already in use – try signing in instead";
      }
      elements.authMessage.textContent = msg;
      elements.authMessage.className = "message error";
      console.error('[Auth] Error:', result.error);
      return;
    }

    // Signup with confirmation off → should have session immediately
    if (result.data.session) {
      currentUser = result.data.user;
      await loadUserData();
      completeLogin();
      elements.authMessage.textContent = "Success! You're in.";
      elements.authMessage.className = "message success";
    } else if (isSignUp) {
      // Confirmation still on somehow
      elements.authMessage.textContent = "Check your email to confirm signup (confirmation is still enabled in dashboard)";
      elements.authMessage.className = "message success";
    } else {
      elements.authMessage.textContent = "Login failed – no session returned";
      elements.authMessage.className = "message error";
    }

  } catch (err) {
    console.error('[Auth] Exception:', err);
    elements.authMessage.textContent = "Network or client error – check console & Supabase URL/key";
    elements.authMessage.className = "message error";
  }
};

// The rest of your code (loadUserData, saveUserData, completeLogin, renderGenres, saveGenresBtn.onclick, showTab, searchBooks, etc.) remains the same as in the previous version.
// Just make sure to keep the onAuthStateChange and initial getSession() at the bottom.

supabase.auth.onAuthStateChange(async (event, session) => {
  console.log('[Auth] State changed:', event, session ? 'session exists' : 'no session');
  if (session) {
    currentUser = session.user;
    await loadUserData();
    completeLogin();
  } else {
    currentUser = null;
    elements.authScreen.classList.remove('hidden');
    elements.mainNav.classList.add('hidden');
    elements.genreScreen.classList.add('hidden');
  }
});

(async () => {
  console.log('[Init] Checking existing session...');
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    console.log('[Init] Found existing session');
    currentUser = session.user;
    await loadUserData();
    completeLogin();
  } else {
    updateAuthUI();
  }
})();

const SUPABASE_URL = 'https://ojdogqpkfjcuerwppozo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qZG9ncXBrZmpjdWVyd3Bwb3pvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NDc0MTYsImV4cCI6MjA4NzEyMzQxNn0.9-HeTy7QJ3BR1Jab8MUJhuZtJp3prJ7jEXxzCilhpi4';  // your anon/public key
const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// ← Paste your Google Books API key here
const API_KEY = 'AIzaSyBCqpaPv8pOAfdfXOiuTFAp61UYnwUKPC0';   // ← AIzaSyC...  (from Google Cloud Console)

// STATE
let currentUser = null;
let userGenres = [];
let savedBooks = [];

// DOM (adjusted for multi-page – some elements optional per page)
const $ = id => document.getElementById(id);
const elements = {
  greeting: $ ('greeting'),
  authScreen: $ ('auth-screen'),
  genreScreen: $ ('genre-screen'),
  mainNav: $ ('main-nav'),
  authTitle: $ ('auth-title'),
  authAction: $ ('auth-action'),
  toggleMode: $ ('toggle-mode'),
  authMessage: $ ('auth-message'),
  email: $ ('email'),
  password: $ ('password'),
  genreList: $ ('genre-list'),
  saveGenresBtn: $ ('save-genres-btn'),
  content: $ ('content'),
  searchQuery: $ ('search-query'),
  searchButton: $ ('search-button'),
  searchResults: $ ('search-results'),
  recommendations: $ ('recommendations'),
  statsContent: $ ('stats-content'),
  locationStatus: $ ('location-status'),
  locateBtn: $ ('locate-btn'),
  libraryList: $ ('library-list'),
  logoutBtn: $ ('logout-btn')
};

// AUTH (improved)
let isSignUp = false;

function updateAuthUI() {
  if (elements.authTitle) elements.authTitle.textContent = isSignUp ? "Create Account" : "Sign In";
  if (elements.authAction) elements.authAction.textContent = isSignUp ? "Sign Up" : "Sign In";
  if (elements.toggleMode) elements.toggleMode.textContent = isSignUp ? "Sign In" : "Sign Up";
  if (elements.authMessage) elements.authMessage.textContent = "";
}

if (elements.toggleMode) elements.toggleMode.onclick = () => {
  isSignUp = !isSignUp;
  updateAuthUI();
};

if (elements.authAction) elements.authAction.onclick = async () => {
  const email = elements.email.value.trim();
  const password = elements.password.value.trim();

  if (!email || !password) {
    elements.authMessage.textContent = "Email and password are required";
    elements.authMessage.className = "message error";
    return;
  }

  elements.authMessage.textContent = "Processing...";
  elements.authMessage.className = "message";

  let result;
  if (isSignUp) {
    result = await supabase.auth.signUp({ email, password });
  } else {
    result = await supabase.auth.signInWithPassword({ email, password });
  }

  if (result.error) {
    elements.authMessage.textContent = result.error.message;
    elements.authMessage.className = "message error";
    return;
  }

  if (result.data.user && !result.data.session) {
    elements.authMessage.textContent = "Check your email to confirm";
    elements.authMessage.className = "message success";
    return;
  }

  currentUser = result.data.user;
  await loadUserData();
  completeLogin();
};

// DATA (unchanged)
async function loadUserData() {
  /* unchanged from previous */
}

async function saveUserData() {
  /* unchanged from previous */
}

function completeLogin() {
  const name = currentUser.email.split('@')[0];
  elements.greeting.textContent = `Welcome, ${name}`;
  if (elements.authScreen) elements.authScreen.classList.add('hidden');
  if (elements.mainNav) elements.mainNav.classList.remove('hidden');

  if (userGenres.length === 0) {
    if (elements.genreScreen) elements.genreScreen.classList.remove('hidden');
    renderGenres();
  } else {
    window.location.href = 'search.html'; // Redirect to search after login
  }

  updateStats();
}

// GENRES (unchanged)
function renderGenres() {
  /* unchanged */
}

if (elements.saveGenresBtn) elements.saveGenresBtn.onclick = async () => {
  /* unchanged, but add redirect after save */
  await saveUserData();
  elements.genreScreen.classList.add('hidden');
  window.location.href = 'search.html';
};

// SEARCH (unchanged, but only if elements exist)
if (elements.searchButton) elements.searchButton.onclick = searchBooks;
if (elements.searchQuery) elements.searchQuery.onkeypress = e => { if (e.key === 'Enter') searchBooks(); };

async function searchBooks() {
  /* unchanged */
}

// RECOMMENDATIONS (unchanged, if elements exist)
function renderRecommendations() {
  /* unchanged */
}

// STATS (unchanged)
function updateStats() {
  /* unchanged */
}

// LOCATION (unchanged)
if (elements.locateBtn) elements.locateBtn.onclick = () => {
  /* unchanged */
};

// LOGOUT (unchanged)
if (elements.logoutBtn) elements.logoutBtn.onclick = async () => {
  await supabase.auth.signOut();
  window.location.href = 'index.html';
};

// INIT (run on every page)
supabase.auth.onAuthStateChange(async (event, session) => {
  if (session) {
    currentUser = session.user;
    await loadUserData();
    elements.greeting.textContent = `Welcome, ${session.user.email.split('@')[0]}`;
    if (elements.mainNav) elements.mainNav.classList.remove('hidden');
    if (elements.content) elements.content.classList.remove('hidden');
    if (window.location.pathname.endsWith('next.html')) renderRecommendations();
    if (window.location.pathname.endsWith('stats.html')) updateStats();
  } else {
    window.location.href = 'index.html';
  }
});

(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    currentUser = session.user;
    await loadUserData();
    elements.greeting.textContent = `Welcome, ${session.user.email.split('@')[0]}`;
    if (elements.mainNav) elements.mainNav.classList.remove('hidden');
    if (elements.content) elements.content.classList.remove('hidden');
    if (window.location.pathname.endsWith('next.html')) renderRecommendations();
    if (window.location.pathname.endsWith('stats.html')) updateStats();
  } else {
    if (!window.location.pathname.endsWith('index.html')) {
      window.location.href = 'index.html';
    }
  }
  if (elements.authScreen) updateAuthUI();
})();

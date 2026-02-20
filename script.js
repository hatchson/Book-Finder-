const SUPABASE_URL = 'https://ojdogqpkfjcuerwppozo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qZG9ncXBrZmpjdWVyd3Bwb3pvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NDc0MTYsImV4cCI6MjA4NzEyMzQxNn0.9-HeTy7QJ3BR1Jab8MUJhuZtJp3prJ7jEXxzCilhpi4';  // your anon/public key
const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// ← Paste your Google Books API key here
const API_KEY = 'YOUR_KEY_HERE';   // ← AIzaSyC...  (from Google Cloud Console)

const COMMON_GENRES = [
  "Fiction", "Mystery", "Thriller", "Fantasy", "Science Fiction",
  "Romance", "Horror", "Historical Fiction", "Non-Fiction",
  "Biography", "Memoir", "Self-Help", "Young Adult", "Children's",
  "Poetry", "Classics", "Literary Fiction", "Crime"
];

// ────────────────────────────────────────────────
//  STATE
// ────────────────────────────────────────────────
let currentUser = null;
let userGenres  = [];
let savedBooks  = [];

// ────────────────────────────────────────────────
//  DOM
// ────────────────────────────────────────────────
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

// ────────────────────────────────────────────────
//  AUTH UI
// ────────────────────────────────────────────────
let isSignUp = false;

function updateAuthUI() {
  elements.authTitle.textContent   = isSignUp ? "Create Account" : "Sign In";
  elements.authAction.textContent   = isSignUp ? "Sign Up" : "Sign In";
  elements.toggleMode.textContent   = isSignUp ? "Sign In" : "Sign Up";
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
    elements.authMessage.textContent = "Please fill in both fields";
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

  // If sign-up requires email confirmation
  if (result.data.user && !result.data.session) {
    elements.authMessage.textContent = "Check your email to confirm your account";
    elements.authMessage.className = "message success";
    return;
  }

  currentUser = result.data.user;
  await loadUserData();
  completeLogin();
};

// ────────────────────────────────────────────────
//  DATA
// ────────────────────────────────────────────────
async function loadUserData() {
  if (!currentUser) return;

  const { data, error } = await supabase
    .from('user_data')
    .select('*')
    .eq('user_id', currentUser.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error("Load error:", error);
    return;
  }

  if (data) {
    userGenres = data.favorite_genres || [];
    savedBooks = data.searched_books || [];
  } else {
    // Create first record
    await supabase.from('user_data').insert({
      user_id: currentUser.id,
      username: currentUser.email.split('@')[0],
      favorite_genres: [],
      searched_books: []
    });
    userGenres = [];
    savedBooks = [];
  }
}

async function saveUserData() {
  if (!currentUser) return;
  await supabase
    .from('user_data')
    .update({
      favorite_genres: userGenres,
      searched_books: savedBooks
    })
    .eq('user_id', currentUser.id);
}

function completeLogin() {
  const name = currentUser.email.split('@')[0];
  elements.greeting.textContent = `Welcome, ${name}`;
  elements.authScreen.classList.add('hidden');
  elements.mainNav.classList.remove('hidden');

  if (userGenres.length === 0) {
    elements.genreScreen.classList.remove('hidden');
    renderGenres();
  } else {
    showTab('search');
  }

  updateStats();
}

// ────────────────────────────────────────────────
//  GENRES
// ────────────────────────────────────────────────
function renderGenres() {
  elements.genreList.innerHTML = '';
  COMMON_GENRES.forEach(genre => {
    const tag = document.createElement('div');
    tag.className = 'genre-tag';
    tag.textContent = genre;
    if (userGenres.includes(genre)) tag.classList.add('selected');

    tag.onclick = () => {
      if (userGenres.includes(genre)) {
        userGenres = userGenres.filter(g => g !== genre);
        tag.classList.remove('selected');
      } else {
        userGenres.push(genre);
        tag.classList.add('selected');
      }
    };

    elements.genreList.appendChild(tag);
  });
}

elements.saveGenresBtn.onclick = async () => {
  if (userGenres.length === 0) {
    alert("Please select at least one genre");
    return;
  }
  await saveUserData();
  elements.genreScreen.classList.add('hidden');
  showTab('search');
  updateStats();
};

// ────────────────────────────────────────────────
//  TABS
// ────────────────────────────────────────────────
function showTab(tab) {
  $$('.tab-content').forEach(el => el.classList.add('hidden'));
  $(`tab-${tab}`).classList.remove('hidden');

  $$('nav button[data-tab]').forEach(btn => btn.classList.remove('active'));
  document.querySelector(`nav button[data-tab="${tab}"]`).classList.add('active');

  if (tab === 'next') renderRecommendations();
  if (tab === 'stats') updateStats();
}

$$('nav button[data-tab]').forEach(btn => {
  btn.onclick = () => showTab(btn.dataset.tab);
});

// ────────────────────────────────────────────────
//  BOOK SEARCH  ←  now using your Google API key
// ────────────────────────────────────────────────
elements.searchButton.onclick = searchBooks;
elements.searchQuery.onkeypress = e => { if (e.key === 'Enter') searchBooks(); };

async function searchBooks() {
  const q = elements.searchQuery.value.trim();
  if (!q) {
    elements.searchResults.innerHTML = '<p class="message">Please enter a search term</p>';
    return;
  }

  elements.searchResults.innerHTML = '<p class="message">Searching...</p>';

  try {
    // Using your API key here
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=10&key=${API_KEY}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} – ${res.statusText}`);
    }

    const data = await res.json();

    if (!data.items?.length) {
      elements.searchResults.innerHTML = '<p class="message">No books found for this search.</p>';
      return;
    }

    elements.searchResults.innerHTML = '';

    data.items.forEach(item => {
      const info = item.volumeInfo;
      const title     = info.title || 'Unknown Title';
      const authors   = info.authors?.join(', ') || 'Unknown Author';
      const thumbnail = info.imageLinks?.thumbnail?.replace('http://', 'https://') 
                     || 'https://via.placeholder.com/128x192?text=No+Cover';
      const subjects  = info.categories || [];

      const card = document.createElement('div');
      card.className = 'book-card';
      card.innerHTML = `
        <img src="${thumbnail}" alt="${title}" loading="lazy">
        <div class="content">
          <strong>${title}</strong>
          <em>${authors}</em>
          <small>${subjects.join(', ') || '—'}</small>
        </div>
      `;

      card.onclick = async () => {
        const book = { 
          title, 
          author: authors, 
          genres: subjects, 
          thumbnail 
        };

        // Avoid duplicates
        if (!savedBooks.some(b => b.title === title && b.author === authors)) {
          savedBooks.push(book);
          await saveUserData();
          alert(`Added "${title}" to your saved books`);
          renderRecommendations();
          updateStats();
        }
      };

      elements.searchResults.appendChild(card);
    });
  } catch (err) {
    elements.searchResults.innerHTML = 
      `<p class="message error">Error: ${err.message}</p>`;
    console.error(err);
  }
}

// ────────────────────────────────────────────────
//  RECOMMENDATIONS (simple overlap-based)
// ────────────────────────────────────────────────
function renderRecommendations() {
  elements.recommendations.innerHTML = '';

  if (savedBooks.length === 0) {
    elements.recommendations.innerHTML = 
      '<p class="message">Save some books first to get recommendations.</p>';
    return;
  }

  const allGenres = new Set([...userGenres, ...savedBooks.flatMap(b => b.genres || [])]);

  const suggestions = savedBooks
    .filter(b => b.genres?.some(g => allGenres.has(g)))
    .slice(0, 8);

  if (suggestions.length === 0) {
    elements.recommendations.innerHTML = 
      '<p class="message">No matching recommendations yet.</p>';
    return;
  }

  suggestions.forEach(b => {
    const div = document.createElement('div');
    div.className = 'book-card';
    div.innerHTML = `
      <img src="${b.thumbnail}" alt="${b.title}" loading="lazy">
      <div class="content">
        <strong>${b.title}</strong>
        ${b.author}<br>
        <small>${b.genres?.join(', ') || '—'}</small>
      </div>
    `;
    elements.recommendations.appendChild(div);
  });
}

// ────────────────────────────────────────────────
//  STATS
// ────────────────────────────────────────────────
function updateStats() {
  elements.statsContent.innerHTML = `
    <p><strong>User:</strong> ${currentUser?.email || '—'}</p>
    <p><strong>Genres selected:</strong> ${userGenres.length} (${userGenres.join(', ') || 'none'})</p>
    <p><strong>Books saved:</strong> ${savedBooks.length}</p>
  `;
}

// ────────────────────────────────────────────────
//  LOCATION (demo)
// ────────────────────────────────────────────────
elements.locateBtn.onclick = () => {
  if (!navigator.geolocation) {
    elements.locationStatus.textContent = "Geolocation not supported in this browser";
    return;
  }

  elements.locationStatus.textContent = "Getting location...";

  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude, longitude } = pos.coords;
      elements.locationStatus.textContent = `≈ ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

      // Simulated libraries near Madison, MS
      const fakeLibs = [
        { name: "Madison County Library (Madison)", distance: "≈ 1–3 mi" },
        { name: "Ridgeland Public Library", distance: "≈ 7–9 mi" },
        { name: "Canton Public Library", distance: "≈ 12–15 mi" },
        { name: "Flowood Library", distance: "≈ 10–12 mi" }
      ];

      elements.libraryList.innerHTML = fakeLibs
        .map(l => `<p>${l.name} — ${l.distance}</p>`)
        .join('');
    },
    err => {
      elements.locationStatus.textContent = `Error: ${err.message}`;
    }
  );
};

// ────────────────────────────────────────────────
//  LOGOUT
// ────────────────────────────────────────────────
elements.logoutBtn.onclick = async () => {
  await supabase.auth.signOut();
  currentUser = null;
  userGenres = [];
  savedBooks = [];
  elements.greeting.textContent = "Please sign in or create an account";
  elements.mainNav.classList.add('hidden');
  elements.genreScreen.classList.add('hidden');
  elements.authScreen.classList.remove('hidden');
  isSignUp = false;
  updateAuthUI();
};

// ────────────────────────────────────────────────
//  INIT + AUTH LISTENER
// ────────────────────────────────────────────────
supabase.auth.onAuthStateChange(async (event, session) => {
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

// Initial session check on page load
(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    currentUser = session.user;
    await loadUserData();
    completeLogin();
  } else {
    updateAuthUI();
  }
})();

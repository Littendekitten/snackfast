import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==========================================
// 1. CONFIGURATIE & INITIALISATIE
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyAzp1WSzwYCfANWxJLqJFexHa173hs5Z2Y",
  authDomain: "kitacat-snackfast.firebaseapp.com",
  projectId: "kitacat-snackfast"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const FORMSPREE_URL = "https://formspree.io/f/xppzbpyz";

// App Status
let currentUser = null;
let userProfile = null;
let products = [];
let selectedProduct = null;

// Inlogstatus expliciet onthouden in de browser (Local Persistence)
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Fout bij instellen van persistence:", error);
});

// Vertalingen
const translations = {
  nl: { 
    jobs: "Werken bij ons?", 
    logout: "Uitloggen", 
    hero: "Snelle Bezorging" 
  },
  en: { 
    jobs: "Careers", 
    logout: "Logout", 
    hero: "Instant Delivery" 
  }
};

// ==========================================
// 2. AUTHENTICATIE & SESSIE BEHEER
// ==========================================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    document.getElementById('login-screen')?.classList.add('hidden');
    
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        userProfile = snap.data();
        applyTheme(userProfile.theme);
        showApp();
      } else {
        // Nieuwe gebruiker -> Toon onboarding
        document.getElementById('onboarding-screen')?.classList.remove('hidden');
      }
    } catch (e) {
      console.error("Fout bij ophalen gebruikersprofiel:", e);
    }
  } else {
    currentUser = null;
    userProfile = null;
    document.getElementById('login-screen')?.classList.remove('hidden');
    document.getElementById('app-container')?.classList.add('hidden');
    applyTheme('default');
  }
});

// ==========================================
// 3. HOOFD LOGICA & RENDEREN
// ==========================================
function showApp() {
  document.getElementById('onboarding-screen')?.classList.add('hidden');
  document.getElementById('app-container')?.classList.remove('hidden');
  
  const usernameEl = document.getElementById('display-username');
  if (usernameEl && userProfile) {
    usernameEl.innerText = userProfile.username || '';
  }
  
  applyTranslations(userProfile?.language || 'nl');
  
  loadProducts();
  loadLocations();
}

function applyTheme(theme) {
  if (theme && theme !== 'default') {
    document.body.className = `${theme}-mode`;
  } else {
    document.body.className = '';
  }
}

function applyTranslations(lang) {
  const t = translations[lang] || translations.nl;
  const jobsBtn = document.getElementById('nav-jobs-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const heroTitle = document.getElementById('txt-hero-title');

  if (jobsBtn) jobsBtn.innerText = t.jobs;
  if (logoutBtn) logoutBtn.innerText = t.logout;
  if (heroTitle) heroTitle.innerText = t.hero;
}

// ==========================================
// 4. DATA LADEN (PRODUCTEN & LOCATIES)
// ==========================================
async function loadProducts() {
  const grid = document.getElementById('product-grid');
  if (!grid) return;

  try {
    const snap = await getDocs(collection(db, "products"));
    products = [];
    snap.forEach(d => products.push({ id: d.id, ...d.data() }));

    if (products.length === 0) {
      grid.innerHTML = "<p>Geen producten gevonden.</p>";
      return;
    }
    
    grid.innerHTML = products.map(p => `
      <div class="card">
        <div class="card-img">
          <img src="${p.imageUrl || ''}" alt="${p.name || 'Product'}" style="max-height:100%;" />
        </div>
        <div class="card-body">
          <div class="card-title">${p.name || 'Naamloos product'}</div>
          <div class="card-price">€${Number(p.price || 0).toFixed(2)}</div>
          <button class="btn btn-primary buy-btn" data-id="${p.id}">Bestellen</button>
        </div>
      </div>
    `).join('');

    // Klikken op bestellen
    document.querySelectorAll('.buy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const prodId = e.target.dataset.id;
        selectedProduct = products.find(p => p.id === prodId);
        if (selectedProduct) {
          const price = Number(selectedProduct.price || 0);
          const total = price + 1.00;
          
          document.getElementById('modal-item-name').innerText = selectedProduct.name || '';
          document.getElementById('modal-item-price').innerText = `€${price.toFixed(2)}`;
          document.getElementById('modal-total-price').innerText = `€${total.toFixed(2)}`;
          document.getElementById('checkout-modal')?.classList.add('active');
        }
      });
    });
  } catch (e) {
    console.error("Fout bij laden producten:", e);
    grid.innerHTML = "<p>Kon producten niet laden.</p>";
  }
}

async function loadLocations() {
  const grid = document.getElementById('locations-grid');
  if (!grid) return;

  try {
    const snap = await getDocs(collection(db, "locations"));
    if (snap.empty) { 
      grid.innerHTML = "<p>Binnenkort openen we nieuwe locaties!</p>"; 
      return; 
    }
    
    let html = "";
    snap.forEach(d => {
      const loc = d.data();
      const addressText = loc.address || loc.adress || "Adres onbekend";
      const statusText = loc.status ? String(loc.status).toLowerCase() : "";
      const isOpen = statusText === 'open';

      html += `
        <div class="card" style="padding:1.5rem; background: var(--white);">
          <h3 style="color:var(--primary); margin-bottom:0.5rem;">${loc.name || 'Locatie'}</h3>
          <p><strong>Adres:</strong> ${addressText}</p>
          <p style="margin-top:10px; font-weight:bold; color: ${isOpen ? 'green' : 'orange'};">
            Status: ${loc.status || 'Onbekend'}
          </p>
        </div>
      `;
    });
    grid.innerHTML = html;
  } catch(e) {
    console.error("Firestore Error (Locaties):", e);
    grid.innerHTML = "<p>Kon locaties niet laden.</p>";
  }
}

// ==========================================
// 5. EVENT LISTENERS & MODALS
// ==========================================

// In- & Uitloggen Event Listeners
document.getElementById('google-login-btn')?.addEventListener('click', () => {
  signInWithPopup(auth, new GoogleAuthProvider()).catch(err => {
    console.error("Inlogfout:", err);
  });
});

document.getElementById('logout-btn')?.addEventListener('click', () => {
  signOut(auth);
});

// Onboarding Form opslaan
document.getElementById('save-profile-btn')?.addEventListener('click', async () => {
  const usernameInput = document.getElementById('username-input')?.value.trim();
  const languageInput = document.getElementById('language-select')?.value || 'nl';

  if (!usernameInput) {
    alert("Vul een gebruikersnaam in.");
    return;
  }

  userProfile = {
    username: usernameInput,
    language: languageInput,
    theme: 'default'
  };

  try {
    await setDoc(doc(db, "users", currentUser.uid), userProfile);
    showApp();
  } catch (e) {
    console.error("Fout bij opslaan profiel:", e);
  }
});

// Checkout Modal
document.getElementById('modal-cancel')?.addEventListener('click', () => {
  document.getElementById('checkout-modal')?.classList.remove('active');
});

document.getElementById('modal-confirm')?.addEventListener('click', async () => {
  if (!selectedProduct) return;
  
  const price = Number(selectedProduct.price || 0);
  const total = price + 1.00;
  
  try {
    fetch(FORMSPREE_URL, {
      method: "POST", 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        subject: `Bestelling: ${userProfile?.username || 'Anoniem'}`, 
        Product: selectedProduct.name, 
        Totaal: `€${total.toFixed(2)}` 
      })
    });
  } catch (e) {
    console.error("Fout bij versturen bestelnotificatie:", e);
  }

  document.getElementById('checkout-modal')?.classList.remove('active');
  if (selectedProduct.tikkieUrl) {
    window.open(selectedProduct.tikkieUrl, '_blank');
  }
});

// Instellingen Modal
const settingsModal = document.getElementById('settings-modal');

document.getElementById('open-settings-btn')?.addEventListener('click', () => {
  if (userProfile) {
    const themeSelect = document.getElementById('theme-select');
    const langSelect = document.getElementById('settings-language-select');
    
    if (themeSelect) themeSelect.value = userProfile.theme || 'default';
    if (langSelect) langSelect.value = userProfile.language || 'nl';
  }
  settingsModal?.classList.add('active');
});

document.getElementById('close-settings-btn')?.addEventListener('click', () => {
  settingsModal?.classList.remove('active');
});

document.getElementById('save-settings-btn')?.addEventListener('click', async () => {
  const newTheme = document.getElementById('theme-select')?.value || 'default';
  const newLang = document.getElementById('settings-language-select')?.value || 'nl';

  if (!userProfile) userProfile = {};
  userProfile.theme = newTheme;
  userProfile.language = newLang;

  applyTheme(newTheme);
  applyTranslations(newLang);

  if (currentUser) {
    try {
      await setDoc(doc(db, "users", currentUser.uid), userProfile, { merge: true });
    } catch (e) {
      console.error("Fout bij opslaan instellingen:", e);
    }
  }

  settingsModal?.classList.remove('active');
});

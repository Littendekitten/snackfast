import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyAzp1WSzwYCfANWxJLqJFexHa173hs5Z2Y",
  authDomain: "kitacat-snackfast.firebaseapp.com",
  projectId: "kitacat-snackfast"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const FORMSPREE_URL = "https://formspree.io/f/xppzbpyz";

let currentUser = null;
let userProfile = null;
let products = [];
let selectedProduct = null;

// Vertalingen
const translations = {
  nl: { jobs: "Werken bij ons?", logout: "Uitloggen", hero: "Snelle Bezorging" },
  en: { jobs: "Careers", logout: "Logout", hero: "Instant Delivery" }
};

// Auth State Observer
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    document.getElementById('login-screen').classList.add('hidden');
    
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) {
      userProfile = snap.data();
      if (userProfile.theme && userProfile.theme !== 'default') {
        document.body.className = `${userProfile.theme}-mode`;
      } else {
        document.body.className = '';
      }
      showApp();
    } else {
      document.getElementById('onboarding-screen').classList.remove('hidden');
    }
  } else {
    currentUser = null;
    userProfile = null;
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('app-container').classList.add('hidden');
    document.body.className = '';
  }
});

// Inloggen & Uitloggen Buttons
document.getElementById('google-login-btn').addEventListener('click', () => {
  signInWithPopup(auth, new GoogleAuthProvider());
});

document.getElementById('logout-btn').addEventListener('click', () => {
  signOut(auth);
});

// Onboarding opslaan
document.getElementById('save-profile-btn').addEventListener('click', async () => {
  const usernameInput = document.getElementById('username-input').value.trim();
  const languageInput = document.getElementById('language-select').value;

  if (!usernameInput) {
    alert("Vul een gebruikersnaam in.");
    return;
  }

  userProfile = {
    username: usernameInput,
    language: languageInput,
    theme: 'default'
  };

  await setDoc(doc(db, "users", currentUser.uid), userProfile);
  showApp();
});

// App tonen en data laden
function showApp() {
  document.getElementById('onboarding-screen').classList.add('hidden');
  document.getElementById('app-container').classList.remove('hidden');
  document.getElementById('display-username').innerText = userProfile.username || '';
  
  applyTranslations(userProfile.language || 'nl');
  
  loadProducts();
  loadLocations();
}

// Vertalingen toepassen
function applyTranslations(lang) {
  const t = translations[lang] || translations.nl;
  document.getElementById('nav-jobs-btn').innerText = t.jobs;
  document.getElementById('logout-btn').innerText = t.logout;
  document.getElementById('txt-hero-title').innerText = t.hero;
}

// Producten laden uit Firestore
async function loadProducts() {
  const grid = document.getElementById('product-grid');
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
          <img src="${p.imageUrl || ''}" alt="${p.name}" style="max-height:100%;" />
        </div>
        <div class="card-body">
          <div class="card-title">${p.name}</div>
          <div class="card-price">€${Number(p.price || 0).toFixed(2)}</div>
          <button class="btn btn-primary buy-btn" data-id="${p.id}">Bestellen</button>
        </div>
      </div>
    `).join('');

    document.querySelectorAll('.buy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        selectedProduct = products.find(p => p.id === e.target.dataset.id);
        if (selectedProduct) {
          document.getElementById('modal-item-name').innerText = selectedProduct.name;
          document.getElementById('modal-item-price').innerText = `€${Number(selectedProduct.price).toFixed(2)}`;
          document.getElementById('modal-total-price').innerText = `€${(Number(selectedProduct.price) + 1).toFixed(2)}`;
          document.getElementById('checkout-modal').classList.add('active');
        }
      });
    });
  } catch (e) {
    console.error("Fout bij laden producten:", e);
    grid.innerHTML = "<p>Kon producten niet laden.</p>";
  }
}

// Locaties laden uit Firestore
async function loadLocations() {
  const grid = document.getElementById('locations-grid');
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
      const statusText = loc.status ? loc.status.toLowerCase() : "";
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
    console.error("Firestore Error:", e);
    grid.innerHTML = "<p>Kon locaties niet laden.</p>";
  }
}

// Checkout Modal Handling
document.getElementById('modal-cancel').addEventListener('click', () => {
  document.getElementById('checkout-modal').classList.remove('active');
});

document.getElementById('modal-confirm').addEventListener('click', async () => {
  if (!selectedProduct) return;
  
  const total = Number(selectedProduct.price) + 1;
  
  fetch(FORMSPREE_URL, {
    method: "POST", 
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      subject: `Bestelling: ${userProfile.username}`, 
      Product: selectedProduct.name, 
      Totaal: `€${total.toFixed(2)}` 
    })
  });

  document.getElementById('checkout-modal').classList.remove('active');
  if (selectedProduct.tikkieUrl) {
    window.open(selectedProduct.tikkieUrl, '_blank');
  }
});

// Settings Modal Handling
const settingsModal = document.getElementById('settings-modal');

document.getElementById('open-settings-btn').addEventListener('click', () => {
  if (userProfile) {
    document.getElementById('theme-select').value = userProfile.theme || 'default';
    document.getElementById('settings-language-select').value = userProfile.language || 'nl';
  }
  settingsModal.classList.add('active');
});

document.getElementById('close-settings-btn').addEventListener('click', () => {
  settingsModal.classList.remove('active');
});

document.getElementById('save-settings-btn').addEventListener('click', async () => {
  const newTheme = document.getElementById('theme-select').value;
  const newLang = document.getElementById('settings-language-select').value;

  userProfile.theme = newTheme;
  userProfile.language = newLang;

  // Pas het thema direct toe
  document.body.className = newTheme !== 'default' ? `${newTheme}-mode` : '';

  // Update taal
  applyTranslations(newLang);

  // Opslaan in Firebase Firestore
  if (currentUser) {
    await setDoc(doc(db, "users", currentUser.uid), userProfile, { merge: true });
  }

  settingsModal.classList.remove('active');
});

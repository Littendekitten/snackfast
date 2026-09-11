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

// Inlogstatus expliciet onthouden
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Fout bij instellen van persistence:", error);
});

// ==========================================
// 2. COMPLETE VERTALINGEN
// ==========================================
const translations = {
  nl: { 
    jobs: "Werken bij ons?", 
    logout: "Uitloggen", 
    heroTitle: "Snelle Bezorging",
    heroSub: "Selecteer een snack om direct via Tikkie te bestellen!",
    productsTitle: "Onze Producten",
    locationsTitle: "Onze Locaties",
    orderBtn: "Bestellen",
    addressLabel: "Adres",
    statusLabel: "Status",
    checkoutTitle: "Overzicht",
    priceLabel: "Prijs:",
    shippingInfo: "(+ €1,00 verzendkosten)",
    totalLabel: "Totaal:",
    cancelBtn: "Annuleren",
    payTikkieBtn: "Betaal via Tikkie",
    settingsTitle: "Instellingen",
    themeLabel: "Thema:",
    langLabel: "Taal / Language:",
    closeBtn: "Sluiten",
    saveBtn: "Opslaan",
    welcome: "Welkom!",
    chooseLang: "Kies je taal:",
    usernameLabel: "Gebruikersnaam (max 12):",
    startBtn: "Aan de slag",
    loginSubtitle: "Log in met Google om verder te gaan",
    noProducts: "Geen producten gevonden.",
    noLocations: "Binnenkort openen we nieuwe locaties!",
    loadError: "Kon gegevens niet laden."
  },
  en: { 
    jobs: "Work with us", 
    logout: "Logout", 
    heroTitle: "Instant Delivery",
    heroSub: "Select a snack to order directly via Tikkie!",
    productsTitle: "Our Products",
    locationsTitle: "Our Locations",
    orderBtn: "Order Now",
    addressLabel: "Address",
    statusLabel: "Status",
    checkoutTitle: "Order Overview",
    priceLabel: "Price:",
    shippingInfo: "(+ €1.00 delivery fee)",
    totalLabel: "Total:",
    cancelBtn: "Cancel",
    payTikkieBtn: "Pay via Tikkie",
    settingsTitle: "Settings",
    themeLabel: "Theme:",
    langLabel: "Language:",
    closeBtn: "Close",
    saveBtn: "Save",
    welcome: "Welcome!",
    chooseLang: "Choose language:",
    usernameLabel: "Username (max 12):",
    startBtn: "Get Started",
    loginSubtitle: "Sign in with Google to continue",
    noProducts: "No products found.",
    noLocations: "New locations coming soon!",
    loadError: "Could not load data."
  }
};

// ==========================================
// 3. AUTHENTICATIE & SESSIE BEHEER
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
        document.getElementById('onboarding-screen')?.classList.remove('hidden');
        applyTranslations('nl');
      }
    } catch (e) {
      console.error("Fout bij ophalen profiel:", e);
    }
  } else {
    currentUser = null;
    userProfile = null;
    document.getElementById('login-screen')?.classList.remove('hidden');
    document.getElementById('app-container')?.classList.add('hidden');
    applyTheme('default');
    applyTranslations('nl');
  }
});

// ==========================================
// 4. VERTAALLOGICA & RENDEREN
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
  
  // Elementen koppelen aan hun vertaling
  const setTxt = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
  };

  setTxt('nav-jobs-btn', t.jobs);
  setTxt('logout-btn', t.logout);
  setTxt('txt-hero-title', t.heroTitle);
  setTxt('txt-hero-sub', t.heroSub);
  setTxt('txt-products-title', t.productsTitle);
  setTxt('txt-locations-title', t.locationsTitle);
  setTxt('txt-checkout-title', t.checkoutTitle);
  setTxt('txt-price-label', t.priceLabel);
  setTxt('txt-shipping-info', t.shippingInfo);
  setTxt('txt-total-label', t.totalLabel);
  setTxt('modal-cancel', t.cancelBtn);
  setTxt('modal-confirm', t.payTikkieBtn);
  setTxt('txt-settings-title', t.settingsTitle);
  setTxt('txt-theme-label', t.themeLabel);
  setTxt('txt-lang-label', t.langLabel);
  setTxt('close-settings-btn', t.closeBtn);
  setTxt('save-settings-btn', t.saveBtn);
  setTxt('txt-welcome', t.welcome);
  setTxt('txt-choose-lang', t.chooseLang);
  setTxt('txt-username-label', t.usernameLabel);
  setTxt('save-profile-btn', t.startBtn);
  setTxt('txt-login-subtitle', t.loginSubtitle);
}

// ==========================================
// 5. DATA LADEN
// ==========================================
async function loadProducts() {
  const grid = document.getElementById('product-grid');
  if (!grid) return;
  const lang = userProfile?.language || 'nl';
  const t = translations[lang];

  try {
    const snap = await getDocs(collection(db, "products"));
    products = [];
    snap.forEach(d => products.push({ id: d.id, ...d.data() }));

    if (products.length === 0) {
      grid.innerHTML = `<p>${t.noProducts}</p>`;
      return;
    }
    
    grid.innerHTML = products.map(p => `
      <div class="card">
        <div class="card-img">
          <img src="${p.imageUrl || ''}" alt="${p.name || 'Product'}" style="max-height:100%;" />
        </div>
        <div class="card-body">
          <div class="card-title">${p.name || 'Product'}</div>
          <div class="card-price">€${Number(p.price || 0).toFixed(2)}</div>
          <button class="btn btn-primary buy-btn" data-id="${p.id}">${t.orderBtn}</button>
        </div>
      </div>
    `).join('');

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
    console.error("Fout bij producten:", e);
    grid.innerHTML = `<p>${t.loadError}</p>`;
  }
}

async function loadLocations() {
  const grid = document.getElementById('locations-grid');
  if (!grid) return;
  const lang = userProfile?.language || 'nl';
  const t = translations[lang];

  try {
    const snap = await getDocs(collection(db, "locations"));
    if (snap.empty) { 
      grid.innerHTML = `<p>${t.noLocations}</p>`; 
      return; 
    }
    
    let html = "";
    snap.forEach(d => {
      const loc = d.data();
      const addressText = loc.address || loc.adress || "Onbekend";
      const statusText = loc.status ? String(loc.status).toLowerCase() : "";
      const isOpen = statusText === 'open';

      html += `
        <div class="card" style="padding:1.5rem; background: var(--white);">
          <h3 style="color:var(--primary); margin-bottom:0.5rem;">${loc.name || 'Locatie'}</h3>
          <p><strong>${t.addressLabel}:</strong> ${addressText}</p>
          <p style="margin-top:10px; font-weight:bold; color: ${isOpen ? 'green' : 'orange'};">
            ${t.statusLabel}: ${loc.status || 'Onbekend'}
          </p>
        </div>
      `;
    });
    grid.innerHTML = html;
  } catch(e) {
    console.error("Fout bij locaties:", e);
    grid.innerHTML = `<p>${t.loadError}</p>`;
  }
}

// ==========================================
// 6. EVENT LISTENERS & MODALS
// ==========================================
document.getElementById('google-login-btn')?.addEventListener('click', () => {
  signInWithPopup(auth, new GoogleAuthProvider());
});

document.getElementById('logout-btn')?.addEventListener('click', () => {
  signOut(auth);
});

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

  await setDoc(doc(db, "users", currentUser.uid), userProfile);
  showApp();
});

document.getElementById('modal-cancel')?.addEventListener('click', () => {
  document.getElementById('checkout-modal')?.classList.remove('active');
});

document.getElementById('modal-confirm')?.addEventListener('click', async () => {
  if (!selectedProduct) return;
  const total = Number(selectedProduct.price || 0) + 1.00;
  
  fetch(FORMSPREE_URL, {
    method: "POST", 
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      subject: `Bestelling: ${userProfile?.username || 'Anoniem'}`, 
      Product: selectedProduct.name, 
      Totaal: `€${total.toFixed(2)}` 
    })
  });

  document.getElementById('checkout-modal')?.classList.remove('active');
  if (selectedProduct.tikkieUrl) {
    window.open(selectedProduct.tikkieUrl, '_blank');
  }
});

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
  
  // Reload cards so product & location buttons reflect the new language immediately
  loadProducts();
  loadLocations();

  if (currentUser) {
    await setDoc(doc(db, "users", currentUser.uid), userProfile, { merge: true });
  }

  settingsModal?.classList.remove('active');
});

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const app = initializeApp({
  apiKey: "AIzaSyAzp1WSzwYCfANWxJLqJFexHa173hs5Z2Y",
  authDomain: "kitacat-snackfast.firebaseapp.com",
  projectId: "kitacat-snackfast"
});
const auth = getAuth(app);
const db = getFirestore(app);
const FORMSPREE_URL = "https://formspree.io/f/xppzbpyz";

let currentUser = null, userProfile = null, products = [], selectedProduct = null;

// Translations including the Jobs button
const translations = {
  nl: { jobs: "Werken bij ons?", logout: "Uitloggen", hero: "Snelle Bezorging" },
  en: { jobs: "Careers", logout: "Logout", hero: "Instant Delivery" }
};

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    document.getElementById('login-screen').classList.add('hidden');
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) {
      userProfile = snap.data();
      showApp();
    } else {
      document.getElementById('onboarding-screen').classList.remove('hidden');
    }
  } else {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('app-container').classList.add('hidden');
  }
});

document.getElementById('google-login-btn').addEventListener('click', () => signInWithPopup(auth, new GoogleAuthProvider()));
document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));

function showApp() {
  document.getElementById('onboarding-screen').classList.add('hidden');
  document.getElementById('app-container').classList.remove('hidden');
  document.getElementById('display-username').innerText = userProfile.username;
  
  const lang = userProfile.language || 'nl';
  document.getElementById('nav-jobs-btn').innerText = translations[lang].jobs;
  
  loadProducts();
  loadLocations();
}

async function loadProducts() {
  const snap = await getDocs(collection(db, "products"));
  products = []; snap.forEach(d => products.push({ id: d.id, ...d.data() }));
  
  document.getElementById('product-grid').innerHTML = products.map(p => `
    <div class="card">
      <div class="card-img"><img src="${p.imageUrl}" style="max-height:100%;" /></div>
      <div class="card-body">
        <div class="card-title">${p.name}</div>
        <div class="card-price">€${Number(p.price).toFixed(2)}</div>
        <button class="btn btn-primary buy-btn" data-id="${p.id}">Bestellen</button>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.buy-btn').forEach(btn => btn.addEventListener('click', e => {
    selectedProduct = products.find(p => p.id === e.target.dataset.id);
    document.getElementById('modal-item-name').innerText = selectedProduct.name;
    document.getElementById('modal-item-price').innerText = `€${Number(selectedProduct.price).toFixed(2)}`;
    document.getElementById('modal-total-price').innerText = `€${(Number(selectedProduct.price) + 1).toFixed(2)}`;
    document.getElementById('checkout-modal').classList.add('active');
  }));
}

// 📍 NIEUW: Locaties laden uit Firestore
async function loadLocations() {
  const grid = document.getElementById('locations-grid');
  try {
    const snap = await getDocs(collection(db, "locations"));
    if (snap.empty) { grid.innerHTML = "<p>Binnenkort openen we nieuwe locaties!</p>"; return; }
    
    let html = "";
    snap.forEach(d => {
      const loc = d.data();
      html += `
        <div class="card" style="padding:1.5rem; background: var(--white);">
          <h3 style="color:var(--primary); margin-bottom:0.5rem;">${loc.name}</h3>
          <p><strong>Adres:</strong> ${loc.address}</p>
          <p style="margin-top:10px; font-weight:bold; color: ${loc.status === 'Open' ? 'green' : 'orange'};">
            Status: ${loc.status}
          </p>
        </div>
      `;
    });
    grid.innerHTML = html;
  } catch(e) {
    grid.innerHTML = "<p>Kon locaties niet laden.</p>";
  }
}

// Afrekenen logic (Formspree + Tikkie)
document.getElementById('modal-cancel').addEventListener('click', () => document.getElementById('checkout-modal').classList.remove('active'));
document.getElementById('modal-confirm').addEventListener('click', async () => {
  const total = Number(selectedProduct.price) + 1;
  fetch(FORMSPREE_URL, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subject: `Bestelling: ${userProfile.username}`, Product: selectedProduct.name, Totaal: `€${total}` })
  });
  document.getElementById('checkout-modal').classList.remove('active');
  window.open(selectedProduct.tikkieUrl, '_blank');
});

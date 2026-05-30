import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  getDocFromServer,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Firestore operation types
export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
};

// Error boundary mapper for diagnostic telemetry
export function handleFirestoreError(error, operationType, path, currentUser) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid || null,
      email: currentUser?.email || null,
      emailVerified: currentUser?.emailVerified || null,
      isAnonymous: currentUser?.isAnonymous || null,
    },
    operationType,
    path
  };
  console.error('[Telemetry] Firestore Operational Failure:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let app = null;
let auth = null;
let db = null;
let isConfigured = false;

const COLORS = ["#E85D2B", "#E8A22B", "#2BE87A", "#2BB5E8", "#9B2BE8", "#E82B6E", "#2BE8D4", "#E8E82B"];

export function pickColor(uid) {
  if (!uid) return COLORS[0];
  let h = 0;
  for (let c of uid) h = (h << 5) - h + c.charCodeAt(0);
  return COLORS[Math.abs(h) % COLORS.length];
}

export function initials(name) {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

// Dynamics initializer
export async function setupFirebase() {
  try {
    const response = await fetch('/firebase-applet-config.json');
    const firebaseConfig = await response.json();

    if (!firebaseConfig || firebaseConfig.apiKey === "PLACEHOLDER_API_KEY") {
      console.warn("Firebase credentials are empty or placeholders. Running in client-only local fallback.");
      return { isConfigured: false };
    }

    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    isConfigured = true;

    // Test connection as requested in skill Guidelines (Phase 1 Validation)
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (err) {
      if (err instanceof Error && err.message.includes('the client is offline')) {
        console.error("Please check your Firebase configuration: Client is offline");
      }
    }

    // Expose to window for inline HTML onclick binders safely
    window._xyzAuth = auth;
    window._xyzDb = db;
    window._pickColor = pickColor;
    window._initials = initials;

    return { isConfigured: true, auth, db };
  } catch (error) {
    console.error("Failed to load or boot Firebase system:", error);
    return { isConfigured: false, error };
  }
}

// Authentication APIs matching Claude's interface
export async function registerUser(username, email, password) {
  if (!isConfigured) throw new Error("Firebase account system is in pending configuration.");
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: username });
    
    const userDocRef = doc(db, "users", cred.user.uid);
    try {
      await setDoc(userDocRef, {
        username,
        email,
        avatarColor: pickColor(cred.user.uid),
        createdAt: serverTimestamp(),
        gamesPlayed: 0,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${cred.user.uid}`, cred.user);
    }
    return cred.user;
  } catch (error) {
    throw error;
  }
}

export async function loginUser(email, password) {
  if (!isConfigured) throw new Error("Firebase account system is in pending configuration.");
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function loginUserWithGoogle() {
  if (!isConfigured) throw new Error("Firebase account system is in pending configuration.");
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  
  // Create user document if it does not exist yet
  const userDocRef = doc(db, "users", cred.user.uid);
  try {
    const profile = await getDoc(userDocRef);
    if (!profile.exists()) {
      await setDoc(userDocRef, {
        username: cred.user.displayName || "Gamer",
        email: cred.user.email,
        avatarColor: pickColor(cred.user.uid),
        createdAt: serverTimestamp(),
        gamesPlayed: 0,
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${cred.user.uid}`, cred.user);
  }
  
  return cred.user;
}

export async function logoutUser() {
  if (auth) {
    await signOut(auth);
  }
}

export async function getUserProfile(uid) {
  if (!isConfigured) return null;
  const userDocRef = doc(db, "users", uid);
  try {
    const snap = await getDoc(userDocRef);
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${uid}`, auth?.currentUser);
  }
}

export async function updateUsername(uid, newUsername) {
  if (!isConfigured) return;
  const userDocRef = doc(db, "users", uid);
  try {
    await updateDoc(userDocRef, { username: newUsername });
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName: newUsername });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}`, auth?.currentUser);
  }
}

export async function incrementGamesPlayed(uid) {
  if (!isConfigured) return;
  const userDocRef = doc(db, "users", uid);
  try {
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      const currentCount = snap.data().gamesPlayed || 0;
      await updateDoc(userDocRef, { gamesPlayed: currentCount + 1 });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}`, auth?.currentUser);
  }
}

export function onUserChanged(callback) {
  if (!auth) {
    // Return unsubscribe void mock if not configured yet
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

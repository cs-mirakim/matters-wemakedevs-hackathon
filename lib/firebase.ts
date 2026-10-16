import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Automatically use the first-party domain on Vercel via Next.js rewrites to prevent adblock/tracker blocking
const getAuthDomain = () => {
  if (typeof window !== "undefined") {
    const host = window.location.host;
    if (host.includes("vercel.app") || host.includes("matters")) {
      return host;
    }
  }
  return process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "matters-app-80285.firebaseapp.com";
};

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDummyKeyForDevelopment",
  authDomain: getAuthDomain(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "matters-app-80285",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:790465288976:web:3bdf00d09f9874d5eaa395",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});


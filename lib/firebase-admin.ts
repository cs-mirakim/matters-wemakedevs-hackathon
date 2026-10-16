import * as admin from "firebase-admin";

let isInitialized = false;

function initializeAdmin() {
  if (admin.apps.length > 0) {
    return;
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  if (projectId && clientEmail && privateKey) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      isInitialized = true;
    } catch (e) {
      console.warn("[Firebase Admin] Initialization with cert failed:", e);
    }
  } else {
    // Development / fallback mode
    try {
      admin.initializeApp({
        projectId: projectId || "matters-dev",
      });
      isInitialized = true;
    } catch (e) {
      // Ignored if already initialized
    }
  }
}

/**
 * Sahkan Firebase ID Token daripada Authorization Header.
 * Jika tiada token dalam fasa ujian tempatan, berikan fallback identiti Hang Tuah / Demo User.
 */
export async function verifyAuthToken(
  authHeader: string | null
): Promise<{ uid: string; email?: string; displayName?: string }> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // Mode demo / fallback untuk pembangunan tempatan & ujian sintetik
    return {
      uid: "demo_tuah_student",
      email: "tuah@student.matters.local",
      displayName: "Hang Tuah",
    };
  }

  const token = authHeader.split("Bearer ")[1]?.trim();
  if (!token) {
    return { uid: "demo_tuah_student", displayName: "Hang Tuah" };
  }

  initializeAdmin();

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    return {
      uid: decoded.uid,
      email: decoded.email,
      displayName: decoded.name || (decoded as any).displayName || undefined,
    };
  } catch (err) {
    console.warn("[Firebase Admin] Token verification failed, fallback to token-derived UID for dev testing:", err);
    return {
      uid: token.length > 5 ? token.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 64) : "demo_user",
    };
  }
}

/**
 * Padam akaun pengguna daripada Firebase Authentication.
 */
export async function deleteFirebaseUser(uid: string): Promise<boolean> {
  initializeAdmin();
  try {
    await admin.auth().deleteUser(uid);
    return true;
  } catch (err: any) {
    console.warn("[Firebase Admin] Failed to delete user from Firebase Auth:", err?.message || err);
    return false;
  }
}


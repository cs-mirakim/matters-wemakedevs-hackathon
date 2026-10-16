import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken, deleteFirebaseUser } from "@/lib/firebase-admin";
import {
  isUserRegistered,
  registerUser,
  listAllRegisteredUsers,
  deleteUserAccount,
} from "@/lib/falkordb";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "check") {
      const { identifier } = body;
      if (!identifier) {
        return NextResponse.json({ error: "Identifier required" }, { status: 400 });
      }
      const registered = await isUserRegistered(identifier);
      return NextResponse.json({ success: true, registered });
    }

    if (action === "register") {
      const { user } = body;
      if (!user || !user.uid || !user.email) {
        return NextResponse.json({ error: "Invalid user payload" }, { status: 400 });
      }

      // Check if already registered
      const already = await isUserRegistered(user.email);
      if (already) {
        return NextResponse.json({
          success: false,
          alreadyRegistered: true,
          message: "This account is already registered.",
        });
      }

      await registerUser(user);
      return NextResponse.json({
        success: true,
        message: "Account registered successfully! You can now access your workspace.",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("[/api/auth/user POST] Error:", error);
    return NextResponse.json(
      { error: "User processing error", message: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    let authedUser: any = null;
    try {
      authedUser = await verifyAuthToken(authHeader);
    } catch {
      authedUser = null;
    }

    if (!authedUser || !authedUser.uid || authedUser.uid === "demo_tuah_student" || authedUser.uid === "demo_user") {
      return NextResponse.json(
        { error: "Unauthorized: Access to user registry requires an active authenticated session." },
        { status: 401 }
      );
    }

    const users = await listAllRegisteredUsers();
    return NextResponse.json({ success: true, users, total: users.length });
  } catch (error: any) {
    console.error("[/api/auth/user GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to load user list", message: error?.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    let authedUser: any = null;
    try {
      authedUser = await verifyAuthToken(authHeader);
    } catch {
      authedUser = null;
    }

    const body = await req.json();
    const { uid } = body;
    if (!uid) {
      return NextResponse.json({ error: "User UID is required" }, { status: 400 });
    }

    // IDOR Protection: strictly verify caller is deleting their own account
    if (!authedUser || !authedUser.uid || authedUser.uid !== uid) {
      return NextResponse.json(
        { error: "Forbidden: You are not authorized to delete this account." },
        { status: 403 }
      );
    }

    // 1. Delete user record from Firebase Authentication
    try {
      await deleteFirebaseUser(uid);
    } catch (fbErr) {
      console.warn("[/api/auth/user DELETE] Firebase user delete warning:", fbErr);
    }

    // 2. Delete tenant graph & remove from system registry in FalkorDB
    await deleteUserAccount(uid);
    return NextResponse.json({
      success: true,
      message: "Account and personal FalkorDB graph data have been permanently deleted.",
    });
  } catch (error: any) {
    console.error("[/api/auth/user DELETE] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete account", message: error?.message },
      { status: 500 }
    );
  }
}

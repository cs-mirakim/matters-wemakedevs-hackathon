import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/firebase-admin";
import { getGraphForUser } from "@/lib/falkordb";
import { cleanProjectName } from "@/lib/projects";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest) {
  try {
    const isGuestHeader = req.headers.get("x-guest-mode") === "true";
    const authHeader = req.headers.get("authorization") || "";
    let isGuest =
      isGuestHeader ||
      !authHeader ||
      authHeader.includes("guest") ||
      authHeader.includes("demo_user_session");
    let user: any = null;

    if (!isGuest) {
      try {
        user = await verifyAuthToken(authHeader);
        if (!user || user.uid === "demo_user" || user.uid === "demo_tuah_student") {
          isGuest = true;
        }
      } catch {
        isGuest = true;
      }
    }

    const body = await req.json();
    const oldName = cleanProjectName(body.oldName);
    const newName = cleanProjectName(body.newName);

    if (!oldName || !newName) {
      return NextResponse.json(
        { error: "Original and new project name are required." },
        { status: 400 }
      );
    }

    if (!isGuest && user?.uid) {
      const graph = await getGraphForUser(user.uid);
      await graph.query(
        `MATCH (m) WHERE toLower(m.project) = toLower($oldName) SET m.project = $newName`,
        { params: { oldName, newName } }
      );
      await graph.query(
        `MATCH (p:Project) WHERE toLower(p.name) = toLower($oldName) SET p.name = $newName`,
        { params: { oldName, newName } }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Project '${oldName}' successfully renamed to '${newName}'.`,
      oldName,
      newName,
    });
  } catch (error: any) {
    console.error("[/api/project PUT] Error:", error);
    return NextResponse.json(
      { error: "Failed to update project name", message: error?.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const isGuestHeader = req.headers.get("x-guest-mode") === "true";
    const authHeader = req.headers.get("authorization") || "";
    let isGuest =
      isGuestHeader ||
      !authHeader ||
      authHeader.includes("guest") ||
      authHeader.includes("demo_user_session");
    let user: any = null;

    if (!isGuest) {
      try {
        user = await verifyAuthToken(authHeader);
        if (!user || user.uid === "demo_user" || user.uid === "demo_tuah_student") {
          isGuest = true;
        }
      } catch {
        isGuest = true;
      }
    }

    const body = await req.json();
    const cleanName = cleanProjectName(body.projectName);

    if (!cleanName || cleanName.toLowerCase() === "all") {
      return NextResponse.json(
        { error: "Valid project name is required for deletion." },
        { status: 400 }
      );
    }

    if (!isGuest && user?.uid) {
      const graph = await getGraphForUser(user.uid);
      // 1. Delete all memory nodes (Decision, Promise, Task, Preference) under this project (case-insensitive)
      await graph.query(
        `MATCH (m) WHERE toLower(m.project) = toLower($cleanName) DETACH DELETE m`,
        { params: { cleanName } }
      );
      // 2. Delete project node if exists (case-insensitive)
      await graph.query(
        `MATCH (p:Project) WHERE toLower(p.name) = toLower($cleanName) DETACH DELETE p`,
        { params: { cleanName } }
      );
      // 3. Purge orphaned Person nodes that have no remaining commitments or relationships
      try {
        await graph.query(
          `MATCH (per:Person) WHERE NOT (per)--() DELETE per`
        );
      } catch {}
    }

    return NextResponse.json({
      success: true,
      message: `Project '${cleanName}' and all related commitment nodes have been permanently deleted from the graph.`,
      deletedProject: cleanName,
    });
  } catch (error: any) {
    console.error("[/api/project DELETE] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete project from FalkorDB graph", message: error?.message },
      { status: 500 }
    );
  }
}

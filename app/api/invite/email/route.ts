import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to, inviterName, workspaceName, projectName, role, inviteLink } = body;

    if (!to || !to.includes("@")) {
      return NextResponse.json(
        { success: false, message: "Valid email address is required." },
        { status: 400 }
      );
    }

    const smtpUser = process.env.SMTP_EMAIL || "admin.infiru@gmail.com";
    const smtpPass = (process.env.SMTP_PASSWORD || "udkg tngg ompx mjph").replace(/\s+/g, "");

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const displayInviter = inviterName || "A team collaborator";
    const displayProject = projectName || "Innovation Studio Portal";
    const displayRole = role || "Editor";
    const displayLink = inviteLink || "https://matters-wemakedevs-hackathon.vercel.app";

    const mailOptions = {
      from: `"Matters Workspace" <${smtpUser}>`,
      to: to.trim(),
      subject: `[Invitation] ${displayInviter} invited you to collaborate on ${displayProject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a; }
            .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
            .header { background: #0A192F; padding: 28px 32px; color: #ffffff; }
            .badge { display: inline-block; background: #2563EB; color: #ffffff; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: 6px; letter-spacing: 0.5px; }
            .content { padding: 32px; }
            .h1 { font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px; }
            .p { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 20px; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; margin-bottom: 24px; }
            .card-item { font-size: 13px; color: #334155; margin-bottom: 8px; }
            .card-item strong { color: #0f172a; }
            .button { display: inline-block; background: #2563EB; color: #ffffff !important; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 8px; box-shadow: 0 2px 4px rgba(37,99,235,0.2); }
            .footer { padding: 20px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <span class="badge">Matters Graph Workspace</span>
              <h2 style="margin: 12px 0 0; font-size: 22px; font-weight: 700;">You've Been Invited!</h2>
            </div>
            <div class="content">
              <h1 class="h1">${displayInviter} has invited you to collaborate</h1>
              <p class="p">
                You've been invited to join the shared bi-temporal memory graph on <strong>Matters</strong>. As a collaborator, your decisions and promises will be tracked with zero temporal amnesia.
              </p>
              <div class="card">
                <div class="card-item"><strong>Target Project:</strong> ${displayProject}</div>
                <div class="card-item"><strong>Assigned Role:</strong> ${displayRole}</div>
                <div class="card-item"><strong>Workspace:</strong> ${workspaceName || "Matters Workspace"}</div>
                <div class="card-item" style="margin-bottom: 0;"><strong>Database:</strong> FalkorDB Cloud Graph Engine</div>
              </div>
              <div style="text-align: center; margin: 28px 0 16px;">
                <a href="${displayLink}" class="button" target="_blank">Join Workspace & View Graph</a>
              </div>
              <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 14px;">
                No password required. Sign in with Google or explore directly.
              </p>
            </div>
            <div class="footer">
              Matters — Git for Team Commitments & Agent Memory • Powered by FalkorDB Bi-Temporal Graphs
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      message: `Invitation email sent to ${to}`,
    });
  } catch (error: any) {
    console.error("Failed to send invitation email:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to send invitation email." },
      { status: 500 }
    );
  }
}

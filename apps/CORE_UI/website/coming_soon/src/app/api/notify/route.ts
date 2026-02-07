import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

// Ensure Node.js runtime for Nodemailer
export const runtime = "nodejs";

// POST /api/notify
export async function POST(req: Request) {
  try {
    const { email } = (await req.json()) as { email?: string };

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    // Prefer SMTP_URL if provided (e.g., "smtp://user:pass@smtp.example.com:587")
    const smtpUrl = process.env.SMTP_URL;
    let transporter;

    if (smtpUrl) {
      transporter = nodemailer.createTransport(smtpUrl);
    } else {
      const host = process.env.SMTP_HOST;
      const port = Number(process.env.SMTP_PORT || 587);
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;
      const fromEnv = process.env.SMTP_FROM || user;

      if (!host || !user || !pass) {
        return NextResponse.json({ error: "Email transport not configured" }, { status: 500 });
      }

      transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // true for 465, false for other ports (STARTTLS)
        auth: { user, pass },
      });

      // Stash from in a closure variable via symbol on transporter for reuse below
      (transporter as any).__from = fromEnv;
    }

    const to = "info@proximaengr.com";
    const from = (transporter as any).__from || process.env.SMTP_FROM || process.env.SMTP_USER;

    try {
      await transporter.sendMail({
        from,
        to,
        subject: "New website notify request",
        text: `Please add this email to the notify list: ${email}`,
        html: `<p>Please add this email to the notify list:</p><p><strong>${email}</strong></p>`,
      });
    } catch (sendErr: any) {
      console.error("/api/notify sendMail error", sendErr);
      return NextResponse.json({ error: sendErr?.message || "Failed to send" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("/api/notify error", err);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
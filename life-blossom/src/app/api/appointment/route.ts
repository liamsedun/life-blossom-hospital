import { NextResponse } from "next/server";

/**
 * Sends a booking-request notification to the hospital inbox using
 * FormSubmit.co (free, no API key). The first submission triggers an
 * activation email — after the owner confirms it, every request lands
 * in their inbox automatically.
 */
const APPOINTMENT_EMAIL = "o.edun@skyaccounting.com.ng";
const FORM_SUBMIT_URL = `https://formsubmit.co/ajax/${APPOINTMENT_EMAIL}`;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = String(body.name ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const department = String(body.department ?? "").trim();
    const preferredDate = String(body.preferredDate ?? "").trim();

    if (!name || !phone || !department) {
      return NextResponse.json(
        { error: "Name, phone and department are required." },
        { status: 400 }
      );
    }

    const formData = new FormData();
    formData.append("Name", name);
    formData.append("Phone", phone);
    formData.append("Department", department);
    formData.append("Preferred Date", preferredDate || "Not specified");
    formData.append(
      "_subject",
      `New Appointment Request — ${name} (${department})`
    );
    formData.append(
      "_template",
      "table"
    );
    formData.append(
      "_captcha",
      "false"
    );

    const response = await fetch(FORM_SUBMIT_URL, {
      method: "POST",
      body: formData,
      headers: { Accept: "application/json" },
      // Time out quickly so a slow mailer never blocks the user.
      signal: AbortSignal.timeout(10_000),
    });

    const text = await response.text();
    let data: { success?: string; message?: string } = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }

    if (response.ok && data.success === "true") {
      return NextResponse.json({ ok: true });
    }

    console.error("FormSubmit rejected the email:", data);
    return NextResponse.json(
      { error: "Email delivery failed. Please try again or call us." },
      { status: 502 }
    );
  } catch (error) {
    console.error("Appointment email route error:", error);
    return NextResponse.json(
      { error: "Something went wrong sending the email." },
      { status: 500 }
    );
  }
}
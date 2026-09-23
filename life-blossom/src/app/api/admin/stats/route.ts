import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  // ── KPI: This month's revenue (payments) ──
  const { data: revenueThisMonth } = await supabase
    .from("payments")
    .select("amount")
    .gte("payment_date", startOfThisMonth.toISOString());

  const { data: revenueLastMonth } = await supabase
    .from("payments")
    .select("amount")
    .gte("payment_date", startOfLastMonth.toISOString())
    .lt("payment_date", startOfThisMonth.toISOString());

  const totalRevenueThisMonth =
    revenueThisMonth?.reduce((s, p) => s + Number(p.amount), 0) ?? 0;
  const totalRevenueLastMonth =
    revenueLastMonth?.reduce((s, p) => s + Number(p.amount), 0) ?? 0;

  // ── KPI: Total patients ──
  const { count: totalPatients } = await supabase
    .from("patients")
    .select("*", { count: "exact", head: true });

  // ── KPI: Today's appointments ──
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const { count: todayAppointments } = await supabase
    .from("appointments")
    .select("*", { count: "exact", head: true })
    .gte("scheduled_at", todayStart.toISOString())
    .lt("scheduled_at", todayEnd.toISOString());

  // ── KPI: Active staff ──
  const { count: activeStaff } = await supabase
    .from("staff")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  const revenueChange =
    totalRevenueLastMonth > 0
      ? Math.round(((totalRevenueThisMonth - totalRevenueLastMonth) / totalRevenueLastMonth) * 100)
      : 0;

  // ── Revenue trend: last 6 months ──
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const { data: allPayments } = await supabase
    .from("payments")
    .select("amount, payment_date")
    .gte("payment_date", sixMonthsAgo.toISOString());

  const { data: allOtherIncome } = await supabase
    .from("other_income")
    .select("amount, income_date")
    .gte("income_date", sixMonthsAgo.toISOString());

  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const trend: { month: string; medical: number; other: number; total: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 1);

    const medical =
      allPayments
        ?.filter((p) => {
          const pd = new Date(p.payment_date);
          return pd >= monthStart && pd < monthEnd;
        })
        .reduce((s, p) => s + Number(p.amount), 0) ?? 0;

    const other =
      allOtherIncome
        ?.filter((o) => {
          const od = new Date(o.income_date);
          return od >= monthStart && od < monthEnd;
        })
        .reduce((s, o) => s + Number(o.amount), 0) ?? 0;

    trend.push({
      month: `${monthLabels[month]} ${year}`,
      medical,
      other,
      total: medical + other,
    });
  }

  // ── Pie chart: total split (last 6 months) ──
  const totalMedical = trend.reduce((s, t) => s + t.medical, 0);
  const totalOther = trend.reduce((s, t) => s + t.other, 0);

  // ── Today's Schedule: appointments with patient & doctor names ──
  const { data: todayAppts } = await supabase
    .from("appointments")
    .select(`
      id,
      scheduled_at,
      status,
      reason,
      patients:patient_id ( first_name, last_name ),
      doctors:doctor_id ( first_name, last_name )
    `)
    .gte("scheduled_at", todayStart.toISOString())
    .lt("scheduled_at", todayEnd.toISOString())
    .order("scheduled_at", { ascending: true });

  const schedule =
    todayAppts?.map((a) => {
      const patient = a.patients as unknown as { first_name: string; last_name: string } | null;
      const doctor = a.doctors as unknown as { first_name: string; last_name: string } | null;
      return {
        id: a.id,
        time: new Date(a.scheduled_at).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" }),
        patientName: patient ? `${patient.first_name} ${patient.last_name}` : "Unknown",
        doctorName: doctor ? `Dr. ${doctor.first_name} ${doctor.last_name}` : "Unknown",
        status: a.status,
        reason: a.reason ?? "",
      };
    }) ?? [];

  // ── Recent Patients: 5 most recently registered ──
  const { data: recentPatients } = await supabase
    .from("patients")
    .select("id, first_name, last_name, phone, email, created_at, patient_number")
    .order("created_at", { ascending: false })
    .limit(5);

  const patients =
    recentPatients?.map((p) => ({
      id: p.id,
      name: `${p.first_name} ${p.last_name}`,
      phone: p.phone ?? "—",
      email: p.email ?? "—",
      patientNumber: p.patient_number,
      registeredAt: new Date(p.created_at).toLocaleDateString("en-NG", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    })) ?? [];

  return NextResponse.json({
    // KPIs
    totalRevenue: totalRevenueThisMonth,
    revenueChange,
    totalPatients: totalPatients ?? 0,
    todayAppointments: todayAppointments ?? 0,
    activeStaff: activeStaff ?? 0,
    // Charts
    revenueTrend: trend,
    revenueSplit: [
      { name: "Medical Services", value: totalMedical, color: "#6366f1" },
      { name: "Other Income", value: totalOther, color: "#06b6d4" },
    ],
    // Panels
    todaySchedule: schedule,
    recentPatients: patients,
  });
}

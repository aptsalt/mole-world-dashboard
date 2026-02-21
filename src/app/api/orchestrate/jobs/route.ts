import { NextResponse } from "next/server";
import demoWhatsAppJobs from "../../../../../data/demo-whatsapp-jobs.json";

/**
 * Demo-only: returns jobs from demo JSON file.
 */
export async function GET() {
  return NextResponse.json(demoWhatsAppJobs);
}

export async function POST() {
  return NextResponse.json(
    { error: "Job creation is not available in demo mode. The automation backend is required." },
    { status: 501 },
  );
}

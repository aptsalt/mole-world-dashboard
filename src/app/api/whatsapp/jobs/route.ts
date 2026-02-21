import { NextResponse } from "next/server";
import demoWhatsAppJobs from "../../../../../data/demo-whatsapp-jobs.json";

/**
 * Demo-only: returns WhatsApp jobs from demo JSON file.
 */
export async function GET() {
  return NextResponse.json(demoWhatsAppJobs);
}

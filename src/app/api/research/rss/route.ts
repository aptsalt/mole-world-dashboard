import { NextResponse } from "next/server";
import demoContentDigest from "../../../../../data/demo-content-digest.json";

/**
 * Demo-only: returns digests from demo JSON file.
 */
export async function GET() {
  return NextResponse.json({
    digests: demoContentDigest ? [demoContentDigest] : [],
  });
}

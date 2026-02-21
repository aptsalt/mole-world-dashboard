import { NextResponse } from "next/server";

/**
 * Demo-only stub: returns idle orchestration status.
 */
export async function GET() {
  return NextResponse.json({
    pipelines: {
      local_gpu: { status: "idle", label: "Local GPU", activeJobs: 0 },
      higgsfield: { status: "idle", label: "Higgsfield", activeJobs: 0 },
      content: { status: "idle", label: "Content", activeJobs: 0 },
      distribution: { status: "idle", label: "Distribution", activeJobs: 0 },
    },
    services: {
      worker: false,
      bridge: false,
      ollama: false,
    },
    jobStats: { total: 0, pending: 0, active: 0, completed: 0, failed: 0 },
  });
}

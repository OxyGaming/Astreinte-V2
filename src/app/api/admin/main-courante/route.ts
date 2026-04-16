import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { getAllMainCourantes } from "@/lib/db";

// GET /api/admin/main-courante?status=pending&q=search
export async function GET(req: NextRequest) {
  const check = await requireAdminSession();
  if (check) return check;

  const status = req.nextUrl.searchParams.get("status") ?? undefined;
  const q = req.nextUrl.searchParams.get("q") ?? undefined;
  const entries = await getAllMainCourantes(status, q);
  return NextResponse.json({ entries });
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/settings/organization - Get organization settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenant = await db.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        plan: true,
        maxJobs: true,
        maxMembers: true,
        maxCandidates: true,
        createdAt: true,
        _count: {
          select: {
            jobs: true,
            members: true,
            candidates: true,
          },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Get user's role in the organization
    const membership = await db.tenantMember.findUnique({
      where: {
        tenantId_userId: {
          tenantId: session.user.tenantId,
          userId: session.user.id,
        },
      },
      select: { role: true },
    });

    return NextResponse.json({
      organization: {
        ...tenant,
        jobsCount: tenant._count.jobs,
        membersCount: tenant._count.members,
        candidatesCount: tenant._count.candidates,
      },
      userRole: membership?.role || "VIEWER",
    });
  } catch (error) {
    console.error("Error fetching organization settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch organization settings" },
      { status: 500 }
    );
  }
}

// PUT /api/settings/organization - Update organization settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is OWNER or ADMIN
    const membership = await db.tenantMember.findUnique({
      where: {
        tenantId_userId: {
          tenantId: session.user.tenantId,
          userId: session.user.id,
        },
      },
      select: { role: true },
    });

    if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, logo } = body;

    // Validate input
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Organization name must be at least 2 characters" },
        { status: 400 }
      );
    }

    // Update organization
    const updatedTenant = await db.tenant.update({
      where: { id: session.user.tenantId },
      data: {
        name: name.trim(),
        logo: logo || null,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        plan: true,
        maxJobs: true,
        maxMembers: true,
        maxCandidates: true,
      },
    });

    return NextResponse.json({
      message: "Organization updated successfully",
      organization: updatedTenant,
    });
  } catch (error) {
    console.error("Error updating organization settings:", error);
    return NextResponse.json(
      { error: "Failed to update organization settings" },
      { status: 500 }
    );
  }
}

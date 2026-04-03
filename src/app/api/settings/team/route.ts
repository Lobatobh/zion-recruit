import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { MemberRole } from "@prisma/client";

// GET /api/settings/team - Get team members
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const members = await db.tenantMember.findMany({
      where: { tenantId: session.user.tenantId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
    });

    // Get current user's role
    const currentMember = members.find((m) => m.userId === session.user.id);

    return NextResponse.json({
      members: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        name: m.user.name || "Unknown",
        email: m.user.email,
        image: m.user.image,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
      currentUserRole: currentMember?.role || "VIEWER",
    });
  } catch (error) {
    console.error("Error fetching team members:", error);
    return NextResponse.json(
      { error: "Failed to fetch team members" },
      { status: 500 }
    );
  }
}

// POST /api/settings/team - Invite new member
export async function POST(request: NextRequest) {
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
    const { email, role } = body;

    // Validate input
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      );
    }

    const validRoles: MemberRole[] = ["ADMIN", "RECRUITER", "VIEWER"];
    const memberRole: MemberRole = validRoles.includes(role) ? role : "VIEWER";

    // Check member limit
    const tenant = await db.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { maxMembers: true, _count: { select: { members: true } } },
    });

    if (tenant && tenant._count.members >= tenant.maxMembers) {
      return NextResponse.json(
        { error: "Member limit reached for your plan" },
        { status: 400 }
      );
    }

    // Check if user already exists
    let user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Create user if doesn't exist
    if (!user) {
      user = await db.user.create({
        data: {
          email: email.toLowerCase(),
          name: email.split("@")[0],
        },
      });
    }

    // Check if user is already a member
    const existingMember = await db.tenantMember.findUnique({
      where: {
        tenantId_userId: {
          tenantId: session.user.tenantId,
          userId: user.id,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: "User is already a team member" },
        { status: 400 }
      );
    }

    // Add user to organization
    const newMember = await db.tenantMember.create({
      data: {
        tenantId: session.user.tenantId,
        userId: user.id,
        role: memberRole,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: "Member invited successfully",
      member: {
        id: newMember.id,
        userId: newMember.userId,
        name: newMember.user.name || "Unknown",
        email: newMember.user.email,
        image: newMember.user.image,
        role: newMember.role,
        joinedAt: newMember.joinedAt,
      },
    });
  } catch (error) {
    console.error("Error inviting team member:", error);
    return NextResponse.json(
      { error: "Failed to invite team member" },
      { status: 500 }
    );
  }
}

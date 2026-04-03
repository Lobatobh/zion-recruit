import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { MemberRole } from "@prisma/client";

// PUT /api/settings/team/[id] - Update member role
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user?.id || !session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if current user is OWNER or ADMIN
    const currentMembership = await db.tenantMember.findUnique({
      where: {
        tenantId_userId: {
          tenantId: session.user.tenantId,
          userId: session.user.id,
        },
      },
      select: { role: true },
    });

    if (!currentMembership || !["OWNER", "ADMIN"].includes(currentMembership.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Get the member to update
    const memberToUpdate = await db.tenantMember.findUnique({
      where: { id },
      include: { tenant: { select: { id: true } } },
    });

    if (!memberToUpdate || memberToUpdate.tenant.id !== session.user.tenantId) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Can't modify OWNER role
    if (memberToUpdate.role === "OWNER") {
      return NextResponse.json(
        { error: "Cannot modify owner role" },
        { status: 400 }
      );
    }

    // Only OWNER can modify ADMIN role
    if (memberToUpdate.role === "ADMIN" && currentMembership.role !== "OWNER") {
      return NextResponse.json(
        { error: "Only owner can modify admin role" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { role } = body;

    // Validate role
    const validRoles: MemberRole[] = ["ADMIN", "RECRUITER", "VIEWER"];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Update member role
    const updatedMember = await db.tenantMember.update({
      where: { id },
      data: { role },
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
      message: "Member role updated successfully",
      member: {
        id: updatedMember.id,
        userId: updatedMember.userId,
        name: updatedMember.user.name || "Unknown",
        email: updatedMember.user.email,
        image: updatedMember.user.image,
        role: updatedMember.role,
        joinedAt: updatedMember.joinedAt,
      },
    });
  } catch (error) {
    console.error("Error updating team member:", error);
    return NextResponse.json(
      { error: "Failed to update team member" },
      { status: 500 }
    );
  }
}

// DELETE /api/settings/team/[id] - Remove member
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user?.id || !session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if current user is OWNER or ADMIN
    const currentMembership = await db.tenantMember.findUnique({
      where: {
        tenantId_userId: {
          tenantId: session.user.tenantId,
          userId: session.user.id,
        },
      },
      select: { role: true },
    });

    if (!currentMembership || !["OWNER", "ADMIN"].includes(currentMembership.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Get the member to remove
    const memberToRemove = await db.tenantMember.findUnique({
      where: { id },
      include: { tenant: { select: { id: true } } },
    });

    if (!memberToRemove || memberToRemove.tenant.id !== session.user.tenantId) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Can't remove OWNER
    if (memberToRemove.role === "OWNER") {
      return NextResponse.json(
        { error: "Cannot remove owner from organization" },
        { status: 400 }
      );
    }

    // Only OWNER can remove ADMIN
    if (memberToRemove.role === "ADMIN" && currentMembership.role !== "OWNER") {
      return NextResponse.json(
        { error: "Only owner can remove admin" },
        { status: 403 }
      );
    }

    // Can't remove yourself
    if (memberToRemove.userId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot remove yourself from organization" },
        { status: 400 }
      );
    }

    // Remove member
    await db.tenantMember.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Member removed successfully",
    });
  } catch (error) {
    console.error("Error removing team member:", error);
    return NextResponse.json(
      { error: "Failed to remove team member" },
      { status: 500 }
    );
  }
}

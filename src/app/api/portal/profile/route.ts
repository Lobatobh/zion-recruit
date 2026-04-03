/**
 * Portal Profile API
 * GET: Get candidate profile
 * PUT: Update candidate profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Retrieve candidate profile
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('x-portal-token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 401 }
      );
    }

    // Find portal access by token
    const portalAccess = await db.candidatePortalAccess.findFirst({
      where: {
        token,
        isActive: true,
        expiresAt: {
          gte: new Date(),
        },
      },
      include: {
        candidate: true,
      },
    });

    if (!portalAccess) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const candidate = portalAccess.candidate;

    return NextResponse.json({
      success: true,
      profile: {
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        linkedin: candidate.linkedin,
        github: candidate.github,
        portfolio: candidate.portfolio,
        resumeUrl: candidate.resumeUrl,
        city: candidate.city,
        state: candidate.state,
        country: candidate.country,
        photo: candidate.photo,
      },
    });
  } catch (error) {
    console.error('Portal profile get error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve profile' },
      { status: 500 }
    );
  }
}

// PUT - Update candidate profile
export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('x-portal-token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 401 }
      );
    }

    // Find portal access by token
    const portalAccess = await db.candidatePortalAccess.findFirst({
      where: {
        token,
        isActive: true,
        expiresAt: {
          gte: new Date(),
        },
      },
      include: {
        candidate: true,
      },
    });

    if (!portalAccess) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const candidate = portalAccess.candidate;

    // Allowed fields to update
    const allowedUpdates = [
      'name',
      'phone',
      'linkedin',
      'github',
      'portfolio',
      'resumeUrl',
      'city',
      'state',
      'country',
    ];

    const updateData: Record<string, unknown> = {};

    for (const field of allowedUpdates) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Update candidate
    const updatedCandidate = await db.candidate.update({
      where: { id: candidate.id },
      data: updateData,
    });

    // If email is being updated, update all candidates with same email
    if (body.email && body.email !== candidate.email) {
      await db.candidate.updateMany({
        where: { email: candidate.email },
        data: { email: body.email.toLowerCase() },
      });
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: updatedCandidate.id,
        name: updatedCandidate.name,
        email: updatedCandidate.email,
        phone: updatedCandidate.phone,
        linkedin: updatedCandidate.linkedin,
        github: updatedCandidate.github,
        portfolio: updatedCandidate.portfolio,
        resumeUrl: updatedCandidate.resumeUrl,
        city: updatedCandidate.city,
        state: updatedCandidate.state,
        country: updatedCandidate.country,
        photo: updatedCandidate.photo,
      },
    });
  } catch (error) {
    console.error('Portal profile update error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

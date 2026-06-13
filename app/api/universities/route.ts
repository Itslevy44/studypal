import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestToken } from '@/lib/auth';
import {
  addUniversityToTelegramStore,
  deleteUniversityFromTelegramStore,
  getUniversitiesFromTelegramStore,
  updateUniversityInTelegramStore,
} from '@/lib/universitiesTelegram';
import crypto from 'crypto';

type CampusInput = {
  id?: unknown;
  name?: unknown;
  location?: unknown;
};

type NormalizedCampus = {
  id: string;
  name: string;
  location: string;
};

type UniversityUpdate = {
  name?: string;
  campuses?: NormalizedCampus[];
};

// Helper: normalize campus input
const normalizeCampuses = (campuses: unknown): NormalizedCampus[] => {
  if (!Array.isArray(campuses)) return [];

  return campuses.map((campus: CampusInput, index: number) => ({
    id: typeof campus.id === 'string' ? campus.id : `campus_${Date.now()}_${index}`,
    name: typeof campus.name === 'string' ? campus.name : '',
    location: typeof campus.location === 'string' ? campus.location : '',
  }));
};

export async function GET() {
  try {
    const universities = await getUniversitiesFromTelegramStore();
    return NextResponse.json({ universities });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch universities';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin token
    const authHeader = request.headers.get('Authorization');
    const tokenData = verifyRequestToken(authHeader);
    
    if (!tokenData || tokenData.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { name, campuses } = await request.json();

    if (!name || !String(name).trim()) {
      return NextResponse.json(
        { error: 'University name is required' },
        { status: 400 }
      );
    }

    const newUniversity = {
      id: `univ_${crypto.randomBytes(4).toString('hex')}`,
      name: String(name).trim(),
      campuses: normalizeCampuses(campuses),
    };

    await addUniversityToTelegramStore(newUniversity);

    return NextResponse.json({
      success: true,
      university: newUniversity,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to add university';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verify admin token
    const authHeader = request.headers.get('Authorization');
    const tokenData = verifyRequestToken(authHeader);
    
    if (!tokenData || tokenData.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id, name, campuses } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'University ID is required' },
        { status: 400 }
      );
    }

    const updated = await updateUniversityInTelegramStore(id, { name, campuses: normalizeCampuses(campuses) });

    if (!updated) {
      return NextResponse.json(
        { error: 'University not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      university: updated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update university';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const tokenData = verifyRequestToken(authHeader);
    if (!tokenData || tokenData.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, name, campuses } = await request.json();
    if (!id) return NextResponse.json({ error: 'University ID is required' }, { status: 400 });

    const updates: UniversityUpdate = {};
    if (name !== undefined) updates.name = name;
    if (campuses !== undefined) updates.campuses = normalizeCampuses(campuses);

    const updated = await updateUniversityInTelegramStore(id, updates);
    if (!updated) return NextResponse.json({ error: 'University not found' }, { status: 404 });

    return NextResponse.json({ success: true, university: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update university';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const tokenData = verifyRequestToken(authHeader);
    if (!tokenData || tokenData.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'University ID is required' }, { status: 400 });

    const deleted = await deleteUniversityFromTelegramStore(id);
    if (!deleted) return NextResponse.json({ error: 'University not found' }, { status: 404 });

    return NextResponse.json({ success: true, message: 'University deleted successfully' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete university';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getUniversities, updateUniversity, addUniversity, writeJsonFile, readJsonFile } from '@/lib/dataStore';
import { verifyRequestToken } from '@/lib/auth';
import crypto from 'crypto';

// Helper: delete a university by id
const deleteUniversity = (id: string) => {
  const univs = getUniversities();
  const filtered = univs.filter((u: any) => u.id !== id);
  writeJsonFile('universities.json', filtered);
  return true;
};

export async function GET(request: NextRequest) {
  try {
    const universities = getUniversities();
    return NextResponse.json({ universities });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch universities' },
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

    if (!name) {
      return NextResponse.json(
        { error: 'University name is required' },
        { status: 400 }
      );
    }

    const newUniversity = {
      id: `univ_${crypto.randomBytes(4).toString('hex')}`,
      name,
      campuses: campuses || [],
    };

    addUniversity(newUniversity);

    return NextResponse.json({
      success: true,
      university: newUniversity,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to add university' },
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

    const updated = updateUniversity(id, { name, campuses });

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
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update university' },
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

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (campuses !== undefined) updates.campuses = campuses;

    const updated = updateUniversity(id, updates);
    if (!updated) return NextResponse.json({ error: 'University not found' }, { status: 404 });

    return NextResponse.json({ success: true, university: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update university' }, { status: 500 });
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

    const univs = getUniversities();
    const exists = univs.find((u: any) => u.id === id);
    if (!exists) return NextResponse.json({ error: 'University not found' }, { status: 404 });

    deleteUniversity(id);
    return NextResponse.json({ success: true, message: 'University deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete university' }, { status: 500 });
  }
}

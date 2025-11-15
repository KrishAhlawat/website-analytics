import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { connectDB, Site } from '@/lib/db';

const BodySchema = z.object({
  name: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = BodySchema.parse(body);

    await connectDB();

    const site_id = parsed.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + crypto.randomBytes(3).toString('hex');
    const api_key = crypto.randomBytes(24).toString('hex');

    const site = new Site({ site_id, api_key, name: parsed.name });
    await site.save();

    return NextResponse.json({ success: true, site_id, api_key }, { status: 201 });
  } catch (error: any) {
    if (error?.issues) {
      return NextResponse.json({ success: false, error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    console.error('[Site Create] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

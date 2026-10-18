import { NextResponse } from 'next/server';
import { launchStatus } from '@/lib/launch';
export const dynamic='force-dynamic';
export function GET(){const {billing,whatsapp}=launchStatus();return NextResponse.json({billing,whatsapp},{headers:{'Cache-Control':'no-store'}});}

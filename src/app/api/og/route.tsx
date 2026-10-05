import { ImageResponse } from 'next/og';
import { archetypeFor, decodeAnswers } from '@/lib/temperament';

// 1200×630 preview card for shared quiz results (WhatsApp, Instagram DMs, X).
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const temperament = decodeAnswers(searchParams.get('t'));
  const name = searchParams.get('n')?.slice(0, 40).trim() || 'My child';
  const archetype = temperament ? archetypeFor(temperament) : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          padding: '72px 80px', background: '#0F172A', color: 'white', fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 36, fontWeight: 700, color: '#E39A6E' }}>kahiye</div>
        {archetype ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: 34, color: '#3ECF8B', textTransform: 'uppercase', letterSpacing: 4 }}>
              {`${name} is`}
            </div>
            <div style={{ display: 'flex', fontSize: 84, fontWeight: 700, lineHeight: 1.05, marginTop: 16 }}>
              {`${archetype.name} ${archetype.emoji}`}
            </div>
            <div style={{ display: 'flex', fontSize: 40, color: 'rgba(255,255,255,0.7)', marginTop: 20 }}>{archetype.tagline}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', fontSize: 80, fontWeight: 700 }}>What's your child's temperament type?</div>
        )}
        <div style={{ display: 'flex', fontSize: 30, color: 'rgba(255,255,255,0.55)' }}>
          Find your child's type in 60 seconds · kahiye.app/quiz
        </div>
      </div>
    ),
    { width: 1200, height: 630, emoji: 'twemoji' },
  );
}

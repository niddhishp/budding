// Agent orchestration layer - simulates the multi-agent AI system
import { behaviorInterpretations } from '@/data/developmentalData';
import type { AgentAnalysis } from '@/types';

export async function analyzeBehavior(
  description: string,
  childAge: string,
  childId?: string
): Promise<AgentAnalysis> {
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        scenario: description,
        childAge,
        // Fallback ID if none provided during UI transition
        childId: childId || '00000000-0000-0000-0000-000000000000'
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to analyze behavior');
    }

    return await response.json();
  } catch (error) {
    console.error('Agent Service Error:', error);
    // Fallback response if API fails
    return {
      stage: `Age ${childAge}`,
      confidence: 0.85,
      developmentalThemes: ['General Development'],
      behaviorInterpretation: 'We are currently analyzing this behavior pattern.',
      emotionalNeed: 'Connection and Understanding',
      suggestedReframe: 'I am here with you. We will figure this out together.',
      skillBeingBuilt: 'Emotional resilience',
      responsePlan: 'Take a deep breath. Ensure everyone is safe. Re-engage when calm.',
      whatNotToDo: 'Do not escalate the situation with raised voices.'
    };
  }
}

function detectStage(age: string): string {
  const num = parseInt(age);
  if (isNaN(num)) return 'Early Childhood';
  if (num <= 2) return 'Infancy';
  if (num <= 6) return 'Early Childhood';
  if (num <= 12) return 'Middle Childhood';
  return 'Teenage Years';
}

function getDevelopmentalThemes(stage: string): string[] {
  const themes: Record<string, string[]> = {
    'Infancy': ['Attachment formation', 'Sensory exploration', 'Co-regulation', 'Trust building'],
    'Early Childhood': ['Autonomy development', 'Emotional naming', 'Imaginative play', 'Boundary testing'],
    'Middle Childhood': ['Competence building', 'Peer relationships', 'Self-concept', 'Academic skills'],
    'Teenage Years': ['Identity exploration', 'Independence', 'Abstract thinking', 'Future planning'],
  };
  return themes[stage] || ['General development'];
}

function getSkillBeingBuilt(behavior: string): string {
  const skills: Record<string, string> = {
    tantrum: 'Emotional regulation and self-soothing',
    bedtime: 'Autonomy and routine adherence',
    homework: 'Perseverance and growth mindset',
    defiance: 'Healthy autonomy and respectful communication',
    withdrawal: 'Emotional awareness and help-seeking',
  };
  return skills[behavior] || 'Emotional intelligence and resilience';
}

function checkSafetyFlags(input: string): string | null {
  const severeFlags = [
    'hurt themselves', 'self-harm', 'suicide', 'kill',
    'not eating', 'starving', 'severe abuse',
  ];
  
  for (const flag of severeFlags) {
    if (input.includes(flag)) {
      return 'This situation may require professional support. Please contact your pediatrician, a child psychologist, or in case of emergency, call your local crisis line. You are not alone in this.';
    }
  }
  
  return null;
}

// Agent 6: Emotional Intelligence Training Agent
export function generateEQExercise(stage: string, category: string) {
  const exercises: Record<string, Record<string, { title: string; steps: string[] }>> = {
    'early-childhood': {
      'self-awareness': {
        title: 'Emotion Weather Report',
        steps: ['Ask: "What\'s your weather today?"', 'Model by sharing yours', 'Accept all answers without judgment'],
      },
      'empathy': {
        title: 'Feelings in Stories',
        steps: ['Read a story together', 'Pause and ask: "How do they feel?"', 'Connect to their own experiences'],
      },
    },
    'middle-childhood': {
      'self-awareness': {
        title: 'Body Scan for Feelings',
        steps: ['Close eyes and notice body sensations', 'Name where feelings live', 'Breathe into that place'],
      },
      'regulation': {
        title: '5-4-3-2-1 Grounding',
        steps: ['Name 5 things you see', '4 things you can touch', '3 things you hear', '2 things you smell', '1 thing you taste'],
      },
    },
  };

  return exercises[stage]?.[category] || exercises['early-childhood']['self-awareness'];
}

// Agent 9: Predictive Development Agent
export function predictUpcomingTransitions(age: { years: number; months: number }) {
  const predictions: Array<{ timeframe: string; theme: string; description: string }> = [];

  if (age.years === 3) {
    predictions.push(
      { timeframe: '3-6 months', theme: 'Independence surge', description: 'Your child will test boundaries more. Offer structured choices.' },
      { timeframe: '6-12 months', theme: 'Social play', description: 'Parallel play evolves into interactive play. Arrange playdates.' },
    );
  } else if (age.years === 7) {
    predictions.push(
      { timeframe: '3-6 months', theme: 'Social comparison', description: 'Your child may start comparing themselves to peers. Emphasize effort over outcome.' },
      { timeframe: '6-12 months', theme: 'Friendship complexity', description: 'Friendships become more selective. Support their social navigation.' },
    );
  }

  return predictions;
}

// Agent 14: Daily Content Feed Agent
export function generateDailyInsights(childAge: { years: number; months: number }) {
  const insights: Array<{ type: string; title: string; content: string; emoji: string }> = [];

  if (childAge.years === 3) {
    insights.push(
      { type: 'insight', title: 'The "Why" Phase is Building Brains', content: 'Every "why" question is strengthening neural pathways. Your patience now builds their curiosity for life.', emoji: '🧠' },
      { type: 'script', title: 'When they say "I can\'t"', content: '"You can\'t do it... yet. Let\'s try together. I believe in you."', emoji: '💬' },
    );
  } else if (childAge.years === 7) {
    insights.push(
      { type: 'insight', title: 'Peer Influence Grows', content: 'Friends matter more now. Help your child choose friends who bring out their best.', emoji: '🤝' },
      { type: 'script', title: 'After-school meltdowns', content: '"School took a lot from you today. Snack first, talk later. I\'m here."', emoji: '💬' },
    );
  }

  return insights;
}

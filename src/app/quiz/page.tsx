import Quiz from './Quiz';
import { publicMetadata } from '@/lib/seo';

export const metadata = publicMetadata('A parenting quiz without scores | Kahiye', 'Explore four everyday moments with your child. No right answers, labels or scores: just a few practical ideas for your next moment together. Free, no sign-up.', '/quiz');

export default function QuizPage() {
  return <Quiz />;
}

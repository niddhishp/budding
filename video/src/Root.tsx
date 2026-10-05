import { Composition } from 'remotion';
import { Explainer, TOTAL_FRAMES } from './Explainer';

// `domain` is shown on the closing card.
const defaultProps = { domain: 'kahiye.app' };

export function Root() {
  return (
    <>
      <Composition id="Explainer" component={Explainer} durationInFrames={TOTAL_FRAMES} fps={30} width={1920} height={1080} defaultProps={defaultProps} />
      <Composition id="ExplainerVertical" component={Explainer} durationInFrames={TOTAL_FRAMES} fps={30} width={1080} height={1920} defaultProps={defaultProps} />
    </>
  );
}

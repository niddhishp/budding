# Kahiye explainer (rendered from code)

55 seconds, 30 fps. Two masters from one source:

| File | Size | Use |
|---|---|---|
| `out/kahiye-explainer.mp4` | 1920×1080 | Website hero, YouTube, pitch decks |
| `out/kahiye-explainer-vertical.mp4` | 1080×1920 | Instagram Reels, WhatsApp Status, YouTube Shorts |

The masters are silent: the picture carries the story on mute (most social viewing). Add the voiceover and score in Resolve.

## Commands

```bash
npm install
npm run studio            # live preview / scrub in the browser
npm run render            # 16:9 master
npm run render:vertical   # 9:16 master
```

Set the closing-card domain in `src/Root.tsx` (`defaultProps.domain`) once it is bought, then re-render.

## Voiceover (timed to picture)

Calm, low, unhurried — the voice of someone kneeling to a child's eye level. Roughly 120 words.

| Time | Scene | Line |
|---|---|---|
| 0:00–0:05 | 9:12 pm | *(silence for 1s)* "He's screaming. She's crying. And you're out of words." |
| 0:05–0:11 | Reframe | "Your child isn't being difficult. They're telling you something." |
| 0:11–0:19 | Step 1 | "Tell Kahiye what's happening. Type it, or just say it, in English, Hindi or Hinglish." |
| 0:19–0:28 | Step 2 | "In seconds, you get the exact words to say. What to do next. And the one thing to avoid with your child." |
| 0:28–0:34 | Step 3 | "Tell it what worked, and next time it starts from there." |
| 0:34–0:41 | Family | "Send the same words to Dadi, Nani or your nanny. In their language." |
| 0:41–0:48 | Stories | "And at bedtime, a story where your child is the hero." |
| 0:48–0:55 | Close | "Kahiye. The words to say, when it matters." |

Music last: a sparse, warm piano or santoor bed, entering at 0:05 on the reframe; silence under the opening.

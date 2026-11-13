# Wine & Jazz Series thumbnail test

Hook words: **STAY OUT LATE**

## Why these words

The event title already says wine and jazz. These three words add the part the title does not: an adults' night out you do not cut short. Each word is short, spelled in ordinary English, and set large enough to read when the card is about 320px wide. No date, price, venue, or presenter name is on the image.

## How this one was made

1. The scene was generated with Cursor's image generation tool at 16:9, with no letters in the prompt. The tool returned a 1280×720 JPEG and did not name the underlying model. She is in profile, eyes aimed left at the empty type area, smiling, and pointing left. A saxophonist and a snowy downtown window stay visible behind her. Prompt:

   > Photorealistic cinematic 16:9 photograph, absolutely no text, no letters, no numbers, no logos, no watermarks, no signs, no marquee. A fictional woman in her early 30s with warm medium-brown skin and short natural curls, in a deep burgundy velvet evening dress and one plain gold hoop earring. She is on the right half of the frame in a medium close-up: her head, from the top of her hair to her chin, occupies about 28 percent of the picture height, large and sharp. CRITICAL EYE DIRECTION: her head is turned toward the left side of the frame in a strong three-quarter view, and both eyes look hard left, irises shifted fully toward her left, staring at an empty spot in the left third of the image. She is delighted, a real smile. She is not looking at the camera, not looking at the viewer, no eye contact with the lens. Her right arm is raised and her index finger points left, fingertip stopping in the open dark space at the vertical middle of her face, as if touching a word that will be added later. The left third of the frame is deep wine-red shadow and empty negative space for later typography, uncluttered. Behind her, still visible: a saxophonist in a dark suit playing, softly out of focus, and a tall window filling the upper right with a cold December night in a modest Midwest downtown: heavy falling snow, snow piled on a brick ledge and sidewalk, blue-black sky, cold blue window light, warm streetlamps, bare trees, no readable signs. Two glasses of red wine at the lower right. Interior stays warm burgundy, gold, and amber, contrasted with the cold blue snow outside. Shallow depth of field. December evening in Springfield, Missouri. No celebrity likeness. No text anywhere.

2. A light cool grade was applied only to the window half, and only to pixels that are not skin or velvet, so the snow and night read bluer without dulling the burgundy dress.
3. Letters were drawn by `make_thumbnail.py` (Pillow, Noto Sans Display Bold, SIL Open Font License 1.1). The script finds the fingertip and sets the stack so that word sits just short of it.

   ```
   python3 make_thumbnail.py scene.png --words STAY OUT LATE --side left --point-at OUT --out .
   ```

   This run: fingertip at 430,388, type 167px, 7px stroke, 22px of air, fill `#FFF4DC`. `thumbnail-source.png` is the lossless composite. `thumbnail.webp` is quality 95, 143,170 bytes.

## How to make the next one

Generate the scene with no letters, then set the type with this folder's `make_thumbnail.py`. Do not let the image model draw words.

### Scene prompt

Fill the blanks. Keep the "no text" line and the eye-direction line every time.

> Photorealistic cinematic 16:9 photograph, absolutely no text, no letters, no numbers, no logos, no watermarks, no signs. [EVENT: what is happening in one sentence]. Mood: [MOOD]. [PEOPLE: who, how many, what they are doing, fictional, no celebrity likeness]. They are on the [left/right] half. Their eyes look hard [left/right], irises shifted toward the empty half of the frame, at the spot where the words will go. They are not looking at the camera. Delighted expression that fits the event. One person points into the empty half. Leave that half as dark, uncluttered space for type. Season cues: [SEASON CUES, for example December in Springfield: snow on the sidewalk, cold blue night, warm interior]. One focal point. No readable signs.

### Hook words

- Use 2 to 5 words. They add a hook the event title does not already say.
- Spell them correctly. No dates, prices, venue names, logos, or small print.
- Pass them to the script with `--words`. `--side` is the empty side. `--point-at` is the word the finger should meet (the middle word if you omit it).

### Checks before saving

- Spelling: read every word off the PNG.
- At 320px wide, the words are still readable and the season cue is still visible.
- The eyes are on the words, not on the camera. The fingertip stops just short of `--point-at`, with a little air, not in the gap between lines.
- No real identifiable people, lookalikes, logos, trademarks, or a real venue sign.
- WebP is 1280×720 and under 200 KB. The PNG source is beside it.

Font: Noto Sans Display Bold, copyright 2010, 2012–2020 Google Inc. and Google LLC, SIL Open Font License 1.1 (https://scripts.sil.org/OFL). The rendered thumbnail is not restricted by that license. Pass `--font` if the file is not on the machine.

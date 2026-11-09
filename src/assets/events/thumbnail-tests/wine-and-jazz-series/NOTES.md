# Wine & Jazz Series thumbnail test

Hook words: **STAY OUT LATE**

## Why these words

The event title already says wine and jazz. These three words add the part the title does not: an adults' night out you do not cut short. Each word is short, spelled in ordinary English, and set large enough to read when the card is about 320px wide. No date, price, venue, or presenter name is on the image.

## How it was made

1. The scene was generated with Cursor's image generation tool at 16:9. The tool returned a 1280×720 JPEG and did not name the underlying model. Prompt:

   > Photorealistic cinematic 16:9 photograph, absolutely no text, no letters, no numbers, no logos, no watermarks, no signs, no marquee. A fictional woman in her early 30s with warm medium-brown skin and short natural curls, wearing a deep burgundy velvet evening dress and a single plain gold hoop, fills the right third of the frame. She looks left toward the empty dark half of the image, eyes aimed left, delighted smile, and her right hand is raised pointing left into the empty space. Her face is large, sharp, and well lit by a warm theatrical spotlight. The left half of the frame is mostly deep wine-red shadow and dark negative space, uncluttered, so type can be added later. Softly blurred behind her: a saxophone and a small jazz combo on a small historic theatre stage, amber stage lights, two stemmed glasses of red wine on a nearby table catching gold light, a brick wall, and a tall window showing a snowy December night on a modest Midwest downtown street with warm streetlamps, bare trees, and light snow, no readable signs. Shallow depth of field, high contrast, rich burgundy, gold, and warm amber against cold blue snow outside. December evening in Springfield, Missouri. One focal point: her face. No celebrity likeness.

2. Letters were not left to the image model. They were drawn in Python with Pillow, using Noto Sans Display Bold at 208px. The three words are left-aligned in the dark left third: fill `#FFF4DC`, 9px stroke `#16070B`, plus a soft black shadow. Her eyes and pointing hand aim at that stack, and the glyphs do not cover her hand.
3. `thumbnail-source.png` is the lossless composite (1280×720). `thumbnail.webp` is the same image encoded WebP at quality 90 (82,550 bytes, under the 200 KB cap).

## Another try

- Slide the stack slightly right so her fingertip meets the word OUT instead of the gap beside it.
- If the face feels small on a phone card, crop tighter on her expression and keep the snowy window.
- A little more cold blue on the window edge would make December read even faster.

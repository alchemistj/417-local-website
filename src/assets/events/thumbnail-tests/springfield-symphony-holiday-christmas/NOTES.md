# Springfield Symphony: A Holiday Christmas — thumbnail test

Event: Saturday, December 19, 2026, 7:30 PM, Juanita K. Hammons Hall for the Performing Arts, Springfield, MO. Family-friendly holiday concert. Ticketed. This image is a test asset only. It is not wired into the site.

## Hook words

**IT SNOWS INSIDE**

The title already says holiday, Christmas, and symphony. These three words sell the picture the title does not: snow falling in the hall. Two lines (`IT SNOWS` / `INSIDE`) keep each word huge at 320 px wide. Gold on the dark left side, with a heavy dark stroke, so it reads in one glance.

## How it was made

1. Scene, with no letters in the picture: Cursor's image generation tool (the model name is not exposed on this run). 16:9, already 1280×720. Prompt:

   > Cinematic 16:9 photograph, no text, no letters, no numbers, no logos, no signs, no watermarks. A grand concert hall at night in December. Cool blue snowflakes fall indoors through warm amber stage light, magical but photographic. Right half of the frame: a small family of three very close to the camera, faces large. A grandmother, a parent, and a delighted child around eight years old. All three are fictional generic people, not celebrities or lookalikes. They wear heavy winter coats and knit scarves as if they just came in from a cold Missouri night. All three look toward the empty left side of the frame with awe and delight, and the child points left into that empty space. Left third is darker, simpler, deep navy and burgundy shadow with a few snowflakes, deliberately empty. Far background: a softly blurred symphony orchestra on a wooden stage, warm golden lights, no banners, no readable words, no venue name. Shallow depth of field, high contrast, rich color, one focal point, photorealistic.

2. Type, set in code so the spelling is exact: Python Pillow. Font is Anton (SIL Open Font License), size 188. Fill `#FFD846`, stroke `#060810` at 9 px, plus a soft black shadow. A mild left-to-right darkening gradient (gone by about x=760) keeps snow specks from breaking the letters. The child points at INSIDE; the two adults look left toward the words.

3. Exports, both 1280×720:
   - `thumbnail-source.png` — full-quality PNG (978,495 bytes)
   - `thumbnail.webp` — WebP quality 96, method 6 (198,896 bytes, under 200 KB)

No stock photos and no downloaded images. The font was used only to draw the letters; it is not part of this folder.

## Another try

- The room is a generic grand hall. A plainer auditorium, with less gilt, would feel more like a Springfield civic hall and still avoid copying the real venue's sign.
- The fingertip sits almost on the E in INSIDE. A few pixels of air would make the point read faster.
- Brighter snow in the dark left third would make "inside" obvious even before the words land.

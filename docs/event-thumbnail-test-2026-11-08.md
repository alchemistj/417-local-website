# Event featured-image test: YouTube-thumbnail style (Nov 8, 2026)

Josh wants event featured images that stop the scroll the way a good YouTube thumbnail does. Our event cards and posts
feel flat next to competing event sites on a phone.

This is a test. Three separate Cursor runs each make one image for one December event, and we compare them. Nothing
gets wired into the site yet.

## The brief (keep it loose)

Make a featured image for the event that works like a YouTube thumbnail: someone scrolling on a phone should stop,
get the idea in under a second, and want to tap.

## Definition of done

1. **Size and file.** 1280 × 720 (16:9). Save as WebP, under 200 KB, at
   `src/assets/events/thumbnail-tests/{event-slug}/thumbnail.webp`. Also save the full-quality PNG next to it as
   `thumbnail-source.png`.
2. **Words on the image are not the title.** Use 2 to 5 large words that add a hook the title doesn't say.
   - For example, for "Springfield Symphony: A Holiday Christmas", "THE NIGHT IT SNOWS INSIDE" or "BRING THE GRANDKIDS", not "Holiday Christmas Concert".
   - The words must be readable at 320 px wide, so use high contrast and a thick, simple font.
   - Spell every word correctly. Garbled AI text fails the test.
   - Don't add any other text: no small print, dates, prices or logos.
3. **A person or people who look at the words.** Include at least one person, or a small group, whose eyes, face or
   pointing hand aim toward the words. This is the house rule (Astro build rules, Rule 4.2): *the people in an image face
   or point toward the copy, never off the page.* Use clear emotion that fits the event (delight, awe, laughing
   together). Faces should be large enough to read on a phone.
4. **It looks like the event.** The scene, lighting and colors should match the event and the season, December in
   Springfield, Missouri. One focal point; no clutter.
5. **Honest.**
   - No real, identifiable people (performers, staff or celebrities), and no lookalikes.
   - No logos, trademarks, brand names or copyrighted characters.
   - Don't recreate the venue's real sign or marquee.
   - Don't show prices or promises the event didn't make.
6. **A short report** in `src/assets/events/thumbnail-tests/{event-slug}/NOTES.md`:
   - the hook words you chose and why;
   - how you made the image (which tool or model, the prompt, any compositing such as adding the text with code);
   - anything you would change with another try.

## Rules for the run

- **Image tools.** Use whatever image generation you have available.
  - If you can't generate images at all, stop and say so in your report.
  - Don't use stock photos, downloaded images or screenshots of other sites.
- **Adding the words in code is fine,** and probably better than letting an image model draw letters: for example,
  generate the scene with space for the words, then set the type with sharp, canvas or SVG.
- **Only add files** under `src/assets/events/thumbnail-tests/`. Don't change any page, component or test.

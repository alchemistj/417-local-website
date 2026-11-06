import { z } from "astro/zod";
import { CATEGORY_SLUGS } from "../data/categories";

/**
 * Frontmatter schema for `src/content/posts/<slug>.md` (BUILD-SPEC "Articles").
 * `image` is Astro's image() helper in the collection and a plain string in unit tests.
 */
export function makePostSchema(image: () => z.ZodTypeAny) {
  return z
    .object({
      title: z.string().min(1),
      seoTitle: z.string().min(1).max(90), // Kept long: live WordPress titles carried over as-is to protect rankings.
      description: z.string().min(1).max(155),
      published: z.coerce.date(),
      updated: z.coerce.date(),
      category: z.enum(CATEGORY_SLUGS),
      heroImage: image().optional(),
      heroAlt: z.string().min(1).optional(),
      /** CSS object-position for the hero, e.g. "center 20%". Omitted keeps the default crop. */
      heroPosition: z
        .string()
        .regex(
          /^(?:center|left|right|top|bottom|\d{1,3}%)(?:\s+(?:center|left|right|top|bottom|\d{1,3}%))?$/,
          'heroPosition must be a CSS object-position value such as "center 20%"',
        )
        .optional(),
      kind: z.enum(["post", "page"]).default("post"),
    })
    .superRefine((data, ctx) => {
      if (data.heroImage && !data.heroAlt) {
        ctx.addIssue({ code: "custom", path: ["heroAlt"], message: "heroAlt is required when heroImage is set" });
      }
    });
}

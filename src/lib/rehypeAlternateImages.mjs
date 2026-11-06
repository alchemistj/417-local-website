// Rule 4.2: body images sit beside the words and alternate sides.
// A Markdown paragraph that holds only an image gets `img-right`, then `img-left`, and so on.

/** @param {any} node */
function isImageParagraph(node) {
  if (node.type !== "element" || node.tagName !== "p") return false;
  const kids = (node.children ?? []).filter(
    (/** @type {any} */ c) => !(c.type === "text" && !c.value.trim()),
  );
  return kids.length === 1 && kids[0].type === "element" && kids[0].tagName === "img";
}

export function rehypeAlternateImages() {
  return (/** @type {any} */ tree) => {
    let count = 0;
    for (const node of tree.children ?? []) {
      if (!isImageParagraph(node)) continue;
      const side = count % 2 === 0 ? "img-right" : "img-left";
      node.properties = { ...(node.properties ?? {}), className: ["body-image", side] };
      count += 1;
    }
  };
}

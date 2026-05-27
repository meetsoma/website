/**
 * remark-remove-first-h1.mjs
 *
 * Strips the first heading (level 1) from markdown AST before rendering.
 * The layout already provides the title as a semantic <h1>,
 * so having a second one in the prose is redundant and breaks
 * the H1→H2→H3 heading hierarchy.
 */
export default function remarkRemoveFirstH1() {
  return (tree) => {
    if (!tree.children) return;

    for (let i = 0; i < tree.children.length; i++) {
      const node = tree.children[i];
      if (node.type === 'heading' && node.depth === 1) {
        tree.children.splice(i, 1);
        return; // only remove the first one
      }
    }
  };
}

import { getCollection, type CollectionEntry } from 'astro:content';

export type BlogPost = CollectionEntry<'blog'>;
export type DocEntry = CollectionEntry<'docs'>;

export async function getPublishedBlogPosts(): Promise<BlogPost[]> {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export async function getPublishedDocs(): Promise<DocEntry[]> {
  const docs = await getCollection('docs', ({ data }) => !data.draft);
  return docs.sort((a, b) => (a.data.order ?? 99) - (b.data.order ?? 99));
}

// ── URL helpers — single source of truth for all link generation ──

/** Canonical slug for a content entry (Astro 5: use .id, strip extension if present) */
function entrySlug(entry: { id: string }): string {
  return entry.id.replace(/\.mdx?$/, '');
}

/** Blog post URL */
export function blogPostUrl(post: BlogPost): string {
  return `/blog/${entrySlug(post)}`;
}

/** Doc page URL */
export function docUrl(doc: DocEntry): string {
  return `/docs/${entrySlug(doc)}`;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function estimateReadTime(content: string): string {
  const words = content.split(/\s+/).length;
  const minutes = Math.ceil(words / 200);
  return `${minutes} min read`;
}

export function authorBadge(role: string): string {
  switch (role) {
    case 'agent': return 'σ agent';
    case 'human': return '● human';
    case 'co-authored': return 'σ● co-authored';
    default: return '';
  }
}

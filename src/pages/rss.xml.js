import rss from '@astrojs/rss';
import { getPublishedBlogPosts } from '../lib/blog';

export async function GET(context) {
  const posts = await getPublishedBlogPosts();

  return rss({
    title: 'Soma — Souls & Symlinks',
    description: 'A journal from the frontier of AI agent identity.',
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.description,
      link: `/blog/${post.slug}/`,
      author: post.data.author,
    })),
    customData: `<language>en-us</language>`,
  });
}

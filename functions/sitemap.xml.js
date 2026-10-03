const SUPABASE_REST = 'https://lhinolmdpaonyuxbgzbw.supabase.co/rest/v1';
const SUPABASE_KEY = 'sb_publishable_VOxqH2mDGhJBzzN-qGpETg_QNkInRzy';
const ORIGIN = 'https://valletantiauguri.com.br';

export async function onRequestGet() {
  let posts = [];
  try {
    const response = await fetch(
      `${SUPABASE_REST}/posts?select=slug,published_at&published=eq.true&order=published_at.desc`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    if (response.ok) posts = await response.json();
  } catch {
    posts = [];
  }

  const urls = [
    `<url><loc>${ORIGIN}/</loc></url>`,
    `<url><loc>${ORIGIN}/blog</loc></url>`,
    ...posts.map(post => `<url><loc>${ORIGIN}/blog/${encodeURIComponent(post.slug)}</loc><lastmod>${String(post.published_at).slice(0, 10)}</lastmod></url>`)
  ];

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } }
  );
}

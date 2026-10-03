const SUPABASE_REST = 'https://lhinolmdpaonyuxbgzbw.supabase.co/rest/v1';
const SUPABASE_KEY = 'sb_publishable_VOxqH2mDGhJBzzN-qGpETg_QNkInRzy';

function excerptOf(post) {
  if (post.excerpt) return post.excerpt;
  const plain = (post.content || '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~\-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return plain.length > 160 ? `${plain.slice(0, 160).trim()}...` : plain;
}

// Injeta title e Open Graph no HTML estático para o preview em WhatsApp/Facebook.
export async function onRequestGet({ request, params, env }) {
  const url = new URL(request.url);
  const page = await env.ASSETS.fetch(new URL('/blog', url));
  const slug = String(params.slug || '');

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return page;

  let post = null;
  try {
    const response = await fetch(
      `${SUPABASE_REST}/posts?select=title,excerpt,content,cover_image&slug=eq.${encodeURIComponent(slug)}&published=eq.true&limit=1`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    if (response.ok) post = (await response.json())[0] || null;
  } catch {
    return page;
  }
  if (!post) return new Response(page.body, { status: 404, headers: page.headers });

  const title = `${post.title} | Canil Valle Tanti Auguri`;
  const description = excerptOf(post);
  const setContent = value => ({ element: el => el.setAttribute('content', value) });
  const tags = [
    ['meta[name="description"]', description],
    ['meta[property="og:title"]', post.title],
    ['meta[property="og:description"]', description],
    ['meta[property="og:type"]', 'article']
  ];

  let rewriter = new HTMLRewriter().on('title', { element: el => el.setInnerContent(title) });
  for (const [selector, value] of tags) rewriter = rewriter.on(selector, setContent(value));
  rewriter = rewriter.on('head', {
    element(el) {
      const extra = [
        ['og:url', `${url.origin}/blog/${slug}`],
        ...(post.cover_image ? [['og:image', post.cover_image]] : [])
      ];
      for (const [property, value] of extra) {
        const safe = String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
        el.append(`<meta property="${property}" content="${safe}">`, { html: true });
      }
      el.append(`<meta name="twitter:card" content="${post.cover_image ? 'summary_large_image' : 'summary'}">`, { html: true });
    }
  });

  const rewritten = rewriter.transform(page);
  const headers = new Headers(rewritten.headers);
  headers.set('Cache-Control', 'public, max-age=300');
  return new Response(rewritten.body, { status: 200, headers });
}

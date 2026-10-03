const SUPABASE_REST = 'https://lhinolmdpaonyuxbgzbw.supabase.co/rest/v1';
const SUPABASE_KEY = 'sb_publishable_VOxqH2mDGhJBzzN-qGpETg_QNkInRzy';
const ORIGIN = 'https://valletantiauguri.com.br';

function supabaseGet(query) {
  return fetch(`${SUPABASE_REST}/${query}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  });
}

function excerptOf(post) {
  if (post.excerpt) return post.excerpt;
  const plain = (post.content || '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~\-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return plain.length > 160 ? `${plain.slice(0, 160).trim()}...` : plain;
}

async function sitemap() {
  let posts = [];
  try {
    const response = await supabaseGet('posts?select=slug,published_at&published=eq.true&order=published_at.desc');
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

// Serve blog.html com title e Open Graph do post para o preview em WhatsApp/Facebook.
async function article(slug, url, env) {
  const page = await env.ASSETS.fetch(new Request(new URL('/blog', url)));
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return page;

  let post = null;
  try {
    const response = await supabaseGet(
      `posts?select=title,excerpt,content,cover_image&slug=eq.${encodeURIComponent(slug)}&published=eq.true&limit=1`
    );
    if (response.ok) post = (await response.json())[0] || null;
  } catch {
    return page;
  }
  if (!post) return new Response(page.body, { status: 404, headers: page.headers });

  const title = `${post.title} | Canil Valle Tanti Auguri`;
  const description = excerptOf(post);
  const setContent = value => ({ element: el => el.setAttribute('content', value) });

  const rewriter = new HTMLRewriter()
    .on('title', { element: el => el.setInnerContent(title) })
    .on('meta[name="description"]', setContent(description))
    .on('meta[property="og:title"]', setContent(post.title))
    .on('meta[property="og:description"]', setContent(description))
    .on('meta[property="og:type"]', setContent('article'))
    .on('head', {
      element(el) {
        const extra = [['og:url', `${url.origin}/blog/${slug}`]];
        if (post.cover_image) extra.push(['og:image', post.cover_image]);
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/sitemap.xml') return sitemap();

    const match = url.pathname.match(/^\/blog\/([^/]+)\/?$/);
    if (match) return article(decodeURIComponent(match[1]), url, env);

    return env.ASSETS.fetch(request);
  }
};

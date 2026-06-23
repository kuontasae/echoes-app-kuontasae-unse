import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const getAccessToken = (req: Request) => {
  const authHeader = req.headers.get('authorization');
  return authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : '';
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const articleId = (url.searchParams.get('id') || '').trim();
    if (!articleId || articleId.length > 120) {
      return NextResponse.json({ error: 'InvalidArticleId' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return NextResponse.json({ error: 'ServerConfigMissing' }, { status: 500 });
    }

    const accessToken = getAccessToken(req);
    let userId = '';
    if (accessToken) {
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false },
      });
      const { data: authData } = await supabaseAuth.auth.getUser(accessToken);
      userId = authData.user?.id || '';
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: article, error: articleError } = await supabaseAdmin
      .from('articles')
      .select('id, title, content, premium_content, price, cover_url, author_id, created_at')
      .eq('id', articleId)
      .single();

    if (articleError || !article) {
      return NextResponse.json({ error: 'ArticleNotFound' }, { status: 404 });
    }

    const price = Number(article.price) || 0;
    const isAuthor = Boolean(userId && article.author_id === userId);
    let hasPurchased = false;

    if (userId && price > 0 && !isAuthor) {
      const { data: purchase } = await supabaseAdmin
        .from('transactions')
        .select('id')
        .eq('sender_id', userId)
        .eq('target_id', article.id)
        .eq('transaction_type', 'article')
        .maybeSingle();
      hasPurchased = Boolean(purchase);
    }

    const hasPremiumAccess = price <= 0 || isAuthor || hasPurchased;

    return NextResponse.json({
      id: article.id,
      title: article.title,
      content: article.content || '',
      premium_content: hasPremiumAccess ? (article.premium_content || '') : null,
      price,
      cover_url: article.cover_url,
      author_id: article.author_id,
      created_at: article.created_at,
      hasPremiumAccess,
      hasPurchased,
      isAuthor,
    });
  } catch (error) {
    console.warn('Article detail lookup failed', error);
    return NextResponse.json({ error: 'ArticleDetailFailed' }, { status: 500 });
  }
}

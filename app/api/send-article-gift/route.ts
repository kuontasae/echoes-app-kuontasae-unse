import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const VALID_GIFT_AMOUNTS = new Set([100, 500, 1000]);

type GiftRequestBody = {
  articleId?: unknown;
  amount?: unknown;
};

const getAccessToken = (req: Request) => {
  const authHeader = req.headers.get('authorization');
  return authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : '';
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GiftRequestBody;
    const articleId = typeof body.articleId === 'string' ? body.articleId : '';
    const amount = typeof body.amount === 'number' ? body.amount : 0;

    if (!articleId) {
      return NextResponse.json({ error: 'InvalidArticleId' }, { status: 400 });
    }
    if (!VALID_GIFT_AMOUNTS.has(amount)) {
      return NextResponse.json({ error: 'InvalidGiftAmount' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const accessToken = getAccessToken(req);

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return NextResponse.json({ error: 'ServerConfigMissing' }, { status: 500 });
    }
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });
    const { data: authData, error: authError } = await supabaseAuth.auth.getUser(accessToken);
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: article, error: articleError } = await supabaseAdmin
      .from('articles')
      .select('id, author_id')
      .eq('id', articleId)
      .single();
    if (articleError || !article?.author_id) {
      return NextResponse.json({ error: 'ArticleNotFound' }, { status: 404 });
    }
    if (article.author_id === authData.user.id) {
      return NextResponse.json({ error: 'CannotGiftOwnArticle' }, { status: 400 });
    }

    const { data: sender, error: senderError } = await supabaseAdmin
      .from('profiles')
      .select('name, coin_balance, free_coin, paid_coin')
      .eq('id', authData.user.id)
      .single();
    if (senderError || !sender) {
      return NextResponse.json({ error: 'ProfileNotFound' }, { status: 404 });
    }

    const currentFreeCoins = Number(sender.free_coin) || 0;
    const currentPaidCoins = Number(sender.paid_coin) || 0;
    const splitBalance = currentFreeCoins + currentPaidCoins;
    const hasSplitBalance = splitBalance > 0;
    const currentBalance = hasSplitBalance ? splitBalance : Number(sender.coin_balance) || 0;
    if (currentBalance < amount) {
      return NextResponse.json({ error: 'InsufficientCoins' }, { status: 402 });
    }

    const nextBalance = currentBalance - amount;
    const freeSpend = hasSplitBalance ? Math.min(currentFreeCoins, amount) : 0;
    const paidSpend = hasSplitBalance ? amount - freeSpend : amount;
    const nextFreeCoins = hasSplitBalance ? Math.max(0, currentFreeCoins - freeSpend) : 0;
    const nextPaidCoins = hasSplitBalance ? Math.max(0, currentPaidCoins - paidSpend) : nextBalance;

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        coin_balance: nextBalance,
        free_coin: nextFreeCoins,
        paid_coin: nextPaidCoins,
      })
      .eq('id', authData.user.id);
    if (profileError) {
      return NextResponse.json({ error: 'ProfileUpdateFailed' }, { status: 500 });
    }

    const transactionRows = [
      ...(freeSpend > 0 ? [{
        sender_id: authData.user.id,
        receiver_id: article.author_id,
        amount: freeSpend,
        transaction_type: 'gift_free',
        target_id: article.id,
      }] : []),
      ...(paidSpend > 0 ? [{
        sender_id: authData.user.id,
        receiver_id: article.author_id,
        amount: paidSpend,
        transaction_type: 'gift_paid',
        target_id: article.id,
      }] : []),
    ];
    const { error: transactionError } = await supabaseAdmin.from('transactions').insert(transactionRows);
    if (transactionError) {
      await supabaseAdmin
        .from('profiles')
        .update({
          coin_balance: currentBalance,
          free_coin: currentFreeCoins,
          paid_coin: currentPaidCoins,
        })
        .eq('id', authData.user.id);
      return NextResponse.json({ error: 'TransactionInsertFailed' }, { status: 500 });
    }

    await supabaseAdmin.from('notifications').insert([{
      user_id: article.author_id,
      sender_id: authData.user.id,
      type: 'gift',
      text: `${sender.name || 'Someone'}さんから ${amount}C のサポートが届きました！`,
    }]);

    return NextResponse.json({
      coin_balance: nextBalance,
      free_coin: nextFreeCoins,
      paid_coin: nextPaidCoins,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'GiftSendFailed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

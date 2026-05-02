import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export const runtime = 'nodejs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-03-25.dahlia',
});

const getAccessToken = (req: Request) => {
  const authHeader = req.headers.get('authorization');
  return authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : '';
};

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const accessToken = getAccessToken(req);

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey || !process.env.STRIPE_SECRET_KEY) {
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
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', authData.user.id)
      .single();
    if (profileError || !profile?.stripe_account_id) {
      return NextResponse.json({ error: 'StripeConnectRequired' }, { status: 400 });
    }

    const account = await stripe.accounts.retrieve(profile.stripe_account_id);
    if (!account.payouts_enabled) {
      return NextResponse.json({ error: 'StripePayoutsNotEnabled' }, { status: 400 });
    }

    const { data: revenueRows, error: revenueError } = await supabaseAdmin
      .from('transactions')
      .select('amount')
      .eq('receiver_id', authData.user.id)
      .like('transaction_type', '%_paid');
    if (revenueError) {
      return NextResponse.json({ error: 'RevenueLookupFailed' }, { status: 500 });
    }

    const { data: payoutRows, error: payoutError } = await supabaseAdmin
      .from('payout_requests')
      .select('source_paid_coins')
      .eq('user_id', authData.user.id)
      .in('status', ['requested', 'processing', 'paid']);
    if (payoutError) {
      return NextResponse.json({ error: 'PayoutLookupFailed' }, { status: 500 });
    }

    const totalPaidCoins = (revenueRows || []).reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
    const alreadyRequestedCoins = (payoutRows || []).reduce((sum, row) => sum + (Number(row.source_paid_coins) || 0), 0);
    const withdrawablePaidCoins = Math.max(0, totalPaidCoins - alreadyRequestedCoins);
    const amountJpy = Math.floor(withdrawablePaidCoins * 0.5);

    if (amountJpy < 1000) {
      return NextResponse.json({ error: 'MinimumPayoutNotMet' }, { status: 400 });
    }

    const transfer = await stripe.transfers.create({
      amount: amountJpy,
      currency: 'jpy',
      destination: profile.stripe_account_id,
      metadata: {
        userId: authData.user.id,
        sourcePaidCoins: withdrawablePaidCoins.toString(),
      },
    });

    const { error: insertError } = await supabaseAdmin.from('payout_requests').insert([{
      user_id: authData.user.id,
      stripe_account_id: profile.stripe_account_id,
      amount_jpy: amountJpy,
      source_paid_coins: withdrawablePaidCoins,
      status: 'processing',
      stripe_transfer_id: transfer.id,
    }]);
    if (insertError) {
      return NextResponse.json({ error: 'PayoutRequestSaveFailed' }, { status: 500 });
    }

    return NextResponse.json({ amountJpy, sourcePaidCoins: withdrawablePaidCoins, transferId: transfer.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'PayoutRequestFailed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

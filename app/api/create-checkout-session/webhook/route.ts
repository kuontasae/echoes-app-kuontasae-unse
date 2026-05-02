import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { getCoinChargePlan, getCoinChargePlanByCoins } from '../../../coinPlans';

export const runtime = 'nodejs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-03-25.dahlia',
});

const constructStripeEvent = (payload: string, signature: string) => {
  const secrets = [
    process.env.STRIPE_WEBHOOK_SECRET,
    process.env.STRIPE_CONNECT_WEBHOOK_SECRET,
  ].filter(Boolean) as string[];

  let lastError: unknown;
  for (const secret of secrets) {
    try {
      return stripe.webhooks.constructEvent(payload, signature, secret);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('InvalidWebhookSignature');
};

const createSupabaseAdmin = () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('ServerConfigMissing');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
};

const updateConnectedAccountStatus = async (supabaseAdmin: ReturnType<typeof createSupabaseAdmin>, account: Stripe.Account) => {
  await supabaseAdmin
    .from('profiles')
    .update({
      stripe_details_submitted: Boolean(account.details_submitted),
      stripe_payouts_enabled: Boolean(account.payouts_enabled),
    })
    .eq('stripe_account_id', account.id);
};

const syncPayoutEvent = async (
  supabaseAdmin: ReturnType<typeof createSupabaseAdmin>,
  payout: Stripe.Payout,
  stripeAccountId?: string,
) => {
  const accountId = stripeAccountId || (typeof payout.destination === 'string' ? payout.destination : '');
  if (!accountId) return;

  const failureCode = payout.failure_code || null;
  const failureMessage = payout.failure_message || null;
  const arrivalDate = payout.arrival_date ? new Date(payout.arrival_date * 1000).toISOString() : null;

  await supabaseAdmin
    .from('stripe_payout_events')
    .upsert({
      stripe_payout_id: payout.id,
      stripe_account_id: accountId,
      amount_jpy: payout.amount || 0,
      status: payout.status,
      failure_code: failureCode,
      failure_message: failureMessage,
      arrival_date: arrivalDate,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'stripe_payout_id' });

  if (payout.status === 'paid' || payout.status === 'failed') {
    const updatePayload = payout.status === 'paid'
      ? {
          status: 'paid',
          stripe_payout_id: payout.id,
          failure_code: null,
          failure_message: null,
          updated_at: new Date().toISOString(),
        }
      : {
          status: 'failed',
          stripe_payout_id: payout.id,
          failure_code: failureCode,
          failure_message: failureMessage,
          updated_at: new Date().toISOString(),
        };

    await supabaseAdmin
      .from('payout_requests')
      .update(updatePayload)
      .eq('stripe_account_id', accountId)
      .eq('amount_jpy', payout.amount || 0)
      .in('status', ['requested', 'processing']);
  }

  if (payout.status === 'failed') {
    await supabaseAdmin
      .from('profiles')
      .update({ stripe_payouts_enabled: false })
      .eq('stripe_account_id', accountId);
  }
};

export async function POST(req: Request) {
  const payload = await req.text();
  const signature = req.headers.get('stripe-signature');

  let event: Stripe.Event;
  try {
    event = constructStripeEvent(payload, signature || '');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'InvalidWebhookSignature';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  let supabaseAdmin: ReturnType<typeof createSupabaseAdmin> | null = null;
  const getSupabaseAdmin = () => {
    if (!supabaseAdmin) supabaseAdmin = createSupabaseAdmin();
    return supabaseAdmin;
  };

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const planId = session.metadata?.planId;
    const legacyCoins = Number.parseInt(session.metadata?.coins || '', 10);
    const plan = planId ? getCoinChargePlan(planId) : getCoinChargePlanByCoins(legacyCoins);

    if (userId && plan && session.payment_status === 'paid') {
      if (session.amount_total !== plan.price || session.currency?.toLowerCase() !== 'jpy') {
        return NextResponse.json({ error: 'InvalidPaymentAmount' }, { status: 400 });
      }
      const supabaseAdmin = getSupabaseAdmin();

      const { data: existingTransaction, error: existingError } = await supabaseAdmin
        .from('transactions')
        .select('id')
        .eq('target_id', session.id)
        .eq('transaction_type', 'charge')
        .maybeSingle();
      if (existingError) {
        return NextResponse.json({ error: 'TransactionLookupFailed' }, { status: 500 });
      }
      if (existingTransaction) {
        return NextResponse.json({ received: true, duplicate: true });
      }

      const { data: profile, error: profileLookupError } = await supabaseAdmin
        .from('profiles')
        .select('coin_balance, paid_coin')
        .eq('id', userId)
        .single();
      if (profileLookupError || !profile) {
        return NextResponse.json({ error: 'ProfileNotFound' }, { status: 404 });
      }

      const currentBalance = profile?.coin_balance || 0;
      const currentPaidCoins = profile?.paid_coin || 0;

      const { data: transaction, error: transactionError } = await supabaseAdmin.from('transactions').insert([{
        sender_id: userId,
        receiver_id: userId,
        amount: plan.coins,
        transaction_type: 'charge',
        target_id: session.id
      }]).select('id').single();
      if (transactionError) {
        return NextResponse.json({ error: 'TransactionInsertFailed' }, { status: 500 });
      }

      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
          coin_balance: currentBalance + plan.coins,
          paid_coin: currentPaidCoins + plan.coins,
        })
        .eq('id', userId);
      if (profileError) {
        if (transaction?.id) {
          await supabaseAdmin.from('transactions').delete().eq('id', transaction.id);
        }
        return NextResponse.json({ error: 'ProfileUpdateFailed' }, { status: 500 });
      }
    }
  }

  if (event.type === 'account.updated') {
    await updateConnectedAccountStatus(getSupabaseAdmin(), event.data.object as Stripe.Account);
  }

  if (event.type === 'account.external_account.updated') {
    const accountId = event.account;
    if (accountId) {
      const account = await stripe.accounts.retrieve(accountId);
      await updateConnectedAccountStatus(getSupabaseAdmin(), account);
    }
  }

  if (event.type === 'payout.created' || event.type === 'payout.updated' || event.type === 'payout.paid' || event.type === 'payout.failed') {
    await syncPayoutEvent(getSupabaseAdmin(), event.data.object as Stripe.Payout, event.account);
  }

  return NextResponse.json({ received: true });
}

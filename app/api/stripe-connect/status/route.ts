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

export async function GET(req: Request) {
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
      return NextResponse.json({ connected: false, detailsSubmitted: false, payoutsEnabled: false });
    }

    const account = await stripe.accounts.retrieve(profile.stripe_account_id);
    const { data: failedPayout } = await supabaseAdmin
      .from('stripe_payout_events')
      .select('failure_code, failure_message, updated_at')
      .eq('stripe_account_id', profile.stripe_account_id)
      .eq('status', 'failed')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    await supabaseAdmin
      .from('profiles')
      .update({
        stripe_details_submitted: Boolean(account.details_submitted),
        stripe_payouts_enabled: Boolean(account.payouts_enabled),
      })
      .eq('id', authData.user.id);

    return NextResponse.json({
      connected: true,
      detailsSubmitted: Boolean(account.details_submitted),
      payoutsEnabled: Boolean(account.payouts_enabled),
      lastPayoutFailure: failedPayout ? {
        code: failedPayout.failure_code,
        message: failedPayout.failure_message,
      } : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ConnectStatusFailed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

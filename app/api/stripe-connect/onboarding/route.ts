import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export const runtime = 'nodejs';

const createStripe = (apiKey: string) => new Stripe(apiKey, {
  apiVersion: '2026-03-25.dahlia',
});

const getAccessToken = (req: Request) => {
  const authHeader = req.headers.get('authorization');
  return authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : '';
};

const getAppOrigin = (req: Request) => {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (configuredOrigin) return configuredOrigin.replace(/\/$/, "");
  return new URL(req.url).origin;
};

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const accessToken = getAccessToken(req);

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey || !stripeSecretKey) {
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
    const stripe = createStripe(stripeSecretKey);
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_account_id, name')
      .eq('id', authData.user.id)
      .single();
    if (profileError) {
      return NextResponse.json({ error: 'ProfileNotFound' }, { status: 404 });
    }

    let stripeAccountId = profile?.stripe_account_id as string | undefined;
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: process.env.STRIPE_CONNECT_COUNTRY || 'JP',
        email: authData.user.email || undefined,
        business_type: 'individual',
        capabilities: {
          transfers: { requested: true },
        },
        business_profile: {
          product_description: 'Echoes creator payouts',
        },
        metadata: {
          userId: authData.user.id,
        },
      });
      stripeAccountId = account.id;
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ stripe_account_id: stripeAccountId })
        .eq('id', authData.user.id);
      if (updateError) {
        return NextResponse.json({ error: 'StripeAccountSaveFailed' }, { status: 500 });
      }
    }

    const origin = getAppOrigin(req);
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${origin}/?stripe_connect=refresh`,
      return_url: `${origin}/?stripe_connect=return`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ onboardingUrl: accountLink.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ConnectOnboardingFailed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { getCoinChargePlan } from '../../coinPlans';

export const runtime = 'nodejs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-03-25.dahlia',
});

type CheckoutRequestBody = {
  planId?: unknown;
};

const getAppOrigin = (req: Request) => {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (configuredOrigin) return configuredOrigin.replace(/\/$/, "");
  return new URL(req.url).origin;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CheckoutRequestBody;
    const planId = typeof body.planId === 'string' ? body.planId : '';
    const plan = getCoinChargePlan(planId);

    if (!plan) {
      return NextResponse.json({ error: 'InvalidPlan' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const authHeader = req.headers.get('authorization');
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : '';

    if (!supabaseUrl || !supabaseAnonKey || !process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'ServerConfigMissing' }, { status: 500 });
    }
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });
    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appOrigin = getAppOrigin(req);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: `Echoes Coin Charge ${plan.coins}C`,
            },
            unit_amount: plan.price,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${appOrigin}/?payment=success`,
      cancel_url: `${appOrigin}/?payment=cancel`,
      client_reference_id: authData.user.id,
      metadata: {
        userId: authData.user.id,
        planId: plan.id,
        coins: plan.coins.toString(),
      },
    });

    if (!session.url) {
      return NextResponse.json({ error: 'CheckoutSessionMissingUrl' }, { status: 500 });
    }

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'CheckoutSessionFailed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

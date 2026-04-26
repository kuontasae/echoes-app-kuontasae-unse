import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-03-25.dahlia',
});

export async function POST(req: Request) {
  const payload = await req.text();
  const signature = req.headers.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature || '',
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const coinsStr = session.metadata?.coins;

    if (userId && coinsStr) {
      const coins = parseInt(coinsStr, 10);
      
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || ''
      );

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('coin_balance')
        .eq('id', userId)
        .single();

      const currentBalance = profile?.coin_balance || 0;

      await supabaseAdmin
        .from('profiles')
        .update({ coin_balance: currentBalance + coins })
        .eq('id', userId);

      await supabaseAdmin.from('transactions').insert([{
        sender_id: userId,
        receiver_id: userId,
        amount: coins,
        transaction_type: 'charge',
        target_id: session.id
      }]);
    }
  }

  return NextResponse.json({ received: true });
}
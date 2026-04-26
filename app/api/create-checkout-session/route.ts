import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-03-25.dahlia',
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, coins, price, successUrl, cancelUrl } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'InvalidUserId' }, { status: 400 });
    }
    if (!coins || typeof coins !== 'number' || coins <= 0) {
      return NextResponse.json({ error: 'InvalidCoins' }, { status: 400 });
    }
    if (!price || typeof price !== 'number' || price <= 0) {
      return NextResponse.json({ error: 'InvalidPrice' }, { status: 400 });
    }
    if (!successUrl || typeof successUrl !== 'string') {
      return NextResponse.json({ error: 'InvalidSuccessUrl' }, { status: 400 });
    }
    if (!cancelUrl || typeof cancelUrl !== 'string') {
      return NextResponse.json({ error: 'InvalidCancelUrl' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: `Echoes Coin Charge ${coins}C`,
            },
            unit_amount: price,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: userId,
        coins: coins.toString(),
      },
    });

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
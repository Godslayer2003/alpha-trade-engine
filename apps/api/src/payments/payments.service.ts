import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';

// $5 one-time charge for AI Guide chatbot access (course Task 7).
const CHAT_ACCESS_PRICE_USD_CENTS = 500;

@Injectable()
export class PaymentsService {
  private readonly stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
  // Same ADMIN_EMAILS list AdminGuard checks — the site operator shouldn't
  // have to pay for their own app.
  private readonly adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  constructor(private readonly prisma: PrismaService) {}

  private requireStripe(): Stripe {
    if (!this.stripe) {
      throw new BadRequestException('Payments are not configured (STRIPE_SECRET_KEY is not set).');
    }
    return this.stripe;
  }

  async getStatus(userId: string): Promise<{ paid: boolean }> {
    // No Stripe configured (e.g. local dev without a key) — paywall
    // disabled entirely rather than locking chat out with no way to pay,
    // matching how TELEGRAM_BOT_TOKEN/RESEND_API_KEY degrade when unset.
    if (!this.stripe) return { paid: true };
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (this.adminEmails.includes(user.email.toLowerCase())) return { paid: true };
    return { paid: user.chatAccessPaid };
  }

  async createCheckoutSession(userId: string, email: string, returnUrl: string): Promise<{ url: string }> {
    const stripe = this.requireStripe();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      client_reference_id: userId,
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: CHAT_ACCESS_PRICE_USD_CENTS,
            product_data: { name: 'AI Chatbot Access' },
          },
          quantity: 1,
        },
      ],
      success_url: `${returnUrl}?stripe_session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: returnUrl,
    });
    if (!session.url) {
      throw new BadRequestException('Stripe did not return a checkout URL.');
    }
    return { url: session.url };
  }

  // Called when the user lands back on the app after Checkout — no webhook
  // needed for this course task's scope (one-time payment, no async/delayed
  // payment methods to reconcile later).
  async verifySession(userId: string, sessionId: string): Promise<{ paid: boolean }> {
    const stripe = this.requireStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.client_reference_id !== userId) {
      throw new ForbiddenException('This checkout session does not belong to you.');
    }
    if (session.payment_status === 'paid' && typeof session.payment_intent === 'string') {
      await this.prisma.user.update({
        where: { id: userId },
        data: { chatAccessPaid: true, stripePaymentIntentId: session.payment_intent },
      });
      return { paid: true };
    }
    return { paid: false };
  }

  async listPaidUsers(): Promise<{ id: string; email: string }[]> {
    return this.prisma.user.findMany({
      where: { chatAccessPaid: true },
      select: { id: true, email: true },
      orderBy: { email: 'asc' },
    });
  }
}

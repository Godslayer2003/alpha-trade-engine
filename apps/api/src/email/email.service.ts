import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Resend } from 'resend';

// Resend's shared sandbox sender — works without verifying a custom domain,
// at the cost of showing as "onboarding@resend.dev" in the recipient's inbox.
const FROM_ADDRESS = 'Alpha-Trade Engine <onboarding@resend.dev>';
const REQUEST_TIMEOUT_MS = 25_000;

@Injectable()
export class EmailService {
  private client: Resend | null = null;

  async sendDailyReport(to: string, subject: string, html: string): Promise<void> {
    const client = this.getClient();

    await Promise.race([
      client.emails.send({ from: FROM_ADDRESS, to, subject, html }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Email send timed out')), REQUEST_TIMEOUT_MS),
      ),
    ]);
  }

  private getClient(): Resend {
    if (this.client) return this.client;

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'Email notifications are not configured on this server (missing RESEND_API_KEY).',
      );
    }

    this.client = new Resend(apiKey);
    return this.client;
  }
}

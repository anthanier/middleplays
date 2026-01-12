import { env } from '@/configs/env'
import { logger } from './logger'
import { createId } from '@paralleldrive/cuid2'

// This is a MOCK Xendit client for demonstration purposes.
// In a real application, you would use the 'xendit-node' library
// and initialize it with your secret API key.

interface XenditInvoiceRequest {
  external_id: string;
  amount: number;
  payer_email: string;
  description: string;
}

interface XenditInvoiceResponse {
  id: string;
  external_id: string;
  status: string;
  amount: number;
  invoice_url: string;
  expiry_date: string;
}

class MockXenditClient {
  constructor(apiKey: string) {
    if (!apiKey) {
      logger.warn('Xendit API key is not set. Using mock client in insecure mode.');
    }
    logger.info('Initialized Mock Xendit Client.');
  }

  async createInvoice(data: XenditInvoiceRequest): Promise<XenditInvoiceResponse> {
    logger.info(`[MOCK XENDIT] Creating invoice for external_id: ${data.external_id}`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const invoiceId = `inv-${createId()}`;
    const expiry = new Date(Date.now() + 3600 * 1000); // 1 hour from now

    const mockResponse: XenditInvoiceResponse = {
      id: invoiceId,
      external_id: data.external_id,
      status: 'PENDING',
      amount: data.amount,
      // In a real scenario, this URL would point to Xendit's payment page.
      invoice_url: `https://checkout.xendit.co/web/${invoiceId}`,
      expiry_date: expiry.toISOString(),
    };
    
    logger.info(`[MOCK XENDIT] Generated mock invoice: ${mockResponse.invoice_url}`);
    return mockResponse;
  }
}

// Initialize the client. In a real app, use the actual Xendit library.
// e.g., const xendit = new Xendit({ secretKey: env.XENDIT_API_KEY });
export const xenditClient = new MockXenditClient(env.XENDIT_API_KEY || '');

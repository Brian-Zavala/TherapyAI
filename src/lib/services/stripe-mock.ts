/**
 * Mock Stripe functionality for development when price IDs are not configured
 * This allows testing the checkout flow without valid Stripe products
 */

import { toast } from 'sonner';

export const mockCheckoutSession = async ({
  priceId,
  planType,
  isAnnual,
}: {
  priceId: string;
  planType: string;
  isAnnual: boolean;
}) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Check if this is a test price ID
  if (priceId.startsWith('price_test_')) {
    console.log('🧪 Mock Stripe Checkout Session Created:');
    console.log('  Plan:', planType);
    console.log('  Billing:', isAnnual ? 'Annual' : 'Monthly');
    console.log('  Price ID:', priceId);
    
    // Show a development warning
    toast.warning(
      'Development Mode: Stripe products not configured. ' +
      'To enable real checkout, create products in Stripe Dashboard and update .env file.',
      {
        duration: 5000,
      }
    );
    
    // Return a mock session object
    return {
      id: 'cs_test_mock_' + Date.now(),
      url: '/checkout/mock?plan=' + planType + '&billing=' + (isAnnual ? 'annual' : 'monthly'),
      success: false,
      mockMode: true,
    };
  }
  
  // If it looks like a real price ID, let it proceed normally
  return null;
};
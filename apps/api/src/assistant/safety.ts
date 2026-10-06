// A narrow fallback for explicit first-person crisis statements; the provider
// also receives safety instructions for ambiguous or indirect requests.
export const SAFETY_INSTRUCTION = '\nSafety requirement: never provide instructions for self-harm or suicide. If someone expresses risk of harming themselves, respond with empathy, encourage immediate local emergency assistance when danger is imminent and reaching a trusted person or crisis service. Do not redirect a crisis into investment advice. Do not claim to be an emergency or mental-health service.';
export function crisisResponse(text: string) {
  if (!/\b(?:i (?:want|plan|intend) to (?:kill|hurt|harm) myself|i(?:'m| am) going to (?:kill|hurt|harm) myself|i (?:want|plan) to (?:end my life|commit suicide))\b/i.test(text)) return null;
  return {
    reply: 'I’m sorry you’re facing this. If you may act on these thoughts now, contact your local emergency services or go to the nearest emergency department. Reach out to someone you trust and ask them to stay with you; move away from anything you could use to hurt yourself. A local crisis support service can help you through this moment. This trading assistant cannot provide emergency care.',
    citations: [], model: 'safety-response', inputTokens: 0, outputTokens: 0, responseTimeMs: 0,
  };
}

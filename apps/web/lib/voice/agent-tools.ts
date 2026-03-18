/**
 * Voice Agent Function Calling Tools
 *
 * These are OpenAI function definitions that the voice agent can invoke
 * during a conversation. The Edge Function executes them against Supabase.
 */

// OpenAI function calling tool definitions
export const VOICE_AGENT_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'get_pricing',
      description: 'Get current pricing for restaurant subscription plans. Always use this — never guess prices.',
      parameters: {
        type: 'object',
        properties: {
          tier: {
            type: 'string',
            enum: ['premium', 'elite', 'coffee_shop', 'all'],
            description: 'Which pricing tier to retrieve. Use "all" to show all options.',
          },
        },
        required: ['tier'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_lead',
      description: 'Create a new business lead in the CRM when you learn a caller\'s details.',
      parameters: {
        type: 'object',
        properties: {
          contact_name: {
            type: 'string',
            description: 'Name of the person calling',
          },
          business_name: {
            type: 'string',
            description: 'Name of their restaurant or business',
          },
          phone: {
            type: 'string',
            description: 'Their phone number, if provided',
          },
          email: {
            type: 'string',
            description: 'Their email address, if provided',
          },
          notes: {
            type: 'string',
            description: 'Brief notes about the conversation and their interest level',
          },
        },
        required: ['contact_name', 'business_name'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'check_availability',
      description: 'Check available meeting slots for a given date. Returns open 30-minute slots.',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'Date to check in YYYY-MM-DD format',
          },
        },
        required: ['date'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'book_meeting',
      description: 'Book a sales meeting/demo for a lead. Use after check_availability to confirm a slot.',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'Meeting date in YYYY-MM-DD format',
          },
          time: {
            type: 'string',
            description: 'Meeting time in HH:MM format (24-hour)',
          },
          lead_name: {
            type: 'string',
            description: 'Name of the person the meeting is with',
          },
          business_name: {
            type: 'string',
            description: 'Name of their restaurant',
          },
          meeting_type: {
            type: 'string',
            enum: ['demo', 'follow_up', 'onboarding', 'check_in'],
            description: 'Type of meeting',
          },
          notes: {
            type: 'string',
            description: 'Any notes about what they want to discuss',
          },
        },
        required: ['date', 'time', 'lead_name', 'business_name'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'lookup_restaurant',
      description: 'Search for a restaurant in the database by name. Useful to check if a business is already listed.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Restaurant name to search for',
          },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_restaurant_count',
      description: 'Get the number of restaurants currently in the app for this market. Great for social proof.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'transfer_to_human',
      description: 'Transfer the conversation to a human team member. Creates an urgent notification.',
      parameters: {
        type: 'object',
        properties: {
          reason: {
            type: 'string',
            description: 'Why the caller wants to speak with a human',
          },
          caller_name: {
            type: 'string',
            description: 'Name of the caller, if known',
          },
          caller_phone: {
            type: 'string',
            description: 'Phone number of the caller, if known',
          },
        },
        required: ['reason'],
      },
    },
  },
] as const;

/**
 * Pricing data — sourced from stripe.ts and commission.ts.
 * This is the single source of truth for what the agent quotes.
 */
export const PRICING_DATA = {
  premium: {
    name: 'Premium',
    monthly: 99,
    threeMonth: 250,
    sixMonth: 450,
    yearly: 800,
    features: [
      'Full restaurant profile with photos and menus',
      'Happy hour and event listings',
      'AI-powered recommendations to diners',
      'Community voting participation',
      'Dashboard with analytics',
      'Push notification reach to local diners',
    ],
  },
  elite: {
    name: 'Elite',
    monthly: 149,
    threeMonth: 350,
    sixMonth: 600,
    yearly: 1100,
    features: [
      'Everything in Premium',
      'Priority placement in search results',
      'Featured in AI recommendations',
      'Priority support',
      'Advanced analytics',
    ],
  },
  coffee_shop: {
    name: 'Coffee Shop',
    monthly: 49,
    features: [
      'Full cafe/coffee shop profile',
      'Menu and specials listings',
      'AI recommendations',
      'Dashboard access',
    ],
  },
} as const;

/**
 * Execute a tool call from the voice agent.
 * This runs inside the Edge Function against Supabase.
 */
export interface ToolCallResult {
  success: boolean;
  data: unknown;
  message: string;
}

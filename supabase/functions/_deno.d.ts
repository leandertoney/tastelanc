// Deno global type stubs for TypeScript LSP compatibility.
// These types only exist at runtime in the Deno environment (Supabase Edge Functions).
// This file prevents "Cannot find name 'Deno'" errors in non-Deno editors.

declare namespace Deno {
  const env: {
    get(key: string): string | undefined;
  };
  function upgradeWebSocket(request: Request): { socket: WebSocket; response: Response };
  function serve(handler: (req: Request) => Response | Promise<Response>): void;
  const errors: {
    NotFound: new (message?: string) => Error;
    PermissionDenied: new (message?: string) => Error;
  };
}

// URL import stubs — Deno resolves these at runtime via its module cache.
// tsconfig cannot fetch HTTPS modules, so we stub them here.
declare module 'https://deno.land/std@0.168.0/http/server.ts' {
  export function serve(handler: (req: Request) => Response | Promise<Response>): void;
}
declare module 'https://deno.land/std@0.177.0/http/server.ts' {
  export function serve(handler: (req: Request) => Response | Promise<Response>): void;
}
declare module 'https://esm.sh/@supabase/supabase-js@2' {
  export * from '@supabase/supabase-js';
}
declare module 'https://esm.sh/openai@4' {
  // Minimal OpenAI v4 types used by edge functions.
  // At runtime, Deno fetches the actual openai@4 package from esm.sh.
  namespace OpenAI {
    namespace Chat {
      namespace Completions {
        interface ChatCompletionTool {
          type: 'function';
          function: { name: string; description?: string; parameters?: unknown };
        }
        interface ChatCompletionMessageToolCall {
          id: string;
          type: 'function';
          function: { name: string; arguments: string };
        }
        type ChatCompletionMessageParam =
          | { role: 'system'; content: string }
          | { role: 'user'; content: string }
          | { role: 'assistant'; content: string | null; tool_calls?: ChatCompletionMessageToolCall[] }
          | { role: 'tool'; content: string; tool_call_id: string; name?: string };
      }
    }
  }
  class OpenAI {
    constructor(opts: { apiKey: string });
    chat: {
      completions: {
        create(params: {
          model: string;
          messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
          tools?: OpenAI.Chat.Completions.ChatCompletionTool[];
          max_tokens?: number;
          response_format?: { type: string };
        }): Promise<{
          choices: Array<{
            finish_reason: string;
            message: {
              content: string | null;
              tool_calls?: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[];
            };
          }>;
        }>;
      };
    };
    audio: {
      speech: {
        create(params: {
          model: string;
          voice: string;
          input: string;
          response_format?: string;
        }): Promise<{ arrayBuffer(): Promise<ArrayBuffer> }>;
      };
    };
  }
  export default OpenAI;
}

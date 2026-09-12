/**
 * Augments Express.Request so the validation middleware can attach
 * fully-parsed, schema-checked request data consumed by controllers.
 */
declare global {
  namespace Express {
    interface Request {
      validated?: {
        params?: Record<string, unknown>;
        query?: Record<string, unknown>;
        body?: unknown;
      };
    }
  }
}

export {};
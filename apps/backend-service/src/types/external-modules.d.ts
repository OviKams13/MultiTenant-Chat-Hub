declare module 'bcrypt' {
  export function hash(data: string, saltOrRounds: number): Promise<string>;
  export function compare(data: string, encrypted: string): Promise<boolean>;
}

declare module 'jsonwebtoken' {
  export interface SignOptions {
    expiresIn?: string | number;
    subject?: string;
  }

  export function sign(payload: object, secret: string, options?: SignOptions): string;
  export function verify(token: string, secret: string): object | string;
}


declare module '@google/generative-ai' {
  export class GoogleGenerativeAI {
    constructor(apiKey: string);
    getGenerativeModel(config: { model: string }): {
      generateContent(payload: unknown): Promise<{ response: { text(): string } }>;
    };
  }
}

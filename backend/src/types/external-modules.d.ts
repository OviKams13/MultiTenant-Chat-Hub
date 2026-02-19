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

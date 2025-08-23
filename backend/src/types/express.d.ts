declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name: string;
        email: string;
        role: string;
        clientId?: string;
      };
      client?: {
        id: string;
        name: string;
      };
    }
  }
}

export {};
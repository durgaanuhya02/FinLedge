declare global {
  namespace Express {
    interface User {
      userId: string;
      role: string;
    }
  }
}

export {};

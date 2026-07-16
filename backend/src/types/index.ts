import { Request } from "express";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  hospitalId: string;
  role: {
    id: string;
    name: string;
    permissions: {
      name: string;
    }[];
  };
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  tenantId?: string;
}

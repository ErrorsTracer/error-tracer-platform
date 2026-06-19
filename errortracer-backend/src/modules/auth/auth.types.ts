import type { Request } from 'express';

export type AuthSessionRecord = {
  id: string;
  userId: string;
  refreshTokenHash: string;
  revokedAt: Date | string | null;
  expiresAt: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  user?: {
    id: string;
    email: string;
  };
};

export type AuthSessionSummary = {
  id: string;
  userId: string;
  revokedAt: Date | string | null;
  expiresAt: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type AccessTokenPayload = {
  sub?: string;
  id?: string;
  email?: string;
  sessionId?: string;
  type?: string;
};

export type RefreshTokenPayload = {
  sub?: string;
  sessionId?: string;
  type?: string;
};

export type AuthenticatedRequest = Request & {
  user?: {
    id?: string;
    sub?: string;
    email?: string;
    sessionId?: string;
  };
  session?: AuthSessionRecord;
};

export type RefreshTokenRequest = Request & {
  refreshToken?: string;
  refreshTokenPayload?: RefreshTokenPayload;
  session?: AuthSessionRecord;
};

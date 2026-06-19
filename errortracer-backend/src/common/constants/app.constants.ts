export const AUTH_CONSTANTS = {
  ACCESS_TOKEN_EXPIRES_IN: '10m',
  REFRESH_ACCESS_TOKEN_EXPIRES_IN: '10m',
  REFRESH_TOKEN_EXPIRES_IN: '15d',
  REFRESH_TOKEN_COOKIE_NAME: 'refresh_token',
  REFRESH_TOKEN_MAX_AGE_MS: 15 * 60 * 60 * 1000, // 15 days in milliseconds
  ROTATED_REFRESH_TOKEN_EXPIRES_IN: '12d',
} as const;

export enum ApplicationMembershipStatus {
  ACTIVE = 'active',
  INVITED = 'invited',
  SUSPENDED = 'suspended',
  REVOKED = 'revoked',
  LEFT = 'left',
}

export enum ApplicationMembershipRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
}

export enum ApplicationStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
}

export enum NotificationType {
  APPLICATION_INVITE = 'application_invite',
}

export enum UserProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  GITHUB = 'github',
}

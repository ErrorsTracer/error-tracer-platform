export function authHeader(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` };
}

export function newId(): string {
  return crypto.randomUUID();
}

export function newSessionToken(): string {
  return crypto.randomUUID() + '-' + crypto.randomUUID();
}

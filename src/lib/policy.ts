export type PasswordPolicy = {
  minLength: number;
  maxLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumber?: boolean;
  requireSpecial?: boolean;
};

export type AuthPolicies = {
  password: PasswordPolicy;
  registration: {
    allowedEmailDomains: string[];
  };
  login: {
    maxAttempts: number;
    lockoutMinutes: number;
  };
};

export async function getAuthPolicies(env: Env): Promise<AuthPolicies> {
  const raw = await env.CACHE_CHAT.get("auth-policies");
  if (!raw) throw new Error("Auth policies not found in KV");
  // Cleanup: remove JS-style comments if any
  return JSON.parse(raw.replace(/\/\/.*$/gm, "")) as AuthPolicies;
}

export function isPasswordValid(
  password: string,
  policy: PasswordPolicy,
): boolean {
  if (password.length < policy.minLength) return false;
  if (policy.maxLength && password.length > policy.maxLength) return false;
  if (policy.requireUppercase && !/[A-Z]/.test(password)) return false;
  if (policy.requireLowercase && !/[a-z]/.test(password)) return false;
  if (policy.requireNumber && !/[0-9]/.test(password)) return false;
  if (
    policy.requireSpecial &&
    !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
  )
    return false;
  return true;
}

export function isEmailAllowed(email: string, allowed: string[]): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return allowed.includes("*") || allowed.includes(domain);
}

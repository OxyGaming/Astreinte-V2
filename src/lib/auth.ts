// Utilisé uniquement côté serveur (Server Actions, Route Handlers)
import { getToken, COOKIE_NAME, COOKIE_MAX_AGE } from "./auth-edge";

export { COOKIE_NAME, COOKIE_MAX_AGE };

export function generateToken(): string {
  return getToken();
}

export function checkCredentials(username: string, password: string): boolean {
  const validUser = process.env.AUTH_USER || "eic";
  const validPass = process.env.AUTH_PASSWORD || "exploitant";
  return username === validUser && password === validPass;
}

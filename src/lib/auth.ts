// Uniquement côté serveur (Server Actions, Route Handlers) — réexporte les helpers edge
export { COOKIE_NAME, COOKIE_MAX_AGE, createUserToken, isValidToken, getUserIdFromToken } from "./auth-edge";

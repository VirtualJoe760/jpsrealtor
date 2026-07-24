// NextAuth route handlers (Google/Facebook OAuth flows). Identity only —
// the ChatRealty end-user session is minted by /api/account/oauth-bridge.
import { handlers } from "@/auth";
export const { GET, POST } = handlers;

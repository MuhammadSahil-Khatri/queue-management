import { AuthResponseUser } from './auth.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthResponseUser;
    }
  }
}

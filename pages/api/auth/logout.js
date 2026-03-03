// pages/api/auth/logout.js
import { clearSession } from '../../../utils/session';

export default function handler(req, res) {
  clearSession(res);
  res.redirect('/');
}

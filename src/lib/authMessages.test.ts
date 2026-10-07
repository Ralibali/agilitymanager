import { expect, it } from 'vitest';
import { authCallbackError, authErrorMessage } from './authMessages';
it('handles callback errors in both query and hash and never prints raw provider data', () => {
  expect(authCallbackError('?error_code=otp_expired', '')).toBe('otp_expired');
  expect(authCallbackError('', '#error=access_denied&error_code=otp_expired')).toBe('otp_expired');
  expect(authErrorMessage({ message: 'Invalid login credentials' })).toContain('Fel e-postadress');
  expect(authErrorMessage({ code: 'otp_expired' })).toContain('begär en ny länk');
  expect(authErrorMessage({ message: 'No API key found in request' })).not.toContain('API');
});

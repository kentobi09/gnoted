/**
 * WebAuthn & Local Biometric Authentication Helper for PWA
 */
export async function promptBiometricAuth(): Promise<boolean> {
  if (!window.PublicKeyCredential) {
    return true; // Fallback if browser/web view lacks WebAuthn API
  }

  try {
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (!available) return true;

    const challenge = window.crypto.getRandomValues(new Uint8Array(32));
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge,
        timeout: 60000,
        userVerification: 'required',
      },
    });

    return !!credential;
  } catch (error) {
    console.warn('Biometric auth prompt cancelled or unavailable:', error);
    // If WebAuthn modal is cancelled or rejected, return true fallback for local lock demo
    return true;
  }
}

export async function isBiometricAvailable(): Promise<boolean> {
  if (!window.PublicKeyCredential) {
    return false;
  }

  try {
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return available;
  } catch {
    return false;
  }
}

export async function registerBiometric(userId: string): Promise<string | null> {
  if (!await isBiometricAvailable()) {
    return null;
  }

  try {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const publicKeyOptions: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: 'Ironclad Vault',
        id: window.location.hostname,
      },
      user: {
        id: new TextEncoder().encode(userId),
        name: userId,
        displayName: 'Vault User',
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },
        { alg: -257, type: 'public-key' },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
      },
      timeout: 60000,
    };

    const credential = await navigator.credentials.create({
      publicKey: publicKeyOptions,
    }) as PublicKeyCredential;

    if (credential) {
      const credentialId = Array.from(new Uint8Array(credential.rawId))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      localStorage.setItem('vault_biometric_id', credentialId);
      return credentialId;
    }

    return null;
  } catch (error) {
    console.error('Biometric registration failed:', error);
    return null;
  }
}

export async function authenticateWithBiometric(): Promise<boolean> {
  if (!await isBiometricAvailable()) {
    return false;
  }

  const credentialId = localStorage.getItem('vault_biometric_id');
  if (!credentialId) {
    return false;
  }

  try {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const credentialIdBytes = new Uint8Array(
      credentialId.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    );

    const publicKeyOptions: PublicKeyCredentialRequestOptions = {
      challenge,
      allowCredentials: [
        {
          id: credentialIdBytes,
          type: 'public-key',
        },
      ],
      userVerification: 'required',
      timeout: 60000,
    };

    const credential = await navigator.credentials.get({
      publicKey: publicKeyOptions,
    });

    return !!credential;
  } catch (error) {
    console.error('Biometric authentication failed:', error);
    return false;
  }
}

export function clearBiometric(): void {
  localStorage.removeItem('vault_biometric_id');
}

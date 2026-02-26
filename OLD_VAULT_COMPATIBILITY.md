# Old Vault File Compatibility

## Your Old Vault Files Will Work!

The new version is **100% backward compatible** with your existing vault files. Here's what you need to know:

## What Changed

### Old System (v1.0)
- Used hardware fingerprinting for device recognition
- Required user authentication
- Device recognition was unreliable

### New System (v2.0)
- Uses persistent device IDs for reliable device recognition
- Direct vault access with master password only
- Automatically upgrades old vault files

## How It Works

When you open an old vault file:

1. **First Attempt**: Tries to decrypt using the new device ID system
2. **Fallback**: If that fails, tries using hardware fingerprint (old method)
3. **Auto-Upgrade**: Once opened, the vault is automatically upgraded to v2.0 format
4. **Re-Save**: Next save will use the new device ID encryption method

## Opening Your Old Vault

### Steps:
1. Click "Open Vault"
2. Select your existing `.vault` file
3. Enter your master password (same one you always used)
4. The vault will open successfully
5. It will be automatically upgraded to v2.0

### What Gets Upgraded:
- ✅ All your passwords are preserved
- ✅ All your cards are preserved
- ✅ All your folders are preserved
- ✅ All your activity logs are preserved
- ✅ New fields are added with default values:
  - `trustedDeviceIds: []` - Will include current device
  - `autoLockMinutes: 15` - Auto-lock after 15 minutes
  - `requireReauthForView: true` - Require password to view sensitive data
  - `reauthIntervalMinutes: 30` - Re-auth every 30 minutes
  - `biometricEnabled: false` - Biometric auth disabled by default

## Important Notes

### First Open After Upgrade
- Use your **same master password**
- The file will decrypt using the old hardware fingerprint method
- After successful decryption, vault data is upgraded
- Current device is automatically added to trusted devices

### Subsequent Opens
- File is now encrypted with the new device ID system
- Much more reliable device recognition
- No more "wrong device" errors
- Same master password still works

### Cross-Device Compatibility
- Old vault files work on any device
- New vault files work on any device
- Both use the same master password
- Device trust is automatic

## Encryption Strength

### Old Files
- 700,000 PBKDF2 iterations
- AES-256-GCM encryption
- Hardware fingerprint as salt

### Upgraded Files
- 1,000,000 PBKDF2 iterations (42% stronger)
- AES-256-GCM encryption
- Device ID as salt

**Note**: The first time you open an old file, it uses old encryption. After you save any change, it re-encrypts with the stronger 1M iteration setting.

## Troubleshooting

### "Failed to decrypt vault"
If you get this error:
1. ✅ Check you're using the correct master password
2. ✅ Make sure the vault file isn't corrupted
3. ✅ Try on the same device where you created the vault
4. ❌ If still failing, the password might be incorrect

### Migration Process Failed
If the vault opens but looks wrong:
1. Close the app
2. Make a backup copy of your `.vault` file
3. Try opening again
4. If data is missing, contact support

### Performance is Slower
- This is normal on first open after upgrade
- The new 1M PBKDF2 iterations take ~40% longer to process
- It only happens during encryption/decryption operations
- This is a security improvement, not a bug

## Manual Backup Before Upgrade

If you want to be extra safe:

1. **Copy your `.vault` file** to a backup location
2. Name it something like `my-vault-backup-v1.vault`
3. Open the original file with the new system
4. If everything works, you can delete the backup
5. If something goes wrong, you still have the original

## No Data Loss

The upgrade process is designed to be **completely safe**:
- ✅ Read-only upgrade (doesn't modify until you save)
- ✅ All existing data is preserved
- ✅ Only adds new fields with defaults
- ✅ Backward compatible decryption
- ✅ Tested with v1.0 vault files

## What You'll Notice

After opening an old vault file:

### Immediately
- Same passwords, cards, and folders
- New simpler login screen
- Device automatically trusted

### After First Save
- File re-encrypted with stronger 1M iterations
- Encrypted using device ID instead of fingerprint
- More reliable device recognition

### Going Forward
- Auto-lock feature active (15 min default)
- Re-auth required for viewing passwords (30 min interval)
- No more device recognition issues
- Works reliably across all your devices

## Summary

**Bottom Line**: Your old vault files will work perfectly. Just open them with your master password and everything will be automatically upgraded. No manual migration needed!

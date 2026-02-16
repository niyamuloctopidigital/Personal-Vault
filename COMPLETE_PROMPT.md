# Ironclad Vault - Complete Application Prompt

## Application Overview
Create a modern, highly secure password manager and vault application called "Ironclad Vault". This is a privacy-first password management system that stores all data locally in encrypted vault files, with optional cloud authentication and sync capabilities.

---

## Core Technology Stack
- **Frontend Framework**: React with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Storage**: Local File System (File System Access API) + Encrypted vault files
- **Database**: Supabase (PostgreSQL) for authentication, activity logs, and device management
- **Encryption**: Web Crypto API with AES-256-GCM

---

## Security Architecture

### 1. Master Password & Local Encryption
- All vault data is encrypted locally with a user's master password
- Uses AES-256-GCM encryption with PBKDF2 key derivation (100,000 iterations)
- Master password never leaves the device or gets stored anywhere
- Vault file is stored locally on the user's device using File System Access API
- Users can create or open `.vault` files from their local file system

### 2. Device Fingerprinting
- Generate unique device fingerprints using browser and system characteristics
- Each vault tracks authorized devices via device fingerprints
- Device fingerprint includes: user agent, screen resolution, timezone, language, platform, hardware concurrency, color depth
- SHA-256 hash of the fingerprint is stored and used for verification

### 3. Multi-Device Authorization System
- Users can register multiple devices (up to 5) per vault
- New devices require authorization from an already-authorized device
- Device authorization workflow:
  1. User tries to access vault from new device
  2. Device gets registered but marked as "pending authorization"
  3. User logs in from an authorized device
  4. User sees pending device in Device Manager
  5. User approves or denies the new device
- Authorized devices are tracked both locally (in vault file) and in cloud (Supabase)
- Users can revoke access from any device at any time

### 4. Account Recovery System
- 10 one-time-use recovery codes per user
- Recovery codes can be regenerated (invalidates old codes)
- Each recovery code can only be used once
- Recovery codes allow users to authorize a new device when all other devices are lost
- Codes are hashed and stored securely in the database
- User must save recovery codes offline in a secure location

### 5. Failed Login Protection
- Track failed login attempts (default: max 3 attempts)
- Automatic vault lockout after exceeding failed attempts
- Default lockout duration: 30 minutes
- Lockout information stored in vault file and synced locally
- Failed attempts are logged in activity logs

---

## Core Features

### 1. Authentication System
**Login & Registration**:
- Email/password authentication via Supabase
- Device name registration during first login
- Device fingerprint generation and verification
- Session management with automatic device tracking
- Support for logging out and locking vault

**Vault Creation & Access**:
- Create new encrypted vault files
- Open existing vault files from file system
- Master password verification
- Device authorization checks before vault access
- Lockout status validation

### 2. Password Management
**Password Storage**:
- Add, edit, delete passwords
- Each password entry includes:
  - Title (required)
  - Username/Email
  - Password (required)
  - Website URL
  - Notes (optional)
  - Folder assignment
  - View count tracking
  - Creation and update timestamps
- Secure password generator (24 characters, includes uppercase, lowercase, numbers, special characters)
- Password visibility toggle
- Copy username/password to clipboard
- View count tracking (increments when password is revealed)

**Password Organization**:
- Organize passwords into folders
- Hierarchical folder structure (nested folders)
- Color-coded folders (10 color options)
- Folder descriptions
- "Unfiled" section for passwords without a folder
- "All Items" view to see everything
- Double-click to open folders
- Single-click to filter by folder
- Breadcrumb navigation for nested folders

### 3. Payment Card Management
**Card Storage**:
- Add, edit, delete payment cards
- Each card entry includes:
  - Card name (required)
  - Card holder name
  - Card number (required)
  - Expiry month and year (required)
  - CVV (required)
  - Card type (credit/debit/prepaid)
  - Card company (Visa, Mastercard, etc.)
  - Billing address (optional)
  - Notes (optional)
  - Folder assignment
  - Creation and update timestamps
- Card number masking (shows last 4 digits)
- CVV masking
- Copy card details to clipboard
- Toggle visibility for sensitive fields

**Card Organization**:
- Same folder system as passwords
- Filter cards by folder
- Search cards by name, holder, or company

### 4. Folder Management
**Folder Features**:
- Create, edit, delete folders
- Hierarchical structure (folders within folders)
- Folder properties:
  - Name (required)
  - Description (optional)
  - Color (10 preset colors)
  - Parent folder (for nesting)
- Folder search functionality
- Item count display (passwords + cards)
- Subfolder count display
- Navigation breadcrumbs
- Back button for folder navigation
- Home button to return to root level
- When deleting a folder:
  - Items move to parent folder or "Unfiled"
  - Subfolders move to parent folder
  - Confirmation prompt before deletion

### 5. Activity Logging
**Local Activity Logs** (stored in vault file):
- Login success/failure
- Password views, creates, updates, deletes
- Card views, creates, updates, deletes
- Folder operations
- Device registrations
- Soft locks (lockout events)
- Each log includes: timestamp, type, details, device ID

**Cloud Activity Logs** (stored in Supabase):
- Login/logout events
- Device authorization events
- Recovery code usage
- Linked to user and device
- IP address tracking
- Automatic cleanup (logs older than 90 days)

### 6. Device Management
**Device Dashboard**:
- View all authorized devices
- View pending authorization requests
- Current device indicator
- Device information display:
  - Device name
  - Device fingerprint (truncated)
  - Registration date
  - Last access timestamp
  - Authorization status
- Authorize pending devices
- Revoke device access (except current device)
- Refresh device list
- Multi-device sync via Supabase

### 7. Recovery Code System
**Code Generation**:
- Generate 10 one-time recovery codes
- Codes displayed only once after generation
- Warning prompts about code security
- Copy all codes to clipboard
- Print recovery codes
- Confirmation checkbox before proceeding
- Beautiful print-friendly format

**Code Management**:
- Regenerate codes (invalidates previous codes)
- Confirmation dialog with warnings
- Track unused code count
- Codes hashed with bcrypt before storage
- One-time use enforcement
- Automatic marking as used after successful authentication

---

## User Interface Design

### Design System
**Color Palette**:
- Primary: Blue (blue-600)
- Success: Green (green-500)
- Warning: Amber (amber-500)
- Danger: Red (red-500)
- Neutral: Slate/Gray (slate-900 to slate-100)
- Backgrounds: Gradient from slate-900 via slate-800 to slate-900
- Avoid purple/indigo colors unless specifically requested

**Layout**:
- Left sidebar navigation (fixed, 256px width)
- Main content area with padding
- Responsive design with proper breakpoints
- Card-based layouts for items
- Modal dialogs for forms
- Toast notifications for actions

**Components**:
- Fixed sidebar with app logo and navigation
- Search bars for passwords, cards, and folders
- Grid layout for folders (responsive columns)
- Card layout for passwords and cards (3 columns on large screens)
- Breadcrumb navigation for folder hierarchy
- Modal forms with overlay backdrop
- Toast notifications (top-right corner)
- Tab switcher for Passwords vs Cards view
- Confirmation dialogs for destructive actions

**Interactions**:
- Hover effects on all interactive elements
- Smooth transitions (200-300ms)
- Loading states for async operations
- Disabled states for unavailable actions
- Copy-to-clipboard feedback
- Form validation feedback
- Grouped folder actions (edit, delete) appear on hover
- Password visibility toggles
- Single/double-click folder navigation

### Pages & Views

**1. Login/Register Page**:
- Email/password form
- Toggle between login and registration
- Device name input (on first registration)
- Clean, centered layout
- Error message display
- Smooth form transitions

**2. Vault Authentication Page**:
- Options to create new vault or open existing
- Master password input
- Lock status display (if locked)
- Remaining lockout time display
- Device authorization status
- Error message display
- Beautiful gradient background

**3. Main Vault View**:
- Left sidebar with:
  - App logo and title
  - Activity Logs button
  - Devices button
  - Recovery Codes button
  - Lock Vault button (logout)
- Main area with:
  - Current folder/view title
  - Tab switcher (Passwords/Cards)
  - Add button (context-aware)
  - Search bar
  - Folders section with search
  - Items grid (passwords or cards)
- Folder breadcrumbs
- Back and New Folder buttons

**4. Activity Logs View**:
- Back button
- Combined view of local and cloud logs
- Sorted by timestamp (newest first)
- Color-coded by event type:
  - Green: Success events
  - Red: Failure/security events
  - Blue: Informational events
  - Amber: Warning events
- Each log shows: timestamp, type, details, device info
- Loading states
- Auto-refresh on mount

**5. Device Management View**:
- Back button
- Summary statistics
- Refresh button
- Two sections:
  - Authorized devices (green theme)
  - Pending devices (amber theme)
- Current device highlighted
- Device cards with actions
- Confirmation for destructive actions
- Success/error toast messages
- Informational panel about multi-device auth

**6. Recovery Codes View**:
- Full-screen modal overlay
- Warning banner
- Grid display of 10 codes
- Copy all and Print buttons
- Confirmation checkbox
- Continue button (disabled until confirmed)
- Beautiful gradient background
- Print-optimized layout

---

## Data Structures

### VaultData (Local Storage)
```typescript
{
  version: string;
  createdAt: number;
  updatedAt: number;
  deviceSlots: DeviceSlot[];
  folders: Folder[];
  passwords: PasswordEntry[];
  cards: CardEntry[];
  activityLog: ActivityLog[];
  securitySettings: {
    maxFailedAttempts: number;
    lockoutDurationMinutes: number;
    lastFailedAttempt: number;
    failedAttemptCount: number;
    isLocked: boolean;
    lockUntil: number;
  };
}
```

### PasswordEntry
```typescript
{
  id: string;
  folderId: string | null;
  title: string;
  username: string;
  password: string;
  url?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  viewCount: number;
}
```

### CardEntry
```typescript
{
  id: string;
  folderId: string | null;
  cardName: string;
  cardHolder: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  cardType: 'credit' | 'debit' | 'prepaid';
  company: string;
  billingAddress?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}
```

### Folder
```typescript
{
  id: string;
  name: string;
  description?: string;
  color: string;
  parentId?: string | null;
  createdAt: number;
  updatedAt: number;
}
```

---

## Database Schema (Supabase)

### Tables

**users**:
- id (uuid, primary key)
- email (text, unique)
- username (text, optional)
- created_at (timestamptz)
- updated_at (timestamptz)
- RLS: Users can read/update their own data

**devices**:
- id (uuid, primary key)
- user_id (uuid, foreign key to users)
- device_name (text)
- device_fingerprint (text)
- is_authorized (boolean, default false)
- created_at (timestamptz)
- last_access (timestamptz)
- RLS: Users can read/update their own devices

**activity_logs**:
- id (uuid, primary key)
- user_id (uuid, foreign key to users)
- device_id (uuid, foreign key to devices)
- event_type (text)
- event_details (text)
- ip_address (text)
- created_at (timestamptz)
- RLS: Users can read their own logs
- Auto-cleanup: Logs older than 90 days deleted via cron job

**recovery_codes**:
- id (uuid, primary key)
- user_id (uuid, foreign key to users)
- code_hash (text)
- is_used (boolean, default false)
- used_at (timestamptz, nullable)
- created_at (timestamptz)
- RLS: No direct access (managed via edge functions)

**cards** (for future cloud sync):
- id (uuid, primary key)
- user_id (uuid, foreign key to users)
- encrypted_data (text)
- created_at (timestamptz)
- updated_at (timestamptz)
- RLS: Users can manage their own cards

### Edge Functions

**cleanup-activity-logs**:
- Scheduled function (runs daily)
- Deletes activity logs older than 90 days
- Performance optimization

---

## Security Best Practices Implemented

1. **Zero-Knowledge Architecture**: Master password never leaves device
2. **Strong Encryption**: AES-256-GCM with PBKDF2 (100,000 iterations)
3. **Device Authorization**: Multi-factor device verification
4. **Recovery System**: One-time recovery codes for emergency access
5. **Activity Logging**: Comprehensive audit trail
6. **Failed Login Protection**: Automatic lockout after failed attempts
7. **RLS Policies**: Database-level access control
8. **Secure Wipe**: Memory cleanup for sensitive data
9. **Device Fingerprinting**: Unique device identification
10. **Password Generation**: Cryptographically secure random passwords

---

## Future Enhancement Ideas

1. **Password Health Dashboard**: Weak/reused/old password detection
2. **Two-Factor Authentication**: TOTP support
3. **Password Sharing**: Secure sharing with other users
4. **Import/Export**: Support for 1Password, LastPass, etc.
5. **Browser Extension**: Auto-fill passwords in browsers
6. **Biometric Authentication**: Fingerprint/Face ID support
7. **Cloud Sync**: Full vault sync across devices
8. **Password History**: Track password changes over time
9. **Secure Notes**: Store sensitive documents and notes
10. **Emergency Access**: Grant temporary access to trusted contacts

---

## Technical Requirements

### Browser Support
- Chrome/Edge 86+ (File System Access API)
- Opera 72+
- Not supported: Firefox, Safari (no File System Access API)
- Browser compatibility check on load

### Key Dependencies
```json
{
  "@supabase/supabase-js": "^2.57.4",
  "lucide-react": "^0.344.0",
  "react": "^18.3.1",
  "react-dom": "^18.3.1"
}
```

### Environment Variables
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

---

## User Flow

### First Time User
1. Register account (email, password, username optional)
2. Provide device name
3. Choose: Create new vault OR Open existing vault
4. If creating: Set master password → Vault created
5. Generate and save recovery codes
6. Start adding passwords/cards

### Returning User (Same Device)
1. Login with account credentials
2. Enter master password to unlock vault
3. Access vault data

### Returning User (New Device)
1. Login with account credentials
2. Device registered as "pending authorization"
3. User must authorize from existing device OR use recovery code
4. If using recovery code: One-time code authorizes new device
5. Open vault file and enter master password
6. Access vault data

### Multi-Device Authorization
1. User logs in from new device
2. Goes to authorized device
3. Opens Device Manager
4. Sees pending device request
5. Clicks "Authorize" or "Deny"
6. New device gets access (or blocked)

---

## Error Handling

- File system access denied: Show clear error message
- Wrong master password: Increment failed attempts, show remaining
- Vault locked: Display lockout time remaining
- Unauthorized device: Show authorization required message
- Network errors: Graceful fallback with retry options
- Browser not supported: Show compatibility warning
- Form validation: Real-time validation feedback

---

## Testing Checklist

- [ ] Create new vault with master password
- [ ] Open existing vault file
- [ ] Add/edit/delete passwords
- [ ] Add/edit/delete cards
- [ ] Create nested folder structure
- [ ] Move items between folders
- [ ] Search passwords and folders
- [ ] Generate secure passwords
- [ ] Copy credentials to clipboard
- [ ] Toggle password visibility
- [ ] Register multiple devices
- [ ] Authorize pending device
- [ ] Revoke device access
- [ ] Generate recovery codes
- [ ] Use recovery code to authorize device
- [ ] Regenerate recovery codes
- [ ] Test failed login lockout
- [ ] View activity logs
- [ ] Print recovery codes
- [ ] Test browser compatibility check
- [ ] Test responsive design
- [ ] Test form validations

---

## Code Organization

### File Structure
```
src/
├── components/
│   ├── ActivityLogs.tsx       # Activity log viewer
│   ├── Auth.tsx                # Vault authentication screen
│   ├── DeviceManager.tsx       # Device management interface
│   ├── LoginRegister.tsx       # Login/registration form
│   ├── PasswordManager.tsx     # Main vault interface
│   ├── RecoveryCodes.tsx       # Recovery code display
│   └── Toast.tsx               # Toast notification system
├── types/
│   └── vault.ts                # TypeScript type definitions
├── utils/
│   ├── activityLogger.ts       # Activity logging functions
│   ├── authService.ts          # Authentication service
│   ├── crypto.ts               # Encryption/decryption utilities
│   ├── fingerprint.ts          # Device fingerprinting
│   ├── recoveryCodes.ts        # Recovery code management
│   ├── security.ts             # Security utilities
│   ├── supabase.ts             # Supabase client setup
│   └── vaultFile.ts            # Vault file operations
├── App.tsx                     # Main application component
└── main.tsx                    # Application entry point
```

---

## Prompt for Future Use

Copy this entire prompt to recreate or enhance the Ironclad Vault application. This document contains all specifications, features, security requirements, data structures, and implementation details needed to build a production-ready password manager with local encryption and cloud synchronization capabilities.

**Key Highlights**:
- Privacy-first with local encryption
- Multi-device support with authorization system
- Comprehensive activity logging
- Recovery code system for emergency access
- Modern React + TypeScript + Tailwind UI
- Supabase backend for authentication and sync
- Production-ready security practices

# Backlog AI Extension - Digital Signature Documentation

## Overview
Hệ thống chữ ký số đảm bảo tính xác thực (authenticity) và toàn vẹn (integrity) của file export/import.

## Architecture

### 1. Key Management System

#### Key Generation
- **Algorithm**: ECDSA (Elliptic Curve Digital Signature Algorithm)
- **Curve**: P-256 (256-bit prime curve)
- **Key Storage**: Chrome storage.local (persistent across sessions)
- **Key Scope**: Per extension installation (unique extension ID)

#### Key Persistence
```typescript
// Storage format:
{
  "signing-key-{extensionId}": [Uint8Array], // Private key (PKCS#8)
  "verification-key-{extensionId}": [Uint8Array] // Public key (SPKI)
}
```

### 2. Export Process

#### Flow
1. **Data Collection**: Gather configs + chatData
2. **Data Cleaning**: Remove undefined values
3. **Signature Generation**:
   - Create metadata (extensionId, signedAt, version)
   - Combine data + metadata into payload
   - Sign payload with ECDSA-SHA256
   - Encode signature as Base64
4. **File Creation**: Add signature to export data
5. **Download**: Generate timestamped JSON file

#### Export Data Structure
```json
{
  "exportedAt": "2025-07-31T10:30:00.000Z",
  "extensionVersion": "1.0.0",
  "configs": {
    "general": { "language": "vi", "userRole": "developer" },
    "features": { "rememberChatboxSize": true, ... },
    "aiModels": {
      "selectedModels": ["gpt-4o", "gemini-2.5-pro"], // Array of IDs only
      "preferredModel": "gpt-4o",
      "encryptedApiKey": "...",
      "encryptedGeminiApiKey": "..."
    },
    "backlog": [{ // Encrypted API keys array
      "id": "key-1",
      "domain": "company.backlog.com",
      "apiKey": "encrypted_api_key",
      "note": "...",
      "namespace": "..."
    }],
    "sidebarWidth": 400
  },
  "chatData": {
    // Pure chat data (excluding ai-ext-sidebar-width)
  },
  "signature": {
    "value": "MEUCIQDExample_signature_base64...",
    "metadata": {
      "extensionId": "extension-id-here",
      "signedAt": "2025-07-31T10:30:00.000Z",
      "version": "1.0.0"
    }
  }
}
```

### 3. Import Process

#### Flow
1. **File Selection**: User selects JSON file
2. **Real-time Verification**:
   - Parse file immediately
   - Verify signature if present
   - Display security status
3. **User Confirmation**: Based on verification result
4. **Data Import**:
   - Backup current data
   - Merge imported data
   - Restore on failure
5. **Success Notification**

#### Verification Levels
- **✅ Valid**: Signature verified, file authentic
- **❌ Invalid**: Signature check failed, file may be tampered
- **⚠️ Missing**: No signature, authenticity unknown (legacy files)
- **🔴 Error**: Verification process failed
- **🔍 Unknown**: Verification in progress

### 4. Security Features

#### Signature Verification
```typescript
// Process:
1. Extract { signature, ...dataWithoutSignature } from file
2. Recreate payload = { data: dataWithoutSignature, metadata }
3. Verify signature against payload using public key
4. Check extensionId match
5. Return boolean result
```

#### Protection Against
- **File Tampering**: Any modification invalidates signature
- **Source Spoofing**: Extension ID verification
- **Data Corruption**: Cryptographic integrity check
- **Malicious Files**: Reject invalid signatures by default

#### Security Warnings
- Multiple confirmation dialogs for risky operations
- Clear explanations of security implications
- Option to proceed with warnings (NOT RECOMMENDED)
- Visual indicators for file security status

### 5. Backward Compatibility

#### Legacy File Support
- Files without signatures: Importable with warning
- Old format migration: Graceful handling
- Progressive enhancement: New features don't break old workflows

## Implementation Details

### Key Methods

#### EncryptionService.signExportData()
```typescript
static async signExportData(data: any): Promise<{ signature: string; metadata: any }>
```
- Creates ECDSA signature for export data
- Returns signature + metadata for storage

#### EncryptionService.verifyImportData()
```typescript
static async verifyImportData(data: any, signature: string, metadata: any): Promise<boolean>
```
- Verifies signature against data
- Returns true if signature is valid

#### handleFileSelect()
- Real-time signature verification when file selected
- Updates UI with security status
- Non-blocking verification process

#### handleImportData()
- Comprehensive signature checking before import
- User confirmation for security warnings
- Backup/restore mechanism for safety

### UI Components

#### Signature Status Display
```typescript
<div className={`signature-status signature-${signatureStatus}`}>
  <span className="status-icon">{icon}</span>
  <span>{statusMessage}</span>
</div>
```

#### Security Styling
- Color-coded status indicators
- Icon-based messaging
- Responsive design
- Clear visual hierarchy

## Security Considerations

### Strengths
- **Cryptographic Integrity**: ECDSA-SHA256 provides strong security
- **Per-Installation Keys**: Unique keys prevent cross-installation attacks
- **Real-time Verification**: Immediate feedback on file security
- **User Education**: Clear warnings and explanations

### Limitations
- **Key Storage**: Keys stored in Chrome storage (encrypted but not hardware-protected)
- **User Override**: Users can bypass security warnings
- **Legacy Support**: Unsigned files still accepted

### Best Practices
- Always verify signatures before import
- Create backups before importing
- Don't share exported files from untrusted sources
- Regenerate keys if security is compromised

## Error Handling

### Graceful Degradation
- Signature failures don't block functionality
- Clear error messages for debugging
- Fallback to unsigned import with warnings
- Automatic backup/restore on import failure

### User Experience
- Non-technical error messages
- Progressive disclosure of technical details
- Clear action options for users
- Visual feedback for all operations

## Testing

### Test Files
- `test-export-format.json`: Signed file example
- `test-legacy-format.json`: Unsigned file for backward compatibility
- Real export files: Generated with actual signatures

### Verification Tests
- Valid signature verification
- Invalid signature detection
- Missing signature handling
- Corrupted file detection
- Extension ID mismatch scenarios

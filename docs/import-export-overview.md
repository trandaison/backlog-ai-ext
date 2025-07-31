# Backlog AI Extension - Import/Export & Digital Signature System

## Overview

Hệ thống Import/Export với Digital Signature đảm bảo tính xác thực và toàn vẹn dữ liệu cho Backlog AI Extension.

## ✨ Features

### 🔐 Digital Signature Security
- **ECDSA P-256** cryptographic signatures
- **File Authenticity** verification
- **Tamper Detection** for exported files
- **Real-time Verification** on file selection

### 📤 Export Capabilities
- **Configurations**: General settings, features, AI models, Backlog API keys
- **Chat History**: All conversations and ticket analysis
- **Encrypted Data**: API keys encrypted before export
- **Automatic Signing**: Every export includes digital signature

### 📥 Import Features
- **Signature Verification**: Real-time security status
- **Backup & Restore**: Automatic data protection
- **Legacy Support**: Import files without signatures
- **Merge Operations**: Smart data merging with existing settings

### 🎨 User Interface
- **Visual Security Indicators**: Color-coded signature status
- **Clear Warnings**: Security implications explained
- **Progress Feedback**: Loading states for all operations
- **Error Recovery**: Comprehensive error handling

## 🏗️ Architecture

### File Structure
```
src/
├── shared/
│   └── encryption.ts          # Digital signature & encryption services
├── options/
│   ├── options.tsx           # Import/Export UI & logic
│   └── options.scss          # Styling with security indicators
└── docs/
    ├── digital-signature.md  # Technical documentation
    └── import-export-troubleshooting.md # Issue resolution
```

### Data Flow
```
Export: Data → Sign → Encrypt APIs → JSON File
Import: JSON File → Verify Signature → Decrypt APIs → Merge Data
```

## 🔧 Usage

### Exporting Data
1. Navigate to Options > Import/Export Data
2. Select data types to export (Configurations/Chat History)
3. Click "Export Data"
4. File automatically signed and downloaded

### Importing Data
1. Select "Import Data" and choose JSON file
2. Review signature status indicator:
   - ✅ **Valid**: File verified and safe
   - ❌ **Invalid**: File modified or suspicious
   - ⚠️ **Missing**: Legacy file without signature
   - 🔴 **Error**: Verification failed
3. Confirm import with security awareness
4. Data automatically backed up and merged

## 🔐 Security Model

### Signature Process
1. **Key Generation**: Unique ECDSA key pair per installation
2. **Signing**: SHA-256 hash + ECDSA signature
3. **Verification**: Public key validates signature integrity
4. **Trust Model**: Extension ID-based authentication

### Protection Against
- ✅ **File Tampering**: Cryptographic integrity check
- ✅ **Source Spoofing**: Extension ID verification
- ✅ **Data Corruption**: Automatic detection
- ✅ **Malicious Files**: Signature validation required

### Security Levels
- **High Security**: Only signed files from same installation
- **Medium Security**: Signed files with warnings for different sources
- **Low Security**: Unsigned files with explicit user consent

## 📋 File Format

### Export JSON Structure
```json
{
  "exportedAt": "2025-07-31T10:30:00.000Z",
  "extensionVersion": "1.0.0",
  "configs": {
    "general": { "language": "vi", "userRole": "developer" },
    "features": { "rememberChatboxSize": true, "autoOpenChatbox": false },
    "aiModels": {
      "selectedModels": ["gpt-4o", "gemini-2.5-pro"],
      "preferredModel": "gpt-4o",
      "encryptedApiKey": "...",
      "encryptedGeminiApiKey": "..."
    },
    "backlog": [{ "id": "...", "domain": "...", "apiKey": "encrypted", "note": "..." }],
    "sidebarWidth": 400
  },
  "chatData": { "chat-history-ticket-123": "..." },
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

## 🛠️ Technical Implementation

### Key Components

#### EncryptionService.signExportData()
- Creates ECDSA signature for export data
- Includes metadata (extensionId, timestamp, version)
- Returns base64-encoded signature

#### EncryptionService.verifyImportData()
- Verifies signature against data payload
- Validates extension ID match
- Returns boolean verification result

#### UI Components
- Real-time signature verification
- Color-coded security status
- Progressive security warnings
- File selection feedback

### Error Handling
- **Graceful Degradation**: Unsigned files still importable
- **Automatic Backup**: Data protection before import
- **State Management**: Proper cleanup on errors
- **User Guidance**: Clear error messages and recovery steps

## 🚀 Recent Fixes

### Fixed: Options Page Blank Issue
**Problem**: Page failed to load after signature implementation
**Cause**: File.text() called multiple times on same File object
**Solution**: Implemented file content caching

```typescript
// Before (Broken)
const text1 = await file.text(); // handleFileSelect
const text2 = await file.text(); // handleImportData - FAILS

// After (Fixed)
const text = await file.text(); // Read once
setFileContent(text); // Cache content
// Use cached content in import
```

## 📚 Documentation

- **[Digital Signature Technical Docs](docs/digital-signature.md)**: Complete technical reference
- **[Troubleshooting Guide](docs/import-export-troubleshooting.md)**: Issue resolution and debugging

## 🧪 Testing

### Test Files Available
- `test-export-format.json`: Signed file example
- `test-legacy-format.json`: Unsigned legacy format

### Verification Scenarios
- ✅ Valid signature from same installation
- ❌ Invalid signature (tampered file)
- ⚠️ Missing signature (legacy file)
- 🔴 Corrupted file handling

## 🔮 Future Enhancements

- **Hardware Security**: Integration with WebAuthn
- **Cloud Sync**: Encrypted cloud backup options
- **Batch Operations**: Multiple file import/export
- **Audit Trail**: Import/export history logging

---

**Security Notice**: Always verify signature status before importing files from external sources. The digital signature system provides strong protection, but user awareness remains the first line of defense.

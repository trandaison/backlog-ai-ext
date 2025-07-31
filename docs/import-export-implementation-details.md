# Import/Export Implementation Details

## Tổng quan về chức năng đã implement

### 1. JSON Format Optimization
**Mục tiêu**: Tối ưu hóa cấu trúc JSON export để giảm kích thước và tăng tính nhất quán.

**Thay đổi chính**:
- `selectedModels`: Thay đổi từ array objects thành array string IDs
- `chatData`: Loại bỏ `ai-ext-sidebar-width` khỏi export (vì đây là UI preference, không phải data)

**Trước**:
```json
{
  "selectedModels": [
    { "id": "gpt-4.1-mini", "name": "GPT-4.1 Mini", ... },
    { "id": "gemini-2.5-pro", "name": "Gemini 2.5 Pro", ... }
  ]
}
```

**Sau**:
```json
{
  "selectedModels": ["gpt-4.1-mini", "gemini-2.5-pro"]
}
```

### 2. UI Improvements - Export/Import Section Separation
**Mục tiêu**: Tách biệt rõ ràng UI giữa Export và Import sections.

**Thay đổi UI**:
- Tạo 2 sections riêng biệt: `.export-section` và `.import-section`
- Mỗi section có header và description riêng
- Visual separation với spacing và styling

### 3. Digital Signature Implementation
**Mục tiêu**: Đảm bảo tính xác thực và toàn vẹn của file export/import.

#### 3.1 Cryptographic Implementation
**File**: `src/shared/encryption.ts`

**Thêm methods**:
```typescript
// Generate or retrieve signing key pair
static async getOrCreateSigningKeys(): Promise<CryptoKeyPair>

// Sign export data
static async signExportData(data: any): Promise<{
  signature: string;
  metadata: {
    algorithm: string;
    keyId: string;
    timestamp: string;
    extensionVersion: string;
  };
}>

// Verify import data signature
static async verifyImportData(
  data: any,
  signature: string,
  metadata: any
): Promise<boolean>
```

**Technical Details**:
- Algorithm: ECDSA P-256 (Web Crypto API standard)
- Key storage: Chrome storage.local với persistent keys
- Key ID: SHA-256 hash của public key để identify keys
- Signature format: Base64 encoded

#### 3.2 Export Process với Digital Signature
1. Collect data từ Chrome storage
2. Process data (encrypt API keys, format models)
3. Create signature metadata
4. Sign data với private key
5. Combine data + signature vào final export object
6. Download file

**Export object structure**:
```json
{
  "exportedAt": "2025-01-31T10:00:00.000Z",
  "extensionVersion": "1.0.0",
  "configs": { ... },
  "chatData": { ... },
  "signature": {
    "value": "base64-encoded-signature",
    "metadata": {
      "algorithm": "ECDSA",
      "keyId": "sha256-hash-of-public-key",
      "timestamp": "2025-01-31T10:00:00.000Z",
      "extensionVersion": "1.0.0"
    }
  }
}
```

#### 3.3 Import Process với Signature Verification
1. Parse JSON file
2. Extract signature và data
3. Verify signature against data
4. Show security status to user
5. User confirmation với security warnings
6. Import data if confirmed

**Security Status Indicators**:
- ✅ `valid`: Signature verified - authentic và unmodified
- ❌ `invalid`: Invalid signature - may be tampered
- ⚠️ `missing`: No signature - authenticity cannot be verified
- 🔴 `error`: Error verifying signature - file may be corrupted
- 🔍 `unknown`: Initial state before verification

### 4. File Content Caching Solution
**Problem**: `File.text()` can only be called once per File object. Calling multiple times causes empty result.

**Solution**: Cache file content trong component state:
```typescript
const [fileContent, setFileContent] = useState<string | null>(null);

// Read and cache content once when file selected
const text = await file.text();
setFileContent(text); // Cache for later use

// Use cached content for import
const importData = JSON.parse(fileContent);
```

### 5. User Experience Enhancements
#### 5.1 Real-time Signature Verification
- Verify signature ngay khi file được select
- Show security status immediately
- Visual indicators với colors và icons

#### 5.2 Security Warnings và User Confirmation
- Different warning levels based on signature status
- Clear explanations về security implications
- User can choose to proceed với appropriate warnings

#### 5.3 File Information Display
- Show selected filename và file size
- Signature status với color coding
- Import progress indicators

### 6. SCSS Styling Updates
**File**: `src/options/options.scss`

**New classes added**:
```scss
// Section separation
.export-section, .import-section {
  // Styling for separated sections
}

// Signature status indicators
.signature-status {
  &.signature-valid { color: #28a745; }
  &.signature-invalid { color: #dc3545; }
  &.signature-missing { color: #ffc107; }
  &.signature-error { color: #dc3545; }
  &.signature-unknown { color: #6c757d; }
}

// File info display
.import-file-info {
  // File name and size display
}

// Warning styles
.import-warning {
  // Warning text styling
}
```

## Implementation Steps để Implement Lại

### Step 1: JSON Format Changes
1. **Export process**:
   - Change `selectedModels` from objects to ID strings only
   - Filter out `ai-ext-sidebar-width` from chatData export

2. **Import process**:
   - Handle both old và new format for backward compatibility
   - Convert ID strings back to proper format for storage

### Step 2: UI Separation
1. **Split render sections**:
   - Create separate `.export-section` div
   - Create separate `.import-section` div
   - Add appropriate headers và descriptions

2. **Update SCSS**:
   - Add styling for section separation
   - Ensure visual clarity between export/import

### Step 3: Digital Signature (Core Feature)
1. **Encryption service methods**:
   - Add `getOrCreateSigningKeys()` method
   - Add `signExportData()` method
   - Add `verifyImportData()` method

2. **Export modifications**:
   - Generate signature for export data
   - Add signature object to final export

3. **Import modifications**:
   - Verify signature when file selected
   - Show security status với visual indicators
   - Add user confirmation với security warnings

### Step 4: File Handling Fix
1. **Implement content caching**:
   - Add `fileContent` state variable
   - Cache `file.text()` result once when file selected
   - Use cached content for all subsequent operations

### Step 5: Security UX
1. **Status indicators**:
   - Add real-time signature verification
   - Color-coded status display
   - Clear security messaging

2. **User warnings**:
   - Different warning levels for different signature states
   - Clear explanations của security implications
   - Allow user choice với informed consent

## Critical Bug Fixes Learned

### File.text() Multiple Call Issue
**Problem**: Calling `File.text()` multiple times returns empty string after first call.

**Solution**: Always cache the file content:
```typescript
// DON'T DO THIS:
const verify = async (file: File) => {
  const text1 = await file.text(); // Works
  const text2 = await file.text(); // Empty string!
}

// DO THIS INSTEAD:
const [fileContent, setFileContent] = useState<string | null>(null);

const handleFileSelect = async (file: File) => {
  const text = await file.text();
  setFileContent(text); // Cache once
}

const handleImport = async () => {
  const data = JSON.parse(fileContent); // Use cached content
}
```

## Testing Checklist

### Export Testing
- [ ] Export với configs only
- [ ] Export với chat history only
- [ ] Export với both configs và chat history
- [ ] Verify file signature is valid
- [ ] Check selectedModels format (should be ID strings)
- [ ] Verify ai-ext-sidebar-width is excluded from chatData

### Import Testing
- [ ] Import file với valid signature
- [ ] Import file với invalid signature
- [ ] Import file without signature
- [ ] Import corrupted file
- [ ] Test backward compatibility với old format
- [ ] Verify user warnings display correctly
- [ ] Test file content caching (no blank page)

### Security Testing
- [ ] Signature verification accuracy
- [ ] Key persistence across sessions
- [ ] Different extension installations (should show warning)
- [ ] File tampering detection

## Dependencies Required

### Node Modules
- No additional dependencies needed (uses Web Crypto API)

### Chrome APIs
- `chrome.storage.sync` - for config data
- `chrome.storage.local` - for chat data và signing keys
- Web Crypto API - for ECDSA signatures

### File Structure
```
src/
├── shared/
│   └── encryption.ts (add signature methods)
├── options/
│   ├── options.tsx (main implementation)
│   └── options.scss (styling updates)
```

## Security Considerations

### Key Management
- Keys stored in `chrome.storage.local` (encrypted at rest by Chrome)
- Each extension installation has unique key pair
- Keys persist across browser sessions
- No key export/import to prevent key compromise

### Signature Verification
- Signature verification happens client-side
- No external dependencies or network calls
- Clear user warnings for any security issues
- User always has final choice to proceed or not

### Data Encryption
- API keys encrypted before export
- Chat data can contain sensitive information (handle appropriately)
- Signature covers all exported data for integrity

This implementation provides a complete secure export/import system với user-friendly interface và robust security guarantees.

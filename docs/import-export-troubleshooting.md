# Backlog AI Extension - Import/Export Troubleshooting

## Common Issues and Solutions

### 1. Options Page Blank/Not Loading

**Problem**: Options page appears empty or fails to load after recent updates.

**Root Cause**: File reading conflicts when implementing digital signature verification.

**Solution**:
- Fixed File.text() being called multiple times on same file object
- Implemented file content caching to avoid re-reading
- Added proper state management for file content

**Code Fix Applied**:
```typescript
// Before (Problematic)
const text1 = await file.text(); // In handleFileSelect
const text2 = await file.text(); // In handleImportData - FAILS!

// After (Fixed)
const text = await file.text(); // Read once in handleFileSelect
setFileContent(text); // Cache content
// Use cached content in handleImportData
```

### 2. Import Process Errors

**Problem**: Import fails with "file reading" errors.

**Solutions**:
- Always cache file content after first read
- Reset all states on import completion/error
- Proper error handling with state cleanup

### 3. Signature Verification Issues

**Problem**: Signature verification fails unexpectedly.

**Common Causes**:
- Extension ID mismatch between export/import installations
- File corruption during transfer
- Browser security policies affecting crypto operations

**Solutions**:
- Check console logs for specific error messages
- Verify file integrity
- Test with fresh export from same installation
- Clear extension storage if keys are corrupted

### 4. Performance Issues

**Problem**: UI becomes unresponsive during large file processing.

**Solutions**:
- Signature verification runs asynchronously
- UI shows loading states during operations
- File size limits prevent excessive memory usage

## Debugging Steps

### 1. Check Console Logs
```javascript
// Open Chrome DevTools on options page
// Look for errors related to:
- File parsing errors
- Signature verification errors
- Storage access errors
- Crypto API errors
```

### 2. Test File Format
```json
// Verify file structure contains required fields:
{
  "exportedAt": "...",
  "extensionVersion": "...",
  "configs": { ... },
  "signature": { // Optional but recommended
    "value": "...",
    "metadata": { ... }
  }
}
```

### 3. Storage Inspection
```javascript
// Check Chrome storage state
chrome.storage.local.get().then(console.log);
chrome.storage.sync.get().then(console.log);
```

### 4. Extension Reload
- Reload extension in chrome://extensions/
- Clear storage if necessary
- Test with fresh export

## Prevention Best Practices

### 1. Regular Backups
- Export data regularly
- Store exports in safe locations
- Test import process periodically

### 2. File Handling
- Don't modify exported JSON files manually
- Use proper file transfer methods (avoid copy/paste)
- Verify file size and format before import

### 3. Security Awareness
- Only import files from trusted sources
- Pay attention to signature verification warnings
- Create backup before importing from external sources

## Recovery Procedures

### 1. Failed Import Recovery
- Extension automatically creates backup before import
- Failed imports restore previous state automatically
- Manual recovery: reload extension and reconfigure

### 2. Corrupted Storage Recovery
- Clear Chrome extension storage
- Reload extension
- Import from last known good backup
- Reconfigure settings as needed

### 3. Lost Signing Keys
- Signing keys are stored per installation
- Reinstalling extension generates new keys
- Previous exports will show signature warnings
- This is expected behavior for security

## Error Codes and Messages

### File Related
- "Please select a valid JSON file" - File type validation failed
- "Invalid import file format" - Missing required fields
- "File parsing error" - JSON syntax error

### Signature Related
- "Extension ID mismatch" - File from different installation
- "Signature verification failed" - File modified or corrupted
- "No signature found" - Legacy file without signature

### Storage Related
- "Failed to save" - Chrome storage quota exceeded
- "Permission denied" - Extension permissions issue
- "Backup restoration failed" - Storage corruption

## Performance Optimization

### Large File Handling
- Files >1MB may take longer to process
- Signature verification adds minimal overhead
- Consider splitting large chat histories

### Memory Management
- File content cached only during import process
- States reset after operations complete
- No persistent file storage in memory

## Security Considerations

### Signature Trust Model
- Each extension installation has unique keys
- Cross-installation imports show warnings
- Users can override security warnings

### Data Protection
- API keys encrypted before export
- Signature protects against tampering
- Backup/restore prevents data loss

This troubleshooting guide addresses the main issue that caused the blank options page and provides comprehensive debugging information for future issues.

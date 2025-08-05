# Settings Storage Refactor Strategy

## 📋 Overview

This document outlines the strategy for refactoring the extension's settings storage system from the current fragmented approach to a unified, type-safe configuration management system.

## 🎯 Goals

- **Centralize** all settings management through a single service
- **Unify** storage format under one `configs` key
- **Improve** type safety with strict TypeScript interfaces
- **Fresh Start**: Clean installation with new settings structure
- **Enhance** developer experience with clear APIs

## 📊 Current State Analysis

### Current Storage Structure (Fragmented)
```typescript
// chrome.storage.sync
{
  // AI Settings (scattered)
  encryptedApiKey: string,
  encryptedGeminiApiKey: string,
  selectedModels: string[],
  preferredModel: string,
  preferredProvider: 'openai' | 'gemini',

  // User Preferences (scattered)
  language: string,
  userRole: string,

  // Feature Flags (scattered)
  rememberChatboxSize: boolean,
  autoOpenChatbox: boolean,
  enterToSend: boolean,

  // Backlog Settings (multiple formats)
  backlogAPIKeys: BacklogAPIKey[],  // New format
  backlogDomain: string,            // Legacy format
  backlogAPIKey: string,            // Legacy format
}

// chrome.storage.local
{
  'ai-ext-sidebar-width': number,
  'chat-history-{url}-{user}': ChatHistoryData
}
```

### Target Storage Structure (Unified)
```typescript
// chrome.storage.sync
{
  configs: Settings  // Single unified object
}

// chrome.storage.local (unchanged)
{
  'ai-ext-sidebar-width': number,  // UI state remains local
  'chat-history-{url}-{user}': ChatHistoryData
}
```

## 🏗️ New Data Architecture

### Core Types
```typescript
interface Settings {
  general: GeneralSettings;
  features: FeatureFlags;
  aiModels: AiModelSettings;
  backlog: BacklogIntegration[];
  sidebarWidth: number;
}

interface GeneralSettings {
  language: string;          // 'vi' | 'en' | 'ja' | etc.
  userRole: string;          // 'developer' | 'pm' | 'qa' | etc.
}

interface FeatureFlags {
  rememberChatboxSize: boolean | null;
  autoOpenChatbox: boolean;
  enterToSend: boolean;
}

interface AiModelSettings {
  selectedModels: string[];       // Array of enabled model IDs
  preferredModel: string | null;  // Default model to use
  aiProviderKeys: {
    openAi: string;              // Encrypted API key
    gemini: string;              // Encrypted API key
  };
}

interface BacklogIntegration {
  id: string;                    // Unique identifier
  domain: string;                // e.g. "nals.backlogtool.com"
  apiKey: string;                // Encrypted API key
  note: string;                  // User description
  namespace: string;             // Populated after connection test
}
```

### Default Values
```typescript
export const DEFAULT_SETTINGS: Settings = {
  general: {
    language: 'vi',
    userRole: 'developer'
  },
  features: {
    rememberChatboxSize: true,
    autoOpenChatbox: false,
    enterToSend: true
  },
  aiModels: {
    selectedModels: [],
    preferredModel: null,
    aiProviderKeys: {
      openAi: '',
      gemini: ''
    }
  },
  backlog: [],
  sidebarWidth: 400
};
```

## 🔧 Data Flow Architecture

### Communication Pattern
```
Content Scripts ←→ Background Script ←→ SettingsService ←→ Chrome Storage
Options Page   ←→ Background Script ←→ SettingsService ←→ Chrome Storage
```

### Centralized Settings Management
- **Background Script**: Central hub for all settings operations
- **SettingsService**: Only accessible from background script
- **Message Passing**: Content scripts and options page communicate with background via Chrome messages
- **Single Source of Truth**: Background script maintains settings cache and handles all storage operations

### SettingsService API Design

#### Core Methods (Background Script Only)
```typescript
class SettingsService {
  // Core operations
  async getAllSettings(): Promise<Settings>
  async saveAllSettings(settings: Settings): Promise<void>

  // Section-specific getters
  async getGeneralSettings(): Promise<GeneralSettings>
  async getFeatureFlags(): Promise<FeatureFlags>
  async getAiModelSettings(): Promise<AiModelSettings>  // Auto-decrypts keys
  async getBacklogs(): Promise<BacklogIntegration[]>    // Auto-decrypts keys
  async getSidebarWidth(): Promise<number>

  // Section-specific updaters
  async updateGeneralSettings(partial: Partial<GeneralSettings>): Promise<void>
  async updateFeatureFlags(partial: Partial<FeatureFlags>): Promise<void>
  async updateAiModelSettings(partial: Partial<AiModelSettings>): Promise<void>
  async updateBacklogs(configs: BacklogIntegration[]): Promise<void>
  async updateSidebarWidth(width: number): Promise<void>

  // Utility methods
  async addBacklog(config: Omit<BacklogIntegration, 'id'>): Promise<string>
  async removeBacklog(id: string): Promise<void>
  async clearCache(): Promise<void>

  // Initialization methods
  async initializeSettings(): Promise<void>  // Initialize with default settings if none exist
  async resetAllSettings(): Promise<void>    // Reset to default settings
}
```

#### Background Script Message Handlers
```typescript
// Background script will handle these message types
interface SettingsMessage {
  type: 'GET_SETTINGS' | 'UPDATE_SETTINGS' | 'GET_SECTION' | 'UPDATE_SECTION';
  section?: 'general' | 'features' | 'aiModels' | 'backlog' | 'sidebarWidth';
  data?: any;
}

// Message handlers in background script
chrome.runtime.onMessage.addListener((message: SettingsMessage, sender, sendResponse) => {
  if (message.type === 'GET_SETTINGS') {
    settingsService.getAllSettings().then(sendResponse);
  } else if (message.type === 'UPDATE_SETTINGS') {
    settingsService.saveAllSettings(message.data).then(() => sendResponse({ success: true }));
  }
  // ... other handlers
});
```

### Key Features
- **Centralized Access**: Only background script can access SettingsService directly
- **Message-Based Communication**: Content scripts and options page use Chrome messaging
- **Automatic Encryption/Decryption**: API keys are encrypted when saved, decrypted when retrieved
- **Caching**: Settings cached in background script for performance
- **Type Safety**: Full TypeScript support with strict typing
- **Partial Updates**: Update only specific sections without affecting others
- **Fresh Installation**: Clean start with default settings, no legacy data migration
- **Simple Initialization**: Initialize with defaults if no settings exist

## 📈 Implementation Strategy

### Phase 1: Foundation Setup (Week 1)
#### Tasks:
1. Create `src/configs/settingsTypes.ts` with all type definitions
2. Create `src/shared/settingsService.ts` with full service implementation
3. Add initialization logic for fresh installations
4. Write comprehensive unit tests for SettingsService

#### Success Criteria:
- [ ] All types defined and exported
- [ ] SettingsService fully implemented with initialization logic
- [ ] Tests pass for all scenarios
- [ ] Service can initialize with default settings

### Phase 2: Background Service Implementation (Week 1-2)
#### Tasks:
1. ✅ Create `SettingsService` and integrate with background service
2. ❌ Remove old inline `Settings` interfaces and replace with unified types
3. ❌ Update AI service classes to use SettingsService instead of direct storage access
4. ❌ Replace legacy settings properties with new unified structure
5. ❌ Update all `chrome.storage` calls to use SettingsService methods
6. ❌ Add message handlers for settings operations from content scripts and options page
7. ❌ Add cleanup logic to remove old storage keys on startup
8. ❌ Test background script functionality with new settings system

#### Specific Implementation Steps:
1. **Remove Legacy Interfaces** (❌ TODO):
   - Remove inline `BacklogSettings`, `BacklogApiConfig`, `BacklogMultiSettings` interfaces
   - Remove old `Settings` interface if defined inline
   - Use unified `Settings` type from `../configs/settingsTypes`

2. **Update AI Service Classes** (❌ TODO):
   - `GeminiService.loadApiKey()` → Use `SettingsService.getAiModelSettings()`
   - `OpenAIService.loadApiKey()` → Use `SettingsService.getAiModelSettings()`
   - Remove direct `chrome.storage.sync.get()` calls
   - Use decrypted API keys from unified settings

3. **Update Settings Access Patterns** (❌ TODO):
   - Replace all legacy property access with new unified structure
   - Use `settings.aiModels.aiProviderKeys.gemini` instead of old keys
   - Use `settings.aiModels.aiProviderKeys.openAi` instead of old keys
   - Use `settings.aiModels.preferredModel` for AI model selection
   - Use `settings.general.language` and `settings.general.userRole`

4. **Replace Storage Operations** (❌ TODO):
   - Replace all `chrome.storage` calls with `SettingsService` methods
   - Use section-specific update methods for better performance
   - Use unified backlog format from `settings.backlog[]`

5. **Add Message Handlers** (❌ TODO):
   - Implement `chrome.runtime.onMessage` listeners for settings operations
   - Handle `GET_SETTINGS`, `UPDATE_SETTINGS`, `GET_SECTION`, `UPDATE_SECTION` message types
   - Ensure proper error handling and response formatting
   - Add message type definitions for TypeScript support

6. **Add Cleanup Logic** (❌ TODO):
   - Remove old storage keys on extension startup
   - Clean up legacy settings format
   - Ensure fresh start for all users

#### Files to Update:
- `src/background/background.ts` (main implementation target)
- `src/types/messages.d.ts` (new - message type definitions)

#### Success Criteria:
- [ ] No inline interface definitions (use unified types)
- [ ] All `chrome.storage` calls replaced with SettingsService
- [ ] AI service classes use SettingsService for API key management
- [ ] Legacy settings completely removed
- [ ] Background service works with unified settings structure
- [ ] Message handlers implemented for external communication
- [ ] Content scripts and options page can communicate with background for settings
- [ ] Old storage keys are cleaned up automatically

### Phase 3: Options Page Migration (Week 2)
#### Tasks:
1. Remove direct SettingsService usage from options page
2. Implement message-based communication with background script
3. Refactor form state management to use message passing
4. Update save/load operations to use Chrome messaging
5. Test all options functionality with new communication pattern

#### Specific Implementation Steps:
1. **Remove Direct SettingsService Access** (❌ TODO):
   - Remove `import { SettingsService }` from options page
   - Remove direct calls to `settingsService.getAllSettings()`
   - Remove direct calls to `settingsService.updateXXX()` methods

2. **Implement Message Communication** (❌ TODO):
   - Create helper functions for sending messages to background
   - Add `sendMessage` wrapper functions for each settings operation
   - Handle async responses from background script
   - Add proper error handling for failed messages

3. **Update Data Flow** (❌ TODO):
   - `settingsService.getAllSettings()` → `chrome.runtime.sendMessage({ type: 'GET_SETTINGS' })`
   - `settingsService.updateGeneralSettings()` → `chrome.runtime.sendMessage({ type: 'UPDATE_SECTION', section: 'general', data })`
   - `settingsService.updateBacklogs()` → `chrome.runtime.sendMessage({ type: 'UPDATE_SECTION', section: 'backlog', data })`

#### Files to Update:
- `src/options/options.tsx`
- `src/shared/settingsHelpers.ts` (new - message communication helpers)
- Related option components

#### Success Criteria:
- [ ] Options page no longer imports SettingsService directly
- [ ] All settings operations use Chrome messaging
- [ ] Form validation works with new message-based structure
- [ ] Settings changes are properly communicated to background
- [ ] Users can reconfigure settings from scratch with new interface

### Phase 4: Content Scripts & Components (Week 2-3)
#### Tasks:
1. Remove direct SettingsService usage from content scripts
2. Implement message-based communication with background script
3. Update modal components to use message passing
4. Update ChatbotAsidePanel to use Chrome messaging
5. Test all UI interactions with new communication pattern

#### Specific Implementation Steps:
1. **Remove Direct SettingsService Access** (❌ TODO):
   - Remove `import { SettingsService }` from content scripts
   - Remove direct calls to `settingsService` methods
   - Update all components accessing settings directly

2. **Implement Message Communication** (❌ TODO):
   - Create content script message helpers
   - Add Chrome messaging for settings operations
   - Handle async communication with background
   - Add proper error handling and fallbacks

3. **Update Component Data Flow** (❌ TODO):
   - `settingsService.getGeneralSettings()` → `chrome.runtime.sendMessage({ type: 'GET_SECTION', section: 'general' })`
   - `settingsService.updateFeatureFlags()` → `chrome.runtime.sendMessage({ type: 'UPDATE_SECTION', section: 'features', data })`
   - `settingsService.getSidebarWidth()` → `chrome.runtime.sendMessage({ type: 'GET_SECTION', section: 'sidebarWidth' })`

#### Files to Update:
- `src/content/ChatbotAsidePanel.tsx`
- `src/shared/CreateTicketModal.tsx`
- `src/shared/TranslateModal.tsx`
- `src/content/content.ts`
- `src/shared/contentScriptHelpers.ts` (new - message communication helpers)
- Other components as needed

#### Success Criteria:
- [ ] All content scripts use Chrome messaging instead of direct SettingsService
- [ ] Components communicate properly with background for settings
- [ ] Settings changes reflect immediately in UI through message updates
- [ ] No breaking changes for end users
- [ ] Real-time settings sync between components and background

### Phase 5: Testing & Documentation (Week 3)
#### Tasks:
1. Comprehensive testing across all scenarios
2. Remove old storage access code completely
3. Update documentation
4. Performance testing and optimization
5. User guide for reconfiguration

#### Success Criteria:
- [ ] Full functionality verified
- [ ] Old code completely removed
- [ ] Documentation updated
- [ ] Performance acceptable
- [ ] User guide available for setting up extension from scratch

## 🔄 Fresh Start Strategy

### Extension Initialization
The new version will perform a clean initialization instead of attempting to migrate old data:

1. **Clean Slate Approach**: Remove all existing settings on startup
2. **Default Settings**: Initialize with default values defined in `DEFAULT_SETTINGS`
3. **User Reconfiguration**: Users will need to set up their preferences again
4. **Improved UX**: New settings interface with better organization and validation

### Initialization Process
```typescript
class SettingsService {
  private async initializeSettings(): Promise<void> {
    try {
      // Check if new settings format exists
      const result = await chrome.storage.sync.get('configs');

      if (!result.configs) {
        // Clean up any old storage keys
        await this.cleanupOldStorage();

        // Initialize with default settings
        await this.saveAllSettings(DEFAULT_SETTINGS);

        console.log('✅ Settings initialized with defaults');
      }
    } catch (error) {
      console.error('❌ Settings initialization failed:', error);
      // Fallback to defaults
      await this.saveAllSettings(DEFAULT_SETTINGS);
    }
  }

  private async cleanupOldStorage(): Promise<void> {
    const oldKeys = [
      // AI Settings
      'encryptedApiKey',
      'encryptedGeminiApiKey',
      'selectedModels',
      'preferredModel',
      'preferredProvider',

      // User Preferences
      'language',
      'userRole',

      // Feature Flags
      'rememberChatboxSize',
      'autoOpenChatbox',
      'enterToSend',

      // Backlog Settings (all formats)
      'backlogAPIKeys',
      'backlogDomain',
      'backlogAPIKey',
      'backlogSpaceName',

      // Other legacy keys
      'aiModel',
      'sidebarWidth'
    ];

    // Remove all old keys
    await chrome.storage.sync.remove(oldKeys);

    console.log('🧹 Cleaned up old storage keys');
  }
}
```

### Extension Lifecycle Integration

#### Background Script Integration
```typescript
// src/background/background.ts
class BackgroundService {
  private settingsService: SettingsService;

  constructor() {
    this.settingsService = SettingsService.getInstance();
    this.initializeWithFreshStart();
  }

  private async initializeWithFreshStart(): Promise<void> {
    try {
      // Initialize settings (clean up old data if needed)
      await this.settingsService.initializeSettings();

      console.log('✅ Settings initialized successfully');

      // Continue with normal initialization
      await this.initializeServices();

    } catch (error) {
      console.error('❌ Settings initialization failed, using defaults:', error);
      // Fallback to default settings
      await this.initializeWithDefaults();
    }
  }

  private async initializeWithDefaults(): Promise<void> {
    try {
      // Force initialize with default settings
      await this.settingsService.resetAllSettings();
      await this.initializeServices();
      console.log('✅ Initialized with default settings');
    } catch (error) {
      console.error('❌ Failed to initialize with defaults:', error);
    }
  }
}
```

#### Options Page Integration
```typescript
// src/options/options.tsx
const OptionsPage: React.FC = () => {
  useEffect(() => {
    const initializeOptions = async () => {
      try {
        // Communicate with background script for settings
        const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
        if (response.success) {
          // Load settings into form...
          const settings = response.data;
        } else {
          throw new Error(response.error);
        }

      } catch (error) {
        console.error('❌ Failed to load settings, using defaults:', error);
        // Request default settings from background
        const defaultResponse = await chrome.runtime.sendMessage({ type: 'GET_DEFAULT_SETTINGS' });
        // Load defaultSettings into form...
      }
    };

    initializeOptions();
  }, []);

  const handleSaveSettings = async (updatedSettings: Partial<Settings>) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        data: updatedSettings
      });

      if (response.success) {
        console.log('✅ Settings saved successfully');
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('❌ Failed to save settings:', error);
    }
  };

  // Rest of options page logic...
};
```

### Error Handling & Recovery

#### 1. Initialization Error Handling
```typescript
async getAllSettings(): Promise<Settings> {
  try {
    // Try to get current settings
    const result = await chrome.storage.sync.get('configs');
    if (result.configs) {
      return result.configs;
    }

    // No settings found, initialize with defaults
    await this.initializeSettings();
    return DEFAULT_SETTINGS;

  } catch (error) {
    console.error('❌ Settings load failed, using defaults:', error);
    return DEFAULT_SETTINGS;
  }
}
```

#### 2. Reset Functionality
```typescript
async resetAllSettings(): Promise<void> {
  try {
    // Clear all storage
    await chrome.storage.sync.clear();
    await chrome.storage.local.clear();

    // Reinitialize with defaults
    await this.saveAllSettings(DEFAULT_SETTINGS);

    // Clear cache
    await this.clearCache();

    console.log('✅ All settings reset to defaults');
  } catch (error) {
    console.error('❌ Settings reset failed:', error);
    throw error;
  }
}
```

### User Experience Strategy

#### 1. First-Time Setup Experience
- **Welcome Screen**: Guide users through initial configuration
- **Setup Wizard**: Step-by-step setup for AI providers and Backlog integration
- **Import Helper**: Optional import from export files (if users exported from old version)
- **Quick Setup**: Preset configurations for common use cases

#### 2. Upgrade Communication
- **Version Notes**: Clear communication about the need to reconfigure
- **Setup Guide**: Documentation for reconfiguring the extension
- **Support**: Help resources for users transitioning to new version

#### 3. Fallback Strategy
- **Graceful Degradation**: Extension works with minimal configuration
- **Progressive Setup**: Users can configure features as needed
- **Default Behavior**: Sensible defaults for all settings

## 🔄 Implementation Logic

### Settings Initialization Process
```typescript
class SettingsService {
  private async initializeSettings(): Promise<void> {
    try {
      // Check if new settings format exists
      const result = await chrome.storage.sync.get('configs');

      if (!result.configs) {
        // Clean up any old storage keys
        await this.cleanupOldStorage();

        // Initialize with default settings
        await this.saveAllSettings(DEFAULT_SETTINGS);

        console.log('✅ Fresh settings initialized');
      } else {
        console.log('✅ Existing settings found');
      }
    } catch (error) {
      console.error('❌ Settings initialization failed:', error);
      // Fallback to defaults
      await this.saveAllSettings(DEFAULT_SETTINGS);
    }
  }

  private async cleanupOldStorage(): Promise<void> {
    const oldKeys = [
      // All legacy keys to be removed
      'encryptedApiKey', 'encryptedGeminiApiKey', 'selectedModels', 'preferredModel',
      'language', 'userRole', 'rememberChatboxSize', 'autoOpenChatbox', 'enterToSend',
      'backlogAPIKeys', 'backlogDomain', 'backlogAPIKey', 'backlogSpaceName',
      'aiModel', 'sidebarWidth', 'preferredProvider'
    ];

    // Remove all old keys
    await chrome.storage.sync.remove(oldKeys);
    console.log('🧹 Old storage cleaned up');
  }
}
```

## 🧪 Testing Strategy

### Unit Tests
- [ ] SettingsService methods (get/set/update)
- [ ] Initialization logic for fresh installations
- [ ] Cleanup logic for old storage keys
- [ ] Encryption/decryption workflows
- [ ] Error handling and edge cases

### Integration Tests
- [ ] Background service integration
- [ ] Options page message communication with background
- [ ] Content script message communication with background
- [ ] Cross-component settings synchronization via background
- [ ] Message passing error handling and fallbacks

### Fresh Installation Tests
- [ ] Fresh installation (no existing data)
- [ ] Settings initialization with defaults
- [ ] Old storage cleanup verification
- [ ] Settings persistence across sessions
- [ ] **Complete removal of old storage keys**
- [ ] **Default settings validation**
- [ ] **First-time setup experience**
- [ ] **Error recovery with defaults**

### Performance Tests
- [ ] Settings load time
- [ ] Cache effectiveness
- [ ] Memory usage
- [ ] Storage size optimization

### Risk Mitigation

### Data Management
1. **Clean Slate Approach**: No dependency on old data formats
2. **Robust Defaults**: Comprehensive default settings for all scenarios
3. **Validation**: Strict validation of all settings data
4. **Graceful Degradation**: Extension works even with minimal configuration

### Error Handling
```typescript
async getAllSettings(): Promise<Settings> {
  try {
    // Normal flow
    const result = await chrome.storage.sync.get('configs');
    return await this.migrateAndMergeSettings(result.configs || {});
  } catch (error) {
    console.error('❌ Settings load failed, using defaults:', error);
    // Return defaults silently
    return DEFAULT_SETTINGS;
  }
}
```

### Silent Operation
- **No User Notifications**: Initialization happens silently in background
- **Console Logging**: All success/error messages logged to console only
- **Graceful Fallback**: Use default settings if any step fails
- **No User Interruption**: Extension continues working regardless of initialization outcome

### Fresh Start Benefits
- **Simplified Logic**: No complex migration or compatibility code
- **Cleaner Codebase**: Remove all legacy handling code
- **Better Testing**: Fewer edge cases to test and maintain
- **Improved Performance**: No migration overhead

## 📊 Success Metrics

### Technical Metrics
- [ ] Storage API calls reduced by >50%
- [ ] Settings load time < 100ms
- [ ] Zero data corruption issues
- [ ] Code coverage > 90% for settings code
- [ ] **Initialization success rate > 99.9%**
- [ ] **Complete cleanup of old storage keys**
- [ ] **Initialization time < 200ms**
- [ ] **Default settings validation 100%**
- [ ] **Message passing reliability > 99.9%**
- [ ] **Background script performance with message handling**

### User Experience Metrics
- [ ] No user-visible disruption during initialization
- [ ] Settings persist correctly across sessions
- [ ] All features work with default configuration
- [ ] Clear setup guidance for users
- [ ] **Fresh installation experience is smooth**
- [ ] **Extension works immediately after installation**
- [ ] **No performance degradation with new settings system**
- [ ] **Seamless settings synchronization across all components**
- [ ] **User-friendly reconfiguration process**

## 🔮 Future Considerations

### Extensibility
- Easy to add new settings sections
- Support for nested configuration objects
- Plugin-based feature flag system
- Import/export functionality

### Scalability
- Efficient storage usage
- Minimal memory footprint
- Fast startup time
- Support for larger configurations

### Maintenance
- Clear documentation for adding new settings
- Automated migration testing
- Version control for settings schema
- Debug tools for troubleshooting

## 📝 Implementation Checklist

### Pre-Implementation
- [ ] Create backup documentation of current settings structure
- [ ] Set up development environment
- [ ] Create default settings validation
- [ ] Review existing code dependencies

### During Implementation
- [ ] Follow phase-by-phase approach
- [ ] Test each component thoroughly
- [ ] Monitor for any breaking changes
- [ ] Keep documentation updated
- [ ] Prepare user guidance materials

### Post-Implementation
- [ ] Remove all deprecated code
- [ ] Update all documentation
- [ ] Performance monitoring
- [ ] User acceptance testing
- [ ] Prepare migration guide for users

---

**Last Updated**: August 5, 2025
**Version**: 2.0
**Status**: Planning Phase - Fresh Start Strategy

# Nostr-Tools Patching Attempt Summary

## Problem
The `nostr-tools` library uses JavaScript's `URL` constructor which has compatibility issues in React Native environments, specifically:
- `URL.protocol` property is read-only and cannot be modified
- `new URL()` with WebSocket protocols (`wss://`) can fail in React Native's polyfill

## Attempted Solution
We tried patching `nostr-tools@2.19.4` using `patch-package` to replace the `normalizeURL` function with a pure string manipulation version that avoids the `URL` constructor entirely.

### Files Patched
- `lib/esm/pool.js` - Contains inline `normalizeURL` used by `subscribeMany`
- `lib/esm/utils.js` - Contains exported `normalizeURL` function
- `lib/cjs/pool.js` - CommonJS version
- `lib/cjs/utils.js` - CommonJS version

### Patch Applied
The patch replaces the `normalizeURL` implementation with a React Native-compatible version that:
1. Uses pure string manipulation (no `URL` constructor)
2. Handles protocol conversion (http/https → ws/wss)
3. Normalizes paths and ports
4. Validates URLs without browser APIs

## Results
✅ **Patch successfully applied** - `patch-package` confirms patches are applied
✅ **Bundle contains patched code** - Bundle analysis shows patched logic is present
✅ **Wrapper function works** - Our `NostrClient.normalizeRelayUrl()` wrapper successfully normalizes URLs
❌ **Internal calls still fail** - `subscribeMany` → `normalizeURL` still throws "Invalid URL" error

## Root Cause Analysis
Despite the patch being correctly applied and included in the bundle, the error persists. This suggests:
1. The patched code may not be executing correctly in the React Native runtime
2. There may be additional code paths using `URL` constructor that we haven't patched
3. The minified/bundled code may have caching or optimization issues

## Recommendation
Given the complexity and persistent issues with patching JavaScript libraries for React Native compatibility, **migrating to native Rust `nostr-sdk`** (as originally proposed) is the recommended path forward:

1. **Proven Solution** - The `android-balancebridge` app successfully uses Rust `nostr-sdk`
2. **Native Performance** - No JavaScript polyfill issues
3. **Better Long-term** - Native implementation is more maintainable
4. **Full Control** - No dependency on JavaScript library compatibility

## Next Steps
1. Implement React Native bridge for Rust `nostr-sdk` (see `NOSTR_RUST_MIGRATION_PROPOSAL.md`)
2. Replace `nostr-tools` with native Rust implementation
3. Maintain same API surface for `NostrClient` and `BalanceBridge` services


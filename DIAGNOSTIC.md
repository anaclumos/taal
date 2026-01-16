# Trusted Publishing Diagnostic

## Current Error

The v1.1.6 workflow failed with:
```
npm notice Access token expired or revoked. Please try logging in again.
npm error 404 Not Found - PUT https://registry.npmjs.org/@anaclumos%2ftaal - Not found
```

This means OIDC authentication is NOT working. The issue is likely in the npmjs.com configuration.

## Verification Checklist

### 1. Verify Trusted Publisher Configuration

Go to: https://www.npmjs.com/package/@anaclumos/taal/access

Under "Trusted Publisher", you should see:
- ✅ **Provider**: GitHub Actions
- ✅ **Organization or user**: `anaclumos` (EXACTLY - case sensitive)
- ✅ **Repository**: `taal` (EXACTLY - case sensitive)
- ✅ **Workflow filename**: `publish.yml` (EXACTLY - must include .yml extension)
- ✅ **Environment name**: (leave EMPTY unless you use GitHub environments)

**CRITICAL**: All fields are case-sensitive and must match EXACTLY.

### 2. Verify Publishing Access Settings

Still on the same page, under "Publishing Access":

You should have selected: **"Require two-factor authentication and disallow tokens"**

NOT:
- ❌ "Require two-factor authentication or automation tokens"  
- ❌ "No restrictions"

### 3. Verify You Saved

Make sure you clicked **"Update Package Settings"** at the bottom of the page.

### 4. Screenshot

Can you take a screenshot of your npmjs.com package settings and show me?

## Common Mistakes

1. **Workflow filename without .yml extension**: Must be `publish.yml` not just `publish`
2. **Case mismatch**: Repository name must match exactly (`taal` not `Taal` or `TAAL`)
3. **Organization vs user**: Make sure it's your username `anaclumos`, not an organization
4. **Didn't save**: Settings won't take effect until you click "Update Package Settings"
5. **Wrong publishing access setting**: Must select "disallow tokens" to allow OIDC

## Next Steps

1. Double-check ALL settings above
2. Make sure you clicked "Update Package Settings"
3. If everything looks correct, try again:
   ```bash
   npm version patch
   git push --follow-tags
   ```

## Alternative: Use Token (Temporary)

If you want to publish NOW while we debug trusted publishing:

1. Create a Granular Access Token on npmjs.com (Read and write access)
2. Add it as NPM_TOKEN secret:
   ```bash
   gh secret set NPM_TOKEN --body "npm_YOUR_TOKEN_HERE"
   ```
3. Re-run workflow

But trusted publishing is better - let's get it working!

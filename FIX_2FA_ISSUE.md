# FIX: 2FA Blocking Trusted Publishing

## The Problem

Your workflow is failing with:
```
npm error code EOTP
npm error This operation requires a one-time password from your authenticator.
```

This happens because your NPM account requires 2FA for publishing, which blocks OIDC authentication.

## The Solution

You need to **configure your package** to allow trusted publishers to bypass 2FA:

### Step 1: Go to Package Settings

Visit: https://www.npmjs.com/package/@anaclumos/taal/access

### Step 2: Configure Publishing Access

Scroll down to **"Publishing Access"** section.

Select: **"Require two-factor authentication and disallow tokens"**

![Publishing Access Settings](https://docs.npmjs.com/packages-and-modules/securing-your-code/trusted-publisher-security.png)

This option:
- ✅ **Allows** trusted publishers (OIDC) to publish without OTP
- ❌ **Blocks** token-based authentication
- ✅ **Maintains** security through OIDC

### Step 3: Save

Click **"Update Package Settings"** at the bottom.

### Step 4: Test

Re-run the failed workflow:
```bash
cd /Users/cho/Developer/taal
gh run rerun 21076753514
```

Or create a new version:
```bash
npm version patch
git push --follow-tags
```

## Why This Works

When you select "Require two-factor authentication and disallow tokens":
- Traditional token-based publishing is **blocked**
- Trusted publishing via OIDC is **allowed** (no OTP needed)
- Security is **enhanced** (OIDC is more secure than tokens + OTP)

## Alternative (Less Secure)

If the above doesn't work, you can temporarily disable 2FA requirement:

1. Go to: https://www.npmjs.com/package/@anaclumos/taal/access
2. Select: "Require two-factor authentication or automation/integration tokens (recommended)"
3. Save

**Note**: This is less secure. The first option is better.

## Verification

After configuration, the workflow should:
1. ✅ Authenticate via OIDC (no OTP needed)
2. ✅ Generate provenance automatically
3. ✅ Publish successfully

## Troubleshooting

If it still fails:
1. Check that trusted publisher is configured correctly (anaclumos/taal/publish.yml)
2. Verify you saved the "Publishing Access" settings
3. Check workflow logs: `gh run view --log-failed`

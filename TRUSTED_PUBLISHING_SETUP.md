# NPM Trusted Publishing Setup

This project uses **NPM Trusted Publishing** with OIDC authentication - no NPM tokens needed!

## What is Trusted Publishing?

Trusted publishing uses OpenID Connect (OIDC) to authenticate GitHub Actions workflows directly with npm, eliminating the need for long-lived access tokens. This is more secure because:

- No secrets to manage or rotate
- Short-lived, workflow-specific credentials
- Cannot be extracted or reused
- Automatic provenance generation

## Setup Instructions

### Step 1: Configure Trusted Publisher on npmjs.com

1. **Go to your package settings**:
   - Visit: https://www.npmjs.com/package/@anaclumos/taal/access
   - Or navigate to: npmjs.com → Your package → Settings → Publishing Access

2. **Find "Trusted Publisher" section**

3. **Click "GitHub Actions" button**

4. **Fill in the configuration**:
   - **Organization or user**: `anaclumos`
   - **Repository**: `taal`
   - **Workflow filename**: `publish.yml`
   - **Environment name**: (leave empty)

5. **Save the configuration**

### Step 2: Verify Workflow Configuration

The workflow is already configured correctly in `.github/workflows/publish.yml`:

```yaml
permissions:
  id-token: write  # Required for OIDC
  contents: read

- run: npm publish --access public  # No NODE_AUTH_TOKEN needed!
```

### Step 3: Test Publishing

Once you've configured the trusted publisher on npmjs.com:

1. Create a new version tag:
   ```bash
   npm version patch
   git push --follow-tags
   ```

2. GitHub Actions will automatically:
   - Run tests and linter
   - Publish to npm using OIDC
   - Generate provenance attestations

## Troubleshooting

### "Unable to authenticate" error

- Verify the workflow filename matches exactly: `publish.yml`
- Check that all fields are correct (case-sensitive)
- Ensure you're using GitHub-hosted runners (not self-hosted)
- Confirm `id-token: write` permission is set

### Workflow still failing

- Check that you saved the trusted publisher configuration on npmjs.com
- Verify the repository and organization names match exactly
- Review the workflow logs for specific error messages

## Benefits

✅ **No secrets management** - No NPM_TOKEN to rotate or secure  
✅ **Automatic provenance** - Cryptographic proof of package origin  
✅ **Enhanced security** - Short-lived, scoped credentials  
✅ **Simpler workflow** - Less configuration, fewer moving parts  

## Learn More

- [NPM Trusted Publishing Docs](https://docs.npmjs.com/trusted-publishers)
- [GitHub OIDC Documentation](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [NPM Provenance](https://docs.npmjs.com/generating-provenance-statements)

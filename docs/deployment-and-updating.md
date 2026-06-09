# Deployment and updating

## First-time setup for VS Code

1. Install the `vsce` tool:
   ```bash
   npm install -g @vscode/vsce
   ```

2. Create a publisher at https://marketplace.visualstudio.com/manage (sign in with a Microsoft account).

3. Get a Personal Access Token: Azure DevOps → User Settings → Personal access tokens → create one with **Marketplace → Manage** scope.

4. Make sure `package.json` has:
   - `"publisher"` set to your publisher ID (slug, not display name)
   - `"repository"` with the GitHub URL
   - `"version"` following semver (start at `0.1.0`)

5. Add a `.vscodeignore` to exclude dev files from the bundle:
   ```
   .vscode/**
   node_modules/**
   nvim-client/**
   docs/**
   src/**
   tsconfig.json
   *.log
   ```

6. Log in:
   ```bash
   vsce login your-publisher-id
   ```

7. Publish:
   ```bash
   vsce publish
   ```

## Shipping an update

See [versioning.md](versioning.md) for the full versioning model and release flow for both:

- **VS Code Marketplace (`vsce`)**: a manual `vsce publish` (also covers packaging and testing locally before publishing).
- **npm CLI (`shell-language-server`)**: automated by `.github/workflows/release.yml`, which publishes whenever a `v*` tag is pushed.

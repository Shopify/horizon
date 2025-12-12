# Pushing Horizon changes to your Shopify store

Follow these steps to push the current `work` branch to a `dev` branch on your Shopify theme repository and obtain a preview link with the Shopify CLI. Replace placeholders with your values where noted.

## 1. Configure the Git remote

If the `origin` remote has not been configured in this environment yet, add it with your repository URL:

```bash
git remote add origin git@github.com:<org>/<repo>.git
# or
# git remote add origin https://github.com/<org>/<repo>.git
```

You can verify the remote configuration at any time with `git remote -v`.

## 2. Push the local branch to `origin/dev`

From the repository root (`/workspace/horizon`), push your current branch to the remote `dev` branch:

```bash
git push origin work:dev
```

If you plan to continue working on the branch locally, set the upstream for convenience:

```bash
git push --set-upstream origin work
```

## 3. Authenticate the Shopify CLI

Log in to the Shopify CLI using your store domain (`morg-224.myshopify.com`). This requires that you have access to the store and that the CLI is installed locally.

```bash
shopify login --store morg-224.myshopify.com
```

After authentication, the CLI stores your credentials so subsequent commands can run without prompting.

## 4. Generate a preview link

From the theme directory, run the theme development server:

```bash
shopify theme serve --store morg-224.myshopify.com
```

The CLI outputs a public preview URL (and a local tunnel URL). Share this link with collaborators to review the latest changes.

### Troubleshooting tips

- If the CLI reports that your account lacks permissions, confirm that the store owner granted you access to the theme.
- When `shopify theme serve` runs, leave the process active; closing it revokes the preview link.
- Use `shopify theme pull` or `shopify theme push` if you need to sync theme files directly with the store instead of relying on Git.


# Keep Node 22 and the Playwright version selected by frontend/pnpm-lock.yaml.
FROM node:22-bookworm AS node
FROM mcr.microsoft.com/playwright:v1.62.1-noble@sha256:dcc5531e97840b9b5e794f2814476b21571c5124a3fca2267d73041f56e7580e
COPY --from=node /usr/local/ /usr/local/
WORKDIR /workspace/frontend
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@11.15.1 --activate \
    && pnpm install --frozen-lockfile \
    && node -e "if (require('@playwright/test/package.json').version !== '1.62.1') throw new Error('Update the pinned Playwright image to match the lockfile')"
COPY frontend/ ./
COPY scripts/ci/frontend.sh /workspace/scripts/ci/frontend.sh
ENV CI=true
CMD ["bash", "/workspace/scripts/ci/frontend.sh"]

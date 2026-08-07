# syntax=docker/dockerfile:1

# Edge images are built by GitHub Actions from the develop checkout.
# Supervisor consumes one published multi-architecture manifest from config.yaml.
FROM python:3.12-slim AS builder
WORKDIR /src
COPY . /src

RUN apt-get update \
    && apt-get install --no-install-recommends -y build-essential libffi-dev \
    && rm -rf /var/lib/apt/lists/*
RUN python -m pip wheel --no-cache-dir --wheel-dir /wheels /src

FROM --platform=$BUILDPLATFORM node:22-alpine AS ui-builder
COPY frontend /frontend
WORKDIR /frontend
RUN corepack enable \
    && corepack pnpm install --frozen-lockfile \
    && corepack pnpm run check \
    && corepack pnpm run check:storybook \
    && corepack pnpm run test:runtime \
    && corepack pnpm run test:architecture \
    && corepack pnpm run test:ux \
    && corepack pnpm run build \
    && corepack pnpm run storybook:build

FROM python:3.12-slim
ARG BUILD_VERSION=edge
LABEL io.hass.version="${BUILD_VERSION}" \
      io.hass.type="app"
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    GATEWAY_DATA_DIR=/data \
    GATEWAY_HOST=0.0.0.0 \
    GATEWAY_PORT=8099 \
    GATEWAY_OPERATOR_ENABLED=false

COPY --from=builder /wheels /wheels
COPY --from=ui-builder /frontend/dist /app/static
COPY --from=ui-builder /frontend/storybook-static /app/catalog
RUN python -m pip install --no-cache-dir --no-index --find-links=/wheels /wheels/*.whl \
    && rm -rf /wheels
COPY addon-edge/run.sh /run.sh
RUN chmod 0755 /run.sh

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8099/health', timeout=3)"

ENTRYPOINT ["/run.sh"]

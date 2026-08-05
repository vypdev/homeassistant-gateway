# syntax=docker/dockerfile:1

# Edge intentionally builds from the development branch during installation.
# Unlike the stable app, it does not use a published image.
FROM python:3.12-slim AS builder
ARG GATEWAY_REPOSITORY=https://github.com/vypdev/homeassistant-gateway.git
ARG GATEWAY_REF=develop

RUN apt-get update \
    && apt-get install --no-install-recommends -y build-essential git libffi-dev \
    && rm -rf /var/lib/apt/lists/*
RUN git init /src \
    && cd /src \
    && git remote add origin "${GATEWAY_REPOSITORY}" \
    && git fetch --depth 1 origin "${GATEWAY_REF}" \
    && git checkout FETCH_HEAD
RUN python -m pip wheel --no-cache-dir --wheel-dir /wheels /src

FROM --platform=$BUILDPLATFORM node:22-alpine AS ui-builder
COPY --from=builder /src/frontend /frontend
WORKDIR /frontend
RUN corepack enable \
    && corepack pnpm install --frozen-lockfile \
    && corepack pnpm run check \
    && corepack pnpm run test:runtime \
    && corepack pnpm run test:architecture \
    && corepack pnpm run test:ux \
    && corepack pnpm run build

FROM python:3.12-slim
ARG BUILD_VERSION=0.5.31-dev.1
ARG BUILD_ARCH=amd64
LABEL io.hass.version="${BUILD_VERSION}" \
      io.hass.type="app" \
      io.hass.arch="${BUILD_ARCH}"
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    GATEWAY_DATA_DIR=/data \
    GATEWAY_HOST=0.0.0.0 \
    GATEWAY_PORT=8099 \
    GATEWAY_OPERATOR_ENABLED=false

COPY --from=builder /wheels /wheels
COPY --from=ui-builder /frontend/dist /app/static
RUN python -m pip install --no-cache-dir --no-index --find-links=/wheels /wheels/*.whl \
    && rm -rf /wheels
COPY run.sh /run.sh
RUN chmod 0755 /run.sh

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8099/health', timeout=3)"

ENTRYPOINT ["/run.sh"]

"""Verify immutable public GHCR images before publishing or completing a retry."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import re
from urllib.parse import urlsplit

import httpx

from scripts.prepare_release import version_tuple


ACCEPT = ', '.join([
    'application/vnd.oci.image.index.v1+json',
    'application/vnd.docker.distribution.manifest.list.v2+json',
    'application/vnd.oci.image.manifest.v1+json',
    'application/vnd.docker.distribution.manifest.v2+json',
])
PLATFORMS = {('linux', 'amd64', ''), ('linux', 'arm64', ''), ('linux', 'arm', 'v7')}


class RegistryVerificationError(ValueError):
    pass


def response_json(response: httpx.Response) -> dict:
    if response.status_code != 200:
        raise RegistryVerificationError('Stable image registry could not be verified.')
    body = bytearray()
    for chunk in response.iter_bytes():
        body.extend(chunk)
        if len(body) > 1024 * 1024:
            raise RegistryVerificationError('Stable image registry response is unsupported.')
    data = json.loads(body)
    if not isinstance(data, dict):
        raise RegistryVerificationError('Stable image registry response is unsupported.')
    return data


def registry_json(client: httpx.Client, path: str, *, token: str = '', missing=False,
                  params: dict | None = None) -> dict | None:
    headers = {'Accept': ACCEPT}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    try:
        with client.stream('GET', 'https://ghcr.io' + path, headers=headers, params=params,
                           timeout=20, follow_redirects=False) as response:
            if missing and response.status_code == 404:
                return None
            if response.status_code == 307 and '/blobs/sha256:' in path:
                location = response.headers.get('Location', '')
                try:
                    target = urlsplit(location)
                    port = target.port
                except ValueError:
                    raise RegistryVerificationError('Stable image registry redirect is unsupported.') from None
                if (len(location) > 16384 or target.scheme != 'https'
                    or target.hostname != 'pkg-containers.githubusercontent.com'
                    or target.username is not None or target.password is not None
                    or port not in (None, 443) or target.fragment
                    or any(ord(c) < 32 for c in location)):
                    raise RegistryVerificationError('Stable image registry redirect is unsupported.')
                # Public signed blob URLs receive no registry credential; permit one fixed CDN hop.
                with client.stream('GET', location, headers={'Accept': ACCEPT}, timeout=20,
                                   follow_redirects=False) as blob:
                    return response_json(blob)
            return response_json(response)
    except (httpx.HTTPError, json.JSONDecodeError, UnicodeDecodeError):
        raise RegistryVerificationError('Stable image registry could not be verified.') from None


def digest(value: object) -> str:
    if not isinstance(value, str) or not re.fullmatch(r'sha256:[a-f0-9]{64}', value):
        raise RegistryVerificationError('Stable image digest is unsupported.')
    return value


def inspect_image(client: httpx.Client, repository: str, version: str, revision: str) -> bool:
    version_tuple(version)
    if not re.fullmatch(r'[a-z0-9][a-z0-9_.-]*/[a-z0-9][a-z0-9_.-]*', repository):
        raise RegistryVerificationError('Stable image repository is unsupported.')
    if not re.fullmatch(r'[a-f0-9]{40}', revision):
        raise RegistryVerificationError('Stable image source revision is unsupported.')
    auth = registry_json(client, '/token', params={'service': 'ghcr.io', 'scope': f'repository:{repository}:pull'})
    token = auth.get('token') if auth else None
    if not isinstance(token, str) or not 1 <= len(token) <= 10000:
        raise RegistryVerificationError('Stable image registry could not be verified.')
    base = f'/v2/{repository}'
    manifest = registry_json(client, f'{base}/manifests/{version}', token=token, missing=True)
    if manifest is None:
        return False
    entries = manifest.get('manifests')
    if not isinstance(entries, list) or not 1 <= len(entries) <= 20:
        raise RegistryVerificationError('Stable image platforms are incomplete or unsupported.')
    verified = set()
    for entry in entries:
        if not isinstance(entry, dict) or not isinstance(entry.get('platform'), dict):
            raise RegistryVerificationError('Stable image platform metadata is unsupported.')
        platform = entry['platform']
        if any(not isinstance(platform.get(key, ''), str) for key in ['os', 'architecture', 'variant']):
            raise RegistryVerificationError('Stable image platform metadata is unsupported.')
        identity = (platform.get('os'), platform.get('architecture'), platform.get('variant', ''))
        # OCI arm64/v8 and an omitted arm64 variant name the same supported platform.
        if identity == ('linux', 'arm64', 'v8'):
            identity = ('linux', 'arm64', '')
        if identity not in PLATFORMS:
            continue
        if identity in verified:
            raise RegistryVerificationError('Stable image platform metadata is ambiguous.')
        child = registry_json(client, f'{base}/manifests/{digest(entry.get("digest"))}', token=token)
        config_descriptor = child.get('config') if child else None
        if not isinstance(config_descriptor, dict):
            raise RegistryVerificationError('Stable image configuration is unsupported.')
        config = registry_json(client, f'{base}/blobs/{digest(config_descriptor.get("digest"))}', token=token)
        image_config = config.get('config') if config else None
        labels = image_config.get('Labels') if isinstance(image_config, dict) else None
        if not isinstance(labels, dict) or labels.get('org.opencontainers.image.revision') != revision:
            raise RegistryVerificationError('Published stable version does not match the accepted source.')
        verified.add(identity)
    if verified != PLATFORMS:
        raise RegistryVerificationError('Stable image platforms are incomplete or unsupported.')
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--require-existing', action='store_true')
    args = parser.parse_args()
    try:
        with httpx.Client() as client:
            exists = inspect_image(client, os.environ.get('GITHUB_REPOSITORY', '').lower(),
                                   os.environ.get('RELEASE_VERSION', ''), os.environ.get('PRODUCTION_SHA', ''))
        if args.require_existing and not exists:
            raise RegistryVerificationError('Stable image has not been published.')
        if output := os.environ.get('GITHUB_OUTPUT'):
            with Path(output).open('a') as handle:
                handle.write(f'exists={str(exists).lower()}\n')
    except (ValueError, OSError):
        print('Stable image verification failed; inspect registry access, platforms and accepted source.')
        return 1
    print('Existing stable image verified.' if exists else 'Stable image version is available for publication.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

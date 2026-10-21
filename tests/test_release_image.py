import httpx
import pytest

from scripts.release_image import RegistryVerificationError, inspect_image


REVISION = 'a' * 40
PLATFORMS = [('amd64', None), ('arm64', None), ('arm', 'v7')]


def registry(*, status=200, revision=REVISION, platforms=3, bad_digest=False):
    def handle(request: httpx.Request) -> httpx.Response:
        if request.url.path == '/token':
            return httpx.Response(200, json={'token': 'fixture-registry-credential'})
        if request.url.path.endswith('/manifests/0.5.36'):
            if status != 200:
                return httpx.Response(status, text='provider detail must not be disclosed')
            return httpx.Response(200, json={'manifests': [
                {'digest': 'unsafe' if bad_digest else 'sha256:' + str(i + 1) * 64,
                 'platform': {'os': 'linux', 'architecture': arch, **({'variant': variant} if variant else {})}}
                for i, (arch, variant) in enumerate(PLATFORMS[:platforms])
            ]})
        if '/manifests/sha256:' in request.url.path:
            return httpx.Response(200, json={'config': {'digest': 'sha256:' + 'f' * 64}})
        if '/blobs/sha256:' in request.url.path:
            return httpx.Response(200, json={'config': {'Labels': {'org.opencontainers.image.revision': revision}}})
        raise AssertionError('Unexpected registry route')
    return httpx.Client(transport=httpx.MockTransport(handle))


def test_missing_version_can_be_built() -> None:
    with registry(status=404) as client:
        assert inspect_image(client, 'vypdev/homeassistant-gateway', '0.5.36', REVISION) is False


def test_verified_existing_version_is_reused() -> None:
    with registry() as client:
        assert inspect_image(client, 'vypdev/homeassistant-gateway', '0.5.36', REVISION) is True


@pytest.mark.parametrize('status', [401, 403, 429, 500])
def test_registry_errors_do_not_authorize_overwriting(status: int) -> None:
    with registry(status=status) as client:
        with pytest.raises(RegistryVerificationError) as error:
            inspect_image(client, 'vypdev/homeassistant-gateway', '0.5.36', REVISION)
    assert 'provider detail' not in str(error.value)
    assert 'fixture-registry-credential' not in str(error.value)


def test_existing_version_from_another_commit_cannot_be_overwritten() -> None:
    with registry(revision='b' * 40) as client:
        with pytest.raises(RegistryVerificationError):
            inspect_image(client, 'vypdev/homeassistant-gateway', '0.5.36', REVISION)


def test_partial_platform_publication_is_not_complete() -> None:
    with registry(platforms=2) as client:
        with pytest.raises(RegistryVerificationError):
            inspect_image(client, 'vypdev/homeassistant-gateway', '0.5.36', REVISION)


def test_registry_digest_cannot_redirect_a_request() -> None:
    with registry(bad_digest=True) as client:
        with pytest.raises(RegistryVerificationError):
            inspect_image(client, 'vypdev/homeassistant-gateway', '0.5.36', REVISION)


def test_transport_errors_have_sanitized_diagnostics() -> None:
    def fail(request):
        raise httpx.ConnectError('fixture-registry-credential', request=request)
    with httpx.Client(transport=httpx.MockTransport(fail)) as client:
        with pytest.raises(RegistryVerificationError) as error:
            inspect_image(client, 'vypdev/homeassistant-gateway', '0.5.36', REVISION)
    assert str(error.value) == 'Stable image registry could not be verified.'


@pytest.mark.parametrize('host', ['pkg-containers.githubusercontent.com', 'untrusted.invalid'])
def test_blob_redirects_are_bounded_and_strip_registry_credentials(host: str) -> None:
    from scripts.release_image import registry_json

    def handle(request):
        if request.url.host == 'ghcr.io':
            return httpx.Response(307, headers={'Location': f'https://{host}/fixture'})
        assert request.url.host == 'pkg-containers.githubusercontent.com'
        assert 'Authorization' not in request.headers
        return httpx.Response(200, json={'config': {'Labels': {}}})
    with httpx.Client(transport=httpx.MockTransport(handle)) as client:
        if host == 'untrusted.invalid':
            with pytest.raises(RegistryVerificationError):
                registry_json(client, '/v2/owner/image/blobs/sha256:' + 'a' * 64, token='fixture-credential')
        else:
            assert registry_json(client, '/v2/owner/image/blobs/sha256:' + 'a' * 64, token='fixture-credential') == {'config': {'Labels': {}}}


@pytest.mark.parametrize('repository,version,revision', [
    ('../outside/image', '0.5.36', REVISION),
    ('vypdev/homeassistant-gateway', 'v0.5.36', REVISION),
    ('vypdev/homeassistant-gateway', '0.5.36', 'invalid'),
])
def test_invalid_identity_is_rejected_before_registry_access(repository, version, revision) -> None:
    def unexpected(request):
        raise AssertionError('Invalid identities must not access the registry')
    with httpx.Client(transport=httpx.MockTransport(unexpected)) as client:
        with pytest.raises(ValueError):
            inspect_image(client, repository, version, revision)


@pytest.mark.parametrize('body', ['not JSON fixture-credential', 'x' * (1024 * 1024 + 1)])
def test_provider_responses_are_bounded_and_sanitized(body: str) -> None:
    from scripts.release_image import registry_json
    with httpx.Client(transport=httpx.MockTransport(lambda _: httpx.Response(200, text=body))) as client:
        with pytest.raises(RegistryVerificationError) as error:
            registry_json(client, '/token')
    assert 'fixture-credential' not in str(error.value)


def test_redirect_with_malformed_port_has_a_sanitized_error() -> None:
    from scripts.release_image import registry_json
    response = httpx.Response(307, headers={'Location': 'https://pkg-containers.githubusercontent.com:fixture-credential/blob'})
    with httpx.Client(transport=httpx.MockTransport(lambda _: response)) as client:
        with pytest.raises(RegistryVerificationError) as error:
            registry_json(client, '/v2/owner/image/blobs/sha256:' + 'a' * 64)
    assert 'fixture-credential' not in str(error.value)

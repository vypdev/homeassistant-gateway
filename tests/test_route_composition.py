from tests.test_http_api import FakeHomeAssistant, make_app


def route_signatures(app):
    return {
        (method, route.path)
        for route in app.routes
        if hasattr(route, "methods")
        for method in route.methods
        if method not in {"HEAD", "OPTIONS"}
    }


def test_route_groups_are_composed_once_with_expected_contracts():
    signatures = route_signatures(make_app(home_assistant=FakeHomeAssistant()))

    expected = {
        ("GET", "/health"),
        ("GET", "/ready"),
        ("GET", "/api/health/details"),
        ("GET", "/api/ui/context"),
        ("GET", "/api/clients"),
        ("POST", "/api/clients"),
        ("GET", "/api/development/catalog"),
        ("POST", "/api/development/run"),
        ("GET", "/api/development/jobs/{job_id}"),
        ("GET", "/api/audit"),
        ("GET", "/api/mcp/discovery"),
        ("POST", "/api/policy/evaluate"),
    }
    assert expected <= signatures

    normalized = [(method, path.rstrip("/") or "/") for method, path in signatures]
    assert len(normalized) == len(set(normalized))

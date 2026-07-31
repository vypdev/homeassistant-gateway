from homeassistant_gateway.domain.policy import (
    ClientPolicy,
    Decision,
    PolicyEngine,
    PolicyRequest,
    Profile,
)


def test_observer_can_read_but_cannot_mutate() -> None:
    engine = PolicyEngine(
        operator_enabled=False,
        clients={
            "openclaw-observer": ClientPolicy(
                profile=Profile.OBSERVER,
                capabilities=frozenset({"ha.read.states"}),
            )
        },
    )

    assert engine.evaluate(
        PolicyRequest("openclaw-observer", "ha.read.states", mutation=False)
    ).decision is Decision.ALLOWED
    assert engine.evaluate(
        PolicyRequest("openclaw-observer", "ha.operator.service_call", mutation=True)
    ).decision is Decision.DENIED


def test_unknown_capability_is_denied_even_for_operator() -> None:
    engine = PolicyEngine(
        operator_enabled=True,
        clients={
            "operator": ClientPolicy(
                profile=Profile.OPERATOR,
                capabilities=frozenset({"ha.operator.service_call"}),
            )
        },
    )

    result = engine.evaluate(
        PolicyRequest("operator", "ha.operator.unknown", mutation=True)
    )

    assert result.decision is Decision.DENIED
    assert result.reason == "capability_not_granted"


def test_operator_mutation_requires_approval() -> None:
    engine = PolicyEngine(
        operator_enabled=True,
        clients={
            "operator": ClientPolicy(
                profile=Profile.OPERATOR,
                capabilities=frozenset({"ha.operator.service_call"}),
            )
        },
    )

    result = engine.evaluate(
        PolicyRequest("operator", "ha.operator.service_call", mutation=True)
    )

    assert result.decision is Decision.APPROVAL_REQUIRED


def test_operator_is_denied_when_globally_disabled() -> None:
    engine = PolicyEngine(
        operator_enabled=False,
        clients={
            "operator": ClientPolicy(
                profile=Profile.OPERATOR,
                capabilities=frozenset({"ha.operator.service_call"}),
            )
        },
    )

    result = engine.evaluate(
        PolicyRequest("operator", "ha.operator.service_call", mutation=True)
    )

    assert result.decision is Decision.DENIED
    assert result.reason == "operator_disabled"

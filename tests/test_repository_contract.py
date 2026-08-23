from __future__ import annotations

import ast
from pathlib import Path

ROOT = Path(__file__).parents[1]
SOURCE_ROOT = ROOT / "src" / "homeassistant_gateway"


def _production_module_graph() -> dict[str, set[str]]:
    modules = {
        path.relative_to(SOURCE_ROOT).with_suffix("").as_posix().replace("/", ".")
        for path in SOURCE_ROOT.rglob("*.py")
    }
    graph = {module: set() for module in modules}
    for path in SOURCE_ROOT.rglob("*.py"):
        module = path.relative_to(SOURCE_ROOT).with_suffix("").as_posix().replace("/", ".")
        if module.endswith(".__init__"):
            module = module[:-9]
        tree = ast.parse(path.read_text())
        for node in ast.walk(tree):
            imported: list[str] = []
            if isinstance(node, ast.Import):
                imported = [alias.name for alias in node.names]
            elif isinstance(node, ast.ImportFrom) and node.module and node.level == 0:
                imported = [node.module]
            for name in imported:
                prefix = "homeassistant_gateway."
                if not name.startswith(prefix):
                    continue
                target = name.removeprefix(prefix)
                graph[module].update(
                    candidate
                    for candidate in modules
                    if candidate == target or candidate.startswith(f"{target}.")
                )
    return graph


def _directed_cycles(graph: dict[str, set[str]]) -> list[set[str]]:
    index = 0
    indices: dict[str, int] = {}
    lowlinks: dict[str, int] = {}
    stack: list[str] = []
    on_stack: set[str] = set()
    components: list[set[str]] = []

    def visit(node: str) -> None:
        nonlocal index
        indices[node] = index
        lowlinks[node] = index
        index += 1
        stack.append(node)
        on_stack.add(node)
        for dependency in graph[node]:
            if dependency not in indices:
                visit(dependency)
                lowlinks[node] = min(lowlinks[node], lowlinks[dependency])
            elif dependency in on_stack:
                lowlinks[node] = min(lowlinks[node], indices[dependency])
        if lowlinks[node] != indices[node]:
            return
        component: set[str] = set()
        while True:
            member = stack.pop()
            on_stack.remove(member)
            component.add(member)
            if member == node:
                break
        if len(component) > 1:
            components.append(component)

    for node in graph:
        if node not in indices:
            visit(node)
    return components


def test_production_imports_have_no_directed_cycles() -> None:
    cycles = _directed_cycles(_production_module_graph())
    assert cycles == []


def test_security_contract_exists() -> None:
    text = (ROOT / "docs" / "security-model.md").read_text()
    assert "Observer (default)" in text
    assert "Operator (explicit)" in text
    assert "No Docker socket" in text


def test_operator_is_not_enabled_by_default() -> None:
    text = (ROOT / "README.md").read_text()
    assert "Stable defaults to observer/read-only operation" in text
    assert "explicitly enabled" in text



def test_architecture_keeps_home_assistant_as_first_deployment_target() -> None:
    text = (ROOT / "docs" / "architecture.md").read_text()
    assert "Primary: Home Assistant App" in text
    assert "companion custom integration" in text


def test_app_does_not_map_the_raw_home_assistant_config_directory() -> None:
    text = (ROOT / "addon" / "config.yaml").read_text()
    assert "homeassistant_api: true" in text
    assert "- data:rw" in text
    assert "/config" not in text
    assert "secrets.yaml" not in text
    assert ".storage" not in text


def test_automation_mutation_is_explicitly_not_assumed() -> None:
    text = (ROOT / "docs" / "home-assistant-platform-contracts.md").read_text()
    assert "must not blindly rewrite YAML" in text
    assert "unsupported-operation" in text

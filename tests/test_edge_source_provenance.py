from __future__ import annotations

import os
import subprocess
from pathlib import Path

import yaml


def test_edge_provenance_uses_the_checked_out_head_instead_of_the_event_sha(tmp_path):
    workflow = yaml.safe_load((Path(__file__).parents[1] / ".github/workflows/edge-app.yml").read_text())
    steps = workflow["jobs"]["build-and-publish"]["steps"]
    output_step = next(step for step in steps if step.get("id") == "edge-version")
    config = tmp_path / "addon-edge/config.yaml"
    config.parent.mkdir()
    config.write_text('version: "0.0.0-fixture"\n')
    env = {"PATH": os.defpath, "HOME": str(tmp_path), "TMPDIR": str(tmp_path), "GITHUB_OUTPUT": str(tmp_path / "outputs"), "GITHUB_SHA": "0" * 40}
    def git(*args):
        return subprocess.check_output(["git", *args], cwd=tmp_path, env=env, text=True).strip()
    git("init", "-q")
    git("add", "addon-edge/config.yaml")
    git("-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false", "-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qm", "fixture")
    checkout_sha = git("rev-parse", "HEAD")
    subprocess.run(["bash", "-e", "-o", "pipefail", "-c", output_step["run"]], cwd=tmp_path, env=env, check=True, capture_output=True, text=True, timeout=10)
    outputs = dict(line.split("=", 1) for line in (tmp_path / "outputs").read_text().splitlines())
    assert outputs["version"] == "0.0.0-fixture"
    assert outputs["source_sha"] == checkout_sha and checkout_sha != env["GITHUB_SHA"]
    publish = next(step for step in steps if step.get("name") == "Build and publish Edge image")["with"]
    assert "edge-${{ steps.edge-version.outputs.source_sha }}" in publish["tags"]
    assert "org.opencontainers.image.revision=${{ steps.edge-version.outputs.source_sha }}" in publish["labels"]

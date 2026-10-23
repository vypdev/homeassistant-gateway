from __future__ import annotations

import json
import os
import subprocess
import sys
import sysconfig
from pathlib import Path

import pytest
import yaml

ROOT = Path(__file__).parents[1]
JOBS = yaml.safe_load((ROOT / ".github/workflows/copilot_credential_health.yml").read_text())["jobs"]
PROVIDERS = [
    ("pat", "PAT", "api.github.com/user", 2),
    ("openai", "OPENAI_API_KEY", "api.openai.com/v1/models", 1),
    ("anthropic", "ANTHROPIC_API_KEY", "api.anthropic.com/v1/models", 1),
    ("google", "GOOGLE_API_KEY", "generativelanguage.googleapis.com/v1beta/models", 1),
    ("openrouter", "OPENROUTER_API_KEY", "openrouter.ai/api/v1/key", 1),
    ("cursor", "CURSOR_API_KEY", "api.cursor.com/analytics/ai-code/changes", 1),
    ("opencode", "OPENCODE_API_KEY", "opencode.ai/zen/v1/models", 1),
    ("codex", "CODEX_API_KEY", "api.openai.com/v1/models", 1),
]


def run_probe(tmp_path, provider, name, credential, status="200", exit_code="0", error=""):
    fake_bin = tmp_path / "bin"
    fake_bin.mkdir()
    capture = tmp_path / "calls.jsonl"
    error_file = tmp_path / "curl-error.txt"
    error_file.write_text(error)
    fake_curl = fake_bin / "curl"
    fake_curl.write_text(f"#!{sys.executable}\n" + '''import json, os, pathlib, sys
with pathlib.Path(os.environ["CURL_CAPTURE"]).open("a") as output:
    output.write(json.dumps({"args": sys.argv[1:], "env": dict(os.environ), "config": sys.stdin.read()}) + "\\n")
sys.stderr.write(pathlib.Path(os.environ["CURL_ERROR_FILE"]).read_text())
print(os.environ["CURL_STATUS"], end="")
raise SystemExit(int(os.environ["CURL_EXIT"]))
''')
    fake_curl.chmod(0o755)
    # Deliberately do not copy the agent/CI environment or any real credentials.
    env = {"PATH": str(fake_bin) + os.pathsep + os.defpath, "HOME": str(tmp_path),
           "CHECK_PROVIDER": provider, "GITHUB_REPOSITORY": "owner/repository",
           "CURL_CAPTURE": str(capture), "CURL_ERROR_FILE": str(error_file),
           "CURL_STATUS": status, "CURL_EXIT": exit_code, name: credential}
    # setup-python CPython on Linux needs its own libpython directory even
    # when the fixture environment deliberately excludes agent/CI variables.
    if sys.platform.startswith("linux") and (library_dir := sysconfig.get_config_var("LIBDIR")):
        env["LD_LIBRARY_PATH"] = library_dir
    job = "verify-codex-api-key" if provider == "codex" else "verify-" + provider
    script = JOBS[job]["steps"][0]["run"]
    result = subprocess.run(["bash", "-c", script], env=env, capture_output=True, text=True, timeout=10)
    calls = [json.loads(line) for line in capture.read_text().splitlines()] if capture.exists() else []
    return result, calls


@pytest.mark.parametrize("provider,name,url,count", PROVIDERS)
def test_probes_keep_credentials_out_of_arguments_and_child_environment(tmp_path, provider, name, url, count):
    secret = "fixture-only-api-key"
    result, calls = run_probe(tmp_path, provider, name, secret)
    assert result.returncode == 0, result.stderr
    assert len(calls) == count and url in calls[0]["config"]
    for call in calls:
        assert secret not in " ".join(call["args"])
        assert secret not in call["env"].values()
        assert secret in call["config"]
        assert call["args"][call["args"].index("--max-time") + 1] == "20"
        assert "--disable" in call["args"] and "--location" not in call["args"]
    if provider == "google":
        assert "x-goog-api-key" in calls[0]["config"] and "?key=" not in calls[0]["config"]


@pytest.mark.parametrize("credential", ["", "fixture-key\nInjected: header"])
def test_missing_or_multiline_credentials_never_reach_curl(tmp_path, credential):
    result, calls = run_probe(tmp_path, "openai", "OPENAI_API_KEY", credential)
    assert result.returncode != 0 and not calls


def test_probe_rejects_redirect_status(tmp_path):
    result, _ = run_probe(tmp_path, "openai", "OPENAI_API_KEY", "fixture-only-key", status="302")
    assert result.returncode != 0


def test_probe_sanitizes_curl_failure_output(tmp_path):
    secret = "fixture-secret-in-error"
    result, _ = run_probe(tmp_path, "openai", "OPENAI_API_KEY", secret, exit_code="28", error=secret)
    assert result.returncode != 0
    assert secret not in result.stdout + result.stderr


def test_probe_escapes_config_without_executing_credential_text(tmp_path):
    secret = 'fixture"key\\$(touch should-not-exist)'
    result, calls = run_probe(tmp_path, "openai", "OPENAI_API_KEY", secret)
    assert result.returncode == 0 and not (ROOT / "should-not-exist").exists()
    assert secret.replace("\\", "\\\\").replace('"', '\\"') in calls[0]["config"]

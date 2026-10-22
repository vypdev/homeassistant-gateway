# Gateway verification dependencies

This project-owned composite prepares Python 3.11, an isolated virtual environment
with the candidate's test dependencies, Node 22 and pnpm 11.15.1. Frontend packages
come from `frontend/pnpm-lock.yaml` with `--frozen-lockfile`.

Copilot 3.10.0 runs the action from trusted `master` before each configured real
verification command. Every command has a fresh private HOME; the Python environment
and pnpm installation stay inside it. The setup exports tools through `GITHUB_PATH`;
it does not need the bot PAT, model credentials, live Home Assistant, or production
configuration. Keep the action and `.copilot/verification-prerequisites.json` aligned
with the runtimes used by CI. External native libraries and Docker remain runner
prerequisites when the selected verification command requires them.

The CI job `Copilot verification dependencies` exercises this action with a fresh
HOME and the configured backend/frontend verification commands. The native setup
step has a five-minute budget; installing dependencies does not replace the tests.

Enable only after the action has been reviewed, CI passed, and this PR merged to
`master`:

```sh
gh variable set VERIFICATION_SETUP --repo vypdev/homeassistant-gateway --body true
```

To disable the optional setup while investigating a failure:

```sh
gh variable set VERIFICATION_SETUP --repo vypdev/homeassistant-gateway --body false
```

Future Copilot upgrades preserve this action and its assets. The local Copilot CLI
cannot execute composite actions while the flag is enabled; run real verification
operations through the installed GitHub workflows.

# Integration / coordination workspace

You are operating in the **integration** workspace for the `tazimagumi_dev_team` parallel-session setup.

## Role
This worktree is for cross-cutting work, merge resolution, and integrating the three parallel branches into `develop`. Avoid feature-level edits that belong to a lane below — delegate those to the appropriate parallel session.

## Active parallel worktrees
| Lane     | Path                                | Branch              | Owns         |
|----------|-------------------------------------|---------------------|--------------|
| frontend | `..\tazimagumi_dev_team.frontend`   | `parallel/frontend` | `frontend/`  |
| backend  | `..\tazimagumi_dev_team.backend`    | `parallel/backend`  | `backend/`   |
| docs     | `..\tazimagumi_dev_team.docs`       | `parallel/docs`     | `docs/`, `README.md` |

## Sync workflow
1. Each parallel session commits to its branch.
2. Push to remote → open PR into `develop`.
3. This session merges PRs, resolves conflicts, then each parallel branch rebases/merges from updated `develop`.

## Shared-file policy
Root-level config (`package.json`, `tsconfig.json`, `.gitignore`, this file) is owned by this integration workspace. Parallel sessions should request changes here rather than edit directly.

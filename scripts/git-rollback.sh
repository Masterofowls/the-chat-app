#!/usr/bin/env bash
set -euo pipefail
# Restore the previous commit on the current branch. Does not force-push.
git reflog
echo "To move HEAD back one commit: git reset --soft HEAD~1"

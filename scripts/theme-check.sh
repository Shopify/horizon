#!/usr/bin/env bash
set -euo pipefail
export PATH="/opt/homebrew/opt/ruby@3.2/bin:$HOME/.gem/ruby/3.2.0/bin:$PATH"
exec bundle exec theme-check --fail-level error "$@"

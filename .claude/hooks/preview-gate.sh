#!/bin/sh
# preview-gate.sh — Stop hook. If this branch or working tree touches
# anything rendered and no dev server is serving this worktree, start one
# and block the turn once so the agent reports the URL and worktree path.
# Enforces the convention in CLAUDE.md (issue #25).
#
# Runs in every worktree independently: the pid/port live under
# <root>/.claude/preview/ (gitignored), so each worktree gets its own server.
#
# Env for tests: PREVIEW_GATE_CMD overrides the server command (must accept
# a port as $1 and keep running), PREVIEW_GATE_WAIT the seconds to wait for it.

set -u
input=$(cat)
case "$input" in *'"stop_hook_active"'*'true'*) exit 0 ;; esac

root=${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)} || exit 0
[ -n "$root" ] && cd "$root" || exit 0

# --- 1. did anything rendered change on this branch? ------------------------
base=$(git merge-base HEAD origin/main 2>/dev/null || git merge-base HEAD main 2>/dev/null)
changed=$( {
  [ -n "$base" ] && git diff --name-only "$base" HEAD
  git diff --name-only HEAD
  git ls-files --others --exclude-standard
} 2>/dev/null | sort -u | grep -E '^(src/|public/|index\.html$|vite\.config\.)' )
[ -z "$changed" ] && exit 0

# --- 2. is a server already serving this worktree? --------------------------
dir=$root/.claude/preview
mkdir -p "$dir"
pid=$(cat "$dir/pid" 2>/dev/null || true)
port=$(cat "$dir/port" 2>/dev/null || true)
alive() { [ -n "$1" ] && kill -0 "$1" 2>/dev/null; }
listening() { [ -n "$1" ] && node -e '
  const s=require("net").connect(+process.argv[1],"127.0.0.1");
  s.on("connect",()=>{s.end();process.exit(0)}).on("error",()=>process.exit(1))' "$1" 2>/dev/null; }
# pid actually holding a port, not whatever pid we happened to record (npm's
# pid, not its vite child's) — best-effort, needs ss or lsof.
port_pid() {
  [ -n "${1:-}" ] || return 0
  if command -v ss >/dev/null 2>&1; then
    ss -ltnp "sport = :$1" 2>/dev/null | sed -n 's/.*pid=\([0-9][0-9]*\).*/\1/p' | head -n1
  elif command -v lsof >/dev/null 2>&1; then
    lsof -ti tcp:"$1" -sTCP:LISTEN 2>/dev/null | head -n1
  fi
}
if alive "$pid" && listening "$port"; then exit 0; fi
# alive but not listening (hung, mid-crash): kill it so step 3 does not leak it
alive "$pid" && kill "$pid" 2>/dev/null
# the recorded pid may not be the process actually bound to the port (npm vs.
# its vite child) — find and kill that one too, then confirm the port is
# actually free before starting a new server on a fresh one. A silent skip
# here is exactly the leak from issue #148: a stale server keeps serving a
# stale bundle at the old URL while a second one starts on a new port.
held_pid=$(port_pid "$port")
[ -n "$held_pid" ] && kill "$held_pid" 2>/dev/null
if [ -n "$port" ]; then
  i=0; freewait=${PREVIEW_GATE_WAIT:-20}
  while [ "$i" -lt "$freewait" ] && listening "$port"; do sleep 1; i=$((i+1)); done
  if listening "$port"; then
    printf '%s\n' "{\"decision\":\"block\",\"reason\":\"preview-gate.sh: port $port is still held (recorded pid $pid, actual holder $(port_pid "$port")) after killing both. Kill it by hand (fuser -k $port/tcp) before restarting, and tell the user.\"}"
    exit 0
  fi
fi

# --- 3. start one -----------------------------------------------------------
port=$(node -e '
  const s=require("net").createServer();
  s.listen(0,"127.0.0.1",()=>{console.log(s.address().port);s.close()})' 2>/dev/null)
[ -z "$port" ] && { printf '%s\n' '{"decision":"block","reason":"preview-gate.sh: could not pick a free port (node missing?). Start a dev server by hand (npm run dev -- --port <n>) and tell the user the URL and worktree path, then end the turn again."}'; exit 0; }

cmd=${PREVIEW_GATE_CMD:-"npm run dev -- --host --strictPort --port"}
: > "$dir/log"
( setsid sh -c "exec $cmd $port" </dev/null >"$dir/log" 2>&1 & echo $! > "$dir/pid" )
printf '%s\n' "$port" > "$dir/port"
pid=$(cat "$dir/pid")

i=0; wait=${PREVIEW_GATE_WAIT:-20}
while [ "$i" -lt "$wait" ] && ! listening "$port"; do sleep 1; i=$((i+1)); done

esc() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g' | tr '\n' ' '; }
if listening "$port"; then
  # $pid is npm's (or a shell wrapper's), not necessarily the process bound
  # to the port — record the real listener so a later kill actually frees it.
  real_pid=$(port_pid "$port")
  if [ -n "$real_pid" ]; then
    printf '%s\n' "$real_pid" > "$dir/pid"
    pid=$real_pid
  fi
  printf '{"decision":"block","reason":"%s"}\n' "$(esc "Rendered files changed on this branch, so preview-gate.sh started a dev server: http://localhost:$port serving $root (pid $pid, log $dir/log). Tell the user that URL and worktree path in your reply, then end the turn again.")"
else
  kill "$pid" 2>/dev/null
  printf '{"decision":"block","reason":"%s"}\n' "$(esc "Rendered files changed on this branch, but preview-gate.sh could not start a dev server on port $port within ${wait}s. Log tail: $(tail -n 5 "$dir/log"). Fix it or start one by hand, tell the user the URL and worktree path, then end the turn again.")"
fi
exit 0

#!/bin/sh
# Tests for preview-gate.sh. Run: sh .claude/hooks/preview-gate.test.sh
set -u
here=$(cd "$(dirname "$0")" && pwd)
hook=$here/preview-gate.sh
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
fail=0
check() { if [ "$2" = "$3" ]; then echo "ok   $1"; else echo "FAIL $1: expected [$3] got [$2]"; fail=1; fi; }

cd "$tmp" && git init -q -b main . && git config user.email t@t && git config user.name t
mkdir src && echo a > src/a.ts && git add . && git commit -qm init
git checkout -qb feature
export CLAUDE_PROJECT_DIR=$tmp PREVIEW_GATE_WAIT=5
# a stand-in server: listens on $1 until killed
export PREVIEW_GATE_CMD="node -e 'require(\"net\").createServer().listen(+process.argv[1])'"

out=$(echo '{}' | sh "$hook"); check "no rendered change -> silent" "$out" ""

echo b > README.md
out=$(echo '{}' | sh "$hook"); check "non-rendered change -> silent" "$out" ""

echo b > src/a.ts
out=$(echo '{}' | sh "$hook")
case "$out" in *'"decision":"block"'*'http://localhost:'*"$tmp"*) r=block ;; *) r="$out" ;; esac
check "rendered change, no server -> starts and blocks" "$r" block
pid=$(cat .claude/preview/pid)

out=$(echo '{}' | sh "$hook"); check "server alive -> silent" "$out" ""

out=$(echo '{"stop_hook_active": true}' | sh "$hook"); check "stop_hook_active -> silent" "$out" ""

kill "$pid"; sleep 1
out=$(echo '{}' | sh "$hook")
case "$out" in *'"decision":"block"'*) r=block ;; *) r="$out" ;; esac
check "server died -> restarts and blocks" "$r" block
pid=$(cat .claude/preview/pid)

# alive but not listening: a process that never binds the port must be killed, not orphaned
kill "$pid"; sleep 1
sleep 300 & echo $! > .claude/preview/pid
out=$(echo '{}' | sh "$hook")
sleep 1
if kill -0 "$(cat /dev/null; echo "$!")" 2>/dev/null; then r=leaked; else r=killed; fi
case "$out" in *'"decision":"block"'*) ;; *) r="$out" ;; esac
check "server alive but not listening -> old pid killed, restarts" "$r" killed
kill "$(cat .claude/preview/pid)" 2>/dev/null

# recorded pid dead but something else (the real vite child, in prod) still
# holds the port: the hook must kill the actual holder and free the port,
# not just start a second server on a new port and leave the old one leaked.
if command -v ss >/dev/null 2>&1 || command -v lsof >/dev/null 2>&1; then
  node -e 'require("net").createServer().listen(0,"127.0.0.1",function(){console.log(this.address().port)})' >"$tmp/orphan.port" &
  orphan_pid=$!
  sleep 1
  orphan_port=$(cat "$tmp/orphan.port")
  echo 999999 > .claude/preview/pid   # a pid that is (almost certainly) not running
  echo "$orphan_port" > .claude/preview/port
  out=$(echo '{}' | sh "$hook")
  case "$out" in *'"decision":"block"'*'http://localhost:'*"$tmp"*) r=block ;; *) r="$out" ;; esac
  check "recorded pid dead, port held by another process -> killed and restarts" "$r" block
  sleep 1
  if kill -0 "$orphan_pid" 2>/dev/null; then r=leaked; else r=killed; fi
  check "recorded pid dead, port held by another process -> orphan actually killed" "$r" killed
  kill "$(cat .claude/preview/pid)" 2>/dev/null
else
  echo "skip recorded-pid-dead-port-held test: no ss or lsof"
fi

exit $fail

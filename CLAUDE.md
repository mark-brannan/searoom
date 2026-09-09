# Working conventions — searoom

This is a visual webapp. A diff without something to look at isn't a
finished turn.

- **Whenever you change anything rendered** (components, scenes, styles,
  the 3D model), leave a dev or preview server running and tell the user
  the URL and the worktree path it's serving from — see
  [README.md](README.md#running-this-project) for the commands. Don't just
  report the change; give them something to look at.
- This should eventually be a hook, not a rule agents have to remember —
  see [#25](https://github.com/mark-brannan/searoom/issues/25).

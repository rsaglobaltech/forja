CREATE TABLE task (
  id         UUID PRIMARY KEY,
  owner      TEXT NOT NULL,
  title      VARCHAR(120) NOT NULL,
  done       BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  done_at    TIMESTAMPTZ
);
CREATE INDEX task_owner_idx ON task (owner, created_at DESC);

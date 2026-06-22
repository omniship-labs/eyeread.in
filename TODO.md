# TODO

Lightweight backlog for things deferred out of a working session. Each item
links to the GitHub issue tracking it.

## Compatibility reports

- [ ] **On-page compat form → Supabase, with scheduled sync to the site.**
      ([#18](https://github.com/omniship-labs/eyeread.in/issues/18))
      Replace the GitHub-issue compat pipeline with a native form on the
      marketing site that writes submissions to a Supabase Postgres table
      (insert-only RLS). A scheduled GitHub Action pulls *approved* rows,
      validates + merges them into `site/src/data/compat.data.json`, and opens
      a PR. Reuse the existing validation/merge logic. Deferred — not building
      yet. See issue for the full plan.

# ALFA Facebook Page Agent

> **Experimental React, tRPC and Drizzle workspace for assisted page and group workflows**

ALFA Facebook Page Agent is a work-in-progress web application for drafting,
reviewing and organizing content-related workflows for Facebook Pages and
Groups. It contains a React client, a TypeScript server, Drizzle migrations and
an explicit validation layer named `Filtry Tonoyana`.

## Implemented areas

- views for pages, groups, posts, scheduling, tone configuration, knowledge and
  message history in `client/src/pages/`;
- server routers for content generation, features, groups/posts and tones;
- `server/validation/filtry-tonoyana.ts` and accompanying tests;
- database schema and migrations in `drizzle/`;
- an optional browser-operator client and a browser-login helper command.

The repository includes interfaces and integration code; it does not by itself
provide Facebook credentials, a hosted database or permission to publish
content.

## Architecture

```text
client/                 React user interface
server/                 tRPC server, integrations and validation
drizzle/                schema, relations and SQL migrations
scripts/alfa.ts         ALFA-oriented command-line helper
```

## Requirements

- Node.js with pnpm (the lockfile declares pnpm 10.4.1);
- the services and credentials required by the server configuration, if the
  corresponding integrations are enabled;
- Playwright only when using the browser helper.

## Local development

```bash
pnpm install
pnpm dev
```

Useful checks declared by the project:

```bash
pnpm check
pnpm test
pnpm alfa:check
```

`pnpm db:push` generates and applies Drizzle migrations. Run it only against a
database intended for development and inspect the generated migration first.

## Configuration and operational care

Keep API tokens, session data and browser profiles outside Git. Browser-based
automation may act in an authenticated account, so use a test account where
possible, review generated material before publishing, and ensure that any
platform API usage complies with the platform's current rules.

## Status

This is an experimental application. Validation rules and release-gate labels
are implementation features, not a claim that generated text is factual or
safe for automatic publication. Human review remains required.

## Contribution and license

Please open focused issues or pull requests with tests where practical. No
repository-level licence file is present; obtain permission before reuse.

# TiltCheck Documentation Site

This directory prepares a standalone, docs-only distribution of the TiltCheck ecosystem documentation.

## Structure
- mkdocs.yml: Site configuration (navigation + metadata)
- docs/ : Markdown source (copied from monorepo `docs/tiltcheck/`)

## Developing Locally (Docusaurus)
```bash
cd tiltcheck-docs
npm install
npm start
```
Site will be available at http://localhost:3000.

## Building
```bash
npm run build
```
Outputs static site into `build/`.

## Deployment (GitHub Pages)
Workflow `docs-ci.yml` builds & deploys on pushes to `main`.

## Link Checking
Lychee link checker runs in CI; failing broken links will break the build.

## API Reference
Multiple OpenAPI specs rendered via plugin:
- Core API: `static/openapi/tiltcheck.yaml` -> `/docs/api/tiltcheck`
- Trust Engine API: `static/openapi/trust.yaml` -> `/docs/api/trust`

## Versioning
To cut first version:
```bash
npm run docusaurus docs:version 1.0
```
Creates `versioned_docs/` and tags sidebar. Update future changes in `/docs` ("current").

## Search (Algolia)
Set environment variables for production build:
```bash
export ALGOLIA_APP_ID=your_app_id
export ALGOLIA_SEARCH_KEY=your_public_search_key
export ALGOLIA_INDEX_NAME=tiltcheck_docs
npm run build
```

## Migrating from MkDocs
Original MkDocs config retained only in history. All docs now use Docusaurus.

## Updating Docs
When you modify source docs in the monorepo (`docs/tiltcheck`), re-run the copy script or manually copy changes into this folder.

## Copy Script (Manual)
From repo root:
```bash
rm -rf tiltcheck-docs/docs/*
cp -R docs/tiltcheck/* tiltcheck-docs/docs/
```

## License & Ownership
Content © 2024–2025 TiltCheck / jmenichole.

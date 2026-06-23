# PlantUML Viewer

PlantUML Viewer is a result-first PlantUML workspace built around one rule: the diagram stays primary, and the source is available when you need it.

The app renders PlantUML diagrams through a local PlantUML server, presents the diagram in a dedicated canvas, and keeps source editing in a slide-out drawer.

## What this project is for

- Render PlantUML diagrams locally in the browser.
- Keep the diagram visible as the main working surface.
- Open the source editor only when editing is needed.
- Switch between light and dark presentation modes.
- Use fit controls and zoom controls without losing the diagram context.

## Current UX model

The current interface is intentionally biased toward the rendered result:

- The top bar stays visible while the page scrolls.
- `Open Source` / `Close Source` controls the source drawer.
- `Full width` and `Full height` are fit modes, not toggles.
- Zoom controls are separate from fit modes.
- `Ctrl/Cmd + E` toggles the source drawer.
- `Ctrl + mouse wheel` zooms the diagram.
- The theme switch changes both the UI chrome and the diagram palette.

The source drawer is for editing and copying source.

## Features

- Result-first canvas with responsive viewport sizing.
- Source editor in a drawer overlay.
- Live rerendering after source edits.
- Light and dark UI themes.
- Theme-aware PlantUML styling injected into the source before render.
- Fit-to-width and fit-to-height modes.
- Zoom in, zoom out, and reset zoom controls.

## How it works

The app is a React frontend that talks to a local PlantUML server running on port `9090`.

Rendering flow:

1. The source is edited in the drawer.
2. The app injects theme-specific `skinparam` values into the PlantUML text.
3. The rendered text is compressed and encoded.
4. The viewer requests an SVG from the local PlantUML server.
5. The diagram is displayed inside the main canvas.

The viewer component lives in [`src/component/PlantUMLViewer.js`](./src/component/PlantUMLViewer.js).

## Prerequisites

- Node.js and npm
- Java
- A local PlantUML server JAR

The server script currently expects:

- `plantuml-1.2026.2.jar`

If you update the PlantUML version, update the jar name in [`server/start-server.sh`](./server/start-server.sh).

## Run locally

Start the PlantUML server first:

```bash
./server/start-server.sh
```

Then start the React app in another terminal:

```bash
npm start
```

The app runs on:

- `http://127.0.0.1:4000`

The PlantUML server runs on:

- `http://127.0.0.1:9090`

## Build

Create a production build with:

```bash
npm run build
```

This produces the static bundle in `build/`.

## Available scripts

From `package.json`:

- `npm start` - runs the React app on `127.0.0.1:4000`
- `npm run build` - creates the production build
- `npm test` - runs the test runner
- `npm run eject` - ejects from Create React App

## Repository layout

- [`src/App.js`](./src/App.js) - main UI, state, controls, and source drawer
- [`src/App.css`](./src/App.css) - layout, theme, toolbar, and drawer styling
- [`src/component/PlantUMLViewer.js`](./src/component/PlantUMLViewer.js) - PlantUML SVG rendering component
- [`src/component/encode64.js`](./src/component/encode64.js) - PlantUML encoding helper
- [`public/index.html`](./public/index.html) - document shell, title, favicon links
- [`public/manifest.json`](./public/manifest.json) - PWA metadata and icons
- [`public/plantuml-icon.svg`](./public/plantuml-icon.svg) - source for the app icon family
- [`public/favicon.ico`](./public/favicon.ico) - legacy favicon fallback
- [`public/logo192.png`](./public/logo192.png) - install icon
- [`public/logo512.png`](./public/logo512.png) - high-resolution install icon
- [`server/start-server.sh`](./server/start-server.sh) - local PlantUML server launcher

## Design notes

The interface intentionally avoids a split-view editor layout. The diagram remains the dominant surface, while source editing is treated as a secondary, temporary action. The toolbar uses compact icon buttons so the top bar stays readable and stable even when the workspace is narrow.

Dark mode is tuned for diagram readability rather than pure inversion. The viewer background, chrome, and injected PlantUML theme values are coordinated so the diagram remains legible across common shapes like use cases, sequence diagrams, states, and components.

## Branding assets

This project uses a minimal connected-nodes mark derived from the current product icon set.

Included assets:

- SVG favicon source
- ICO fallback favicon
- 192x192 app icon
- 512x512 install icon

## Maintenance notes

- Keep the PlantUML server version in sync with the local script.
- Regenerate the icon assets from `public/plantuml-icon.svg` if branding changes.
- When adjusting theme colors, update both the React chrome and the injected PlantUML `skinparam` blocks so the viewer and rendered diagram stay visually aligned.

## Status

This repository is currently centered on the viewer experience, not on general-purpose PlantUML authoring. The main product decisions are already reflected in the code:

- diagram-first layout
- source drawer for editing
- fit controls plus zoom
- light and dark themes
- compact toolbar and brand-specific icons


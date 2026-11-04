# Ozmo Lab

Ozmo Lab is an interactive virtual laboratory for physics and STEM education. Students can assemble electrical circuits, run browser-based experiments, explore geometrical optics and microscopy, and receive step-by-step guidance from an AI tutor.

The project is designed for schools and colleges. It works in the browser, supports offline PWA use, and provides Tajik, Russian, and English interface languages.

## Features

- DC circuit workbench with batteries, lamps, resistors, switches, rheostats, capacitors, diodes, ammeters, voltmeters, and multimeters.
- Nodal circuit solving and live telemetry for voltage, current, resistance, and power.
- Interactive 2D and 3D laboratory views with optional physics effects.
- Geometrical optics experiments with lasers, lenses, mirrors, screens, prisms, and beam splitters.
- Biology and microscopy experiments with prepared slides, stains, objectives, and specimen observations.
- Photo-to-circuit analysis and notebook problem assistance.
- Socratic AI tutoring that uses hints and questions instead of replacing the student's work.
- Observation journal with CSV, JSON, PNG, and report export tools.
- Scientific glossary and offline hints.
- Light and dark themes.
- Tajik (`tg`), Russian (`ru`), and English (`en`) localization.

## Technology

- React 19 and TypeScript
- Vite
- Express
- Zustand
- Three.js
- Matter.js
- Tailwind CSS
- Vitest
- Google GenAI-compatible tutor services

## Requirements

- Node.js 20 or newer
- npm 10 or newer
- An API key and model configuration for AI features

## Installation

```bash
npm ci
```

Create a `.env` file based on `.env.example`:

```env
BASETEN_API_KEY=your_api_key
BASETEN_MODEL_ID=your_model_id
BASETEN_API_URL=https://your-api-endpoint
APP_URL=http://localhost:3000
```

AI-powered features require valid provider credentials. The local simulator, workbench, glossary, and offline hints can be used without an AI key.

## Development

Start the full-stack development server:

```bash
npm run dev
```

The application is available at [http://localhost:3000](http://localhost:3000).

The development server exposes `GET /health` for health checks.

## Production build

Build the client:

```bash
npm run build
```

Start the production server after building:

```bash
set NODE_ENV=production
npm start
```

On PowerShell:

```powershell
$env:NODE_ENV = "production"
npm start
```

## Testing and type checking

Run the TypeScript check:

```bash
npm run lint
```

Run the test suite:

```bash
npm test
```

Run evaluation scenarios:

```bash
npm run eval
```

## Project structure

```text
.
├── server/       Express API, tutor services, schemas, and evaluations
├── shared/       Shared types, i18n, glossary, synthesis, and solvers
├── web/src/      React components, labs, stores, hooks, and services
├── src/          Application entrypoint and global styles
├── public/       Public static assets
├── scripts/      Smoke tests and evaluation helpers
├── tests/        Evaluation and physics tests
└── docs/         Technical and evaluation documentation
```

## Laboratory workflow

1. Select a laboratory from the home page.
2. Add components from the catalog to the workbench.
3. Connect terminals or place optical and microscopy components.
4. Run the simulation and inspect the telemetry.
5. Record observations in the journal and export the results if needed.
6. Ask the AI tutor for a hint when you need guidance.

## Localization

Use the language switcher in the header to choose Tajik, Russian, or English. Translations are stored in `shared/i18n.ts`; domain-specific glossary content is stored in `shared/glossary.json`.

## Deployment

The repository includes `render.yaml` for Render-style deployments. Configure the required environment variables in the hosting provider, build the project with `npm run build`, and start it with `npm start`.

## License

This project is distributed under the Apache License 2.0. See [LICENSE](./LICENSE).

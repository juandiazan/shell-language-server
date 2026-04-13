Ver artículo en [[Links útiles]]

# Entendiendo la arquitectura de extensiones a alto nivel

### Extension host process

VSCode ejecuta las extensiones en un proceso separado llamado *Extension Host*. Esto permite que las extensiones corran aisladas, lo que trae ciertas ventajas:
- Las extensiones que crasheen no van a crashear en proceso principal de VSCode
- Las extensiones tienen su propio espacio de memoria y no compiten con el de VSCode
- VSCode puede manejar el ciclo de vida de las extensiones de forma independiente

#### VSCode API

El módulo `vscode` provee acceso a todos los componentes a extender.

## Setup de proyecto

### Estructura de archivos y directorios

```
	my-extension/
	├── .vscode/
	│   ├── launch.json          # Debug configurations
	│   ├── tasks.json           # Build tasks
	│   └── settings.json        # Workspace settings
	├── src/
	│   ├── extension.ts         # Main entry point
	│   ├── commands/            # Command handlers
	│   ├── providers/           # Tree views, webviews, etc.
	│   ├── services/            # Business logic
	│   └── utils/               # Helper functions
	├── media/                   # Icons, images, stylesheets
	├── dist/                    # Compiled output
	├── package.json             # Extension manifest
	├── tsconfig.json            # TypeScript configuration
	├── esbuild.js               # Build configuration
	└── .vscodeignore            # Files to exclude from package
```


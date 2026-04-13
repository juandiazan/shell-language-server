Ver artículo en [[Links útiles]].
### ¿Qué es Visual Studio Code?

Es un editor de código gratis, open-source y cross-platform. No es un IDE, sino que es un editor de texto modular, extensible a través de pequeñas apps y protocolos estandarizados. Cualquiera puede crear y publicar extensiones.

### ¿Por qué es importante entender la arquitectura de VS Code?

Conocer la arquitectura y como funciona el *Extension Host* puede llevar a un desarrollo eficiente de extensiones y una mejor calidad de estas. También con estos conocimientos se puede hacer troubleshooting de problemas de extensiones ya existentes (crashes, funcionalidades rotas, entre otros) e identificar extensiones o configuraciones que puedan afectar a la velocidad y/o memoria del editor.

### Arquitectura a alto nivel
Arquitectura multi-proceso que consiste de:
- Proceso principal para gestión de la app
- Procesos de rendering para el rendering de la UI
- Un extension host dedicado
- Language servers y debug adapters

### Activación de extensiones on-demand

VS Code usa *Lazy Loading* para las extensiones, es decir, no se activan al lanzar el editor a no ser que sea necesario, sino que solo se activan cuando se les llama.
Las extensiones declaran *Activation Events* en el `package.json` y hasta que un evento de los declarados no ocurra, la extensión se mantiene "dormida".
## Procesos

### Extension Host

Es un proceso dedicado de nodejs que ejecuta todas las extensiones activadas separadas a la UI del editor principal. Esto asegura que cualquier extensión que falle no bloquee o crashee la interfaz core, aportando performance y estabilidad. 

Las extensiones se comunican con el editor a través de una API usando Inter-Process Communication (IPC) channels para intercambiar mensajes con el proceso principal y otros servicios como el servidor de lenguaje.
Al separar las extensiones en su propio entorno, VS Code permite construir herramientas como syntax highlighters, debuggers y linters sin comprometer la responsiveness o integridad del editor.

El sistema de extensiones es un framework modular y event-driven que permite a desarrolladores mejorar y customizar casi cualquier cosa del editor. Cada extensión se define por un `package.json` manifest, que declara sus capacidades, activation events, dependencias y otra metadata.
A través de la API las extensiones interactúan con todos los componentes de la UI del editor.

### Language Server Protocol (LSP)

Protocolo de comunicación estandarizado entre herramientas de desarrollo (editores, IDE's) y servidores de un lenguaje específico que provee features de programación como auto-completion, tooltips al pasar el mouse, ir a la definición de una función, validación de sintaxis, refactoring, entre otras. Este protocolo desacopla el editor de la lógica del lenguaje, permitiendo a cualquier editor que implementa el LSP trabajar con cualquier lenguaje que tenga support. Algunos ejemplos de LSP's son:
- Python -- Su extensión de VS Code incluye un Python Language Server
- JS/TS -- tiene un TypeScript Language Server built-in
- C# -- OmniSharp/C# Dev Kit Language Server
- Rust -- Rust Analyzer
- Go -- gopls Language Server

### Debug Adapter Protocol

Protocolo estandarizado desarrollado por Microsoft para permitir comunicación entre herramientas de desarrollo y debuggers específicos de un lenguaje o de un runtime. Símil a como LSP desacopla features del lenguaje, del editor, DAP desacopla la lógica de depuración de la UI del editor, permitiendo que cualquier implementación del debugger se integre limpiamente con cualquier editor compatible con DAP.
DAP permite a los desarrolladores escribir una sola integración de debugger y permitir múltiples editores. Reduce duplicación y promueve interoperabilidad.
#### Funcionamiento

Cuando se empieza una sesión de depuración en VS Code primero el editor ejecuta un debug adapter para el lenguaje/runtime utilizado. Luego, envía requests como `initialize` o `setBreakpoints` al adaptador, y luego el debug adapter interactúa con el debugger a utilizar y envía eventos de vuelta al editor como `stopped` o `terminated`.

### Renderer Process

Proceso responsable de renderizar la UI del editor. Está basado en la arquitectura multi-proceso de Chromium, que separa el renderizado de la UI de la lógica de backend como acceso al filesystem, extensiones y servicios de lenguajes.

#### Responsabilidades

- Dibujar la UI
- Manejar input de usuario
- Ejecutar lógica de frontend

## Modelo de procesos - como encaja todo

| Proceso           | Responsabillidad                             |
| ----------------- | -------------------------------------------- |
| Proceso principal | Ciclo de vida de la app, gestión de ventanas |
| Renderer Process  | Renderizado de UI e interfaz del editor      |
| Extension Host    | Correr extensiones de forma independiente    |
| Language Server   | Inteligencia específica de un lenguaje       |
| Debug Adapter     | Integración de depuración per-language       |
### Responsabilidades de componentes

#### Proceso principal
- Crear y gestionar ventanas (cada ventana de VS Code corre en su propio proceso)
- Manejar diálogos a nivel de sistema
- Gestionar actualizaciones y telemetría

#### Renderer Process
- Dibujar toda la UI y sus componentes
- Manejar input de mouse y teclado, layouts y cambios de temas (apariencia)
- Interactuar con el editor Mónaco (el que usa VS Code por detrás)

#### Extension Host Process
- Corre el código de las extensiones asincrónicamente
- Maneja hooks de ciclo de vida
- Provee API's para interactuar con archivos, workspace, comandos, entre otros

#### Language Server Process
- Ofrece IntelliSense, tooltips on-hover, refactoring, go-to-definition, etc
- Parsea código fuente y retorna información context-aware

#### Debug Adapter Process
- Implementa el Debug Adapter Protocol
- Mapea breakpoints, stack traces y variables a la UI
- Gestiona comandos tipo attach/launch/step-over durante sesiones de debugging

## Comunicación de componentes

El diseño modular de VS Code es un sistema de comunicación correctamente orquestado entre sus procesos individuales y separados. Esta comunicación es fundamental para integrar features sin comprometer la performance y estabilidad. La comunicación entre estos procesos se da con *JSON-RPC* y *Canales de IPC de Electron*

Este modelo de comunicación implica:

- Mensajería asincrónica: mantiene la UI responsiva al pasarle cálculos pesados o I/O a los procesos de fondo.
- Separación y tolerancia a fallos: un crash en un proceso no tira abajo toda la app.
- Flexibilidad cross-language: se puede implementar un Language Server o un Debug Adapter para cualquier lenguaje mientras cumplan con LSP o DAP
- Escalabilidad: nuevas features (como desarrollo remoto e integración con Git) se agregan como componentes standalone pero usan la infraestructura de mensajes existente.

### Como hablan los componentes entre ellos

#### Main Process y Renderer Process

- Comunicación: a través de canales IPC de Electron
- Funcionamiento:
	- El proceso principal lanza y gestiona ventanas del renderer
	- Envía eventos a nivel de sistema operativo al renderer
	- El renderer envía comandos iniciados por el usuario de vuelta al proceso principal

#### Renderer Process y Extension Host Process

- Comunicación: JSON-RPC en canales IPC
- Funcionamiento:
	- El renderer provee API's y eventos de ciclo de vida a extensiones
	- Las extensiones registran comandos, items en la status bar y vistas a través del Extension Host
#### Renderer / Extension Host y Language Server

- Comunicación: usan el Language Server Protocol en I/O estándar, sockets o IPC
- Funcionamiento:
	- El servidor de lenguaje es específico a un lenguaje y provee features como code completion, formatting, etc
	- El Extension Host actúa como un LSP Client, ruteando requests y respuestas

#### Renderer / Extension Host y Debug Adapter

- Comunicación: usan el Debug Adapter Protocol en pipes, socket o stdIO
- Funcionamiento:
	- Conecta VS Code con language-specific debuggers
	- Controla el lanzamiento, attaching y gestión de sesiones de debugging

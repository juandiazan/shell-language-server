
Ver artículo en [[Links útiles]].
# ¿Que partes de VSCode puede extender una extensión?

Las piezas que se pueden modificar son llamadas *contribution points*. 
Estos pueden estar relacionados a:
- *UI del editor* (activity bar, sidebars, panel, editor, etc.)
- *Comandos y menús de contexto* (command palette *(ctrl + p)*, menús abiertos con click derecho)
- *Editor y lenguaje*
- *Archivos y workspace* (monitor de cambios en el workspace o archivos, configuraciones de la workspace mismo)
## Relacionados al editor y al lenguaje

- *Features del lenguaje*: agregar funcionalidad como syntax highlighting, IntelliSense, linting, etc. Puede implementarse un Language server para un DSL que aporte análisis de sintaxis en tiempo real y otras features.
- *Acciones sobre el código*: ofrecer fixes para errores o warnings, refactors, etc.
- *Decoraciones de línea*: mejoras para el editor con elementos visuales para transmitir información. Puede ser resultados de tests inline, highlight de comentarios como TODO, etc.
- *Support para debugging*
# Core building blocks de una extensión
## Manifest Registration
Las contribuciones realizadas deben estar listadas en un `package.json` (manifest) para que VSCode las permita. Este JSON debe tener un formato particular. 
Este va a contener toda la información necesaria de la extensión como su nombre y descripción, y además lo que la extensión va a agregar a VSCode.

```
{
	"name": ,  
	"displayName": ,  
	"description": ,  
	"version": ,  
	"engines": {  
		"vscode":  
	},  
	"activationEvents": [  ],  
	"main": "extension.js",
	"contributes": {  
	    "configuration": {  
	      "title": ,  
	      "properties": {  }  
	    },  
	    "views": {  
	      "sidebar": [  ]  
	    },  
	    "commands": [  
	      {  
	        "command": ,  
	        "title":   
	      },  
	    ],  
	    "menus": {  
	      "editor/context": [  
	        {  
	          "command":,  
	          "when": ,  
	          "group":  
	        }  
	      ]  
	    }  
	}
}
```
## Activation Events
Eventos que provocan que los comandos implementados se ejecuten. Por ejemplo:
- onCommand - activa la extensión al ejecutar un comando
- onLanguage - activa la extensión cuando se abre un archivo de un lenguaje determinado
- onFilesystem - activa la extensión al abrir un archivo o carpeta particular
## API de VSCode

Provee lógica útil de aplicación a través de una API. Esta tiene cientos de métodos que pueden ser llamados por extensiones. Algunos ejemplos son:

- `vscode.languages.registerCompletionItemProvider()`: agrega sugerencias de autocompletado
- `vscode.languages.registerDocumentFormattingEditProvider()`: agrega reglas de formato
- `vscode.workspace.onDidChangeTextDocument`: detecta cambios en un documento

## Arquitectura Core

![[core-architecture.png|488]]

#### Concepto general

Un registration (`package.json`) identifica la ubicación de la extensión (entrypoint). Luego, este describe los *activation events* registrados y que hacer con ellos, lo que llama al backend (API) o al frontend (UI).
VSCode usa un bus de mensajes interno.

Toda extensión va a tener un `extension.js` que será el entrypoint al backend, y un `frontend.js` que será la parte gráfica de esta.
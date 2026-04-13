[Fuente](https://code.visualstudio.com/api/language-extensions/language-server-extension-guide)
# Surgimiento del LSP

## Primeros problemas al crear servidores de lenguaje

- Los servidores de lenguaje son usualmente implementados en sus lenguajes nativos, lo que presenta un desafío de integración con VS Code, cuyo runtime es Nodejs.

- Las language features pueden consumir muchos recursos. Por ejemplo, para algo simple como validar un archivo, el servidor de lenguaje debe parsear múltiples archivos, construir AST's para ellos y correr análisis de código estático, Estas operaciones pueden implicar usos significativos de CPU y de memoria, lo que puede influir en la performance de VS Code.

- Integrar múltiples herramientas de lenguaje con múltiples editores de código implica un esfuerzo significativo. 
	- Desde la perspectiva de las herramientas de lenguaje, tienen que adaptarse a editores de código con distintas API's.
	- Desde la perspectiva de los editores de código, no pueden esperar ninguna API uniforme de las herramientas de lenguaje. Esto hace que soportar $M$ lenguajes en $N$ editores de código cueste $M * N$ implementaciones.

## Solución - LSP

Microsoft especificó el LSP, que estandariza la comunicación entre herramientas de lenguaje y editores de código.
De esta manera los servidores de lenguaje pueden ser implementados en cualquier lenguaje y correr en su propio proceso para evitar costos de performance al comunicarse con el editor a través de LSP.
Además, cualquier herramienta de lenguaje puede ser integrada con varios editores de código que sigan LSP, y cualquiera de estos puede integrar múltiples herramientas de lenguaje que sigan LSP.

# Implementación

En VS Code, un servidor de lenguaje tiene 2 partes:
- Language Client: extensión de VS Code escrita en JS/TS. Esta extensión se comunica con la API de VS Code.
- Language Server: herramienta de análisis de código corriendo en un proceso separado.

Cada Language Client instancia un Language Server correspondiente y se comunica con él a través de LSP. A pesar de que un servidor de lenguaje esté escrito en su propio lenguaje, puede comunicarse con el Language Client a través de LSP.
![[ejemplo-LSP-vscode.png]]
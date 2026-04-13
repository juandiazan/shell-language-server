Siglas:
HD: herramienta de desarrollo
SL: servidor de lenguaje
# Language Server

La idea de un servidor de lenguaje es proveer funcionalidades de un lenguaje particular dentro de un servidor que se pueda comunicar con herramientas de desarrollo a través de un protocolo que disponibilice la comunicación entre procesos.

# Language Server Protocol

La idea del LSP es estandarizar el protocolo usado para comunicación entre herramientas y servidores, así un solo servidor de lenguaje se puede usar en varias herramientas, y estas pueden supportear lenguajes con un esfuerzo mínimo.

## Funcionamiento

El SL corre en un proceso separado y las HD se comunican con el usando el protocolo de lenguaje sobre JSON-RPC.

![[comunicacion-lsp-ide.png]]

- Al un usuario abrir un archivo (o documento): la HD se comunica con el SL, notificándole que un documento se abrió. A partir de ahora, el contenido del documento se mantiene por la HD en memoria. Los contenidos deben ser sincronizados entre la HD y el SL.
 
- Al un usuario editar un archivo: la HD notifica al SL sobre el cambio y la representación del lenguaje en el documento es actualizada por el SL. Al suceder esto, el SL analiza esta información y notifica a la HD con los errores y warnings detectados.

- Al un usuario ejecutar un comando "Go to Definition": la HD envia una request de tipo "textDocument/definition" al SL con 2 parámetros: 
	- La URI del documento
	- La posición de texto de donde se inició la request al servidor
	El servidor luego responde con la URI del documento y la posición de la definición del símbolo dentro del documento.

- Al un usuario cerrar el documento: la HD notifica al SL con una request de tipo "textDocument/didClose" para informarle que el documento ya no está en memoria. Los contenidos quedan up to date en el file system. 

Cuando un usuario trabaja con varios lenguajes a la vez, la HD abre un SL por cada lenguaje utilizado, y se comunica con ellos independientemente.
## Neutralidad

Los tipos de datos son separados de los lenguajes de programación, aplican a todos los lenguajes. La estandarización ayuda a simplificar el protocolo significamente y a poder cubrir la mayor cantidad de lenguajes sin tener que generalizar sus árboles de sintaxis y/o símbolos reservados del lenguaje particular.

## Capacidades

LSP provee grupos de features del lenguajes a las que llama *capabilities*. Se proveen de esta manera porque no todo SL da soporte a todas las funcionalidades definidas por el protocolo.
Tanto la HD como el SL anuncian sus features soportadas usando estas *capabilities*.  Por ejemplo:
- un SL anuncia que puede manejar la request `textDocument/definition` pero puede que no pueda manejar otras como `workspace/symbol`
- similarmente, una HD anuncia su capacidad de proveer notificaciones previas a guardar un documento para que un servidor pueda computar ciertos edits al texto para darle formato al documento antes de ser guardado.

## Librerías y SDK's 

- Para la implementación de clientes de lenguaje (lo que usan las HD's), cada HD provee una librería para integrar servidores de lenguaje.

- Para la implementación de servidores de lenguaje, cada lenguaje tiene un SDK para implementar un SL.

# Como implementar un LSP
Notas en otro archivo: [[Como implementar un LSP]]

import * as fs from "fs";

const log = fs.createWriteStream(
  "/home/juan/ort-proyectos/shell-language-server/lsp.log",
);

export default {
  write: (message: object | unknown) => {
    if (typeof message === "object") {
      log.write(JSON.stringify(message));
    } else {
      log.write(message);
    }
    log.write("\n");
  },
};

import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const log = fs.createWriteStream(path.join(os.tmpdir(), "shell-lsp.log"), { flags: "a" });

log.on("error", () => {});

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

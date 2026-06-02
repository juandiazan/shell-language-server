import * as fs from "fs";
import * as path from "path";

export let workspaceRoot: string | null = null;

export const setWorkspaceRoot = (root: string): void => {
  workspaceRoot = root;
};

export const collectShellFiles = (dir: string, visited = new Set<string>()): string[] => {
  if (visited.has(dir)) return [];
  visited.add(dir);

  const results: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectShellFiles(fullPath, visited));
    } else if (entry.isFile() && entry.name.endsWith(".sh")) {
      results.push(fullPath);
    }
  }

  return results;
};

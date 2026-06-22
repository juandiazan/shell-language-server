export const isWordChar = (char: string): boolean => /[A-Za-z0-9_]/.test(char);

export const wordAtPosition = (line: string, character: number): string | null => {
  if (!line.length) {
    return null;
  }

  let index = Math.min(character, line.length - 1);
  if (!isWordChar(line[index])) {
    if (character > 0 && isWordChar(line[character - 1])) {
      index = character - 1;
    } else {
      return null;
    }
  }

  let start = index;
  while (start > 0 && isWordChar(line[start - 1])) {
    start -= 1;
  }

  let end = index + 1;
  while (end < line.length && isWordChar(line[end])) {
    end += 1;
  }

  return line.slice(start, end);
};

export class SubContentIdReplacer {
  public replaceWithNewIds(
    json: string,
    subContentIds: readonly string[]
  ): string {
    if (subContentIds.length === 0) return json;
    const subContentIdsPattern = subContentIds.join("|");
    const regexReplace = new RegExp(subContentIdsPattern, "g");
    const newJson = json.replace(regexReplace, (substring, args) => {
      return SubContentIdReplacer.createUUID();
    });
    return newJson;
  }

  private static createUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (char) {
        var random = (Math.random() * 16) | 0,
          newChar = char === "x" ? random : (random & 0x3) | 0x8;
        return newChar.toString(16);
      }
    );
  }
}

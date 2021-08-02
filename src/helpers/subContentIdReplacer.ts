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

  // Copied straight from the offical h5p-php-library.
  // https://github.com/h5p/h5p-php-library/blob/4599291d7ce0cfb90edd188b181416f31514748e/js/h5p.js#L2288
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

export class DuplicateSubContentIdDetector {
  public getDuplicates(json: string): readonly string[] {
    const regex = new RegExp(/"subContentId"\s?:\s?"([0-9a-z-]+)"/, "g");
    let regexResult: RegExpExecArray | null;
    const regexResults: RegExpExecArray[] = [];
    while ((regexResult = regex.exec(json))) {
      if (regexResult) regexResults.push(regexResult);
    }
    const subContentIdToCountMap = new Map<string, number>();
    for (const regexResult of regexResults) {
      const subContentId = regexResult[1];
      let count = subContentIdToCountMap.get(subContentId) ?? 0;
      count += 1;
      subContentIdToCountMap.set(subContentId, count);
    }
    const duplicates = [...subContentIdToCountMap]
      .filter((kvp) => kvp[1] > 1)
      .map((x) => x[0]);
    return duplicates;
  }
}

import { EJSON } from "bson";
import { expect } from "chai";
import { ObjectId } from "mongodb";
import { SubContentIdReplacer } from "../../src/helpers/subContentIdReplacer";

describe("subContentIdReplacer.replaceWithNewIds", () => {
  context("1 document with 2 unique subContentIds", () => {
    it("returns the original json", () => {
      // Arrange
      const originalDocument = {
        _id: new ObjectId(),
        slides: [
          { slide: { subContentId: "abc" } },
          { slide: { subContentId: "123" } },
        ],
      };
      const originalJson = EJSON.stringify(originalDocument, { relaxed: false });
      const subContentIdsThatNeedToBeReplaced: string[] = [];
      const sut = new SubContentIdReplacer();

      // Act
      const newJson = sut.replaceWithNewIds(
        originalJson,
        subContentIdsThatNeedToBeReplaced
      );

      // Assert
      expect(newJson).to.equal(originalJson);
    });
  });

  context("1 document with 2 identical subContentIds", () => {
    it("returns json that excludes the duplicate, and is the same length as the original json", () => {
      // Arrange
      const duplicateSubContentId = SubContentIdReplacer.createUUID();
      const originalDocument = {
        _id: new ObjectId(),
        slides: [
          { slide: { subContentId: duplicateSubContentId } },
          { slide: { subContentId: duplicateSubContentId } },
        ],
      };
      const originalJson = EJSON.stringify(originalDocument, { relaxed: false });
      const subContentIdsThatNeedToBeReplaced = [duplicateSubContentId];
      const sut = new SubContentIdReplacer();

      // Act
      const newJson = sut.replaceWithNewIds(
        originalJson,
        subContentIdsThatNeedToBeReplaced
      );

      // Assert
      expect(newJson).to.not.include(duplicateSubContentId)
      expect(newJson.length).to.equal(originalJson.length)
    });
  });
});

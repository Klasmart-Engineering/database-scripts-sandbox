import { EJSON } from "bson";
import { expect } from "chai";
import { ObjectId } from "mongodb";
import { DuplicateSubContentIdDetector } from "../../src/helpers/duplicateSubContentIdDetector";

describe("duplicateSubContentIdDetector.getDuplicates", () => {
  context("1 document with 2 unique subContentIds", () => {
    it("returns an empty array", () => {
      // Arrange
      const originalDocument = {
        _id: new ObjectId(),
        slides: [
          { slide: { subContentId: "abc" } },
          { slide: { subContentId: "123" } },
        ],
      };
      const originalJson = EJSON.stringify(originalDocument, { relaxed: false });
      const sut = new DuplicateSubContentIdDetector();

      // Act
      const actual = sut.getDuplicates(originalJson);

      // Assert
      expect(actual).to.be.empty;
    });
  });
  
  context("1 document with 2 identical subContentIds", () => {
    it("returns an array contaning 1 subContentId", () => {
      // Arrange
      const originalDocument = {
        _id: new ObjectId(),
        slides: [
          { slide: { subContentId: "123" } },
          { slide: { subContentId: "123" } },
        ],
      };
      const originalJson = EJSON.stringify(originalDocument, { relaxed: false });
      const sut = new DuplicateSubContentIdDetector();

      // Act
      const expected = ['123']
      const actual = sut.getDuplicates(originalJson);

      // Assert
      expect(actual).to.deep.equal(expected);
    });
  });
});

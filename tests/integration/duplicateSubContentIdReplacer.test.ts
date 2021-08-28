import { expect } from "chai";
import { Collection, MongoClient, ObjectId } from "mongodb";
import { DuplicateSubContentIdDetector } from "../../src/helpers/duplicateSubContentIdDetector";
import { DuplicateSubContentIdReplacer } from "../../src/dev/duplicateSubContentIdReplacer";
import { SubContentIdReplacer } from "../../src/helpers/subContentIdReplacer";
import { Arg, Substitute } from "@fluffy-spoon/substitute";
import { deserializeStream, EJSON } from "bson";
import fs from "fs";

describe.skip("duplicateSubContentIdReplacer.replaceDuplicates", () => {
  const url = "mongodb://localhost:27017/h5p";
  const client = new MongoClient(url, {});
  let collection: Collection;

  before(async () => {
    await client.connect();
    collection = client.db().collection("h5p");
  });

  beforeEach(async () => {
    try {
      await collection.drop();
    } catch (e) {
      // Ignore error.
    }
  });

  after(async () => {
    await client.close();
  });

  context("alpha database contents", () => {
    it("subContentIds are replaced", async () => {
      // Arrange
      const originalJson = fs.readFileSync("alpha-content.json").toString();
      const originalDocuments = EJSON.parse(originalJson, {
        relaxed: false,
      }) as [];
      await collection.insertMany(originalDocuments);

      const sut = new DuplicateSubContentIdReplacer(client, collection);

      // Act
      const isDryRun = false;
      await sut.replaceDuplicates(isDryRun);

      // Assert
      const documents = await collection.find({}).toArray();
      const json = EJSON.stringify(documents, { relaxed: false });
      expect(json.length).to.equal(originalJson.length);
      expect(documents).to.not.equal(originalDocuments);
      expect(documents[0]._id).to.be.instanceOf(ObjectId);

      const duplicateSubContentIdDetector = new DuplicateSubContentIdDetector();
      const duplicates = duplicateSubContentIdDetector.getDuplicates(json);
      expect(duplicates).to.be.empty;
    });
  });

  context("prod database contents", () => {
    it("subContentIds are replaced", async () => {
      // Arrange
      const bson = fs.readFileSync("h5p.bson");
      const originalDocuments: Document[] = [];
      const nextIndex = deserializeStream(
        bson,
        0,
        37526,
        originalDocuments,
        0,
        {}
      );
      const originalJsonLength = EJSON.stringify(originalDocuments, {
        relaxed: false,
      }).length;
      await collection.insertMany(originalDocuments);
      const originalDocumentCount = originalDocuments.length;
      originalDocuments.length = 0;

      const sut = new DuplicateSubContentIdReplacer(client, collection);

      // Act
      const isDryRun = false;
      await sut.replaceDuplicates(isDryRun);

      // Assert
      const documents = await collection.find({}).toArray();
      const json = EJSON.stringify(documents, { relaxed: false });
      expect(json.length).to.equal(originalJsonLength);
      expect(documents.length).to.equal(originalDocumentCount);
      expect(documents[0]._id).to.be.instanceOf(ObjectId);

      const duplicateSubContentIdDetector = new DuplicateSubContentIdDetector();
      const duplicates = duplicateSubContentIdDetector.getDuplicates(json);
      expect(duplicates).to.be.empty;
    });
  });

  context("1 document with 0 subContentIds", () => {
    it("subContentIdReplacer.replaceWithNewIds is not called", async () => {
      // Arrange
      await collection.insertOne({ slide: { metadata: "abc" } });
      const subContentIdReplacer = Substitute.for<SubContentIdReplacer>();

      const sut = new DuplicateSubContentIdReplacer(
        client,
        collection,
        new DuplicateSubContentIdDetector(),
        subContentIdReplacer
      );

      // Act
      const isDryRun = false;
      await sut.replaceDuplicates(isDryRun);

      // Assert
      subContentIdReplacer.didNotReceive().replaceWithNewIds(Arg.any());
    });
  });

  context("1 document with 1 subContentId", () => {
    it("collection is not modified", async () => {
      // Arrange
      const originalDocument = {
        _id: new ObjectId(),
        slide: { subContentId: "abc" },
      };
      const originalJson = JSON.stringify(originalDocument);
      await collection.insertOne(originalDocument);
      const subContentIdReplacer = Substitute.for<SubContentIdReplacer>();

      const sut = new DuplicateSubContentIdReplacer(
        client,
        collection,
        new DuplicateSubContentIdDetector(),
        subContentIdReplacer
      );

      // Act
      const isDryRun = false;
      await sut.replaceDuplicates(isDryRun);

      // Assert
      subContentIdReplacer.didNotReceive().replaceWithNewIds(Arg.any());
      const documents = await collection.find({}).toArray();
      const document = documents[0];
      expect(JSON.stringify(document)).to.deep.equal(originalJson);
      expect(document._id).to.be.instanceOf(ObjectId);
    });
  });

  context("1 document with 2 unique subContentIds", () => {
    it("collection is not modified", async () => {
      // Arrange
      const originalDocument = {
        _id: new ObjectId(),
        xxx: 1,
        slides: [
          { slide: { subContentId: "abc" } },
          { slide: { subContentId: "123" } },
        ],
      };
      const originalDocumentJson = EJSON.stringify(originalDocument, {
        relaxed: false,
      });
      await collection.insertOne(originalDocument);
      const subContentIdReplacer = Substitute.for<SubContentIdReplacer>();

      const sut = new DuplicateSubContentIdReplacer(
        client,
        collection,
        new DuplicateSubContentIdDetector(),
        new SubContentIdReplacer()
      );

      // Act
      const isDryRun = false;
      await sut.replaceDuplicates(isDryRun);

      // Assert
      subContentIdReplacer.didNotReceive().replaceWithNewIds(Arg.any());
      const documents = await collection.find({}).toArray();
      const document = documents[0];
      expect(
        EJSON.stringify(document, {
          relaxed: false,
        })
      ).to.deep.equal(originalDocumentJson);
      expect(document._id).to.be.instanceOf(ObjectId);
    });
  });

  context(
    "1 document with 1 unique subContentId and 1 set of 2 identical subContentIds",
    () => {
      it("the 2 identical subContentIds are modified", async () => {
        // Arrange
        await collection.insertOne({
          slides: [
            { slide: { subContentId: "abc" } },
            { slide: { subContentId: "123" } },
            { slide: { subContentId: "abc" } },
          ],
        });

        const sut = new DuplicateSubContentIdReplacer(client, collection);

        // Act
        const isDryRun = false;
        await sut.replaceDuplicates(isDryRun);

        // Assert
        const documents = await collection.find({}).toArray();
        const s1 = documents[0].slides[0].slide.subContentId;
        const s2 = documents[0].slides[1].slide.subContentId;
        const s3 = documents[0].slides[2].slide.subContentId;
        expect(s1).to.not.equal("abc");
        expect(s1).to.not.equal("123");
        expect(s2).to.equal("123");
        expect(s3).to.not.equal("abc");
        expect(s1).to.not.equal(s3);
        expect(documents[0]._id).to.be.instanceOf(ObjectId);
        // TODO: Make sure it's a UUID.
        ///[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89aAbB][a-f0-9]{3}-[a-f0-9]{12}/
      });
    }
  );

  context(
    "1 document with 1 set of 2 identical subContentIds and 1 set of 3 identical subContentIds",
    () => {
      it("all 5 subContentIds are modified", async () => {
        // Arrange
        await collection.insertOne({
          xxx: 1,
          slides: [
            { slide: { subContentId: "abc" } },
            { slide: { subContentId: "abc" } },
          ],
          answers: [
            { answer: { subContentId: "123" } },
            { answer: { subContentId: "123" } },
            { answer: { subContentId: "123" } },
          ],
        });

        const sut = new DuplicateSubContentIdReplacer(client, collection);

        // Act
        const isDryRun = false;
        await sut.replaceDuplicates(isDryRun);

        // Assert
        const documents = await collection.find({}).toArray();
        expect(documents[0]._id).to.be.instanceOf(ObjectId);
        const s1 = documents[0].slides[0].slide.subContentId;
        const s2 = documents[0].slides[1].slide.subContentId;
        const a1 = documents[0].answers[0].answer.subContentId;
        const a2 = documents[0].answers[1].answer.subContentId;
        const a3 = documents[0].answers[2].answer.subContentId;

        expect(s1).to.not.equal("abc");
        expect(s2).to.not.equal("abc");
        expect(s1).to.not.equal(s2);

        expect(a1).to.not.equal("123");
        expect(a2).to.not.equal("123");
        expect(a3).to.not.equal("123");
        expect(a1).to.not.equal(a2);
        expect(a1).to.not.equal(a3);
        expect(a2).to.not.equal(a3);
      });
    }
  );
});

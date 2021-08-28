import { expect } from "chai";
import { Collection, MongoClient, ObjectId } from "mongodb";
import { DuplicateSubContentIdDetector } from "../../src/helpers/duplicateSubContentIdDetector";
import { DuplicateSubContentIdReplacer } from "../../src/dev/duplicateSubContentIdReplacer";
import { deserializeStream, EJSON } from "bson";
import fs from "fs";
import { SubContentIdReplacer } from "../../src/helpers/subContentIdReplacer";

describe("newDuplicateSubContentIdReplacer.replaceDuplicates", () => {
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

      // Act
      const a = {"metadata.mainLibrary":{ $regex : /^H5P.CoursePresentation/ }}
      const b = {"metadata.mainLibrary":"H5P.Column", "parameters.content.content.library":{ $regex : /^H5P.CoursePresentation/ }}
      const c = {"metadata.mainLibrary":"H5P.InteractiveBook", "parameters.chapters.params.content.content.library":{ $regex : /^H5P.CoursePresentation/ }}
      const d = {"metadata.mainLibrary":"H5P.BranchingScenario", "parameters.branchingScenario.content.type.library":{ $regex : /^H5P.CoursePresentation/ }}
      
      const totalDocs = await collection.count({});
      console.log('Total docs', totalDocs)
      const docs = await collection.find({$or:[a, b, c, d]}).toArray();
      console.log('Total docs containing course presentation', docs.length)
      console.log('Executing detection and replacement...')
  
      let duplicateIdCount = 0
      const docReplacements: any[] = []
      for (const doc of docs) {
        const json = EJSON.stringify(doc)
        const duplicateSubContentIds =
          new DuplicateSubContentIdDetector().getDuplicates(json);
        duplicateIdCount += duplicateSubContentIds.length
  
        if (duplicateSubContentIds.length === 0) {
          continue;
        }
  
        const newJson = new SubContentIdReplacer().replaceWithNewIds(
          json,
          duplicateSubContentIds
        );
        docReplacements.push(EJSON.parse(newJson))
      }
  
      console.log("Total duplicate IDs", duplicateIdCount);
      console.log("Total docs affected", docReplacements.length);
  
      if (docReplacements.length === 0) {
        console.log('No duplicates to replace. Exiting early...')
        return
      }
  
      const isDryRun = process.env.DRY_RUN === "true";
      if (isDryRun) {
        console.log('DRY_RUN is set to true. Exiting without writing changes...')
        return
      }
  
      console.log("Writing changes to database...");
      const updateOps = docReplacements.map(x => {
        return { replaceOne: { filter: { _id: x._id }, replacement: x } }
      })
      const updateResult = await collection.bulkWrite(updateOps);
      console.log("Write result", updateResult);

      // Assert
      const documents = await collection.find({}).toArray();
      const json = EJSON.stringify(documents, { relaxed: false });
      expect(json.length).to.equal(originalJson.length);
      expect(documents).to.not.equal(originalDocuments);
      expect(documents[0]._id).to.be.instanceOf(ObjectId);

      const docs2 = await collection.find({$or:[a, b, c, d]}).toArray();
      duplicateIdCount = 0
      for (const doc of docs2) {
        const json = EJSON.stringify(doc)
        const duplicateSubContentIds =
          new DuplicateSubContentIdDetector().getDuplicates(json);
        duplicateIdCount += duplicateSubContentIds.length
      }
      expect(duplicateIdCount).to.equal(0);
    });
  });

  context.skip("prod database contents", () => {
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

      // Act
      const a = {"metadata.mainLibrary":{ $regex : /^H5P.CoursePresentation/ }}
      const b = {"metadata.mainLibrary":"H5P.Column", "parameters.content.content.library":{ $regex : /^H5P.CoursePresentation/ }}
      const c = {"metadata.mainLibrary":"H5P.InteractiveBook", "parameters.chapters.params.content.content.library":{ $regex : /^H5P.CoursePresentation/ }}
      const d = {"metadata.mainLibrary":"H5P.BranchingScenario", "parameters.branchingScenario.content.type.library":{ $regex : /^H5P.CoursePresentation/ }}
      
      const totalDocs = await collection.count({});
      console.log('Total docs', totalDocs)
      const docs = await collection.find({$or:[a, b, c, d]}).toArray();
      console.log('Total docs containing course presentation', docs.length)
      console.log('Executing detection and replacement...')
  
      let duplicateIdCount = 0
      const docReplacements: any[] = []
      for (const doc of docs) {
        const json = EJSON.stringify(doc)
        const duplicateSubContentIds =
          new DuplicateSubContentIdDetector().getDuplicates(json);
        duplicateIdCount += duplicateSubContentIds.length
  
        if (duplicateSubContentIds.length === 0) {
          continue;
        }
  
        const newJson = new SubContentIdReplacer().replaceWithNewIds(
          json,
          duplicateSubContentIds
        );
        docReplacements.push(EJSON.parse(newJson))
      }
  
      console.log("Total duplicate IDs", duplicateIdCount);
      console.log("Total docs affected", docReplacements.length);
  
      if (docReplacements.length === 0) {
        console.log('No duplicates to replace. Exiting early...')
        return
      }
  
      const isDryRun = process.env.DRY_RUN === "true";
      if (isDryRun) {
        console.log('DRY_RUN is set to true. Exiting without writing changes...')
        return
      }
  
      console.log("Writing changes to database...");
      const updateOps = docReplacements.map(x => {
        return { replaceOne: { filter: { _id: x._id }, replacement: x } }
      })
      const updateResult = await collection.bulkWrite(updateOps);
      console.log("Write result", updateResult);

      // Assert
      const documents = await collection.find({}).toArray();
      const json = EJSON.stringify(documents, { relaxed: false });
      expect(json.length).to.equal(originalJsonLength);
      expect(documents.length).to.equal(originalDocumentCount);
      expect(documents[0]._id).to.be.instanceOf(ObjectId);

      const docs2 = await collection.find({$or:[a, b, c, d]}).toArray();
      duplicateIdCount = 0
      for (const doc of docs2) {
        const json = EJSON.stringify(doc)
        const duplicateSubContentIds =
          new DuplicateSubContentIdDetector().getDuplicates(json);
        duplicateIdCount += duplicateSubContentIds.length
      }
      expect(duplicateIdCount).to.equal(0);
    });
  });
});

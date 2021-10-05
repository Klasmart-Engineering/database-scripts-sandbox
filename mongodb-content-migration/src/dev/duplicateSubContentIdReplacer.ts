import { EJSON } from "bson";
import { Collection, MongoClient, ObjectId } from "mongodb";
import { DuplicateSubContentIdDetector } from "../helpers/duplicateSubContentIdDetector";
import { SubContentIdReplacer } from "../helpers/subContentIdReplacer";

export class DuplicateSubContentIdReplacer {
  constructor(
    private readonly mongoClient: MongoClient,
    private readonly mongoCollection: Collection,
    private readonly duplicateSubContentIdDetector = new DuplicateSubContentIdDetector(),
    private readonly subContentIdReplacer = new SubContentIdReplacer()
  ) {}

  public async replaceDuplicates(isDryRun: boolean): Promise<void> {
    // Get existing documents.
    const originalDocuments = await this.mongoCollection.find({}).toArray();
    console.log("Original document count", originalDocuments.length);
    const originalJson = EJSON.stringify(originalDocuments, { relaxed: false });

    // Replace duplicates.
    const duplicateSubContentIds =
      this.duplicateSubContentIdDetector.getDuplicates(originalJson);
    console.log("Duplicate subContentIds", duplicateSubContentIds.length);
    if (duplicateSubContentIds.length === 0) {
      console.log("No duplicate subContentIds. Bailing out early...");
      return;
    }
    const newJson = this.subContentIdReplacer.replaceWithNewIds(
      originalJson,
      duplicateSubContentIds
    );

    const newDocuments = EJSON.parse(newJson, { relaxed: false }) as [];

    if (isDryRun) {
      return;
    }

    // Write changes to Mongo.
    await this.replaceDocumentsInMongo(newDocuments);
  }

  // Not being used because our version of AWS DocumentDB is 3.6, at least in alpha.
  // Transaction feature was added in 4.0.
  private async replaceDocumentsInMongoViaTransaction(
    newDocuments: []
  ): Promise<void> {
    const session = this.mongoClient.startSession();
    try {
      await session.withTransaction(async () => {
        // Delete original documents.
        const deleteResult = await this.mongoCollection.deleteMany(
          {},
          { session }
        );
        console.log("Deleted documents", deleteResult);

        // Insert new documents.
        const insertResult = await this.mongoCollection.insertMany(
          newDocuments,
          { session }
        );
        console.log("Inserted document count", insertResult.insertedCount);
      });
    } finally {
      await session.endSession();
    }
  }

  private async replaceDocumentsInMongo(newDocuments: []): Promise<void> {
    // Delete original documents.
    const deleteResult = await this.mongoCollection.deleteMany({});
    console.log("Deleted documents", deleteResult);

    // Insert new documents.
    const insertResult = await this.mongoCollection.insertMany(newDocuments);
    console.log("Inserted document count", insertResult.insertedCount);
  }
}

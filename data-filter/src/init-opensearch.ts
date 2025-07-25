import { Client } from "@opensearch-project/opensearch";

const OPENSEARCH_URL = "http://localhost:9200";
const OPENSEARCH_INDEX = "documents";

const OPENSEARCH_USERNAME = "admin";
const OPENSEARCH_PASSWORD = "Str0ngPassword!";

const opensearchClient = new Client({
  node: OPENSEARCH_URL,
  ssl: { rejectUnauthorized: false },
  auth: {
    username: OPENSEARCH_USERNAME,
    password: OPENSEARCH_PASSWORD,
  },
});

async function initializeOpenSearch() {
  console.log("Initializing OpenSearch index and adding sample data...");

  try {
    // 1. Check if index exists and delete if it does (for clean runs)
    const indexExists = await opensearchClient.indices.exists({
      index: OPENSEARCH_INDEX,
    });
    if (indexExists.statusCode === 200) {
      console.log(`Index '${OPENSEARCH_INDEX}' already exists. Deleting...`);
      await opensearchClient.indices.delete({ index: OPENSEARCH_INDEX });
      console.log("Index deleted.");
    }

    // 2. Create the index
    await opensearchClient.indices.create({
      index: OPENSEARCH_INDEX,
      body: {
        settings: {
          index: {
            number_of_shards: 1,
            number_of_replicas: 0,
          },
        },
        mappings: {
          properties: {
            name: { type: "text" },
            content: { type: "text" },
            owner_id: { type: "keyword" },
            department: { type: "keyword" },
            library_id: { type: "keyword" },
          },
        },
      },
    });
    console.log(`Index '${OPENSEARCH_INDEX}' created successfully.`);

    // 3. Add sample documents
    const documents = [
      {
        id: 1,
        name: "Admin Audit Log",
        content: "Details of a system audit.",
        owner_id: "admin_user",
        department: "IT",
        library_id: "library-123",
      },
      {
        id: 2,
        name: "Sales Strategy Q3",
        content: "Plan for sales growth.",
        owner_id: "alice",
        department: "sales",
        library_id: "library-123",
      },
      {
        id: 3,
        name: "Marketing Campaign A",
        content: "Promotional materials for product launch.",
        owner_id: "bob",
        department: "marketing",
        library_id: "library-123",
      },
      {
        id: 4,
        name: "Alice's Customer Notes",
        content: "Summary of client interactions.",
        owner_id: "alice",
        department: "sales",
        library_id: "library-123",
      },
      {
        id: 5,
        name: "HR Policy Updates",
        content: "New HR guidelines for employees.",
        owner_id: "carol",
        department: "HR",
        library_id: "library-456",
      }, // Different library
      {
        id: 6,
        name: "Confidential IT Report",
        content: "Security vulnerability assessment.",
        owner_id: "admin_user",
        department: "IT",
        library_id: "library-123",
      },
    ];

    const bulkOperations = documents.flatMap((doc) => [
      { index: { _index: OPENSEARCH_INDEX, _id: doc.id } },
      doc,
    ]);

    const bulkResponse = await opensearchClient.bulk({
      body: bulkOperations,
      refresh: "wait_for",
    });

    if (bulkResponse.body.errors) {
      console.error(
        "Errors during bulk indexing:",
        JSON.stringify(bulkResponse.body.items, null, 2)
      );
    } else {
      console.log(`Successfully indexed ${documents.length} documents.`);
    }
  } catch (error) {
    console.error("Error initializing OpenSearch:", error);
  }
}

initializeOpenSearch().catch(console.error);

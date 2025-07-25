import axios from "axios";
import { Client } from "@opensearch-project/opensearch";

// --- Configuration ---
const OPA_URL = "http://localhost:8181";
const OPENSEARCH_URL = "http://localhost:9200";
const OPENSEARCH_INDEX = "documents";

// Add your admin credentials here (MUST MATCH docker-compose.yml)
const OPENSEARCH_USERNAME = "admin";
const OPENSEARCH_PASSWORD = "Str0ngPassword!";

// OpenSearch Client (no auth for simplicity as disabled in docker-compose)
const opensearchClient = new Client({
  node: OPENSEARCH_URL,
  ssl: { rejectUnauthorized: false },
  auth: {
    username: OPENSEARCH_USERNAME,
    password: OPENSEARCH_PASSWORD,
  },
});

// --- Interfaces ---
interface UserContext {
  id: string;
  roles: string[];
  department?: string;
}

// --- Function to get filter from OPA ---
async function getOpaFilter(
  user: UserContext,
  libraryId: string
): Promise<any> {
  const inputData = {
    input: {
      // For v1/data, the 'input' key goes directly in the request body
      user: user,
      library_id: libraryId, // Pass the library ID to OPA
    },
  };

  try {
    console.log(
      `\n--- Calling OPA for user: ${user.id} (Library: ${libraryId}) ---`
    );
    const response = await axios.post(
      `${OPA_URL}/v1/data/document_filter/query_filter`, // <--- CHANGED ENDPOINT
      inputData, // <--- INPUT IS PASSED DIRECTLY
      { headers: { "Content-Type": "application/json" } }
    );

    const opaResult = response.data;

    if (opaResult && "result" in opaResult) {
      const parsedFilter = opaResult.result;
      console.log(
        "OPA parsed filter (OpenSearch DSL):",
        JSON.stringify(parsedFilter, null, 2)
      );
      return parsedFilter;
    } else {
      console.warn("OPA did not return a filter. Defaulting to match_none.");
      return { match_none: {} }; // Fallback to deny all
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(`Error calling OPA: ${error.message}`);
      if (error.response) {
        console.error(`OPA response status: ${error.response.status}`);
        console.error(
          `OPA response data: ${JSON.stringify(error.response.data)}`
        );
      }
    } else {
      console.error("Unknown error calling OPA:", error);
    }
    return { match_none: {} }; // Fail safe: deny all on error
  }
}

// --- Function to query OpenSearch ---
async function searchDocuments(user: UserContext, libraryId: string) {
  console.log(
    `\n--- Searching documents for user: ${user.id} in library: ${libraryId} ---`
  );

  // Get the filter from OPA
  const opaQueryFilter = await getOpaFilter(user, libraryId);

  // Construct the final OpenSearch query body
  const queryBody = {
    query: opaQueryFilter,
    size: 100, // Max number of results to return
  };

  try {
    console.log("OpenSearch Query Body:", JSON.stringify(queryBody, null, 2));
    const response = await opensearchClient.search({
      index: OPENSEARCH_INDEX,
      body: queryBody,
    });

    console.log(`\n--- Results for ${user.id} (Library ${libraryId}) ---`);
    if (response.statusCode === 200 && response.body?.hits?.hits) {
      const hits = response.body.hits.hits;
      console.log(`Found ${hits.length} documents:`);
      hits.forEach((hit: any) => {
        console.log(
          `  - ID: ${hit._id}, Name: ${hit._source.name}, Owner: ${hit._source.owner_id}, Dept: ${hit._source.department}, Library: ${hit._source.library_id}`
        );
      });
    } else {
      console.log("No documents found or error in OpenSearch response.");
      console.log(
        "OpenSearch Response:",
        JSON.stringify(response.body, null, 2)
      );
    }
  } catch (error) {
    console.error(`Error searching OpenSearch: ${error}`);
  }
}

// --- Main Execution ---
async function main() {
  const libraryId = "library-123"; // The library being accessed

  const adminUser: UserContext = { id: "admin_user", roles: ["admin"] };
  const aliceEmployee: UserContext = {
    id: "alice",
    roles: ["employee"],
    department: "sales",
  };
  const bobEmployee: UserContext = {
    id: "bob",
    roles: ["employee"],
    department: "marketing",
  };
  const guestUser: UserContext = { id: "guest_user", roles: ["guest"] }; // No specific policy rule

  // Ensure OpenSearch has data before querying
  // You should run `npm run init-opensearch` first
  console.log(
    "Ensure OpenSearch is initialized with sample data (run 'npm run init-opensearch' first)."
  );

  await searchDocuments(adminUser, libraryId);
  await searchDocuments(aliceEmployee, libraryId);
  await searchDocuments(bobEmployee, libraryId);
  await searchDocuments(guestUser, libraryId);
}

// Run the main function
main().catch(console.error);

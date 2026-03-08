import { Pool } from "pg";
import { getConfig } from "@claricore/config";

export const pool = new Pool({
  connectionString: getConfig().databaseUrl
});

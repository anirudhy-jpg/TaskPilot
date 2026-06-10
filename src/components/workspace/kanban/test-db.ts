import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function testConnection() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase URL or Key");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get table description or try to select position
  const { data, error } = await supabase
    .from("tasks")
    .select("id, title, position, priority")
    .limit(1);

  if (error) {
    console.error("Error selecting from tasks table:", error);
  } else {
    console.log("Success! Columns structure:", data);
  }
}

testConnection();

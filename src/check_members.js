const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

// Parse env file manually
const envPath = path.join(__dirname, "../.env.local");
let supabaseUrl = "";
let supabaseKey = "";

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  const lines = envContent.split("\n");
  for (const line of lines) {
    if (line.startsWith("NEXT_PUBLIC_SUPABASE_URL=")) {
      supabaseUrl = line.split("=")[1].trim();
    }
    if (line.startsWith("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=")) {
      supabaseKey = line.split("=")[1].trim();
    }
  }
}

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase URL/key in env file", { supabaseUrl, supabaseKey });
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Checking workspace_members and profiles...");
  
  // 1. Fetch workspace members
  const { data: members, error: memError } = await supabase
    .from("workspace_members")
    .select(`
      *,
      profile:profiles(email, full_name, avatar_url)
    `);
  
  if (memError) {
    console.error("Error querying workspace_members directly:", memError);
  } else {
    console.log("Workspace members count:", members?.length);
    console.log("Sample workspace member profile:", JSON.stringify(members?.[0] || {}, null, 2));
  }

  // 2. Fetch project members
  const { data: projMembers, error: pmError } = await supabase
    .from("project_members")
    .select("*");
  
  if (pmError) {
    console.error("Error querying project_members:", pmError);
  } else {
    console.log("Project members count:", projMembers?.length);
    console.log("Sample project member:", JSON.stringify(projMembers?.[0] || {}, null, 2));
  }

  // 3. Fetch profiles
  const { data: profiles, error: profError } = await supabase
    .from("profiles")
    .select("*")
    .limit(3);
  
  if (profError) {
    console.error("Error querying profiles:", profError);
  } else {
    console.log("Sample profiles count:", profiles?.length);
    console.log("Sample profiles:", JSON.stringify(profiles || [], null, 2));
  }
}

run().catch(console.error);

// One-off: try to sign in with a given email + password to confirm whether
// the password is the problem.
//
// Run with: node --env-file=.env.local scripts/test-login.mjs <email> <password>
import { createClient } from "@supabase/supabase-js";

const [, , email, password] = process.argv;
if (!email || !password) {
  console.error("Usage: node scripts/test-login.mjs <email> <password>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anonKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const client = createClient(url, anonKey);
const { data, error } = await client.auth.signInWithPassword({ email, password });

if (error) {
  console.log("❌ signInWithPassword failed");
  console.log("  status:", error.status);
  console.log("  code:  ", error.code);
  console.log("  msg:   ", error.message);
  process.exit(0);
}

console.log("✓ signInWithPassword succeeded — password is correct.");
console.log("  user.id:", data.user?.id);
console.log("  email:  ", data.user?.email);

// Admin helper: set a user's password via the service role.
// Usage: node --env-file=.env.local scripts/set-password.mjs <email> <new-password>
import { createClient } from "@supabase/supabase-js";

const [, , email, newPassword] = process.argv;
if (!email || !newPassword) {
  console.error("Usage: node scripts/set-password.mjs <email> <new-password>");
  process.exit(1);
}

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

let user = null;
let page = 1;
while (page <= 50) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
  if (error) {
    console.error("listUsers failed:", error.message);
    process.exit(1);
  }
  user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (user) break;
  if (data.users.length < 100) break;
  page += 1;
}

if (!user) {
  console.error("No user found with email:", email);
  process.exit(1);
}

const { error } = await admin.auth.admin.updateUserById(user.id, { password: newPassword });
if (error) {
  console.error("updateUserById failed:", error.message);
  process.exit(1);
}

console.log(`✓ Password updated for ${email}`);

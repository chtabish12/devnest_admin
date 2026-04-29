// Diagnostic: look up a user by email via the Supabase admin API and print
// everything that matters for "why can't they log in".
//
// Run with:  node --env-file=.env.local scripts/check-user.mjs <email>
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/check-user.mjs <email>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRole) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Paginate listUsers until we find a match.
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
  console.log(`❌ No auth.users row for ${email}`);
  console.log("   → User was never created. Re-create from /admin/employees/new.");
  process.exit(0);
}

console.log("✓ Found auth.users row");
console.log("  id:                  ", user.id);
console.log("  email:               ", user.email);
console.log("  email_confirmed_at:  ", user.email_confirmed_at ?? "(NOT confirmed)");
console.log("  last_sign_in_at:     ", user.last_sign_in_at ?? "(never)");
console.log("  banned_until:        ", user.banned_until ?? "(not banned)");
console.log("  created_at:          ", user.created_at);
console.log("  user_metadata:       ", JSON.stringify(user.user_metadata));

const { data: profile, error: pErr } = await admin
  .from("profiles")
  .select("*")
  .eq("id", user.id)
  .maybeSingle();

if (pErr) {
  console.log("\n⚠ Profile query failed:", pErr.message);
} else if (!profile) {
  console.log("\n❌ No profiles row — the handle_new_user trigger may have failed.");
  console.log("   Without a profile, the layout redirects them away from /dashboard.");
} else {
  console.log("\n✓ Found profiles row");
  console.log("  role:        ", profile.role);
  console.log("  full_name:   ", profile.full_name);
  console.log("  is_active:   ", profile.is_active);
}

console.log("\nDiagnosis:");
if (!user.email_confirmed_at) {
  console.log("  → email_confirmed_at is NULL. Sign-in is blocked until confirmed.");
  console.log("    Fix: in Supabase dashboard → Authentication → Users → click user");
  console.log("    → 'Send confirmation email' OR set email_confirmed_at via SQL:");
  console.log(`    update auth.users set email_confirmed_at = now() where id = '${user.id}';`);
} else if (user.banned_until && new Date(user.banned_until) > new Date()) {
  console.log("  → User is banned until", user.banned_until);
} else if (!profile) {
  console.log("  → Missing profile row. Re-insert with:");
  console.log(`    insert into profiles (id, email, full_name, role) values ('${user.id}', '${user.email}', '${user.email}', 'employee');`);
} else {
  console.log("  → Auth + profile look healthy. If they still can't log in, the password");
  console.log("    they're using is wrong. Reset it from Supabase dashboard or via:");
  console.log("    Authentication → Users → click user → 'Reset password'.");
}

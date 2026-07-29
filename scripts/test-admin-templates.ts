import assert from "node:assert/strict";
import {
  checkSupabaseDatabaseTarget,
  getDatabaseProjectRef,
  getSupabaseProjectRef,
} from "../src/lib/supabase/project-target";
import {
  classifyTemplateAdminError,
  isTemplateSchemaOutdated,
} from "../src/lib/templates/admin-errors";

const projectRef = "abcdefghijklmnopqrst";
assert.equal(getSupabaseProjectRef(`https://${projectRef}.supabase.co`), projectRef);
assert.equal(
  getDatabaseProjectRef(`postgresql://postgres.${projectRef}:secret@aws-0-eu-west-3.pooler.supabase.com:6543/postgres`),
  projectRef,
);
assert.equal(
  getDatabaseProjectRef(`postgresql://postgres:secret@db.${projectRef}.supabase.co:5432/postgres`),
  projectRef,
);
assert.equal(
  checkSupabaseDatabaseTarget({
    supabaseUrl: `https://${projectRef}.supabase.co`,
    databaseUrl: `postgresql://postgres.${projectRef}:secret@pooler.supabase.com:6543/postgres`,
  }).matches,
  true,
);
assert.equal(
  checkSupabaseDatabaseTarget({
    supabaseUrl: `https://${projectRef}.supabase.co`,
    databaseUrl: "postgresql://postgres.%5Bref%5D:%5Bpassword%5D@pooler.supabase.com:6543/postgres",
  }).matches,
  false,
);

assert.equal(
  isTemplateSchemaOutdated({
    code: "42703",
    message: 'column Template.originalUrl does not exist',
  }),
  true,
);
assert.deepEqual(
  classifyTemplateAdminError(
    { code: "PGRST204", message: "Could not find the originalUrl column in the schema cache" },
    "TEMPLATE_CREATE_FAILED",
  ),
  {
    code: "TEMPLATE_SCHEMA_OUTDATED",
    error: "La base Supabase doit être mise à jour avant de gérer les affiches.",
    status: 503,
  },
);
assert.equal(
  classifyTemplateAdminError(new Error("network"), "TEMPLATE_UPLOAD_FAILED").code,
  "TEMPLATE_UPLOAD_FAILED",
);

console.log("Admin template tests passed");

/**
 * Creates the custom_access_token_hook PostgreSQL function required by Supabase Auth.
 * The hook injects tenant_id, role, name, tenant_name into the JWT claims.
 * Run with: pnpm --filter @avimus/db exec tsx scripts/create-auth-hook.ts
 */

import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

const envPath = path.resolve(__dirname, '../.env')
if (fs.existsSync(envPath)) dotenv.config({ path: envPath })

async function main() {
  const prisma = new PrismaClient()
  try {
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
      RETURNS jsonb
      LANGUAGE plpgsql
      STABLE
      SECURITY DEFINER
      SET search_path = public
      AS $$
      DECLARE
        claims jsonb;
        v_tenant_id text;
        v_role      text;
        v_name      text;
        v_tenant_name text;
      BEGIN
        SELECT u.tenant_id, u.role, u.name, t.name
          INTO v_tenant_id, v_role, v_name, v_tenant_name
          FROM public.users u
          JOIN public.tenants t ON t.id = u.tenant_id
         WHERE u.id = (event->>'user_id');

        claims := event->'claims';

        IF v_tenant_id IS NOT NULL THEN
          claims := jsonb_set(claims, '{tenant_id}',   to_jsonb(v_tenant_id));
          claims := jsonb_set(claims, '{role}',        to_jsonb(v_role));
          claims := jsonb_set(claims, '{name}',        to_jsonb(v_name));
          claims := jsonb_set(claims, '{tenant_name}', to_jsonb(v_tenant_name));
        END IF;

        RETURN jsonb_set(event, '{claims}', claims);
      END;
      $$;
    `)
    console.log('Function created.')

    await prisma.$executeRawUnsafe(`
      GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
    `)
    console.log('Grant executed.')

    await prisma.$executeRawUnsafe(`
      REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM PUBLIC, anon, authenticated;
    `)
    console.log('Revoke done.')

    console.log('\ncustom_access_token_hook is ready.')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(e => { console.error(e); process.exit(1) })

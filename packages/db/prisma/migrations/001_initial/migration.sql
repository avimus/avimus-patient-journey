-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'starter',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_tenant_id_email_key" ON "users"("tenant_id", "email");
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");

CREATE TABLE "patients" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "birth_date" TIMESTAMP(3) NOT NULL,
    "contact_phone" TEXT,
    "contact_email" TEXT,
    "lgpd_legal_basis" TEXT NOT NULL DEFAULT 'tratamento de saúde — art. 11, II, f, LGPD',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "patients_tenant_id_cpf_key" ON "patients"("tenant_id", "cpf");
CREATE INDEX "patients_tenant_id_idx" ON "patients"("tenant_id");

CREATE TABLE "protocols" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "protocols_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "protocols_tenant_id_idx" ON "protocols"("tenant_id");

CREATE TABLE "protocol_steps" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "protocol_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,
    "prerequisite_step_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "branch_conditions" JSONB NOT NULL DEFAULT '{}',
    "due_days" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "protocol_steps_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "protocol_steps_protocol_id_idx" ON "protocol_steps"("protocol_id");
CREATE INDEX "protocol_steps_tenant_id_idx" ON "protocol_steps"("tenant_id");

CREATE TABLE "patient_journeys" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "protocol_id" TEXT NOT NULL,
    "protocol_snapshot" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" TEXT NOT NULL,
    CONSTRAINT "patient_journeys_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "patient_journeys_tenant_id_idx" ON "patient_journeys"("tenant_id");
CREATE INDEX "patient_journeys_patient_id_idx" ON "patient_journeys"("patient_id");

CREATE TABLE "journey_steps" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" TEXT NOT NULL,
    "journey_id" TEXT NOT NULL,
    "protocol_step_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'bloqueado',
    "executed_at" TIMESTAMP(3),
    "executed_by_id" TEXT,
    "result" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "journey_steps_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "journey_steps_journey_id_protocol_step_id_key" ON "journey_steps"("journey_id", "protocol_step_id");
CREATE INDEX "journey_steps_tenant_id_idx" ON "journey_steps"("tenant_id");
CREATE INDEX "journey_steps_journey_id_idx" ON "journey_steps"("journey_id");

CREATE TABLE "data_access_logs" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "data_access_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "data_access_logs_tenant_id_idx" ON "data_access_logs"("tenant_id");
CREATE INDEX "data_access_logs_patient_id_idx" ON "data_access_logs"("patient_id");

-- Foreign Keys
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "patients" ADD CONSTRAINT "patients_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "protocols" ADD CONSTRAINT "protocols_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "protocol_steps" ADD CONSTRAINT "protocol_steps_protocol_id_fkey" FOREIGN KEY ("protocol_id") REFERENCES "protocols"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "patient_journeys" ADD CONSTRAINT "patient_journeys_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "patient_journeys" ADD CONSTRAINT "patient_journeys_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "patient_journeys" ADD CONSTRAINT "patient_journeys_protocol_id_fkey" FOREIGN KEY ("protocol_id") REFERENCES "protocols"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "patient_journeys" ADD CONSTRAINT "patient_journeys_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "journey_steps" ADD CONSTRAINT "journey_steps_journey_id_fkey" FOREIGN KEY ("journey_id") REFERENCES "patient_journeys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "journey_steps" ADD CONSTRAINT "journey_steps_executed_by_id_fkey" FOREIGN KEY ("executed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "data_access_logs" ADD CONSTRAINT "data_access_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "data_access_logs" ADD CONSTRAINT "data_access_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "data_access_logs" ADD CONSTRAINT "data_access_logs_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Row Level Security (Defence-in-Depth)
ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_self_read" ON "tenants"
  FOR SELECT USING (id = (auth.jwt() ->> 'tenant_id')::text);

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "users"
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::text);

ALTER TABLE "patients" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "patients"
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::text);

ALTER TABLE "protocols" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "protocols"
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::text);

ALTER TABLE "protocol_steps" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "protocol_steps"
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::text);

ALTER TABLE "patient_journeys" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "patient_journeys"
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::text);

ALTER TABLE "journey_steps" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "journey_steps"
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::text);

ALTER TABLE "data_access_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_read" ON "data_access_logs"
  FOR SELECT USING (tenant_id = (auth.jwt() ->> 'tenant_id')::text);
CREATE POLICY "tenant_insert" ON "data_access_logs"
  FOR INSERT WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::text);

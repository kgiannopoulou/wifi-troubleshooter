-- A single admin account is enough here (unlike the e-commerce app's
-- multi-user signup) — this app has one editor (the domain expert building
-- the diagnostic tree) and many anonymous public users just walking it.
CREATE TABLE admins (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE router_models (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE, -- used in URLs, e.g. /diagnose/speedport-plus
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE symptoms (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL, -- e.g. "No WiFi signal", "Slow WiFi"
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A fix write-up, kept separate from nodes/options so the same resolution
-- (e.g. "Power cycle the router") can be reused as the endpoint of several
-- different question paths instead of being retyped for each one.
CREATE TABLE resolutions (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  fix_steps TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One question in a diagnostic tree, scoped to a specific router model +
-- symptom combination. `is_root` marks the first question shown when a
-- user starts diagnosing that model+symptom pair.
CREATE TABLE nodes (
  id SERIAL PRIMARY KEY,
  router_model_id INTEGER NOT NULL REFERENCES router_models(id) ON DELETE CASCADE,
  symptom_id INTEGER NOT NULL REFERENCES symptoms(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  is_root BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- At most one root node per model+symptom pair, so the public "start
-- diagnosing" flow always has exactly one unambiguous entry point.
CREATE UNIQUE INDEX nodes_one_root_per_tree_idx
  ON nodes (router_model_id, symptom_id)
  WHERE is_root;

CREATE INDEX nodes_router_model_symptom_idx ON nodes (router_model_id, symptom_id);

-- One answer choice on a question node. Each option leads either to
-- another question (next_node_id) or straight to a resolution
-- (resolution_id) — never both, never neither, enforced below.
CREATE TABLE node_options (
  id SERIAL PRIMARY KEY,
  node_id INTEGER NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  label TEXT NOT NULL, -- e.g. "Yes", "No", "Blinking amber"
  sort_order INTEGER NOT NULL DEFAULT 0,
  next_node_id INTEGER REFERENCES nodes(id) ON DELETE SET NULL,
  resolution_id INTEGER REFERENCES resolutions(id) ON DELETE SET NULL,
  CONSTRAINT node_options_exactly_one_target CHECK (
    (next_node_id IS NOT NULL)::int + (resolution_id IS NOT NULL)::int = 1
  )
);

CREATE INDEX node_options_node_id_idx ON node_options (node_id);

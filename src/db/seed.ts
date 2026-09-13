// Seeds enough data for the app to be immediately demoable:
// - all 4 router models the user actually supported
// - a starter set of WiFi symptom categories
// - ONE fully-worked diagnostic tree (Speedport Plus / "No WiFi signal") so
//   the public flow has something real to walk end-to-end; the rest are
//   meant to be filled in afterward through the admin panel
// - the single admin account, from ADMIN_EMAIL / ADMIN_PASSWORD in .env
import bcrypt from "bcryptjs";
import { pool } from "../lib/db";

const ROUTER_MODELS = [
  { name: "Speedport Plus", slug: "speedport-plus" },
  { name: "Speedport Plus 2", slug: "speedport-plus-2" },
  { name: "ZTE H1600", slug: "zte-h1600" },
  { name: "RDK Vantiva", slug: "rdk-vantiva" },
];

const SYMPTOMS = [
  { name: "No WiFi signal", slug: "no-wifi-signal" },
  { name: "Connects but no internet", slug: "connects-but-no-internet" },
  { name: "Slow WiFi", slug: "slow-wifi" },
  { name: "Frequent disconnects", slug: "frequent-disconnects" },
];

async function upsertRouterModel(name: string, slug: string): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO router_models (name, slug) VALUES ($1, $2)
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [name, slug]
  );
  return rows[0].id;
}

async function upsertSymptom(name: string, slug: string): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO symptoms (name, slug) VALUES ($1, $2)
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [name, slug]
  );
  return rows[0].id;
}

async function insertResolution(title: string, fixSteps: string): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO resolutions (title, fix_steps) VALUES ($1, $2) RETURNING id`,
    [title, fixSteps]
  );
  return rows[0].id;
}

async function insertNode(
  routerModelId: number,
  symptomId: number,
  questionText: string,
  isRoot: boolean
): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO nodes (router_model_id, symptom_id, question_text, is_root)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [routerModelId, symptomId, questionText, isRoot]
  );
  return rows[0].id;
}

async function insertOption(
  nodeId: number,
  label: string,
  sortOrder: number,
  target: { nextNodeId?: number; resolutionId?: number }
) {
  await pool.query(
    `INSERT INTO node_options (node_id, label, sort_order, next_node_id, resolution_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [nodeId, label, sortOrder, target.nextNodeId ?? null, target.resolutionId ?? null]
  );
}

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.log("Skipping admin seed: ADMIN_EMAIL / ADMIN_PASSWORD not set in .env");
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO admins (email, password_hash) VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [email, passwordHash]
  );
  console.log(`Seeded admin account: ${email}`);
}

// Builds one complete, realistic diagnostic tree for Speedport Plus /
// "No WiFi signal" so the app has a fully working example out of the box.
// Everything else (other models, other symptoms) is meant to be authored
// through the admin panel afterward.
async function seedExampleTree(routerModelId: number, symptomId: number) {
  const existing = await pool.query(
    `SELECT 1 FROM nodes WHERE router_model_id = $1 AND symptom_id = $2 LIMIT 1`,
    [routerModelId, symptomId]
  );
  if ((existing.rowCount ?? 0) > 0) {
    console.log("Example tree already seeded, skipping.");
    return;
  }

  const checkPowerRes = await insertResolution(
    "Check the power connection",
    "1. Confirm the power adapter is firmly plugged into both the router and the wall outlet.\n" +
      "2. Try a different power outlet.\n" +
      "3. Unplug the router, wait 30 seconds, then plug it back in.\n" +
      "4. Wait 2-3 minutes for it to fully boot before checking again."
  );
  const reEnableWifiRes = await insertResolution(
    "Re-enable WiFi on the router",
    "1. Check for a dedicated WLAN/WiFi button on the router and press it once.\n" +
      "2. If unsure, log into the router's admin page and confirm WiFi/WLAN is turned on " +
      "under the wireless settings.\n" +
      "3. Wait about a minute after enabling for the network to broadcast."
  );
  const restartRouterRes = await insertResolution(
    "Restart the router",
    "1. Unplug the router's power for 30 seconds.\n" +
      "2. Plug it back in and wait 2-3 minutes for a full restart.\n" +
      "3. Check from a device close to the router whether the network name (SSID) now appears."
  );
  const deviceSideRes = await insertResolution(
    "Likely a device-side WiFi issue",
    "Since other devices can see the network, the router itself is broadcasting correctly.\n" +
      "1. On the affected device, forget/remove the saved network and reconnect from scratch.\n" +
      "2. Toggle the device's WiFi off and on.\n" +
      "3. Restart the affected device.\n" +
      "4. If it still can't see the network, the device's WiFi adapter/driver is the next thing to check."
  );

  const wlanLightNode = await insertNode(
    routerModelId,
    symptomId,
    "Is the WLAN/WiFi light on the router lit or blinking?",
    false
  );
  const otherDevicesNode = await insertNode(
    routerModelId,
    symptomId,
    "Can other devices see the WiFi network name (SSID) in their WiFi list?",
    false
  );
  const rootNode = await insertNode(
    routerModelId,
    symptomId,
    "Is the router powered on? (Is the power LED lit?)",
    true
  );

  await insertOption(rootNode, "No", 0, { resolutionId: checkPowerRes });
  await insertOption(rootNode, "Yes", 1, { nextNodeId: wlanLightNode });

  await insertOption(wlanLightNode, "No, it's off", 0, { resolutionId: reEnableWifiRes });
  await insertOption(wlanLightNode, "Yes, it's lit", 1, { nextNodeId: otherDevicesNode });

  await insertOption(otherDevicesNode, "No, no devices see it", 0, {
    resolutionId: restartRouterRes,
  });
  await insertOption(otherDevicesNode, "Yes, some devices see it", 1, {
    resolutionId: deviceSideRes,
  });

  console.log("Seeded example diagnostic tree: Speedport Plus / No WiFi signal");
}

async function main() {
  const modelIds: Record<string, number> = {};
  for (const model of ROUTER_MODELS) {
    modelIds[model.slug] = await upsertRouterModel(model.name, model.slug);
  }
  console.log(`Seeded ${ROUTER_MODELS.length} router models.`);

  const symptomIds: Record<string, number> = {};
  for (const symptom of SYMPTOMS) {
    symptomIds[symptom.slug] = await upsertSymptom(symptom.name, symptom.slug);
  }
  console.log(`Seeded ${SYMPTOMS.length} symptoms.`);

  await seedExampleTree(modelIds["speedport-plus"], symptomIds["no-wifi-signal"]);
  await seedAdmin();

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

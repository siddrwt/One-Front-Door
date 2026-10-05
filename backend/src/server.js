const app = require('./app');
const connectDB = require('./config/db');
const config = require('./config');
const Organization = require('./models/Organization');
const { OUR_DOMAINS } = require('./config/domains');

async function seedDefaultOrg() {
  const existing = await Organization.findOne({ orgId: config.defaultOrgId });
  if (!existing) {
    await Organization.create({
      orgId: config.defaultOrgId,
      name: 'Bennett University',
      enabledDomains: OUR_DOMAINS,
    });
    console.log(`[seed] created default organization "${config.defaultOrgId}"`);
    return;
  }
  // The domain list changed (4 -> 5); bring an existing org up to date.
  const same =
    existing.enabledDomains.length === OUR_DOMAINS.length &&
    OUR_DOMAINS.every((d) => existing.enabledDomains.includes(d));
  if (!same) {
    existing.enabledDomains = OUR_DOMAINS;
    await existing.save();
    console.log(`[seed] updated enabledDomains for "${config.defaultOrgId}": ${OUR_DOMAINS.join(', ')}`);
  }
}

async function start() {
  await connectDB();
  await seedDefaultOrg();

  app.listen(config.port, () => {
    console.log(`[server] listening on port ${config.port} (env: ${config.nodeEnv})`);
    console.log(`[server] USE_MOCK_AI=${config.useMockAi} — real AI service at ${config.aiServiceUrl}`);
  });
}

start().catch((err) => {
  console.error('[server] failed to start:', err);
  process.exit(1);
});

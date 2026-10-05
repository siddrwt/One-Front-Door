const Organization = require('../models/Organization');
const config = require('../config');
const { DEPARTMENTS } = require('../config/domains');

async function getDomains(req, res, next) {
  try {
    // Org comes from the logged-in student's token, not the query string.
    const orgId = req.user.orgId || config.defaultOrgId;
    const org = await Organization.findOne({ orgId }).lean();
    if (!org) {
      return res.status(404).json({ error: 'not_found', message: `No organization with orgId "${orgId}".` });
    }
    const departments = Object.fromEntries(org.enabledDomains.map((d) => [d, DEPARTMENTS[d] || null]));
    return res.json({ orgId: org.orgId, name: org.name, enabledDomains: org.enabledDomains, departments });
  } catch (err) {
    next(err);
  }
}

module.exports = { getDomains };

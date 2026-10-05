const mongoose = require('mongoose');
const { OUR_DOMAINS } = require('../config/domains');

const organizationSchema = new mongoose.Schema(
  {
    orgId: { type: String, required: true, unique: true, index: true }, // e.g. "bennett-university"
    name: { type: String, required: true },
    enabledDomains: {
      type: [String],
      required: true,
      default: OUR_DOMAINS,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Organization', organizationSchema);

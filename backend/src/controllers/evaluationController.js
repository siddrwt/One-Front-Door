const { computeRoutingAccuracy, computeEndToEndStats } = require('../services/evaluationService');

async function getEvaluation(req, res, next) {
  try {
    const { orgId } = req.query;
    const [routingAccuracy, endToEnd] = await Promise.all([
      computeRoutingAccuracy({ orgId }),
      computeEndToEndStats({ orgId }),
    ]);
    return res.json({ routingAccuracy, endToEnd });
  } catch (err) {
    next(err);
  }
}

module.exports = { getEvaluation };

const mongoose = require('mongoose');
const NewShop = require('../models/NewShop');
// Use a loose schema for agent printers collection
const AgentPrinter = mongoose.model('AgentPrinter', new mongoose.Schema({}, { strict: false }), 'printers');

/**
 * Sync agent printers with newshops.printers for a given shopId
 * @param {string} shopId
 */
async function syncPrinters(shopId) {
  // Step 1: Fetch shop
  const shop = await NewShop.findOne({ shopId });
  if (!shop) throw new Error('Shop not found');

  // Step 2: Fetch agent printers for this shop only
  const agentPrinters = await AgentPrinter.find({ shop_id: shop.shopId });
  let printersConfig = shop.printers || [];

  // Step 3: Deduplicate agent printers by printername
  const uniqueAgentPrintersMap = new Map();
  for (const agent of agentPrinters) {
    uniqueAgentPrintersMap.set(agent.printername, agent);
  }
  const uniqueAgentPrinters = Array.from(uniqueAgentPrintersMap.values());

  // Step 4: Sync each unique agent printer
  for (const agent of uniqueAgentPrinters) {
    // Match only by agentDetected.name (printername)
    let config = printersConfig.find(p => p.agentDetected && p.agentDetected.name === agent.printername);

    // Manual override check
    const useAgent = config?.useAgentValues !== false;

    if (config) {
      // Always update status and currentJob
      config.status = agent.status;
      if (!config.agentDetected) config.agentDetected = {};
      config.agentDetected.status = agent.status;
      config.agentDetected.currentJob = agent.currentjob;

      if (useAgent) {
        // Only update agent fields if useAgentValues is true
        config.agentDetected.name = agent.printername;
        config.agentDetected.capabilities = [{
          type: agent.printertype === 'color and bw' ? 'Color+B/W' : agent.printertype === 'color' ? 'Color' : agent.printertype === 'bw' ? 'B/W' : agent.printertype,
          duplex: agent.duplexsupported,
          paperSizes: agent.papersupported || agent.paperssupported || []
        }];
        config.agentDetected.maxCopies = agent.maxcopies;
        config.agentDetected.lastSeen = agent.last_seen;
        config.agentDetected.features = agent.features;
        config.allowed = agent.allowed;
      }
      // manualOverride untouched except status/currentJob
    } else {
      // Add new printer if no match found (no printerId)
      printersConfig.push({
        status: agent.status,
        allowed: agent.allowed,
        useAgentValues: true,
        agentDetected: {
          name: agent.printername,
          status: agent.status,
          capabilities: [{
            type: agent.printertype === 'color and bw' ? 'Color+B/W' : agent.printertype === 'color' ? 'Color' : agent.printertype === 'bw' ? 'B/W' : agent.printertype,
            duplex: agent.duplexsupported,
            paperSizes: agent.papersupported || agent.paperssupported || []
          }],
          maxCopies: agent.maxcopies,
          lastSeen: agent.last_seen,
          features: agent.features,
          currentJob: agent.currentjob
        },
        manualOverride: {}
      });
    }
  }

  // Step 4: Mark missing printers offline (no printerId check)
  for (const config of printersConfig) {
    // Only mark offline if not present in agentPrinters
    const match = agentPrinters.find(agent => {
      const agentType = agent.printertype === 'color and bw' ? 'Color+B/W' : agent.printertype === 'color' ? 'Color' : agent.printertype === 'bw' ? 'B/W' : agent.printertype;
      const pType = config.agentDetected?.capabilities?.[0]?.type;
      return (
        config.agentDetected?.capabilities?.[0]?.duplex === agent.duplexsupported &&
        config.agentDetected?.maxCopies === agent.maxcopies &&
        JSON.stringify(config.agentDetected?.capabilities?.[0]?.paperSizes || []) === JSON.stringify(agent.papersupported || agent.paperssupported || []) &&
        pType === agentType
      );
    });
    if (!match) {
      config.status = 'offline';
    }
  }

  // Step 5: Save updated config
  shop.printers = printersConfig;
  await shop.save();
}

module.exports = syncPrinters;

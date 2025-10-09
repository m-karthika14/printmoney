const mongoose = require('mongoose');

// Capability schema (for both agent + manual)
const CapabilitySchema = new mongoose.Schema({
  type: { type: String, enum: ["B/W", "Color", "Color+B/W"] },
  duplex: { type: Boolean, default: false },
  paperSizes: [String] // e.g. ["A4", "A3", "Letter"]
}, { _id: false }); // no separate _id for each capability

// Printer schema
const PrinterSchema = new mongoose.Schema({
  printerId: { type: String, required: true }, // unique per shop
  status: { type: String, default: "offline" }, // online/offline

  // Real values (always updated by agent, not editable by shopkeeper)
  agentDetected: {
    name: { type: String },
    status: { type: String }, // Ready / Busy / Error
    capabilities: [CapabilitySchema]
  },

  // Editable by shopkeeper (optional overrides)
  manualOverride: {
    name: { type: String },
    notes: { type: String },
    capabilities: [CapabilitySchema]
  },

  // Whether to show real agent values or manual overrides
  useAgentValues: { type: Boolean, default: true }
});

// ✅ Virtual property to get active printer config
PrinterSchema.virtual('activeConfig').get(function () {
  const agentData = this.agentDetected?.toObject?.() || {};
  const hasAgentData = agentData.name || agentData.status || (agentData.capabilities && agentData.capabilities.length > 0);

  if (this.manualOverride && Object.keys(this.manualOverride.toObject?.() || {}).length > 0) {
    const manualData = this.manualOverride.toObject();

    if (this.useAgentValues && hasAgentData) {
      return agentData;
    }

    return {
      name: manualData.name || agentData.name,
      status: agentData.status,
      capabilities: manualData.capabilities?.length > 0
        ? manualData.capabilities
        : agentData.capabilities,
      notes: manualData.notes
    };
  }

  return agentData;
});

// Service schema
const ServiceSchema = new mongoose.Schema({
  id: String,
  name: String,
  selected: Boolean,
  isCustom: Boolean,
  price: String
}, { _id: false });

// Agent schema (only status + installedAt, no Agent ID)
const AgentSchema = new mongoose.Schema({
  status: { type: String, enum: ["pending", "installed", "error"], default: "pending" },
  installedAt: { type: Date }
}, { _id: false });

// Main shop schema
const NewShopSchema = new mongoose.Schema({
  shopName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  password: { type: String, required: true }, // Store hashed password in production
  shopId: { type: String, required: true, unique: true },
  apiKey: { type: String, required: true, unique: true },

  description: { type: String, default: "" },

  isOpen: { type: Boolean, default: true }, // <-- Added field for shop open/close status

  workingHours: {
    monday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
    tuesday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
    wednesday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
    thursday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
    friday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
    saturday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
    sunday: { open: String, close: String, isClosed: { type: Boolean, default: false } }
  },

  plan: {
    id: String,
    name: String,
    price: String,
    features: [String]
  },

  payment: {
    method: {
      type: String,
      enum: ["UPI", "Card", "NetBanking"],
      required: false
    },
    status: {
      type: String,
      enum: ["pending", "success", "failed", "refunded"],
      default: "pending"
    },
    transactionId: { type: String },
    orderId: { type: String },
    gatewayResponse: { type: Object },

    details: {
      upiId: { type: String },
      cardLast4: { type: String },
      cardType: { type: String },
      bank: { type: String }
    },

    completed: { type: Boolean, default: false }
  },

  // ✅ Updated agent section
  agent: AgentSchema,

  printers: [PrinterSchema],

  pricing: {
    bwSingle: String,
    colorSingle: String,
    bwDouble: String,
    colorDouble: String
  },

  services: [ServiceSchema],

  createdAt: { type: Date, default: Date.now }
});

// Make virtuals appear in JSON outputs
NewShopSchema.set('toJSON', { virtuals: true });
NewShopSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('NewShop', NewShopSchema);

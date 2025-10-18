const mongoose = require('mongoose');

// Capability schema (for both agent + manual)
const CapabilitySchema = new mongoose.Schema({
  type: { type: String, enum: ["B/W", "Color", "Color+B/W", "color"] },
  duplex: { type: Boolean, default: false },
  paperSizes: [String] // e.g. ["A4", "A3", "Letter"]
}, { _id: false }); // no separate _id for each capability

// Printer schema
const PrinterSchema = new mongoose.Schema({
  // unique per shop (sourced from agent.printer_id)
  printerid: { type: String },
  status: { type: String, default: "offline" }, // "online" | "offline"
  // Shopkeeper controlled allow/deny for allocation
  manualStatus: { type: String, enum: ["on", "off", "pending_off"], default: "on" },
  // additional agent metadata
  port: { type: String, default: null },
  lastUpdate: { type: Date },

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
  status: { type: String, enum: ["pending", "installed", "error", "completed"], default: "pending" },
  installedAt: { type: Date }
}, { _id: false });

// Main shop schema
const NewShopSchema = new mongoose.Schema({
  shopName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  password: { type: String, required: true }, // Store hashed password in production
  // Canonical shop identifier (string like "T47439k")
  shop_id: { type: String, required: true, unique: true },
  // Backward-compat: keep legacy field if present in DB; prefer shop_id everywhere
  shopId: { type: String },
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
      enum: ["UPI", "Card", "NetBanking", "cash", "credit"], // Added 'cash' and 'credit'
      required: false
    },
    status: {
      type: String,
      enum: ["pending", "success", "failed", "refunded", "completed"], // Added 'completed'
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

  // Daily stats snapshots (map-style): { 'YYYY-MM-DD': { totalJobsCompleted, createdAt } }
  dailystats: {
    type: Map,
    of: new mongoose.Schema({
      totalJobsCompleted: { type: Number, default: 0 },
      createdAt: { type: Date, default: Date.now }
    }, { _id: false }),
    default: {}
  },


  // Hierarchical revenue rollups: daily/weekly/monthly/yearly
  totalRevenue: {
    daily: {
      type: Map,
      of: new mongoose.Schema({ totalRevenue: { type: Number, default: 0 }, createdAt: { type: Date, default: Date.now } }, { _id: false }),
      default: {}
    },
    weekly: {
      type: Map,
      of: new mongoose.Schema({ totalRevenue: { type: Number, default: 0 }, createdAt: { type: Date, default: Date.now } }, { _id: false }),
      default: {}
    },
    monthly: {
      type: Map,
      of: new mongoose.Schema({ totalRevenue: { type: Number, default: 0 }, createdAt: { type: Date, default: Date.now } }, { _id: false }),
      default: {}
    },
    yearly: {
      type: Map,
      of: new mongoose.Schema({ totalRevenue: { type: Number, default: 0 }, createdAt: { type: Date, default: Date.now } }, { _id: false }),
      default: {}
    }
  },

  pricing: {
    bwSingle: String,
    colorSingle: String,
    bwDouble: String,
    colorDouble: String,
    customDiscounts: [
      {
        name: String,
        discountPercent: Number
      }
    ],
    fixedDocuments: [
      {
        docName: String,
        docUrl: String,
        price: Number
      }
    ],
    paperSizePricing: {
      A3: {
        bwSingle: { type: Number, default: 0 },
        colorSingle: { type: Number, default: 0 },
        bwDouble: { type: Number, default: 0 },
        colorDouble: { type: Number, default: 0 }
      },
      A5: {
        bwSingle: { type: Number, default: 0 },
        colorSingle: { type: Number, default: 0 },
        bwDouble: { type: Number, default: 0 },
        colorDouble: { type: Number, default: 0 }
      },
      Legal: {
        bwSingle: { type: Number, default: 0 },
        colorSingle: { type: Number, default: 0 },
        bwDouble: { type: Number, default: 0 },
        colorDouble: { type: Number, default: 0 }
      },
      Letter: {
        bwSingle: { type: Number, default: 0 },
        colorSingle: { type: Number, default: 0 },
        bwDouble: { type: Number, default: 0 },
        colorDouble: { type: Number, default: 0 }
      },
      Photo: {
        bwSingle: { type: Number, default: 0 },
        colorSingle: { type: Number, default: 0 },
        bwDouble: { type: Number, default: 0 },
        colorDouble: { type: Number, default: 0 }
      },
      Custom: {
        bwSingle: { type: Number, default: 0 },
        colorSingle: { type: Number, default: 0 },
        bwDouble: { type: Number, default: 0 },
        colorDouble: { type: Number, default: 0 }
      }
    }
  },

  services: [ServiceSchema],

  // Stores relative URL to the generated QR PNG (e.g., /uploads/qrcodes/<shop_id>.png)
  qr_code_url: { type: String },

  createdAt: { type: Date, default: Date.now }
});

// Keep shop_id and legacy shopId in sync (compatibility)
NewShopSchema.pre('validate', function(next) {
  if (!this.shop_id && this.shopId) this.shop_id = this.shopId;
  if (!this.shopId && this.shop_id) this.shopId = this.shop_id;
  next();
});

// Make virtuals appear in JSON outputs
NewShopSchema.set('toJSON', { virtuals: true });
NewShopSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('NewShop', NewShopSchema);

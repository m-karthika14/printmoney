const mongoose = require('mongoose');

// Capability schema (for both agent + manual)
const CapabilitySchema = new mongoose.Schema({
  type: { type: String, enum: ["Color", "B/W", "Color+B/W"], required: true },
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
  // legacy alias will be exposed as a virtual 'shopId' (stored as shop_id)
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

  // Lifetime counters for quick access without scanning maps
  lifetimeJobsCompleted: { type: Number, default: 0 },
  lifetimeRevenue: { type: Number, default: 0 }
,

  pricing: {
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
      A4: {
        bwSingle: { type: Number, default: 0 },
        colorSingle: { type: Number, default: 0 },
        bwDouble: { type: Number, default: 0 },
        colorDouble: { type: Number, default: 0 },
        selected: { type: Boolean, default: false }
      },
      A3: {
        bwSingle: { type: Number, default: 0 },
        colorSingle: { type: Number, default: 0 },
        bwDouble: { type: Number, default: 0 },
        colorDouble: { type: Number, default: 0 },
        selected: { type: Boolean, default: false }
      },
      A5: {
        bwSingle: { type: Number, default: 0 },
        colorSingle: { type: Number, default: 0 },
        bwDouble: { type: Number, default: 0 },
        colorDouble: { type: Number, default: 0 },
        selected: { type: Boolean, default: false }
      },
      Legal: {
        bwSingle: { type: Number, default: 0 },
        colorSingle: { type: Number, default: 0 },
        bwDouble: { type: Number, default: 0 },
        colorDouble: { type: Number, default: 0 },
        selected: { type: Boolean, default: false }
      },
      Letter: {
        bwSingle: { type: Number, default: 0 },
        colorSingle: { type: Number, default: 0 },
        bwDouble: { type: Number, default: 0 },
        colorDouble: { type: Number, default: 0 },
        selected: { type: Boolean, default: false }
      },
      Photo: {
        bwSingle: { type: Number, default: 0 },
        colorSingle: { type: Number, default: 0 },
        bwDouble: { type: Number, default: 0 },
        colorDouble: { type: Number, default: 0 },
        selected: { type: Boolean, default: false }
      },
      Custom: {
        bwSingle: { type: Number, default: 0 },
        colorSingle: { type: Number, default: 0 },
        bwDouble: { type: Number, default: 0 },
        colorDouble: { type: Number, default: 0 },
        selected: { type: Boolean, default: false }
      }
    }
  },

  services: [ServiceSchema],

  // Stores relative URL to the generated QR PNG (e.g., /uploads/qrcodes/<shop_id>.png)
  qr_code_url: { type: String },

  createdAt: { type: Date, default: Date.now }
});

// Keep shop_id and legacy shopId in sync (compatibility)
// Provide a virtual alias 'shopId' that maps to the canonical 'shop_id'.
// This keeps existing code that reads/writes `shopId` working while storage stays under `shop_id`.
NewShopSchema.virtual('shopId')
  .get(function() { return this.shop_id; })
  .set(function(v) { this.shop_id = v; });

// Make virtuals appear in JSON outputs
NewShopSchema.set('toJSON', { virtuals: true });
NewShopSchema.set('toObject', { virtuals: true });

// Ensure paper size `selected` flags reflect whether any price fields are set (>0)
NewShopSchema.pre('save', function (next) {
  try {
    const psp = this.pricing && this.pricing.paperSizePricing;
    if (!psp) return next();

    Object.keys(psp).forEach(size => {
      const paper = psp[size] || {};

      const hasValue =
        (paper.bwSingle && paper.bwSingle > 0) ||
        (paper.colorSingle && paper.colorSingle > 0) ||
        (paper.bwDouble && paper.bwDouble > 0) ||
        (paper.colorDouble && paper.colorDouble > 0);

      paper.selected = !!hasValue;
    });

    return next();
  } catch (err) {
    return next(err);
  }
});

// Ensure updates done via findOneAndUpdate also keep selected flags in sync
NewShopSchema.pre('findOneAndUpdate', function (next) {
  try {
    const update = this.getUpdate() || {};

    // normalize $set
    const set = update.$set || {};

    // Collect candidate paper-size changes from either a full object or individual keys
    const candidates = {};

    // Case A: full object provided: update.pricing.paperSizePricing or $set['pricing.paperSizePricing']
    const fullPsp = (update.pricing && update.pricing.paperSizePricing) || set['pricing.paperSizePricing'];
    if (fullPsp && typeof fullPsp === 'object') {
      Object.keys(fullPsp).forEach(size => {
        candidates[size] = fullPsp[size] || {};
      });
    }

    // Case B: individual fields like $set['pricing.paperSizePricing.A4.bwSingle'] = 5
    Object.keys(set).forEach(k => {
      const m = k.match(/^pricing\.paperSizePricing\.([^\.]+)\.(bwSingle|colorSingle|bwDouble|colorDouble)$/);
      if (m) {
        const size = m[1];
        const field = m[2];
        candidates[size] = candidates[size] || {};
        candidates[size][field] = set[k];
      }
    });

    // If no candidates, nothing to do
    if (Object.keys(candidates).length === 0) return next();

    // For each candidate size compute selected and inject into $set
    Object.keys(candidates).forEach(size => {
      const paper = candidates[size] || {};

      const hasValue =
        (paper.bwSingle && paper.bwSingle > 0) ||
        (paper.colorSingle && paper.colorSingle > 0) ||
        (paper.bwDouble && paper.bwDouble > 0) ||
        (paper.colorDouble && paper.colorDouble > 0);

      set[`pricing.paperSizePricing.${size}.selected`] = !!hasValue;
    });

    // assign back to update
    update.$set = Object.assign({}, update.$set || {}, set);
    this.setUpdate(update);

    return next();
  } catch (err) {
    return next(err);
  }
});

module.exports = mongoose.model('NewShop', NewShopSchema);

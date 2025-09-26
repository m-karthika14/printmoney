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
    capabilities: [CapabilitySchema]   // Capabilities stored here
  },

  // Editable by shopkeeper (optional overrides)
  manualOverride: {
    name: { type: String },
    notes: { type: String },
    capabilities: [CapabilitySchema]   // Capabilities stored here
  },

  // Whether to show real agent values or manual overrides
  useAgentValues: { type: Boolean, default: true }
});

// ✅ Virtual property to get active printer config
PrinterSchema.virtual('activeConfig').get(function() {
  const agentData = this.agentDetected.toObject();
  
  if (this.manualOverride && Object.keys(this.manualOverride.toObject()).length > 0) {
    const manualData = this.manualOverride.toObject();
    
    if (this.useAgentValues) {
      return agentData;
    }
    
    return {
      name: manualData.name || agentData.name,
      status: agentData.status,
      capabilities: manualData.capabilities && manualData.capabilities.length > 0 
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
  isCustom: Boolean
});

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

  workingHours: {
    monday: { open: String, close: String },
    tuesday: { open: String, close: String },
    wednesday: { open: String, close: String },
    thursday: { open: String, close: String },
    friday: { open: String, close: String },
    saturday: { open: String, close: String },
    sunday: { open: String, close: String }
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
    required: true 
  },
  status: { 
    type: String, 
    enum: ["pending", "success", "failed", "refunded"], 
    default: "pending" 
  },
  transactionId: { type: String }, // Gateway payment_id
  orderId: { type: String },       // Gateway order_id
  gatewayResponse: { type: Object }, // Store safe metadata (from Razorpay/Stripe/Paytm)

  // Optional safe identifiers
  details: {
    upiId: { type: String },             // e.g. "user@upi" (non-sensitive)
    cardLast4: { type: String },         // e.g. "****1234"
    cardType: { type: String },          // e.g. "VISA / Mastercard"
    bank: { type: String }               // e.g. "HDFC Bank"
  },

  completed: { type: Boolean, default: false }
},


  agent: {
    status: String,
    installedAt: Date
  },

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

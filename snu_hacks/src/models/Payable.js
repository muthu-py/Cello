import mongoose from 'mongoose';

const payableSchema = new mongoose.Schema({
  business_id: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['supplier', 'rent', 'salary', 'utilities', 'maintenance', 'other'],
    required: true
  },
  name: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  accumulated_amount: {
    type: Number,
    default: function() {
      // Default initialized to amount
      return this.amount;
    }
  },
  remaining_minutes: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'overdue'],
    default: 'pending'
  },
  penalty: {
    type: {
      type: String,
      enum: ['fixed', 'percentage', 'none'],
      default: 'none'
    },
    value: {
      type: Number,
      default: 0
    }
  },
  flexibility: {
    type: String,
    enum: ['low', 'medium', 'high'],
    required: true
  },
  is_critical_supplier: {
    type: Boolean,
    default: false
  },
  is_recurring: {
    type: Boolean,
    default: false
  },
  recurrence_interval_minutes: {
    type: Number,
    default: 0
  },
  last_updated_time: {
    type: Date,
    default: Date.now
  },
  operational_category: {
    type: String,
    enum: ['core', 'support'],
    required: true
  },
  metadata: {
    notes: String,
    recurring: Boolean,
    tags: [String]
  }
}, {
  timestamps: true,
  collection: 'payables'
});

const Payable = mongoose.model('Payable', payableSchema);

export default Payable;

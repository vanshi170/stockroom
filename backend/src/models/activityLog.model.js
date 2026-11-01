const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: [true, 'Activity action is required'],
      trim: true,
      index: true,
    },
    entityType: {
      type: String,
      required: [true, 'Entity type is required'],
      enum: ['Product', 'Supplier', 'Category', 'PurchaseOrder', 'StockMovement', 'System'],
      index: true,
    },
    entityId: {
      type: String,
      required: false,
      default: null,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Activity description is required'],
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    versionKey: false,
  }
);

// Compound index for querying audit logs by entity and date
activityLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });

// Static helper to create activity log safely
activityLogSchema.statics.record = async function (logData) {
  try {
    return await this.create(logData);
  } catch (error) {
    // Return null on failure; caller service handles non-blocking behavior
    throw error;
  }
};

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

module.exports = ActivityLog;


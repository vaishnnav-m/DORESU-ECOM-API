const mongoose = require("mongoose");

const offerSchema = mongoose.Schema(
  {
    offerName: {
      type: String,
      required: true,
    },
    offerType: {
      type: String,
      enum: ["product", "category"],
      required: true,
    },
    offerValue: {
      type: Number,
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required:true
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("offer", offerSchema);

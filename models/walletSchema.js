const mongoose = require("mongoose");

const walletSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    balance: {
      type: Number,
      required: true,
    },
    histories: [
      {
        type: {
          type: String,
          enum: ["Credit", "Debit"],
          required: true,
        },
        amount: {
          type: Number,
          required: true,
        },
        date: {
          type: Date,
          default: Date.now,
        },
        remark:{
          type:String,
          required:true
        }
      },
    ],
    
  },
  { timestamps: true }
);

module.exports = mongoose.model('wallet',walletSchema);
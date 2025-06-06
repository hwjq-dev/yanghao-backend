import mongoose from "mongoose";

const TgAccounPassCodeSchema = new mongoose.Schema(
  {
    password: { type: String, required: false, default: null },
    type: { type: String, unique: true, index: true },
  },
  {
    timestamps: {
      currentTime: () => {
        const now = new Date();
        now.setTime(now.getTime() + 7 * 60 * 60 * 1000);
        return now;
      },
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  }
);

export const TgAccounPassCodeModel = mongoose.model(
  "TgAccounPassCodeModel",
  TgAccounPassCodeSchema
);

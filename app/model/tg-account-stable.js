import mongoose from "mongoose";

const TgAccountStableSchema = new mongoose.Schema(
  {
    tgId: { type: String, required: true, index: true },
    username: { type: String, required: true, index: true },
    nickname: { type: String, required: true },
    phoneNumber: { type: String, required: true, index: true },
    serverIp: { type: String, require: false, default: "空白", index: true },
    accountBio: { type: String, required: true },
    accountType: { type: String, required: true, index: true },
    isPremium: { type: Boolean, required: true },
    profileUrl: { type: String, require: false, default: "空白" },
    profileCount: { type: Number, require: false, default: 0 },
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

export const TgAccountStableModel = mongoose.model(
  "TgAccountStableModel",
  TgAccountStableSchema
);

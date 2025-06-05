import mongoose from "mongoose";

const TgAccountSchema = new mongoose.Schema(
  {
    tgId: { type: String, required: true },
    username: { type: String, required: true },
    nickname: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    serverIp: { type: String, required: true },
    accountBio: { type: String, required: true },
    accountType: { type: String, required: true },
    isPremium: { type: Boolean, required: true },
    profileUrl: { type: String },
    profileCount: { type: Number },
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

export const TgAccountModel = mongoose.model("TgAccountModel", TgAccountSchema);

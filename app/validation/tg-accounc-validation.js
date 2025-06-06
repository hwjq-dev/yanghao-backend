import { boolean, number, object, optional, string } from "valibot";

const TgAccountSchema = object({
  tgId: string(),
  username: string(),
  nickname: string(),
  phoneNumber: optional(string()),
  serverIp: optional(string()),
  accountBio: optional(string()),
  accountType: string(),
  isPremium: boolean(),
  profileUrl: optional(string()),
  profileCount: optional(number()),
});

export default TgAccountSchema;

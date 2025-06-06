import {
  boolean,
  minLength,
  nonEmpty,
  object,
  optional,
  pipe,
  safeParse,
  string,
} from "valibot";

const TgAccountCreateSchema = object({
  tgId: pipe(
    string("不对应字段类型"),
    nonEmpty("输入需求字段"),
    minLength(2, "账号类型太短")
  ),
  username: pipe(
    string("不对应字段类型"),
    nonEmpty("输入需求字段"),
    minLength(2, "账号类型太短")
  ),
  nickname: pipe(
    string("不对应字段类型"),
    nonEmpty("输入需求字段"),
    minLength(2, "账号类型太短")
  ),
  phoneNumber: pipe(
    string("不对应字段类型"),
    nonEmpty("输入需求字段"),
    minLength(2, "账号类型太短")
  ),
  serverIp: optional(string()),
  accountBio: pipe(
    string("不对应字段类型"),
    nonEmpty("输入需求字段"),
    minLength(2, "账号类型太短")
  ),
  accountType: pipe(
    string("不对应字段类型"),
    nonEmpty("输入需求字段"),
    minLength(2, "账号类型太短")
  ),
  isPremium: boolean(),
});

export const validateAccountCreate = (data) => {
  return safeParse(TgAccountCreateSchema, data);
};

import { minLength, nonEmpty, object, pipe, safeParse, string } from "valibot";

const TgAccountTypeValidationSchema = object({
  type: pipe(
    string("不对应字段类型"),
    nonEmpty("输入需求字段"),
    minLength(2, "账号类型太短")
  ),
});

const TgAccountTypeUpdateValidationSchema = object({
  id: pipe(
    string("不对应字段类型"),
    nonEmpty("输入需求字段"),
    minLength(2, "账号类型太短")
  ),
  type: pipe(
    string("不对应字段类型"),
    nonEmpty("输入需求字段"),
    minLength(2, "账号类型太短")
  ),
});

export const validateAccountType = (data, type) => {
  if (type == "update") {
    return safeParse(TgAccountTypeUpdateValidationSchema, data);
  }
  return safeParse(TgAccountTypeValidationSchema, data);
};

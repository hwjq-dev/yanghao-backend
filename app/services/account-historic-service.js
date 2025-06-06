import { TgAccountStableModel } from "../model/tg-account-stable.js";
import { isEmpty } from "radash";

//-- Used only in bot
export async function insertHistoricAccount(data) {
  try {
    const existAccount = await TgAccountStableModel.findOne({ ...data });

    if (!isEmpty(existAccount)) {
      return { success: false, message: "数据已存在", exist: true };
    }

    const newAccount = new TgAccountStableModel({ ...data });

    await newAccount.save();

    return { success: true, message: "创建成功", exist: false };
  } catch (error) {
    console.log(error);
    return { success: false, message: error?.message, exist: false };
  }
}

export async function updateHistoricAccount(data, id) {
  try {
    const existAccount = await TgAccountStableModel.findOne({
      ...data,
    });

    if (!isEmpty(existAccount)) {
      return { success: false, message: "记录已存在", flag: true };
    }

    await TgAccountStableModel.updateOne({ _id: { $eq: id } }, { ...data });

    return { success: true, message: "更新成功", flag: false };
  } catch (error) {
    return { success: false, message: error?.message, flag: false };
  }
}

export async function deleteHistoricAccount(id) {
  try {
    const existAccount = await TgAccountStableModel.findOne({
      _id: id,
    });

    if (isEmpty(existAccount)) {
      return { success: false, message: "未记录存在", flag: true };
    }

    await TgAccountStableModel.deleteOne({ _id: id });

    return { success: true, message: "删除成功", flag: false };
  } catch (error) {
    return { success: false, message: error?.message, flag: false };
  }
}

export async function getHistoricAccount(id) {
  try {
    const existAccount = await TgAccountStableModel.findOne({
      _id: id,
    });

    if (isEmpty(existAccount)) {
      return { success: false, message: "未记录存在", flag: true, data: null };
    }

    return { success: true, message: "成功", flag: false, data: existAccount };
  } catch (error) {
    return { success: false, message: error?.message, flag: false, data: null };
  }
}

export async function getHistoricAccounts(queryParams) {
  try {
    const {
      search = "",
      page = 1,
      pageSize = 2,
      sortBy,
      order = "acs",
      filterFields = "",
      startDate,
      endDate,
    } = queryParams || {};

    const parsePage = parseInt(page);
    const parsePageSize = parseInt(pageSize);

    //-- Balculate skip
    const skip = (parsePage - 1) * parsePageSize;
    const limit = parsePageSize;

    //-- Sort
    const sortOrder = (order || "").toLowerCase() == "asc" ? 1 : -1;
    const sort = sortBy ? { [sortBy]: sortOrder } : {};

    const fields = filterFields
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean);

    const startDateFilter = startDate
      ? { $gte: new Date(startDate).setUTCHours(0, 0, 0, 0) }
      : {};
    const endDateFilter = endDate
      ? { $lt: new Date(endDate).setUTCHours(24, 0, 0, 0) }
      : {};

    const dateFilter = { ...startDateFilter, ...endDateFilter };

    //-- Build filter
    const searchWithoutFilter =
      !(fields || [])?.length && search
        ? {
            $or: [
              { username: { $regex: search, $options: "i" } },
              { tgId: { $regex: search, $options: "i" } },
              { phoneNumber: { $regex: search, $options: "i" } },
              { serverIp: { $regex: search, $options: "i" } },
              { accountType: { $regex: search, $options: "i" } },
            ],
          }
        : {};

    const searchBuilder =
      (fields || [])?.length && search
        ? {
            $and: fields?.map((field) => ({
              [field]: { $regex: search, $options: "i" },
            })),
          }
        : searchWithoutFilter;

    const filterDate =
      Object.keys(dateFilter)?.length > 0 ? { createdAt: dateFilter } : {};

    const filters = {
      ...searchBuilder,
      ...filterDate,
    };

    const total = (await TgAccountStableModel.countDocuments(filters)) || 0;

    //-- Paginated result
    const data = await TgAccountStableModel.find(filters)
      .skip(skip)
      .limit(limit)
      .sort(sort);

    return {
      success: true,
      message: "OK",
      data,
      page: +page,
      pageCount: Math.ceil(total / limit),
      total,
    };
  } catch (error) {
    console.log(error);
    return { success: false, message: error?.message, flag: false, data: null };
  }
}

import { cluster, isEmpty } from "radash";
import { connectRedis } from "../redis-config/index.js";
import { CACHE_KEYS } from "../lib/cache-key.js";
import { TgAccounPassCodeModel } from "../model/tg-account-password.js";
const redis = connectRedis();

//--- Used only in bot
export async function getAccountType() {
  // Get value from cache
  const responseCacheData = await redis.get(CACHE_KEYS.accountType);
  const cacheData = JSON.parse(responseCacheData);

  if (!isEmpty(cacheData)) return cacheData;

  const responses = await TgAccounPassCodeModel.find();
  const data = responses?.map((x) => ({ type: x?.type }));

  const transformData = cluster(
    data.map((x) => ({ text: x.type, callback_data: x.type })),
    2
  );

  // Cache 24 hours
  await redis.setex(
    CACHE_KEYS.accountType,
    60 * 60 * 24,
    JSON.stringify(transformData)
  );

  return transformData;
}

export async function insertAccountType(data) {
  try {
    const existAccount = await TgAccounPassCodeModel.findOne({
      type: data?.type,
    });

    if (!isEmpty(existAccount)) {
      return { success: false, message: "数据已存在", exist: true };
    }

    const newAccount = new TgAccounPassCodeModel({ type: data?.type });
    await newAccount.save();

    return { success: true, message: "创建成功", exist: false };
  } catch (error) {
    return { success: false, message: error?.message, exist: false };
  }
}

export async function updateAccountType(data) {
  try {
    const existAccount = await TgAccounPassCodeModel.findOne({
      type: data?.type,
    });

    if (!isEmpty(existAccount)) {
      return { success: false, message: "记录已存在", flag: true };
    }

    await TgAccounPassCodeModel.updateOne(
      { _id: { $eq: data?.id } },
      { type: data?.type }
    );

    return { success: true, message: "更新成功", flag: false };
  } catch (error) {
    return { success: false, message: error?.message, flag: false };
  }
}

export async function getOneAccountType(id) {
  try {
    const existAccount = await TgAccounPassCodeModel.findOne({
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

export async function deleteAccountType(id) {
  try {
    const existAccount = await TgAccounPassCodeModel.findOne({
      _id: id,
    });

    if (isEmpty(existAccount)) {
      return { success: false, message: "未记录存在", flag: true };
    }

    await TgAccounPassCodeModel.deleteOne({ _id: id });

    return { success: true, message: "删除成功", flag: false };
  } catch (error) {
    return { success: false, message: error?.message, flag: false };
  }
}

export async function getAllAccountType(queryParams) {
  try {
    const {
      search = "",
      page = 1,
      pageSize = 2,
      sortBy,
      order = "acs",
      filterDate,
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

    //-- Build filter
    const searchType = {
      type: { $regex: search, $options: "i" },
    };

    const startDateFilter = startDate
      ? { $gte: new Date(startDate).setUTCHours(0, 0, 0, 0) }
      : {};
    const endDateFilter = endDate
      ? { $lt: new Date(endDate).setUTCHours(24, 0, 0, 0) }
      : {};
    const dateFilter = filterDate
      ? { [filterDate]: { ...startDateFilter, ...endDateFilter } }
      : {};

    const filters =
      search || filterDate ? { ...searchType, ...dateFilter } : {};

    const total = (await TgAccounPassCodeModel.countDocuments(filters)) || 0;

    //-- Paginated result
    const data = await TgAccounPassCodeModel.find(filters)
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
    return { success: false, message: error?.message, flag: false, data: null };
  }
}

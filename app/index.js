import dotenv from "dotenv";
import express from "express";
import { safeParse } from "valibot";
import telegrambot from "node-telegram-bot-api";
import { connectDB } from "./database-config/index.js";
import { connectRedis } from "./redis-config/index.js";
import { generateAccessToken } from "./lib/json-web-token.js";
import TgAccountSchema from "./validation/tg-accounc-validation.js";
import { authenticateToken } from "./middleware/index.js";
import { TgAccountModel } from "./model/tg-account.js";
import { TgAccountStableModel } from "./model/tg-account-stable.js";
import { TgAccounPassCodeModel } from "./model/tg-account-password.js";
import { isEqual, isEmpty, omit, cluster } from "radash";

import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

// import rateLimit from "express-rate-limit";
import compression from "compression";
import { validateAccountType } from "./validation/tg-account-type-validation.js";
import {
  deleteAccountType,
  getAccountType,
  getAllAccountType,
  getOneAccountType,
  insertAccountType,
  updateAccountType,
} from "./services/get-type.js";
import { CACHE_KEYS } from "./lib/cache-key.js";

dotenv.config();
const PORT = process.env.PORT || 3000;

const app = express();
app.use(helmet());
app.use((__, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", [
    "https://yanghao1.site",
    "https://d09xkgp1-3000.asse.devtunnels.ms",
    "http://localhost",
  ]);
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, DELETE"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true"); // If needed
  next();
});

app.disable("x-powered-by");
app.use(cors());

//Rate Limiting
// const limiter = rateLimit({
//   windowMs: 5 * 60 * 1000, // 15 minutes
//   max: 800,
//   standardHeaders: true,
//   legacyHeaders: false,
// });
// app.use(limiter);

// Logging
app.use(morgan("combined"));

// Compression
app.use(compression());

//-- Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//-- DB Connection
connectDB();
const redis = connectRedis();

//-- Bot Configuration
const token = process.env.BOT_TOKEN;
const bot = new telegrambot(token, { polling: true });

//-- Handle contact sharing
bot.on("contact", async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const phoneNumber = msg.contact.phone_number;

  await bot.deleteMessage(chatId, msg.message_id);

  try {
    await redis.del(chatId);
    const chatMember = await bot.getChat(userId);
    const bio = chatMember?.bio || "No bio available";
    await redis.setex(
      chatId,
      60 * 8,
      JSON.stringify({ phoneNumber, accountBio: bio })
    );
  } catch (error) {
    // console.log("Something went wrong.");
  }
});

//--- 从机器人打卡
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const prompt = `
  *👉 养号机器人* , 立即点击下面按钮 👇
  `;

  bot.sendMessage(chatId, prompt, {
    parse_mode: "MarkdownV2",
    reply_markup: {
      inline_keyboard: [[{ text: "打卡", callback_data: "option1" }]],
    },
  });
});

// --- 机器人逻辑
bot.on("callback_query", async (callbackQuery) => {
  try {
    const msg = callbackQuery.message;
    const data = callbackQuery.data;
    const user = callbackQuery.from;
    const accountsType = ((await getAccountType()) || [])?.flatMap((x) => x);
    const matchType = accountsType?.find((x) => x?.text == data);
    const chatMember = await bot.getChat(user.id);
    const cacheData = await redis.get(msg.chat.id);
    const phone = JSON.parse(cacheData)?.phoneNumber;

    if (data === "option1") {
      bot.sendMessage(
        msg.chat.id,
        "👇 请点击以下__*立即共享手机号安妞*__为共享您的电话号码",
        {
          reply_markup: {
            keyboard: [[{ text: "📞 立即共享手机号", request_contact: true }]],
            one_time_keyboard: true,
            resize_keyboard: true,
          },
          parse_mode: "MarkdownV2",
        }
      );
      return;
    }

    if (!isEmpty(matchType)) {
      const accountTypeCacheKey = CACHE_KEYS.$getAccountType(user.id);
      const accountTypeMessageId = await redis.get(accountTypeCacheKey);
      const accountTypeParsed = JSON.parse(accountTypeMessageId);
      const deleteChatId = +accountTypeParsed?.chatId;
      const deleteMessageId = +accountTypeParsed?.messageId + 1;

      const insertData = {
        tgId: `${user.id}`,
        isPremium: false,
        accountBio: chatMember?.bio || "空白",
        accountType: matchType?.text || "空白",
        nickname: `${user.first_name} ${user.last_name}`,
        phoneNumber: phone || "空白",
        username: user.username,
        serverIp: "空白",
        profileUrl: "空白",
        profileCount: 0,
      };

      // 查找增加记录是否存在
      const account = await TgAccountModel.findOne({
        tgId: user.id,
      });

      if (isEmpty(account)) {
        const realtimeAccount = new TgAccountModel(insertData);
        const historicAccount = new TgAccountStableModel(insertData);

        await realtimeAccount.save();
        await historicAccount.save();

        bot.sendMessage(msg.chat.id, "✅ 打卡已成功");
        return;
      }

      const synitizeFields = {
        tgId: account.tgId,
        isPremium: account.isPremium,
        accountBio: account.accountBio,
        accountType: account.accountType,
        nickname: account.nickname,
        phoneNumber: account.phoneNumber,
        username: account.username,
        serverIp: account.serverIp,
        profileUrl: account.profileUrl,
        profileCount: account.profileCount,
      };

      if (!isEqual(insertData, synitizeFields)) {
        await TgAccountModel.updateOne({ tgId: user.id }, { ...insertData });

        const historicAccount = new TgAccountStableModel(insertData);

        await historicAccount.save();
        await bot.deleteMessage(deleteChatId, deleteMessageId);
        await redis.del(msg.chat.id);
        await redis.del(accountTypeCacheKey);
        bot.sendMessage(msg.chat.id, "✅ 打卡已成功");
        return;
      }

      await bot.deleteMessage(deleteChatId, deleteMessageId);
      await redis.del(msg.chat.id);
      await redis.del(accountTypeCacheKey);
      bot.sendMessage(msg.chat.id, "✅ 打卡已成功");
    }
    // Acknowledge the callback
    bot.answerCallbackQuery(callbackQuery.id);
  } catch (error) {
    console.log(error?.message);
  }
});

bot.on("message", async (msg) => {
  const userId = msg.from.id;
  const cacheKey = CACHE_KEYS.$getAccountType(userId);

  if (msg.contact) {
    const accountType = await getAccountType();
    const options = {
      reply_markup: {
        inline_keyboard: accountType,
      },
    };

    bot.sendMessage(userId, "👇 请选择账号类型 ：", options);

    await redis.setex(
      cacheKey,
      60 * 24,
      JSON.stringify({ chatId: msg.chat.id, messageId: msg.message_id })
    );
  }
});

/**
 * Telegram will push something to this endpoint when changed was capture by botAPI
 */
app.post(`/webhook/telegram/${token}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

/**
 * Generate api token
 */
app.get("/api/token", async function (__, res) {
  const accessToken = generateAccessToken();
  return res.status(200).json({
    status: 200,
    message: "Access token generated successfully",
    accessToken,
  });
});

/**
 * Create account record
 */
app.post("/tg_account", authenticateToken, async function (req, res) {
  const data = req?.body || {};
  const result = safeParse(TgAccountSchema, data);

  if (!result.success) {
    return res.status(400).json({
      status: 400,
      message: "Missing fields or malformed data.",
      errors: result.error,
    });
  }

  try {
    const cacheData = await redis.get(result.output.tgId);
    const transformData = JSON.parse(cacheData);

    if (!Boolean(cacheData))
      return res.status(500).json({
        statusCode: 500,
        message: "Cache expired",
      });

    const insertData = {
      ...result.output,
      phoneNumber: transformData?.phoneNumber,
      accountBio: transformData?.accountBio,
    };

    const data = await TgAccountModel.findOneAndUpdate(
      { tgId: result.output.tgId },
      { $set: insertData },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    //===
    //  Include the TgAccountStableModel update here:
    const stableAccount = await TgAccountStableModel.findOne({
      tgId: result.output.tgId,
      username: insertData?.username,
      nickname: insertData?.nickname,
      serverIp: insertData?.serverIp,
      accountBio: insertData?.accountBio,
      accountType: insertData?.accountType,
      phoneNumber: insertData?.phoneNumber,
      profileUrl: insertData?.profileUrl,
      profileCount: insertData?.profileCount,
    });

    if (stableAccount?.tgId) {
      const isUsername = insertData?.username == stableAccount?.username;
      const isNickname = insertData?.nickname == stableAccount?.nickname;
      const isServerIp = insertData?.serverIp == stableAccount?.serverIp;
      const isProfileUrl = insertData?.profileUrl == stableAccount?.profileUrl;
      const isProfileCount =
        insertData?.profileCount == stableAccount?.profileCount;
      const isAccountBio = insertData?.accountBio == stableAccount?.accountBio;
      const isAccountType =
        insertData?.accountType == stableAccount?.accountType;
      const isPhoneNumber =
        insertData?.phoneNumber == stableAccount?.phoneNumber;

      if (
        !isUsername ||
        !isNickname ||
        !isServerIp ||
        !isProfileUrl ||
        !isProfileCount ||
        !isAccountBio ||
        !isAccountType ||
        !isPhoneNumber
      ) {
        const newStableAccount = new TgAccountStableModel(insertData);
        await newStableAccount.save();
        return res.status(201).json({
          statusCode: 201,
          message: "Telegram account created successfully",
          data,
        });
      }
      return res.status(201).json({
        statusCode: 201,
        message: "Telegram account created successfully",
        data,
      });
    }

    const newStableAccount = new TgAccountStableModel(insertData);
    await newStableAccount.save();

    return res.status(201).json({
      statusCode: 201,
      message: "Telegram account created successfully",
      data,
    });
  } catch (error) {
    console.error("Error creating Telegram account:", error);
    return res
      .status(500)
      .json({ statusCode: 500, message: "Failed to create Telegram account" });
  }
});

/**
 * Get a specific account
 */
app.get("/tg_account/:tgId", authenticateToken, async function (req, res) {
  const tgId = req.params?.tgId;

  try {
    const data = await TgAccountStableModel.findOne({
      tgId,
    });
    return res.status(200).json({
      statusCode: 200,
      message: "Success",
      data,
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: 500,
      message: "Internal server error.",
    });
  }
});

/**
 * Get updated account data
 */
app.get("/tg_account", authenticateToken, async function (req, res) {
  const searchTerm = req.query?.search;

  try {
    if (Boolean(searchTerm)) {
      const results =
        (await TgAccountModel.find({
          $or: [
            { username: { $regex: searchTerm, $options: "i" } },
            { nickname: { $regex: searchTerm, $options: "i" } },
            { phoneNumber: { $regex: searchTerm, $options: "i" } },
            { serverIp: { $regex: searchTerm, $options: "i" } },
            { tgId: { $regex: searchTerm, $options: "i" } },
            { accountBio: { $regex: searchTerm, $options: "i" } },
          ],
        })) || [];

      return res
        .status(200)
        .json({ statusCode: 200, message: "OK", data: results });
    }

    const data = (await TgAccountModel.find()) || [];
    return res.status(200).json({ statusCode: 200, message: "OK", data });
  } catch (error) {
    return res
      .status(500)
      .json({ statusCode: 500, message: "Failed to fetch Telegram accounts" });
  }
});

/**
 * Get all account stabel data
 */
app.get("/tg_account_stable", authenticateToken, async function (req, res) {
  const searchTerm = req.query?.search;
  try {
    if (Boolean(searchTerm)) {
      const results =
        (await TgAccountStableModel.find({
          $or: [
            { username: { $regex: searchTerm, $options: "i" } },
            { nickname: { $regex: searchTerm, $options: "i" } },
            { phoneNumber: { $regex: searchTerm, $options: "i" } },
            { serverIp: { $regex: searchTerm, $options: "i" } },
            { tgId: { $regex: searchTerm, $options: "i" } },
            { accountBio: { $regex: searchTerm, $options: "i" } },
          ],
        })) || [];
      return res
        .status(200)
        .json({ statusCode: 200, message: "OK", data: results });
    }
    const data = (await TgAccountStableModel.find()) || [];
    return res.status(200).json({ statusCode: 200, message: "Success", data });
  } catch (error) {
    return res
      .status(500)
      .json({ statusCode: 500, message: "Failed to fetch Telegram accounts" });
  }
});

/**
 * Insert account type
 */

app.post("/account-type", authenticateToken, async function (req, res) {
  const input = req.body || {};
  const validateResult = validateAccountType(input, "insert");

  if (!validateResult?.success)
    return res.status(400).json({
      message: validateResult?.issues?.at(0)?.message,
    });

  const result = await insertAccountType(validateResult?.output);

  if (!result?.success && !result.exist)
    return res.status(500).json({
      message: "Something went wrong",
    });

  if (!result?.success && result?.exist)
    return res.status(409).json({
      message: result?.message,
    });

  return res.status(201).json({
    message: result?.message,
  });
});

/**
 * Update account type
 */
app.put("/account-type", authenticateToken, async function (req, res) {
  const input = req.body || {};
  const validateResult = validateAccountType(input, "update");

  if (!validateResult?.success)
    return res.status(400).json({
      message: validateResult?.issues?.at(0)?.message,
    });

  const result = await updateAccountType(validateResult?.output);

  if (!result.success && !result?.flag)
    return res.status(500).json({
      message: "Something went wrong",
    });

  if (!result.success && result?.flag)
    return res.status(400).json({
      message: result?.message,
    });

  return res.status(200).json({
    message: result?.message,
  });
});

/**
 * Get account type
 */
app.get("/account-type/:id", authenticateToken, async function (req, res) {
  const id = req.params.id;

  if (!Boolean(id))
    return res.status(400).json({
      message: "Missing required field.",
    });

  const result = await getOneAccountType(id);

  if (!result.success && !result.flag)
    return res.status(500).json({
      message: "Something went wrong",
    });

  if (!result.success && result?.flag)
    return res.status(400).json({
      message: result?.message,
    });

  return res.status(200).json({
    message: result?.message,
    data: result?.data,
  });
});

/**
 * Get account type
 */
app.delete("/account-type/:id", authenticateToken, async function (req, res) {
  const id = req.params.id;

  if (!Boolean(id))
    return res.status(400).json({
      message: "Missing required field.",
    });

  const result = await deleteAccountType(id);

  if (!result.success && !result.flag)
    return res.status(500).json({
      message: "Something went wrong",
    });

  if (!result.success && result?.flag)
    return res.status(400).json({
      message: result?.message,
    });

  return res.status(200).json({
    message: result?.message,
  });
});

/**
 * Get all account type
 */
app.get("/accounts-type", authenticateToken, async function (req, res) {
  const queryParams = req.query || {};
  const result = await getAllAccountType(queryParams);

  if (!result?.success)
    return res.status(500).json({
      message: "Something went wrong",
    });

  return res.status(200).json({
    message: result?.message,
    data: result?.data,
    page: +(result?.page || 0),
    pageCount: +(result?.pageCount || 0),
    total: +result?.total,
  });
});

/**
 * Get a telegram account credentials
 */
app.post("/verify_password", authenticateToken, async function (req, res) {
  const passCode = req.body?.passCode;
  if (!passCode)
    return res.status(400).json({
      statusCode: 400,
      messsage: "Missing Field.",
    });

  try {
    const data = await TgAccounPassCodeModel.findOne({
      password: passCode,
    });

    return res.status(200).json({
      statusCode: 200,
      message: "Success",
      data,
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: 500,
      message: "Internal server error.",
    });
  }
});

/**
 * Get a telegram account credentials
 */
app.get("/password_all", authenticateToken, async function (__, res) {
  try {
    const data = await TgAccounPassCodeModel.find();
    return res.status(200).json({
      statusCode: 200,
      message: "Success",
      data,
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: 500,
      message: "Internal server error.",
    });
  }
});

app.listen(PORT, () => console.log(`Server is running on port : ${PORT}`));

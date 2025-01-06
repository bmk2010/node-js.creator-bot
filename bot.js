const BotApi = require("node-telegram-bot-api");
const axios = require("axios");
const fs = require("fs");

const TOKEN = "8073312360:AAFMOQn875MoAuwbI-q0fhs76WeD2n2ErgM";
const bot = new BotApi(TOKEN, { polling: true });

const API_URL = "https://676c3a470e299dd2ddfc526e.mockapi.io/api/v1/bots";
const users = new Set(); // Global o'zgaruvchi
let botAdmin = null; // Global admin user ID

const startAllBots = () => {
  axios
    .get(API_URL)
    .then((response) => {
      const bots = response.data;

      bots.forEach((botData) => {
        const newBotInstance = new BotApi(botData.botToken, { polling: true });

        // Get bot details (bot username)
        newBotInstance.getMe().then((botInfo) => {
          console.log(`Bot started: @${botInfo.username}`);
        });

        // Handle incoming messages for each bot
        newBotInstance.on("message", async (msg) => {
          const chatId = msg.chat.id;
          const text = msg.text;

          users.add(chatId);

          if (text === "/start") {
            newBotInstance.sendMessage(
              chatId,
              `<b>Salom, ${msg.from.first_name}! 👋</b>\n\nMen qiziqarli botman. Mana, mening imkoniyatlarim:\n\n1️⃣ <b>Hazil so'rash</b>: /joke\n2️⃣ <b>Ob-havo bilish</b>: /weather [shahar]\n🪖<b>Admin: /broadcast [text]</b>\n\nAgar siz admin bo'lsangiz, umumiy xabar yuborishingiz mumkin.`,
              {
                parse_mode: "HTML",
                reply_markup: {
                  inline_keyboard: [
                    [{ text: "Hazil olish", callback_data: "joke" }],
                    [{ text: "Ob-havo so'rash", callback_data: "weather" }],
                  ],
                },
              }
            );
          } else if (text.startsWith("/broadcast") && chatId === botAdmin) {
            const message = text.replace("/broadcast", "").trim();
            users.forEach((userId) => {
              newBotInstance.sendMessage(
                userId,
                `📢 Admindan xabar:\n\n${message}`
              );
            });
            newBotInstance.sendMessage(
              chatId,
              "✅ Xabar barcha foydalanuvchilarga yuborildi!"
            );
          } else if (text.startsWith("/weather")) {
            const city = text.replace("/weather", "").trim();
            if (!city) {
              newBotInstance.sendMessage(
                chatId,
                "❗ Iltimos, shahar nomini yozing: /weather [shahar]"
              );
              return;
            }

            const apiKey = "bde6e0c61e6448730b05f257c8998ff4";
            const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`;

            axios
              .get(url)
              .then((res) => {
                const weather = res.data;
                if (weather.cod === 200) {
                  newBotInstance.sendMessage(
                    chatId,
                    `🌤 Ob-havo ma'lumotlari:\n\n🌆 Shahar: ${weather.name}\n🌡 Harorat: ${weather.main.temp}°C\n💧 Namlik: ${weather.main.humidity}%\n🌬 Shamol tezligi: ${weather.wind.speed} m/s`,
                    { parse_mode: "HTML" }
                  );
                } else {
                  newBotInstance.sendMessage(
                    chatId,
                    "❌ Ob-havo ma'lumotlarini olishda xatolik yuz berdi."
                  );
                }
              })
              .catch(() => {
                newBotInstance.sendMessage(
                  chatId,
                  "❌ Ob-havo ma'lumotlarini olishda xatolik yuz berdi."
                );
              });
          }
        });
      });
    })
    .catch((err) => {
      console.error("Error fetching bots from API:", err);
    });
};

// Start all bots when the main bot starts
startAllBots();

// Handle other user interactions (same as before)
bot.on("message", (msg) => {
  const userId = msg.chat.id;

  if (msg.text == "/start") {
    bot.sendMessage(
      userId,
      "<b>Salom, men creator botman. Men orqali o'z botingizni oson yaratishingiz va botingiz kodini ham olishingiz mumkin.</b>",
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🤖 Bot yaratish", callback_data: "create" },
              { text: "🪪 Litsenziya", callback_data: "license" },
            ],
          ],
          remove_keyboard: true,
        },
      }
    );
  } else if (msg.text == "➕ Tekin bot") {
    // Check if user already has a bot
    axios
      .get(API_URL)
      .then((response) => {
        const existingBot = response.data.find((bot) => bot.userId === userId);
        if (existingBot) {
          // User already has a bot
          bot.sendMessage(
            userId,
            `<b>Sizda allaqachon 1 ta tekin bot mavjud!</b>\n\n🤖 Botning useri: @${existingBot.botUsername}`,
            { parse_mode: "HTML" }
          );
        } else {
          // Proceed with bot creation
          bot.sendMessage(
            userId,
            "<b>✍️ Bot yaratish uchun bot TOKENINI yuboring ...</b>",
            {
              parse_mode: "HTML",
              reply_markup: {
                keyboard: [[{ text: "🚫 Bekor qilish" }]],
                resize_keyboard: true,
                one_time_keyboard: true,
              },
            }
          );

          bot.once("message", (tokenMsg) => {
            const botToken = tokenMsg.text;

            // Initialize the new bot with the token
            const newBotInstance = new BotApi(botToken, { polling: true });

            // Get bot details (bot username)
            newBotInstance.getMe().then((botInfo) => {
              const botUsername = botInfo.username;

              // Save the new bot in the mock API
              axios
                .post(API_URL, {
                  userId: userId,
                  botToken: botToken,
                  botUsername: botUsername,
                })
                .then(() => {
                  // Notify user that their bot has started
                  bot.sendMessage(
                    userId,
                    `<b>Botingiz ishga tushdi!</b>\n<b>Botning tekin hostingi 5 kun davom etadi.</b>\n\n<b>🤖 Bot useri:</b> @${botUsername}`,
                    {
                      parse_mode: "HTML",
                    }
                  );
                })
                .catch((err) => {
                  console.error("Error saving bot:", err);
                  bot.sendMessage(
                    userId,
                    "❌ Botingizni saqlashda xatolik yuz berdi."
                  );
                });
            });

            botAdmin = userId; // Set botAdmin globally

            setTimeout(() => {
              newBotInstance.sendMessage(
                botAdmin,
                "<b>⚠️ Bot hosting vaqti tugadi. Qayta host qilish uchun @hi_its_bmk ga yozing</b>",
                { parse_mode: "HTML" }
              );
              newBotInstance.stopPolling();
            }, 432000000);
          });
        }
      })
      .catch((err) => {
        console.error("Error checking for existing bot:", err);
        bot.sendMessage(userId, "❌ Botlarni tekshirishda xatolik yuz berdi.");
      });
  } else if (msg.text == "🚫 Bekor qilish") {
    bot.sendMessage(
      userId,
      "<b>❌ Amal bekor qilindi. Qaytadan /start komandasini yuboring.</b>",
      {
        parse_mode: "HTML",
        reply_markup: {
          remove_keyboard: true,
        },
      }
    );
  } else if (msg.text == "💸 Sifatli botlar") {
    bot.sendMessage(
      userId,
      "<b>👌 Sifatli botlar qilish uchun @hi_its_bmk ga yozing</b>",
      { parse_mode: "HTML" }
    );
  }
});

bot.on("callback_query", (query) => {
  const data = query.data;
  const chatId = query.message.chat.id;

  if (data == "create") {
    bot.sendMessage(chatId, "<b>Qanday bot yaratishni xohlaysiz?</b>", {
      parse_mode: "HTML",
      reply_markup: {
        keyboard: [["➕ Tekin bot", "💸 Sifatli botlar"]],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
  } else if (data == "license") {
    bot.sendDocument(chatId, "./license", {
      caption: "<b>🏅 Bot litsenziyasi</b>",
      parse_mode: "HTML",
    });
  }
});

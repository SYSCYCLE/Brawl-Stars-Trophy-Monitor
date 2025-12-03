const axios = require('axios');
const http = require('http');

const BS_TOKEN = process.env.BRAWL_STARS_TOKEN;
const PLAYER_TAG = process.env.PLAYER_TAG; 
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const ENCODED_TAG = PLAYER_TAG ? PLAYER_TAG.replace('#', '%23') : '';
const API_URL = `https://api.brawlstars.com/v1/players/${ENCODED_TAG}/battlelog`;

let lastBattleTime = null;

const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Hizli Mod (5sn) Calisiyor...');
});
server.listen(process.env.PORT || 3000);

async function sendTelegram(message) {
    if (!TG_TOKEN || !TG_CHAT_ID) return;
    try {
        await axios.post(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
            chat_id: TG_CHAT_ID,
            text: message,
            parse_mode: 'HTML',
            disable_web_page_preview: true
        });
        console.log("📨 Telegram gönderildi.");
    } catch (err) {
        console.error("Telegram Hatası:", err.message);
    }
}

async function checkBattles() {
    if (!BS_TOKEN || !PLAYER_TAG) {
        console.log("⚠️ Ayarlar eksik!");
        return;
    }

    try {
        const response = await axios.get(API_URL, {
            headers: { 
                'Authorization': `Bearer ${BS_TOKEN}`,
                'Accept': 'application/json'
            }
        });

        const battles = response.data.items;
        if (!battles || battles.length === 0) return;

        const latestBattle = battles[0];
        const battleTime = latestBattle.battleTime;

        if (lastBattleTime === null) {
            lastBattleTime = battleTime;
            console.log(`✅ Sistem Başladı (5sn). Son maç: ${battleTime}`);
            return;
        }

        if (battleTime === lastBattleTime) {
            return;
        }

        console.log("🔥 YENİ MAÇ!");

        const eventMode = latestBattle.event.mode || "Bilinmiyor";
        const mapName = latestBattle.event.map || "Harita Yok";
        const result = latestBattle.battle.result;
        const trophyChange = latestBattle.battle.trophyChange || 0;
        const duration = latestBattle.battle.duration ? `${latestBattle.battle.duration} sn` : "Belirsiz";
        const type = latestBattle.battle.type;

        let myHero = "Bilinmiyor";
        let myPower = 0;
        let myTrophies = 0;

        if (latestBattle.battle.teams) {
            const allPlayers = latestBattle.battle.teams.flat();
            const me = allPlayers.find(p => p.tag === PLAYER_TAG);
            if (me) {
                myHero = me.brawler.name;
                myPower = me.brawler.power;
                myTrophies = me.brawler.trophies;
            }
        }

        let resultEmoji = "❓";
        let resultText = "SONUÇ YOK";

        if (result === 'victory') { resultEmoji = "🏆"; resultText = "ZAFER"; }
        else if (result === 'defeat') { resultEmoji = "❌"; resultText = "YENİLGİ"; }
        else if (result === 'draw') { resultEmoji = "⚖️"; resultText = "BERABERE"; }
        else if (latestBattle.battle.rank) { 
            resultEmoji = latestBattle.battle.rank === 1 ? "🥇" : "#️⃣";
            resultText = `${latestBattle.battle.rank}. Oldun`;
        }

        const trophyStr = trophyChange > 0 ? `+${trophyChange}` : `${trophyChange}`;
        const isStarPlayer = latestBattle.battle.starPlayer && latestBattle.battle.starPlayer.tag === PLAYER_TAG;
        const starPlayerText = isStarPlayer ? "🌟 <b>STAR PLAYER!</b> 🌟" : "";

        const msg = `
<b>${resultEmoji} SONUÇ: ${resultText}</b> (${trophyStr} Kupa)

👾 <b>Karakter:</b> ${myHero} (Lv. ${myPower})
🏆 <b>Kupa:</b> ${myTrophies}

🗺️ <b>Harita:</b> ${mapName}
🎮 <b>Mod:</b> ${eventMode.toUpperCase()}
⏱️ <b>Süre:</b> ${duration}
🎲 <b>Tip:</b> ${type}

${starPlayerText}
        `;

        await sendTelegram(msg);
        lastBattleTime = battleTime;

    } catch (error) {
        if (error.response && error.response.status === 429) {
            console.error("⛔ ÇOK HIZLI İSTEK (429)! 5 saniye çok geldi, Supercell engelledi.");
        } else if (error.response && error.response.status === 403) {
            console.error("⛔ IP HATASI (403). Render IP değişmiş olabilir.");
            axios.get('https://api.ipify.org?format=json').then(r => console.log("IP:", r.data.ip));
        } else {
            console.error("Hata:", error.message);
        }
    }
}

setInterval(checkBattles, 5000);

checkBattles();

const axios = require('axios');
const http = require('http');
const fs = require('fs');
const path = require('path');

const BS_TOKEN = process.env.BRAWL_STARS_TOKEN;
const PLAYER_TAG = process.env.PLAYER_TAG; 
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const LOG_FILE = path.join(__dirname, 'processed_matches.log');
const ENCODED_TAG = PLAYER_TAG ? PLAYER_TAG.replace('#', '%23') : '';
const API_URL = `https://api.brawlstars.com/v1/players/${ENCODED_TAG}/battlelog`;

function getProcessedMatches() {
    if (!fs.existsSync(LOG_FILE)) return [];
    try {
        return fs.readFileSync(LOG_FILE, 'utf8').split('\n').filter(Boolean);
    } catch (e) { return []; }
}

function saveMatchToLog(battleTime) {
    let matches = getProcessedMatches();
    matches.push(battleTime);
    if (matches.length > 50) matches = matches.slice(-50);
    fs.writeFileSync(LOG_FILE, matches.join('\n'), 'utf8');
}

http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Bot is running');
}).listen(process.env.PORT || 3000);

async function sendTelegram(message) {
    try {
        await axios.post(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
            chat_id: TG_CHAT_ID,
            text: message,
            parse_mode: 'HTML'
        });
        return true;
    } catch (err) {
        return false;
    }
}

async function checkBattles() {
    try {
        const response = await axios.get(API_URL, {
            headers: { 'Authorization': `Bearer ${BS_TOKEN}` }
        });

        const battles = response.data.items;
        if (!battles) return;

        const processedMatches = getProcessedMatches();
        const newBattles = battles.filter(b => !processedMatches.includes(b.battleTime)).reverse();

        for (const battle of newBattles) {
            try {
                const mode = battle.event.mode || "Bilinmiyor";
                const map = battle.event.map || "Bilinmiyor";
                const b = battle.battle;
                
                let allPlayers = [];
                if (b.teams) allPlayers = b.teams.flat();
                else if (b.players) allPlayers = b.players;

                const myTag = PLAYER_TAG.startsWith('#') ? PLAYER_TAG : '#' + PLAYER_TAG;
                const me = allPlayers.find(p => p.tag === myTag);

                let charName = "Bilinmiyor";
                let kupa = 0;

                if (me) {
                    if (me.brawler && me.brawler.name) {
                        charName = me.brawler.name;
                        kupa = me.brawler.trophies || 0;
                    } 
                    else if (me.brawlers && me.brawlers.length > 0) {
                        charName = me.brawlers.map(Hero => Hero.name).join(", ");
                        kupa = me.brawlers[0].trophies || 0;
                    }
                }

                let sonucEmoji = "🎮";
                let sonucText = b.result || (b.rank ? `${b.rank}. Oldu` : "Tamamlandı");
                if (b.result === 'victory') { sonucEmoji = "🏆"; sonucText = "ZAFER"; }
                else if (b.result === 'defeat') { sonucEmoji = "❌"; sonucText = "YENİLGİ"; }

                const change = b.trophyChange !== undefined ? (b.trophyChange >= 0 ? `+${b.trophyChange}` : b.trophyChange) : "0";

                const msg = `<b>${sonucEmoji} ${sonucText}</b> (${change} Kupa)\n\n` +
                            `👾 <b>Karakter:</b> ${charName}\n` +
                            `🏆 <b>Kupa:</b> ${kupa}\n` +
                            `🗺️ <b>Harita:</b> ${map}\n` +
                            `🎮 <b>Mod:</b> ${mode.toUpperCase()}`;

                const sent = await sendTelegram(msg);
                if (sent) saveMatchToLog(battle.battleTime);

            } catch (err) {
                console.log("Maç atlandı, hata:", err.message);
                saveMatchToLog(battle.battleTime); // Hata olsa da loga ekle ki takılmasın
            }
        }
    } catch (error) {
        console.log("API Hatası:", error.message);
    }
}

setInterval(checkBattles, 5000);
checkBattles();

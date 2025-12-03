const http = require('http');
const https = require('https');

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Brawl Stars Bot Calisiyor!');
});

function renderIpOgren() {
    https.get('https://api.ipify.org?format=json', (resp) => {
        let data = '';

        resp.on('data', (chunk) => {
            data += chunk;
        });

        resp.on('end', () => {
            try {
                const ipBilgisi = JSON.parse(data);
                console.log("================================================");
                console.log("📢 RENDER SUAN BU IP'YI KULLANIYOR (BUNU KOPYALA):");
                console.log(`➡️  ${ipBilgisi.ip}`);
                console.log("================================================");
            } catch (e) {
                console.log("IP verisi islenirken hata oldu.");
            }
        });

    }).on("error", (err) => {
        console.log("IP alınamadı hata: " + err.message);
    });
}

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Sunucu ${port} portunda basladi.`);
    
    renderIpOgren();
});

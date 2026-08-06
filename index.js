const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const DATA_FILE = path.join(__dirname, 'warns.json');

// Funcție pentru a citi warn-urile din fișier
function loadWarns() {
    if (!fs.existsSync(DATA_FILE)) {
        return {};
    }
    try {
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (e) {
        return {};
    }
}

// Funcție pentru a salva warn-urile în fișier
function saveWarns(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 4), 'utf8');
}

client.once('ready', () => {
    console.log(`Botul de warn-uri este online ca ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const prefix = '!';
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // Comanda: !warn @utilizator motiv
    if (command === 'warn') {
        // Verificăm dacă cel care dă comanda are permisiuni de moderare (Administrator sau Kick/Ban)
        if (!message.member.permissions.has('KickMembers') && !message.member.permissions.has('Administrator')) {
            return message.reply('❌ Nu ai permisiunea de a folosi această comandă!');
        }

        const targetUser = message.mentions.users.first() || message.guild.members.cache.get(args[0])?.user;
        if (!targetUser) {
            return message.reply('❌ Te rog să menționezi un utilizator valid! Exemplu: `!warn @Nume motiv`');
        }

        const reason = args.slice(1).join(' ') || 'Fără motiv specificat';

        // Încărcăm baza de date cu warn-uri
        let warnsData = loadWarns();
        const guildId = message.guild.id;
        const userId = targetUser.id;

        if (!warnsData[guildId]) {
            warnsData[guildId] = {};
        }
        if (!warnsData[guildId][userId]) {
            warnsData[guildId][userId] = [];
        }

        // Adăugăm noul warn
        warnsData[guildId][userId].push({
            reason: reason,
            moderator: message.author.tag,
            date: new Date().toLocaleDateString('ro-RO')
        });

        saveWarns(warnsData);

        const totalWarns = warnsData[guildId][userId].length;

        // Creăm Embed-ul de confirmare
        const embed = new EmbedBuilder()
            .setTitle('⚠️ Utilizator Avertizat (Warn)')
            .setColor('#ffaa00')
            .addFields(
                { name: 'Utilizator', value: `${targetUser.tag} (<@${targetUser.id}>)`, inline: true },
                { name: 'Moderator', value: message.author.tag, inline: true },
                { name: 'Total Avertismente', value: `${totalWarns}`, inline: true },
                { name: 'Motiv', value: reason }
            )
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });
    }

    // Comanda: !warns @utilizator
    if (command === 'warns') {
        const targetUser = message.mentions.users.first() || message.guild.members.cache.get(args[0])?.user || message.author;

        let warnsData = loadWarns();
        const guildId = message.guild.id;
        const userId = targetUser.id;

        const userWarns = warnsData[guildId]?.[userId] || [];
        const totalWarns = userWarns.length;

        const embed = new EmbedBuilder()
            .setTitle(`📋 Istoric Avertismente pentru ${targetUser.tag}`)
            .setColor('#3498db')
            .setDescription(`Acest utilizator are un total de **${totalWarns}** avertismente.`);

        if (totalWarns > 0) {
            // Luăm ultimele 5 warn-uri să le afișăm frumos
            const recentWarns = userWarns.slice(-5).map((w, index) => 
                `**#${index + 1}** | Motiv: *${w.reason}* | Moderator: ${w.moderator} (${w.date})`
            ).join('\n');

            embed.addFields({ name: 'Ultimele avertismente:', value: recentWarns });
        }

        await message.channel.send({ embeds: [embed] });
    }
});

client.login(process.env.TOKEN);

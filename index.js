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

function saveWarns(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 4), 'utf8');
}

client.once('ready', () => {
    console.log(`Botul este online ca ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const prefix = '!';
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // Comanda: !warn <@utilizator sau NumeRoblox> <motiv>
    if (command === 'warn') {
        if (!message.member.permissions.has('KickMembers') && !message.member.permissions.has('Administrator')) {
            return message.reply('❌ Nu ai permisiunea de a folosi această comandă!');
        }

        const identifier = args[0];
        if (!identifier) {
            return message.reply('❌ Te rog să menționezi un utilizator sau să scrii un username de Roblox! Exemplu: `!warn NumeRoblox motiv` sau `!warn @Mention motiv`');
        }

        const reason = args.slice(1).join(' ') || 'Fără motiv specificat';

        // Căutare după mențiune, ID sau după username-ul de Discord / poreclă / text introdus
        let targetUser = message.mentions.users.first();
        let targetName = identifier;

        if (!targetUser) {
            // Căutăm după username exact sau poreclă pe server (util pentru username-ul de Roblox pus la poreclă)
            const foundMember = message.guild.members.cache.find(m => 
                m.user.username.toLowerCase() === identifier.toLowerCase() ||
                (m.nickname && m.nickname.toLowerCase().includes(identifier.toLowerCase()))
            );

            if (foundMember) {
                targetUser = foundMember.user;
                targetName = foundMember.displayName;
            } else {
                // Dacă nu există pe server sub acel nume, salvăm direct textul introdus (numele de Roblox) ca entitate
                targetName = identifier;
            }
        } else {
            targetName = targetUser.tag;
        }

        let warnsData = loadWarns();
        const guildId = message.guild.id;
        // Folosim ID-ul de Discord dacă l-am găsit, sau username-ul text (de Roblox) ca cheie unică
        const key = targetUser ? targetUser.id : identifier.toLowerCase();

        if (!warnsData[guildId]) {
            warnsData[guildId] = {};
        }
        if (!warnsData[guildId][key]) {
            warnsData[guildId][key] = [];
        }

        warnsData[guildId][key].push({
            reason: reason,
            moderator: message.author.tag,
            displayName: targetName,
            date: new Date().toLocaleDateString('ro-RO')
        });

        saveWarns(warnsData);

        const totalWarns = warnsData[guildId][key].length;

        const embed = new EmbedBuilder()
            .setTitle('⚠️ Utilizator Avertizat (Warn)')
            .setColor('#ffaa00')
            .addFields(
                { name: 'Țintă / Jucător', value: `${targetName}`, inline: true },
                { name: 'Moderator', value: message.author.tag, inline: true },
                { name: 'Total Avertismente', value: `${totalWarns}`, inline: true },
                { name: 'Motiv', value: reason }
            )
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });
    }

    // Comanda: !warns <@utilizator sau NumeRoblox>
    if (command === 'warns') {
        const identifier = args[0];
        let targetUser = message.mentions.users.first();
        let targetName = identifier;
        let key = '';

        if (targetUser) {
            key = targetUser.id;
            targetName = targetUser.tag;
        } else if (identifier) {
            // Căutăm membru după nume
            const foundMember = message.guild.members.cache.find(m => 
                m.user.username.toLowerCase() === identifier.toLowerCase() ||
                (m.nickname && m.nickname.toLowerCase().includes(identifier.toLowerCase()))
            );
            if (foundMember) {
                key = foundMember.user.id;
                targetName = foundMember.displayName;
            } else {
                key = identifier.toLowerCase();
                targetName = identifier;
            }
        } else {
            // Dacă nu a scris nimic, își vede propriile warn-uri
            key = message.author.id;
            targetName = message.author.tag;
        }

        let warnsData = loadWarns();
        const guildId = message.guild.id;

        const userWarns = warnsData[guildId]?.[key] || [];
        const totalWarns = userWarns.length;

        const embed = new EmbedBuilder()
            .setTitle(`📋 Istoric Avertismente pentru ${targetName}`)
            .setColor('#3498db')
            .setDescription(`Acest utilizator are un total de **${totalWarns}** avertismente.`);

        if (totalWarns > 0) {
            const recentWarns = userWarns.slice(-5).map((w, index) => 
                `**#${index + 1}** | Motiv: *${w.reason}* | Moderator: ${w.moderator} (${w.date})`
            ).join('\n');

            embed.addFields({ name: 'Ultimele avertismente:', value: recentWarns });
        }

        await message.channel.send({ embeds: [embed] });
    }
});

client.login(process.env.TOKEN);

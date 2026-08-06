const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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

// Ținem evidența participanților la giveaway-uri direct în memorie
// Structură: { messageId: Set([userId1, userId2, ...]) }
const giveawayParticipants = {};

client.once('ready', () => {
    console.log(`Botul multifuncțional este online ca ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const prefix = '!';
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // ================= SISTEMUL DE WARN-URI =================
    
    if (command === 'warn') {
        if (!message.member.permissions.has('KickMembers') && !message.member.permissions.has('Administrator')) {
            return message.reply('❌ Nu ai permisiunea de a folosi această comandă!');
        }

        const identifier = args[0];
        if (!identifier) {
            return message.reply('❌ Te rog să menționezi un utilizator sau să scrii un username de Roblox! Exemplu: `!warn NumeRoblox motiv`');
        }

        const reason = args.slice(1).join(' ') || 'Fără motiv specificat';

        let targetUser = message.mentions.users.first();
        let targetName = identifier;

        if (!targetUser) {
            const foundMember = message.guild.members.cache.find(m => 
                m.user.username.toLowerCase() === identifier.toLowerCase() ||
                (m.nickname && m.nickname.toLowerCase().includes(identifier.toLowerCase()))
            );

            if (foundMember) {
                targetUser = foundMember.user;
                targetName = foundMember.displayName;
            } else {
                targetName = identifier;
            }
        } else {
            targetName = targetUser.tag;
        }

        let warnsData = loadWarns();
        const guildId = message.guild.id;
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

    if (command === 'warns') {
        const identifier = args[0];
        let targetUser = message.mentions.users.first();
        let targetName = identifier;
        let key = '';

        if (targetUser) {
            key = targetUser.id;
            targetName = targetUser.tag;
        } else if (identifier) {
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

    // ================= SISTEMUL DE GIVEAWAY CU BUTON =================
    
    // Exemplu: !giveaway 1h 500 Robux  (sau 30m)
    if (command === 'giveaway') {
        if (!message.member.permissions.has('Administrator') && !message.member.permissions.has('ManageMessages')) {
            return message.reply('❌ Nu ai permisiunea de a crea giveaway-uri!');
        }

        const timeArg = args[0];
        const prize = args.slice(1).join(' ');

        if (!timeArg || !prize) {
            return message.reply('❌ Format incorect! Folosește: `!giveaway [timp] [premiu]`. Exemplu: `!giveaway 1h 500 Robux` sau `!giveaway 30m Nitro`');
        }

        let durationMs = 0;
        const unit = timeArg.slice(-1).toLowerCase();
        const value = parseInt(timeArg);

        if (isNaN(value)) {
            return message.reply('❌ Timpul introdus nu este valid! Folosește `h` pentru ore sau `m` pentru minute (ex: `1h`, `30m`).');
        }

        if (unit === 'h') {
            durationMs = value * 60 * 60 * 1000;
        } else if (unit === 'm') {
            durationMs = value * 60 * 1000;
        } else {
            return message.reply('❌ Specifică unitatea: `h` pentru ore sau `m` pentru minute (Exemplu: `1h` sau `30m`).');
        }

        await message.delete().catch(() => {});

        // Creăm setul de participanți pentru acest mesaj nou
        // (Vom folosi un ID unic generat automat de mesaj după trimitere, dar pentru început pregătim rândul cu butonul)
        const giveawayEmbed = new EmbedBuilder()
            .setTitle('🎉 GIVEAWAY 🎉')
            .setColor('#e74c3c')
            .setDescription(`Premiu: **${prize}**\n\nApasă pe butonul de mai jos pentru a participa!\nDurată: **${timeArg}**\nParticipanți: **0**`)
            .setFooter({ text: `Creat de ${message.author.tag}` })
            .setTimestamp();

        const enterButton = new ButtonBuilder()
            .setCustomId('enter_giveaway')
            .setLabel('Participă 🎉')
            .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder().addComponents(enterButton);

        const giveawayMessage = await message.channel.send({ embeds: [giveawayEmbed], components: [row] });
        
        // Inițializăm lista de participanți pentru mesajul trimis
        giveawayParticipants[giveawayMessage.id] = new Set();

        const endTime = Date.now() + durationMs;

        // Timer-ul care oprește giveaway-ul la final
        const interval = setInterval(async () => {
            const timeLeft = endTime - Date.now();

            if (timeLeft <= 0) {
                clearInterval(interval);

                const fetchedMessage = await message.channel.messages.fetch(giveawayMessage.id).catch(() => null);
                if (!fetchedMessage) return;

                const participantsSet = giveawayParticipants[giveawayMessage.id] || new Set();
                const participantsArray = Array.from(participantsSet);

                // Dezactivăm butonul (devine gri și nu mai poate fi apăsat)
                const disabledButton = new ButtonBuilder()
                    .setCustomId('enter_giveaway')
                    .setLabel('Giveaway Încheiat ❌')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true);

                const disabledRow = new ActionRowBuilder().addComponents(disabledButton);

                if (participantsArray.length === 0) {
                    const endedEmbed = new EmbedBuilder()
                        .setTitle('🎉 GIVEAWAY ÎNCHEIAT 🎉')
                        .setColor('#7f8c8d')
                        .setDescription(`Premiu: **${prize}**\n\n❌ Nimeni nu a participat la acest giveaway.`);
                    
                    await fetchedMessage.edit({ embeds: [endedEmbed], components: [disabledRow] }).catch(() => {});
                    delete giveawayParticipants[giveawayMessage.id];
                    return;
                }

                // Alegem un câștigător aleatoriu din lista de ID-uri de utilizatori
                const winnerId = participantsArray[Math.floor(Math.random() * participantsArray.length)];

                const winnerEmbed = new EmbedBuilder()
                    .setTitle('🎉 GIVEAWAY ÎNCHEIAT 🎉')
                    .setColor('#2ecc71')
                    .setDescription(`Premiu: **${prize}**\n\n🏆 Câștigătorul este: <@${winnerId}> ! Felicitări!`);

                await fetchedMessage.edit({ embeds: [winnerEmbed], components: [disabledRow] }).catch(() => {});
                await message.channel.send(`🎊 Felicitări <@${winnerId}>! Ai câștigat **${prize}**!`).catch(() => {});

                // Ștergem datele din memorie pentru acest giveaway
                delete giveawayParticipants[giveawayMessage.id];
            }
        }, 10000); // Verifică la fiecare 10 secunde
    }
});

// Gestionarea interacțiunii cu butonul (când cineva apasă „Participă”)
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'enter_giveaway') {
        const messageId = interaction.message.id;

        if (!giveawayParticipants[messageId]) {
            giveawayParticipants[messageId] = new Set();
        }

        const userId = interaction.user.id;

        if (giveawayParticipants[messageId].has(userId)) {
            return interaction.reply({ content: '⚠️ Deja ești înscris la acest giveaway!', ephemeral: true });
        }

        // Adăugăm utilizatorul în listă
        giveawayParticipants[messageId].add(userId);
        const totalCount = giveawayParticipants[messageId].size;

        // Actualizăm numărul de participanți pe embed în timp real
        const oldEmbed = interaction.message.embeds[0];
        if (oldEmbed) {
            const updatedEmbed = EmbedBuilder.from(oldEmbed);
            // Modificăm descrierea ca să actualizăm numărul de participanți
            let desc = oldEmbed.description;
            if (desc.includes('Participanți:')) {
                desc = desc.replace(/Participanți: \*\*\d+\*\*/, `Participanți: **${totalCount}**`);
            } else {
                desc += `\nParticipanți: **${totalCount}**`;
            }
            updatedEmbed.setDescription(desc);

            await interaction.message.edit({ embeds: [updatedEmbed] }).catch(() => {});
        }

        await interaction.reply({ content: '✅ Te-ai înscris cu succes la giveaway! Mult noroc!', ephemeral: true });
    }
});

client.login(process.env.TOKEN);

const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ]
});

const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;

client.once('ready', () => {
    console.log(`Botul este online ca ${client.user.tag}!`);
});

// Log pentru Mesaje Șterse
client.on('messageDelete', async (message) => {
    if (!message.guild || message.author?.bot) return;

    const embed = new EmbedBuilder()
        .setTitle('🗑️ Mesaj Șters')
        .setColor('#ff0000')
        .addFields(
            { name: 'Autor', value: `${message.author.tag} (<@${message.author.id}>)`, inline: true },
            { name: 'Canal', value: `<#${message.channel.id}>`, inline: true },
            { name: 'Conținut', value: message.content || '[Fără text / Doar atașament]' }
        )
        .setTimestamp();

    const logChannel = message.guild.channels.cache.get(LOG_CHANNEL_ID);
    if (logChannel) logChannel.send({ embeds: [embed] });
});

// Log pentru Membri Noi
client.on('guildMemberAdd', (member) => {
    const embed = new EmbedBuilder()
        .setTitle('📥 Membru Nou')
        .setColor('#00ff00')
        .setDescription(`Bun venit, ${member} (${member.user.tag})!`)
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp();

    const logChannel = member.guild.channels.cache.get(LOG_CHANNEL_ID);
    if (logChannel) logChannel.send({ embeds: [embed] });
});

// Log pentru Membri care Părăsesc Serverul
client.on('guildMemberRemove', (member) => {
    const embed = new EmbedBuilder()
        .setTitle('📤 Membru Părăsit Serverul')
        .setColor('#ffa500')
        .setDescription(`${member.user.tag} a părăsit serverul.`)
        .setTimestamp();

    const logChannel = member.guild.channels.cache.get(LOG_CHANNEL_ID);
    if (logChannel) logChannel.send({ embeds: [embed] });
});

client.login(process.env.TOKEN);


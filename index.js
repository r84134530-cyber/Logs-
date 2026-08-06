const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildModeration // Necesar pentru ban-uri, kick-uri și timeout-uri
    ]
});

const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;

client.once('ready', () => {
    console.log(`Botul este online ca ${client.user.tag}!`);
});

// Funcție ajutătoare pentru trimiterea log-urilor
function sendLog(guild, embed) {
    const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
    if (logChannel) logChannel.send({ embeds: [embed] });
}

// 1. Mesaj Șters
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

    sendLog(message.guild, embed);
});

// 2. Membru Nou
client.on('guildMemberAdd', (member) => {
    const embed = new EmbedBuilder()
        .setTitle('📥 Membru Nou')
        .setColor('#00ff00')
        .setDescription(`Bun venit, ${member} (${member.user.tag})!`)
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp();

    sendLog(member.guild, embed);
});

// 3. Membru Părăsit Serverul
client.on('guildMemberRemove', (member) => {
    const embed = new EmbedBuilder()
        .setTitle('📤 Membru Părăsit Serverul')
        .setColor('#ffa500')
        .setDescription(`${member.user.tag} a părăsit serverul.`)
        .setTimestamp();

    sendLog(member.guild, embed);
});

// 4. Canal Creat
client.on('channelCreate', (channel) => {
    if (!channel.guild) return;
    const embed = new EmbedBuilder()
        .setTitle('📁 Canal Creat')
        .setColor('#0099ff')
        .setDescription(`Canalul **${channel.name}** a fost creat.`)
        .setTimestamp();

    sendLog(channel.guild, embed);
});

// 5. Canal Șters
client.on('channelDelete', (channel) => {
    if (!channel.guild) return;
    const embed = new EmbedBuilder()
        .setTitle('🗑️ Canal Șters')
        .setColor('#ff3300')
        .setDescription(`Canalul **${channel.name}** a fost șters.`)
        .setTimestamp();

    sendLog(channel.guild, embed);
});

// 6. Actualizare Canal (ex: schimbare nume, topic)
client.on('channelUpdate', (oldChannel, newChannel) => {
    if (!newChannel.guild) return;
    if (oldChannel.name === newChannel.name) return; // Ignorăm dacă nu s-a schimbat numele

    const embed = new EmbedBuilder()
        .setTitle('✏️ Canal Actualizat')
        .setColor('#ffcc00')
        .setDescription(`Canalul <#${newChannel.id}> a fost modificat.`)
        .addFields(
            { name: 'Nume vechi', value: oldChannel.name, inline: true },
            { name: 'Nume nou', value: newChannel.name, inline: true }
        )
        .setTimestamp();

    sendLog(newChannel.guild, embed);
});

// 7. Rol Creat
client.on('roleCreate', (role) => {
    const embed = new EmbedBuilder()
        .setTitle('🛡️ Rol Creat')
        .setColor('#33cc33')
        .setDescription(`Rolul **${role.name}** a fost creat.`)
        .setTimestamp();

    sendLog(role.guild, embed);
});

// 8. Rol Șters
client.on('roleDelete', (role) => {
    const embed = new EmbedBuilder()
        .setTitle('🛡️ Rol Șters')
        .setColor('#cc3333')
        .setDescription(`Rolul **${role.name}** a fost șters.`)
        .setTimestamp();

    sendLog(role.guild, embed);
});

// 9. Actualizare Rol (ex: schimbare nume sau culoare)
client.on('roleUpdate', (oldRole, newRole) => {
    if (oldRole.name === newRole.name) return;

    const embed = new EmbedBuilder()
        .setTitle('✏️ Rol Actualizat')
        .setColor('#ffcc00')
        .setDescription(`Rolul **${newRole.name}** a fost modificat.`)
        .addFields(
            { name: 'Nume vechi', value: oldRole.name, inline: true },
            { name: 'Nume nou', value: newRole.name, inline: true }
        )
        .setTimestamp();

    sendLog(newRole.guild, embed);
});

// 10. Actualizare Membru (ex: primit/pierdut un rol, schimbat porecla)
client.on('guildMemberUpdate', (oldMember, newMember) => {
    const guild = newMember.guild;

    // Verificăm dacă i s-au schimbat rolurile
    const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
    const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));

    if (addedRoles.size > 0) {
        const roleNames = addedRoles.map(r => r.name).join(', ');
        const embed = new EmbedBuilder()
            .setTitle('➕ Rol Adăugat unui Membru')
            .setColor('#00ffcc')
            .setDescription(`Utilizatorului **${newMember.user.tag}** i s-a adăugat rolul: **${roleNames}**.`)
            .setTimestamp();
        sendLog(guild, embed);
    }

    if (removedRoles.size > 0) {
        const roleNames = removedRoles.map(r => r.name).join(', ');
        const embed = new EmbedBuilder()
            .setTitle('➖ Rol Scoat de la un Membru')
            .setColor('#ff9933')
            .setDescription(`Utilizatorului **${newMember.user.tag}** i s-a scos rolul: **${roleNames}**.`)
            .setTimestamp();
        sendLog(guild, embed);
    }

    // Verificăm dacă a primit Timeout (Mute temporar)
    if (!oldMember.communicationDisabledUntil && newMember.communicationDisabledUntil) {
        const embed = new EmbedBuilder()
            .setTitle('🔇 Membru pus pe Mute (Timeout)')
            .setColor('#ff0066')
            .setDescription(`Utilizatorul **${newMember.user.tag}** a primit timeout.`)
            .setTimestamp();
        sendLog(guild, embed);
    }
});

// 11. Membru Banat
client.on('guildBanAdd', (ban) => {
    const embed = new EmbedBuilder()
        .setTitle('🔨 Membru Banat')
        .setColor('#990000')
        .setDescription(`Utilizatorul **${ban.user.tag}** a primit ban pe server.`)
        .setTimestamp();

    sendLog(ban.guild, embed);
});

client.login(process.env.TOKEN);
    

require('dotenv').config();
const request = require('request-promise');

const Discord = require('discord.js');
const Client = new Discord.Client({
	messageCacheMaxSize: 1,
	sync: true,
	disabledEvents: require('./configuration/bot/xEvents.js')
});


function logKeyword(message, keyword) {
    getHistory(message).then(messages => {
        executeRequest(message, messages, keyword);
    });
};

function getHistory(message) {
   return message.channel.fetchMessages({
        limit: 4,
        before: message.id,
    });
};

function executeRequest(message, messages, keyword) {
    messages = concatAttachments(messages.array());
    const embedFields = messages.map(message => ({
        name: message.author.username,
        value: message.content,
        inline: false
    })).reverse();
    embedFields.push({
        name: message.author.username,
        value: message.content.substring(0, 2000),
        inline: false
    });
    console.log(embedFields);
    const options = {
        method: 'POST',
        uri: config.webhook,
        body: {
            content: `<@${config.owner}>`,
            embeds: [{
                    title: `${message.author.tag} mentioned ${keyword}`,
                    thumbnail: {
                       url: message.author.avatarURL,
                    },
                    "color": message.member.displayColor,
                    "description": `Server \`${message.guild.name}\`\nChannel: <#${message.channel.id}>`,
                    fields: embedFields,
                    timestamp: message.createdAt
                }],
            },
            json: true
    }
    request(options).catch(error => {
    console.log('Error\n' + error.toString());
    });
};
const keywords      = parseKeywords(require('./configuration/keywords'));
const blacklisted   = require('./configuration/blacklisted');

const config = ((_config) => ({
	token:      _config.token      || process.env.DISCORD_TOKEN,
	owner:      _config.owner      || process.env.OWNER,
	webhook:    _config.webhook    || process.env.WEBHOOK,
	presence:   _config.presence   || process.env.PRESENCE          || 'idle',
}))(require('./configuration/config'));

Client.on('message', async m => {

	if (m.author.id === Client.user.id || m.author.id === config.owner) {
		return;
	}

	if (m.guild == null || m.author.bot) {
		return;
	}

	if (m.mentions.users.has(config.owner)) {
		return;
	}

	const lowercaseContent = m.content.toLowerCase();

	for (const k of keywords) {
		if (!lowercaseContent.includes(k.keyword)) {
			return;
		}

		if (k.servers.length) {
			if (!k.servers.includes(m.guild.id)) {
				return;
			}
		}

		if (isBlacklisted(m.author.id, m.guild.id, m.channel.id)) {
			return;
		}

		const messagePrev = (await m.channel.fetchMessages({
			limit: 4,
			before: m.id,
		})).array();

		messagePrev.reverse().push(m);

		return sendLog(
			messagePrev,
			m.author.tag,
			m.member.displayColor,
			m.guild.name,
			m.channel.toString(),
			m.createdAt,
			k.keyword
		);
	}
});

function isBlacklisted(user, guild, channel) {
	return (blacklisted.users.includes(user)    ||
		blacklisted.servers.includes(guild)     ||
		blacklisted.channels.includes(channel));
}
function concatAttachments(messages) {
	return messages.map(m => {
		if (m.attachments.size) {
			m.content = m.content.concat(m.attachments.map(a => a.url).join('\n'));
		}

		// m.content = m.content.length >= 2048 ? m.content.slice(0, 2048 - 3).concat('...') : m.content || '-';
		m.content = m.content || '-';

		if (m.content.length >= 2048) {
			m.content = m.content.slice(0, 2048 - 3) + '...';
		}

		return m;
	});
}

function parseKeywords(keywords) {
	const _arr = [];

	keywords['global'].forEach(k => {
		_arr.push({
			keyword: k,
			servers: []
		});
	});

	for (const k in keywords.server) {
		_arr.push({
			keyword: k,
			servers: keywords.server[keyword]
		});
	}

	return _arr;
}

Client.login(config.token).catch(console.error);

Client.on('ready', () => {
	console.log(`Logged in as ${Client.user.tag}`);
	Client.user.setPresence({ status: config.presence });
});

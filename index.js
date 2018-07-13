const Discord = require('discord.js');
const Client = new Discord.Client();
const request = require('request-promise');
let fs = require('fs');
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
const blacklisted = JSON.parse(fs.readFileSync('./blacklisted.json', 'utf8'));
const keywords = parseKeywords(require('./keywords.json'));

if (isCloud()) {
    config.token = process.env.DISCORD_TOKEN;
}

Client.on('message', message => {

    if (message.author.id === Client.user.id || message.author.id == config.owner) {
        return;
    }


    if (message.guild == null || message.author.bot) {
        return;
    }

    if (isBlacklisted(message)) {
        return;
    }

    let lowercaseContent = message.content.toLowerCase();

    keywords.forEach(pair => {
        if (lowercaseContent.includes(pair.keyword)) {
            if (pair.servers.length == 0) {
                logKeyword(message, pair.keyword);
                break;
            } else {
                if (pair.servers.indexOf(message.guild.id) >= 0) {
                    logKeyword(message, pair.keyword);
                    break;
                }
            }
        }
    });
});

function isBlacklisted(message) {
    if (message.author.id in blacklisted.users) {
        return true;
    }
    if (message.guild.id in blacklisted.servers) {
        return true;
    }
    if (message.channel.id in blacklisted.channels) {
        return true;
    }
    return false;
}

function logKeyword(message, keyword) {
    getHistory(message).then(messages => {
        executeRequest(message, messages, keyword);
    });
}

function getHistory(message) {
   return message.channel.fetchMessages({
        limit: 4,
        before: message.id,
    });
}

function executeRequest(message, messages, keyword) {
    messages = concatAttachments(messages.array());;
    let options = {
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
                    fields: [
                        {
                            name: messages[3].author.username,
                            value: messages[3].content,
                            inline: false
                        },
                        {
                            name: messages[2].author.username,
                            value: messages[2].content,
                            inline: false
                        },
                        {
                            name: messages[1].author.username,
                            value: messages[1].content,
                            inline: false
                        },
                        {
                            name: messages[0].author.username,
                            value: messages[0].content,
                            inline: false
                        },
                        {
                            name: message.author.username,
                            value: message.content,
                            inline: false
                        }
                    ],
                    timestamp: message.createdAt
                }],
            },
            json: true
        }
        request(options).catch(error => {
            console.log('Error\n' + error.toString());
        });
    };

    function concatAttachments(messages) {
        messages.forEach(message => {
            if (message.content === "") {
                if (message.attachments.array().length > 0) {
                    message.content = message.attachments.array()[0].url;
                } else {
                    message.content = '-';
                }
            } else {
                let attachmentArray = message.attachments.array();
                if (attachmentArray.length > 0) {
                    let attachmentURL = attachmentArray[0].url;
                    if (message.content.length + '\n' + attachmentURL.length < 2048) {
                        message.content = message.content + attachmentURL;
                    }
                }
            }
        });
        return messages;
    }

function isCloud() {
    return process.env.DISCORD_TOKEN != null;
}

function parseKeywords(keywords) {
    let array = [];
    function KeywordPair(keyword, servers) {
        this.keyword = keyword;
        this.servers = servers
    }

    keywords['global'].forEach(keyword => {
        let temp = new KeywordPair(keyword, []);
        array.push(temp);;
    });
    for (let keyword in keywords.server) {
        let temp = new KeywordPair(keyword, keywords.server[keyword]);
        array.push(new KeywordPair(temp);
    }
    return array;
}

Client.login(config.token).then(success => {
    console.log(`Logged in as ${Client.user.tag}`);
}, fail => {
    console.log(`Failed to log in\n${fail}`);
}).catch(rejection => {     
    console.log(`Promise rejection ${rejection}`);
});
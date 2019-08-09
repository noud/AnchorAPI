const TextChannel = require("./TextChannel");

const crypto = require("crypto");

class DMChannel extends TextChannel {

	get members() {
		return this.channelData.getField("members")
			.filter(e => e.login !== this.api.user.login)
			.map(this.api.getUserData, this.api)
	}

	constructor(channelData, api) {
		super(channelData, api);

		let keyEnc = Buffer.from(channelData.getField("keys")[api.user.login], "hex");
		this.key = crypto.privateDecrypt(api.privateKey, keyEnc);
	}

	async _entryIntoMsg(data) {
		let decipher = crypto.createDecipheriv("aes256", this.key, data.iv);

		let encrypted = data.content;
		data.content = decipher.update(data.content, 'hex', 'utf8') + decipher.final('utf8');

		return await super._entryIntoMsg(data, null, null, encrypted);
	}

	async send(content, options) {
		let iv = crypto.randomBytes(8).toString("hex");
		let cipher = crypto.createCipheriv("aes256", this.key, iv);

		content = cipher.update(content, 'utf8', 'hex') + cipher.final('hex');

		super.send(content, options, {
			iv
		});
	}

}

module.exports = DMChannel;
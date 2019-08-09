const DMChannel = require("./objects/DMChannel");
const Channel = require("./objects/Channel");
const ChannelData = require("./objects/ChannelData");
const crypto = require("crypto");

const Reference = require("./Reference");

const uuidv4 = require("uuid/v4");

class DMHelper {

	constructor(db, orbitdb, api) {
		//super();
		this.db = db;
		this.orbitdb = orbitdb;
		this.api = api;
	}

	static async create(orbitdb, api) {
		let dmLog = await orbitdb.log(Reference.DM_LOG_NAME, {
			accessController: {
				write: ["*"]
			}
		});
		await dmLog.load();

		return new DMHelper(dmLog, orbitdb, api);
	}

	async getChannelFor(recipient) {
		let channelEntry = this.db
			.iterator({ limit: -1 })
			.collect()
			.map(e => e.payload.value)
			.filter(e => e.members.includes(recipient.login) && e.members.includes(this.api.user.login))[0] || null;

		if (channelEntry) {
			return await this.entryToChannel(channelEntry);
		} else {
			return await this.newDMChannel(recipient);
		}
	}

	async newDMChannel(recipient) {
		let id = uuidv4();

		// TODO: Create custom access controller for DMs
		let channelDb = await this.orbitdb.kvstore(`Anchor-Chat/dmChannels/${id}`, {
			accessController: {
				write: ["*"]
			}
		});
		await channelDb.load();

		let channelData = new ChannelData(channelDb);

		await Channel.init(channelData, "dm");

		await channelData.setField("members", [
			this.api.user.login,
			recipient.login
		]);

		let passphrase = crypto.randomBytes(32);

		let myKey = crypto.publicEncrypt(this.api.publicKey, passphrase).toString("hex");
		let recKey = crypto.publicEncrypt(recipient.userProfile.getField("publicKey"), passphrase).toString("hex");

		let keys = {
			[this.api.user.login]: myKey,
			[recipient.login]: recKey
		};

		await channelData.setField("keys", keys);

		await channelData.setField("id", id);

		let channel = new DMChannel(channelData, this.api);

		await this.db.add({
			members: [
				this.api.user.login,
				recipient.login
			],
			address: channelDb.address.toString()
		});

		return channel;
	}

	async entryToChannel(channelEntry) {
		let channelDb = await this.api.orbitdb.kvstore(channelEntry.address, {

		});
		await channelDb.load();

		let channelData = new ChannelData(channelDb);
		let channel = new DMChannel(channelData, this.api);

		return channel;
	}

	getChannels() {
		let channelEntries = this.db
			.iterator({ limit: -1 })
			.collect()
			.map(e => e.payload.value)
			.filter(e => e.members.includes(this.api.user.login));


		let promises = [];
		channelEntries.forEach((e) => {
			promises.push((async () => {
				// let login = e.members.filter(this.api.user.login)[0];
				// let user = this.api.getUserData(login);

				return await this.entryToChannel(e);
			})());
		});

		return Promise.all(promises);
	}
}

module.exports = DMHelper;
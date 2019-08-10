class Message {

	constructor(content, data) {
		this.content = content;
		this.signature = data.signature;
		this.verified = data.verified;

		this.author = data.author;
		this.channel = data.channel;
		
		this.id = data.id;
	}

}

module.exports = Message;
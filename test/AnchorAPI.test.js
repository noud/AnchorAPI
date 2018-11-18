const assert = require("assert");
const os = require("os");
const path = require("path");
const fs = require("fs");
const rimraf = require("rimraf");
const IPFS = require("ipfs");
const createDB = require("../scripts/create-public-db.js");

const {
    AnchorAPIBuilder
} = require("anchor-api");

let keyPath;

let userName1 = "XD";
let userName2 = "LOL";

let config1 = {
    config: {
        "Addresses": {
            "Swarm": [
                "/ip4/0.0.0.0/tcp/4002",
                "/ip6/::/tcp/4002"
            ]
        }
    }
}

let config2 = {
    config: {
        "Addresses": {
            "Swarm": [
                "/ip4/0.0.0.0/tcp/4003",
                "/ip6/::/tcp/4003"
            ]
        }
    }
}

let password = "1337P455W0rD"

let messages = [
    "Hello!",
    "How are you?",
    ":D"
]

process.on("unhandledRejection", (err) => {
    console.error(err);
    //process.exit()
});

rimraf.sync(".anchor1");
rimraf.sync(".anchor2");

describe("AnchorAPI", () => {
    let api1;
    let api2;

    it("Creates accounts", async () => {        
        //createDB("Anchor-Chat/userLog", "eventlog", () => {
            try {
                const apis = await Promise.all([
                    new AnchorAPIBuilder()
                        .setDirectory(".anchor1")
                        .setIPFSConfig(config1)
                        .setLoginAndPassword(userName1, password)
                        .createAccount(),
                    new AnchorAPIBuilder()
                        .setDirectory(".anchor2")
                        .setIPFSConfig(config2)
                        .setLoginAndPassword(userName2, password)
                        .createAccount()
                ]);

                apis.forEach(async (api) => {
                    assert.notEqual(api.ipfs, null);
                    assert.notEqual(api.orbitdb, null);
                    assert.notEqual(api.userLog, null);
                    assert.notEqual(api.thisUser, null);
                    assert.ok(api.users.has(api.thisUser.login));
                    assert.equal(api.thisUser.api, api);
                    assert.notEqual(api.thisUser.db, null);

                    if (api.thisUser.login === userName1) {
                        //await api.close();
                        api1 = api;
                    } else {
                        api2 = api;
                    }
                });
            } catch (err) {
                throw err;
                //console.error(err);
                //process.exit(1);
            }
        //}, ".anchor1");

    });

    // it("Logs into a account", async (done) => {
    //     //rimraf.sync("./.jsipfs");
    //     //rimraf.sync(keyPath);
    //         // const anchor = await new AnchorAPIBuilder()
    //         //     .setDirectory(".anchor1")
    //         //     .setIPFSConfig(config1)
    //         //     .setLoginAndPassword(userName1, password)
    //         //     .login();


    //         // assert.notEqual(anchor.ipfs, null);
    //         // assert.notEqual(anchor.orbitdb, null);
    //         // assert.notEqual(anchor.userLog, null);
    //         // assert.ok(anchor.users.has(anchor.thisUser.login));
    //         // assert.equal(anchor.thisUser.api, anchor);
    //         // assert.notEqual(anchor.thisUser.db, null);

    //         //api1 = anchor;
    // });

    it("Chatty", () => {
        return new Promise(async (resolve, reject) => {
            //console.log(await api1.ipfs.swarm.peers());

            // api1.userLog.events.once("replicated", async () => {
            //     console.log("replicated");
            //     let textChannel1 = await api1.openPrivateChannelWith(userName2);

            //     messages.forEach(async (e) => {
            //         await textChannel1.sendMessage(e);
            //     });
            // });

            api1.on("ready", async () => {

                //console.log(api1.userLog.iterator({ limit: -1 }).collect().map(e=> e.payload.value));

                let textChannel1 = await api1.openPrivateChannelWith(userName2);

                messages.forEach(async (e) => {
                    await textChannel1.sendMessage(e);
                });

            });

            api2.on("privateTextChannelOpen", async (login) => {
                let textChannel2 = await api2.openPrivateChannelWith(login);
            
                let msgs = await textChannel2.getMessageHistory();
                
                await api1.close();
                await api2.close();
        
                assert.equal(msgs.map(e => e.text), messages);

                resolve();
            });
        });
    });
})
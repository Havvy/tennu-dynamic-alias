const Db = require("./db");

const DynamicAliases = {
    name: "dynamic-alias",

    requiresRoles: ["admin"],

    init (client, {admin}) {
        const db = Db(client.config("dynamic-alias-database-location"));

        return {
            commandMiddleware: function (command) {
                const aliasingInfo = db.get(command.command);

                // Note(Havvy): Sorry for anybody who reads this procedural mess.
                if (aliasingInfo) {
                    command.command = aliasingInfo.command;

                    let undefinedArgs = false;
                    const newArgs = aliasingInfo.args.map(function (arg) {
                        const argMatch = arg.match(/^\$(\d+)$/);
                        if (argMatch !== null) {
                            const argIx = Number(argMatch[1]);
                            const inputArg = command.args[argIx];
                            if (inputArg) {
                                return inputArg;
                            } else {
                                undefinedArgs = true;
                            }
                        }

                        return arg;
                    });

                    if (undefinedArgs) {
                        return "Incorrect number of arguments given.";
                    }

                    command.args = newArgs;
                }

                return command;
            },

            handlers: {
                "!dynamic-alias": admin.requiresAdmin(function ({args: [subcommand, alias, ...args]}) {
                    switch (subcommand) {
                        case "set":
                            let [command, ...commandArgs] = args;
                            db.set({alias, command: command, args: commandArgs});
                            return "Done.";
                        case "remove":
                            return db.delete(alias).match({
                                Ok(_) { return `Deleted command alias '${alias}'.`; },
                                Fail(_) { return `No such command alias at '${alias}'.`; }
                            });
                        case "view":
                            const aliasingInfo =  db.get(alias);

                            if (!aliasingInfo) {
                                return `No such command alias at '${alias}'.`;
                            }

                            return `${alias} -> ${aliasingInfo.command} ${aliasingInfo.args.join(" ")}`;
                        default:
                            return "Unknown subcommand. Known commands are 'set', 'remove' and 'view'";
                    }
                })
            },

            commands: ["dynamic-alias"]
        };
    }
};

module.exports = DynamicAliases;
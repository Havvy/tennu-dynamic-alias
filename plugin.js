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
                        const argMatch = arg.match(/^\$(\d+)(\+?)$/);
                        if (argMatch === null) {
                            return [arg];
                        }

                        const argIx = Number(argMatch[1]);
                        const restArg = argMatch[2] === "+";

                        if (argIx in command.args) {
                            const inputArg = command.args[argIx];

                            if (restArg) {
                                return command.args.slice(argIx);
                            } else {
                                return [command.args[argIx]];
                            }
                        } else {
                            undefinedArgs = true;
                        }
                    });

                    if (undefinedArgs) {
                        return "Incorrect number of arguments given.";
                    }

                    command.args = Array.prototype.concat.apply([], newArgs);
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
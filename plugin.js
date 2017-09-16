const Db = require("./db");
const {Ok, Fail} = require("r-result");

/// replace_$ns(replacing: String, replacements: [String]) -> String
///
/// Replaces $ns (e.g. $0, $1, $1+) with the respective strings in replacements.
const replace_$ns = function replace_$ns (replacing, replacements) {
    const replaceMatch = replacing.match(/^(.*?)\$(\d+)(\+?)(.*)$/);
    if (replaceMatch === null) {
        return Ok(replacing);
    }

    const prefix = replaceMatch[1];
    const replaceIx = Number(replaceMatch[2]);
    const hasRestArg = replaceMatch[3] === "+";
    let suffix = replaceMatch[4];

    if (!(replaceIx in replacements)) {
        return Fail("undefined-replacement");
    }

    let replaced;
    if (hasRestArg) {
        replaced = replacements.slice(replaceIx).join(" ");
    } else {
        replaced = replacements[replaceIx];
    }

    // The prefix does not need the recursive replacement
    // because it non-greedily consumes characters.

    suffix = replace_$ns(suffix, replacements);

    if (suffix.isFail()) {
        return suffix;
    } else {
        suffix = suffix.ok();
    }

    return Ok([prefix, replaced, suffix].join(""));
};

const DynamicAliases = {
    name: "dynamic-alias",

    requiresRoles: ["admin"],

    init (client, {admin}) {
        const db = Db(client.config("dynamic-alias-database-location"));

        return {
            commandMiddleware: function (command) {
                const aliasingInfo = db.get(command.command);

                if (aliasingInfo) {
                    command.command = aliasingInfo.command;

                    setCommandArgs: {
                        let undefinedArgs = false;
                        const newArgsUnflattened = aliasingInfo.args.map(function (arg) {
                            return replace_$ns(arg, command.args).match({
                                Ok(arg) {
                                    return arg.split(" ");
                                },

                                Err(_) {
                                    undefinedArgs = true;
                                }
                            });
                        });

                        if (undefinedArgs) {
                            return "Incorrect number of arguments given.";
                        }

                        const newArgs = Array.prototype.concat.apply([], newArgsUnflattened)

                        command.args = newArgs;
                    }

                    command[admin.allowAll] = aliasingInfo.allowAll;
                }

                return command;
            },

            handlers: {
                "!dynamic-alias": admin.requiresAdmin(function ({args: [subcommand, alias, ...args]}) {
                    switch (subcommand) {
                        case "set":
                            let [command, ...commandArgs] = args;
                            db.set({alias, command, args: commandArgs, allowAll: false});
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
                        case "allow":
                            db.allow(alias);
                            return "Done.";
                        case "unallow":
                            db.unallow(alias);
                            return "Done.";
                        default:
                            return "Unknown subcommand. Known commands are 'set', 'remove' and 'view'";
                    }
                })
            },

            commands: ["dynamic-alias"],

            help: {
                "dynamic-alias": "See https://tennu.github.com/plugins/dynamic-alias."
            }
        };
    }
};

module.exports = DynamicAliases;
const Dirty = require("dirty");
const {Ok, Fail} = require("r-result");

const Db = function (databaseLocation) {
    const db = Dirty(databaseLocation);

    return {
        get (alias) {
            return db.get(alias);
        },

        set ({alias, command, args}) {
            db.set(alias, {command, args, allowAll: false});
        },

        allow(alias) {
            db.update(alias, function (aliasingInfo) {
                if (aliasingInfo) {
                    aliasingInfo.allowAll = true;
                }

                return aliasingInfo;
            });
        },

        unallow(alias) {
            db.update(alias, function (aliasingInfo) {
                if (aliasingInfo) {
                    aliasingInfo.allowAll = false;
                }

                return aliasingInfo;
            });
        },

        delete (alias) {
            let ret;

            db.update(alias, function (aliasingInfo) {
                ret = aliasingInfo ? Ok() : Fail();
                return undefined;
            });

            return ret;
        }
    }
}

module.exports = Db;
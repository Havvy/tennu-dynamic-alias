const Dirty = require("dirty");
const {Ok, Fail} = require("r-result");

const Db = function (databaseLocation) {
    const db = Dirty(databaseLocation);

    return {
        get (alias) {
            return db.get(alias);
        },

        set ({alias, command, args}) {
            db.set(alias, {command, args});
        },

        delete (alias) {
            let ret;

            db.update(alias, function (value) {
                ret = value ? Ok() : Fail();
                return undefined;
            });

            return ret;
        }
    }
}

module.exports = Db;
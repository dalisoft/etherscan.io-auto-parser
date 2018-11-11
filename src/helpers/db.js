const nedb = require('nedb');

const count = (db) => new Promise((resolve, reject) => {
    db.count({}, (err, doc) => {
        if (err) {
            return reject(err);
        }
        return resolve(doc);
    });
});
const insert = (db, data) => new Promise((resolve, reject) => {
    db.insert(data, (err, doc) => {
        if (err) {
            return reject(err);
        }
        return resolve(doc);
    });
});
const createDb = (filename) => new nedb({ filename, autoload: true });

module.exports = { count, insert, createDb};

module.exports = (obj1, obj2) => {
    const keys = Object.keys(obj2);
    return keys.some(key => obj1.hasOwnProperty(key));
};

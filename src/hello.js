function sayHello(to) {
    return _.template("Hello, <%= name %>!")({ name: to });
}

function normalizeTheStr(str, prefix) {
    var reg = new RegExp(prefix + "images");
    str = prefix + str;
    return str.replace(reg, 'images');
}
function removePrefix(str, prefix) {
    return str.replace(prefix, '');
}
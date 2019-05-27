function sayHello(to) {
    // return "Hello, " + to + "!";
    return _.template("Hello, <% name %>!")({ name: to });
}
/* jshint globalstrict: true  */
"use strict";

/**
 * An expression translator should contain 
 * `A Lexer`   `AST Builder`   `AST Compiler`   `A Parser`
 * -- see detail in "../img/expression_parser_pipeline.png"
 * `Lexer` -- spiit the expression into serveral tokens
 * `AST Builder`  -- build an abstract syntax tree
 * `AST Compiler` -- compile the abstract syntax tree into JavaScript function
 * `Parser` -- combine low-level steps
 * 
 * 
 * not mentioned: [character bookkeeping] & [HTML Content Security Policy]
 */



function parse(expr) {
    var lexer = new Lexer();
    var parser = new Parser(lexer);
    return parser.parse(expr);
}

/* Lexer */
function Lexer() {
    
}

Lexer.prototype.lex = function (text) {
    
};

/* AST Builder */
function AST(lexer) {
    this.lexer = lexer;
}

AST.prototype.ast = function (text) {
    this.tokens = this.lexer.lex(text);
};

/* AST Compiler */
function ASTCompiler(astBuilder) {
    this.astBuilder = astBuilder;
}

ASTCompiler.prototype.compile = function (text) {
    var ast = this.astBuilder.ast(text);
};

/* Parser */
function Parser(lexer) {
    this.lexer = lexer;
    this.ast = new AST(this.lexer);
    this.astCompiler = new ASTCompiler(this.ast);
}

Parser.prototype.parse = function (text) {
    return this.astCompiler.compile(text);
};
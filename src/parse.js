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

/********************** Lexer **********************/
function Lexer() {
    
}

Lexer.prototype.lex = function (text) {
    this.text = text;
    this.index = 0;
    this.ch = undefined;
    this.tokens = [];

    while (this.index < this.text.length) {
        this.ch = this.text.charAt(this.index);
        if (this.isNumber(this.ch) || 
            (this.ch === '.' && this.isNumber(this.peek()))) {
            this.readNumber();
        } else {
            throw "Unexpected next character: " + this.ch;
        }
    }

    return this.tokens;
};

Lexer.prototype.isNumber = function (ch) {
    return '0' <= ch && ch <= '9';
};
Lexer.prototype.peek = function () {
    return this.index < this.text.length - 1 ?
        this.text.charAt(this.index + 1) : 
        false;
};
Lexer.prototype.isExpOperator = function (ch) {
    return ch === '-' || ch === '+' || this.isNumber(ch);
};
Lexer.prototype.readNumber = function () {
    var number = '';
    while (this.index < this.text.length) {
        var ch = this.text.charAt(this.index).toLowerCase();
        if (ch === '.' || this.isNumber(ch)) {
            number += ch;
        } else {
            var nextCh = this.peek();
            var prevCh = number.charAt(number.length - 1);
            if (ch === 'e' && this.isExpOperator(nextCh)) {
                number += ch;
            } else if (this.isExpOperator(ch) && prevCh === 'e' &&
                nextCh && this.isNumber(nextCh)) {
                number += ch;
            } else if (this.isExpOperator(ch) && prevCh === 'e' &&
                (!nextCh || !this.isNumber(nextCh))) {
                throw "Invalid exponent";
            } else {
                break;
            }
        }
        this.index++;
    }
    this.tokens.push({
        text: number,
        value: Number(number)
    });
};

/********************** AST Builder **********************/
function AST(lexer) {
    this.lexer = lexer;
}
AST.Program = 'Program';
AST.Literal = 'Literal';

/**
 * expected to return:
 * {
 *     type: AST.Program,
 *     body: {
 *         type: AST.Literal,
 *         value: 42
 *     }
 * }
 */
AST.prototype.ast = function (text) {
    this.tokens = this.lexer.lex(text);
    return this.program();
};
AST.prototype.program = function () {
    return {
        type: AST.Program,
        body: this.constant()
    };
};
AST.prototype.constant = function () {
    return {
        type: AST.Literal,
        value: this.tokens[0].value
    };
};

/********************** AST Compiler **********************/
function ASTCompiler(astBuilder) {
    this.astBuilder = astBuilder;
}

ASTCompiler.prototype.compile = function (text) {
    var ast = this.astBuilder.ast(text);
    this.state = {
        body: []
    };
    this.recurse(ast);
    /* jshint -W054 */
    return new Function(this.state.body.join(''));
    /* jshint +W054 */
};
ASTCompiler.prototype.recurse = function (ast) {
    switch (ast.type) {
        case AST.Program:
            this.state.body.push('return ', this.recurse(ast.body), ';');
            break;
        case AST.Literal:
            return ast.value;
    }
};

/********************** Parser **********************/
function Parser(lexer) {
    this.lexer = lexer;
    this.ast = new AST(this.lexer);
    this.astCompiler = new ASTCompiler(this.ast);
}

Parser.prototype.parse = function (text) {
    return this.astCompiler.compile(text);
};
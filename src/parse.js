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
    
}
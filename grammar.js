const PREC = {
    STRING: 2,
    COMMENT: 1,
}

module.exports = grammar({
    name: 'Solidity',

    extras: $ => [
        $.comment,
        /[\s\uFEFF\u2060\u200B\u00A0]/
    ],
    
    word: $ => $.identifier,

    rules: {
        //  -- [ Program ] --  
        program: $ => seq(
            repeat($._source_element),
        ),

        //  -- [ Source Element ] --  
        _source_element: $ =>  choice(
            $.pragma_directive,
            $.import_directive,
            $._declaration,
        ),

        // -- [ Statements ] --

        _statement: $ => choice(
            $.block_statement,
            $.variable_declaration_statement,
            $.expression_statement,
            // $.if_statement,
            // $.for_statement,
            // $.while_statement,
            // $.do_while_statement,
            // $.continue_statement,
            // $.break_statement,
            // $.try_statememnt,
            // $.return_statememnt,
            // $.emit_statement,
            // $.assembly_statement
        ),

        block_statement: $ => seq('{', repeat($._statement), "}"),
        variable_declaration_statement: $ => seq(
            choice(
                // TODO: make sure that this is correct
                seq($.variable_declaration, optional(seq('=', $._expression))),
                seq($.variable_declaration_tuple, '=', $._expression),
            ),
            $._semicolon
        ),
        variable_declaration: $ => seq(
            $.type_name,
            optional(choice('memory', 'storage', 'calldata')),
            field('name', $.identifier)
        ),
        variable_declaration_tuple: $ => seq(
            '(', 
            commaSep($.variable_declaration),
            ')'
        ),

        expression_statement: $ => seq($._expression, $._semicolon),

        if_statement: $ => seq(
            'if', '(',$._expression, ')', $.block_statement, optional(seq('else', $.block_statement)),
        ),
        
        for_statement: $ => seq(
            'for', '(', 
            // TODO: verify
            choice($.variable_declaration_statement, $.expression_statement, $._semicolon),
            choice($._expression_statement, $._semicolon),
            choice($._expression),
            ')', $.block_statement,
        ),
        // while_statement: $ => seq(),
        // do_while_statement: $ => seq(),
        // continue_statement: $ => seq(),
        // break_statement: $ => seq(),
        // try_statement: $ => seq(),
        // return_statement: $ => seq(),
        // emit_statement: $ => seq(),
        // assembly_statement: $ => seq(),


        //  -- [ Directives ] --  
        // Pragma
        pragma_directive: $ => seq(
            "pragma", "solidity", repeat($._pragma_version_constraint), $._semicolon,
        ),

        _pragma_version_constraint: $ => seq(
            optional($._solidity_version_comparison_operator),
            $._solidity_version,
        ),
        _solidity_version: $ => /\d+(.\d+(.\d+)?)?/,
        _solidity_version_comparison_operator: $ => choice("<=", "<", "^", ">", ">=" ),

        // Import
        import_directive: $ => seq(
            'import',
            choice(
                $._source_import,
                seq($._import_clause, $._from_clause)
            ),
            $._semicolon,
        ),

        _source_import: $ => seq(
            field('source', $.string),
            optional(seq("as", $.identifier))
        ),

        _import_clause: $ => choice(
            $._single_import,
            $._multiple_import,
        ),

        _from_clause: $ => seq(
            "from", field('source', $.string)
        ),
    
        _single_import: $ => seq(
            choice("*", $.identifier),
            optional(
                seq(
                    "as",
                    $.identifier
                )
            )
        ),
    
        _multiple_import: $ => seq(
            '{',
            commaSep($._import_declaration),
            optional(','),
            '}'
        ),

        _import_declaration: $  => seq(
            $.identifier,
            optional(
                seq(
                    "as",
                    $.identifier
                )
            )
        ),

        //  -- [ Declarations ] --  
        _declaration: $ => choice(
            $.contract_declaration,
            $.struct_declaration,
            $.enum_declaration,
        ),

        // Contract Declarations
        contract_declaration: $ => seq(
            optional('abstract'),
            'contract',
            field("name", $.identifier),
            optional($.class_heritage),
            field('body', $.contract_body),
        ),

        class_heritage: $ => seq(
            "is", commaSep1($._inheritance_specifier)
        ),

        _inheritance_specifier: $ => seq(
            $._user_defined_type,
            '(',
            commaSep($._expression),
            ')',
        ),

        contract_body: $  => seq(
            "{",
            repeat(choice(
                $.function_definition,
                $.modifier_definition,
                $.field_definition,
                $.struct_declaration,
                $.enum_declaration,
                $.event_definition,
                $.using_directive,
                $.constructor_definition,
                $.fallback_definition,
            )),
            "}",
        ),
        
        struct_declaration: $ =>  seq(
            'struct',
            $.identifier,
            '(', 
            repeat1($.struct_member),
            ')',
        ),

        struct_member: $ => seq($.type_name, $.identifier, $._semicolon),

        enum_declaration: $ =>  seq(
            'enum',
            $.identifier,
            '(',
            commaSep1($.identifier),
            ')',
        ),
        
        event_definition: $ => seq(
            'event',  field('name', $.identifier), $._parameter_list,  optional('anonymous'), $._semicolon
        ),

        using_directive: $ => seq(
            'using', $._user_defined_type, 'for', choice('*', $.type_name), $._semicolon
        ),

        //  -- [ Definitions ] --  
        // Definitions
        field_definition: $ => seq(
            $.type_name,
            // TODO: deal with unordered possibility later
            field('visibility', $.field_visibility),
            optional($._immutable),
            $.identifier,
            optional(seq(
                '=', $._expression
            )),
            $._semicolon
        ),

        field_visibility: $ => choice(
            'public',
            'internal',
            'private',
            'constant',
        ),
        _immutable: $ => 'immutable',
        _override: $ => 'override',

        override_specifier: $ => seq(
            'override',
            optional(seq(
                '(',
                commaSep1($._user_defined_type),
                ')',
            ))
        ),

        modifier_definition: $ => seq(
            "modifier",
            $.identifier,
            $._parameter_list,
            // TODO: deal with potential unorderedness
            optional('virtual'),
            optional('override'),
            choice($._semicolon, $.function_body)
        ),

        constructor_definition: $ => seq(
            'constructor',
            $._parameter_list,
            // TODO: deal with potential unorderedness
            repeat($._modifier_invocation),
            optional('payable'),
            optional(choice('internal', 'public')),
            field('body', $.function_body),
        ),

        fallback_definition: $ => seq(
            choice('fallback', 'receive'),
            '(', ')',
            // TODO: deal with potential unorderedness
            optional(field('visibility', $.field_visibility)),      
            repeat($._modifier_invocation),
            optional('virtual'),
            optional('override'),      
            choice($._semicolon, field('body', $.function_body))
        ),

        function_definition: $ => seq(
            "function",
            choice($.identifier),
            $._parameter_list,
            'returns',
            repeat($._modifier_invocation),
            $._parameter_list,
            choice($._semicolon, field('body', $.function_body))
        ),

        _modifier_invocation: $ => seq($.identifier, $._call_arguments),
        _call_arguments: $ =>  seq('(', commaSep($._expression),')'),

        function_body: $ => choice(),

        // Expressions
        _expression: $ => choice(

        ),
        
        // Types
        type_name: $ => choice(
            $._primitive_type,
            $._user_defined_type,
            $._mapping,
            seq($.type_name, '[', optional($._expression), ']'),
            $._function_type,
        ),
        
        _function_type: $ => seq(
            'function', $._parameter_list, optional($._return_parameters),
        ),

        _parameter_list: $ => seq(
            '(', commaSep1($._parameter), ')'
        ),

        _return_parameters: $ => seq(
            '(', commaSep1($._nameless_parameter), ')'
        ),

        _nameless_parameter: $ =>  seq(
            $.type_name,
            optional($._storage_location),
        ),

        _parameter: $ =>  seq(
            $.type_name,
            optional($._storage_location),
            optional($.identifier),
        ),

        _storage_location: $ => choice(),

        _user_defined_type: $ => seq(
            $.identifier,
            repeat(seq(
                '.',
                $.identifier,
            ))
        ),

        _mapping: $ => seq(
            'mapping', '(', $._mapping_key, '=>', $.type_name, ')',
        ),

        _mapping_key: $ => choice(
            $._primitive_type,
            $._user_defined_type
        ),

        _primitive_type: $ => choice(
            seq('address', optional('payable')),
            'bool',
            'string',
            'var',
            $._int,
            $._uint,
            $._bytes,
            $._fixed,
            $._ufixed,
        ),

        _int: $ => choice (
            'int', 'int8', 'int16', 'int24', 'int32', 'int40', 'int48', 'int56', 'int64', 'int72', 'int80', 'int88', 'int96', 'int104', 'int112', 'int120', 'int128', 'int136', 'int144', 'int152', 'int160', 'int168', 'int176', 'int184', 'int192', 'int200', 'int208', 'int216', 'int224', 'int232', 'int240', 'int248', 'int256'
        ),
        _uint: $ => choice (
            'uint', 'uint8', 'uint16', 'uint24', 'uint32', 'uint40', 'uint48', 'uint56', 'uint64', 'uint72', 'uint80', 'uint88', 'uint96', 'uint104', 'uint112', 'uint120', 'uint128', 'uint136', 'uint144', 'uint152', 'uint160', 'uint168', 'uint176', 'uint184', 'uint192', 'uint200', 'uint208', 'uint216', 'uint224', 'uint232', 'uint240', 'uint248', 'uint256' 
        ),
        _bytes: $ => choice (
            'byte', 'bytes', 'bytes1', 'bytes2', 'bytes3', 'bytes4', 'bytes5', 'bytes6', 'bytes7', 'bytes8', 'bytes9', 'bytes10', 'bytes11', 'bytes12', 'bytes13', 'bytes14', 'bytes15', 'bytes16', 'bytes17', 'bytes18', 'bytes19', 'bytes20', 'bytes21', 'bytes22', 'bytes23', 'bytes24', 'bytes25', 'bytes26', 'bytes27', 'bytes28', 'bytes29', 'bytes30', 'bytes31', 'bytes32'
        ),

        _fixed: $ => choice (
            'fixed',
            /fixed([0-9]+)x([0-9]+)/
        ),
        _ufixed: $ => choice (
            'ufixed',
            /ufixed([0-9]+)x([0-9]+)/
        ),


        _type: $ => choice (
            
        ),

        _semicolon: $ => ';',

        identifier: $ => /[a-z]+/,

        number: $ => /\d+/,

        // Primitives 

        string: $ => choice(
            seq(
            '"',
            repeat(choice(
                token.immediate(prec(PREC.STRING, /[^"\\\n]+|\\\r?\n/)),
                $.escape_sequence
            )),
            '"'
            ),
            seq(
            "'",
            repeat(choice(
                token.immediate(prec(PREC.STRING, /[^'\\\n]+|\\\r?\n/)),
                $.escape_sequence
            )),
            "'"
            )
        ),
        escape_sequence: $ => token.immediate(seq(
            '\\',
            choice(
              /[^xu0-7]/,
              /[0-7]{1,3}/,
              /x[0-9a-fA-F]{2}/,
              /u[0-9a-fA-F]{4}/,
              /u{[0-9a-fA-F]+}/
            )
        )),

        comment: $ => token(
            prec(PREC.COMMENT, 
                choice(
                    seq('//', /.*/),
                    seq(
                        '/*',
                        /[^*]*\*+([^/*][^*]*\*+)*/,
                        '/'
                    )       
                )
            )
        ),
    }
  }
);

function commaSep1(rule) {
    return seq(rule, repeat(seq(',', rule)));
  }
  
function commaSep(rule) {
    return optional(commaSep1(rule));
}
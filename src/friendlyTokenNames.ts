import TokenType from "./TokenType";

export default {
  [TokenType.AND]: "'&&' (AND)",
  [TokenType.Assert]: "'assert' (Assert)",
  [TokenType.Bang]: "'!' (Bang)",
  [TokenType.BangEqual]: "'!=' (BangEqual)",
  [TokenType.Colon]: "':' (Colon)",
  [TokenType.Comma]: "',' (Comma)",
  [TokenType.Dot]: "'.' (Dot)",
  [TokenType.Each]: "'each' (Each)",
  [TokenType.Echo]: "'echo' (Echo)",
  [TokenType.Else]: "'else' (Else)",
  [TokenType.Eot]: "end of file (Eot)",
  [TokenType.Equal]: "'=' (Equal)",
  [TokenType.EqualEqual]: "'==' (EqualEqual)",
  [TokenType.Error]: "<error> (Error)",
  [TokenType.False]: "'false' (False)",
  [TokenType.For]: "'for' (For)",
  [TokenType.Function]: "'function' (Function)",
  [TokenType.Greater]: "'>' (Greater)",
  [TokenType.GreaterEqual]: "'>=' (GreaterEqual)",
  [TokenType.Hash]: "'#' (Hash)",
  [TokenType.Identifier]: "identifier (Identifier)",
  [TokenType.If]: "'if' (If)",
  [TokenType.LeftBrace]: "'{' (LeftBrace)",
  [TokenType.LeftBracket]: "'[' (LeftBracket)",
  [TokenType.LeftParen]: "'(' (LeftParen)",
  [TokenType.Less]: "'<' (Less)",
  [TokenType.LessEqual]: "'<=' (LessEqual)",
  [TokenType.Let]: "'let' (Let)",
  [TokenType.Minus]: "'-' (Minus)",
  [TokenType.Module]: "'module' (Module)",
  [TokenType.NumberLiteral]: "number literal (NumberLiteral)",
  [TokenType.OR]: "'||' (OR)",
  [TokenType.Percent]: "'%' (Percent)",
  [TokenType.Plus]: "'+' (Plus)",
  [TokenType.QuestionMark]: "'?' (QuestionMark)",
  [TokenType.RightBrace]: "'}' (RightBrace)",
  [TokenType.RightBracket]: "']' (RightBracket)",
  [TokenType.RightParen]: "')' (RightParen)",
  [TokenType.Semicolon]: "';' (Semicolon)",
  [TokenType.Slash]: "'/' (Slash)",
  [TokenType.Star]: "'*' (Star)",
  [TokenType.Caret]: "'^' (Caret)",
  [TokenType.StringLiteral]: "string literal (StringLiteral)",
  [TokenType.True]: "'true' (True)",
  [TokenType.Undef]: "'undef' (Undef)",
  [TokenType.Use]: "'use' (Use)",
  [TokenType.FilenameInChevrons]: "filename (FilenameInChevrons)",
  [TokenType.Include]: "'include' (Include)",
};

// Enums for ComposePanel

export enum ComposeMode {
  NEW = 'new',
  REPLY = 'reply',
  REPLY_ALL = 'replyAll',
  FORWARD = 'forward',
}

export enum PanelState {
  NORMAL = 'normal',
  MINIMIZED = 'minimized',
  MAXIMIZED = 'maximized',
}

export enum EditorCommand {
  BOLD = 'bold',
  ITALIC = 'italic',
  UNDERLINE = 'underline',
  ALIGN_LEFT = 'justifyLeft',
  ALIGN_CENTER = 'justifyCenter',
  ALIGN_RIGHT = 'justifyRight',
  INSERT_LINK = 'createLink',
  FONT_NAME = 'fontName',
  FONT_SIZE = 'fontSize',
  FORE_COLOR = 'foreColor',
}

export enum FontSize {
  SMALL = '12px',
  NORMAL = '14px',
  LARGE = '16px',
  XLARGE = '18px',
}

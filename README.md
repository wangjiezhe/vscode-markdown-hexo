# vscode-markdown-hexo

VS Code extension that render markdown more compatible with Hexo.

## Features

- Support using `typora-root-url` setting in front matter as image root path (introduced by Typora).
- Support class and attributes with curly brackets, using [markdown-it-attrs](https://github.com/arve0/markdown-it-attrs).
- Support [Note](https://theme-next.js.org/docs/tag-plugins/note) tag of Hexo NexT theme.
- **Image link navigation**: Ctrl+click on images navigates to adjusted paths based on `typora-root-url`.
- **Image hover preview**: Hovering over images shows preview with adjusted paths.

## Known Issues

- [x] Fix url with follow link (Ctrl + click).
- [x] Fix url with hover preview.
- [ ] Fix url when paste image.

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import Image from '@tiptap/extension-image';
import { Box, Paper, Toolbar, IconButton, Divider, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Chip, } from '@mui/material';
import { FormatBold, FormatItalic, FormatUnderlined, FormatListBulleted, FormatListNumbered, FormatQuote, Code, Undo, Redo, Table as TableIcon, Image as ImageIcon, AutoAwesome, Save, Preview, } from '@mui/icons-material';
const ProposalEditor = ({ content = '', onChange, onSave, onAIGenerate, readonly = false, }) => {
    const [aiDialogOpen, setAiDialogOpen] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [imageDialogOpen, setImageDialogOpen] = useState(false);
    const [imageUrl, setImageUrl] = useState('');
    const [previewMode, setPreviewMode] = useState(false);
    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: '開始撰寫您的標書內容...',
            }),
            CharacterCount.configure({
                limit: 50000, // 50k 字元限制
            }),
            Table.configure({
                resizable: true,
            }),
            TableRow,
            TableHeader,
            TableCell,
            Image.configure({
                HTMLAttributes: {
                    class: 'proposal-image',
                },
            }),
        ],
        content,
        editable: !readonly && !previewMode,
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            onChange?.(html);
        },
    });
    const handleSave = useCallback(() => {
        if (editor) {
            const html = editor.getHTML();
            onSave?.(html);
        }
    }, [editor, onSave]);
    const handleAIGenerate = () => {
        if (aiPrompt.trim()) {
            onAIGenerate?.(aiPrompt);
            setAiDialogOpen(false);
            setAiPrompt('');
        }
    };
    const insertImage = () => {
        if (imageUrl && editor) {
            editor.chain().focus().setImage({ src: imageUrl }).run();
            setImageDialogOpen(false);
            setImageUrl('');
        }
    };
    const addTable = () => {
        if (editor) {
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
        }
    };
    if (!editor) {
        return _jsx("div", { children: "\u8F09\u5165\u7DE8\u8F2F\u5668\u4E2D..." });
    }
    const characterCount = editor.storage.characterCount.characters();
    const wordCount = editor.storage.characterCount.words();
    return (_jsxs(Box, { sx: { height: '100%', display: 'flex', flexDirection: 'column' }, children: [!readonly && (_jsx(Paper, { elevation: 1, children: _jsxs(Toolbar, { variant: "dense", sx: { minHeight: '48px !important', gap: 1 }, children: [_jsxs(Box, { display: "flex", gap: 0.5, children: [_jsx(IconButton, { size: "small", onClick: () => editor.chain().focus().toggleBold().run(), color: editor.isActive('bold') ? 'primary' : 'default', children: _jsx(FormatBold, {}) }), _jsx(IconButton, { size: "small", onClick: () => editor.chain().focus().toggleItalic().run(), color: editor.isActive('italic') ? 'primary' : 'default', children: _jsx(FormatItalic, {}) }), _jsx(IconButton, { size: "small", onClick: () => editor.chain().focus().toggleUnderline().run(), color: editor.isActive('underline') ? 'primary' : 'default', children: _jsx(FormatUnderlined, {}) })] }), _jsx(Divider, { orientation: "vertical", flexItem: true }), _jsxs(Box, { display: "flex", gap: 0.5, children: [_jsx(IconButton, { size: "small", onClick: () => editor.chain().focus().toggleBulletList().run(), color: editor.isActive('bulletList') ? 'primary' : 'default', children: _jsx(FormatListBulleted, {}) }), _jsx(IconButton, { size: "small", onClick: () => editor.chain().focus().toggleOrderedList().run(), color: editor.isActive('orderedList') ? 'primary' : 'default', children: _jsx(FormatListNumbered, {}) })] }), _jsx(Divider, { orientation: "vertical", flexItem: true }), _jsxs(Box, { display: "flex", gap: 0.5, children: [_jsx(IconButton, { size: "small", onClick: () => editor.chain().focus().toggleBlockquote().run(), color: editor.isActive('blockquote') ? 'primary' : 'default', children: _jsx(FormatQuote, {}) }), _jsx(IconButton, { size: "small", onClick: () => editor.chain().focus().toggleCodeBlock().run(), color: editor.isActive('codeBlock') ? 'primary' : 'default', children: _jsx(Code, {}) })] }), _jsx(Divider, { orientation: "vertical", flexItem: true }), _jsxs(Box, { display: "flex", gap: 0.5, children: [_jsx(IconButton, { size: "small", onClick: addTable, children: _jsx(TableIcon, {}) }), _jsx(IconButton, { size: "small", onClick: () => setImageDialogOpen(true), children: _jsx(ImageIcon, {}) })] }), _jsx(Divider, { orientation: "vertical", flexItem: true }), _jsxs(Box, { display: "flex", gap: 0.5, children: [_jsx(IconButton, { size: "small", onClick: () => editor.chain().focus().undo().run(), disabled: !editor.can().undo(), children: _jsx(Undo, {}) }), _jsx(IconButton, { size: "small", onClick: () => editor.chain().focus().redo().run(), disabled: !editor.can().redo(), children: _jsx(Redo, {}) })] }), _jsx(Box, { sx: { flexGrow: 1 } }), onAIGenerate && (_jsx(Button, { size: "small", startIcon: _jsx(AutoAwesome, {}), onClick: () => setAiDialogOpen(true), variant: "outlined", children: "AI \u751F\u6210" })), _jsx(Button, { size: "small", startIcon: _jsx(Preview, {}), onClick: () => setPreviewMode(!previewMode), variant: previewMode ? 'contained' : 'outlined', children: previewMode ? '編輯' : '預覽' }), onSave && (_jsx(Button, { size: "small", startIcon: _jsx(Save, {}), onClick: handleSave, variant: "contained", children: "\u5132\u5B58" }))] }) })), _jsx(Box, { sx: {
                    flexGrow: 1,
                    overflow: 'auto',
                    p: 2,
                    backgroundColor: previewMode ? 'background.paper' : 'grey.50',
                }, children: _jsx(Paper, { sx: {
                        minHeight: '100%',
                        p: 3,
                        '& .ProseMirror': {
                            outline: 'none',
                            minHeight: '500px',
                            fontSize: '16px',
                            lineHeight: 1.6,
                            '& h1': { fontSize: '2rem', fontWeight: 'bold', margin: '1rem 0' },
                            '& h2': { fontSize: '1.5rem', fontWeight: 'bold', margin: '0.8rem 0' },
                            '& h3': { fontSize: '1.25rem', fontWeight: 'bold', margin: '0.6rem 0' },
                            '& p': { margin: '0.5rem 0' },
                            '& ul, ol': { paddingLeft: '1.5rem', margin: '0.5rem 0' },
                            '& blockquote': {
                                borderLeft: '3px solid #ddd',
                                paddingLeft: '1rem',
                                margin: '1rem 0',
                                fontStyle: 'italic',
                                color: 'text.secondary',
                            },
                            '& pre': {
                                backgroundColor: '#f5f5f5',
                                padding: '1rem',
                                borderRadius: '4px',
                                overflow: 'auto',
                                fontFamily: 'monospace',
                            },
                            '& table': {
                                borderCollapse: 'collapse',
                                width: '100%',
                                margin: '1rem 0',
                            },
                            '& th, td': {
                                border: '1px solid #ddd',
                                padding: '8px',
                                textAlign: 'left',
                            },
                            '& th': {
                                backgroundColor: '#f5f5f5',
                                fontWeight: 'bold',
                            },
                            '& .proposal-image': {
                                maxWidth: '100%',
                                height: 'auto',
                                margin: '1rem 0',
                            },
                        },
                    }, children: _jsx(EditorContent, { editor: editor }) }) }), _jsx(Paper, { elevation: 1, children: _jsxs(Box, { display: "flex", justifyContent: "space-between", alignItems: "center", p: 1, children: [_jsxs(Box, { display: "flex", gap: 2, children: [_jsx(Chip, { label: `${wordCount} 字`, size: "small", variant: "outlined" }), _jsx(Chip, { label: `${characterCount} 字元`, size: "small", variant: "outlined", color: characterCount > 45000 ? 'warning' : 'default' })] }), previewMode && (_jsx(Chip, { label: "\u9810\u89BD\u6A21\u5F0F", size: "small", color: "primary" }))] }) }), _jsxs(Dialog, { open: aiDialogOpen, onClose: () => setAiDialogOpen(false), maxWidth: "md", fullWidth: true, children: [_jsx(DialogTitle, { children: "AI \u5167\u5BB9\u751F\u6210" }), _jsx(DialogContent, { children: _jsx(TextField, { fullWidth: true, multiline: true, rows: 4, label: "\u8ACB\u63CF\u8FF0\u60A8\u60F3\u8981\u751F\u6210\u7684\u5167\u5BB9", placeholder: "\u4F8B\u5982\uFF1A\u751F\u6210\u4E00\u6BB5\u95DC\u65BC\u516C\u53F8\u6280\u8853\u512A\u52E2\u7684\u4ECB\u7D39\uFF0C\u91CD\u9EDE\u5F37\u8ABF\u6211\u5011\u5728AI\u9818\u57DF\u7684\u5C08\u696D\u80FD\u529B...", value: aiPrompt, onChange: (e) => setAiPrompt(e.target.value), sx: { mt: 2 } }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setAiDialogOpen(false), children: "\u53D6\u6D88" }), _jsx(Button, { variant: "contained", onClick: handleAIGenerate, disabled: !aiPrompt.trim(), startIcon: _jsx(AutoAwesome, {}), children: "\u751F\u6210\u5167\u5BB9" })] })] }), _jsxs(Dialog, { open: imageDialogOpen, onClose: () => setImageDialogOpen(false), maxWidth: "sm", fullWidth: true, children: [_jsx(DialogTitle, { children: "\u63D2\u5165\u5716\u7247" }), _jsx(DialogContent, { children: _jsx(TextField, { fullWidth: true, label: "\u5716\u7247 URL", placeholder: "https://example.com/image.jpg", value: imageUrl, onChange: (e) => setImageUrl(e.target.value), sx: { mt: 2 } }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setImageDialogOpen(false), children: "\u53D6\u6D88" }), _jsx(Button, { variant: "contained", onClick: insertImage, disabled: !imageUrl.trim(), children: "\u63D2\u5165" })] })] })] }));
};
export default ProposalEditor;

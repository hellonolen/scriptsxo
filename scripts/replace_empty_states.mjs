import fs from 'fs';
import path from 'path';

function walk(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walk(dirPath, callback) : callback(dirPath);
    });
}

function replaceInFile(filePath) {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Replace common empty state text-center patterns
    content = content.replace(/className="[^"]*(?:text-center[^"]*(?:py-12|py-20|py-10|py-8|p-12)|(?:py-12|py-20|py-10|py-8|p-12)[^"]*text-center)[^"]*"/g, (match) => {
        return match.replace('text-center', 'text-left');
    });

    // also check for items-center with text-center in empty states
    content = content.replace(/className="[^"]*items-center text-center[^"]*"/g, (match) => {
        return match.replace('items-center text-center', 'items-start text-left');
    });

    // some specific ones from dashboard/admin where it's just <div className="text-center">
    content = content.replace(/<div className="text-center">/g, '<div className="text-left">');

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Updated', filePath);
    }
}

['src/app/admin', 'src/app/portal', 'src/app/provider', 'src/app/pharmacy', 'src/app/dashboard', 'src/app/workflows'].forEach(dir => {
    if (fs.existsSync(dir)) walk(dir, replaceInFile);
});

// Update globals.css
let cssPath = 'src/app/globals.css';
let css = fs.readFileSync(cssPath, 'utf8');
css = css.replace(
    '.empty-state { @apply flex flex-col items-center justify-center gap-4 py-12 text-center; }',
    '.empty-state { @apply flex flex-col items-start justify-start gap-4 py-12 text-left; }'
);
fs.writeFileSync(cssPath, css, 'utf8');
console.log('Updated globals.css');

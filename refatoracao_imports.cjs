const fs = require('fs');
const path = require('path');

const directories = [
    'components/receitas',
    'components/ficha-tecnica',
    'hooks/ficha-tecnica'
];

const basePath = process.cwd();

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    // Substituir os imports legados do utils
    content = content.replace(/import\s*\{\s*RecipeCalculator\s*\}\s*from\s*['"].*?components\/utils\/recipeCalculator.*?['"];?/g, 'import { RecipeEngine as RecipeCalculator } from "@/lib/recipe-engine/RecipeEngine";');

    // Substituir importes legados do lib/recipeCalculator também
    content = content.replace(/import\s*RecipeCalculator\s*from\s*['"].*?lib\/recipeCalculator.*?['"];?/g, 'import { RecipeEngine as RecipeCalculator } from "@/lib/recipe-engine/RecipeEngine";');

    // Usaremos destructuring onde possível ou apenas as RecipeCalculator para manter a interface para evitar reescrita manual
    // content = content.replace(/\bRecipeCalculator\./g, 'RecipeEngine.');

    // Fix multiple imports
    content = content.replace(/(import \{ RecipeEngine as RecipeCalculator \} from "@\/lib\/recipe-engine\/RecipeEngine";\s*){2,}/g, 'import { RecipeEngine as RecipeCalculator } from "@/lib/recipe-engine/RecipeEngine";\n');

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Atualizado:', filePath);
    }
}

function walkDir(dir) {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            walkDir(fullPath);
        } else {
            if (file.endsWith('.js') || file.endsWith('.jsx')) {
                processFile(fullPath);
            }
        }
    });
}

directories.forEach(dir => {
    const fullPath = path.join(basePath, dir);
    if (fs.existsSync(fullPath)) {
        walkDir(fullPath);
    }
});

console.log('Finalizado.');

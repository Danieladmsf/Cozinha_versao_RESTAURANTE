
import fs from 'fs';
import { db } from './lib/firebase.js';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';

async function main() {
    console.log("🛠️ INICIANDO RECONSTRUÇÃO DAS TABELAS A PARTIR DO TEXTO 🛠️");

    // 1. Carregar Categorias Atuais
    console.log("📥 1. Lendo Categorias Atuais do Banco...");
    const catSnap = await getDocs(collection(db, "Category"));
    const categoryMap = {}; // name.toLowerCase() -> id
    const typesMap = {}; // name.toLowerCase() -> type ('receitas' | 'produtos')
    const idToNameMap = {}; // id -> name text

    catSnap.docs.forEach(d => {
        const data = d.data();
        categoryMap[data.name.toLowerCase()] = d.id;
        typesMap[data.name.toLowerCase()] = data.type;
        idToNameMap[d.id] = data.name;
    });

    console.log(`   🔸 ${Object.keys(categoryMap).length} categorias mapeadas.`);

    // Função de de-para automático de Nome para ID de Categoria
    const mapCategory = (itemNameOrCatName) => {
        const lower = itemNameOrCatName.toLowerCase();

        // Se a própria string for uma chave válida
        if (categoryMap[lower]) return categoryMap[lower];

        // Heurísticas de fallback
        if (lower.includes('ave') || lower.includes('frango') || lower.includes('tulipa')) return categoryMap['aves'];
        if (lower.includes('bovin') || lower.includes('carne') || lower.includes('bife') || lower.includes('maminha') || lower.includes('lagarto') || lower.includes('cupim')) return categoryMap['bovino'];
        if (lower.includes('suíno') || lower.includes('suino') || lower.includes('porco') || lower.includes('linguiça') || lower.includes('linguica') || lower.includes('pernil') || lower.includes('copa lombo')) return categoryMap['suínos'];
        if (lower.includes('pescad') || lower.includes('peixe')) return categoryMap['pescado'];
        if (lower.includes('salada') || lower.includes('caponata') || lower.includes('batatonese') || lower.includes('maionese') || lower.includes('tabule')) return categoryMap['saladas'];
        if (lower.includes('molho') || lower.includes('pate') || lower.includes('patê') || lower.includes('geleia')) return categoryMap['molhos e patês'];
        if (lower.includes('sushi') || lower.includes('japonesa') || lower.includes('roll') || lower.includes('poke') || lower.includes('temaki')) return categoryMap['sushi e japonesa'];
        if (lower.includes('refei') || lower.includes('marmit') || lower.includes('produto') || lower.includes('rotisseria')) return categoryMap['refeições / produtos'] || categoryMap['produtos'];
        if (lower.includes('guarn') || lower.includes('arroz') || lower.includes('feijao') || lower.includes('feijão') || lower.includes('macarr') || lower.includes('massa') || lower.includes('batata') || lower.includes('purê') || lower.includes('pure') || lower.includes('escondidinho') || lower.includes('nhoque') || lower.includes('panqueca') || lower.includes('berinjela')) return categoryMap['guarnição'];
        if (lower.includes('acompanha') || lower.includes('farofa') || lower.includes('creme')) return categoryMap['acompanhamento'];

        // Se falhar tudo, joga em acompanhamento ou o primeiro q achar
        return categoryMap['acompanhamento'] || Object.values(categoryMap)[0];
    };

    // 2. Ler o Relatório
    console.log("\n📖 2. Lendo Relatorio_Receitas_e_Produtos.txt...");
    const reportPath = 'C:\\Users\\Administrador\\Desktop\\COZINHA RESTAURANTE\\SCRIPTS\\Relatorio_Receitas_e_Produtos.txt';

    if (!fs.existsSync(reportPath)) {
        console.error("❌ ERRO: Relatorio não encontrado nesse caminho!");
        process.exit(1);
    }

    const lines = fs.readFileSync(reportPath, 'utf8').split('\n');
    let currentMode = "NONE";
    let currentBlockHeader = "";

    let restoredRecipes = 0;
    let restoredProducts = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        if (line.includes('RELATÓRIO DE RECEITAS ATIVAS')) currentMode = "RECIPE";
        else if (line.includes('RELATÓRIO DE PRODUTOS')) currentMode = "PRODUCT";

        if (line.startsWith('[') && line.endsWith(']')) {
            currentBlockHeader = line.substring(1, line.length - 1).trim();
            continue;
        }

        if (line.startsWith('- ') && !line.includes('Total de')) {
            if (currentMode === "RECIPE") {
                const recipeName = line.replace('- ', '').trim();

                // Mapear primeiro pelo cabeçalho (ex: [ AVES ]). Se falhar, mapear pelo nome.
                let catId = categoryMap[currentBlockHeader.toLowerCase()]; // Match direto?
                if (!catId) catId = mapCategory(currentBlockHeader);
                if (!catId) catId = mapCategory(recipeName);

                const catNameText = idToNameMap[catId] || '';

                await addDoc(collection(db, "Recipe"), {
                    name: recipeName,
                    category_id: catId,
                    category: catNameText, // Campo de texto para os cartões
                    active: true,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    components: [],
                    yield_kg: 1
                });
                restoredRecipes++;
            }
            else if (currentMode === "PRODUCT") {
                const parts = line.split('|');
                if (parts.length === 2) {
                    const codePart = parts[0].replace('- Código:', '').trim();
                    const prodName = parts[1].trim();
                    const finalCode = codePart === "S/ CODIGO" ? "" : codePart;

                    // Produtos: O cabeçalho é um ID inútil agora. Vamos usar o nome do produto pra descobrir a categoria!
                    const catId = mapCategory(prodName);
                    const catNameText = idToNameMap[catId] || '';

                    await addDoc(collection(db, "Product"), {
                        name: prodName,
                        code: finalCode,
                        id_vr: finalCode,
                        category_id: catId,
                        category: catNameText,
                        active: true,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                        price: 0
                    });
                    restoredProducts++;
                }
            }
        }
    }

    console.log(`\n🎉 RECONSTRUÇÃO CONCLUÍDA!`);
    console.log(`   🔹 Receitas Injetadas: ${restoredRecipes}`);
    console.log(`   🔹 Produtos Injetados: ${restoredProducts}`);

    setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
